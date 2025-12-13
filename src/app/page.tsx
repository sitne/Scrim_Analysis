import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getMapDisplayName } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TeamSelector } from '@/components/TeamSelector';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ team?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  const { team: teamIdParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's teams
  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id },
    select: { teamId: true, team: { select: { id: true, name: true } } }
  });

  // Redirect to team page if no teams
  if (memberships.length === 0) {
    redirect('/team');
  }

  const teams = memberships.map(m => m.team);

  // Use selected team or default to first team
  const currentTeamId = teamIdParam && teams.some(t => t.id === teamIdParam)
    ? teamIdParam
    : teams[0].id;

  const currentTeam = teams.find(t => t.id === currentTeamId)!;

  // Get matches for the selected team only
  const matches = await prisma.match.findMany({
    where: {
      teamId: currentTeamId
    },
    take: 20,
    orderBy: {
      gameStartMillis: 'desc'
    },
    select: {
      matchId: true,
      mapId: true,
      gameStartMillis: true,
      winningTeam: true,
      tags: { select: { tagName: true } },
      _count: {
        select: {
          players: true,
          rounds: true
        }
      },
      rounds: {
        select: { winningTeam: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white">{currentTeam.name}</h1>
          <TeamSelector teams={teams} currentTeamId={currentTeamId} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/upload?team=${currentTeamId}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
          >
            Upload Match
          </Link>
          <Link
            href={`/stats?team=${currentTeamId}`}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold transition-colors"
          >
            View Statistics
          </Link>
          <Link
            href="/team"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
          >
            Teams
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {matches.map((match) => {
          const mapName = getMapDisplayName(match.mapId);
          const date = new Date(Number(match.gameStartMillis)).toLocaleDateString('ja-JP');
          const redScore = match.rounds.filter(r => r.winningTeam === 'Red').length;
          const blueScore = match.rounds.filter(r => r.winningTeam === 'Blue').length;

          return (
            <Link
              key={match.matchId}
              href={`/match/${match.matchId}`}
              className="block bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xl font-bold text-white mb-1">{mapName}</div>
                  <div className="text-sm text-gray-400">{date}</div>
                  {match.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {match.tags.map((tag) => (
                        <span key={tag.tagName} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                          {tag.tagName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    <span className={redScore > blueScore ? 'text-red-400' : ''}>{redScore}</span>
                    <span className="mx-2 text-gray-500">-</span>
                    <span className={blueScore > redScore ? 'text-blue-400' : ''}>{blueScore}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {match._count.players} Players
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {matches.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-900 rounded-lg border border-gray-800">
            <p className="mb-4">マッチデータがありません。</p>
            <Link
              href={`/upload?team=${currentTeamId}`}
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
            >
              マッチをアップロード
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
