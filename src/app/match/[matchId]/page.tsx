import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { BombPlantHeatmap } from '@/components/BombPlantHeatmap';
import { RoundHistoryWithDetails } from '@/components/RoundHistoryWithDetails';
import { getAgentName, getAgentIconPath, getMapDisplayName } from '@/lib/utils';
import { Prisma } from '@prisma/client';

// Define precise type for Match with included relations
type MatchDetailData = Prisma.MatchGetPayload<{
    include: {
        players: {
            include: {
                player: true
            }
        };
        rounds: {
            include: {
                playerStats: true
            }
        };
        damageEvents: true;
        kills: true;
    }
}>;

interface MatchPageProps {
    params: Promise<{
        matchId: string;
    }>;
}

export default async function MatchPage(props: MatchPageProps) {
    const params = await props.params;

    const match = await prisma.match.findUnique({
        where: { matchId: params.matchId },
        include: {
            players: {
                include: {
                    player: true
                }
            },
            rounds: {
                orderBy: { roundNum: 'asc' },
                include: {
                    playerStats: true
                }
            },
            damageEvents: true,
            kills: true
        }
    }) as MatchDetailData;

    if (!match) {
        notFound();
    }

    // Calculate team scores
    const redRounds = match.rounds.filter(r => r.winningTeam === 'Red').length;
    const blueRounds = match.rounds.filter(r => r.winningTeam === 'Blue').length;

    // Separate players by team
    const redTeam = match.players.filter(p => p.teamId === 'Red');
    const blueTeam = match.players.filter(p => p.teamId === 'Blue');

    // Calculate advanced stats
    const calculateACS = (score: number, rounds: number) => {
        return rounds > 0 ? Math.round(score / rounds) : 0;
    };

    const calculateADR = (matchPlayer: MatchDetailData['players'][number], totalRounds: number) => {
        // Calculate from roundStats
        const totalDamage = match.rounds.reduce((sum, round) => {
            const playerRoundStat = round.playerStats.find(ps => ps.puuid === matchPlayer.puuid);
            return sum + (playerRoundStat?.damage || 0);
        }, 0);
        return totalRounds > 0 ? Math.round(totalDamage / totalRounds) : 0;
    };

    const calculateKD = (kills: number, deaths: number) => {
        return deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
    };

    const calculateHS = (puuid: string) => {
        const playerDamageEvents = match.damageEvents.filter(de => de.attackerId === puuid);
        let totalShots = 0;
        let headshots = 0;

        playerDamageEvents.forEach(de => {
            totalShots += ((de.legshots || 0) + (de.bodyshots || 0) + (de.headshots || 0));
            headshots += (de.headshots || 0);
        });

        return totalShots > 0 ? Math.round((headshots / totalShots) * 100) : 0;
    };

    const calculateKAST = (puuid: string, totalRounds: number) => {
        if (totalRounds === 0) return 0;

        let kastRounds = 0;

        match.rounds.forEach(round => {
            const pStats = round.playerStats.find(ps => ps.puuid === puuid);
            if (!pStats) return;

            // K: Kill - Did they get a kill?
            const gotKill = (pStats.kills || 0) > 0;

            // A: Assist - Did they get an assist?
            const gotAssist = match.kills.some(ke => {
                const assistants = typeof ke.assistants === 'string' ? JSON.parse(ke.assistants) : (ke.assistants || []);
                return ke.roundNum === round.roundNum && assistants.includes(puuid);
            });

            // S: Survive - Did they survive?
            const died = match.kills.some(ke =>
                ke.roundNum === round.roundNum && ke.victimId === puuid
            );

            // T: Trade - (Simplified)
            let traded = false;
            if (died) {
                const deathEvent = match.kills.find(ke =>
                    ke.roundNum === round.roundNum && ke.victimId === puuid
                );
                if (deathEvent) {
                    const killerId = deathEvent.killerId;
                    const killerDeath = match.kills.find(ke =>
                        ke.roundNum === round.roundNum &&
                        ke.victimId === killerId &&
                        ke.roundTime !== null &&
                        deathEvent.roundTime !== null &&
                        ke.roundTime > deathEvent.roundTime &&
                        ke.roundTime <= deathEvent.roundTime + 3000 // 3 seconds trade window
                    );
                    if (killerDeath) traded = true;
                }
            }

            if (gotKill || gotAssist || !died || traded) {
                kastRounds++;
            }
        });

        return Math.round((kastRounds / totalRounds) * 100);
    };

    const calculateFKFD = (puuid: string) => {
        let fk = 0;
        let fd = 0;

        match.rounds.forEach(round => {
            const roundKills = match.kills
                .filter(k => k.roundNum === round.roundNum)
                .sort((a, b) => (a.roundTime || 0) - (b.roundTime || 0));

            if (roundKills.length > 0) {
                if (roundKills[0].killerId === puuid) fk++;
                if (roundKills[0].victimId === puuid) fd++;
            }
        });

        return { fk, fd };
    };

    const mapName = getMapDisplayName(match.mapId);
    const gameStartDate = match.gameStartMillis
        ? new Date(Number(match.gameStartMillis))
        : new Date();

    return (
        <div className="space-y-8">
            {/* Match Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-white">{mapName}</h1>
                        <p className="text-gray-400">
                            {gameStartDate.toLocaleString('ja-JP')}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-bold">
                            <span className={redRounds > blueRounds ? 'text-red-500' : 'text-gray-500'}>
                                {redRounds}
                            </span>
                            <span className="text-gray-600 mx-4">:</span>
                            <span className={blueRounds > redRounds ? 'text-blue-500' : 'text-gray-500'}>
                                {blueRounds}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            勝者: {redRounds > blueRounds ? 'Red Team' : 'Blue Team'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scoreboard - Red Team */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-red-500">Red Team</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 text-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white">プレイヤー</th>
                                    <th className="px-4 py-3 text-center text-white">ACS</th>
                                    <th className="px-4 py-3 text-center text-white">K</th>
                                    <th className="px-4 py-3 text-center text-white">D</th>
                                    <th className="px-4 py-3 text-center text-white">A</th>
                                    <th className="px-4 py-3 text-center text-white">K/D</th>
                                    <th className="px-4 py-3 text-center text-white">ADR</th>
                                    <th className="px-4 py-3 text-center text-white">FK</th>
                                    <th className="px-4 py-3 text-center text-white">FD</th>
                                    <th className="px-4 py-3 text-center text-white">HS%</th>
                                    <th className="px-4 py-3 text-center text-white">KAST</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {redTeam.sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => {
                                    const { fk, fd } = calculateFKFD(p.puuid);
                                    return (
                                        <tr key={p.puuid} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3 text-white">
                                                <div className="flex items-center gap-3">
                                                    {p.characterId && (
                                                        <img
                                                            src={getAgentIconPath(p.characterId)}
                                                            alt={getAgentName(p.characterId)}
                                                            className="w-8 h-8 rounded"
                                                            title={getAgentName(p.characterId)}
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-white">{p.player.gameName}</div>
                                                        <div className="text-sm text-gray-400">#{p.player.tagLine}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono font-semibold text-white">
                                                {calculateACS(p.score || 0, p.roundsPlayed || 1)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">{p.kills}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">{p.deaths}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">{p.assists}</td>
                                            <td className="px-4 py-3 text-center font-mono font-semibold text-white">
                                                {calculateKD(p.kills || 0, p.deaths || 1)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateADR(p, match.rounds.length)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-green-400">{fk}</td>
                                            <td className="px-4 py-3 text-center font-mono text-red-400">{fd}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateHS(p.puuid)}%
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateKAST(p.puuid, match.rounds.length)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Scoreboard - Blue Team */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-blue-500">Blue Team</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 text-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white">プレイヤー</th>
                                    <th className="px-4 py-3 text-center text-white">ACS</th>
                                    <th className="px-4 py-3 text-center text-white">K</th>
                                    <th className="px-4 py-3 text-center text-white">D</th>
                                    <th className="px-4 py-3 text-center text-white">A</th>
                                    <th className="px-4 py-3 text-center text-white">K/D</th>
                                    <th className="px-4 py-3 text-center text-white">ADR</th>
                                    <th className="px-4 py-3 text-center text-white">FK</th>
                                    <th className="px-4 py-3 text-center text-white">FD</th>
                                    <th className="px-4 py-3 text-center text-white">HS%</th>
                                    <th className="px-4 py-3 text-center text-white">KAST</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {blueTeam.sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => {
                                    const { fk, fd } = calculateFKFD(p.puuid);
                                    return (
                                        <tr key={p.puuid} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3 text-white">
                                                <div className="flex items-center gap-3">
                                                    {p.characterId && (
                                                        <img
                                                            src={getAgentIconPath(p.characterId)}
                                                            alt={getAgentName(p.characterId)}
                                                            className="w-8 h-8 rounded"
                                                            title={getAgentName(p.characterId)}
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-white">{p.player.gameName}</div>
                                                        <div className="text-sm text-gray-400">#{p.player.tagLine}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono font-semibold text-white">
                                                {calculateACS(p.score || 0, p.roundsPlayed || 1)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">{p.kills}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">{p.deaths}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">{p.assists}</td>
                                            <td className="px-4 py-3 text-center font-mono font-semibold text-white">
                                                {calculateKD(p.kills || 0, p.deaths || 1)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateADR(p, match.rounds.length)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-green-400">{fk}</td>
                                            <td className="px-4 py-3 text-center font-mono text-red-400">{fd}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateHS(p.puuid)}%
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateKAST(p.puuid, match.rounds.length)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Round History with Details */}
            <RoundHistoryWithDetails rounds={match.rounds as any} players={match.players as any} kills={match.kills} />

            {/* Bomb Plant Heatmap */}
            <div className="space-y-4">
                <BombPlantHeatmap
                    mapId={match.mapId}
                    plantLocations={match.rounds
                        .filter(r => r.plantLocationX !== null && r.plantLocationY !== null)
                        .map(r => ({
                            x: r.plantLocationX || 0,
                            y: r.plantLocationY || 0
                        }))}
                />
            </div>
        </div>
    );
}
