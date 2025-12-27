import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAgentName, getAgentIconPath, getMapDisplayName, getAgentRole } from '@/lib/utils';
import Link from 'next/link';
import { FilterBar } from '@/components/FilterBar';
import { calculateStats, MatchWithDetails } from '@/lib/stats';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchValorantData } from '@/lib/valorant-api';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TeamStatsPage(props: PageProps) {
    const { id } = await props.params;
    const searchParams = await props.searchParams;

    // 1. 認証チェック
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // 2. チームメンバーシップ検証
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId: id,
                userId: user.id,
            },
        },
    });

    if (!membership) {
        redirect('/team');
    }

    // 3. チーム情報取得
    const team = await prisma.team.findUnique({
        where: { id },
        select: { name: true }
    });

    if (!team) {
        redirect('/team');
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

    // 4. チーム単位でデータ取得
    const [matchesForOpponentsResult, matchesData, agentsData] = await Promise.all([
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
    ]);

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
        teamId: id  // ← セキュリティ上重要
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
            // whereClause.OR が既にある場合、ANDで結合する必要がある
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
            // ORがある場合も考慮
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

    // Fetch Filtered Matches (team-scoped)
    const matches = await prisma.match.findMany({
        where: whereClause,
        include: {
            rounds: {
                select: {
                    roundNum: true,
                    winningTeam: true,
                    roundResult: true,
                    plantRoundTime: true,
                    playerStats: {
                        select: {
                            puuid: true,
                            score: true,
                            kills: true,
                            damage: true,
                        }
                    }
                }
            },
            players: {
                select: {
                    puuid: true,
                    teamId: true,
                    characterId: true,
                    kills: true,
                    deaths: true,
                    assists: true,
                    score: true,
                    player: {
                        select: {
                            gameName: true,
                            tagLine: true,
                            alias: true,
                            mergedToPuuid: true,
                            mergedTo: {
                                select: {
                                    gameName: true,
                                    tagLine: true,
                                    alias: true,
                                }
                            }
                        }
                    }
                }
            },
            kills: {
                select: {
                    roundNum: true,
                    roundTime: true,
                    killerId: true,
                    victimId: true,
                    assistants: true,
                }
            },
        },
        orderBy: { gameStartMillis: 'desc' }
    }) as MatchWithDetails[];

    // Calculate Stats
    const {
        totalMatches,
        mapStats,
        agentStats,
        playerStats,
        compositionStats
    } = calculateStats(matches, [], filterAgents, { homeTeamOnly: true });

    return (
        <div className="min-h-screen bg-[#0f1923] text-white font-sans">
            {/* Sticky Filter Bar */}
            <div className="sticky top-0 z-50 bg-[#0f1923] px-8 pt-8 pb-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">統計</h1>
                            <p className="text-gray-400 mt-2">{team.name} のパフォーマンス</p>
                        </div>
                        <Link
                            href={`/team/${id}`}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm font-semibold transition-colors"
                        >
                            ← チームへ戻る
                        </Link>
                    </div>

                    {/* Filter Bar */}
                    <FilterBar
                        maps={availableMaps}
                        agents={availableAgents}

                        opponents={availableOpponents}
                    />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-8 pb-8">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-lg">
                            <div className="text-gray-400 text-sm font-semibold mb-1">マッチ数</div>
                            <div className="text-4xl font-bold">{totalMatches}</div>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-lg">
                            <div className="text-gray-400 text-sm font-semibold mb-1">マップ勝率</div>
                            <div className="text-4xl font-bold text-green-400">
                                {`${(totalMatches > 0 ? ((mapStats.reduce((acc, curr) => acc + curr.myTeamWins, 0) / mapStats.reduce((acc, curr) => acc + curr.played, 0)) * 100).toFixed(1) : 0)}%`}
                            </div>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-lg">
                            <div className="text-gray-400 text-sm font-semibold mb-1">ラウンド勝率</div>
                            <div className="flex gap-4 items-end">
                                <div>
                                    <span className="text-2xl font-bold text-orange-400">
                                        {mapStats.reduce((acc, curr) => acc + curr.attackRounds, 0) > 0
                                            ? ((mapStats.reduce((acc, curr) => acc + curr.attackWins, 0) / mapStats.reduce((acc, curr) => acc + curr.attackRounds, 0)) * 100).toFixed(0)
                                            : 0}%
                                    </span>
                                    <span className="text-xs text-gray-500 ml-1">ATK</span>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold text-blue-400">
                                        {mapStats.reduce((acc, curr) => acc + curr.defenseRounds, 0) > 0
                                            ? ((mapStats.reduce((acc, curr) => acc + curr.defenseWins, 0) / mapStats.reduce((acc, curr) => acc + curr.defenseRounds, 0)) * 100).toFixed(0)
                                            : 0}%
                                    </span>
                                    <span className="text-xs text-gray-500 ml-1">DEF</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-lg">
                            <div className="text-gray-400 text-sm font-semibold mb-1">ピストル勝率</div>
                            <div className="text-4xl font-bold text-yellow-400">
                                {`${(mapStats.reduce((acc, curr) => acc + curr.pistolRounds, 0) > 0
                                    ? ((mapStats.reduce((acc, curr) => acc + curr.pistolWins, 0) / mapStats.reduce((acc, curr) => acc + curr.pistolRounds, 0)) * 100).toFixed(1)
                                    : 0)}%`}
                            </div>
                        </div>
                    </div>

                    {/* Map Statistics */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold border-l-4 border-red-500 pl-4">マップ統計</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="p-4">マップ</th>
                                            <th className="p-4 text-center">試合数</th>
                                            <th className="p-4 text-center">勝率</th>
                                            <th className="p-4 text-center">ATK勝率</th>
                                            <th className="p-4 text-center">DEF勝率</th>
                                            <th className="p-4 text-center">ピストルATK</th>
                                            <th className="p-4 text-center">ピストルDEF</th>
                                            <th className="p-4 text-center">リテイク</th>
                                            <th className="p-4 text-center">ポストプラント</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {mapStats.map((stat) => (
                                            <tr key={stat.mapId} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="p-4 font-bold text-lg">{stat.mapName}</td>
                                                <td className="p-4 text-center font-mono">{stat.played}</td>
                                                <td className="p-4 text-center font-mono text-green-400">
                                                    {`${stat.myTeamWinRate.toFixed(1)}%`}
                                                </td>
                                                <td className="p-4 text-center font-mono text-orange-400">
                                                    {`${stat.attackWinRate.toFixed(1)}%`}
                                                    <span className="text-xs text-gray-500 ml-1">({stat.attackWins}/{stat.attackRounds})</span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-blue-400">
                                                    {`${stat.defenseWinRate.toFixed(1)}%`}
                                                    <span className="text-xs text-gray-500 ml-1">({stat.defenseWins}/{stat.defenseRounds})</span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-orange-400">
                                                    {`${stat.pistolAttackWinRate.toFixed(1)}%`}
                                                    <span className="text-xs text-gray-500 ml-1">({stat.pistolAttackWins}/{stat.pistolAttackRounds})</span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-blue-400">
                                                    {`${stat.pistolDefenseWinRate.toFixed(1)}%`}
                                                    <span className="text-xs text-gray-500 ml-1">({stat.pistolDefenseWins}/{stat.pistolDefenseRounds})</span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-purple-400">
                                                    {`${stat.retakeSuccessRate.toFixed(1)}%`}
                                                    <span className="text-xs text-gray-500 ml-1">({stat.retakeSuccesses}/{stat.retakeOpportunities})</span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-pink-400">
                                                    {`${stat.postPlantWinRate.toFixed(1)}%`}
                                                    <span className="text-xs text-gray-500 ml-1">({stat.postPlantWins}/{stat.postPlantOpportunities})</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {mapStats.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="p-8 text-center text-gray-500">
                                                    マッチデータがありません
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Agent Statistics */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold border-l-4 border-red-500 pl-4">エージェント統計</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Duelist Column */}
                            <div className="space-y-3">
                                <h3 className="text-center font-bold text-orange-400 border-b border-gray-700 pb-2">デュエリスト</h3>
                                {agentStats.filter(stat => getAgentRole(stat.agentId) === 'Duelist').map((stat) => (
                                    <div key={stat.agentId} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center gap-3 hover:border-orange-500/50 transition-colors">
                                        <img
                                            src={getAgentIconPath(stat.agentId)}
                                            alt={stat.agentName}
                                            className="w-10 h-10 rounded border border-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate">{stat.agentName}</div>
                                            <div className="flex gap-2 text-xs mt-0.5">
                                                <span className="text-gray-400">{stat.picks}picks</span>
                                                <span className={`font-mono ${stat.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{stat.winRate.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Initiator Column */}
                            <div className="space-y-3">
                                <h3 className="text-center font-bold text-green-400 border-b border-gray-700 pb-2">イニシエーター</h3>
                                {agentStats.filter(stat => getAgentRole(stat.agentId) === 'Initiator').map((stat) => (
                                    <div key={stat.agentId} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center gap-3 hover:border-green-500/50 transition-colors">
                                        <img
                                            src={getAgentIconPath(stat.agentId)}
                                            alt={stat.agentName}
                                            className="w-10 h-10 rounded border border-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate">{stat.agentName}</div>
                                            <div className="flex gap-2 text-xs mt-0.5">
                                                <span className="text-gray-400">{stat.picks}picks</span>
                                                <span className={`font-mono ${stat.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{stat.winRate.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Sentinel Column */}
                            <div className="space-y-3">
                                <h3 className="text-center font-bold text-cyan-400 border-b border-gray-700 pb-2">センチネル</h3>
                                {agentStats.filter(stat => getAgentRole(stat.agentId) === 'Sentinel').map((stat) => (
                                    <div key={stat.agentId} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center gap-3 hover:border-cyan-500/50 transition-colors">
                                        <img
                                            src={getAgentIconPath(stat.agentId)}
                                            alt={stat.agentName}
                                            className="w-10 h-10 rounded border border-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate">{stat.agentName}</div>
                                            <div className="flex gap-2 text-xs mt-0.5">
                                                <span className="text-gray-400">{stat.picks}picks</span>
                                                <span className={`font-mono ${stat.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{stat.winRate.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Controller Column */}
                            <div className="space-y-3">
                                <h3 className="text-center font-bold text-purple-400 border-b border-gray-700 pb-2">コントローラー</h3>
                                {agentStats.filter(stat => getAgentRole(stat.agentId) === 'Controller').map((stat) => (
                                    <div key={stat.agentId} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center gap-3 hover:border-purple-500/50 transition-colors">
                                        <img
                                            src={getAgentIconPath(stat.agentId)}
                                            alt={stat.agentName}
                                            className="w-10 h-10 rounded border border-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate">{stat.agentName}</div>
                                            <div className="flex gap-2 text-xs mt-0.5">
                                                <span className="text-gray-400">{stat.picks}picks</span>
                                                <span className={`font-mono ${stat.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{stat.winRate.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Composition Statistics */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold border-l-4 border-red-500 pl-4">構成統計</h2>
                        {compositionStats.length > 0 ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap">
                                        <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="p-4">構成</th>
                                                <th className="p-4 text-center">試合数</th>
                                                <th className="p-4 text-center">勝率</th>
                                                <th className="p-4 text-center">勝利数</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {compositionStats.map((comp, index) => {
                                                const roleOrder: Record<string, number> = {
                                                    'Duelist': 1,
                                                    'Initiator': 2,
                                                    'Sentinel': 3,
                                                    'Controller': 4
                                                };

                                                const sortedAgents = [...comp.composition].sort((a, b) => {
                                                    const roleA = getAgentRole(a);
                                                    const roleB = getAgentRole(b);
                                                    const orderA = roleOrder[roleA] || 99;
                                                    const orderB = roleOrder[roleB] || 99;

                                                    if (orderA !== orderB) return orderA - orderB;
                                                    return getAgentName(a).localeCompare(getAgentName(b));
                                                });

                                                return (
                                                    <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex gap-2 items-center">
                                                                {sortedAgents.map((agentId) => (
                                                                    <img
                                                                        key={agentId}
                                                                        src={getAgentIconPath(agentId)}
                                                                        alt={getAgentName(agentId)}
                                                                        title={`${getAgentName(agentId)} (${getAgentRole(agentId)})`}
                                                                        className="w-8 h-8 rounded border border-gray-700"
                                                                    />
                                                                ))}
                                                            </div>
                                                        </td>

                                                        <td className="p-4 text-center font-mono">{comp.played}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`font-mono font-semibold ${comp.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {comp.winRate.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center font-mono text-gray-400">
                                                            {comp.wins}/{comp.played}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-500">
                                データが不足しています。プレイヤーを選択してください。
                            </div>
                        )}
                    </div>

                    {/* Player Leaderboard */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold border-l-4 border-red-500 pl-4">プレイヤーランキング</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-4 py-3 text-left">プレイヤー</th>
                                            <th className="px-4 py-3 text-center">ACS</th>
                                            <th className="px-4 py-3 text-center">K<span className="text-[10px] ml-0.5 text-gray-500">/M</span></th>
                                            <th className="px-4 py-3 text-center">D<span className="text-[10px] ml-0.5 text-gray-500">/M</span></th>
                                            <th className="px-4 py-3 text-center">A<span className="text-[10px] ml-0.5 text-gray-500">/M</span></th>
                                            <th className="px-4 py-3 text-center">K/D</th>
                                            <th className="px-4 py-3 text-center">FK<span className="text-[10px] ml-0.5 text-gray-500">/M</span></th>
                                            <th className="px-4 py-3 text-center">FD<span className="text-[10px] ml-0.5 text-gray-500">/M</span></th>
                                            <th className="px-4 py-3 text-center">試合数</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {playerStats.map((stat) => (
                                            <tr key={stat.puuid} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="font-semibold text-white">{stat.name}</div>
                                                        <div className="text-sm text-gray-400">#{stat.tag}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono font-semibold text-yellow-400">
                                                    {stat.acs.toFixed(0)}
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono text-white">{(stat.kills / stat.matches).toFixed(1)}</td>
                                                <td className="px-4 py-3 text-center font-mono text-white">{(stat.deaths / stat.matches).toFixed(1)}</td>
                                                <td className="px-4 py-3 text-center font-mono text-white">{(stat.assists / stat.matches).toFixed(1)}</td>
                                                <td className={`px-4 py-3 text-center font-mono font-semibold ${stat.kd >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {stat.kd.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono text-green-400">{(stat.firstKills / stat.matches).toFixed(1)}</td>
                                                <td className="px-4 py-3 text-center font-mono text-red-400">{(stat.firstDeaths / stat.matches).toFixed(1)}</td>
                                                <td className="px-4 py-3 text-center font-mono text-gray-500">{stat.matches}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
