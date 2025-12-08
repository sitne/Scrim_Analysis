const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prismaDir = path.join(__dirname, '..', 'prisma');
const prodDir = path.join(prismaDir, 'prod');
const prodDbPath = path.join(prodDir, 'dev.db');

console.log('Preparing clean production database...');

// 1. Remove entire prod directory and recreate
if (fs.existsSync(prodDir)) {
    fs.rmSync(prodDir, { recursive: true, force: true });
}
fs.mkdirSync(prodDir, { recursive: true });

// 2. Also ensure we don't have any leftover journal files
const journalPath = path.join(prodDir, 'dev.db-journal');
if (fs.existsSync(journalPath)) {
    fs.unlinkSync(journalPath);
}

// 2. Set environment variable for Prisma to use the new DB path
// Note: Prisma expects file: prefix for SQLite
process.env.DATABASE_URL = `file:${prodDbPath}`;

console.log(`Generating database at ${prodDbPath}...`);

try {
    // 3. Run migrations to create tables
    execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: `file:${prodDbPath}` }
    });

    console.log('Production database prepared successfully.');
} catch (error) {
    console.error('Failed to prepare production database:', error);
    process.exit(1);
}
