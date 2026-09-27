// ============================================================
// Survival Korean — 세션 종료 파이프라인
// 대화 로그 → Kiwi 형태소 분석 → gemini-3.8-flash 첨삭 → PDF → Firebase 아카이빙
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildReviewPdf } from "./reportPdf.js";
import { db, storage, isInitialized } from "./firebase.js";

const REVIEW_MODEL = process.env.GEMINI_REVIEW_MODEL || "gemini-3.8-flash";

// ── 1. Kiwi 형태소 분석 (학생 발화만) ───────────────────────
export async function analyzeMorphs(turns) {
  const mine = turns.filter((t) => t.role === "user" && (t.text || "").trim()).slice(0, 25);
  if (!mine.length) return [];
  try {
    const { tagSentence } = await import("./pos/index.ts");
    return mine.map((t) => {
      try {
        const tagged = tagSentence(t.text);
        const items = [];
        for (const eojeol of tagged.eojeols || []) {
          for (const seg of eojeol.segments || []) {
            if (seg.bucket === "PUNCT") continue;
            items.push({
              surface: seg.surface,
              tag: (seg.rawTags && seg.rawTags[0]) || seg.bucket || "",
              role: eojeol.role?.role || ""
            });
          }
        }
        return { sentence: t.text, items };
      } catch {
        return { sentence: t.text, items: [] };
      }
    });
  } catch (err) {
    console.warn("[sessionReport] Kiwi 분석 건너뜀:", err.message);
    return mine.map((t) => ({ sentence: t.text, items: [] }));
  }
}

// ── 2. gemini-3.8-flash 첨삭 ────────────────────────────────
export async function generateReview({ turns, hints, scenarioTitle, level }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const script = turns.map((t) => `${t.role === "user" ? "학생" : "상대"}: ${t.text}`).join("\n");
  const hintText = hints.length
    ? hints.map((h) => `- ${h.error_phrase} → ${h.corrected_phrase} (${h.situation_rule})`).join("\n")
    : "(없음)";

  const prompt = `너는 한국어 어학당에서 30년간 가르친 선생님이다. 아래는 외국인 학생이 '${scenarioTitle}' 상황에서 롤플레잉한 대화 기록이다.
학생 수준: ${level}

[대화 기록]
${script}

[대화 중 이미 안내한 치명적 오류]
${hintText}

학생의 발화만 보고 복습 노트를 만들어라. 반드시 아래 JSON 형식으로만 답하고 다른 말은 쓰지 마라.
{
  "summary": "오늘 대화에 대한 2~3문장 총평 (잘한 점 먼저, 따뜻하게)",
  "corrections": [{"before":"학생이 말한 문장 그대로","after":"자연스럽게 고친 문장","why":"왜 그렇게 쓰는지 한 줄"}],
  "vocabulary": [{"word":"이 상황에서 더 알면 좋은 단어/표현","meaning":"뜻과 쓰임"}],
  "nextSteps": ["다음에 연습할 것 1", "다음에 연습할 것 2"]
}
corrections는 최대 5개, vocabulary는 최대 6개, nextSteps는 2~3개로 하라. 학생이 말한 게 없으면 빈 배열로 둔다.`;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: REVIEW_MODEL,
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
    });
    const res = await model.generateContent(prompt);
    const raw = res.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[sessionReport] 첨삭 생성 실패:", err.message);
    return null;
  }
}

// ── 3. Firebase 영구 아카이빙 ───────────────────────────────
// Storage: users/{userId}/sessions/{sessionId}.pdf
// Firestore: users/{userId}/sessions/{sessionId}
export async function archiveSession({ userId, sessionId, pdfBuffer, meta, turns, hints, review }) {
  if (!isInitialized || !userId) {
    return { archived: false, reason: !userId ? "not-signed-in" : "firebase-unavailable" };
  }
  const storagePath = `users/${userId}/sessions/${sessionId}.pdf`;
  let downloadUrl = null;
  try {
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);
    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: { metadata: { sessionId, scenario: meta.scenarioId || "", level: meta.level || "" } }
    });
    // 만료 없는 읽기 링크 (Firebase 다운로드 토큰 방식)
    const [signed] = await file.getSignedUrl({ action: "read", expires: Date.now() + 365 * 864e5 });
    downloadUrl = signed;
  } catch (err) {
    console.warn("[sessionReport] Storage 업로드 실패:", err.message);
    return { archived: false, reason: "storage-failed", error: err.message };
  }

  try {
    await db.collection("users").doc(userId).collection("sessions").doc(sessionId).set({
      sessionId,
      scenarioId: meta.scenarioId || "",
      scenarioTitle: meta.scenarioTitle || "",
      level: meta.level || "",
      startedAt: meta.startedAt || Date.now(),
      endedAt: meta.endedAt || Date.now(),
      turnCount: turns.length,
      myTurnCount: turns.filter((t) => t.role === "user").length,
      criticalErrorCount: hints.length,
      criticalErrors: hints.map((h) => ({
        errorPhrase: h.error_phrase, correctedPhrase: h.corrected_phrase, situationRule: h.situation_rule
      })),
      summary: review?.summary || "",
      pdfPath: storagePath,
      pdfUrl: downloadUrl,
      createdAt: new Date()
    }, { merge: true });
  } catch (err) {
    console.warn("[sessionReport] Firestore 저장 실패:", err.message);
    return { archived: false, reason: "firestore-failed", error: err.message, pdfUrl: downloadUrl };
  }

  return { archived: true, pdfUrl: downloadUrl, pdfPath: storagePath };
}

// ── 전체 파이프라인 ─────────────────────────────────────────
export async function buildSessionReport({ userId, sessionId, turns = [], hints = [], meta = {} }) {
  const id = sessionId || `s${Date.now()}`;
  const [morphs, review] = await Promise.all([
    analyzeMorphs(turns),
    generateReview({ turns, hints, scenarioTitle: meta.scenarioTitle || "롤플레잉", level: meta.level || "초급" })
  ]);

  const pdfBuffer = await buildReviewPdf({ turns, hints, morphs, review, meta });
  const archive = await archiveSession({ userId, sessionId: id, pdfBuffer, meta, turns, hints, review });

  return { sessionId: id, pdfBuffer, review, morphCount: morphs.length, archive };
}

// 대시보드용 — 저장된 세션 목록
export async function listSessions(userId, limit = 50) {
  if (!isInitialized || !userId) return [];
  try {
    const snap = await db.collection("users").doc(userId).collection("sessions")
      .orderBy("endedAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.warn("[sessionReport] 세션 목록 조회 실패:", err.message);
    return [];
  }
}
