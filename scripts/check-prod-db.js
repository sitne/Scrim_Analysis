const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'prod', 'dev.db');
console.log('Checking database at:', dbPath);

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: `file:${dbPath}`
        }
    }
});

async function main() {
    const matchCount = await prisma.match.count();
    console.log('Match count in prod/dev.db:', matchCount);

    const roundCount = await prisma.round.count();
    console.log('Round count in prod/dev.db:', roundCount);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
