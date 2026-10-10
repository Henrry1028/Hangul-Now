// 서버 모듈이 SUPABASE_DB_URL 설정 시 실제로 Postgres에 읽고 쓰는지 확인한다 (npm run test:db).
// Firebase는 일부러 끈다 — 이 테스트가 운영 Firestore에 닿지 않게 하고, Postgres 경로만 타는지 본다.
import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";

const DB_URL = (process.env.SUPABASE_DB_URL || "").trim();

describe("Postgres 연결 (서버 모듈)", { skip: DB_URL ? false : "SUPABASE_DB_URL 미설정" }, () => {
  const prefix = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const uid = (name) => `${prefix}-${name}`;
  let pool;
  let pgStore;
  let learningHistory;
  let tutorSession;
  let sessionReport;
  let fileStore;

  before(async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = ""; // dotenv는 이미 있는 값을 덮어쓰지 않는다
    ({ pgStore } = await import("./dataStore.js"));
    ({ fileStore } = await import("./fileStore.js"));
    learningHistory = await import("./learningHistory.js");
    tutorSession = await import("./tutorSession.js");
    sessionReport = await import("./sessionReport.js");
    const { createPgPool } = await import("./pgStore.js");
    pool = createPgPool(DB_URL);
  });

  after(async () => {
    for (const table of ["learned", "sessions", "tutor_memory"]) {
      await pool.query(`delete from public.${table} where user_id like $1`, [`${prefix}%`]);
    }
    await pool.end();
  });

  test("학습 이력: 기록하면 Postgres에 쌓이고 다시 기록하면 횟수가 는다", async () => {
    const user = uid("learned");

    const first = await learningHistory.recordLearned(user, "word", [{ key: "사과", label: "apple" }]);
    await learningHistory.recordLearned(user, "word", ["사과", "배"]);
    const learned = await learningHistory.getLearned(user, "word");

    assert.equal(first.store, "postgres");
    assert.equal(learned["사과"].count, 2);
    assert.equal(learned["사과"].label, "apple");
    assert.equal(learned["배"].count, 1);
    assert.deepEqual(await pgStore.getLearned(user, "word"), learned, "DB에 저장된 값과 같다");
  });

  test("튜터 기억: 수업 마무리 내용이 Postgres에 병합 저장된다", async () => {
    const user = uid("memory");

    await tutorSession.updateTutorMemory(user, {
      newEpisodes: ["여행 계획을 이야기함"],
      newMistakes: [{ id: "m1", topic: "조사", wrong: "학교를 가요", correct: "학교에 가요", category: "GRAMMAR" }]
    });
    const updated = await tutorSession.updateTutorMemory(user, { newEpisodes: ["주말 이야기"], masteredMistakeIds: ["m1"] });

    assert.deepEqual(updated, { recentEpisodes: ["주말 이야기", "여행 계획을 이야기함"], habitualMistakes: [] });
    assert.deepEqual(await pgStore.getTutorMemory(user), updated, "DB에 저장된 값과 같다");
    assert.deepEqual(await tutorSession.getTutorMemory(user), updated);
  });

  test("복습 노트: PDF는 파일 저장소에, 기록은 Postgres에 남고 목록에서 내려받을 수 있다", { skip: process.env.R2_ACCOUNT_ID ? false : "R2 미설정" }, async () => {
    const user = uid("archive");
    const pdfBuffer = Buffer.from("%PDF-1.4 hangul-now wiring test");

    const result = await sessionReport.archiveSession({
      userId: user, sessionId: "s1", pdfBuffer,
      meta: { scenarioId: "cafe", scenarioTitle: "카페에서 주문하기", level: "초급", startedAt: 1000, endedAt: 2000 },
      turns: [{ role: "user", text: "아메리카노 주세요" }, { role: "model", text: "네, 알겠습니다" }],
      hints: [{ error_phrase: "주세요를", corrected_phrase: "주세요", situation_rule: "조사 불필요" }],
      review: { summary: "잘했어요" }
    });
    const sessions = await sessionReport.listSessions(user, 10);

    try {
      assert.equal(result.archived, true);
      assert.equal(sessions.length, 1);
      assert.equal(sessions[0].scenarioTitle, "카페에서 주문하기");
      assert.equal(sessions[0].myTurnCount, 1);
      assert.deepEqual(sessions[0].criticalErrors, [{ errorPhrase: "주세요를", correctedPhrase: "주세요", situationRule: "조사 불필요" }]);
      assert.equal(sessions[0].pdfStorage, fileStore.backend);
      const downloaded = Buffer.from(await (await fetch(sessions[0].pdfUrl)).arrayBuffer());
      assert.ok(downloaded.equals(pdfBuffer), "목록의 링크로 같은 PDF를 내려받는다");
    } finally {
      await removeTestObject(result.pdfPath);
    }
  });
});

// 시험용으로 올린 파일 삭제 (저장 계층에는 삭제 기능이 없어 S3 클라이언트를 직접 쓴다)
async function removeTestObject(key) {
  if (!key) return;
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const { readR2Config } = await import("./objectStore.js");
  const config = readR2Config(process.env);
  if (!config) return;
  const s3 = new S3Client({
    region: "auto", endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
