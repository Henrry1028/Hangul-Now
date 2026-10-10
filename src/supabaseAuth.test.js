import test, { before } from "node:test";
import assert from "node:assert/strict";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createSupabaseTokenVerifier, discoverGoogleClientId } from "./supabaseAuth.js";

const SUPABASE_URL = "https://project.supabase.co";
const USER_ID = "11111111-2222-3333-4444-555555555555";

let signingKey;
let otherKey;
let verify;

// 실제 서명·검증을 쓴다: 시험용 키 쌍을 만들고, 그 공개키만 아는 검증기를 만든다
before(async () => {
  const pair = await generateKeyPair("ES256");
  signingKey = pair.privateKey;
  otherKey = (await generateKeyPair("ES256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "ES256", use: "sig" };
  verify = createSupabaseTokenVerifier({ supabaseUrl: SUPABASE_URL, keySet: createLocalJWKSet({ keys: [jwk] }) });
});

function token(claims = {}, { key = signingKey, issuer = `${SUPABASE_URL}/auth/v1`, audience = "authenticated", expiresIn = "1h", subject = USER_ID } = {}) {
  let jwt = new SignJWT({ role: "authenticated", email: "learner@example.com", app_metadata: {}, user_metadata: {}, ...claims })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn);
  if (subject) jwt = jwt.setSubject(subject);
  return jwt.sign(key);
}

test("유효한 토큰이면 사용자 ID와 이메일을 돌려준다", async () => {
  assert.deepEqual(await verify(await token()), { uid: USER_ID, email: "learner@example.com", adminClaim: false });
});

test("관리자 표시는 app_metadata.admin만 인정한다", async () => {
  assert.equal((await verify(await token({ app_metadata: { admin: true } }))).adminClaim, true);
  assert.equal((await verify(await token({ app_metadata: { admin: "true" } }))).adminClaim, false);
});

test("사용자가 스스로 바꿀 수 있는 user_metadata.admin은 관리자로 인정하지 않는다", async () => {
  assert.equal((await verify(await token({ user_metadata: { admin: true } }))).adminClaim, false);
});

test("이메일이 없는 토큰은 email이 null이다", async () => {
  assert.equal((await verify(await token({ email: undefined }))).email, null);
});

test("다른 키로 서명한 토큰은 거부한다", async () => {
  await assert.rejects(async () => verify(await token({}, { key: otherKey })));
});

test("만료된 토큰은 거부한다", async () => {
  await assert.rejects(async () => verify(await token({}, { expiresIn: "-1m" })));
});

test("다른 Supabase 프로젝트가 발급한 토큰은 거부한다", async () => {
  await assert.rejects(async () => verify(await token({}, { issuer: "https://other.supabase.co/auth/v1" })));
});

test("로그인 사용자용이 아닌 토큰(audience 불일치)은 거부한다", async () => {
  await assert.rejects(async () => verify(await token({}, { audience: "anon" })));
});

test("사용자 ID(sub)가 없는 토큰은 거부한다", async () => {
  await assert.rejects(async () => verify(await token({}, { subject: null })));
});

test("익명 로그인 토큰은 거부한다", async () => {
  await assert.rejects(async () => verify(await token({ is_anonymous: true })));
});

test("형식이 아닌 문자열은 거부한다", async () => {
  await assert.rejects(() => verify("not-a-token"));
});

// Supabase의 Google 로그인 시작 응답(302) 대역
const authorizeResponse = (status, location) => async (url, init) => {
  authorizeResponse.lastCall = { url, init };
  return { status, headers: { get: (name) => (name.toLowerCase() === "location" ? location : null) } };
};

test("discoverGoogleClientId: Supabase가 Google로 넘기는 주소에서 클라이언트 ID를 읽는다", async () => {
  const location = "https://accounts.google.com/o/oauth2/v2/auth?client_id=1234567890-abc123def.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fproject.supabase.co%2Fauth%2Fv1%2Fcallback&scope=email+profile";

  const id = await discoverGoogleClientId({ supabaseUrl: `${SUPABASE_URL}/`, publishableKey: "sb_publishable_x", fetchImpl: authorizeResponse(302, location) });

  assert.equal(id, "1234567890-abc123def.apps.googleusercontent.com");
  assert.equal(authorizeResponse.lastCall.url, `${SUPABASE_URL}/auth/v1/authorize?provider=google`);
  assert.equal(authorizeResponse.lastCall.init.redirect, "manual", "Google로 실제 이동하지 않는다");
  assert.equal(authorizeResponse.lastCall.init.headers.apikey, "sb_publishable_x");
});

test("discoverGoogleClientId: Google 로그인이 꺼져 있거나 응답이 예상과 다르면 null", async () => {
  const args = { supabaseUrl: SUPABASE_URL, publishableKey: "sb_publishable_x" };
  assert.equal(await discoverGoogleClientId({ ...args, fetchImpl: authorizeResponse(400, null) }), null);
  assert.equal(await discoverGoogleClientId({ ...args, fetchImpl: authorizeResponse(302, "https://evil.example/auth?client_id=1-a.apps.googleusercontent.com") }), null);
  assert.equal(await discoverGoogleClientId({ ...args, fetchImpl: authorizeResponse(302, "https://accounts.google.com/o/oauth2/v2/auth?client_id=not-a-google-client") }), null);
  assert.equal(await discoverGoogleClientId({ ...args, fetchImpl: async () => { throw new Error("network down"); } }), null);
});
