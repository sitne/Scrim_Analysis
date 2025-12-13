import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getMapDisplayName } from '@/lib/utils'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function TeamHomePage({ params }: PageProps) {
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

    // Get team with matches
    const team = await prisma.team.findUnique({
        where: { id },
        include: {
            _count: {
                select: { members: true }
            }
        }
    })

    if (!team) {
        redirect('/team')
    }

    // Get matches for this team
    const matches = await prisma.match.findMany({
        where: { teamId: id },
        take: 20,
        orderBy: { gameStartMillis: 'desc' },
        select: {
            matchId: true,
            mapId: true,
            gameStartMillis: true,
            winningTeam: true,
            tags: { select: { tagName: true } },
            _count: { select: { players: true } },
            rounds: { select: { winningTeam: true } }
        }
    })

    return (
        <div className="space-y-6">
            {/* Team Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">{team.name}</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {team._count.members} メンバー • {matches.length} マッチ
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Link
                        href={`/team/${id}/upload`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
                    >
                        Upload Match
                    </Link>
                    <Link
                        href={`/team/${id}/stats`}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold transition-colors"
                    >
                        View Statistics
                    </Link>
                    <Link
                        href={`/team/${id}/settings`}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
                    >
                        Settings
                    </Link>
                </div>
            </div>

            {/* Match List */}
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
                            href={`/team/${id}/upload`}
                            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
                        >
                            マッチをアップロード
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
