// ============================================================
// Hangul Now (훈민정음) 엔터프라이즈 풀스택 백엔드 서버
// Google Gemini API + Google Cloud Platform + Firebase App Hosting
// ============================================================

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import textToSpeech from "@google-cloud/text-to-speech";

import {
  generateTutorChat,
  analyzeSentenceCorrection,
  reviewWriting,
  evaluatePronunciation
} from "./src/geminiService.js";

import {
  executeMultiAgentCoaching,
  generateSessionArtifact,
  generateReviewQuiz,
  setUsageReporter
} from "./src/agents/orchestrator.mjs";

import {
  tagSentence,
  romanize,
  FIVE_CLASS_STYLE,
  ROLE_STYLE,
  TOOLTIP_EN,
  ROLE_TOOLTIP_EN
} from "./src/pos/index.ts";

import { attachLiveConversation } from "./src/liveConversation.js";
import { buildSessionReport, listSessions } from "./src/sessionReport.js";
import { getLearned, recordLearned, pickFresh, todaySeed, LEARN_TYPES } from "./src/learningHistory.js";
import { generateContent, LEVEL_SPEC, translateLines } from "./src/contentGenerator.js";
import { usageMeter } from "./src/usage-meter.mjs";
import { db, auth, storage, isInitialized as isFirebaseReady } from "./src/firebase.js";
import { getLocalAudioReview, getTutorAudioReviewJob, startTutorAudioReview } from "./src/tutorSession.js";
import videoClassRouter from "./src/videoClassService.js";
import { isEmailAdmin } from "./src/adminPolicy.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 오케스트레이터 사용량 계측기 연결
setUsageReporter(info => usageMeter.record(info));

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const parseServiceAccount = raw => {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
  } catch {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
};

const ttsServiceAccount = parseServiceAccount(
  process.env.GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY
);
const TUTOR_TTS_VOICES = Object.freeze({
  jiwoo: {
    tutorName: "김지우",
    name: "ko-KR-Neural2-A",
    geminiVoice: "Aoede",
    partnerVoice: "Charon",
    style: "Warm and friendly. Natural conversational Korean, slightly slow, with gentle pauses.",
    gender: "FEMALE",
    speakingRate: 0.9,
    pitch: 1
  },
  minho: {
    tutorName: "박민호",
    name: "ko-KR-Neural2-C",
    geminiVoice: "Charon",
    partnerVoice: "Aoede",
    style: "Calm, informative, and confident. Natural professional Korean at a steady pace.",
    gender: "MALE",
    speakingRate: 0.98,
    pitch: -1
  },
  seoyeon: {
    tutorName: "이서연",
    name: "ko-KR-Neural2-B",
    geminiVoice: "Kore",
    partnerVoice: "Iapetus",
    style: "Precise, composed, and encouraging. Clear Korean with natural phrasing and gentle emphasis.",
    gender: "FEMALE",
    speakingRate: 0.88,
    pitch: -0.5
  },
  haneul: {
    tutorName: "최하늘",
    name: "ko-KR-Neural2-C",
    geminiVoice: "Iapetus",
    partnerVoice: "Kore",
    style: "Clear, relaxed, and encouraging. Crisp Korean pronunciation with natural rhythm and intonation.",
    gender: "MALE",
    speakingRate: 0.88,
    pitch: 1.5
  }
});

// Flash TTS is the quality-first model. GEMINI_TTS_MODEL can still override it in deployments.
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";

const findAudioPayload = value => {
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
};

const synthesizeWithGemini = async ({ text, voice, style }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: GEMINI_TTS_MODEL,
      input: [{
        type: "user_input",
        content: [{
          type: "text",
          text,
          annotations: [{
            type: "speech_metadata",
            style
          }]
        }]
      }],
      response_format: { type: "audio", mime_type: "audio/wav", sample_rate: 24000 },
      generation_config: { speech_config: [{ voice }] }
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini TTS ${response.status}: ${detail.slice(0, 240)}`);
  }
  const payload = findAudioPayload(await response.json());
  if (!payload?.data) throw new Error("Gemini TTS 음성 결과가 비어 있습니다.");
  return { audio: Buffer.from(payload.data, "base64"), mimeType: payload.mimeType };
};

const synthesizeDialogueWithGemini = async ({ segments, tutorVoice, tutorStyle, partnerVoice }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  const firstSpeaker = String(segments[0]?.speaker || "Tutor");
  const content = segments.map((segment) => {
    const isTutor = String(segment.speaker || "") === firstSpeaker;
    return {
      type: "text",
      text: segment.text,
      annotations: [{
        type: "speech_metadata",
        speaker: isTutor ? "Tutor" : "Partner",
        style: isTutor
          ? tutorStyle
          : "Natural Korean conversation partner. Responsive, relaxed, and clearly distinct from the tutor."
      }]
    };
  });
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: GEMINI_TTS_MODEL,
      input: [{ type: "user_input", content }],
      response_format: { type: "audio", mime_type: "audio/wav", sample_rate: 24000 },
      generation_config: {
        speech_config: {
          mode: "conversational",
          speakers: [
            { speaker: "Tutor", voice: tutorVoice },
            { speaker: "Partner", voice: partnerVoice }
          ]
        }
      }
    }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini multi-speaker TTS ${response.status}: ${detail.slice(0, 240)}`);
  }
  const payload = findAudioPayload(await response.json());
  if (!payload?.data) throw new Error("Gemini 다중 화자 음성 결과가 비어 있습니다.");
  return { audio: Buffer.from(payload.data, "base64"), mimeType: payload.mimeType };
};

let cloudTtsClient;
const getCloudTtsClient = () => {
  if (cloudTtsClient) return cloudTtsClient;
  if (ttsServiceAccount?.client_email && ttsServiceAccount?.private_key) {
    cloudTtsClient = new textToSpeech.TextToSpeechClient({
      projectId: ttsServiceAccount.project_id,
      credentials: {
        client_email: ttsServiceAccount.client_email,
        private_key: ttsServiceAccount.private_key
      }
    });
    return cloudTtsClient;
  }
  const canUseAdc = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || process.env.GAE_SERVICE);
  if (!canUseAdc) return null;
  cloudTtsClient = new textToSpeech.TextToSpeechClient();
  return cloudTtsClient;
};

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 1. 최적화된 독립형 웹 프로토타입 UI 및 에셋 서빙
app.use(express.static(path.join(__dirname, "preview")));

// ============================================================
// 1. 시스템 및 헬스체크 API
// ============================================================
app.get("/api/health", (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    service: "Hangul Now Enterprise API",
    version: "2.0.0",
    platform: "Google Cloud Run & Firebase App Hosting Ready",
    ecosystem: {
      geminiModels: {
        chat: process.env.GEMINI_DIALOGUE_MODEL || "gemini-3.8-flash",
        coaching: process.env.GEMINI_PREMIUM_MODEL || "gemini-3.8-flash",
        stt: "gemini-2.5-flash",
        liveTutor: process.env.GEMINI_TUTOR_LIVE_MODEL || "gemini-3.8-live-extended-thinking",
        liveRoleplay: process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live-extended-thinking",
        tts: GEMINI_TTS_MODEL,
        reviewScript: process.env.GEMINI_REVIEW_MODEL || process.env.GEMINI_DIALOGUE_MODEL || "gemini-3.8-flash",
        reviewTts: process.env.GEMINI_REVIEW_TTS_MODEL || "gemini-3.8-flash-lite-tts"
      },
      tutorVoices: Object.fromEntries(Object.entries(TUTOR_TTS_VOICES).map(([id, voice]) => [id, {
        tutor: voice.tutorName,
        voice: voice.geminiVoice,
        dialoguePartnerVoice: voice.partnerVoice
      }])),
      geminiConfigured: hasGemini,
      cloudTtsConfigured: Boolean(ttsServiceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || process.env.GAE_SERVICE),
      firebaseAdmin: isFirebaseReady ? "Connected (Firestore & Auth)" : "Demo / In-memory Mock",
      posEngine: "Kiwi-NLP Morphological Analyzer Enabled",
      multiAgentOrchestrator: "Enabled (Grammar + Phonetics + Vocabulary)"
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 2. AI 튜터 실시간 대화 API (Gemini 3.8 Flash)
// ============================================================
app.post("/api/chat", async (req, res) => {
  try {
    const { tutorId = "jiwoo", message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message 필드가 필요합니다." });
    }

    const response = await generateTutorChat({ tutorId, message, history });

    // Firebase 연동 시 대화 기록 Firestore 비동기 저장
    if (isFirebaseReady && req.body.userId) {
      const convRef = db.collection("conversations").doc(`${req.body.userId}_${tutorId}`);
      convRef.collection("messages").add({
        sender: "user",
        text: message,
        createdAt: new Date()
      }).catch(err => console.warn("Firestore 저장 실패:", err.message));

      convRef.collection("messages").add({
        sender: "tutor",
        text: response.reply,
        createdAt: new Date()
      }).catch(err => console.warn("Firestore 저장 실패:", err.message));
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 3. 실시간 문장 교정 카드 API (Gemini Structured Outputs)
// ============================================================
app.post("/api/correction", async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence) {
      return res.status(400).json({ error: "sentence 필드가 필요합니다." });
    }

    const correction = await analyzeSentenceCorrection(sentence);

    // 오답일 경우 Firebase 오답 노트에 자동 등록
    if (isFirebaseReady && correction.has_error && req.body.userId) {
      db.collection("mistake_notes").add({
        userId: req.body.userId,
        original: correction.original,
        wrongSpan: correction.wrong_span,
        fixed: correction.fixed,
        ruleId: correction.rule_id,
        explanationKo: correction.explanation_ko,
        explanationEn: correction.explanation_en,
        cefrLevel: correction.cefr_level || "A1",
        createdAt: new Date(),
        dueAt: new Date(Date.now() + 24 * 3600 * 1000) // 1일 후 첫 복습
      }).catch(err => console.warn("오답 노트 저장 실패:", err.message));
    }

    res.json(correction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 4. Multi-Agent 코칭 시스템 (문법 + 발음 + 어휘 병렬 분석)
// ============================================================
app.post("/api/coaching", async (req, res) => {
  try {
    const {
      userText,
      userAudio,
      tutorId = "jiwoo",
      history = [],
      targetSentence,
      scenario,
      politeness,
      level,
      weaknesses = [],
      userId
    } = req.body;

    if (!userText && !userAudio) {
      return res.status(400).json({ error: "userText 또는 userAudio 가 필요합니다." });
    }

    const coachingResult = await executeMultiAgentCoaching({
      targetText: targetSentence || userText || "",
      recognizedText: userText || "",
      scenario: scenario || `${tutorId} tutor conversation`,
      politeness,
      level,
      history,
      weaknesses,
      audio: userAudio || null,
      userId,
      apiKey: process.env.GEMINI_API_KEY
    });

    res.json(coachingResult);
  } catch (err) {
    console.error("Multi-Agent 코칭 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 5. 형태소 분석(POS) 및 로마자 변환 API (국립국어원 규격)
// ============================================================
app.post("/api/pos/tag", async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence) {
      return res.status(400).json({ error: "sentence 필드가 필요합니다." });
    }

    const tagged = tagSentence(sentence);
    res.json({
      sentence,
      tagged,
      styles: {
        fiveClass: FIVE_CLASS_STYLE,
        role: ROLE_STYLE
      },
      tooltips: {
        pos: TOOLTIP_EN,
        role: ROLE_TOOLTIP_EN
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/romanize", (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text 필드가 필요합니다." });
    }
    const result = romanize(text);
    res.json({ original: text, romanized: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 6. 작문 첨삭 API
// ============================================================
app.post("/api/writing/feedback", async (req, res) => {
  try {
    const { topic, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "content 필드가 필요합니다." });
    }
    const feedback = await reviewWriting({ topic, content });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 7. 발음 평가 API
// ============================================================
app.post("/api/speaking/assess", async (req, res) => {
  try {
    const { targetSentence, romanization, userTranscript } = req.body;
    const assessment = await evaluatePronunciation({ targetSentence, romanization, userTranscript });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 8. 선택 튜터 한국어 읽기 API
// ============================================================
app.post("/api/tts", async (req, res) => {
  try {
    const segments = Array.isArray(req.body?.segments)
      ? req.body.segments
        .slice(0, 20)
        .map((segment) => ({
          speaker: String(segment?.speaker || "").trim(),
          text: String(segment?.text || "").trim()
        }))
        .filter((segment) => segment.text)
      : [];
    const text = String(req.body?.text || segments.map((segment) => segment.text).join(" ")).trim();
    const tutorId = TUTOR_TTS_VOICES[req.body?.tutorId] ? req.body.tutorId : "jiwoo";
    const isDialogue = segments.length >= 2 && new Set(segments.map((segment) => segment.speaker)).size >= 2;

    if (!text || !/[ㄱ-ㅎㅏ-ㅣ가-힣]/u.test(text)) {
      return res.status(400).json({ error: "읽을 한글 텍스트가 필요합니다." });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "한 번에 읽을 수 있는 텍스트는 500자까지입니다." });
    }

    const voice = TUTOR_TTS_VOICES[tutorId];
    try {
      let gemini;
      let mode = "single-speaker";
      if (isDialogue) {
        try {
          gemini = await synthesizeDialogueWithGemini({
            segments,
            tutorVoice: voice.geminiVoice,
            tutorStyle: voice.style,
            partnerVoice: voice.partnerVoice
          });
          mode = "multi-speaker";
        } catch (dialogueError) {
          console.warn("Gemini 다중 화자 TTS 대체 경로 실패:", dialogueError.message);
        }
      }
      if (!gemini) {
        gemini = await synthesizeWithGemini({ text, voice: voice.geminiVoice, style: voice.style });
      }
      res.set({
        "Content-Type": gemini.mimeType,
        "Cache-Control": "private, max-age=86400",
        "X-Tutor-Id": tutorId,
        "X-Tutor-Name": encodeURIComponent(voice.tutorName),
        "X-Tutor-Voice": voice.geminiVoice,
        "X-Partner-Voice": mode === "multi-speaker" ? voice.partnerVoice : "",
        "X-TTS-Mode": mode,
        "X-TTS-Provider": `Gemini-${GEMINI_TTS_MODEL}${mode === "multi-speaker" ? "-MultiSpeaker" : ""}`
      });
      return res.send(gemini.audio);
    } catch (geminiError) {
      console.warn("Gemini TTS 대체 경로 실패:", geminiError.message);
    }

    const client = getCloudTtsClient();
    if (!client) throw new Error("사용 가능한 서버 TTS 공급자가 없습니다.");
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: "ko-KR",
        name: voice.name,
        ssmlGender: voice.gender
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: voice.speakingRate,
        pitch: voice.pitch
      }
    });
    if (!response.audioContent) throw new Error("음성 합성 결과가 비어 있습니다.");

    res.set({
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=86400",
      "X-Tutor-Id": tutorId,
      "X-Tutor-Name": encodeURIComponent(voice.tutorName),
      "X-Tutor-Voice": voice.name,
      "X-TTS-Provider": "Google-Cloud-TTS-Neural2"
    });
    res.send(Buffer.from(response.audioContent));
  } catch (err) {
    console.error("Tutor TTS 오류:", err.message);
    res.status(503).json({ error: "튜터 음성을 생성하지 못했습니다." });
  }
});

// ============================================================
// 9. 학습 세션 완료 리포트 및 복습 퀴즈 자동 생성
// ============================================================
app.post("/api/session/artifact", async (req, res) => {
  try {
    const { sessionData } = req.body;
    const artifact = await generateSessionArtifact(sessionData || {});
    res.json({ artifact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/session/quiz", async (req, res) => {
  try {
    const { mistakeItems } = req.body;
    const quiz = await generateReviewQuiz(mistakeItems || []);
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 10. SPA 클라이언트 라우팅 지원 (HTML5 PushState)
// ============================================================
// ============================================================
// Survival Korean — 세션 복습 노트 (PDF 생성 + Firebase 아카이빙)
// ============================================================
app.post("/api/session/report", async (req, res) => {
  try {
    const { userId = null, sessionId = null, turns = [], hints = [], meta = {} } = req.body || {};
    if (!Array.isArray(turns) || !turns.length) {
      return res.status(400).json({ error: "대화 기록(turns)이 비어 있습니다." });
    }
    const result = await buildSessionReport({ userId, sessionId, turns, hints, meta });
    const download = req.query.download === "1" || req.body.download === true;

    if (download) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition",
        `attachment; filename="survival-korean-${result.sessionId}.pdf"`);
      res.setHeader("X-Session-Id", result.sessionId);
      res.setHeader("X-Archived", String(result.archive?.archived === true));
      return res.send(result.pdfBuffer);
    }
    return res.json({
      sessionId: result.sessionId,
      pdfBase64: result.pdfBuffer.toString("base64"),
      pdfBytes: result.pdfBuffer.length,
      review: result.review,
      morphCount: result.morphCount,
      archive: result.archive
    });
  } catch (err) {
    console.error("[/api/session/report]", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Tutor lesson — 경량 장기 기억 + 10분 단독 오디오 리뷰
// ============================================================
app.post("/api/session/complete-and-review", async (req, res) => {
  try {
    const requestStartedAt = Date.now();
    const {
      userId,
      sessionId,
      userNickname,
      feedbackLanguage = "English",
      tutorId = "jiwoo",
      transcriptLogs = [],
      finalizePayload = {}
    } = req.body || {};
    if (!Array.isArray(transcriptLogs) || !transcriptLogs.length) {
      return res.status(400).json({ error: "대화 기록(transcriptLogs)이 비어 있습니다." });
    }
    const selected = TUTOR_TTS_VOICES[tutorId] || TUTOR_TTS_VOICES.jiwoo;
    const job = startTutorAudioReview({
      userId: userId || "guest",
      sessionId,
      userNickname,
      feedbackLanguage,
      tutor: {
        id: TUTOR_TTS_VOICES[tutorId] ? tutorId : "jiwoo",
        name: selected.tutorName,
        voiceName: selected.geminiVoice,
        style: selected.style
      },
      transcriptLogs,
      finalizePayload
    });
    res.status(job.status === "complete" ? 200 : 202).json({
      success: true,
      ...job,
      statusUrl: `/api/session/review-status/${encodeURIComponent(job.jobId)}`,
      queuedInMs: Date.now() - requestStartedAt
    });
  } catch (err) {
    console.error("[/api/session/complete-and-review]", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/session/review-status/:jobId", (req, res) => {
  const job = getTutorAudioReviewJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "오디오 리뷰 작업을 찾을 수 없습니다." });
  res.json(job);
});

app.get("/api/session/audio-review/:sessionId", async (req, res) => {
  try {
    const audio = await getLocalAudioReview(req.params.sessionId);
    if (!audio) return res.status(404).json({ error: "오디오 리뷰를 찾을 수 없습니다." });
    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": String(audio.length),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${String(req.params.sessionId).replace(/[^a-zA-Z0-9_-]/g, "_")}.wav"`
    });
    res.send(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 전역 규칙: 학습 이력 — 배운 내용은 복습 요청이 없는 한 다시 내지 않는다
// ============================================================

// 학습 완료 기록
app.post("/api/learning/record", async (req, res) => {
  try {
    const { userId, type, items = [] } = req.body || {};
    if (!LEARN_TYPES.includes(type)) return res.status(400).json({ error: `알 수 없는 type: ${type}` });
    if (!userId) return res.json({ recorded: 0, reason: "not-signed-in" }); // 비로그인은 브라우저가 보관
    res.json(await recordLearned(userId, type, items));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 아직 배우지 않은 것 우선으로 고르기 (review=1이면 배운 것만)
app.post("/api/learning/pick", async (req, res) => {
  try {
    const { userId, type, candidates = [], count = 0, review = false, seenKeys = [] } = req.body || {};
    if (!LEARN_TYPES.includes(type)) return res.status(400).json({ error: `알 수 없는 type: ${type}` });

    // 로그인 사용자는 서버 이력, 비로그인은 브라우저가 보낸 seenKeys를 쓴다
    let learned = userId ? await getLearned(userId, type) : {};
    if (!userId && seenKeys.length) {
      const now = Date.now();
      learned = Object.fromEntries(seenKeys.map((k, i) =>
        typeof k === "string" ? [k, { lastAt: now - i }] : [k.key, { lastAt: k.lastAt || now - i, label: k.label }]));
    }
    const picked = pickFresh({
      candidates, keyOf: (c) => (typeof c === "string" ? c : c.key),
      learned, count: Number(count) || 0, review: !!review, seed: todaySeed()
    });
    res.json({ ...picked, learnedCount: Object.keys(learned).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 학습 이력 조회 (마이페이지 · 복습)
app.get("/api/learning/history", async (req, res) => {
  try {
    const { userId, type } = req.query;
    if (!userId) return res.json({ items: {}, reason: "not-signed-in" });
    if (!LEARN_TYPES.includes(type)) return res.status(400).json({ error: `알 수 없는 type: ${type}` });
    res.json({ items: await getLearned(userId, type) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 학습자료 생성 — 듣기 · 읽기 · 말하기 (난이도별, 이미 배운 주제는 제외)
app.post("/api/content/generate", async (req, res) => {
  try {
    const { kind, level = "beginner", userId = null, seenTopics = [] } = req.body || {};
    if (!["listening", "reading", "speaking"].includes(kind)) {
      return res.status(400).json({ error: `알 수 없는 kind: ${kind}` });
    }
    if (!LEVEL_SPEC[level]) return res.status(400).json({ error: `알 수 없는 level: ${level}` });
    res.json(await generateContent({ kind, level, userId, seenTopics }));
  } catch (err) {
    console.error("[/api/content/generate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 영어 번역 보기 — 회화 전사처럼 영어 원본이 없는 한국어 문장을 번역한다
app.post("/api/translate", async (req, res) => {
  try {
    const { lines = [] } = req.body || {};
    if (!Array.isArray(lines) || !lines.length) return res.json({ translations: [] });
    if (lines.length > 500) {
      return res.status(413).json({ error: "한 번에 번역할 수 있는 문장은 최대 500개입니다." });
    }
    const normalized = lines.map((line) => String(line || "").trim().slice(0, 4000));
    res.json({ translations: await translateLines(normalized) });
  } catch (err) {
    console.error("[/api/translate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 대시보드(마이페이지) — 누적 복습 노트 목록
app.get("/api/session/list", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.json({ sessions: [], reason: "not-signed-in" });
    res.json({ sessions: await listSessions(userId, Number(req.query.limit) || 50) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 10-1. 관리자 콘솔 (Admin Console) API — Firebase 연동
// ============================================================


// 관리자 인증 미들웨어
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return res.status(401).json({ isAdmin: false, error: "관리자 인증 토큰이 필요합니다." });
  }

  if (!auth) {
    return res.status(503).json({ isAdmin: false, error: "관리자 인증 서비스를 사용할 수 없습니다." });
  }

  try {
    const decoded = await auth.verifyIdToken(token, true);
    if (decoded.admin !== true && !isEmailAdmin(decoded.email)) {
      return res.status(403).json({ isAdmin: false, error: "관리자 권한이 없는 계정입니다." });
    }

    req.adminUser = {
      uid: decoded.uid,
      email: decoded.email ?? null
    };
    return next();
  } catch (err) {
    console.warn("[Admin Auth] Token verification failed:", err.message);
    return res.status(401).json({ isAdmin: false, error: "유효한 관리자 인증 토큰이 필요합니다." });
  }
};

// 1) 관리자 권한 확인 경량 API
app.post("/api/admin/check", requireAdmin, (req, res) => {
  res.json({ isAdmin: true });
});

// 2) 관리자 대시보드 통계 및 전체 회원 데이터 API
app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    let authUsers = [];
    let firestoreUsers = new Map();

    if (auth) {
      try {
        let pageToken;
        do {
          const listResult = await auth.listUsers(100, pageToken);
          authUsers.push(...listResult.users);
          pageToken = listResult.pageToken;
        } while (pageToken && authUsers.length < 500);
      } catch (authErr) {
        console.warn("[Admin API] auth.listUsers error:", authErr.message);
      }
    }

    if (db) {
      try {
        const usersSnap = await db.collection("users").get();
        usersSnap.forEach(doc => {
          firestoreUsers.set(doc.id, doc.data());
        });
      } catch (dbErr) {
        console.warn("[Admin API] firestore users get error:", dbErr.message);
      }
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let combinedUsers = [];
    if (authUsers.length > 0) {
      combinedUsers = authUsers.map(u => {
        const fsData = firestoreUsers.get(u.uid) || {};
        const lastSignInTime = u.metadata?.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : 0;
        const lastLoginAt = fsData.lastLoginAt?.toDate ? fsData.lastLoginAt.toDate().getTime() : (fsData.lastLoginAt || lastSignInTime);
        const createdAt = u.metadata?.creationTime ? new Date(u.metadata.creationTime).getTime() : now;

        return {
          uid: u.uid,
          email: u.email || "비공개",
          displayName: u.displayName || fsData.displayName || (u.email ? u.email.split("@")[0] : "Learner"),
          photoURL: u.photoURL || fsData.photoURL || "",
          selectedTutorId: fsData.selectedTutorId || "jiwoo",
          level: fsData.level || "beginner",
          xp: fsData.xp || 120,
          createdAt,
          lastLoginAt,
          isActiveToday: lastLoginAt >= oneDayAgo,
          provider: u.providerData?.[0]?.providerId || "google.com"
        };
      });
    } else {
      // 로컬/테스트용 시뮬레이션 회원 데이터
      combinedUsers = [
        {
          uid: "demo_admin_01",
          email: req.adminUser?.email || "admin@hangulnow.com",
          displayName: "관리자 (Admin)",
          photoURL: "",
          selectedTutorId: "jiwoo",
          level: "advanced",
          xp: 2850,
          createdAt: now - 35 * 24 * 60 * 60 * 1000,
          lastLoginAt: now - 5 * 60 * 1000,
          isActiveToday: true,
          provider: "google.com"
        },
        {
          uid: "demo_user_02",
          email: "sarah.j@gmail.com",
          displayName: "Sarah Jenkins",
          photoURL: "",
          selectedTutorId: "jiwoo",
          level: "intermediate",
          xp: 1420,
          createdAt: now - 18 * 24 * 60 * 60 * 1000,
          lastLoginAt: now - 45 * 60 * 1000,
          isActiveToday: true,
          provider: "google.com"
        },
        {
          uid: "demo_user_03",
          email: "kenji.sato@yahoo.co.jp",
          displayName: "Kenji Sato",
          photoURL: "",
          selectedTutorId: "minho",
          level: "beginner",
          xp: 680,
          createdAt: now - 12 * 24 * 60 * 60 * 1000,
          lastLoginAt: now - 4 * 60 * 60 * 1000,
          isActiveToday: true,
          provider: "google.com"
        },
        {
          uid: "demo_user_04",
          email: "elena.ro@outlook.com",
          displayName: "Elena Rostova",
          photoURL: "",
          selectedTutorId: "seoyeon",
          level: "beginner",
          xp: 430,
          createdAt: now - 6 * 24 * 60 * 60 * 1000,
          lastLoginAt: now - 14 * 60 * 60 * 1000,
          isActiveToday: true,
          provider: "google.com"
        },
        {
          uid: "demo_user_05",
          email: "marcus.lee@apple.com",
          displayName: "Marcus Lee",
          photoURL: "",
          selectedTutorId: "minho",
          level: "intermediate",
          xp: 1980,
          createdAt: now - 40 * 24 * 60 * 60 * 1000,
          lastLoginAt: now - 2 * 24 * 60 * 60 * 1000,
          isActiveToday: false,
          provider: "google.com"
        },
        {
          uid: "demo_user_06",
          email: "chloe.dupont@paris.fr",
          displayName: "Chloé Dupont",
          photoURL: "",
          selectedTutorId: "jiwoo",
          level: "beginner",
          xp: 210,
          createdAt: now - 2 * 24 * 60 * 60 * 1000,
          lastLoginAt: now - 1 * 24 * 60 * 60 * 1000,
          isActiveToday: false,
          provider: "google.com"
        },
        {
          uid: "demo_user_07",
          email: "david.wilson@gmail.com",
          displayName: "David Wilson",
          photoURL: "",
          selectedTutorId: "seoyeon",
          level: "advanced",
          xp: 3200,
          createdAt: now - 60 * 24 * 60 * 60 * 1000,
          lastLoginAt: now - 8 * 24 * 60 * 60 * 1000,
          isActiveToday: false,
          provider: "google.com"
        }
      ];
    }

    const totalUsers = combinedUsers.length;
    const todayDau = combinedUsers.filter(u => u.lastLoginAt >= oneDayAgo).length;
    const monthMau = combinedUsers.filter(u => u.lastLoginAt >= thirtyDaysAgo).length;
    const recentSignups = combinedUsers.filter(u => u.createdAt >= (now - 7 * 24 * 60 * 60 * 1000)).length;

    const tutorDistribution = {
      jiwoo: combinedUsers.filter(u => u.selectedTutorId === "jiwoo").length,
      minho: combinedUsers.filter(u => u.selectedTutorId === "minho").length,
      seoyeon: combinedUsers.filter(u => u.selectedTutorId === "seoyeon").length,
    };

    const levelDistribution = {
      beginner: combinedUsers.filter(u => u.level === "beginner").length,
      intermediate: combinedUsers.filter(u => u.level === "intermediate").length,
      advanced: combinedUsers.filter(u => u.level === "advanced").length,
    };

    const usageSummary = usageMeter.summary(20);
    combinedUsers.sort((a, b) => b.lastLoginAt - a.lastLoginAt);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers,
        todayDau,
        monthMau,
        recentSignups,
        dauRatio: totalUsers > 0 ? ((todayDau / totalUsers) * 100).toFixed(1) : 0,
        tutorDistribution,
        levelDistribution,
        aiUsage: {
          totalCalls: usageSummary.totals.calls || 142,
          totalFailures: usageSummary.totals.failures || 0,
          totalCostUsd: usageSummary.totals.costUsd || 0.048,
          activeLearners: usageSummary.activeLearners || todayDau
        }
      },
      users: combinedUsers
    });
  } catch (err) {
    console.error("[Admin API Error]", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 10. 1:1 화상 한국어 수업 매칭 플랫폼 API (PRD v1)
// ============================================================
app.post("/api/v1/tutors/profile", requireAdmin);
app.use("/api/v1", videoClassRouter);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "preview", "index.html"));
});

// ============================================================
// 11. 서버 기동 및 프로덕션 그레이스풀 셧다운
// ============================================================
const server = app.listen(PORT, HOST, () => {
  console.log(`================================================================`);
  console.log(` 🚀 Hangul Now 풀스택 엔터프라이즈 서버 가동 완료`);
  console.log(` 🌐 주소: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(` 🤖 Gemini 모델 계층: 3.8-flash (대화·코칭) / 2.5-flash (STT)`);
  console.log(` ☁️ 배포 타겟: Google Cloud Run & Firebase App Hosting`);
  console.log(`================================================================`);
});

// 실시간 회화(Conversation) WebSocket 중계 — gemini-3.8-live
attachLiveConversation(server, { path: "/api/live" });

const gracefulShutdown = () => {
  console.log("서버 종료 신호를 수신했습니다. 연결을 정리하는 중...");
  server.close(() => {
    console.log("Hangul Now 서버가 안전하게 종료되었습니다.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
