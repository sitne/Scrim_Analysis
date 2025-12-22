'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { getAgentName, getMapDisplayName, getTagColor } from '@/lib/utils';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

interface FilterBarProps {
    maps: string[];
    agents: string[];
    showMaps?: boolean;
    showAgents?: boolean;
    showDate?: boolean;
    opponents?: { name: string; count: number }[];
}

export function FilterBar({
    maps,
    agents,
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
    const [selectedOpponents, setSelectedOpponents] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [includeTags, setIncludeTags] = useState<string[]>([]);
    const [excludeTags, setExcludeTags] = useState<string[]>([]);

    // Sync state from URL
    useEffect(() => {
        setSelectedMaps(searchParams.get('maps')?.split(',').filter(Boolean) || []);
        setSelectedAgents(searchParams.get('agents')?.split(',').filter(Boolean) || []);

        const rawOpponents = searchParams.get('opponents')?.split(',').filter(Boolean) || [];
        setSelectedOpponents(rawOpponents);

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
        const newSelection = currentSelection.includes(value)
            ? currentSelection.filter(v => v !== value)
            : [...currentSelection, value];

        setFn(newSelection);
        updateFilters({ [key]: newSelection.join(',') });
    };

    const handleOpponentSelect = (name: string) => {
        const isSelected = selectedOpponents.includes(name);

        let newSelection;
        if (isSelected) {
            newSelection = selectedOpponents.filter(o => o !== name);
        } else {
            newSelection = [...selectedOpponents, name];
        }

        setSelectedOpponents(newSelection);
        updateFilters({ opponents: newSelection.join(',') });
    }

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        const newRange = { ...dateRange, [type]: value };
        setDateRange(newRange);
        updateFilters({
            startDate: type === 'start' ? value : dateRange.start,
            endDate: type === 'end' ? value : dateRange.end
        });
    };

    // Show only top 5 players by default
    const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);

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
                            {selectedMaps.length > 0 && selectedMaps.map(mapId => (
                                <span key={mapId} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                                    {getMapDisplayName(mapId)}
                                </span>
                            ))}
                            {selectedOpponents.length > 0 && selectedOpponents.map(name => (
                                <span key={name} className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                                    VS {name}
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
                                            key={t.name}
                                            onClick={() => handleOpponentSelect(t.name)}
                                            className={`px-3 py-1 text-xs rounded border transition-colors ${selectedOpponents.includes(t.name)
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
                    {(selectedMaps.length > 0 || selectedAgents.length > 0 || selectedOpponents.length > 0 || dateRange.start || dateRange.end || includeTags.length > 0 || excludeTags.length > 0) && (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => {
                                    setSelectedMaps([]);
                                    setSelectedAgents([]);
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
        </div>
    );
}
