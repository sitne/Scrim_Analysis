'use client';

import { useState } from 'react';
import { getAgentName, getAgentIconPath } from '@/lib/utils';

interface RoundDetailsViewProps {
    rounds: Array<{
        id: number;
        roundNum: number;
        roundResult: string | null;
        winningTeam: string | null;
        bombPlanter: string | null;
        bombDefuser: string | null;
        plantRoundTime: number | null;
        defuseRoundTime: number | null;
        plantSite: string | null;
        playerStats: Array<{
            id: number;
            puuid: string;
            roundNum: number;
            matchId: string;
            kills: number;
            deaths: number;
            assists: number;
            damage: number;
            score: number;
        }>;
    }>;
    players: Array<{
        puuid: string;
        teamId: string;
        player: {
            gameName: string;
            tagLine: string;
        };
        characterId: string | null;
    }>;
}

export function RoundDetailsView({ rounds, players }: RoundDetailsViewProps) {
    const [expandedRound, setExpandedRound] = useState<number | null>(null);

    const getPlayerInfo = (puuid: string) => {
        return players.find((p) => p.puuid === puuid);
    };

    const getRoundStats = (roundNum: number) => {
        const roundData = rounds.find((r) => r.roundNum === roundNum);
        if (!roundData) return null;

        const redStats = roundData.playerStats.filter((ps) => {
            const player = getPlayerInfo(ps.puuid);
            return player?.teamId === 'Red';
        });

        const blueStats = roundData.playerStats.filter((ps) => {
            const player = getPlayerInfo(ps.puuid);
            return player?.teamId === 'Blue';
        });

        return {
            round: roundData,
            redStats,
            blueStats,
        };
    };

    const formatTime = (milliseconds: number | null) => {
        if (!milliseconds) return '-';
        const seconds = Math.floor(milliseconds / 1000);
        const ms = milliseconds % 1000;
        return `${seconds}.${String(ms).padStart(3, '0')}s`;
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">ラウンド履歴</h2>
            <div className="space-y-3">
                {rounds.map((round) => {
                    const stats = getRoundStats(round.roundNum);
                    if (!stats) return null;

                    const { redStats, blueStats } = stats;
                    const isExpanded = expandedRound === round.roundNum;

                    return (
                        <div key={round.id}>
                            {/* Round Header - Clickable */}
                            <button
                                onClick={() =>
                                    setExpandedRound(isExpanded ? null : round.roundNum)
                                }
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between hover:border-gray-700 transition-colors group"
                            >
                                <div className="flex items-center gap-4 text-left flex-1">
                                    <div
                                        className="w-12 h-12 flex items-center justify-center rounded border-2 font-semibold flex-shrink-0"
                                        style={{
                                            backgroundColor:
                                                round.winningTeam === 'Red'
                                                    ? 'rgba(239, 68, 68, 0.15)'
                                                    : 'rgba(59, 130, 246, 0.15)',
                                            borderColor:
                                                round.winningTeam === 'Red' ? '#ef4444' : '#3b82f6',
                                            color:
                                                round.winningTeam === 'Red' ? '#fca5a5' : '#93c5fd',
                                        }}
                                    >
                                        {round.roundNum}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-white">
                                                {round.winningTeam || 'Unknown'} Team
                                            </span>
                                            <span className="text-sm text-gray-400">
                                                {round.roundResult}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-400 mt-1">
                                            {round.plantSite && (
                                                <span>
                                                    Bomb Site {round.plantSite}{' '}
                                                    {round.plantRoundTime && (
                                                        <span>
                                                            - Planted {formatTime(round.plantRoundTime)}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-gray-400 group-hover:text-gray-300 transition-colors">
                                    {isExpanded ? '▼' : '▶'}
                                </div>
                            </button>

                            {/* Round Details */}
                            {isExpanded && (
                                <div className="border border-t-0 border-gray-800 rounded-b-lg px-4 py-4 space-y-4 bg-gray-900/50">
                                    {/* Red Team Stats */}
                                    <div>
                                        <h4 className="text-red-500 font-semibold mb-2 text-sm">
                                            Red Team
                                        </h4>
                                        <div className="space-y-2">
                                            {redStats.map((stat) => {
                                                const player = getPlayerInfo(stat.puuid);
                                                if (!player) return null;

                                                return (
                                                    <div
                                                        key={stat.puuid}
                                                        className="flex items-center justify-between text-sm bg-gray-800/30 p-2 rounded"
                                                    >
                                                        <div className="flex items-center gap-2 flex-1">
                                                            {player.characterId && (
                                                                <img
                                                                    src={getAgentIconPath(
                                                                        player.characterId
                                                                    )}
                                                                    alt={getAgentName(
                                                                        player.characterId
                                                                    )}
                                                                    className="w-6 h-6 rounded"
                                                                    title={getAgentName(
                                                                        player.characterId
                                                                    )}
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="text-white">
                                                                    {player.player.gameName}
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    #{player.player.tagLine}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3 text-gray-300 font-mono">
                                                            <span>{stat.kills}K</span>
                                                            <span>{stat.deaths}D</span>
                                                            <span>{stat.assists}A</span>
                                                            <span className="text-yellow-400">
                                                                {stat.damage}DMG
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Blue Team Stats */}
                                    <div>
                                        <h4 className="text-blue-500 font-semibold mb-2 text-sm">
                                            Blue Team
                                        </h4>
                                        <div className="space-y-2">
                                            {blueStats.map((stat) => {
                                                const player = getPlayerInfo(stat.puuid);
                                                if (!player) return null;

                                                return (
                                                    <div
                                                        key={stat.puuid}
                                                        className="flex items-center justify-between text-sm bg-gray-800/30 p-2 rounded"
                                                    >
                                                        <div className="flex items-center gap-2 flex-1">
                                                            {player.characterId && (
                                                                <img
                                                                    src={getAgentIconPath(
                                                                        player.characterId
                                                                    )}
                                                                    alt={getAgentName(
                                                                        player.characterId
                                                                    )}
                                                                    className="w-6 h-6 rounded"
                                                                    title={getAgentName(
                                                                        player.characterId
                                                                    )}
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="text-white">
                                                                    {player.player.gameName}
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    #{player.player.tagLine}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3 text-gray-300 font-mono">
                                                            <span>{stat.kills}K</span>
                                                            <span>{stat.deaths}D</span>
                                                            <span>{stat.assists}A</span>
                                                            <span className="text-yellow-400">
                                                                {stat.damage}DMG
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
