import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { CopyButton } from '@/components/CopyButton'
import { DeleteButton } from '@/components/DeleteButton'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function TeamSettingsPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user is member of this team
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId: id,
                userId: user.id,
            },
        },
    })

    if (!membership) {
        redirect('/team')
    }

    // Get team with members
    const team = await prisma.team.findUnique({
        where: { id },
        include: {
            members: true,
            _count: { select: { matches: true } }
        }
    })

    if (!team) {
        redirect('/team')
    }

    const isOwner = membership.role === 'owner'

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/team/${id}`} className="text-gray-400 hover:text-white transition">
                    ← {team.name}
                </Link>
            </div>

            <h1 className="text-3xl font-bold text-white">チーム設定</h1>

            {/* Invite Code Section */}
            {isOwner && (
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h2 className="text-lg font-semibold text-white mb-4">招待コード</h2>
                    <div className="flex items-center gap-3">
                        <code className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-gray-300 font-mono">
                            {team.inviteCode}
                        </code>
                        <CopyButton text={team.inviteCode} />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        このコードを共有して、メンバーを招待できます
                    </p>
                </div>
            )}

            {/* Members Section */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold text-white mb-4">
                    メンバー（{team.members.length}）
                </h2>
                <ul className="space-y-3">
                    {team.members.map((member) => (
                        <li
                            key={member.id}
                            className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <span className="text-gray-300">{member.userId.slice(0, 8)}...</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${member.role === 'owner'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-gray-700 text-gray-400'
                                }`}>
                                {member.role === 'owner' ? 'オーナー' : 'メンバー'}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Team Stats */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold text-white mb-4">チーム情報</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="text-2xl font-bold text-white">{team._count.matches}</div>
                        <div className="text-sm text-gray-400">マッチ数</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="text-2xl font-bold text-white">{team.members.length}</div>
                        <div className="text-sm text-gray-400">メンバー数</div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-gray-900 rounded-xl p-6 border border-red-900/50">
                <h2 className="text-lg font-semibold text-red-400 mb-4">危険な操作</h2>

                {isOwner ? (
                    <div>
                        <p className="text-sm text-gray-400 mb-4">
                            チームを削除すると、すべてのマッチデータとメンバー情報が削除されます。この操作は取り消せません。
                        </p>
                        <DeleteButton
                            endpoint={`/api/team/${id}`}
                            redirectTo="/team"
                            buttonText="チームを削除"
                            confirmMessage="本当に削除しますか？"
                        />
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-gray-400 mb-4">
                            チームを脱退すると、このチームのマッチデータにアクセスできなくなります。
                        </p>
                        <DeleteButton
                            endpoint={`/api/team/${id}/leave`}
                            redirectTo="/team"
                            buttonText="チームを脱退"
                            confirmMessage="本当に脱退しますか？"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
