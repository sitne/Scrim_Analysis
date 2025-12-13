import { prisma } from '@/lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importMatchData(matchData: any, teamId: string) {
    if (!matchData || !matchData.matchInfo) {
        console.error('Invalid match data: matchInfo is missing');
        return { status: 'error', error: 'Invalid match data: matchInfo is missing' };
    }

    const matchId = matchData.matchInfo.matchId;

    console.log(`Processing match: ${matchId}`);

    // Check if match already exists
    const existingMatch = await prisma.match.findUnique({
        where: { matchId: matchId },
    });

    if (existingMatch) {
        console.log(`Match ${matchId} already exists. Skipping...`);
        return { status: 'skipped', matchId, reason: 'already exists' };
    }

    // Use transaction for all operations
    await prisma.$transaction(async (tx) => {
        // 1. Create Match
        const matchInfo = matchData.matchInfo;
        await tx.match.create({
            data: {
                matchId: matchInfo.matchId,
                teamId: teamId,
                mapId: matchInfo.mapId,
                gamePodId: matchInfo.gamePodId,
                gameLoopZone: matchInfo.gameLoopZone,
                gameServerAddress: matchInfo.gameServerAddress,
                gameVersion: matchInfo.gameVersion,
                gameLengthMillis: matchInfo.gameLengthMillis,
                gameStartMillis: matchInfo.gameStartMillis,
                provisioningFlowId: matchInfo.provisioningFlowID,
                isCompleted: matchInfo.isCompleted,
                customGameName: matchInfo.customGameName,
                queueId: matchInfo.queueID,
                gameMode: matchInfo.gameMode,
                isRanked: matchInfo.isRanked,
                seasonId: matchInfo.seasonId,
                completionState: matchInfo.completionState,
                platformType: matchInfo.platformType,
                winningTeam: (() => {
                    if (!matchData.roundResults) return null;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const redWins = matchData.roundResults.filter((r: any) => r.winningTeam === 'Red').length;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const blueWins = matchData.roundResults.filter((r: any) => r.winningTeam === 'Blue').length;
                    if (redWins > blueWins) return 'Red';
                    if (blueWins > redWins) return 'Blue';
                    return 'Draw';
                })(),
            },
        });

        // 2. Batch upsert Players
        const playerUpserts = matchData.players.map((player: any) =>
            tx.player.upsert({
                where: { puuid: player.subject },
                update: { gameName: player.gameName, tagLine: player.tagLine },
                create: { puuid: player.subject, gameName: player.gameName, tagLine: player.tagLine },
            })
        );
        await Promise.all(playerUpserts);

        // 3. Batch create MatchPlayers
        await tx.matchPlayer.createMany({
            data: matchData.players.map((player: any) => ({
                matchId: matchInfo.matchId,
                puuid: player.subject,
                teamId: player.teamId,
                partyId: player.partyId,
                characterId: player.characterId,
                competitiveTier: player.competitiveTier,
                accountLevel: player.accountLevel,
                score: player.stats?.score,
                roundsPlayed: player.stats?.roundsPlayed,
                kills: player.stats?.kills,
                deaths: player.stats?.deaths,
                assists: player.stats?.assists,
                playtimeMillis: player.stats?.playtimeMillis,
                grenadeCasts: player.stats?.abilityCasts?.grenadeCasts,
                ability1Casts: player.stats?.abilityCasts?.ability1Casts,
                ability2Casts: player.stats?.abilityCasts?.ability2Casts,
                ultimateCasts: player.stats?.abilityCasts?.ultimateCasts,
            })),
        });

        // 4. Create Rounds, RoundPlayerStats, KillEvents, DamageEvents in batches
        if (matchData.roundResults) {
            // Batch create Rounds
            await tx.round.createMany({
                data: matchData.roundResults.map((round: any) => ({
                    matchId: matchInfo.matchId,
                    roundNum: round.roundNum,
                    roundResult: round.roundResult,
                    roundCeremony: round.roundCeremony,
                    winningTeam: round.winningTeam,
                    bombPlanter: round.bombPlanter,
                    bombDefuser: round.bombDefuser,
                    plantRoundTime: round.plantRoundTime,
                    plantLocationX: round.plantLocation?.x,
                    plantLocationY: round.plantLocation?.y,
                    plantSite: round.plantSite,
                    defuseRoundTime: round.defuseRoundTime,
                    defuseLocationX: round.defuseLocation?.x,
                    defuseLocationY: round.defuseLocation?.y,
                })),
            });

            // Collect all stats for batch insert
            const roundPlayerStatsData: any[] = [];
            const killEventsData: any[] = [];
            const damageEventsData: any[] = [];

            for (const round of matchData.roundResults) {
                if (!round.playerStats) continue;

                const allRoundKills = round.playerStats.flatMap((ps: any) => ps.kills || []);

                for (const pStats of round.playerStats) {
                    const deaths = allRoundKills.filter((k: any) => k.victim === pStats.subject).length;
                    const assists = allRoundKills.filter((k: any) => {
                        if (!k.assistants || !Array.isArray(k.assistants)) return false;
                        return k.assistants.some((a: any) => {
                            if (typeof a === 'string') return a === pStats.subject;
                            return a === pStats.subject || a.assistantId === pStats.subject || a.subject === pStats.subject;
                        });
                    }).length;

                    roundPlayerStatsData.push({
                        matchId: matchInfo.matchId,
                        roundNum: round.roundNum,
                        puuid: pStats.subject,
                        score: pStats.score,
                        kills: pStats.kills?.length || 0,
                        deaths,
                        assists,
                        damage: pStats.damage?.reduce((acc: number, curr: any) => acc + curr.damage, 0) || 0,
                        loadoutValue: pStats.economy?.loadoutValue,
                        weapon: pStats.economy?.weapon,
                        armor: pStats.economy?.armor,
                        remainingMoney: pStats.economy?.remaining,
                        spentMoney: pStats.economy?.spent,
                        wasAfk: pStats.wasAfk,
                        wasPenalized: pStats.wasPenalized,
                        stayedInSpawn: pStats.stayedInSpawn,
                    });

                    // Collect kill events
                    if (pStats.kills) {
                        for (const kill of pStats.kills) {
                            killEventsData.push({
                                matchId: matchInfo.matchId,
                                roundNum: round.roundNum,
                                gameTime: kill.gameTime,
                                roundTime: kill.roundTime,
                                killerId: kill.killer,
                                victimId: kill.victim,
                                victimLocationX: kill.victimLocation?.x,
                                victimLocationY: kill.victimLocation?.y,
                                damageType: kill.finishingDamage?.damageType,
                                damageItem: kill.finishingDamage?.damageItem,
                                isSecondaryFireMode: kill.finishingDamage?.isSecondaryFireMode,
                                assistants: kill.assistants,
                                playerLocations: kill.playerLocations,
                            });
                        }
                    }

                    // Collect damage events
                    if (pStats.damage) {
                        for (const dmg of pStats.damage) {
                            damageEventsData.push({
                                matchId: matchInfo.matchId,
                                roundNum: round.roundNum,
                                attackerId: pStats.subject,
                                receiverId: dmg.receiver,
                                damage: dmg.damage,
                                legshots: dmg.legshots,
                                bodyshots: dmg.bodyshots,
                                headshots: dmg.headshots,
                            });
                        }
                    }
                }
            }

            // Batch insert all collected data
            if (roundPlayerStatsData.length > 0) {
                await tx.roundPlayerStats.createMany({ data: roundPlayerStatsData });
            }
            if (killEventsData.length > 0) {
                await tx.killEvent.createMany({ data: killEventsData });
            }
            if (damageEventsData.length > 0) {
                await tx.damageEvent.createMany({ data: damageEventsData });
            }
        }
    });

    console.log(`Successfully imported match: ${matchId}`);
    return { status: 'imported', matchId };
}
