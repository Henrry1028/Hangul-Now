// Firebase(Auth·Firestore) → Supabase(Auth·Postgres) 데이터 이전
//
//   node --env-file=.env scripts/migrate-firebase-data.mjs           계획만 출력 (아무것도 쓰지 않음)
//   node --env-file=.env scripts/migrate-firebase-data.mjs --apply   실제 이전
//
// - Firebase는 읽기만 한다. 여러 번 돌려도 결과가 같다(회원은 대응표, 채팅·오답 노트는 source_id로 중복 방지).
// - 프로필·학습 이력·수업 기록·튜터 기억은 Firebase 값으로 덮어쓴다. 따라서 운영을 Supabase로 넘긴 뒤에는
//   실행하면 안 된다 (넘긴 뒤 쌓인 기록이 예전 값으로 되돌아간다).
// - 회원은 관리자 API로 만들며 사용자에게 메일이 가지 않는다. 같은 이메일로 Google 로그인하면 이 계정에 연결된다.
// - 개인정보(이메일·대화 내용)는 출력하지 않고 개수만 보여 준다.

import { db, auth, isInitialized } from "../src/firebase.js";
import { createPgPool, createPgStore } from "../src/pgStore.js";
import { plainValue, profileRow, splitConversationId, supabaseUserPayload, targetUserId } from "../src/firebaseMigration.js";

const APPLY = process.argv.includes("--apply");
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || "").trim();
const DB_URL = (process.env.SUPABASE_DB_URL || "").trim();

if (!isInitialized) fail("Firebase 서비스 계정(FIREBASE_SERVICE_ACCOUNT_KEY)이 필요합니다.");
if (!SUPABASE_URL || !SECRET_KEY || !DB_URL) fail("SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_DB_URL이 모두 필요합니다.");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const pool = createPgPool(DB_URL);
const store = createPgStore(pool);
const summary = {};
const note = (key, value = 1) => { summary[key] = (summary[key] || 0) + value; };

console.log(APPLY ? "=== 실제 이전 ===" : "=== 계획만 출력 (쓰지 않음). 실제 이전은 --apply ===");

// ── 1. 회원: Firebase Auth → Supabase Auth + 대응표 ─────────────
const authUsers = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  authUsers.push(...page.users);
  pageToken = page.pageToken;
} while (pageToken);

const idMap = new Map((await pool.query("select firebase_uid, user_id from hn_internal.user_id_map")).rows
  .map((row) => [row.firebase_uid, row.user_id]));

for (const user of authUsers) {
  if (idMap.has(user.uid)) { note("회원: 이미 이전됨"); continue; }
  if (!user.email) { note("회원: 이메일이 없어 건너뜀"); continue; }
  const payload = supabaseUserPayload(user);
  const existing = (await pool.query("select id from auth.users where lower(email) = $1", [payload.email])).rows[0];
  if (existing) {
    note("회원: Supabase에 같은 이메일 계정이 있어 연결");
    if (APPLY) await mapUser(user.uid, existing.id);
    continue;
  }
  note(payload.email_confirm ? "회원: 새로 만듦" : "회원: 새로 만듦 (이메일 미인증 상태 유지)");
  if (!APPLY) continue;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const created = await response.json().catch(() => ({}));
  if (!response.ok || !created.id) fail(`Supabase 회원 생성 실패 (HTTP ${response.status}): ${created.msg || created.message || created.error_code || "알 수 없는 오류"}`);
  await mapUser(user.uid, created.id);
}

async function mapUser(firebaseUid, userId) {
  await pool.query("insert into hn_internal.user_id_map (firebase_uid, user_id) values ($1, $2) on conflict (firebase_uid) do nothing", [firebaseUid, userId]);
  idMap.set(firebaseUid, userId);
}

// ── 2. 프로필: users/{uid} 문서 + 계정 정보 → profiles ──────────
for (const user of authUsers) {
  const userId = idMap.get(user.uid);
  if (!userId) { if (user.email) note("프로필: 회원 생성 후 이전 예정"); continue; }
  const snapshot = await db.collection("users").doc(user.uid).get();
  const row = profileRow({ userId, authUser: user, profile: snapshot.exists ? snapshot.data() : null });
  note(snapshot.exists ? "프로필" : "프로필 (문서 없음, 계정 정보만)");
  if (!APPLY) continue;
  const columns = Object.keys(row);
  const placeholders = columns.map((column, index) => {
    if (column === "interests") return `$${index + 1}::jsonb`;
    if (column === "created_at" || column === "updated_at") return `coalesce($${index + 1}::timestamptz, now())`;
    return `$${index + 1}`;
  });
  await pool.query(
    `insert into public.profiles (${columns.join(", ")}) values (${placeholders.join(", ")})
     on conflict (user_id) do update set ${columns.filter((c) => c !== "user_id").map((c) => `${c} = excluded.${c}`).join(", ")}`,
    columns.map((column) => (column === "interests" ? JSON.stringify(row[column]) : row[column])));
}

// ── 3. 사용자별 하위 기록: learned, sessions, meta/memory (게스트 ID 포함) ──
const authUids = new Set(authUsers.map((user) => user.uid));
for (const ref of await db.collection("users").listDocuments()) {
  const userId = targetUserId(ref.id, idMap);
  if (!authUids.has(ref.id) && !ref.id.startsWith("guest")) note("주의: 계정이 없는 사용자 ID의 기록 (ID 그대로 이전)");

  for (const doc of (await ref.collection("learned").get()).docs) {
    const data = doc.data();
    note("학습 이력");
    note("학습 이력 항목", Object.keys(data.items || {}).length);
    if (APPLY) await store.setLearned(userId, doc.id, data.items || {}, Number(data.updatedAt) || Date.now());
  }
  for (const doc of (await ref.collection("sessions").get()).docs) {
    note("수업 기록");
    if (APPLY) await store.saveSession(userId, doc.id, plainValue(doc.data()));
  }
  const memory = await ref.collection("meta").doc("memory").get();
  if (memory.exists) {
    const { updatedAt, ...rest } = plainValue(memory.data());
    note("튜터 기억");
    if (APPLY) await store.updateTutorMemory(userId, () => rest);
  }
}

// ── 4. 채팅: conversations/{uid}_{tutorId}/messages → chat_messages ──
for (const ref of await db.collection("conversations").listDocuments()) {
  const parts = splitConversationId(ref.id);
  if (!parts) { note("주의: ID 형식이 달라 건너뛴 대화"); continue; }
  const messages = (await ref.collection("messages").get()).docs
    .map((doc) => ({ id: doc.id, ...plainValue(doc.data()) }))
    .filter((message) => {
      const ok = (message.sender === "user" || message.sender === "tutor") && typeof message.text === "string";
      if (!ok) note("주의: 형식이 달라 건너뛴 채팅 메시지");
      return ok;
    })
    // 사용자 메시지와 튜터 답변이 거의 같은 시각에 저장되므로, 같은 시각이면 사용자 메시지를 앞에 둔다
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || (a.sender === "user" ? -1 : 1) - (b.sender === "user" ? -1 : 1));
  note("대화");
  note("채팅 메시지", messages.length);
  if (!APPLY || !messages.length) continue;
  const inserted = await pool.query(
    `insert into public.chat_messages (user_id, tutor_id, sender, text, created_at, source_id)
     select $1, $2, m.sender, m.text, m.created_at, m.source_id
     from unnest($3::text[], $4::text[], $5::timestamptz[], $6::text[]) with ordinality as m(sender, text, created_at, source_id, position)
     order by m.position
     on conflict (source_id) do nothing`,
    [targetUserId(parts.userId, idMap), parts.tutorId, messages.map((m) => m.sender), messages.map((m) => m.text),
      messages.map((m) => m.createdAt || new Date().toISOString()), messages.map((m) => `${ref.id}/${m.id}`)]);
  note("채팅 메시지: 이번에 새로 들어감", inserted.rowCount);
}

// ── 5. 오답 노트: mistake_notes → mistake_notes ─────────────────
const mistakes = (await db.collection("mistake_notes").get()).docs
  .map((doc) => ({ id: doc.id, ...plainValue(doc.data()) }))
  .filter((item) => {
    if (item.userId) return true;
    note("주의: 사용자 ID가 없어 건너뛴 오답 노트");
    return false;
  });
note("오답 노트", mistakes.length);
if (APPLY && mistakes.length) {
  const column = (key) => mistakes.map((item) => item[key] ?? null);
  const inserted = await pool.query(
    `insert into public.mistake_notes (user_id, original, wrong_span, fixed, rule_id, explanation_ko, explanation_en, cefr_level, created_at, due_at, source_id)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::timestamptz[], $10::timestamptz[], $11::text[])
     on conflict (source_id) do nothing`,
    [mistakes.map((item) => targetUserId(item.userId, idMap)), column("original"), column("wrongSpan"), column("fixed"), column("ruleId"),
      column("explanationKo"), column("explanationEn"), column("cefrLevel"),
      mistakes.map((item) => item.createdAt || new Date().toISOString()), column("dueAt"), column("id")]);
  note("오답 노트: 이번에 새로 들어감", inserted.rowCount);
}

// ── 결과 ────────────────────────────────────────────────────
console.log("\n[Firebase에서 읽은 것]");
for (const [key, value] of Object.entries(summary)) console.log(`  ${key}: ${value}`);

const target = (await pool.query(`select
    (select count(*) from hn_internal.user_id_map)::int as "회원 대응표",
    (select count(*) from auth.users)::int as "Supabase 회원",
    (select count(*) from public.profiles)::int as "프로필",
    (select count(*) from public.learned)::int as "학습 이력",
    (select coalesce(sum((select count(*) from jsonb_object_keys(items))), 0) from public.learned)::int as "학습 이력 항목",
    (select count(*) from public.sessions)::int as "수업 기록",
    (select count(*) from public.tutor_memory)::int as "튜터 기억",
    (select count(*) from public.chat_messages where source_id is not null)::int as "채팅 메시지(이전분)",
    (select count(*) from public.mistake_notes where source_id is not null)::int as "오답 노트(이전분)"`)).rows[0];
console.log("\n[Supabase에 현재 있는 것]");
for (const [key, value] of Object.entries(target)) console.log(`  ${key}: ${value}`);

await pool.end();
process.exit(0);
