import { Prisma } from '@prisma/client';
import { getMapDisplayName, getAgentName, getAgentRole } from '@/lib/utils';

// Define the Match type with included relations
export type MatchWithDetails = Prisma.MatchGetPayload<{
    include: {
        rounds: true;
        players: {
            include: {
                player: true;
            };
        };
        kills: true;
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

export function calculateStats(matches: MatchWithDetails[], filterPlayers: string[], filterAgents: string[]) {
    const totalMatches = matches.length;
    let totalRounds = 0;

    // 2. Map Stats
    const mapStatsMap = new Map<string, Omit<MapStat, 'mapName' | 'myTeamWinRate' | 'enemyWinRate' | 'attackWinRate' | 'defenseWinRate' | 'pistolWinRate' | 'pistolAttackWinRate' | 'pistolDefenseWinRate' | 'retakeSuccessRate' | 'postPlantWinRate'>>();

    // 3. Agent Stats (Filtered Players only)
    const agentStatsMap = new Map<string, { picks: number; wins: number; matches: number }>();

    // 4. Player Stats (Filtered Players only)
    const playerStatsMap = new Map<string, Omit<PlayerStat, 'kd' | 'acs'>>();

    // 5. Composition Stats
    const compositionStatsMap = new Map<string, { played: number; wins: number }>();

    matches.forEach(match => {
        // Determine "My Team" Side based on Filtered Players
        let myTeamSide: string | null = null;

        if (filterPlayers.length > 0) {
            const myTeamPlayer = match.players.find(p => filterPlayers.includes(p.puuid));
            myTeamSide = myTeamPlayer?.teamId || null;
        }

        totalRounds += match.rounds.length;

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
                postPlantOpportunities: 0, postPlantWins: 0
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
            // Filter Players
            if (filterPlayers.length > 0 && !filterPlayers.includes(mp.puuid)) return;

            // Filter Agents
            if (filterAgents.length > 0 && mp.characterId && !filterAgents.includes(mp.characterId)) return;

            // Player Stats
            if (!playerStatsMap.has(mp.puuid)) {
                playerStatsMap.set(mp.puuid, {
                    puuid: mp.puuid,
                    name: mp.player.gameName,
                    tag: mp.player.tagLine,
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
            const pStat = playerStatsMap.get(mp.puuid)!;
            pStat.matches++;
            pStat.kills += mp.kills || 0;
            pStat.deaths += mp.deaths || 0;
            pStat.assists += mp.assists || 0;
            pStat.score += mp.score || 0;
            pStat.roundsPlayed += match.rounds.length;

            // Agent Stats
            if (mp.characterId) {
                if (!agentStatsMap.has(mp.characterId)) {
                    agentStatsMap.set(mp.characterId, { picks: 0, wins: 0, matches: 0 });
                }
                const aStat = agentStatsMap.get(mp.characterId)!;
                aStat.picks++;
                // Check if this player's team won
                if (mp.teamId === match.winningTeam) {
                    aStat.wins++;
                }
            }
        });

        // Composition Stats
        if (filterPlayers.length > 0) {
            const myTeamPlayers = match.players.filter(p => filterPlayers.includes(p.puuid));
            if (myTeamPlayers.length > 0) {
                const myTeamSide = myTeamPlayers[0].teamId;
                // Get all 5 agents from my team
                const teamAgents = match.players
                    .filter(p => p.teamId === myTeamSide && p.characterId)
                    .map(p => p.characterId!)
                    .sort(); // Sort for consistency

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
        }

        // Round Analysis (Only if My Team is identified)
        if (myTeamSide) {
            match.rounds.forEach(round => {
                const isRed = myTeamSide === 'Red';
                // Determine if the round is played on the "First Half Side" (Red=Atk, Blue=Def)
                // Rounds 0-11: Yes, Rounds 12-23: No
                // OT Rounds (24+): Even=Yes, Odd=No
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

                // Pistol Rounds (0 and 12)
                if (round.roundNum === 0 || round.roundNum === 12) {
                    mapStat.pistolRounds++;
                    if (weWon) mapStat.pistolWins++;

                    // Track by side
                    if (currentSide === 'Attack') {
                        mapStat.pistolAttackRounds++;
                        if (weWon) mapStat.pistolAttackWins++;
                    } else {
                        mapStat.pistolDefenseRounds++;
                        if (weWon) mapStat.pistolDefenseWins++;
                    }
                }

                // Post-Plant / Retake (plantRoundTime === 0 means not planted)
                const spikePlanted = round.plantRoundTime !== null && round.plantRoundTime > 0;
                if (spikePlanted) {
                    if (currentSide === 'Defense') {
                        // Retake Scenario
                        // Exclude case: Round timer expired (defense won without actual retake)
                        if (round.roundResult !== 'Round timer expired') {
                            mapStat.retakeOpportunities++;
                            if (weWon) mapStat.retakeSuccesses++;
                        }
                    } else {
                        // Post-Plant Scenario (Attack)
                        // Exclude case: Plant happened AFTER eliminating all enemies
                        // (i.e., roundResult is "Eliminated" and plant time > last kill time)
                        let isValidPostPlant = true;

                        if (round.roundResult === 'Eliminated') {
                            const roundKillsForCheck = match.kills
                                .filter(k => k.roundNum === round.roundNum)
                                .sort((a, b) => (a.roundTime || 0) - (b.roundTime || 0));

                            if (roundKillsForCheck.length > 0) {
                                const lastKillTime = roundKillsForCheck[roundKillsForCheck.length - 1].roundTime || 0;
                                if (round.plantRoundTime && round.plantRoundTime > lastKillTime) {
                                    // Plant happened after the last kill = eliminated then planted
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
                const roundKills = match.kills
                    .filter(k => k.roundNum === round.roundNum)
                    .sort((a, b) => (a.roundTime || 0) - (b.roundTime || 0));

                if (roundKills.length > 0) {
                    const firstKill = roundKills[0];
                    const killerId = firstKill.killerId;
                    const victimId = firstKill.victimId;

                    // Update Killer Stats (if tracked)
                    if (killerId && playerStatsMap.has(killerId)) {
                        playerStatsMap.get(killerId)!.firstKills++;
                    }
                    // Update Victim Stats (if tracked)
                    if (victimId && playerStatsMap.has(victimId)) {
                        playerStatsMap.get(victimId)!.firstDeaths++;
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
        pickRate: totalMatches > 0 ? (stat.picks / (totalMatches * 5)) * 100 : 0, // 5 players per team
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
    }).sort((a, b) => b.played - a.played); // Sort by most played

    return {
        totalMatches,
        totalRounds,
        mapStats,
        agentStats,
        playerStats,
        compositionStats
    };
}
