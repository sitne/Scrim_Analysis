'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Check, FolderOpen, AlertCircle, Settings } from 'lucide-react';

export function AutoIngester() {
    const [status, setStatus] = useState<'idle' | 'checking' | 'importing' | 'done' | 'error'>('idle');
    const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const ingest = useCallback(async () => {
        setStatus('checking');
        setError(null);
        try {
            const res = await fetch('/api/ingest', { method: 'POST' });
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setResult({ imported: data.imported, skipped: data.skipped });
            setStatus('done');

            if (data.imported > 0) {
                console.log(`Imported ${data.imported} new matches.`);
                // Refresh after a delay to show the result
                setTimeout(() => {
                    router.refresh();
                }, 1500);
            }
        } catch (err) {
            console.error('Ingestion failed:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
        }
    }, [router]);

    // Auto-ingest removed - only manual import via button

    // Reset status after showing result
    useEffect(() => {
        if (status === 'done' || status === 'error') {
            const timer = setTimeout(() => {
                setStatus('idle');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={ingest}
                disabled={status === 'checking' || status === 'importing'}
                className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-200 cursor-pointer
                    ${status === 'checking' || status === 'importing'
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30'
                    }
                `}
            >
                <RefreshCw className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
                {status === 'checking' ? 'チェック中...' : 'マッチをインポート'}
            </button>



            {/* Change Matches Folder Button (Electron only) */}
            {typeof window !== 'undefined' && window.electron && (
                <button
                    onClick={() => window.electron?.changeMatchesDir()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-all duration-200"
                    title="matchesフォルダの場所を変更"
                >
                    <Settings className="w-4 h-4" />
                </button>
            )}

            {status === 'done' && result && (
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm animate-fade-in
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

            {status === 'error' && error && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-red-900/30 text-red-400 border border-red-700/50">
                    <AlertCircle className="w-4 h-4" />
                    エラー: {error}
                </div>
            )}
        </div>
    );
}
