'use client';

import { useState } from 'react';
import { getAgentName, getAgentIconPath, getWeaponData } from '@/lib/utils';
import { getArmorData } from '@/lib/valorant-api';
import { Bomb, Skull, Wrench, Hourglass, ArrowLeftRight } from 'lucide-react';
import { Fragment } from 'react';

interface RoundHistoryWithDetailsProps {
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
            loadoutValue?: number | null;
            weapon?: string | null;
            armor?: string | null;
            remainingMoney?: number | null;
            spentMoney?: number | null;
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
    kills: Array<{
        id: number;
        matchId: string;
        roundNum: number | null;
        gameTime: number | null;
        roundTime: number | null;
        killerId: string | null;
        victimId: string | null;
        victimLocationX: number | null;
        victimLocationY: number | null;
        damageType: string | null;
        damageItem: string | null;
        isSecondaryFireMode: boolean | null;
        assistants: any;
        playerLocations: any;
    }>;
}

export function RoundHistoryWithDetails({
    rounds,
    players,
    kills,
}: RoundHistoryWithDetailsProps) {
    const [selectedRound, setSelectedRound] = useState<number | null>(null);

    const getPlayerInfo = (puuid: string) => {
        return players.find((p) => p.puuid === puuid);
    };

    const getWinConditionIcon = (round: any) => {
        // 1. スパイク解除 (Defuse)
        if (round.roundResult === 'Bomb defused') {
            return <Wrench className="w-4 h-4" />;
        }

        // 2. スパイク爆破 or 設置後の全滅 (Explosion / Planted Win)
        if (round.bombPlanter) {
            const planter = players.find(p => p.puuid === round.bombPlanter);
            // 設置者のチームが勝った場合 -> 爆破アイコン
            if (planter && planter.teamId === round.winningTeam) {
                return <Bomb className="w-4 h-4" />;
            }
        }

        // 3. 時間切れ (Time Out)
        if (round.roundResult === 'Round timer expired' || (!round.bombPlanter && round.winningTeam === 'Blue' && round.roundResult !== 'Eliminated')) {
            if (round.roundResult?.toLowerCase().includes('time')) {
                return <Hourglass className="w-4 h-4" />;
            }
        }

        // 4. 全員撃破 (Elimination)
        return <Skull className="w-4 h-4" />;
    };

    const getSelectedRoundData = () => {
        if (selectedRound === null) return null;
        const roundData = rounds.find((r) => r.roundNum === selectedRound);
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
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    const selectedData = getSelectedRoundData();

    const SideSwitchIcon = () => (
        <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* Red Team Arrow (上半分から右へ) */}
            {/* 9時から始まって時計回りに12時を通り、2時付近の矢印へ */}
            <path
                d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
                className="text-red-500"
            />
            <path
                d="M21 3v5h-5"
                className="text-red-500"
            />

            {/* Blue Team Arrow (下半分から左へ) */}
            {/* 3時から始まって時計回りに6時を通り、8時付近の矢印へ */}
            <path
                d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
                className="text-blue-400"
            />
            <path
                d="M3 21v-5h5"
                className="text-blue-400"
            />
        </svg>
    );

    return (
        <div className="space-y-6">
            {/* Round History - Simple Grid */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Round History</h2>
                <div className="flex flex-wrap gap-2 items-center">
                    {rounds.map((round) => (
                        <Fragment key={round.roundNum}>
                            {/* 13ラウンド目の前に攻守交替アイコンを表示 */}
                            {round.roundNum === 12 && (
                                <div className="flex flex-col items-center justify-center px-1 mx-1" title="Side Switch">
                                    <div className="bg-gray-900 p-2 rounded-full border border-gray-700 shadow-lg">
                                        <SideSwitchIcon />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() =>
                                    setSelectedRound(
                                        selectedRound === round.roundNum ? null : round.roundNum
                                    )
                                }
                                className={`w-12 h-14 flex flex-col items-center justify-center gap-1 rounded border-2 font-semibold transition-all cursor-pointer ${selectedRound === round.roundNum
                                    ? 'ring-2 ring-offset-2 ring-gray-400'
                                    : ''
                                    } ${round.winningTeam === 'Red'
                                        ? 'bg-red-900/30 border-red-500 text-red-400 hover:bg-red-900/50'
                                        : 'bg-blue-900/30 border-blue-500 text-blue-400 hover:bg-blue-900/50'
                                    }`}
                                title={`Round ${round.roundNum + 1}: ${round.winningTeam} - ${round.roundResult}`}
                            >
                                <div className="opacity-80">
                                    {getWinConditionIcon(round)}
                                </div>
                                <div className="text-sm leading-none">
                                    {round.roundNum + 1}
                                </div>
                            </button>
                        </Fragment>
                    ))}
                </div>
            </div>

            {/* Round Details Panel */}
            {selectedData && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
                    {/* Round Header */}
                    <div className="pb-4 border-b border-gray-800 space-y-4">
                        {/* Bomb Site - Emphasized */}
                        {selectedData.round.plantSite && (
                            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">BOMB SITE</div>
                                        <div className="text-3xl font-bold text-yellow-400">
                                            {selectedData.round.plantSite} Site
                                        </div>
                                    </div>
                                    {selectedData.round.plantRoundTime && (
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Planted at</div>
                                            <div className="text-2xl font-mono font-bold text-yellow-400">
                                                {formatTime(selectedData.round.plantRoundTime)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Round Info */}
                        <div>
                            <h3 className="text-2xl font-bold text-white">
                                Round {selectedData.round.roundNum + 1}
                            </h3>
                            <div className="flex items-center gap-3 mt-2">
                                <span
                                    className={`font-semibold text-lg ${selectedData.round.winningTeam === 'Red'
                                        ? 'text-red-400'
                                        : 'text-blue-400'
                                        }`}
                                >
                                    {selectedData.round.winningTeam} Team Won
                                </span>
                                <span className="text-gray-400">
                                    {selectedData.round.roundResult}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-gray-200 font-semibold mb-3">Timeline</h4>
                        <div className="space-y-2">
                            {(() => {
                                const currentRoundKills = kills.filter((k) => k.roundNum === selectedData.round.roundNum);

                                type TimelineEvent =
                                    | { type: 'kill'; data: typeof kills[0]; time: number }
                                    | { type: 'plant'; time: number; planterId: string; site: string };

                                const events: TimelineEvent[] = [
                                    ...currentRoundKills.map(k => ({
                                        type: 'kill' as const,
                                        data: k,
                                        time: k.roundTime || 0
                                    })),
                                    ...(selectedData.round.plantRoundTime ? [{
                                        type: 'plant' as const,
                                        time: selectedData.round.plantRoundTime,
                                        planterId: selectedData.round.bombPlanter || '',
                                        site: selectedData.round.plantSite || ''
                                    }] : [])
                                ].sort((a, b) => a.time - b.time);

                                return events.map((event, index) => {
                                    if (event.type === 'plant') {
                                        const planter = getPlayerInfo(event.planterId);
                                        return (
                                            <div
                                                key={`plant-${index}`}
                                                className="flex items-center gap-3 text-sm p-3 bg-yellow-900/20 border border-yellow-700/30 rounded"
                                            >
                                                <div className="text-yellow-500 font-mono w-12 flex-shrink-0 text-xs">
                                                    {formatTime(event.time)}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Bomb className="w-4 h-4 text-yellow-500" />
                                                    <span className="text-yellow-400 font-semibold">Spike Planted</span>
                                                    <span className="text-gray-400 text-xs">at {event.site} Site</span>
                                                </div>
                                                {planter && (
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <span className="text-gray-400 text-xs">by</span>
                                                        {planter.characterId && (
                                                            <img
                                                                src={getAgentIconPath(planter.characterId)}
                                                                alt={getAgentName(planter.characterId)}
                                                                className="w-5 h-5 rounded border border-gray-600"
                                                            />
                                                        )}
                                                        <span className={`text-xs font-semibold ${planter.teamId === 'Red' ? 'text-red-400' : 'text-blue-400'}`}>
                                                            {planter.player.gameName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    const kill = event.data;
                                    const killer = getPlayerInfo(kill.killerId || '');
                                    const victim = getPlayerInfo(kill.victimId || '');

                                    if (!killer || !victim) return null;

                                    return (
                                        <div
                                            key={`kill-${kill.id}`}
                                            className="flex items-center gap-1 text-sm p-3 bg-gray-800/30 rounded hover:bg-gray-800/50 transition-colors"
                                        >
                                            {/* Time */}
                                            <div className="text-gray-400 font-mono w-12 flex-shrink-0 text-xs">
                                                {formatTime(kill.roundTime)}
                                            </div>

                                            {/* Killer Section */}
                                            <div className="flex items-center gap-0 flex-shrink-0">
                                                {killer.characterId && (
                                                    <img
                                                        src={getAgentIconPath(killer.characterId)}
                                                        alt={getAgentName(killer.characterId)}
                                                        className="w-6 h-6 rounded flex-shrink-0 border border-gray-600"
                                                    />
                                                )}
                                                <div className="truncate">
                                                    <div
                                                        className={`font-semibold truncate text-sm ${killer.teamId === 'Red'
                                                            ? 'text-red-400'
                                                            : 'text-blue-400'
                                                            }`}
                                                    >
                                                        {killer.player.gameName}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Kill Icon with Arrow */}
                                            <div className="flex items-center gap-0 flex-shrink-0 px-1">
                                                <div className="text-yellow-400 font-bold text-lg w-4 text-center">
                                                    ✕
                                                </div>
                                                <div className="text-gray-500 text-xs">
                                                    →
                                                </div>
                                            </div>

                                            {/* Victim Section */}
                                            <div className="flex items-center gap-0 flex-shrink-0">
                                                <div className="truncate">
                                                    <div
                                                        className={`font-semibold truncate text-sm ${victim.teamId === 'Red'
                                                            ? 'text-red-400'
                                                            : 'text-blue-400'
                                                            }`}
                                                    >
                                                        {victim.player.gameName}
                                                    </div>
                                                </div>
                                                {victim.characterId && (
                                                    <img
                                                        src={getAgentIconPath(victim.characterId)}
                                                        alt={getAgentName(victim.characterId)}
                                                        className="w-6 h-6 rounded flex-shrink-0 border border-gray-600"
                                                    />
                                                )}
                                            </div>

                                            {/* Weapon/Method */}
                                            {kill.damageType && (
                                                <div className="text-gray-500 text-xs flex-shrink-0 border-l border-gray-700 pl-1 ml-auto">
                                                    {kill.damageType}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Teams Stats */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Red Team */}
                        <div>
                            <h4 className="text-red-500 font-semibold mb-3">Red Team</h4>
                            <div className="space-y-2">
                                {selectedData.redStats.map((stat) => {
                                    const player = getPlayerInfo(stat.puuid);
                                    if (!player) return null;

                                    return (
                                        <div
                                            key={stat.puuid}
                                            className="flex items-center justify-between bg-gray-800/50 p-3 rounded hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {player.characterId && (
                                                    <img
                                                        src={getAgentIconPath(
                                                            player.characterId
                                                        )}
                                                        alt={getAgentName(
                                                            player.characterId
                                                        )}
                                                        className="w-8 h-8 rounded flex-shrink-0"
                                                        title={getAgentName(
                                                            player.characterId
                                                        )}
                                                    />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="text-white font-semibold truncate">
                                                        {player.player.gameName}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">
                                                        #{player.player.tagLine}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-sm font-mono ml-2 flex-shrink-0 items-center">
                                                {/* Weapon & Armor Info */}
                                                <div className="flex items-center gap-2 px-2 border-r border-gray-700 h-10 w-28">
                                                    <div className="w-16 flex justify-center">
                                                        {stat.weapon && getWeaponData(stat.weapon)?.killStreamIcon ? (
                                                            <div className="flex flex-col items-center gap-0.5" title={getWeaponData(stat.weapon)?.name}>
                                                                <img
                                                                    src={getWeaponData(stat.weapon)?.killStreamIcon}
                                                                    alt={getWeaponData(stat.weapon)?.name}
                                                                    className="h-4 w-auto brightness-200"
                                                                />
                                                                <span className="text-[9px] text-gray-500 uppercase truncate max-w-[60px]">{getWeaponData(stat.weapon)?.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-600">-</span>
                                                        )}
                                                    </div>
                                                    <div className="w-8 flex justify-center">
                                                        {stat.armor && getArmorData(stat.armor) ? (
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-3 h-3 rounded-sm ${getArmorData(stat.armor)?.value === 50 ? 'bg-blue-500' : 'bg-blue-500/50'}`}
                                                                    title={getArmorData(stat.armor)?.name} />
                                                                <span className="text-[9px] text-gray-500">{getArmorData(stat.armor)?.value}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-600">-</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="w-16 text-right">
                                                    <div className="text-gray-400 text-xs">LOADOUT</div>
                                                    <div className="text-white">
                                                        ¤{stat.loadoutValue?.toLocaleString() ?? '-'}
                                                    </div>
                                                </div>
                                                <div className="w-14 text-right">
                                                    <div className="text-gray-400 text-xs">REMAIN</div>
                                                    <div className="text-gray-400">
                                                        ¤{stat.remainingMoney?.toLocaleString() ?? '-'}
                                                    </div>
                                                </div>
                                                <div className="w-14 text-center">
                                                    <div className="text-gray-400 text-xs">K/D/A</div>
                                                    <div className="text-white">
                                                        {stat.kills}/{stat.deaths}/{stat.assists}
                                                    </div>
                                                </div>
                                                <div className="w-10 text-right">
                                                    <div className="text-gray-400 text-xs">DMG</div>
                                                    <div className="text-yellow-400">
                                                        {stat.damage}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Blue Team */}
                        <div>
                            <h4 className="text-blue-500 font-semibold mb-3">Blue Team</h4>
                            <div className="space-y-2">
                                {selectedData.blueStats.map((stat) => {
                                    const player = getPlayerInfo(stat.puuid);
                                    if (!player) return null;

                                    return (
                                        <div
                                            key={stat.puuid}
                                            className="flex items-center justify-between bg-gray-800/50 p-3 rounded hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {player.characterId && (
                                                    <img
                                                        src={getAgentIconPath(
                                                            player.characterId
                                                        )}
                                                        alt={getAgentName(
                                                            player.characterId
                                                        )}
                                                        className="w-8 h-8 rounded flex-shrink-0"
                                                        title={getAgentName(
                                                            player.characterId
                                                        )}
                                                    />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="text-white font-semibold truncate">
                                                        {player.player.gameName}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">
                                                        #{player.player.tagLine}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-sm font-mono ml-2 flex-shrink-0 items-center">
                                                {/* Weapon & Armor Info */}
                                                <div className="flex items-center gap-2 px-2 border-r border-gray-700 h-10 w-28">
                                                    <div className="w-16 flex justify-center">
                                                        {stat.weapon && getWeaponData(stat.weapon)?.killStreamIcon ? (
                                                            <div className="flex flex-col items-center gap-0.5" title={getWeaponData(stat.weapon)?.name}>
                                                                <img
                                                                    src={getWeaponData(stat.weapon)?.killStreamIcon}
                                                                    alt={getWeaponData(stat.weapon)?.name}
                                                                    className="h-4 w-auto brightness-200"
                                                                />
                                                                <span className="text-[9px] text-gray-500 uppercase truncate max-w-[60px]">{getWeaponData(stat.weapon)?.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-600">-</span>
                                                        )}
                                                    </div>
                                                    <div className="w-8 flex justify-center">
                                                        {stat.armor && getArmorData(stat.armor) ? (
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-3 h-3 rounded-sm ${getArmorData(stat.armor)?.value === 50 ? 'bg-blue-500' : 'bg-blue-500/50'}`}
                                                                    title={getArmorData(stat.armor)?.name} />
                                                                <span className="text-[9px] text-gray-500">{getArmorData(stat.armor)?.value}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-600">-</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="w-16 text-right">
                                                    <div className="text-gray-400 text-xs">LOADOUT</div>
                                                    <div className="text-white">
                                                        ¤{stat.loadoutValue?.toLocaleString() ?? '-'}
                                                    </div>
                                                </div>
                                                <div className="w-14 text-right">
                                                    <div className="text-gray-400 text-xs">REMAIN</div>
                                                    <div className="text-gray-400">
                                                        ¤{stat.remainingMoney?.toLocaleString() ?? '-'}
                                                    </div>
                                                </div>
                                                <div className="w-14 text-center">
                                                    <div className="text-gray-400 text-xs">K/D/A</div>
                                                    <div className="text-white">
                                                        {stat.kills}/{stat.deaths}/{stat.assists}
                                                    </div>
                                                </div>
                                                <div className="w-10 text-right">
                                                    <div className="text-gray-400 text-xs">DMG</div>
                                                    <div className="text-yellow-400">
                                                        {stat.damage}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
