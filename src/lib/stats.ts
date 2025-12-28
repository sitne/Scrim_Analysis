import { Prisma } from '@prisma/client';
import { getMapDisplayName, getAgentName, getAgentRole } from '@/lib/utils';

// Define the Match type with included relations
// Define the Match type with included relations
export type MatchWithDetails = Prisma.MatchGetPayload<{
    include: {
        rounds: {
            include: {
                playerStats: true;
            };
        };
        players: {
            include: {
                player: {
                    include: {
                        mergedTo: true;
                    };
                };
            };
        };
        kills: true;
        damageEvents: true;
    };
}>;

export interface MapStat {
    mapId: string;
    mapName: string;
    played: number;
    myTeamWins: number;
    enemyWins: number;
    attackWins: number;
    defenseWins: number;
    attackRounds: number;
    defenseRounds: number;
    pistolRounds: number;
    pistolWins: number;
    pistolAttackRounds: number;
    pistolAttackWins: number;
    pistolDefenseRounds: number;
    pistolDefenseWins: number;
    retakeOpportunities: number;
    retakeSuccesses: number;
    postPlantOpportunities: number;
    postPlantWins: number;
    // Derived rates
    myTeamWinRate: number;
    enemyWinRate: number;
    attackWinRate: number;
    defenseWinRate: number;
    pistolWinRate: number;
    pistolAttackWinRate: number;
    pistolDefenseWinRate: number;
    retakeSuccessRate: number;
    postPlantWinRate: number;
    // 5v4 / 4v5 stats
    win5v4: number;
    opportunity5v4: number;
    win4v5: number;
    opportunity4v5: number;
    winRate5v4: number;
    winRate4v5: number;
}

export interface AgentStat {
    agentId: string;
    agentName: string;
    picks: number;
    wins: number;
    matches: number;
    winRate: number;
    pickRate: number;
}

export interface PlayerStat {
    puuid: string;
    name: string;
    tag: string;
    matches: number;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    roundsPlayed: number;
    firstKills: number;
    firstDeaths: number;
    // Derived stats
    kd: number;
    acs: number;
}

export interface CompositionStat {
    composition: string[];  // Array of 5 agent IDs, sorted
    compositionNames: string[];  // Array of 5 agent names, sorted
    played: number;
    wins: number;
    winRate: number;
}

export function calculateStats(
    matches: MatchWithDetails[],
    filterPlayers: string[],
    filterAgents: string[],
    options: { homeTeamOnly?: boolean } = {}
) {
    // ... (Variables initialization)
    const totalMatches = matches.length;
    let totalRounds = 0;

    // 2. Map Stats
    const mapStatsMap = new Map<string, Omit<MapStat, 'mapName' | 'myTeamWinRate' | 'enemyWinRate' | 'attackWinRate' | 'defenseWinRate' | 'pistolWinRate' | 'pistolAttackWinRate' | 'pistolDefenseWinRate' | 'retakeSuccessRate' | 'postPlantWinRate' | 'winRate5v4' | 'winRate4v5'>>();

    // 3. Agent Stats (Filtered Players only)
    const agentStatsMap = new Map<string, { picks: number; wins: number; matches: number }>();

    // 4. Player Stats (Filtered Players only)
    const playerStatsMap = new Map<string, Omit<PlayerStat, 'kd' | 'acs'>>();

    // 5. Composition Stats
    const compositionStatsMap = new Map<string, { played: number; wins: number }>();

    matches.forEach(match => {
        // Determine "My Team" Side
        // Prioritize filterPlayers if present, otherwise use match.myTeamSide
        let myTeamSide: string | null = match.myTeamSide;

        if (filterPlayers.length > 0) {
            const myTeamPlayer = match.players.find(p => {
                const effectivePuuid = p.player.mergedToPuuid || p.puuid;
                return filterPlayers.includes(effectivePuuid);
            });
            myTeamSide = myTeamPlayer?.teamId || null;
        }

        const validRounds = match.rounds.filter(r => r.roundNum < 24);
        totalRounds += validRounds.length;

        // Map Stats
        if (!mapStatsMap.has(match.mapId)) {
            mapStatsMap.set(match.mapId, {
                mapId: match.mapId,
                played: 0, myTeamWins: 0, enemyWins: 0,
                attackWins: 0, defenseWins: 0,
                attackRounds: 0, defenseRounds: 0,
                pistolRounds: 0, pistolWins: 0,
                pistolAttackRounds: 0, pistolAttackWins: 0,
                pistolDefenseRounds: 0, pistolDefenseWins: 0,
                retakeOpportunities: 0, retakeSuccesses: 0,
                postPlantOpportunities: 0, postPlantWins: 0,
                win5v4: 0, opportunity5v4: 0,
                win4v5: 0, opportunity4v5: 0
            });
        }
        const mapStat = mapStatsMap.get(match.mapId)!;
        mapStat.played++;

        if (myTeamSide) {
            if (match.winningTeam === myTeamSide) {
                mapStat.myTeamWins++;
            } else if (match.winningTeam && match.winningTeam !== 'Draw') {
                mapStat.enemyWins++;
            }
        }

        // Player & Agent Stats
        match.players.forEach(mp => {
            // Resolve Player Identity (Merge Logic)
            let effectivePuuid = mp.puuid;
            let effectiveName = mp.player.alias || mp.player.gameName;
            let effectiveTag = mp.player.tagLine;

            if (mp.player.mergedToPuuid && mp.player.mergedTo) {
                effectivePuuid = mp.player.mergedToPuuid;
                effectiveName = mp.player.mergedTo.alias || mp.player.mergedTo.gameName;
                effectiveTag = mp.player.mergedTo.tagLine;
            }

            // Filtering Logic
            // 1. Filter Players (Explicit selection)
            if (filterPlayers.length > 0 && !filterPlayers.includes(effectivePuuid)) return;

            // 2. Home Team Only (Implicit context)
            if (options.homeTeamOnly && myTeamSide && mp.teamId !== myTeamSide) return;

            // 3. Filter Agents
            if (filterAgents.length > 0 && mp.characterId && !filterAgents.includes(mp.characterId)) return;

            // Player Stats
            if (!playerStatsMap.has(effectivePuuid)) {
                playerStatsMap.set(effectivePuuid, {
                    puuid: effectivePuuid,
                    name: effectiveName,
                    tag: effectiveTag,
                    matches: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    score: 0,
                    roundsPlayed: 0,
                    firstKills: 0,
                    firstDeaths: 0
                });
            }
            const pStat = playerStatsMap.get(effectivePuuid)!;
            pStat.matches++;
            pStat.kills += mp.kills || 0;
            pStat.deaths += mp.deaths || 0;
            pStat.assists += mp.assists || 0;
            pStat.score += mp.score || 0;
            const matchRoundsCount = match.rounds.filter(r => r.roundNum < 24).length;
            pStat.roundsPlayed += matchRoundsCount;

            // Agent Stats
            if (mp.characterId) {
                if (!agentStatsMap.has(mp.characterId)) {
                    agentStatsMap.set(mp.characterId, { picks: 0, wins: 0, matches: 0 });
                }
                const aStat = agentStatsMap.get(mp.characterId)!;
                aStat.picks++;
                if (mp.teamId === match.winningTeam) {
                    aStat.wins++;
                }
            }
        });

        // Composition Stats
        if (myTeamSide) {
            // Get all 5 agents from the identified team (Home Team or filtered)
            const teamAgents = match.players
                .filter(p => p.teamId === myTeamSide && p.characterId)
                .map(p => p.characterId!)
                .sort();

            if (teamAgents.length === 5) {
                const compKey = teamAgents.join(',');
                if (!compositionStatsMap.has(compKey)) {
                    compositionStatsMap.set(compKey, { played: 0, wins: 0 });
                }
                const compStat = compositionStatsMap.get(compKey)!;
                compStat.played++;
                if (match.winningTeam === myTeamSide) {
                    compStat.wins++;
                }
            }
        }

        // Pre-group kills by round for efficiency
        const killsByRound = new Map<number, typeof match.kills>();
        match.kills.forEach(k => {
            if (k.roundNum === null) return;
            if (!killsByRound.has(k.roundNum)) killsByRound.set(k.roundNum, []);
            killsByRound.get(k.roundNum)!.push(k);
        });

        // Round Analysis (Only if My Team is identified)
        if (myTeamSide) {
            match.rounds.filter(r => r.roundNum < 24).forEach(round => {
                const roundKills = (killsByRound.get(round.roundNum) || [])
                    .sort((a, b) => (a.roundTime || 0) - (b.roundTime || 0));
                const isRed = myTeamSide === 'Red';
                const isFirstHalfSide = (round.roundNum < 12) || (round.roundNum >= 24 && (round.roundNum - 24) % 2 === 0);
                const currentSide = (isRed === isFirstHalfSide) ? 'Attack' : 'Defense';

                const weWon = round.winningTeam === myTeamSide;

                // Atk/Def Stats
                if (currentSide === 'Attack') {
                    mapStat.attackRounds++;
                    if (weWon) mapStat.attackWins++;
                } else {
                    mapStat.defenseRounds++;
                    if (weWon) mapStat.defenseWins++;
                }

                // Pistol Rounds
                if (round.roundNum === 0 || round.roundNum === 12) {
                    mapStat.pistolRounds++;
                    if (weWon) mapStat.pistolWins++;
                    if (currentSide === 'Attack') {
                        mapStat.pistolAttackRounds++;
                        if (weWon) mapStat.pistolAttackWins++;
                    } else {
                        mapStat.pistolDefenseRounds++;
                        if (weWon) mapStat.pistolDefenseWins++;
                    }
                }

                // Post-Plant / Retake
                const spikePlanted = round.plantRoundTime !== null && round.plantRoundTime > 0;
                if (spikePlanted) {
                    if (currentSide === 'Defense') {
                        if (round.roundResult !== 'Round timer expired') {
                            mapStat.retakeOpportunities++;
                            if (weWon) mapStat.retakeSuccesses++;
                        }
                    } else {
                        let isValidPostPlant = true;
                        if (round.roundResult === 'Eliminated') {
                            if (roundKills.length > 0) {
                                const lastKillTime = roundKills[roundKills.length - 1].roundTime || 0;
                                if (round.plantRoundTime && round.plantRoundTime > lastKillTime) {
                                    isValidPostPlant = false;
                                }
                            }
                        }
                        if (isValidPostPlant) {
                            mapStat.postPlantOpportunities++;
                            if (weWon) mapStat.postPlantWins++;
                        }
                    }
                }

                // FK / FD Analysis
                if (roundKills.length > 0) {
                    const firstKill = roundKills[0];
                    const killerId = firstKill.killerId;
                    const victimId = firstKill.victimId;

                    if (killerId && playerStatsMap.has(killerId)) {
                        playerStatsMap.get(killerId)!.firstKills++;
                    }
                    if (victimId && playerStatsMap.has(victimId)) {
                        playerStatsMap.get(victimId)!.firstDeaths++;
                    }
                }

                // 5v4 / 4v5 Analysis
                if (roundKills.length > 0) {
                    const firstKill = roundKills[0];
                    const killerId = firstKill.killerId;
                    const killerTeamId = match.players.find(p => p.puuid === killerId)?.teamId;

                    if (killerTeamId) {
                        // Check for trade (killer died within 3s?)
                        const tradeLimitTime = (firstKill.roundTime || 0) + 3000;
                        const validTrade = roundKills.find(k =>
                            k.victimId === killerId &&
                            (k.roundTime || 0) > (firstKill.roundTime || 0) &&
                            (k.roundTime || 0) <= tradeLimitTime
                        );

                        if (!validTrade) {
                            const isMyTeamKiller = killerTeamId === myTeamSide;
                            const weWon = round.winningTeam === myTeamSide;

                            if (isMyTeamKiller) {
                                // 5v4
                                mapStat.opportunity5v4++;
                                if (weWon) mapStat.win5v4++;
                            } else {
                                // 4v5
                                mapStat.opportunity4v5++;
                                if (weWon) mapStat.win4v5++;
                            }
                        }
                    }
                }
            });
        }
    });


    // Convert Maps to Arrays and calculate derived stats
    const mapStats: MapStat[] = Array.from(mapStatsMap.values()).map(stat => ({
        ...stat,
        mapName: getMapDisplayName(stat.mapId),
        myTeamWinRate: stat.played > 0 ? (stat.myTeamWins / stat.played) * 100 : 0,
        enemyWinRate: stat.played > 0 ? (stat.enemyWins / stat.played) * 100 : 0,
        attackWinRate: stat.attackRounds > 0 ? (stat.attackWins / stat.attackRounds) * 100 : 0,
        defenseWinRate: stat.defenseRounds > 0 ? (stat.defenseWins / stat.defenseRounds) * 100 : 0,
        pistolWinRate: stat.pistolRounds > 0 ? (stat.pistolWins / stat.pistolRounds) * 100 : 0,
        pistolAttackWinRate: stat.pistolAttackRounds > 0 ? (stat.pistolAttackWins / stat.pistolAttackRounds) * 100 : 0,
        pistolDefenseWinRate: stat.pistolDefenseRounds > 0 ? (stat.pistolDefenseWins / stat.pistolDefenseRounds) * 100 : 0,
        retakeSuccessRate: stat.retakeOpportunities > 0 ? (stat.retakeSuccesses / stat.retakeOpportunities) * 100 : 0,
        postPlantWinRate: stat.postPlantOpportunities > 0 ? (stat.postPlantWins / stat.postPlantOpportunities) * 100 : 0,
        winRate5v4: stat.opportunity5v4 > 0 ? (stat.win5v4 / stat.opportunity5v4) * 100 : 0,
        winRate4v5: stat.opportunity4v5 > 0 ? (stat.win4v5 / stat.opportunity4v5) * 100 : 0,
    }));

    const roleOrder: Record<string, number> = {
        'Duelist': 1,
        'Initiator': 2,
        'Sentinel': 3,
        'Controller': 4
    };

    const agentStats: AgentStat[] = Array.from(agentStatsMap.entries()).map(([agentId, stat]) => ({
        agentId,
        agentName: getAgentName(agentId),
        ...stat,
        winRate: stat.picks > 0 ? (stat.wins / stat.picks) * 100 : 0,
        pickRate: totalMatches > 0 ? (stat.picks / (totalMatches * 5)) * 100 : 0,
    })).sort((a, b) => {
        const roleA = getAgentRole(a.agentId);
        const roleB = getAgentRole(b.agentId);
        const orderA = roleOrder[roleA] || 99;
        const orderB = roleOrder[roleB] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.agentName.localeCompare(b.agentName);
    });

    const playerStats: PlayerStat[] = Array.from(playerStatsMap.values()).map(stat => ({
        ...stat,
        kd: stat.deaths > 0 ? stat.kills / stat.deaths : stat.kills,
        acs: stat.roundsPlayed > 0 ? stat.score / stat.roundsPlayed : 0,
    })).sort((a, b) => b.acs - a.acs);

    const compositionStats: CompositionStat[] = Array.from(compositionStatsMap.entries()).map(([compKey, stat]) => {
        const composition = compKey.split(',');
        return {
            composition,
            compositionNames: composition.map(agentId => getAgentName(agentId)),
            played: stat.played,
            wins: stat.wins,
            winRate: stat.played > 0 ? (stat.wins / stat.played) * 100 : 0,
        };
    }).sort((a, b) => b.played - a.played);

    return {
        totalMatches,
        totalRounds,
        mapStats,
        agentStats,
        playerStats,
        compositionStats
    };
}

// Helper functions for match stats
export const calculateACS = (score: number, rounds: number) => {
    return rounds > 0 ? Math.round(score / rounds) : 0;
};

export const calculateKD = (kills: number, deaths: number) => {
    return deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
};

export const calculateADR = (match: MatchWithDetails, puuid: string, totalRounds: number) => {
    const totalDamage = match.rounds.reduce((sum, round) => {
        const playerRoundStat = round.playerStats.find(ps => ps.puuid === puuid);
        if (round.roundNum >= 24) return sum;
        return sum + (playerRoundStat?.damage || 0);
    }, 0);
    return totalRounds > 0 ? Math.round(totalDamage / totalRounds) : 0;
};

export const calculateHS = (match: MatchWithDetails, puuid: string) => {
    // ショットガンのUUIDリスト
    const SHOTGUN_UUIDS = new Set([
        '91038161-4B7C-2150-7061-39B512B3B451', // Bucky
        'EC845555-41DA-72BD-7C95-F396279FD13F', // Judge
        '42DA8CCC-40D5-AFFC-BEEC-15AA47B42EDA', // Shorty
    ]);

    let totalShots = 0;
    let headshots = 0;

    match.damageEvents.forEach(de => {
        if (de.attackerId !== puuid || SHOTGUN_UUIDS.has(de.weapon || '')) return;
        totalShots += ((de.legshots || 0) + (de.bodyshots || 0) + (de.headshots || 0));
        headshots += (de.headshots || 0);
    });

    return totalShots > 0 ? Math.round((headshots / totalShots) * 100) : 0;
};

export const calculateKAST = (match: MatchWithDetails, puuid: string, totalRounds: number) => {
    if (totalRounds === 0) return 0;

    let kastRoundsCount = 0;

    // Pre-group kills by round for efficiency
    const killsByRound = new Map<number, typeof match.kills>();
    match.kills.forEach(k => {
        if (k.roundNum === null) return;
        if (!killsByRound.has(k.roundNum)) killsByRound.set(k.roundNum, []);
        killsByRound.get(k.roundNum)!.push(k);
    });

    match.rounds.filter(r => r.roundNum < 24).forEach(round => {
        const pStats = round.playerStats.find(ps => ps.puuid === puuid);
        if (!pStats) return;

        const roundKills = killsByRound.get(round.roundNum) || [];

        // K: Kill
        const gotKill = (pStats.kills || 0) > 0;

        // A: Assist
        const gotAssist = roundKills.some(ke => {
            const assistants = typeof ke.assistants === 'string' ? JSON.parse(ke.assistants) : (ke.assistants || []);
            return assistants.includes(puuid);
        });

        // S: Survive (Killed in this round?)
        const deathEvent = roundKills.find(ke => ke.victimId === puuid);
        const died = !!deathEvent;

        // T: Trade
        let traded = false;
        if (deathEvent) {
            const killerId = deathEvent.killerId;
            const killerDeath = roundKills.find(ke =>
                ke.victimId === killerId &&
                ke.roundTime !== null &&
                deathEvent.roundTime !== null &&
                ke.roundTime > deathEvent.roundTime &&
                ke.roundTime <= deathEvent.roundTime + 3000 // 3 seconds trade window
            );
            if (killerDeath) traded = true;
        }

        if (gotKill || gotAssist || !died || traded) {
            kastRoundsCount++;
        }
    });

    return Math.round((kastRoundsCount / totalRounds) * 100);
};

export const calculateFKFD = (match: MatchWithDetails, puuid: string) => {
    let fk = 0;
    let fd = 0;

    // Pre-group kills by round for efficiency
    const killsByRound = new Map<number, typeof match.kills>();
    match.kills.forEach(k => {
        if (k.roundNum === null) return;
        if (!killsByRound.has(k.roundNum)) killsByRound.set(k.roundNum, []);
        killsByRound.get(k.roundNum)!.push(k);
    });

    match.rounds.filter(r => r.roundNum < 24).forEach(round => {
        const roundKills = (killsByRound.get(round.roundNum) || [])
            .sort((a, b) => (a.roundTime || 0) - (b.roundTime || 0));

        if (roundKills.length > 0) {
            if (roundKills[0].killerId === puuid) fk++;
            if (roundKills[0].victimId === puuid) fd++;
        }
    });

    return { fk, fd };
};
