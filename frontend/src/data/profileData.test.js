import { describe, expect, it } from 'vitest';
import { INTEREST_MAX, INTERESTS, NATIONALITIES, profileInterests, profileStorageKey, sanitizeProfile } from './profileData.js';

describe('profileData', () => {
  it('keeps the legacy localStorage key format (changing it loses existing profiles)', () => {
    expect(profileStorageKey('abc')).toBe('hn-profile-abc');
  });

  it('sanitizes a stored profile and drops unknown interests', () => {
    expect(sanitizeProfile({ nickname: 'Emma', interests: ['kpop', 'nope', 'food'], onboarded: 1 })).toEqual({
      nickname: 'Emma', nationality: '', gender: '', interests: ['kpop', 'food'], onboarded: true
    });
    expect(sanitizeProfile()).toEqual({ nickname: '', nationality: '', gender: '', interests: [], onboarded: false });
  });

  it('maps interest ids to interest objects in order', () => {
    expect(profileInterests({ interests: ['travel', 'kpop'] }).map((i) => i.id)).toEqual(['travel', 'kpop']);
    expect(profileInterests(null)).toEqual([]);
  });

  it('keeps the onboarding catalogues intact', () => {
    expect(INTEREST_MAX).toBe(5);
    expect(INTERESTS).toHaveLength(12);
    expect(NATIONALITIES).toHaveLength(32);
  });

  it('no longer exposes a client-side admin heuristic', async () => {
    const mod = await import('./profileData.js');
    expect(mod.isAdminEmail).toBeUndefined();
  });
});
