-- AlterTable
ALTER TABLE "RoundPlayerStats" ADD COLUMN "assists" INTEGER;
ALTER TABLE "RoundPlayerStats" ADD COLUMN "deaths" INTEGER;

-- CreateTable
CREATE TABLE "MatchTag" (
    "matchId" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,

    PRIMARY KEY ("matchId", "tagName"),
    CONSTRAINT "MatchTag_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("matchId") ON DELETE CASCADE ON UPDATE CASCADE
);
