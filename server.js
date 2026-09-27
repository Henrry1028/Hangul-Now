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

import { usageMeter } from "./src/usage-meter.mjs";
import { db, auth, storage, isInitialized as isFirebaseReady } from "./src/firebase.js";

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
  jiwoo: { name: "ko-KR-Neural2-A", gender: "FEMALE", speakingRate: 0.9, pitch: 1 },
  minho: { name: "ko-KR-Neural2-C", gender: "MALE", speakingRate: 0.98, pitch: -1 },
  seoyeon: { name: "ko-KR-Neural2-B", gender: "FEMALE", speakingRate: 0.88, pitch: -0.5 },
  haneul: { name: "ko-KR-Neural2-C", gender: "MALE", speakingRate: 0.88, pitch: 1.5 }
});

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
        coaching: process.env.GEMINI_PREMIUM_MODEL || "gemini-3.7-flash",
        stt: "gemini-2.5-flash",
        tts: "Google Cloud TTS Neural2"
      },
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
    const { userText, userAudio, tutorId = "jiwoo", history = [] } = req.body;

    if (!userText && !userAudio) {
      return res.status(400).json({ error: "userText 또는 userAudio 가 필요합니다." });
    }

    const coachingResult = await executeMultiAgentCoaching({
      userText: userText || "",
      userAudio: userAudio || null,
      tutorId,
      conversationHistory: history,
      targetSentence: req.body.targetSentence
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
    const text = String(req.body?.text || "").trim();
    const tutorId = TUTOR_TTS_VOICES[req.body?.tutorId] ? req.body.tutorId : "jiwoo";

    if (!text || !/[ㄱ-ㅎㅏ-ㅣ가-힣]/u.test(text)) {
      return res.status(400).json({ error: "읽을 한글 텍스트가 필요합니다." });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "한 번에 읽을 수 있는 텍스트는 500자까지입니다." });
    }

    const voice = TUTOR_TTS_VOICES[tutorId];
    const client = getCloudTtsClient();
    if (!client) {
      return res.status(503).json({ error: "Google Cloud TTS 인증 정보가 설정되지 않았습니다." });
    }
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
  console.log(` 🤖 Gemini 모델 계층: 3.8-flash (대화) / 3.7-flash (코칭) / 2.5-flash (STT)`);
  console.log(` ☁️ 배포 타겟: Google Cloud Run & Firebase App Hosting`);
  console.log(`================================================================`);
});

const gracefulShutdown = () => {
  console.log("서버 종료 신호를 수신했습니다. 연결을 정리하는 중...");
  server.close(() => {
    console.log("Hangul Now 서버가 안전하게 종료되었습니다.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
