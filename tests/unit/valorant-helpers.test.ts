import { describe, expect, it } from 'vitest';
import { getAgentName, getArmorData, getMapDisplayName, getTagColor, getWeaponData } from '../../src/lib/utils';

describe('valorant helpers', () => {
  it('resolves known Valorant data', () => {
    expect(getMapDisplayName('/Game/Maps/Pitt/Pitt')).toBe('Pearl');
    expect(getMapDisplayName('/Game/Maps/Rook/Rook')).toBe('Corrode');
    expect(getAgentName('add6443a-41bd-e414-f6ad-e58d267f4e95')).toBe('Jett');
    expect(getWeaponData('9C82E19D-4575-0200-1A81-3EACF00CF872')).toEqual({
      name: 'Vandal',
      icon: '/weapons/vandal.png',
      killStreamIcon: '/weapons/vandal.png',
    });
    expect(getArmorData('4dec83d5-4902-9ab3-bed6-a7a390761157')).toEqual({
      name: 'Light Armor',
      value: 25,
      icon: '/armor/light_armor.png',
    });
    expect(getTagColor('any-tag')).toBe('#374151');
  });

  it('falls back cleanly for unknown values', () => {
    expect(getMapDisplayName('/Game/Maps/Unknown/Unknown')).toBe('unknown');
    expect(getAgentName(null)).toBe('Unknown');
    expect(getWeaponData(null)).toEqual({
      name: 'Unknown',
      icon: '',
      killStreamIcon: '',
    });
    expect(getArmorData(null)).toBeNull();
  });
});
