-- CreateTable
CREATE TABLE "Match" (
    "matchId" TEXT NOT NULL PRIMARY KEY,
    "mapId" TEXT NOT NULL,
    "gamePodId" TEXT,
    "gameLoopZone" TEXT,
    "gameServerAddress" TEXT,
    "gameVersion" TEXT,
    "gameLengthMillis" INTEGER,
    "gameStartMillis" BIGINT,
    "provisioningFlowId" TEXT,
    "isCompleted" BOOLEAN,
    "customGameName" TEXT,
    "queueId" TEXT,
    "gameMode" TEXT,
    "isRanked" BOOLEAN,
    "seasonId" TEXT,
    "completionState" TEXT,
    "platformType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Player" (
    "puuid" TEXT NOT NULL PRIMARY KEY,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "puuid" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT,
    "partyId" TEXT,
    "characterId" TEXT,
    "competitiveTier" INTEGER,
    "accountLevel" INTEGER,
    "score" INTEGER,
    "roundsPlayed" INTEGER,
    "kills" INTEGER,
    "deaths" INTEGER,
    "assists" INTEGER,
    "playtimeMillis" INTEGER,
    "grenadeCasts" INTEGER,
    "ability1Casts" INTEGER,
    "ability2Casts" INTEGER,
    "ultimateCasts" INTEGER,

    PRIMARY KEY ("matchId", "puuid"),
    CONSTRAINT "MatchPlayer_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Player" ("puuid") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("matchId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" TEXT NOT NULL,
    "roundNum" INTEGER NOT NULL,
    "roundResult" TEXT,
    "roundCeremony" TEXT,
    "winningTeam" TEXT,
    "bombPlanter" TEXT,
    "bombDefuser" TEXT,
    "plantRoundTime" INTEGER,
    "plantLocationX" INTEGER,
    "plantLocationY" INTEGER,
    "plantSite" TEXT,
    "defuseRoundTime" INTEGER,
    "defuseLocationX" INTEGER,
    "defuseLocationY" INTEGER,
    CONSTRAINT "Round_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("matchId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoundPlayerStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" TEXT NOT NULL,
    "roundNum" INTEGER NOT NULL,
    "puuid" TEXT NOT NULL,
    "score" INTEGER,
    "kills" INTEGER,
    "damage" INTEGER,
    "loadoutValue" INTEGER,
    "weapon" TEXT,
    "armor" TEXT,
    "remainingMoney" INTEGER,
    "spentMoney" INTEGER,
    "wasAfk" BOOLEAN,
    "wasPenalized" BOOLEAN,
    "stayedInSpawn" BOOLEAN,
    CONSTRAINT "RoundPlayerStats_matchId_puuid_fkey" FOREIGN KEY ("matchId", "puuid") REFERENCES "MatchPlayer" ("matchId", "puuid") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoundPlayerStats_matchId_roundNum_fkey" FOREIGN KEY ("matchId", "roundNum") REFERENCES "Round" ("matchId", "roundNum") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KillEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" TEXT NOT NULL,
    "roundNum" INTEGER,
    "gameTime" INTEGER,
    "roundTime" INTEGER,
    "killerId" TEXT,
    "victimId" TEXT,
    "victimLocationX" INTEGER,
    "victimLocationY" INTEGER,
    "damageType" TEXT,
    "damageItem" TEXT,
    "isSecondaryFireMode" BOOLEAN,
    "assistants" TEXT,
    "playerLocations" TEXT,
    CONSTRAINT "KillEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("matchId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DamageEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" TEXT NOT NULL,
    "roundNum" INTEGER NOT NULL,
    "attackerId" TEXT,
    "receiverId" TEXT,
    "damage" INTEGER NOT NULL,
    "legshots" INTEGER,
    "bodyshots" INTEGER,
    "headshots" INTEGER,
    CONSTRAINT "DamageEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("matchId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Round_matchId_roundNum_key" ON "Round"("matchId", "roundNum");

-- CreateIndex
CREATE UNIQUE INDEX "RoundPlayerStats_matchId_roundNum_puuid_key" ON "RoundPlayerStats"("matchId", "roundNum", "puuid");
