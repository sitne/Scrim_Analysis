#!/usr/bin/env tsx
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { importMatch } from '@/lib/importer';

const prisma = new PrismaClient();

async function main() {
    const matchesDir = path.join(process.cwd(), 'matches');

    // Create directory if it doesn't exist
    if (!fs.existsSync(matchesDir)) {
        console.log('Creating matches directory...');
        fs.mkdirSync(matchesDir);
        console.log('Please place your match JSON files in the "matches" directory and run this script again.');
        return;
    }

    const files = fs.readdirSync(matchesDir).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.log('No JSON files found in "matches" directory.');
        return;
    }

    console.log(`Found ${files.length} match files. Starting import...`);

    for (const file of files) {
        try {
            await importMatch(path.join(matchesDir, file));
        } catch (error) {
            console.error(`Error importing ${file}:`, error);
        }
    }

    console.log('All imports completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
