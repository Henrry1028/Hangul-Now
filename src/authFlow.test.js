// Supabase 인증 통합 테스트 (npm run test:db) — 실제 Supabase 프로젝트를 쓴다.
// 시험용 계정을 만들어 비밀번호로 로그인해 진짜 액세스 토큰을 받고, 끝나면 계정을 지운다.
// (앱의 로그인 수단은 Google이지만, 토큰 형식과 검증 경로는 로그인 수단과 무관하게 같다.)
import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const URL_BASE = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SECRET = (process.env.SUPABASE_SECRET_KEY || "").trim();
const PUBLISHABLE = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
const DB_URL = (process.env.SUPABASE_DB_URL || "").trim();
const ready = URL_BASE && SECRET && PUBLISHABLE && DB_URL;

describe("Supabase 인증 (실제 프로젝트)", { skip: ready ? false : "SUPABASE_* 미설정" }, () => {
  const email = `hn-test-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@example.com`;
  const password = crypto.randomBytes(18).toString("base64url");
  let pool;
  let provider;
  let userId;
  let accessToken;
  let otherUserId; // 이미 있는 다른 회원(없으면 시험용 행)

  const admin = (path, init = {}) => fetch(`${URL_BASE}/auth/v1${path}`, {
    ...init, headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  // 브라우저가 하는 것과 같은 방식: 공개 키 + 사용자 토큰으로 Data API 호출
  const asUser = (path, init = {}) => fetch(`${URL_BASE}/rest/v1${path}`, {
    ...init, headers: { apikey: PUBLISHABLE, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init.headers || {}) }
  });

  before(async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = ""; // 운영 Firebase에 닿지 않게 한다
    provider = await import("./authProvider.js");
    const { createPgPool } = await import("./pgStore.js");
    pool = createPgPool(DB_URL);

    const created = await (await admin("/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: "Test Learner" } })
    })).json();
    userId = created.id;
    assert.ok(userId, "시험용 계정 생성");

    const session = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: PUBLISHABLE, "Content-Type": "application/json" }, body: JSON.stringify({ email, password })
    })).json();
    accessToken = session.access_token;
    assert.ok(accessToken, "시험용 계정 로그인");

    otherUserId = `test-other-${Date.now()}`;
    await pool.query("insert into public.profiles (user_id, nickname) values ($1, 'someone-else')", [otherUserId]);
  });

  after(async () => {
    if (userId) await admin(`/admin/users/${userId}`, { method: "DELETE" });
    await pool.query("delete from public.profiles where user_id = any($1)", [[userId, otherUserId]]);
    await pool.end();
  });

  test("서버는 Supabase 인증을 쓰도록 선택된다", () => {
    assert.equal(provider.authProvider, "supabase");
    assert.equal(provider.authAvailable, true);
  });

  test("화면에 내려주는 공개 설정에 Google 클라이언트 ID가 담기고 비밀 키는 없다", async () => {
    const config = await provider.getPublicAuthConfig();

    assert.equal(config.provider, "supabase");
    assert.equal(config.supabaseUrl, URL_BASE);
    assert.equal(config.supabasePublishableKey, PUBLISHABLE);
    assert.match(config.googleClientId, /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
    assert.ok(!JSON.stringify(config).includes(SECRET));
    assert.deepEqual(Object.keys(config).sort(), ["googleClientId", "provider", "supabasePublishableKey", "supabaseUrl"]);
  });

  test("실제 로그인 토큰을 검증해 사용자 ID와 이메일을 얻는다", async () => {
    assert.deepEqual(await provider.verifyAccessToken(accessToken), { uid: userId, email, adminClaim: false });
  });

  test("변조한 토큰은 거부한다", async () => {
    const [header, payload, signature] = accessToken.split(".");
    const forged = JSON.parse(Buffer.from(payload, "base64url").toString());
    forged.app_metadata = { ...forged.app_metadata, admin: true };
    const tampered = [header, Buffer.from(JSON.stringify(forged)).toString("base64url"), signature].join(".");
    await assert.rejects(() => provider.verifyAccessToken(tampered));
  });

  test("공개 키나 비밀 키 자체는 로그인 토큰으로 인정하지 않는다", async () => {
    await assert.rejects(() => provider.verifyAccessToken(PUBLISHABLE));
    await assert.rejects(() => provider.verifyAccessToken(SECRET));
  });

  // Express 미들웨어를 실제 토큰으로 호출한다
  const runMiddleware = async (middleware, authorization) => {
    const req = { headers: authorization === undefined ? {} : { authorization } };
    const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
  };

  test("미들웨어: 로그인 토큰이 있으면 요청에 사용자 신원을 붙이고, 없거나 틀리면 401", async () => {
    const { authenticateUser } = await import("./authMiddleware.js");

    const ok = await runMiddleware(authenticateUser, `Bearer ${accessToken}`);
    assert.equal(ok.nextCalled, true);
    assert.deepEqual(ok.req.user, { uid: userId, email, adminClaim: false });

    const missing = await runMiddleware(authenticateUser, undefined);
    assert.equal(missing.nextCalled, false);
    assert.equal(missing.res.statusCode, 401);

    const invalid = await runMiddleware(authenticateUser, `Bearer ${accessToken.slice(0, -4)}AAAA`);
    assert.equal(invalid.nextCalled, false);
    assert.equal(invalid.res.statusCode, 401);
  });

  test("미들웨어: 게스트 허용 경로는 토큰이 없거나 틀려도 게스트로 통과시킨다", async () => {
    const { identifyUser } = await import("./authMiddleware.js");

    assert.equal((await runMiddleware(identifyUser, `Bearer ${accessToken}`)).req.user.uid, userId);
    const guest = await runMiddleware(identifyUser, undefined);
    assert.equal(guest.nextCalled, true);
    assert.equal(guest.req.user, null);
    assert.equal((await runMiddleware(identifyUser, "Bearer garbage")).req.user, null);
  });

  test("미들웨어: 관리자 전용 경로는 일반 회원을 403으로 막는다", async () => {
    const { requireAdmin } = await import("./authMiddleware.js");

    const result = await runMiddleware(requireAdmin, `Bearer ${accessToken}`);

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
  });

  test("계정 존재 확인: 있는 ID만 true", async () => {
    assert.equal(await provider.authUserExists(userId), true);
    assert.equal(await provider.authUserExists(crypto.randomUUID()), false);
    assert.equal(await provider.authUserExists("firebase-style-uid-not-a-uuid"), false);
  });

  test("관리자 화면용 계정 목록에 이름·가입일·로그인 수단이 담긴다", async () => {
    const users = await provider.listAuthUsers(500);
    const mine = users.find((user) => user.uid === userId);

    assert.ok(mine, "방금 만든 계정이 목록에 있다");
    assert.equal(mine.email, email);
    assert.equal(mine.displayName, "Test Learner");
    assert.equal(mine.providerData[0].providerId, "password");
    assert.ok(!Number.isNaN(new Date(mine.metadata.creationTime).getTime()));
    assert.ok(!Number.isNaN(new Date(mine.metadata.lastSignInTime).getTime()), "방금 로그인했으므로 마지막 로그인 시각이 있다");
  });

  test("프로필: 본인 행은 만들고 고치고 읽을 수 있다", async () => {
    const upsert = await asUser("/profiles?on_conflict=user_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: userId, nickname: "tester", interests: ["food"], onboarded: true })
    });
    assert.equal(upsert.status, 201);

    const update = await asUser(`/profiles?user_id=eq.${userId}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ selected_tutor_id: "minho" })
    });
    assert.equal(update.status, 200);

    const rows = await (await asUser("/profiles?select=user_id,nickname,interests,onboarded,selected_tutor_id")).json();
    assert.deepEqual(rows, [{ user_id: userId, nickname: "tester", interests: ["food"], onboarded: true, selected_tutor_id: "minho" }],
      "다른 회원의 프로필은 보이지 않고 본인 것만 보인다");
  });

  test("프로필: 다른 회원의 행은 고치거나 만들 수 없다", async () => {
    const update = await asUser(`/profiles?user_id=eq.${otherUserId}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ nickname: "hacked" })
    });
    assert.deepEqual(await update.json(), [], "수정된 행이 없다");
    const { rows } = await pool.query("select nickname from public.profiles where user_id = $1", [otherUserId]);
    assert.equal(rows[0].nickname, "someone-else");

    const insert = await asUser("/profiles", { method: "POST", body: JSON.stringify({ user_id: `test-forged-${Date.now()}`, nickname: "forged" }) });
    assert.equal(insert.status, 403);
  });

  test("프로필 외의 테이블은 로그인 사용자도 직접 읽거나 쓸 수 없다", async () => {
    for (const table of ["learned", "sessions", "tutor_memory", "chat_messages", "mistake_notes"]) {
      const rows = await (await asUser(`/${table}?select=*&limit=5`)).json();
      assert.deepEqual(rows, [], `${table} 읽기`);
    }
    const write = await asUser("/learned", { method: "POST", body: JSON.stringify({ user_id: userId, type: "word", items: {} }) });
    assert.equal(write.status, 403);
  });
});
