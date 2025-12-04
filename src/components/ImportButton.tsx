'use client';

import { useState } from 'react';
import { RefreshCw, Check, AlertCircle, FolderOpen } from 'lucide-react';

interface ImportResult {
    message: string;
    imported: number;
    skipped: number;
    total?: number;
    details?: Array<{
        file: string;
        status: string;
        matchId?: string;
        error?: string;
    }>;
}

export function ImportButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImport = async () => {
        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch('/api/ingest', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Import failed');
            }

            const data = await response.json();
            setResult(data);

            // If new matches were imported, refresh the page after a short delay
            if (data.imported > 0) {
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleImport}
                disabled={isLoading}
                className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-200 cursor-pointer
                    ${isLoading
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30'
                    }
                `}
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'インポート中...' : 'マッチをインポート'}
            </button>

            {result && (
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                    ${result.imported > 0
                        ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                        : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
                    }
                `}>
                    {result.imported > 0 ? (
                        <>
                            <Check className="w-4 h-4" />
                            {result.imported}件インポート完了
                        </>
                    ) : (
                        <>
                            <FolderOpen className="w-4 h-4" />
                            新しいマッチはありません
                        </>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-red-900/30 text-red-400 border border-red-700/50">
                    <AlertCircle className="w-4 h-4" />
                    エラー: {error}
                </div>
            )}
        </div>
    );
}
