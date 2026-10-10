import { createFirebaseAuthClient } from './firebaseAuthClient.js';
import { createSupabaseAuthClient } from './supabaseAuthClient.js';

// 화면이 쓰는 로그인 클라이언트 하나.
// 어느 쪽을 쓸지는 서버가 정한다: index.html이 /api/auth/config.js를 앱보다 먼저 불러 window.__HN_AUTH__에 담는다.
// 값이 없으면(서버가 Firebase 모드이거나 스크립트를 못 불러온 경우) 기존 Firebase로 동작한다.
const config = typeof window !== 'undefined' ? window.__HN_AUTH__ : null;

export const authClient = config && config.provider === 'supabase' && config.supabaseUrl && config.supabasePublishableKey
  ? createSupabaseAuthClient(config)
  : createFirebaseAuthClient();
