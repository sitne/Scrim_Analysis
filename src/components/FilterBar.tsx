'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { getAgentName, getMapDisplayName, getTagColor } from '@/lib/utils';

interface FilterBarProps {
    maps: string[];
    agents: string[];
    players: { puuid: string; name: string; tag: string; matchCount?: number }[];
    showMaps?: boolean;
    showAgents?: boolean;
    showDate?: boolean;
}

export function FilterBar({
    maps,
    agents,
    players,
    showMaps = true,
    showAgents = true,
    showDate = true
}: FilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Local state for UI (syncs with URL on mount/update)
    const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [playerSearch, setPlayerSearch] = useState<string>('');
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [includeTags, setIncludeTags] = useState<string[]>([]);
    const [excludeTags, setExcludeTags] = useState<string[]>([]);

    // Sync state from URL
    useEffect(() => {
        setSelectedMaps(searchParams.get('maps')?.split(',').filter(Boolean) || []);
        setSelectedAgents(searchParams.get('agents')?.split(',').filter(Boolean) || []);
        setSelectedPlayers(searchParams.get('players')?.split(',').filter(Boolean) || []);
        setIncludeTags(searchParams.get('includeTags')?.split(',').filter(Boolean) || []);
        setExcludeTags(searchParams.get('excludeTags')?.split(',').filter(Boolean) || []);
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

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        const newRange = { ...dateRange, [type]: value };
        setDateRange(newRange);
        updateFilters({
            startDate: type === 'start' ? value : dateRange.start,
            endDate: type === 'end' ? value : dateRange.end
        });
    };

    // Filter players based on search
    const filteredPlayers = players.filter(player =>
        playerSearch === '' ||
        player.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
        player.tag.toLowerCase().includes(playerSearch.toLowerCase())
    );

    // Show only top 5 players by default
    const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);
    const PLAYERS_LIMIT = 5;
    const displayedPlayers = showAllPlayers || playerSearch !== ''
        ? filteredPlayers
        : filteredPlayers.slice(0, PLAYERS_LIMIT);

    return (
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg space-y-4 mb-8">
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

                    {/* Player List */}
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                        {displayedPlayers.map(player => (
                            <button
                                key={player.puuid}
                                onClick={() => handleMultiSelect('players', selectedPlayers, player.puuid, setSelectedPlayers)}
                                className={`px-3 py-1 text-xs rounded border transition-colors ${selectedPlayers.includes(player.puuid)
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
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => handleDateChange('end', e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500"
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
            {(selectedMaps.length > 0 || selectedAgents.length > 0 || selectedPlayers.length > 0 || dateRange.start || dateRange.end || includeTags.length > 0 || excludeTags.length > 0) && (
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => {
                            setSelectedMaps([]);
                            setSelectedAgents([]);
                            setSelectedPlayers([]);
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
    );
}
