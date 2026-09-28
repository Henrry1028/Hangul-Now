import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, storage, isInitialized as isFirebaseReady } from "./firebase.js";
import fs from "fs/promises";
import path from "path";

const REVIEW_MODEL = process.env.GEMINI_REVIEW_MODEL || process.env.GEMINI_DIALOGUE_MODEL || "gemini-3.8-flash";
const REVIEW_TTS_MODEL = process.env.GEMINI_REVIEW_TTS_MODEL || "gemini-3.8-flash-lite-tts";
const localMemories = new Map();
const localAudioReviews = new Map();
const MAX_LOCAL_AUDIO_REVIEWS = 3;
const reviewJobs = new Map();
const MAX_REVIEW_JOBS = 50;
const LOCAL_AUDIO_DIR = process.env.LOCAL_AUDIO_REVIEW_DIR || path.join(process.cwd(), "data", "audio-reviews");

const cleanText = (value, max = 400) => String(value || "").trim().slice(0, max);
const safeId = (value, fallback = "guest") => cleanText(value, 160).replace(/[\\/]/g, "_") || fallback;

export function normalizeTutorMemory(value = {}) {
  const recentEpisodes = [...new Set((Array.isArray(value.recentEpisodes) ? value.recentEpisodes : [])
    .map((item) => cleanText(item, 220)).filter(Boolean))].slice(0, 3);
  const habitualMistakes = (Array.isArray(value.habitualMistakes) ? value.habitualMistakes : [])
    .map((item, index) => ({
      id: safeId(item?.id, `mistake-${index + 1}`),
      topic: cleanText(item?.topic, 100),
      wrong: cleanText(item?.wrong || item?.error_phrase, 180),
      correct: cleanText(item?.correct || item?.corrected_phrase, 180),
      category: cleanText(item?.category, 40) || "EXPRESSION"
    }))
    .filter((item) => item.wrong && item.correct)
    .slice(0, 5);
  return { recentEpisodes, habitualMistakes };
}

export function normalizeFinalizePayload(value = {}) {
  const newEpisodes = Array.isArray(value.newEpisodes || value.new_episodes)
    ? (value.newEpisodes || value.new_episodes).map((item) => cleanText(item, 220)).filter(Boolean).slice(0, 3)
    : [];
  const newMistakes = Array.isArray(value.newMistakes || value.new_mistakes)
    ? (value.newMistakes || value.new_mistakes).map((item, index) => ({
        id: safeId(item?.id, `mistake-${Date.now()}-${index + 1}`),
        topic: cleanText(item?.topic, 100),
        wrong: cleanText(item?.wrong || item?.error_phrase, 180),
        correct: cleanText(item?.correct || item?.corrected_phrase, 180),
        category: cleanText(item?.category, 40) || "EXPRESSION"
      })).filter((item) => item.wrong && item.correct).slice(0, 5)
    : [];
  const masteredMistakeIds = Array.isArray(value.masteredMistakeIds || value.mastered_mistake_ids)
    ? (value.masteredMistakeIds || value.mastered_mistake_ids).map((item) => safeId(item)).filter(Boolean).slice(0, 10)
    : [];
  return {
    sessionSummary: cleanText(value.sessionSummary || value.session_summary, 500),
    strengths: Array.isArray(value.strengths) ? value.strengths.map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 5) : [],
    keyExpression: cleanText(value.keyExpression || value.key_expression, 220),
    newEpisodes,
    newMistakes,
    masteredMistakeIds
  };
}

export async function getTutorMemory(userId) {
  const id = safeId(userId);
  if (isFirebaseReady && db) {
    try {
      const snapshot = await db.doc(`users/${id}/meta/memory`).get();
      return normalizeTutorMemory(snapshot.exists ? snapshot.data() : {});
    } catch (error) {
      console.warn("[Tutor memory] Firestore 조회 실패, 로컬 기억으로 대체:", error.message);
    }
  }
  return normalizeTutorMemory(localMemories.get(id));
}

export async function updateTutorMemory(userId, finalizePayload = {}) {
  const id = safeId(userId);
  const payload = normalizeFinalizePayload(finalizePayload);
  const mergeMemory = (currentValue = {}) => {
    const current = normalizeTutorMemory(currentValue);
    const mastered = new Set(payload.masteredMistakeIds);
    const remaining = current.habitualMistakes.filter((item) => !mastered.has(item.id));
    const mistakeById = new Map([...payload.newMistakes, ...remaining].map((item) => [item.id, item]));
    return normalizeTutorMemory({
      recentEpisodes: [...payload.newEpisodes, ...current.recentEpisodes],
      habitualMistakes: [...mistakeById.values()]
    });
  };

  if (isFirebaseReady && db) {
    try {
      const ref = db.doc(`users/${id}/meta/memory`);
      let updated;
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        updated = mergeMemory(snapshot.exists ? snapshot.data() : {});
        transaction.set(ref, { ...updated, updatedAt: new Date().toISOString() }, { merge: true });
      });
      return updated;
    } catch (error) {
      console.warn("[Tutor memory] Firestore 갱신 실패, 로컬 기억으로 대체:", error.message);
    }
  }

  const updated = mergeMemory(localMemories.get(id));
  localMemories.set(id, updated);
  return updated;
}

function parseScriptParts(text) {
  const raw = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(raw || "{}");
  const parts = Array.isArray(parsed.parts) ? parsed.parts.map((item) => cleanText(item, 9000)).filter(Boolean) : [];
  if (parts.length !== 5) throw new Error("오디오 리뷰 대본이 5개 챕터로 생성되지 않았습니다.");
  return parts;
}

function findAudioPayload(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAudioPayload(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const mimeType = value.mime_type || value.mimeType || "";
  if (typeof value.data === "string" && (value.type === "audio" || String(mimeType).startsWith("audio/"))) {
    return { data: value.data, mimeType: mimeType || "audio/wav" };
  }
  for (const nested of Object.values(value)) {
    const found = findAudioPayload(nested);
    if (found) return found;
  }
  return null;
}

async function synthesizeReviewPart({ text, voiceName, style }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: REVIEW_TTS_MODEL,
      input: [{ type: "user_input", content: [{
        type: "text",
        text,
        annotations: [{ type: "speech_metadata", style }]
      }] }],
      response_format: { type: "audio", mime_type: "audio/wav", sample_rate: 24000 },
      generation_config: { speech_config: [{ voice: voiceName }] }
    }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini review TTS ${response.status}: ${detail.slice(0, 300)}`);
  }
  const payload = findAudioPayload(await response.json());
  if (!payload?.data) throw new Error("오디오 리뷰 음성 결과가 비어 있습니다.");
  return Buffer.from(payload.data, "base64");
}

export function mergeWavBuffers(buffers = []) {
  const valid = buffers.filter((buffer) => Buffer.isBuffer(buffer) && buffer.length >= 44);
  if (!valid.length) return Buffer.alloc(0);
  for (const buffer of valid) {
    if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
      throw new Error("생성된 오디오가 WAV 형식이 아닙니다.");
    }
  }
  const header = Buffer.from(valid[0].subarray(0, 44));
  const payloads = valid.map((buffer) => buffer.subarray(44));
  const payloadLength = payloads.reduce((total, buffer) => total + buffer.length, 0);
  header.writeUInt32LE(36 + payloadLength, 4);
  header.writeUInt32LE(payloadLength, 40);
  return Buffer.concat([header, ...payloads]);
}

function buildReviewPrompt({ userNickname, feedbackLanguage, tutor, transcriptLogs, finalizePayload }) {
  return `당신은 한글나우의 한국어 튜터 '${tutor.name}'입니다.
방금 학생 '${userNickname}'과 진행한 1:1 한국어 회화 수업을 복습하는 약 10분 분량의 단독 오디오 강의 대본을 작성하세요.

[작성 규칙]
1. 설명은 반드시 ${feedbackLanguage}로 하되, 교정할 한국어 예시와 따라 말할 문장은 한국어 원문을 유지합니다.
2. 총 1,500~1,800단어 내외를 정확히 5개 파트의 JSON 문자열 배열로 작성합니다.
3. Part 1: 오늘 대화 요약과 잘한 점. Part 2: 존대와 어색한 표현 분석. Part 3: 문법, 조사, 어미와 응용 예문 3개. Part 4: 핵심 문장 5개를 두 번씩 따라 말하기. Part 5: 다음 수업 복습 미션과 인사.
4. 입으로 읽을 대사만 씁니다. 마크다운, 제목 기호, 괄호 지시문, 이모지는 넣지 않습니다.
5. 출력은 다른 설명 없이 {"parts":["...","...","...","...","..."]} 형식의 JSON만 반환합니다.

[세션 데이터]
${JSON.stringify({ transcriptLogs, finalizePayload })}`;
}

export async function createTutorAudioReview({
  userId,
  sessionId,
  userNickname = "Learner",
  feedbackLanguage = "English",
  tutor,
  transcriptLogs = [],
  finalizePayload = {},
  onProgress = () => {}
}) {
  const startedAt = Date.now();
  if (!Array.isArray(transcriptLogs) || !transcriptLogs.length) throw new Error("대화 기록이 비어 있습니다.");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  const safeSessionId = safeId(sessionId, `session-${Date.now()}`);
  const normalizedPayload = normalizeFinalizePayload(finalizePayload);
  const normalizedTranscript = transcriptLogs.slice(-120).map((turn) => ({
    role: turn?.role === "tutor" ? "tutor" : "user",
    text: cleanText(turn?.text, 1000),
    at: Number(turn?.at) || undefined
  })).filter((turn) => turn.text);
  if (!normalizedTranscript.length) throw new Error("유효한 대화 기록이 비어 있습니다.");
  // Track A(기억 갱신)와 Track B(대본·음성 생성)는 서로 독립적이므로 동시에 시작한다.
  const memoryPromise = updateTutorMemory(userId, normalizedPayload);
  onProgress("script", { startedAt });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: REVIEW_MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0.35 }
  });
  const result = await model.generateContent(buildReviewPrompt({
    userNickname: cleanText(userNickname, 80) || "Learner",
    feedbackLanguage: cleanText(feedbackLanguage, 80) || "English",
    tutor,
    transcriptLogs: normalizedTranscript,
    finalizePayload: normalizedPayload
  }));
  const scriptParts = parseScriptParts(result.response.text());
  const scriptReadyAt = Date.now();
  onProgress("tts", { scriptMs: scriptReadyAt - startedAt });
  const audioParts = await Promise.all(scriptParts.map((text) => synthesizeReviewPart({
    text,
    voiceName: tutor.voiceName,
    style: tutor.style
  })));
  const audio = mergeWavBuffers(audioParts);
  if (!audio.length) throw new Error("오디오 리뷰를 병합하지 못했습니다.");
  const audioReadyAt = Date.now();
  onProgress("storing", { scriptMs: scriptReadyAt - startedAt, ttsMs: audioReadyAt - scriptReadyAt });
  const memory = await memoryPromise;

  let audioReviewUrl;
  let archived = false;
  let storageBackend = "local-disk";
  if (isFirebaseReady && storage) {
    try {
      const file = storage.bucket().file(`audio-reviews/${safeId(userId)}/${safeSessionId}.wav`);
      await file.save(audio, { contentType: "audio/wav", metadata: { cacheControl: "private,max-age=3600" } });
      [audioReviewUrl] = await file.getSignedUrl({ action: "read", expires: "2035-01-01" });
      storageBackend = "firebase-storage";
    } catch (error) {
      console.warn("[Tutor review] Firebase Storage 보관 실패, 로컬 음원으로 대체:", error.message);
    }
  }
  if (!audioReviewUrl) {
    localAudioReviews.set(safeSessionId, audio);
    while (localAudioReviews.size > MAX_LOCAL_AUDIO_REVIEWS) {
      localAudioReviews.delete(localAudioReviews.keys().next().value);
    }
    await fs.mkdir(LOCAL_AUDIO_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_AUDIO_DIR, `${safeSessionId}.wav`), audio);
    audioReviewUrl = `/api/session/audio-review/${encodeURIComponent(safeSessionId)}`;
  }

  if (db) {
    try {
      await db.doc(`users/${safeId(userId)}/sessions/${safeSessionId}`).set({
        type: "tutor-lesson",
        tutorId: tutor.id,
        tutorName: tutor.name,
        audioReviewUrl,
        audioReviewStorage: storageBackend,
        audioReviewScript: scriptParts.join("\n\n"),
        finalizePayload: normalizedPayload,
        completedAt: new Date().toISOString()
      }, { merge: true });
      archived = true;
    } catch (error) {
      console.warn("[Tutor review] Firestore 세션 보관 실패:", error.message);
    }
  }

  const completedAt = Date.now();

  return {
    success: true,
    sessionId: safeSessionId,
    audioReviewUrl,
    scriptParts,
    memory,
    archived,
    storageBackend,
    models: { script: REVIEW_MODEL, tts: REVIEW_TTS_MODEL },
    timings: {
      scriptMs: scriptReadyAt - startedAt,
      ttsMs: audioReadyAt - scriptReadyAt,
      storageMs: completedAt - audioReadyAt,
      totalMs: completedAt - startedAt
    }
  };
}

export async function getLocalAudioReview(sessionId) {
  const id = safeId(sessionId);
  const cached = localAudioReviews.get(id);
  if (cached) return cached;
  try {
    const audio = await fs.readFile(path.join(LOCAL_AUDIO_DIR, `${id}.wav`));
    localAudioReviews.set(id, audio);
    return audio;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function publicJob(job) {
  if (!job) return null;
  return {
    jobId: job.jobId,
    sessionId: job.sessionId,
    status: job.status,
    stage: job.stage,
    queuedAt: job.queuedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    elapsedMs: (job.completedAt || Date.now()) - job.queuedAt,
    result: job.status === "complete" ? job.result : undefined,
    error: job.status === "error" ? job.error : undefined,
    metrics: job.metrics
  };
}

export function startTutorAudioReview(input) {
  const sessionId = safeId(input?.sessionId, `session-${Date.now()}`);
  const existing = [...reviewJobs.values()].find((job) => job.sessionId === sessionId && job.status !== "error");
  if (existing) return { ...publicJob(existing), reused: true };

  const jobId = `review-${sessionId}-${Date.now().toString(36)}`;
  const job = {
    jobId,
    sessionId,
    status: "queued",
    stage: "queued",
    queuedAt: Date.now(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
    metrics: {}
  };
  reviewJobs.set(jobId, job);
  while (reviewJobs.size > MAX_REVIEW_JOBS) reviewJobs.delete(reviewJobs.keys().next().value);

  setImmediate(async () => {
    job.status = "running";
    job.stage = "script";
    job.startedAt = Date.now();
    try {
      job.result = await createTutorAudioReview({
        ...input,
        sessionId,
        onProgress: (stage, metrics = {}) => {
          job.stage = stage;
          job.metrics = { ...job.metrics, ...metrics };
        }
      });
      job.status = "complete";
      job.stage = "complete";
      job.completedAt = Date.now();
      job.metrics = { ...job.metrics, ...job.result.timings };
    } catch (error) {
      job.status = "error";
      job.stage = "error";
      job.error = error.message;
      job.completedAt = Date.now();
      console.error(`[Tutor review job ${jobId}]`, error);
    }
  });

  return publicJob(job);
}

export function getTutorAudioReviewJob(jobId) {
  return publicJob(reviewJobs.get(safeId(jobId, "")));
}
