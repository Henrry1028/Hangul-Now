import test from "node:test";
import assert from "node:assert/strict";
import {
  R2_MAX_SIGNED_URL_SECONDS,
  createFirebaseStore,
  createObjectStore,
  createR2Store,
  readR2Config,
  refreshFileUrls
} from "./objectStore.js";

const R2_ENV = {
  R2_ACCOUNT_ID: "acct123",
  R2_ACCESS_KEY_ID: "AKIAEXAMPLE",
  R2_SECRET_ACCESS_KEY: "secret-example",
  R2_BUCKET: "hn-files"
};
const NOW = Date.parse("2026-10-10T00:00:00Z");
const HOUR = 60 * 60 * 1000;

// Firebase Storage 버킷 대역 — save/getSignedUrl에 넘어온 인자만 기록한다
function fakeFirebaseStorage() {
  const calls = [];
  const storage = {
    bucket: () => ({
      file: (key) => ({
        save: async (body, options) => { calls.push({ op: "save", key, body, options }); },
        getSignedUrl: async (options) => {
          calls.push({ op: "sign", key, options });
          return [`https://firebase.example/${key}`];
        }
      })
    })
  };
  return { storage, calls };
}

test("readR2Config: 네 값이 모두 있으면 계정 엔드포인트를 포함한 설정을 돌려준다", () => {
  assert.deepEqual(readR2Config(R2_ENV), {
    accountId: "acct123",
    accessKeyId: "AKIAEXAMPLE",
    secretAccessKey: "secret-example",
    bucket: "hn-files",
    endpoint: "https://acct123.r2.cloudflarestorage.com"
  });
});

test("readR2Config: 값이 하나라도 비면 null", () => {
  for (const missing of Object.keys(R2_ENV)) {
    assert.equal(readR2Config({ ...R2_ENV, [missing]: "  " }), null, `${missing} 누락`);
  }
  assert.equal(readR2Config({}), null);
});

test("readR2Config: 버킷 이름은 R2_BUCKET_NAME으로 넣어도 인식하고, 둘 다 있으면 R2_BUCKET이 우선한다", () => {
  const { R2_BUCKET, ...withoutBucket } = R2_ENV;
  assert.equal(readR2Config({ ...withoutBucket, R2_BUCKET_NAME: "named-bucket" }).bucket, "named-bucket");
  assert.equal(readR2Config({ ...withoutBucket, R2_BUCKET: "", R2_BUCKET_NAME: "named-bucket" }).bucket, "named-bucket");
  assert.equal(readR2Config({ ...R2_ENV, R2_BUCKET_NAME: "named-bucket" }).bucket, R2_BUCKET);
});

test("createObjectStore: R2 설정이 있으면 Firebase Storage가 있어도 R2를 쓴다", () => {
  const store = createObjectStore({ env: R2_ENV, firebaseStorage: fakeFirebaseStorage().storage });
  assert.equal(store.backend, "r2");
});

test("createObjectStore: R2 설정이 없으면 Firebase Storage로 동작한다", () => {
  const store = createObjectStore({ env: {}, firebaseStorage: fakeFirebaseStorage().storage });
  assert.equal(store.backend, "firebase-storage");
});

test("createObjectStore: 둘 다 없으면 null (호출부가 로컬 대체 경로를 쓴다)", () => {
  assert.equal(createObjectStore({ env: {}, firebaseStorage: null }), null);
});

test("R2 put: 버킷·키·본문·콘텐츠 유형·캐시 정책을 그대로 올린다", async () => {
  const sent = [];
  const store = createR2Store(readR2Config(R2_ENV), { client: { send: async (command) => { sent.push(command); return {}; } } });
  const body = Buffer.from("pdf-bytes");

  await store.put("users/u1/sessions/s1.pdf", body, {
    contentType: "application/pdf",
    cacheControl: "private,max-age=3600",
    metadata: { sessionId: "s1" }
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].constructor.name, "PutObjectCommand");
  assert.deepEqual(sent[0].input, {
    Bucket: "hn-files",
    Key: "users/u1/sessions/s1.pdf",
    Body: body,
    ContentType: "application/pdf",
    CacheControl: "private,max-age=3600",
    Metadata: { sessionId: "s1" }
  });
});

test("R2 put: 한글 메타데이터는 HTTP 헤더에 실을 수 있게 인코딩해서 올린다", async () => {
  const sent = [];
  const store = createR2Store(readR2Config(R2_ENV), { client: { send: async (command) => { sent.push(command); return {}; } } });

  await store.put("users/u1/sessions/s1.pdf", Buffer.from("pdf"), {
    contentType: "application/pdf",
    metadata: { sessionId: "s1", scenario: "", level: "초급" }
  });

  assert.deepEqual(sent[0].input.Metadata, { sessionId: "s1", scenario: "", level: "%EC%B4%88%EA%B8%89" });
});

test("R2 signedReadUrl: 요청한 만료 시각까지 유효한 R2 서명 URL을 만든다", async () => {
  const store = createR2Store(readR2Config(R2_ENV), { now: () => NOW });

  const url = new URL(await store.signedReadUrl("audio-reviews/u1/s1.wav", { expiresAt: NOW + HOUR }));

  assert.match(url.host, /acct123\.r2\.cloudflarestorage\.com$/);
  assert.ok(`${url.host}${url.pathname}`.includes("hn-files"), "버킷 이름이 URL에 들어가야 한다");
  assert.ok(url.pathname.endsWith("/audio-reviews/u1/s1.wav"));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
  assert.ok(url.searchParams.get("X-Amz-Signature"));
});

test("R2 signedReadUrl: 7일을 넘는 만료는 R2 한도인 7일로 줄인다", async () => {
  const store = createR2Store(readR2Config(R2_ENV), { now: () => NOW });

  const url = new URL(await store.signedReadUrl("users/u1/sessions/s1.pdf", { expiresAt: NOW + 365 * 24 * HOUR }));

  assert.equal(R2_MAX_SIGNED_URL_SECONDS, 604800);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "604800");
});

test("Firebase put: 기존과 같은 형태로 저장 옵션을 넘긴다", async () => {
  const { storage, calls } = fakeFirebaseStorage();
  const store = createFirebaseStore(storage);
  const body = Buffer.from("wav-bytes");

  await store.put("audio-reviews/u1/s1.wav", body, { contentType: "audio/wav", cacheControl: "private,max-age=3600" });
  await store.put("users/u1/sessions/s1.pdf", body, { contentType: "application/pdf", metadata: { sessionId: "s1" } });

  assert.deepEqual(calls, [
    { op: "save", key: "audio-reviews/u1/s1.wav", body, options: { contentType: "audio/wav", metadata: { cacheControl: "private,max-age=3600" } } },
    { op: "save", key: "users/u1/sessions/s1.pdf", body, options: { contentType: "application/pdf", metadata: { metadata: { sessionId: "s1" } } } }
  ]);
});

test("Firebase signedReadUrl: 만료 시각을 줄이지 않고 그대로 넘긴다", async () => {
  const { storage, calls } = fakeFirebaseStorage();
  const store = createFirebaseStore(storage);
  const expiresAt = NOW + 365 * 24 * HOUR;

  const url = await store.signedReadUrl("users/u1/sessions/s1.pdf", { expiresAt });

  assert.equal(url, "https://firebase.example/users/u1/sessions/s1.pdf");
  assert.deepEqual(calls, [{ op: "sign", key: "users/u1/sessions/s1.pdf", options: { action: "read", expires: expiresAt } }]);
});

test("refreshFileUrls: R2에 보관된 PDF는 저장된 링크 대신 새 서명 URL을 준다", async () => {
  const store = createR2Store(readR2Config(R2_ENV), { now: () => NOW });
  const session = { sessionId: "s1", pdfStorage: "r2", pdfPath: "users/u1/sessions/s1.pdf", pdfUrl: "https://expired.example/old" };

  const refreshed = await refreshFileUrls(store, session, { now: () => NOW });

  const url = new URL(refreshed.pdfUrl);
  assert.ok(url.pathname.endsWith("/users/u1/sessions/s1.pdf"));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
  assert.equal(refreshed.sessionId, "s1");
  assert.equal(session.pdfUrl, "https://expired.example/old", "원본 객체는 바꾸지 않는다");
});

test("refreshFileUrls: Firebase에 보관된 기존 문서는 저장된 링크를 그대로 둔다", async () => {
  const store = createR2Store(readR2Config(R2_ENV), { now: () => NOW });
  const legacy = { sessionId: "s0", pdfPath: "users/u1/sessions/s0.pdf", pdfUrl: "https://storage.googleapis.com/legacy" };

  assert.deepEqual(await refreshFileUrls(store, legacy, { now: () => NOW }), legacy);
  assert.deepEqual(await refreshFileUrls(null, legacy, { now: () => NOW }), legacy);
});
