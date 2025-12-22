const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting backfill of weapon info in DamageEvents...');

    // weaponがnullのDamageEventを取得
    const damageEvents = await prisma.damageEvent.findMany({
        where: {
            weapon: null,
            attackerId: { not: null }
        }
    });

    console.log(`Found ${damageEvents.length} events to update.`);

    for (const de of damageEvents) {
        // 同じラウンド、同じプレイヤーの統計を取得
        const stats = await prisma.roundPlayerStats.findUnique({
            where: {
                matchId_roundNum_puuid: {
                    matchId: de.matchId,
                    roundNum: de.roundNum,
                    puuid: de.attackerId
                }
            }
        });

        if (stats && stats.weapon) {
            await prisma.damageEvent.update({
                where: { id: de.id },
                data: { weapon: stats.weapon }
            });
        }
    }

    console.log('Backfill completed.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
