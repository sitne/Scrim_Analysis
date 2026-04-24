import { describe, expect, it } from 'vitest';
import { calculateACS, calculateHS, calculateKD } from '../../src/lib/stats';

describe('stat helpers', () => {
  it('calculates ACS and KD', () => {
    expect(calculateACS(300, 15)).toBe(20);
    expect(calculateKD(10, 4)).toBe('2.50');
    expect(calculateKD(10, 0)).toBe('10.00');
  });

  it('calculates headshot percentage', () => {
    const match = {
      damageEvents: [
        {
          attackerId: 'player-1',
          weapon: '9c82e19d-4575-0200-1a81-3eacf00cf872',
          legshots: 1,
          bodyshots: 1,
          headshots: 2,
        },
        {
          attackerId: 'player-1',
          weapon: '9c82e19d-4575-0200-1a81-3eacf00cf872',
          legshots: 0,
          bodyshots: 0,
          headshots: 0,
        },
        {
          attackerId: 'player-2',
          weapon: '9c82e19d-4575-0200-1a81-3eacf00cf872',
          legshots: 4,
          bodyshots: 0,
          headshots: 0,
        },
      ],
    };

    expect(calculateHS(match as unknown as Parameters<typeof calculateHS>[0], 'player-1')).toBe(50);
  });
});
