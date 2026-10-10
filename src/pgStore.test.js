// Postgres(Supabase) 저장 계층 테스트
// - 접속 설정 해석은 DB 없이 돈다.
// - 나머지는 실제 DB를 읽고 쓰므로 SUPABASE_DB_URL이 있을 때만 실행된다: npm run test:db
import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { createPgPool, createPgStore, pgPoolConfig } from "./pgStore.js";

test("pgPoolConfig: 접속 문자열을 항목별로 풀고 비밀번호의 인코딩·기호를 그대로 살린다", () => {
  const config = pgPoolConfig("postgresql://postgres.abcd:p%40ss!word1@aws-0-us-east-1.pooler.supabase.com:5432/postgres");
  assert.equal(config.host, "aws-0-us-east-1.pooler.supabase.com");
  assert.equal(config.port, 5432);
  assert.equal(config.user, "postgres.abcd");
  assert.equal(config.password, "p@ss!word1");
  assert.equal(config.database, "postgres");
});

test("pgPoolConfig: 서버 인증서를 검증하고, Supabase 루트 인증기관을 신뢰 목록에 넣는다", () => {
  const { ssl } = pgPoolConfig("postgresql://postgres.abcd:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres");

  assert.equal(ssl.rejectUnauthorized, true, "인증서 검증을 끄지 않는다");
  // Supabase 공식 배포본(prod-ca-2021.crt)의 SHA-256 지문
  const SUPABASE_ROOT_2021 = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";
  const fingerprints = ssl.ca.map((pem) => new X509Certificate(pem).fingerprint256);
  assert.ok(fingerprints.includes(SUPABASE_ROOT_2021), "Supabase Root 2021 CA 포함");
  assert.ok(fingerprints.length > 1, "공인 인증기관도 함께 신뢰한다 (Supabase가 공인 인증서로 바꿔도 접속이 끊기지 않도록)");
});

const DB_URL = (process.env.SUPABASE_DB_URL || "").trim();

describe("pgStore (실제 DB)", { skip: DB_URL ? false : "SUPABASE_DB_URL 미설정" }, () => {
  const prefix = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const uid = (name) => `${prefix}-${name}`;
  let pool;
  let store;

  before(() => {
    pool = createPgPool(DB_URL);
    store = createPgStore(pool);
  });

  after(async () => {
    for (const table of ["profiles", "learned", "sessions", "tutor_memory", "chat_messages", "mistake_notes"]) {
      await pool.query(`delete from public.${table} where user_id like $1`, [`${prefix}%`]);
    }
    await pool.end();
  });

  test("learned: 기록이 없으면 빈 객체, 저장하면 그대로 돌려주고 다시 저장하면 통째로 바뀐다", async () => {
    const user = uid("learned");
    assert.deepEqual(await store.getLearned(user, "word"), {});

    const first = { 사과: { label: "사과", firstAt: 1, lastAt: 1, count: 1 } };
    await store.setLearned(user, "word", first, 1000);
    assert.deepEqual(await store.getLearned(user, "word"), first);
    assert.deepEqual(await store.getLearned(user, "topic"), {}, "다른 종류와 섞이지 않는다");

    const second = { ...first, 배: { label: "배", firstAt: 2, lastAt: 2, count: 1 } };
    await store.setLearned(user, "word", second, 2000);
    assert.deepEqual(await store.getLearned(user, "word"), second);
  });

  test("sessions: 같은 세션에 두 번 저장하면 필드가 합쳐진다", async () => {
    const user = uid("merge");
    await store.saveSession(user, "s1", { sessionId: "s1", scenarioTitle: "카페", endedAt: 5000, pdfPath: "users/x/s1.pdf" });
    await store.saveSession(user, "s1", { type: "tutor-lesson", audioReviewPath: "audio-reviews/x/s1.wav" });

    assert.deepEqual(await store.listSessions(user, 10), [{
      sessionId: "s1", scenarioTitle: "카페", endedAt: 5000, pdfPath: "users/x/s1.pdf",
      type: "tutor-lesson", audioReviewPath: "audio-reviews/x/s1.wav"
    }]);
  });

  test("sessions: 목록은 endedAt이 있는 세션만 최신순으로, limit만큼 돌려준다", async () => {
    const user = uid("list");
    await store.saveSession(user, "old", { sessionId: "old", endedAt: 1000 });
    await store.saveSession(user, "new", { sessionId: "new", endedAt: 3000 });
    await store.saveSession(user, "mid", { sessionId: "mid", endedAt: 2000 });
    await store.saveSession(user, "lesson-only", { type: "tutor-lesson" });
    await store.saveSession(uid("someone-else"), "other", { sessionId: "other", endedAt: 9000 });

    assert.deepEqual((await store.listSessions(user, 10)).map((s) => s.sessionId), ["new", "mid", "old"]);
    assert.deepEqual((await store.listSessions(user, 2)).map((s) => s.sessionId), ["new", "mid"]);
  });

  test("tutor memory: 기억이 없으면 빈 객체이고, 갱신 함수의 결과가 저장된다", async () => {
    const user = uid("memory");
    assert.deepEqual(await store.getTutorMemory(user), {});

    const seen = [];
    const updated = await store.updateTutorMemory(user, (current) => {
      seen.push(current);
      return { recentEpisodes: ["첫 수업"], habitualMistakes: [] };
    });

    assert.deepEqual(seen, [{}], "처음엔 빈 기억을 넘겨받는다");
    assert.deepEqual(updated, { recentEpisodes: ["첫 수업"], habitualMistakes: [] });
    assert.deepEqual(await store.getTutorMemory(user), updated);
  });

  test("tutor memory: 동시에 들어온 갱신이 서로를 덮어쓰지 않는다", async () => {
    const user = uid("race");
    const append = (episode) => (current) => ({ recentEpisodes: [...(current.recentEpisodes || []), episode] });

    await Promise.all(["a", "b", "c"].map((episode) => store.updateTutorMemory(user, append(episode))));

    assert.deepEqual([...(await store.getTutorMemory(user)).recentEpisodes].sort(), ["a", "b", "c"]);
  });

  test("chat messages: 한 번에 넘긴 메시지를 순서대로 저장한다", async () => {
    const user = uid("chat");
    await store.addChatMessages(user, "jiwoo", [{ sender: "user", text: "안녕하세요" }, { sender: "tutor", text: "반가워요!" }]);

    const { rows } = await pool.query("select tutor_id, sender, text from public.chat_messages where user_id = $1 order by id", [user]);
    assert.deepEqual(rows, [
      { tutor_id: "jiwoo", sender: "user", text: "안녕하세요" },
      { tutor_id: "jiwoo", sender: "tutor", text: "반가워요!" }
    ]);
  });

  test("mistake note: 교정 결과를 열에 맞춰 저장한다", async () => {
    const user = uid("mistake");
    const dueAt = new Date("2026-10-11T00:00:00Z");
    await store.addMistakeNote(user, {
      original: "저는 학교에 가요 어제", wrongSpan: "가요 어제", fixed: "어제 학교에 갔어요", ruleId: "tense-past",
      explanationKo: "과거 시제", explanationEn: "Past tense", cefrLevel: "A1", dueAt
    });

    const { rows } = await pool.query(
      "select original, wrong_span, fixed, rule_id, explanation_ko, explanation_en, cefr_level, due_at from public.mistake_notes where user_id = $1", [user]);
    assert.deepEqual(rows, [{
      original: "저는 학교에 가요 어제", wrong_span: "가요 어제", fixed: "어제 학교에 갔어요", rule_id: "tense-past",
      explanation_ko: "과거 시제", explanation_en: "Past tense", cefr_level: "A1", due_at: dueAt
    }]);
  });

  test("profiles: 관리자 대시보드가 쓰는 필드 이름으로 회원 프로필을 돌려준다", async () => {
    const user = uid("profile");
    const lastLogin = new Date("2026-10-09T12:00:00Z");
    await pool.query(
      `insert into public.profiles (user_id, display_name, photo_url, nickname, nationality, nationality_name, gender, interests, selected_tutor_id, level, xp, last_login_at)
       values ($1, 'Sarah J', 'https://img.example/s.png', 'Sarah', 'GB', 'United Kingdom', 'female', '["kdrama","food"]', 'minho', 'intermediate', 1420, $2)`,
      [user, lastLogin]);

    const profiles = await store.listProfiles();

    assert.ok(profiles instanceof Map);
    assert.deepEqual(profiles.get(user), {
      displayName: "Sarah J", photoURL: "https://img.example/s.png", nickname: "Sarah", nationality: "GB",
      nationalityName: "United Kingdom", gender: "female", interests: ["kdrama", "food"], selectedTutorId: "minho",
      level: "intermediate", xp: 1420, lastLoginAt: lastLogin.getTime()
    });
  });
});
