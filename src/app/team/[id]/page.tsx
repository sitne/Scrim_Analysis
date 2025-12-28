import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getMapDisplayName, getAgentName } from '@/lib/utils'
import { FilterBar } from '@/components/FilterBar'
import { Prisma } from '@prisma/client'
import { fetchValorantData } from '@/lib/valorant-api'

interface PageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TeamHomePage(props: PageProps) {
    const { id } = await props.params
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Ensure Valorant data is available
    await fetchValorantData();

    // Parse Filters
    const filterMaps = typeof searchParams.maps === 'string' ? searchParams.maps.split(',') : [];
    const filterAgents = typeof searchParams.agents === 'string' ? searchParams.agents.split(',') : [];

    const includeTags = typeof searchParams.includeTags === 'string' ? searchParams.includeTags.split(',') : [];
    const excludeTags = typeof searchParams.excludeTags === 'string' ? searchParams.excludeTags.split(',') : [];
    const startDate = typeof searchParams.startDate === 'string' ? searchParams.startDate : null;
    const endDate = typeof searchParams.endDate === 'string' ? searchParams.endDate : null;

    const filterOpponents = typeof searchParams.opponents === 'string' ? searchParams.opponents.split(',') : [];

    // Parallelize data fetching (Membership, Team, Filter Options)
    const [membership, team, matchesForOpponentsResult, matchesData, agentsData] = await Promise.all([
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
            select: {
                myTeamSide: true,
                redTeamName: true,
                redTeamTag: true,
                blueTeamName: true,
                blueTeamTag: true
            } as any
        }),
        prisma.match.findMany({
            where: { teamId: id },
            select: { mapId: true },
            distinct: ['mapId'],
            orderBy: { mapId: 'asc' }
        }),
        prisma.matchPlayer.findMany({
            where: {
                match: { teamId: id },
                characterId: { not: null }
            },
            select: { characterId: true },
            distinct: ['characterId']
        })
    ])

    if (!membership || !team) {
        redirect('/team')
    }

    const matchesForOpponents = matchesForOpponentsResult as any[];

    // Opponent Aggregation
    const opponentsMap = new Map<string, { name: string; count: number }>();
    matchesForOpponents.forEach(m => {
        let name;
        if (m.myTeamSide === 'Red') {
            name = m.blueTeamName;
        } else if (m.myTeamSide === 'Blue') {
            name = m.redTeamName;
        }

        if (name) {
            const key = name;
            if (!opponentsMap.has(key)) {
                opponentsMap.set(key, { name, count: 0 });
            }
            opponentsMap.get(key)!.count++;
        }
    });

    const availableOpponents = Array.from(opponentsMap.values())
        .sort((a, b) => b.count - a.count);

    const availableMaps = matchesData.map(m => m.mapId).sort((a, b) => getMapDisplayName(a).localeCompare(getMapDisplayName(b)));
    const availableAgents = agentsData.map(a => a.characterId!).filter(Boolean).sort((a, b) => getAgentName(a).localeCompare(getAgentName(b)));

    // Build Prisma Where Clause (with teamId filter)
    const whereClause: Prisma.MatchWhereInput = {
        teamId: id  // Security
    };

    if (filterMaps.length > 0) {
        whereClause.mapId = { in: filterMaps };
    }

    if (filterOpponents.length > 0) {
        const conditions: any[] = [];

        filterOpponents.forEach(name => {
            // Condition 1: We are Red, Opponent is Blue
            conditions.push({
                AND: [
                    { myTeamSide: 'Red' },
                    { blueTeamName: name }
                ]
            });
            // Condition 2: We are Blue, Opponent is Red
            conditions.push({
                AND: [
                    { myTeamSide: 'Blue' },
                    { redTeamName: name }
                ]
            });
        });

        if (conditions.length > 0) {
            // @ts-ignore
            whereClause.OR = conditions;
        }
    }

    if (startDate || endDate) {
        whereClause.gameStartMillis = {};
        if (startDate) {
            whereClause.gameStartMillis.gte = BigInt(new Date(startDate).getTime());
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.gameStartMillis.lte = BigInt(end.getTime());
        }
    }

    if (includeTags.length > 0) {
        whereClause.tags = {
            some: {
                tagName: { in: includeTags }
            }
        };
    }

    if (excludeTags.length > 0) {
        if (whereClause.tags) {
            if (whereClause.OR) {
                whereClause.AND = [
                    { OR: whereClause.OR },
                    { tags: whereClause.tags },
                    { tags: { none: { tagName: { in: excludeTags } } } }
                ];
                delete whereClause.OR;
                delete whereClause.tags;
            } else {
                whereClause.AND = [
                    { tags: whereClause.tags },
                    { tags: { none: { tagName: { in: excludeTags } } } }
                ];
                delete whereClause.tags;
            }
        } else {
            if (whereClause.OR) {
                whereClause.AND = [
                    { OR: whereClause.OR },
                    { tags: { none: { tagName: { in: excludeTags } } } }
                ];
                delete whereClause.OR;
            } else {
                whereClause.tags = {
                    none: {
                        tagName: { in: excludeTags }
                    }
                };
            }
        }
    }

    // Agent Filtering Logic
    // If agent filter is present, we need to filter matches where the team composition includes ANY of the selected agents.
    // However, Prisma where clause for related fields (players) is a bit complex.
    // We want matches where at least one player on the team (teamId=id) played one of the selected agents.
    if (filterAgents.length > 0) {
        // Create a condition: match must have at least one player from this team who played one of the selected agents.
        const agentCondition = {
            players: {
                some: {
                    teamId: id,
                    characterId: { in: filterAgents }
                }
            }
        };

        if (whereClause.AND) {
            if (Array.isArray(whereClause.AND)) {
                whereClause.AND.push(agentCondition);
            } else {
                whereClause.AND = [whereClause.AND, agentCondition];
            }
        } else {
            // If there's already an OR or other conditions, we need to bundle them.
            // But simpler is to adding it to AND if possible or just setting it.
            // Given the structure above, we can just assign it if no AND exists, but need to be careful not to overwrite.
            // A safer way is to always use AND if we are adding multiple independent constraints that didn't fit into the top-level object properties.
            // But here, 'players' is a top-level property of MatchWhereInput, so we can just set it?
            // Yes, whereClause.players = ... 
            // BUT, wait, we might have multiple conditions on players? No, currently we don't.
            whereClause.players = agentCondition.players;
        }
    }


    // Fetch Filtered Matches
    const matches = await prisma.match.findMany({
        where: whereClause,
        take: 50, // Increase limit slightly as filters might narrow it down
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

    return (
        <div className="space-y-6">
            {/* Team Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">{team.name}</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {team._count.members} メンバー • {matches.length} マッチ (表示中)
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

            {/* Filter Bar - Tactical Valorant Style */}
            <div className="sticky top-0 z-50 transition-all duration-300">
                {/* 背景レイヤー：わずかに透過したグラデーションと強いぼかし */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f1923] via-[#0f1923]/95 to-[#0f1923]/90 backdrop-blur-xl shadow-2xl" />

                {/* 装飾用の赤いライン（VALORANTのアクセント） */}
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

                <div className="relative max-w-7xl mx-auto px-8 py-5">
                    <FilterBar
                        maps={availableMaps}
                        agents={availableAgents}
                        opponents={availableOpponents}
                    />
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
                        <p className="mb-4">条件に一致するマッチが見つかりませんでした。</p>
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
