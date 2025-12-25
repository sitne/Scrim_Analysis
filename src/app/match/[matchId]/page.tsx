import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { MatchHeatmap } from '@/components/MatchHeatmap';
import { RoundHistoryWithDetails } from '@/components/RoundHistoryWithDetails';
import { getAgentName, getAgentIconPath, getMapDisplayName } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { MatchTags } from '@/components/MatchTags';
import { DeleteButton } from '@/components/DeleteButton';
import { MatchEditButton } from '@/components/MatchEditButton';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
    calculateACS,
    calculateADR,
    calculateKD,
    calculateHS,
    calculateKAST,
    calculateFKFD
} from '@/lib/stats';

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

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

    // Security Check: Verify user belongs to the team that owns this match
    if (match.teamId) {
        const membership = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: match.teamId,
                    userId: user.id
                }
            }
        });

        if (!membership) {
            notFound(); // Or redirect to error page
        }
    } else {
        // If match has no team, we strictly check team.
        notFound();
    }

    // Calculate team scores
    const redRounds = match.rounds.filter(r => r.winningTeam === 'Red').length;
    const blueRounds = match.rounds.filter(r => r.winningTeam === 'Blue').length;

    // Separate players by team
    const redTeam = match.players.filter(p => p.teamId === 'Red');
    const blueTeam = match.players.filter(p => p.teamId === 'Blue');

    const mapName = getMapDisplayName(match.mapId);
    // Convert BigInt to Number for safe serialization/usage
    const gameStartMillis = Number(match.gameStartMillis || 0);
    const gameStartDate = gameStartMillis
        ? new Date(gameStartMillis)
        : new Date();

    // チーム名表示ロジック
    // @ts-ignore
    const isRedMyTeam = match.myTeamSide === 'Red';
    // @ts-ignore
    const isBlueMyTeam = match.myTeamSide === 'Blue';

    // @ts-ignore
    const redDisplayName = match.redTeamName || 'Red Team';
    // @ts-ignore
    const redTeamTag = match.redTeamTag;
    // @ts-ignore
    const blueDisplayName = match.blueTeamName || 'Blue Team';
    // @ts-ignore
    const blueTeamTag = match.blueTeamTag;

    return (
        <div className="space-y-8">
            {/* Back Link */}
            {match.teamId && (
                <Link href={`/team/${match.teamId}`} className="inline-flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                    ← チームに戻る
                </Link>
            )}

            {/* Match Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-white">{mapName}</h1>
                        <p className="text-gray-400">
                            {gameStartDate.toLocaleString('ja-JP')}
                        </p>
                        <div className="mt-3">
                            <MatchTags matchId={match.matchId} />
                        </div>
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
                            {redRounds > blueRounds
                                ? <span className="text-red-400 font-bold">{redDisplayName} WIN</span>
                                : <span className="text-blue-400 font-bold">{blueDisplayName} WIN</span>
                            }
                        </p>
                        <div className="mt-4">
                            <DeleteButton
                                endpoint={`/api/match/${match.matchId}`}
                                redirectTo={match.teamId ? `/team/${match.teamId}` : '/'}
                                buttonText="マッチを削除"
                                confirmMessage="本当に削除しますか？"
                                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded transition"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Scoreboard - Red Team */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-red-500">{redDisplayName}</h2>
                    {isRedMyTeam && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">YOUR TEAM</span>}
                    {!isRedMyTeam && (
                        <MatchEditButton
                            matchId={match.matchId}
                            teamId={match.teamId || ''}
                            currentOpponentName={redDisplayName}
                        />
                    )}
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 text-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white min-w-[200px]">PLAYER</th>
                                    <th className="px-4 py-3 text-center text-white w-24">ACS</th>
                                    <th className="px-4 py-3 text-center text-white w-20">K</th>
                                    <th className="px-4 py-3 text-center text-white w-20">D</th>
                                    <th className="px-4 py-3 text-center text-white w-20">A</th>
                                    <th className="px-4 py-3 text-center text-white w-24">K/D</th>
                                    <th className="px-4 py-3 text-center text-white w-24">ADR</th>
                                    <th className="px-4 py-3 text-center text-white w-20">FK</th>
                                    <th className="px-4 py-3 text-center text-white w-20">FD</th>
                                    <th className="px-4 py-3 text-center text-white w-24">HS%</th>
                                    <th className="px-4 py-3 text-center text-white w-24">KAST</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {redTeam.sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => {
                                    const { fk, fd } = calculateFKFD(match as any, p.puuid);
                                    return (
                                        <tr key={p.puuid} className={`hover:bg-gray-800/50 transition-colors ${isRedMyTeam ? 'bg-red-900/10' : ''}`}>
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
                                                {calculateADR(match as any, p.puuid, match.rounds.length)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-green-400">{fk}</td>
                                            <td className="px-4 py-3 text-center font-mono text-red-400">{fd}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateHS(match as any, p.puuid)}%
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateKAST(match as any, p.puuid, match.rounds.length)}%
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
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-blue-500">{blueDisplayName}</h2>
                    {isBlueMyTeam && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">YOUR TEAM</span>}
                    {!isBlueMyTeam && (
                        <MatchEditButton
                            matchId={match.matchId}
                            teamId={match.teamId || ''}
                            currentOpponentName={blueDisplayName}
                        />
                    )}
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800 text-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white min-w-[200px]">PLAYER</th>
                                    <th className="px-4 py-3 text-center text-white w-24">ACS</th>
                                    <th className="px-4 py-3 text-center text-white w-20">K</th>
                                    <th className="px-4 py-3 text-center text-white w-20">D</th>
                                    <th className="px-4 py-3 text-center text-white w-20">A</th>
                                    <th className="px-4 py-3 text-center text-white w-24">K/D</th>
                                    <th className="px-4 py-3 text-center text-white w-24">ADR</th>
                                    <th className="px-4 py-3 text-center text-white w-20">FK</th>
                                    <th className="px-4 py-3 text-center text-white w-20">FD</th>
                                    <th className="px-4 py-3 text-center text-white w-24">HS%</th>
                                    <th className="px-4 py-3 text-center text-white w-24">KAST</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {blueTeam.sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => {
                                    const { fk, fd } = calculateFKFD(match as any, p.puuid);
                                    return (
                                        <tr key={p.puuid} className={`hover:bg-gray-800/50 transition-colors ${isBlueMyTeam ? 'bg-blue-900/10' : ''}`}>
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
                                                {calculateADR(match as any, p.puuid, match.rounds.length)}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-green-400">{fk}</td>
                                            <td className="px-4 py-3 text-center font-mono text-red-400">{fd}</td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateHS(match as any, p.puuid)}%
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-white">
                                                {calculateKAST(match as any, p.puuid, match.rounds.length)}%
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

            {/* Match Heatmap */}
            <div className="space-y-4">
                <MatchHeatmap
                    mapId={match.mapId}
                    points={[
                        // Plant locations
                        ...match.rounds
                            .filter(r => r.plantLocationX !== null && r.plantLocationY !== null && r.bombPlanter !== null)
                            .map(r => ({
                                x: r.plantLocationX || 0,
                                y: r.plantLocationY || 0,
                                type: 'plant' as const
                            })),
                        // Kill locations (Killer's position)
                        ...match.kills
                            .map(k => {
                                if (!k.playerLocations || !k.killerId) return null;
                                try {
                                    const locations = k.playerLocations as any;
                                    const killerLoc = locations.find((l: any) => l.subject === k.killerId);
                                    if (killerLoc && killerLoc.location) {
                                        return {
                                            x: killerLoc.location.x,
                                            y: killerLoc.location.y,
                                            type: 'kill' as const
                                        };
                                    }
                                } catch (e) {
                                    // Ignore parse errors
                                }
                                return null;
                            })
                            .filter((p): p is { x: number; y: number; type: 'kill' } => p !== null),
                        // Death locations (Victim's position)
                        ...match.kills
                            .filter(k => k.victimLocationX !== null && k.victimLocationY !== null)
                            .map(k => ({
                                x: k.victimLocationX || 0,
                                y: k.victimLocationY || 0,
                                type: 'death' as const
                            }))
                    ]}
                />
            </div>
        </div>
    );
}
