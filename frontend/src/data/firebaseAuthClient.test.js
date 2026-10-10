import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFirebaseAuthClient } from './firebaseAuthClient.js';

// Firebase compat SDK 대역 — 인증 상태 변화를 직접 쏘고 Firestore로 나가는 쓰기를 기록한다
function installFirebase({ currentUser = null, userDoc = null, signInWithPopup } = {}) {
  const writes = [];
  const state = { listener: null, redirects: 0, signOuts: 0, initialized: 0 };
  function GoogleAuthProvider() { this.setCustomParameters = vi.fn(); }
  const authInstance = {
    currentUser,
    onAuthStateChanged(listener) { state.listener = listener; return () => { state.listener = null; }; },
    signInWithPopup: signInWithPopup || (async () => {}),
    signInWithRedirect: () => { state.redirects += 1; },
    signOut: async () => { state.signOuts += 1; }
  };
  const auth = () => authInstance;
  auth.GoogleAuthProvider = GoogleAuthProvider;
  const firestore = () => ({
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({ exists: userDoc !== null, data: () => userDoc }),
        set: async (data, options) => { writes.push({ path: `${name}/${id}`, data, options }); }
      })
    })
  });
  firestore.FieldValue = { serverTimestamp: () => 'SERVER_TIME' };
  window.firebase = { apps: [], initializeApp: () => { state.initialized += 1; }, auth, firestore };
  return { writes, state };
}

afterEach(() => { delete window.firebase; });

describe('Firebase auth client', () => {
  it('reports itself unavailable and stays silent when the SDK has not loaded', async () => {
    const client = createFirebaseAuthClient();

    expect(client.available()).toBe(false);
    expect(client.subscribe(() => {})).toBeUndefined();
    expect(client.currentUser()).toBeNull();
    expect(await client.getToken()).toBeNull();
    expect(await client.loadProfile('u1')).toEqual({});
    await expect(client.saveTutor('u1', 'jiwoo')).resolves.toBeUndefined();
  });

  it('initializes the app once and tells subscribers who signed in, using the app user shape', () => {
    const { state } = installFirebase();
    const seen = [];
    const unsubscribe = createFirebaseAuthClient().subscribe((user) => seen.push(user));

    state.listener({ uid: 'u1', email: 'learner@example.com', displayName: 'Learner Kim', photoURL: null });
    state.listener(null);

    expect(state.initialized).toBe(1);
    expect(seen).toEqual([{ uid: 'u1', email: 'learner@example.com', displayName: 'Learner Kim', photoURL: '' }, null]);
    unsubscribe();
    expect(state.listener).toBeNull();
  });

  it('returns the signed-in user ID token', async () => {
    installFirebase({ currentUser: { getIdToken: async () => 'tok123' } });
    const client = createFirebaseAuthClient();

    expect(await client.getToken()).toBe('tok123');
    expect(await client.currentUser().getIdToken()).toBe('tok123');
  });

  it('falls back to a redirect when the sign-in popup is blocked, and reports other failures', async () => {
    const blocked = installFirebase({ signInWithPopup: async () => { throw Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' }); } });
    await createFirebaseAuthClient().signInWithGoogle();
    expect(blocked.state.redirects).toBe(1);

    installFirebase({ signInWithPopup: async () => { throw Object.assign(new Error('network'), { code: 'auth/network-request-failed' }); } });
    await expect(createFirebaseAuthClient().signInWithGoogle()).rejects.toMatchObject({ code: 'auth/network-request-failed' });
  });

  it('loads the stored profile document, or an empty profile when there is none', async () => {
    installFirebase({ userDoc: { nickname: 'Kim', onboarded: true, selectedTutorId: 'minho' } });
    expect(await createFirebaseAuthClient().loadProfile('u1')).toEqual({ nickname: 'Kim', onboarded: true, selectedTutorId: 'minho' });

    installFirebase({ userDoc: null });
    expect(await createFirebaseAuthClient().loadProfile('u1')).toEqual({});
  });

  it('writes login, onboarding profile and tutor changes as merges into users/{uid}', async () => {
    const { writes } = installFirebase();
    const client = createFirebaseAuthClient();

    await client.recordLogin({ uid: 'u1', email: 'learner@example.com', displayName: '', photoURL: '' }, 'jiwoo');
    await client.saveProfile('u1', { nickname: 'Kim', interests: ['food'], onboarded: true });
    await client.saveTutor('u1', 'minho');

    expect(writes).toEqual([
      { path: 'users/u1', options: { merge: true }, data: { uid: 'u1', email: 'learner@example.com', displayName: '', photoURL: '', selectedTutorId: 'jiwoo', lastLoginAt: 'SERVER_TIME' } },
      { path: 'users/u1', options: { merge: true }, data: { nickname: 'Kim', interests: ['food'], onboarded: true, onboardedAt: 'SERVER_TIME', updatedAt: 'SERVER_TIME' } },
      { path: 'users/u1', options: { merge: true }, data: { selectedTutorId: 'minho', updatedAt: 'SERVER_TIME' } }
    ]);
  });
});
