// ============================================================
// Supabase Auth 액세스 토큰 검증
// - 프로젝트의 공개키(JWKS)로 서명을 서버에서 직접 검증한다 (요청마다 Supabase를 호출하지 않는다).
// - 반환 형태는 Firebase 검증 결과와 같은 { uid, email, adminClaim } 이다.
// - 토큰은 만료(기본 1시간)까지 유효하다. Firebase와 달리 폐기 여부는 확인하지 않는다.
// ============================================================

import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * 이 Supabase 프로젝트의 Google 로그인에 설정된 OAuth 클라이언트 ID(공개 값)를 알아낸다.
 * Supabase의 로그인 시작 주소가 Google로 넘기는 302 응답에서 읽으며, 실제로 Google로 이동하지는 않는다.
 * Google 로그인이 꺼져 있거나 알아낼 수 없으면 null.
 */
export async function discoverGoogleClientId({ supabaseUrl, publishableKey, fetchImpl = fetch }) {
  const base = String(supabaseUrl).trim().replace(/\/+$/, "");
  try {
    const response = await fetchImpl(`${base}/auth/v1/authorize?provider=google`, {
      redirect: "manual",
      headers: { apikey: publishableKey },
      signal: AbortSignal.timeout(5000)
    });
    const location = response.headers.get("location") || "";
    if (!location.startsWith("https://accounts.google.com/")) return null;
    const clientId = new URL(location).searchParams.get("client_id") || "";
    return /^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId) ? clientId : null;
  } catch {
    return null;
  }
}

export function createSupabaseTokenVerifier({ supabaseUrl, keySet }) {
  const base = String(supabaseUrl).trim().replace(/\/+$/, "");
  const issuer = `${base}/auth/v1`;
  const keys = keySet || createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return async function verifySupabaseToken(token) {
    const { payload } = await jwtVerify(token, keys, { issuer, audience: "authenticated" });
    if (!payload.sub) throw new Error("토큰에 사용자 ID가 없습니다.");
    if (payload.is_anonymous === true) throw new Error("익명 로그인 토큰은 허용하지 않습니다.");
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" && payload.email ? payload.email : null,
      // user_metadata는 사용자가 직접 바꿀 수 있으므로 권한 판정에 쓰지 않는다
      adminClaim: payload.app_metadata?.admin === true
    };
  };
}
