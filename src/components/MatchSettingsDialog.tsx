'use client';

import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MatchSettingsDialogProps {
    matchId: string;
    currentOpponentName: string;
    currentOpponentTag?: string;
    onClose: () => void;
    onUpdate?: () => void;
}

export function MatchSettingsDialog({
    matchId,
    currentOpponentName,
    currentOpponentTag,
    onClose,
    onUpdate
}: MatchSettingsDialogProps) {
    const router = useRouter();
    const [opponentName, setOpponentName] = useState(currentOpponentName);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/match/${matchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    opponentName: opponentName
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update match');
            }

            if (onUpdate) {
                onUpdate();
            } else {
                router.refresh();
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1b2733] border border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-400" />
                        Match Settings
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Opponent Settings */}
                    <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                        <h4 className="text-sm font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">
                            Opponent Team
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Team Name</label>
                                <input
                                    type="text"
                                    value={opponentName}
                                    onChange={(e) => setOpponentName(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                                    placeholder="Enter team name"
                                />
                            </div>
                        </div>
                    </div>

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
