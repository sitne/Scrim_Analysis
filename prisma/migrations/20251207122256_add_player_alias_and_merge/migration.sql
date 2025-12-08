-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "puuid" TEXT NOT NULL PRIMARY KEY,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "alias" TEXT,
    "mergedToPuuid" TEXT,
    CONSTRAINT "Player_mergedToPuuid_fkey" FOREIGN KEY ("mergedToPuuid") REFERENCES "Player" ("puuid") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("gameName", "puuid", "tagLine") SELECT "gameName", "puuid", "tagLine" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
