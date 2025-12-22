'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { getAgentName, getMapDisplayName, getTagColor } from '@/lib/utils';
import { ChevronDown, ChevronUp, Filter, Settings } from 'lucide-react';
import { PlayerSettingsDialog } from './PlayerSettingsDialog';

interface FilterBarProps {
    maps: string[];
    agents: string[];
    players: { puuid: string; name: string; tag: string; matchCount?: number; mergedToPuuid?: string | null }[];
    showMaps?: boolean;
    showAgents?: boolean;
    showDate?: boolean;
    opponents?: { name: string; tag: string; count: number }[];
}

export function FilterBar({
    maps,
    agents,
    players,
    showMaps = true,
    showAgents = true,
    showDate = true,
    opponents = []
}: FilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Collapse state
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Local state for UI (syncs with URL on mount/update)
    const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [selectedOpponents, setSelectedOpponents] = useState<{ name: string; tag: string }[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [playerSearch, setPlayerSearch] = useState<string>('');
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [includeTags, setIncludeTags] = useState<string[]>([]);
    const [excludeTags, setExcludeTags] = useState<string[]>([]);
    const [showMerged, setShowMerged] = useState<boolean>(false);
    const [editingPlayer, setEditingPlayer] = useState<{ puuid: string; name: string; tag: string; mergedToPuuid?: string | null } | null>(null);

    // Sync state from URL
    useEffect(() => {
        setSelectedMaps(searchParams.get('maps')?.split(',').filter(Boolean) || []);
        setSelectedAgents(searchParams.get('agents')?.split(',').filter(Boolean) || []);
        setSelectedPlayers(searchParams.get('players')?.split(',').filter(Boolean) || []);
        setIncludeTags(searchParams.get('includeTags')?.split(',').filter(Boolean) || []);
        setExcludeTags(searchParams.get('excludeTags')?.split(',').filter(Boolean) || []);

        const rawOpponents = searchParams.get('opponents')?.split(',').filter(Boolean) || [];
        const parsedOpponents = rawOpponents.map(o => {
            const [name, tag] = o.split('#');
            return { name, tag };
        });
        setSelectedOpponents(parsedOpponents);

        setDateRange({
            start: searchParams.get('startDate') || '',
            end: searchParams.get('endDate') || ''
        });

        // Fetch tags
        fetch('/api/tags')
            .then(res => res.json())
            .then(data => setAvailableTags(data))
            .catch(err => console.error('Failed to fetch tags', err));
    }, [searchParams]);

    const updateFilters = useCallback((newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(newParams).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });

        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    const handleMultiSelect = (
        key: string,
        currentSelection: string[],
        value: string,
        setFn: (val: string[]) => void
    ) => {
        // Prevent removing the last player
        if (key === 'players' && currentSelection.length === 1 && currentSelection.includes(value)) {
            alert('最低1人のプレイヤーを選択してください');
            return;
        }

        const newSelection = currentSelection.includes(value)
            ? currentSelection.filter(v => v !== value)
            : [...currentSelection, value];

        setFn(newSelection);
        updateFilters({ [key]: newSelection.join(',') });
    };

    const handleOpponentSelect = (name: string, tag: string) => {
        const value = `${name}#${tag}`;
        const isSelected = selectedOpponents.some(o => o.name === name && o.tag === tag);

        let newSelection;
        if (isSelected) {
            newSelection = selectedOpponents.filter(o => o.name !== name || o.tag !== tag);
        } else {
            newSelection = [...selectedOpponents, { name, tag }];
        }

        setSelectedOpponents(newSelection);
        const encoded = newSelection.map(o => `${o.name}#${o.tag}`).join(',');
        updateFilters({ opponents: encoded });
    }

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        const newRange = { ...dateRange, [type]: value };
        setDateRange(newRange);
        updateFilters({
            startDate: type === 'start' ? value : dateRange.start,
            endDate: type === 'end' ? value : dateRange.end
        });
    };

    // Filter players based on search
    const filteredPlayers = players.filter(player => {
        const matchesSearch = playerSearch === '' ||
            player.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
            player.tag.toLowerCase().includes(playerSearch.toLowerCase());

        const isMerged = !!player.mergedToPuuid;

        if (!matchesSearch) return false;
        if (isMerged && !showMerged) return false;

        return true;
    });

    // Show only top 5 players by default
    const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);
    const PLAYERS_LIMIT = 5;
    const displayedPlayers = showAllPlayers || playerSearch !== ''
        ? filteredPlayers
        : filteredPlayers.slice(0, PLAYERS_LIMIT);

    // Get selected player names for summary
    const selectedPlayerNames = players
        .filter(p => selectedPlayers.includes(p.puuid))
        .map(p => p.name);

    // Count active filters
    const activeFilterCount = selectedMaps.length + selectedAgents.length + includeTags.length + excludeTags.length + selectedOpponents.length + (dateRange.start ? 1 : 0) + (dateRange.end ? 1 : 0);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            {/* Collapsed Header / Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-300">Filter</span>

                    {/* Active filters summary when collapsed */}
                    {isCollapsed && (
                        <div className="flex items-center gap-2 ml-2 flex-wrap">
                            {selectedPlayerNames.length > 0 && selectedPlayerNames.map(name => (
                                <span key={name} className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                    {name}
                                </span>
                            ))}
                            {selectedMaps.length > 0 && selectedMaps.map(mapId => (
                                <span key={mapId} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                                    {getMapDisplayName(mapId)}
                                </span>
                            ))}
                            {selectedOpponents.length > 0 && selectedOpponents.map(t => (
                                <span key={`${t.name}#${t.tag}`} className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                                    VS {t.name}
                                </span>
                            ))}
                            {selectedAgents.length > 0 && selectedAgents.map(agentId => (
                                <span key={agentId} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                                    {getAgentName(agentId)}
                                </span>
                            ))}
                            {includeTags.length > 0 && includeTags.map(tag => (
                                <span key={`inc-${tag}`} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                    +{tag}
                                </span>
                            ))}
                            {excludeTags.length > 0 && excludeTags.map(tag => (
                                <span key={`exc-${tag}`} className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                                    -{tag}
                                </span>
                            ))}
                            {(dateRange.start || dateRange.end) && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                                    {dateRange.start || '...'} ~ {dateRange.end || '...'}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                    {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <div className="p-4 border-t border-gray-800 space-y-4">
                    <div className="flex flex-wrap gap-4">
                        {/* Maps Filter */}
                        {showMaps && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs text-gray-400 mb-1 font-semibold">MAPS</label>
                                <div className="flex flex-wrap gap-2">
                                    {maps.map(mapId => (
                                        <button
                                            key={mapId}
                                            onClick={() => handleMultiSelect('maps', selectedMaps, mapId, setSelectedMaps)}
                                            className={`px-3 py-1 text-xs rounded border transition-colors ${selectedMaps.includes(mapId)
                                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            {getMapDisplayName(mapId)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Agents Filter */}
                        {showAgents && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs text-gray-400 mb-1 font-semibold">AGENTS</label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {agents.map(agentId => (
                                        <button
                                            key={agentId}
                                            onClick={() => handleMultiSelect('agents', selectedAgents, agentId, setSelectedAgents)}
                                            className={`px-3 py-1 text-xs rounded border transition-colors ${selectedAgents.includes(agentId)
                                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            {getAgentName(agentId)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Opponents Filter */}
                        {opponents.length > 0 && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs text-gray-400 mb-1 font-semibold">OPPONENTS</label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {opponents.map(t => (
                                        <button
                                            key={`${t.name}#${t.tag}`}
                                            onClick={() => handleOpponentSelect(t.name, t.tag)}
                                            className={`px-3 py-1 text-xs rounded border transition-colors ${selectedOpponents.some(o => o.name === t.name && o.tag === t.tag)
                                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            {t.name}
                                            <span className="ml-1 text-[10px] bg-gray-700 px-1 rounded">
                                                {t.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 border-t border-gray-800 pt-4">
                        {/* Players Filter */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-gray-400 mb-2 font-semibold">PLAYERS</label>

                            {/* Search Box */}
                            <input
                                type="text"
                                placeholder="Search players..."
                                value={playerSearch}
                                onChange={(e) => setPlayerSearch(e.target.value)}
                                className="w-full mb-2 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                            />

                            {/* Show Merged Toggle */}
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="show-merged"
                                    checked={showMerged}
                                    onChange={(e) => setShowMerged(e.target.checked)}
                                    className="rounded bg-gray-800 border-gray-700 text-red-500 focus:ring-red-500/20"
                                />
                                <label htmlFor="show-merged" className="text-xs text-gray-400 cursor-pointer select-none">
                                    Show Merged Players
                                </label>
                            </div>

                            {/* Player List */}
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                                {displayedPlayers.map(player => (
                                    <button
                                        key={player.puuid}
                                        onClick={() => {
                                            if (player.mergedToPuuid) {
                                                setEditingPlayer(player);
                                            } else {
                                                handleMultiSelect('players', selectedPlayers, player.puuid, setSelectedPlayers);
                                            }
                                        }}
                                        className={`group relative px-3 py-1 text-xs rounded border transition-colors pr-8 ${player.mergedToPuuid
                                            ? 'bg-gray-800/50 border-gray-700 text-gray-500 hover:border-gray-600'
                                            : selectedPlayers.includes(player.puuid)
                                                ? 'bg-green-500/20 border-green-500 text-green-400'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        {player.name} <span className="text-gray-600">#{player.tag}</span>
                                        {player.matchCount && (
                                            <span className="ml-1 text-[10px] bg-gray-700 px-1 rounded">
                                                {player.matchCount}
                                            </span>
                                        )}
                                        {player.mergedToPuuid && (
                                            <span className="ml-1 text-[10px] text-yellow-500 bg-yellow-500/10 px-1 rounded border border-yellow-500/20">
                                                Merged
                                            </span>
                                        )}

                                        {/* Settings Button */}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPlayer(player);
                                            }}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Settings className="w-3 h-3" />
                                        </div>
                                    </button>
                                ))}
                                {filteredPlayers.length === 0 && (
                                    <div className="text-sm text-gray-500 py-2">No players found</div>
                                )}
                            </div>

                            {/* Expand/Collapse Button */}
                            {playerSearch === '' && filteredPlayers.length > PLAYERS_LIMIT && (
                                <button
                                    onClick={() => setShowAllPlayers(!showAllPlayers)}
                                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                                >
                                    {showAllPlayers
                                        ? 'Hide'
                                        : `Show more (${filteredPlayers.length - PLAYERS_LIMIT})`
                                    }
                                </button>
                            )}
                        </div>

                        {/* Date Filter */}
                        {showDate && (
                            <div className="w-auto">
                                <label className="block text-xs text-gray-400 mb-1 font-semibold">DATE RANGE</label>
                                <div className="flex gap-2 items-center">
                                    <div
                                        onClick={() => (document.getElementById('date-start-picker') as HTMLInputElement)?.showPicker()}
                                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white cursor-pointer hover:border-gray-600 min-w-[90px] text-center select-none"
                                    >
                                        {dateRange.start || <span className="text-gray-500">Start</span>}
                                    </div>
                                    <input
                                        id="date-start-picker"
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="sr-only"
                                    />

                                    <span className="text-gray-500">-</span>

                                    <div
                                        onClick={() => (document.getElementById('date-end-picker') as HTMLInputElement)?.showPicker()}
                                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white cursor-pointer hover:border-gray-600 min-w-[90px] text-center select-none"
                                    >
                                        {dateRange.end || <span className="text-gray-500">End</span>}
                                    </div>
                                    <input
                                        id="date-end-picker"
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="sr-only"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tag Filters */}
                    {availableTags.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-800 pt-4">
                            <div>
                                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Include Tags</div>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map(tag => (
                                        <button
                                            key={`inc-${tag}`}
                                            onClick={() => handleMultiSelect('includeTags', includeTags, tag, setIncludeTags)}
                                            className={`px-3 py-1 rounded text-xs font-medium transition-all border ${includeTags.includes(tag)
                                                ? 'border-transparent text-white shadow-lg scale-105'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                            style={includeTags.includes(tag) ? { backgroundColor: getTagColor(tag) } : {}}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Exclude Tags</div>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map(tag => (
                                        <button
                                            key={`exc-${tag}`}
                                            onClick={() => handleMultiSelect('excludeTags', excludeTags, tag, setExcludeTags)}
                                            className={`px-3 py-1 rounded text-xs font-medium transition-all border ${excludeTags.includes(tag)
                                                ? 'bg-red-900/50 border-red-500 text-red-200 shadow-lg'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clear Filters */}
                    {(selectedMaps.length > 0 || selectedAgents.length > 0 || selectedPlayers.length > 0 || selectedOpponents.length > 0 || dateRange.start || dateRange.end || includeTags.length > 0 || excludeTags.length > 0) && (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => {
                                    setSelectedMaps([]);
                                    setSelectedAgents([]);
                                    setSelectedPlayers([]);
                                    setSelectedOpponents([]);
                                    setIncludeTags([]);
                                    setExcludeTags([]);
                                    setDateRange({ start: '', end: '' });
                                    router.push(pathname);
                                }}
                                className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}
            {editingPlayer && (
                <PlayerSettingsDialog
                    player={editingPlayer}
                    allPlayers={players}
                    onClose={() => setEditingPlayer(null)}
                    onUpdate={() => {
                        // Refresh the page to reflect changes
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
