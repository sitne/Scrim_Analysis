'use client';

import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';

interface Player {
    puuid: string;
    name: string;
    tag: string;
    mergedToPuuid?: string | null;
}

interface PlayerSettingsDialogProps {
    player: Player;
    allPlayers: Player[];
    onClose: () => void;
    onUpdate: () => void;
}

export function PlayerSettingsDialog({ player, allPlayers, onClose, onUpdate }: PlayerSettingsDialogProps) {
    const [alias, setAlias] = useState(player.name === player.tag ? '' : player.name);
    const [mergeTarget, setMergeTarget] = useState<string>(player.mergedToPuuid || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter out self from merge options
    const mergeOptions = allPlayers.filter(p => p.puuid !== player.puuid);

    // Find players merged into this player
    const linkedPlayers = allPlayers.filter(p => p.mergedToPuuid === player.puuid);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/players/${player.puuid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alias: alias || null,
                    mergedToPuuid: mergeTarget || null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update player');
            }

            onUpdate();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnlink = async (targetPuuid: string) => {
        if (!confirm('Are you sure you want to unlink this account?')) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/players/${targetPuuid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mergedToPuuid: null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to unlink player');
            }

            onUpdate();
            // Don't close dialog, just refresh data (though onUpdate might trigger re-render of parent)
            // Ideally we should update local state, but parent re-render will close dialog if we don't handle it carefully.
            // Since onUpdate refreshes the page/router, the dialog might close or props might update.
            // If the dialog is controlled by parent state which is reset on refresh, it will close.
            // Let's assume it closes for now, which is fine.
            onClose();
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1b2733] border border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-400" />
                        Player Settings
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Player Info */}
                    <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Selected Player</div>
                        <div className="font-mono text-white">{player.name} <span className="text-gray-500">#{player.tag}</span></div>
                        <div className="text-xs text-gray-600 font-mono mt-1">{player.puuid}</div>

                        {player.mergedToPuuid && (
                            <div className="mt-2 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 p-2 rounded flex items-center justify-between">
                                <span>Merged into another account</span>
                                <button
                                    onClick={() => setMergeTarget('')}
                                    className="underline hover:text-yellow-300"
                                >
                                    Unmerge
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Alias Setting */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Display Name (Alias)</label>
                        <input
                            type="text"
                            value={alias}
                            onChange={(e) => setAlias(e.target.value)}
                            placeholder={player.name}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty to use Riot ID.</p>
                    </div>

                    {/* Merge Setting */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Merge Into</label>
                        <select
                            value={mergeTarget}
                            onChange={(e) => setMergeTarget(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                        >
                            <option value="">-- Do not merge --</option>
                            {mergeOptions.map(p => (
                                <option key={p.puuid} value={p.puuid}>
                                    {p.name} #{p.tag}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Select a primary account to merge this player's stats into.
                        </p>
                    </div>

                    {/* Linked Accounts (Reverse Merge) */}
                    {linkedPlayers.length > 0 && (
                        <div className="border-t border-gray-700 pt-4">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Linked Accounts</label>
                            <div className="space-y-2">
                                {linkedPlayers.map(p => (
                                    <div key={p.puuid} className="flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-700">
                                        <div className="text-sm">
                                            <div className="text-white">{p.name}</div>
                                            <div className="text-xs text-gray-500">#{p.tag}</div>
                                        </div>
                                        <button
                                            onClick={() => handleUnlink(p.puuid)}
                                            className="text-xs text-red-400 hover:text-red-300 border border-red-900 bg-red-900/20 px-2 py-1 rounded"
                                        >
                                            Unlink
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-sm bg-red-400/10 p-2 rounded border border-red-400/20">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
