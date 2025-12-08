import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function importMatch(filePath: string) {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const matchData = JSON.parse(rawData);

    if (!matchData || !matchData.matchInfo) {
        console.error(`Invalid match data in ${path.basename(filePath)}: matchInfo is missing`);
        return { status: 'error', error: 'Invalid match data: matchInfo is missing' };
    }

    const matchId = matchData.matchInfo.matchId;

    console.log(`Processing match: ${matchId} from ${path.basename(filePath)}`);

    // Check if match already exists
    const existingMatch = await prisma.match.findUnique({
        where: { matchId: matchId },
    });

    if (existingMatch) {
        console.log(`Match ${matchId} already exists. Updating (overwriting)...`);

        // Manual cascade delete since schema might not have Cascade on all relations
        await prisma.$transaction([
            prisma.roundPlayerStats.deleteMany({ where: { matchId } }),
            prisma.killEvent.deleteMany({ where: { matchId } }),
            prisma.damageEvent.deleteMany({ where: { matchId } }),
            prisma.matchTag.deleteMany({ where: { matchId } }),
            prisma.round.deleteMany({ where: { matchId } }),
            prisma.matchPlayer.deleteMany({ where: { matchId } }),
            prisma.match.delete({ where: { matchId } }),
        ]);
        console.log(`Deleted existing match ${matchId}`);
    }

    // 1. Create Match
    const matchInfo = matchData.matchInfo;
    await prisma.match.create({
        data: {
            matchId: matchInfo.matchId,
            mapId: matchInfo.mapId,
            gamePodId: matchInfo.gamePodId,
            gameLoopZone: matchInfo.gameLoopZone,
            gameServerAddress: matchInfo.gameServerAddress,
            gameVersion: matchInfo.gameVersion,
            gameLengthMillis: matchInfo.gameLengthMillis,
            gameStartMillis: matchInfo.gameStartMillis,
            provisioningFlowId: matchInfo.provisioningFlowID, // Note: ID vs Id casing
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
                const redWins = matchData.roundResults.filter((r: any) => r.winningTeam === 'Red').length;
                const blueWins = matchData.roundResults.filter((r: any) => r.winningTeam === 'Blue').length;
                if (redWins > blueWins) return 'Red';
                if (blueWins > redWins) return 'Blue';
                return 'Draw';
            })(),
        },
    });

    // 2. Create Players and MatchPlayer stats
    for (const player of matchData.players) {
        // Upsert Player (might exist from other matches in future)
        await prisma.player.upsert({
            where: { puuid: player.subject },
            update: {
                gameName: player.gameName,
                tagLine: player.tagLine,
            },
            create: {
                puuid: player.subject,
                gameName: player.gameName,
                tagLine: player.tagLine,
            },
        });

        // Create MatchPlayer
        await prisma.matchPlayer.create({
            data: {
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
            },
        });
    }

    // 3. Create Rounds and RoundPlayerStats
    if (matchData.roundResults) {
        for (const round of matchData.roundResults) {
            // Create Round
            await prisma.round.create({
                data: {
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
                },
            });

            // Create RoundPlayerStats
            if (round.playerStats) {
                // Pre-calculate all kills in this round for death/assist counting
                const allRoundKills = round.playerStats.flatMap((ps: any) => ps.kills || []);

                for (const pStats of round.playerStats) {
                    // Calculate deaths: count how many times this player was the victim
                    const deaths = allRoundKills.filter((k: any) => k.victim === pStats.subject).length;

                    // Calculate assists: count how many times this player was an assistant
                    const assists = allRoundKills.filter((k: any) => {
                        if (!k.assistants || !Array.isArray(k.assistants)) return false;
                        return k.assistants.some((a: any) => {
                            // Handle both string IDs and object structures
                            if (typeof a === 'string') return a === pStats.subject;
                            return a === pStats.subject || a.assistantId === pStats.subject || a.subject === pStats.subject;
                        });
                    }).length;

                    await prisma.roundPlayerStats.create({
                        data: {
                            matchId: matchInfo.matchId,
                            roundNum: round.roundNum,
                            puuid: pStats.subject,
                            score: pStats.score,
                            kills: pStats.kills.length, // Count kills in this round
                            deaths: deaths,
                            assists: assists,
                            damage: pStats.damage.reduce((acc: number, curr: any) => acc + curr.damage, 0),
                            loadoutValue: pStats.economy?.loadoutValue,
                            weapon: pStats.economy?.weapon,
                            armor: pStats.economy?.armor,
                            remainingMoney: pStats.economy?.remaining,
                            spentMoney: pStats.economy?.spent,
                            wasAfk: pStats.wasAfk,
                            wasPenalized: pStats.wasPenalized,
                            stayedInSpawn: pStats.stayedInSpawn,
                        },
                    });

                    // 4. Create KillEvents (from playerStats kills list)
                    for (const kill of pStats.kills) {
                        await prisma.killEvent.create({
                            data: {
                                matchId: matchInfo.matchId,
                                roundNum: round.roundNum,
                                gameTime: kill.gameTime,
                                roundTime: kill.roundTime,
                                killerId: kill.killer,
                                victimId: kill.victim,
                                victimLocationX: kill.victimLocation.x,
                                victimLocationY: kill.victimLocation.y,
                                damageType: kill.finishingDamage.damageType,
                                damageItem: kill.finishingDamage.damageItem,
                                isSecondaryFireMode: kill.finishingDamage.isSecondaryFireMode,
                                assistants: JSON.stringify(kill.assistants), // JSON -> String
                                playerLocations: JSON.stringify(kill.playerLocations), // JSON -> String
                            },
                        });
                    }

                    // 5. Create DamageEvents
                    for (const dmg of pStats.damage) {
                        await prisma.damageEvent.create({
                            data: {
                                matchId: matchInfo.matchId,
                                roundNum: round.roundNum,
                                attackerId: pStats.subject,
                                receiverId: dmg.receiver,
                                damage: dmg.damage,
                                legshots: dmg.legshots,
                                bodyshots: dmg.bodyshots,
                                headshots: dmg.headshots,
                            }
                        });
                    }
                }
            }
        }
    }
    console.log(`Successfully imported match: ${matchId}`);
    return { status: 'imported', matchId };
}
