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
        <div className="bg-transparent overflow-hidden"> {/* 背景と枠線を消す */}
            {/* Header / Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between py-3 transition-all group border-b border-white/5 hover:border-red-500/50"
            >
                <div className="flex items-center gap-4">
                    {/* 左側の赤いインジケーター */}
                    <div className={`w-1 h-5 transition-all ${activeFilterCount > 0 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-gray-700'}`} />

                    <div className="flex items-center gap-2">
                        <Filter className={`w-4 h-4 ${activeFilterCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Filter</span>
                    </div>

                    {/* 折り畳み時のサマリー（チップのデザインをスリム化） */}
                    {isCollapsed && (
                        <div className="flex items-center gap-1.5 ml-4 flex-wrap overflow-hidden h-6">
                            {selectedMaps.map(mapId => (
                                <span key={mapId} className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-sm border border-white/10 uppercase">
                                    {getMapDisplayName(mapId)}
                                </span>
                            ))}
                            {selectedOpponents.map(name => (
                                <span key={name} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-sm border border-indigo-500/30 uppercase">
                                    VS {name}
                                </span>
                            ))}
                            {selectedAgents.map(agentId => (
                                <span key={agentId} className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-sm border border-purple-500/30 uppercase">
                                    {getAgentName(agentId)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pr-2">
                    {activeFilterCount > 0 && (
                        <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-sm">
                            {activeFilterCount}
                        </span>
                    )}
                    {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    ) : (
                        <ChevronUp className="w-4 h-4 text-red-500 transition-colors" />
                    )}
                </div>
            </button>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <div className="p-6 bg-black/40 backdrop-blur-md border-x border-b border-white/5 rounded-b-xl space-y-6 mt-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Maps Filter */}
                        {showMaps && (
                            <div className="space-y-3">
                                <label className="block text-[10px] text-gray-500 font-black tracking-widest uppercase">Maps Selection</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {maps.map(mapId => (
                                        <button
                                            key={mapId}
                                            onClick={() => handleMultiSelect('maps', selectedMaps, mapId, setSelectedMaps)}
                                            className={`px-3 py-1.5 text-[11px] font-bold uppercase transition-all border ${selectedMaps.includes(mapId)
                                                ? 'bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
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
                            <div className="space-y-3">
                                <label className="block text-[10px] text-gray-400 font-black tracking-widest uppercase">Agent Assets</label>
                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {agents.map(agentId => (
                                        <button
                                            key={agentId}
                                            onClick={() => handleMultiSelect('agents', selectedAgents, agentId, setSelectedAgents)}
                                            className={`px-3 py-1.5 text-[11px] font-bold uppercase transition-all border ${selectedAgents.includes(agentId)
                                                ? 'bg-white text-black border-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
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
                            <div className="space-y-3">
                                <label className="block text-[10px] text-gray-400 font-black tracking-widest uppercase">Opponent History</label>
                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {opponents.map(t => (
                                        <button
                                            key={t.name}
                                            onClick={() => handleOpponentSelect(t.name)}
                                            className={`px-3 py-1.5 text-[11px] font-bold uppercase transition-all border ${selectedOpponents.includes(t.name)
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            {t.name}
                                            <span className="ml-2 opacity-50 text-[9px]">{t.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 下段: Date & Tags */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                        {/* Date Picker */}
                        {showDate && (
                            <div className="space-y-3">
                                <label className="block text-[10px] text-gray-400 font-black tracking-widest uppercase">Operation Date</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                                    />
                                    <span className="text-gray-600">—</span>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Clear Button */}
                        <div className="flex items-end justify-end">
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
                                className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-500 hover:text-red-500 transition-all"
                            >
                                <div className="w-4 h-px bg-gray-700 group-hover:bg-red-500 transition-all" />
                                Reset Operations
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}