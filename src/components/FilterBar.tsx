'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { getAgentName, getMapDisplayName } from '@/lib/utils';
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

    const [isCollapsed, setIsCollapsed] = useState(true);
    const [opponentSearch, setOpponentSearch] = useState<string>('');

    const selectedMaps = searchParams.get('maps')?.split(',').filter(Boolean) || [];
    const selectedAgents = searchParams.get('agents')?.split(',').filter(Boolean) || [];
    const selectedOpponents = searchParams.get('opponents')?.split(',').filter(Boolean) || [];
    const includeTags = searchParams.get('includeTags')?.split(',').filter(Boolean) || [];
    const excludeTags = searchParams.get('excludeTags')?.split(',').filter(Boolean) || [];
    const dateRange = {
        start: searchParams.get('startDate') || '',
        end: searchParams.get('endDate') || ''
    };

    const updateFilters = useCallback((newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(newParams).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    const handleMultiSelect = (
        key: string,
        currentSelection: string[],
        value: string,
    ) => {
        const newSelection = currentSelection.includes(value)
            ? currentSelection.filter(v => v !== value)
            : [...currentSelection, value];

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

        updateFilters({ opponents: newSelection.join(',') });
    };

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        updateFilters({
            startDate: type === 'start' ? value : dateRange.start,
            endDate: type === 'end' ? value : dateRange.end
        });
    };

    // Handle opponent search input (local filter only, does not filter matches)
    const handleOpponentSearchChange = (value: string) => {
        setOpponentSearch(value);
    };

    // Filter opponents list based on search
    const filteredOpponents = opponents.filter(o =>
        o.name.toLowerCase().includes(opponentSearch.toLowerCase())
    );

    // Count active filters
    const activeFilterCount = selectedMaps.length + selectedAgents.length + selectedOpponents.length + includeTags.length + excludeTags.length + (dateRange.start ? 1 : 0) + (dateRange.end ? 1 : 0);

    return (
        <div className="bg-transparent overflow-hidden">
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
                                            onClick={() => handleMultiSelect('maps', selectedMaps, mapId)}
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
                                            onClick={() => handleMultiSelect('agents', selectedAgents, agentId)}
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
                        <div className="space-y-3">
                            <label className="block text-[10px] text-gray-400 font-black tracking-widest uppercase">Opponent Search</label>
                            <input
                                type="text"
                                value={opponentSearch}
                                onChange={(e) => handleOpponentSearchChange(e.target.value)}
                                placeholder="チーム名を検索..."
                                className="w-full bg-white/5 border border-white/10 rounded-none px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                            {filteredOpponents.length > 0 && (
                                <>
                                    <label className="block text-[10px] text-gray-500 font-medium tracking-wider uppercase mt-3">History</label>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredOpponents.map(t => (
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
                                </>
                            )}
                            {opponents.length > 0 && filteredOpponents.length === 0 && opponentSearch && (
                                <div className="text-[10px] text-gray-500 italic">該当なし</div>
                            )}
                        </div>
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
                                    setOpponentSearch('');
                                    updateFilters({
                                        maps: null,
                                        agents: null,
                                        opponents: null,
                                        includeTags: null,
                                        excludeTags: null,
                                        startDate: null,
                                        endDate: null,
                                    });
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
