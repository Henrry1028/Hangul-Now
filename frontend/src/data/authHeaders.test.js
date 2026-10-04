import { afterEach, describe, expect, it } from 'vitest';
import { authHeaders } from './authHeaders.js';

afterEach(() => { delete window.firebase; });

const firebaseWith = (currentUser) => ({ auth: () => ({ currentUser }) });

describe('authHeaders', () => {
  it('returns no header for guests or when the SDK is missing', async () => {
    expect(await authHeaders()).toEqual({});
    window.firebase = firebaseWith(null);
    expect(await authHeaders()).toEqual({});
  });

  it('attaches the Firebase ID token for signed-in users', async () => {
    window.firebase = firebaseWith({ getIdToken: async () => 'tok123' });
    expect(await authHeaders()).toEqual({ Authorization: 'Bearer tok123' });
  });

  it('falls back to guest when the token cannot be obtained', async () => {
    window.firebase = firebaseWith({ getIdToken: async () => { throw new Error('offline'); } });
    expect(await authHeaders()).toEqual({});
  });
});
