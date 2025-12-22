'use client';

import { useState } from 'react';
import { Settings, Pencil } from 'lucide-react';
import { MatchSettingsDialog } from './MatchSettingsDialog';

interface MatchEditButtonProps {
    matchId: string;
    teamId: string;
    currentOpponentName: string;
}

export function MatchEditButton({ matchId, teamId, currentOpponentName }: MatchEditButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-1 hover:bg-gray-800 rounded-full transition-colors group"
                title="対戦相手を編集"
            >
                <Pencil className="w-4 h-4 text-gray-500 group-hover:text-white" />
            </button>

            {isOpen && (
                <MatchSettingsDialog
                    matchId={matchId}
                    teamId={teamId}
                    currentOpponentName={currentOpponentName}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
