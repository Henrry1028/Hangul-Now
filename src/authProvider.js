// ============================================================
// 서버 인증 제공자 — SUPABASE_URL이 있으면 Supabase Auth, 없으면 기존 Firebase Auth
// 미들웨어와 관리자 기능은 이 모듈만 거치고, 어느 쪽인지 알 필요가 없다.
// 사용자 ID 체계가 서로 다르므로 SUPABASE_URL(인증)과 SUPABASE_DB_URL(DB)은 함께 켜고 끈다.
// ============================================================

import dotenv from "dotenv";
import { auth as firebaseAuth } from "./firebase.js";
import { pgStore } from "./dataStore.js";
import { createSupabaseTokenVerifier, discoverGoogleClientId } from "./supabaseAuth.js";

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const supabasePublishableKey = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
const verifySupabaseToken = supabaseUrl ? createSupabaseTokenVerifier({ supabaseUrl }) : null;

export const authProvider = verifySupabaseToken ? "supabase" : "firebase";
export const authAvailable = Boolean(verifySupabaseToken || firebaseAuth);

// Google OAuth 클라이언트 ID(공개 값) — 관리자 표의 Google Drive 저장이 권한 팝업을 띄울 때 쓴다.
// GOOGLE_OAUTH_CLIENT_ID로 지정할 수 있고, 없으면 Supabase의 Google 로그인 설정에서 읽어 온다.
let googleClientIdPromise = null;
function resolveGoogleClientId() {
  const configured = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  if (configured) return Promise.resolve(configured);
  if (!googleClientIdPromise) {
    googleClientIdPromise = discoverGoogleClientId({ supabaseUrl, publishableKey: supabasePublishableKey }).then((clientId) => {
      if (!clientId) googleClientIdPromise = null; // 일시적 실패일 수 있으니 다음 요청에서 다시 시도
      return clientId;
    });
  }
  return googleClientIdPromise;
}

/** 브라우저에 내려줘도 되는 공개 설정 (비밀 키는 절대 넣지 않는다) */
export async function getPublicAuthConfig() {
  if (authProvider !== "supabase") return { provider: "firebase" };
  const googleClientId = await resolveGoogleClientId();
  return { provider: "supabase", supabaseUrl, supabasePublishableKey, ...(googleClientId ? { googleClientId } : {}) };
}

console.log(`[Auth] ${authProvider}${authAvailable ? "" : " (미설정 - 모든 요청이 게스트로 처리됩니다)"}`);

/** Bearer 토큰을 검증해 { uid, email, adminClaim }을 돌려준다. 유효하지 않으면 throw */
export async function verifyAccessToken(token) {
  if (verifySupabaseToken) return verifySupabaseToken(token);
  const decoded = await firebaseAuth.verifyIdToken(token, true);
  return { uid: decoded.uid, email: decoded.email || null, adminClaim: decoded.admin === true };
}

/** 해당 ID의 계정이 실제로 있는지. 확인할 수단이 없으면 throw */
export async function authUserExists(uid) {
  if (authProvider === "supabase") {
    if (!pgStore) throw new Error("SUPABASE_DB_URL이 없어 계정을 확인할 수 없습니다.");
    return pgStore.authUserExists(uid);
  }
  if (!firebaseAuth) throw new Error("Firebase 인증을 사용할 수 없습니다.");
  try {
    await firebaseAuth.getUser(uid);
    return true;
  } catch (error) {
    if (error.code === "auth/user-not-found") return false;
    throw error;
  }
}

/** 관리자 대시보드용 계정 목록 (Firebase UserRecord 형태). 수단이 없으면 빈 배열 */
export async function listAuthUsers(max = 500) {
  if (authProvider === "supabase") return pgStore ? pgStore.listAuthUsers(max) : [];
  if (!firebaseAuth) return [];
  const users = [];
  let pageToken;
  do {
    const page = await firebaseAuth.listUsers(100, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken && users.length < max);
  return users;
}
