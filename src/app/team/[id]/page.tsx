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

    // Parallelize data fetching
    const [membership, team, matches] = await Promise.all([
        prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: id,
                    userId: user.id,
                },
            },
        }),
        prisma.team.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { members: true }
                }
            }
        }),
        prisma.match.findMany({
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
                rounds: { select: { winningTeam: true } },
                // @ts-ignore
                myTeamSide: true,
                // @ts-ignore
                redTeamName: true,
                // @ts-ignore
                blueTeamName: true,
                // @ts-ignore
                redTeamTag: true,
                // @ts-ignore
                blueTeamTag: true,
            }
        })
    ])

    if (!membership || !team) {
        redirect('/team')
    }

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
                        マッチをアップロード
                    </Link>
                    <Link
                        href={`/team/${id}/stats`}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold transition-colors"
                    >
                        統計を見る
                    </Link>
                    <Link
                        href={`/team/${id}/settings`}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
                    >
                        設定
                    </Link>
                </div>
            </div>

            {/* Match List */}
            <div className="grid gap-4">
                {matches.map((match: any) => {
                    const mapName = getMapDisplayName(match.mapId);
                    const date = new Date(Number(match.gameStartMillis)).toLocaleDateString('ja-JP');
                    const redScore = match.rounds.filter((r: any) => r.winningTeam === 'Red').length;
                    const blueScore = match.rounds.filter((r: any) => r.winningTeam === 'Blue').length;

                    // チーム表示ロジック
                    const isRedMyTeam = match.myTeamSide === 'Red';
                    const isBlueMyTeam = match.myTeamSide === 'Blue';

                    const redName = match.redTeamName || 'Team Red';
                    const blueName = match.blueTeamName || 'Team Blue';

                    // 勝敗判定 (自分のチーム視点)
                    let resultDisplay = null;
                    if (isRedMyTeam) {
                        resultDisplay = redScore > blueScore
                            ? <span className="text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded text-sm">WIN</span>
                            : redScore < blueScore
                                ? <span className="text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded text-sm">LOSS</span>
                                : <span className="text-gray-400 font-bold bg-gray-400/10 px-2 py-0.5 rounded text-sm">DRAW</span>;
                    } else if (isBlueMyTeam) {
                        resultDisplay = blueScore > redScore
                            ? <span className="text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded text-sm">WIN</span>
                            : blueScore < redScore
                                ? <span className="text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded text-sm">LOSS</span>
                                : <span className="text-gray-400 font-bold bg-gray-400/10 px-2 py-0.5 rounded text-sm">DRAW</span>;
                    }

                    return (
                        <Link
                            key={match.matchId}
                            href={`/match/${match.matchId}`}
                            className="block bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 transition-colors group"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="text-xl font-bold text-white">{mapName}</div>
                                        {resultDisplay}
                                    </div>
                                    <div className="text-sm text-gray-400 flex items-center gap-2">
                                        <span>{date}</span>
                                        {/* 対戦相手表示 */}
                                        {(isRedMyTeam && blueName !== 'Team Blue') && (
                                            <span className="bg-gray-900 px-2 py-0.5 rounded text-xs text-gray-300 border border-gray-700"> vs {blueName}</span>
                                        )}
                                        {(isBlueMyTeam && redName !== 'Team Red') && (
                                            <span className="bg-gray-900 px-2 py-0.5 rounded text-xs text-gray-300 border border-gray-700"> vs {redName}</span>
                                        )}
                                    </div>
                                    {match.tags.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {match.tags.map((tag: any) => (
                                                <span key={tag.tagName} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                                                    {tag.tagName}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-3 text-2xl font-bold text-white font-mono">
                                        <div className={`flex flex-col items-center ${isRedMyTeam ? 'relative' : ''}`}>
                                            <span className={redScore > blueScore ? 'text-red-400' : ''}>{redScore}</span>
                                            {isRedMyTeam && <span className="text-[10px] absolute -bottom-4 text-green-400 font-sans tracking-tight">YOU</span>}
                                            {!isRedMyTeam && isBlueMyTeam && <span className="text-[10px] absolute -bottom-4 text-red-500 font-sans tracking-tight">OPP</span>}
                                        </div>
                                        <span className="text-gray-600 text-lg">-</span>
                                        <div className={`flex flex-col items-center ${isBlueMyTeam ? 'relative' : ''}`}>
                                            <span className={blueScore > redScore ? 'text-blue-400' : ''}>{blueScore}</span>
                                            {isBlueMyTeam && <span className="text-[10px] absolute -bottom-4 text-green-400 font-sans tracking-tight">YOU</span>}
                                            {!isBlueMyTeam && isRedMyTeam && <span className="text-[10px] absolute -bottom-4 text-red-500 font-sans tracking-tight">OPP</span>}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-4">
                                        {match._count.players} プレイヤー
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
