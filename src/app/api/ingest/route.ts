import { NextResponse } from 'next/server';
import { importMatch } from '@/lib/importer';
import fs from 'fs';
import path from 'path';

export async function POST() {
    try {
        const matchesDir = path.join(process.cwd(), 'matches');

        if (!fs.existsSync(matchesDir)) {
            return NextResponse.json({ message: 'Matches directory not found', imported: 0, skipped: 0 }, { status: 200 });
        }

        const files = fs.readdirSync(matchesDir).filter(file => file.endsWith('.json'));

        if (files.length === 0) {
            return NextResponse.json({ message: 'No match files found', imported: 0, skipped: 0 }, { status: 200 });
        }

        let importedCount = 0;
        let skippedCount = 0;
        const results = [];

        for (const file of files) {
            try {
                const result = await importMatch(path.join(matchesDir, file));
                if (result.status === 'imported') {
                    importedCount++;
                } else {
                    skippedCount++;
                }
                results.push({ file, ...result });
            } catch (error) {
                console.error(`Error importing ${file}:`, error);
                results.push({ file, status: 'error', error: String(error) });
            }
        }

        return NextResponse.json({
            message: 'Ingestion complete',
            imported: importedCount,
            skipped: skippedCount,
            details: results
        });

    } catch (error) {
        console.error('Ingestion error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
