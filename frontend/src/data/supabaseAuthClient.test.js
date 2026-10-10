import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAuthClient } from './supabaseAuthClient.js';

// supabase-js 대역 — 인증 이벤트를 직접 쏘고, 프로필 테이블로 나가는 요청을 기록한다
function fakeSupabase({ profileRow = null } = {}) {
  const listeners = new Set();
  const calls = { upserts: [], oauth: [], signOut: 0, selects: [] };
  let session = null;
  return {
    calls,
    emit(event, nextSession) { session = nextSession; listeners.forEach((listener) => listener(event, nextSession)); },
    auth: {
      onAuthStateChange(listener) {
        listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
      },
      getSession: async () => ({ data: { session }, error: null }),
      signInWithOAuth: async (options) => { calls.oauth.push(options); return { data: {}, error: null }; },
      signOut: async () => { calls.signOut += 1; return { error: null }; }
    },
    from(table) {
      return {
        select: (columns) => ({
          eq: (column, value) => ({
            maybeSingle: async () => { calls.selects.push({ table, columns, column, value }); return { data: profileRow, error: null }; }
          })
        }),
        upsert: async (row, options) => { calls.upserts.push({ table, row, options }); return { error: null }; }
      };
    }
  };
}

const sessionFor = (id, metadata = { full_name: 'Learner Kim', avatar_url: 'https://img.example/p.png' }) => ({
  access_token: `token-${id}`,
  user: { id, email: 'learner@example.com', user_metadata: metadata }
});

describe('Supabase auth client', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T03:00:00.000Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('tells subscribers who signed in, using the app user shape', () => {
    const supabase = fakeSupabase();
    const seen = [];
    createSupabaseAuthClient({ client: supabase }).subscribe((user) => seen.push(user));

    supabase.emit('INITIAL_SESSION', null);
    supabase.emit('SIGNED_IN', sessionFor('u1'));
    supabase.emit('SIGNED_OUT', null);
    vi.runAllTimers();

    expect(seen).toEqual([
      null,
      { uid: 'u1', email: 'learner@example.com', displayName: 'Learner Kim', photoURL: 'https://img.example/p.png' },
      null
    ]);
  });

  it('does not re-announce the same user on token refresh or tab refocus', () => {
    const supabase = fakeSupabase();
    const seen = [];
    createSupabaseAuthClient({ client: supabase }).subscribe((user) => seen.push(user?.uid ?? null));

    supabase.emit('INITIAL_SESSION', sessionFor('u1'));
    supabase.emit('SIGNED_IN', sessionFor('u1'));
    supabase.emit('TOKEN_REFRESHED', sessionFor('u1'));
    vi.runAllTimers();

    expect(seen).toEqual(['u1']);
  });

  it('stops notifying after unsubscribe', () => {
    const supabase = fakeSupabase();
    const seen = [];
    const unsubscribe = createSupabaseAuthClient({ client: supabase }).subscribe((user) => seen.push(user));

    unsubscribe();
    supabase.emit('SIGNED_IN', sessionFor('u1'));
    vi.runAllTimers();

    expect(seen).toEqual([]);
  });

  it('returns the current access token, or null for guests', async () => {
    const supabase = fakeSupabase();
    const client = createSupabaseAuthClient({ client: supabase });

    expect(await client.getToken()).toBeNull();
    expect(client.currentUser()).toBeNull();

    supabase.emit('SIGNED_IN', sessionFor('u1'));
    expect(await client.getToken()).toBe('token-u1');
    expect(await client.currentUser().getIdToken()).toBe('token-u1');
    expect(client.currentUser()).toMatchObject({ uid: 'u1', email: 'learner@example.com' });
  });

  it('starts Google sign-in as a redirect back to this site with the account chooser', async () => {
    const supabase = fakeSupabase();

    await createSupabaseAuthClient({ client: supabase }).signInWithGoogle();

    expect(supabase.calls.oauth).toEqual([{
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } }
    }]);
  });

  it('loads the profile row in the field names the app uses', async () => {
    const supabase = fakeSupabase({
      profileRow: {
        user_id: 'u1', nickname: 'Kim', nationality: 'US', nationality_name: 'United States', native_language: 'English',
        gender: 'female', interests: ['kdrama', 'food'], onboarded: true, selected_tutor_id: 'minho', display_name: 'Learner Kim'
      }
    });

    const profile = await createSupabaseAuthClient({ client: supabase }).loadProfile('u1');

    expect(profile).toEqual({
      nickname: 'Kim', nationality: 'US', nationalityName: 'United States', nativeLanguage: 'English',
      gender: 'female', interests: ['kdrama', 'food'], onboarded: true, selectedTutorId: 'minho'
    });
    expect(supabase.calls.selects).toEqual([{ table: 'profiles', columns: '*', column: 'user_id', value: 'u1' }]);
  });

  it('returns an empty profile for a user with no row yet', async () => {
    expect(await createSupabaseAuthClient({ client: fakeSupabase() }).loadProfile('new-user')).toEqual({});
  });

  it('records a login without wiping the stored name or photo when the account has none', async () => {
    const supabase = fakeSupabase();
    const client = createSupabaseAuthClient({ client: supabase });

    await client.recordLogin({ uid: 'u1', email: 'learner@example.com', displayName: '', photoURL: '' }, 'jiwoo');
    await client.recordLogin({ uid: 'u1', email: 'learner@example.com', displayName: 'Learner Kim', photoURL: 'https://img.example/p.png' }, 'minho');

    expect(supabase.calls.upserts).toEqual([
      { table: 'profiles', options: { onConflict: 'user_id' }, row: { user_id: 'u1', email: 'learner@example.com', selected_tutor_id: 'jiwoo', last_login_at: '2026-10-10T03:00:00.000Z' } },
      { table: 'profiles', options: { onConflict: 'user_id' }, row: { user_id: 'u1', email: 'learner@example.com', selected_tutor_id: 'minho', last_login_at: '2026-10-10T03:00:00.000Z', display_name: 'Learner Kim', photo_url: 'https://img.example/p.png' } }
    ]);
  });

  it('saves the onboarding profile to the profile columns', async () => {
    const supabase = fakeSupabase();

    await createSupabaseAuthClient({ client: supabase }).saveProfile('u1', {
      nickname: 'Kim', nationality: 'US', nationalityName: 'United States', nativeLanguage: 'English',
      gender: 'female', interests: ['kdrama'], onboarded: true
    });

    expect(supabase.calls.upserts).toEqual([{
      table: 'profiles', options: { onConflict: 'user_id' },
      row: {
        user_id: 'u1', nickname: 'Kim', nationality: 'US', nationality_name: 'United States', native_language: 'English',
        gender: 'female', interests: ['kdrama'], onboarded: true,
        onboarded_at: '2026-10-10T03:00:00.000Z', updated_at: '2026-10-10T03:00:00.000Z'
      }
    }]);
  });

  it('saves a tutor change on its own', async () => {
    const supabase = fakeSupabase();

    await createSupabaseAuthClient({ client: supabase }).saveTutor('u1', 'seoyeon');

    expect(supabase.calls.upserts).toEqual([{
      table: 'profiles', options: { onConflict: 'user_id' },
      row: { user_id: 'u1', selected_tutor_id: 'seoyeon', updated_at: '2026-10-10T03:00:00.000Z' }
    }]);
  });

  it('surfaces a failed profile save as an error so the caller can warn the user', async () => {
    const supabase = fakeSupabase();
    supabase.from = () => ({ upsert: async () => ({ error: new Error('row-level security') }) });

    await expect(createSupabaseAuthClient({ client: supabase }).saveTutor('u1', 'jiwoo')).rejects.toThrow('row-level security');
  });
});
