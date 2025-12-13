import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's teams
  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          _count: {
            select: { members: true, matches: true }
          }
        }
      }
    }
  });

  // If user has one team, redirect to that team
  if (memberships.length === 1) {
    redirect(`/team/${memberships[0].teamId}`);
  }

  // If no teams, redirect to team management
  if (memberships.length === 0) {
    redirect('/team');
  }

  // Show team selection
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">チームを選択</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {memberships.map(({ team, role }) => (
          <Link
            key={team.id}
            href={`/team/${team.id}`}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 transition-colors block"
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-white">{team.name}</h2>
              {role === 'owner' && (
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded">
                  オーナー
                </span>
              )}
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>{team._count.members} メンバー</span>
              <span>{team._count.matches} マッチ</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-800">
        <Link
          href="/team"
          className="text-gray-400 hover:text-white transition"
        >
          チーム管理 →
        </Link>
      </div>
    </div>
  );
}
