import { createClient } from '@supabase/supabase-js';

// Supabase Auth + profiles 테이블을 쓰는 로그인 클라이언트.
// firebaseAuthClient.js와 같은 인터페이스를 제공해 화면 코드는 어느 쪽인지 몰라도 된다.

const nowIso = () => new Date().toISOString();

const toUser = (user) => (user ? {
  uid: user.id,
  email: user.email || '',
  displayName: user.user_metadata?.full_name || user.user_metadata?.name || '',
  photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
} : null);

// profiles 행 → 앱이 쓰는 프로필 필드 이름
const profileFromRow = (row) => ({
  nickname: row.nickname || '',
  nationality: row.nationality || '',
  nationalityName: row.nationality_name || '',
  nativeLanguage: row.native_language || '',
  gender: row.gender || '',
  interests: Array.isArray(row.interests) ? row.interests : [],
  onboarded: row.onboarded === true,
  selectedTutorId: row.selected_tutor_id || ''
});

export function createSupabaseAuthClient({ supabaseUrl, supabasePublishableKey, client } = {}) {
  const supabase = client || createClient(supabaseUrl, supabasePublishableKey, { auth: { flowType: 'pkce' } });
  let session = null;
  supabase.auth.onAuthStateChange((_event, nextSession) => { session = nextSession; });

  const upsertProfile = async (row) => {
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
  };

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  return {
    provider: 'supabase',
    available: () => true,

    // 로그인·로그아웃으로 사용자가 바뀔 때만 알린다.
    // supabase-js는 토큰 갱신(약 1시간마다)과 탭 복귀 때도 이벤트를 내는데, 그때마다 프로필을 다시 불러오면
    // 작성 중이던 온보딩 입력이 초기화된다.
    subscribe(callback) {
      let lastUid; // undefined = 아직 한 번도 알리지 않음
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        const uid = nextSession?.user?.id || null;
        if (uid === lastUid) return;
        lastUid = uid;
        // 이 콜백 안에서 다른 supabase 호출을 기다리면 멈출 수 있어 다음 틱으로 넘긴다
        setTimeout(() => callback(toUser(nextSession?.user)), 0);
      });
      return () => data.subscription.unsubscribe();
    },

    currentUser: () => (session?.user ? { uid: session.user.id, email: session.user.email || '', getIdToken: getToken } : null),
    getToken,

    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } }
      });
      if (error) throw error;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    async loadProfile(uid) {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle();
      if (error) throw error;
      return data ? profileFromRow(data) : {};
    },

    // 계정에 이름·사진이 없으면 그 열은 건드리지 않는다 (저장돼 있던 값을 빈 값으로 덮지 않도록)
    recordLogin(user, selectedTutorId) {
      return upsertProfile({
        user_id: user.uid,
        email: user.email,
        selected_tutor_id: selectedTutorId,
        last_login_at: nowIso(),
        ...(user.displayName ? { display_name: user.displayName } : {}),
        ...(user.photoURL ? { photo_url: user.photoURL } : {})
      });
    },

    saveProfile(uid, profile) {
      const now = nowIso();
      return upsertProfile({
        user_id: uid,
        nickname: profile.nickname,
        nationality: profile.nationality,
        nationality_name: profile.nationalityName,
        native_language: profile.nativeLanguage,
        gender: profile.gender,
        interests: profile.interests,
        onboarded: profile.onboarded,
        onboarded_at: now,
        updated_at: now
      });
    },

    saveTutor(uid, tutorId) {
      return upsertProfile({ user_id: uid, selected_tutor_id: tutorId, updated_at: nowIso() });
    }
  };
}
