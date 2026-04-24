import { describe, expect, it } from 'vitest';
import { calculateStats, type MatchWithDetails } from '../../src/lib/stats';

function buildMatch(): MatchWithDetails {
  const redPlayer = {
    puuid: 'red-player',
    teamId: 'Red',
    characterId: 'jett',
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    player: {
      gameName: 'Red',
      tagLine: '0001',
      alias: null,
      mergedToPuuid: null,
      mergedTo: null,
    },
  };

  const bluePlayer = {
    puuid: 'blue-player',
    teamId: 'Blue',
    characterId: 'phoenix',
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    player: {
      gameName: 'Blue',
      tagLine: '0002',
      alias: null,
      mergedToPuuid: null,
      mergedTo: null,
    },
  };

  return {
    mapId: 'test-map',
    myTeamSide: 'Red',
    winningTeam: 'Red',
    rounds: [
      {
        roundNum: 0,
        winningTeam: 'Red',
        roundResult: 'Eliminated',
        plantRoundTime: null,
        playerStats: [
          { puuid: 'red-player', score: 0, kills: 0, damage: 0 },
          { puuid: 'blue-player', score: 0, kills: 0, damage: 0 },
        ],
      },
      {
        roundNum: 1,
        winningTeam: 'Blue',
        roundResult: 'Eliminated',
        plantRoundTime: null,
        playerStats: [
          { puuid: 'red-player', score: 0, kills: 0, damage: 0 },
          { puuid: 'blue-player', score: 0, kills: 0, damage: 0 },
        ],
      },
      {
        roundNum: 12,
        winningTeam: 'Red',
        roundResult: 'Eliminated',
        plantRoundTime: null,
        playerStats: [
          { puuid: 'red-player', score: 0, kills: 0, damage: 0 },
          { puuid: 'blue-player', score: 0, kills: 0, damage: 0 },
        ],
      },
      {
        roundNum: 13,
        winningTeam: 'Blue',
        roundResult: 'Eliminated',
        plantRoundTime: null,
        playerStats: [
          { puuid: 'red-player', score: 0, kills: 0, damage: 0 },
          { puuid: 'blue-player', score: 0, kills: 0, damage: 0 },
        ],
      },
    ],
    players: [redPlayer, bluePlayer],
    kills: [
      {
        roundNum: 0,
        roundTime: 1000,
        killerId: 'red-player',
        victimId: 'blue-player',
        assistants: [],
      },
      {
        roundNum: 1,
        roundTime: 1000,
        killerId: 'blue-player',
        victimId: 'red-player',
        assistants: [],
      },
      {
        roundNum: 12,
        roundTime: 1000,
        killerId: 'red-player',
        victimId: 'blue-player',
        assistants: [],
      },
      {
        roundNum: 13,
        roundTime: 1000,
        killerId: 'blue-player',
        victimId: 'red-player',
        assistants: [],
      },
    ],
    damageEvents: [],
  } as unknown as MatchWithDetails;
}

describe('calculateStats', () => {
  it('splits 5v4 and 4v5 win rates by attack and defense', () => {
    const { mapStats } = calculateStats([buildMatch()], [], [], { homeTeamOnly: true });
    const stat = mapStats[0];

    expect(stat.opportunity5v4).toBe(2);
    expect(stat.win5v4).toBe(2);
    expect(stat.opportunity4v5).toBe(2);
    expect(stat.win4v5).toBe(0);

    expect(stat.opportunity5v4Attack).toBe(1);
    expect(stat.win5v4Attack).toBe(1);
    expect(stat.opportunity5v4Defense).toBe(1);
    expect(stat.win5v4Defense).toBe(1);
    expect(stat.opportunity4v5Attack).toBe(1);
    expect(stat.win4v5Attack).toBe(0);
    expect(stat.opportunity4v5Defense).toBe(1);
    expect(stat.win4v5Defense).toBe(0);

    expect(stat.winRate5v4Attack).toBe(100);
    expect(stat.winRate5v4Defense).toBe(100);
    expect(stat.winRate4v5Attack).toBe(0);
    expect(stat.winRate4v5Defense).toBe(0);
  });
});
