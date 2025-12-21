import { NextResponse } from 'next/server';
import { importMatch } from '@/lib/importer';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

// Get the matches directory path
function getMatchesDir(): string {
    // Check for custom path from environment variable (for Electron)
    if (process.env.MATCHES_DIR) {
        return process.env.MATCHES_DIR;
    }
    // Default to project root matches folder
    return path.join(process.cwd(), 'matches');
}

export async function POST() {
    try {
        // Only allow in development mode for security
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'This endpoint is disabled in production' }, { status: 403 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
        }

        const matchesDir = getMatchesDir();

        // Create directory if it doesn't exist
        if (!fs.existsSync(matchesDir)) {
            fs.mkdirSync(matchesDir, { recursive: true });
            return NextResponse.json({ message: 'Matches directory created', imported: 0, skipped: 0 }, { status: 200 });
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
                }
                if (result.status === 'skipped') {
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
            total: files.length,
            matchesDir,
            details: results
        });

    } catch (error) {
        console.error('Ingestion error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET endpoint to check status
export async function GET() {
    try {
        // Only allow in development mode for security
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'This endpoint is disabled in production' }, { status: 403 });
        }

        const matchesDir = getMatchesDir();

        if (!fs.existsSync(matchesDir)) {
            return NextResponse.json({
                matchesDir,
                exists: false,
                fileCount: 0
            });
        }

        const files = fs.readdirSync(matchesDir).filter(file => file.endsWith('.json'));

        return NextResponse.json({
            matchesDir,
            exists: true,
            fileCount: files.length,
            files: files.slice(0, 10) // Return first 10 files
        });

    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
