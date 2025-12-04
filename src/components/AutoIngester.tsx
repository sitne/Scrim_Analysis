'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AutoIngester() {
    const [ingesting, setIngesting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const ingest = async () => {
            setIngesting(true);
            try {
                const res = await fetch('/api/ingest', { method: 'POST' });
                const data = await res.json();
                if (data.imported > 0) {
                    console.log(`Imported ${data.imported} new matches.`);
                    router.refresh(); // Refresh server components to show new data
                }
            } catch (error) {
                console.error('Auto-ingestion failed:', error);
            } finally {
                setIngesting(false);
            }
        };

        ingest();
    }, [router]);

    if (ingesting) {
        return (
            <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg text-sm animate-pulse">
                Checking for new matches...
            </div>
        );
    }

    return null;
}
