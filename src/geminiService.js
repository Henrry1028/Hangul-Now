import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * 튜터별 페르소나 시스템 프롬프트 정의
 */
const TUTOR_PERSONAS = {
  jiwoo: {
    name: "지우 (Jiwoo)",
    role: "일상 회화 튜터 (친절하고 천천히 대화하는 친구)",
    systemInstruction: `당신은 외국인에게 한국어를 가르치는 친절한 한국인 친구 '지우'입니다.
- 학습자의 한국어 수준에 맞추어 쉽고 자연스러운 일상 한국어로 답장하세요.
- 말하기 속도가 느린 페르소나이므로 너무 길지 않은 1~3문장으로 답하세요.
- 필요할 경우 괄호 안에 쉬운 영어 설명을 덧붙여도 좋습니다.
- 대화는 메신저(카카오톡/DM) 스타일로 친근하게 진행하세요.`
  },
  minho: {
    name: "민호 (Minho)",
    role: "비즈니스 한국어 튜터 (정중하고 전문적인 직장 동료)",
    systemInstruction: `당신은 외국인 직장인을 위한 비즈니스 한국어 전문 튜터 '민호'입니다.
- 비즈니스 상황(이메일, 미팅, 보고, 존댓말)에 알맞은 정중하고 격식 있는 한국어로 응답하세요.
- 비즈니스 매너와 적절한 높임말 표현을 자연스럽게 유도해 주세요.`
  },
  sujin: {
    name: "수진 (Sujin)",
    role: "TOPIK & 심화 한국어 튜터",
    systemInstruction: `당신은 한국어 능력 시험(TOPIK) 및 고급 어휘/문법을 가르치는 전문 강사 '수진'입니다.
- 다양한 어휘와 문형을 학습자가 활용할 수 있도록 지도하고 격려해 주세요.`
  }
};

/**
 * 1. AI 튜터 실시간 대화 응답 생성
 */
export async function generateTutorChat({ tutorId = "jiwoo", message, history = [] }) {
  const persona = TUTOR_PERSONAS[tutorId] || TUTOR_PERSONAS.jiwoo;

  if (!genAI) {
    // API 키가 없을 때의 스마트 모의(Mock) 응답
    return {
      tutorId,
      reply: `[데모 모드] ${persona.name}: 안녕하세요! 한국어 연습을 시작해 볼까요? 당신의 메시지: "${message}"`,
      translation: `[Demo Mode] ${persona.name}: Hello! Shall we start practicing Korean? Your message: "${message}"`,
      suggestedReplies: ["네, 좋아요!", "오늘 날씨 어때요?", "한국어 공부하고 있어요."]
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: persona.systemInstruction
    });

    const chat = model.startChat({
      history: history.map(item => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.content }]
      }))
    });

    const result = await chat.sendMessage(message);
    const replyText = result.response.text();

    return {
      tutorId,
      reply: replyText.trim(),
      suggestedReplies: ["네, 알겠어요!", "다시 말해 주세요.", "이해가 안 돼요."]
    };
  } catch (error) {
    console.error("Gemini 튜터 대화 생성 오류:", error);
    return {
      tutorId,
      reply: "죄송해요, 잠시 생각하는 중 오류가 발생했어요. 다시 말씀해 주시겠어요?",
      error: error.message
    };
  }
}

/**
 * 2. 실시간 문장 오류 감지 및 교정 카드 생성 (JSON Structured Output)
 */
export async function analyzeSentenceCorrection(sentence) {
  if (!genAI) {
    // Mock 응답
    const hasError = sentence.includes("홍대에에서") || sentence.includes("맛있었어서");
    if (hasError) {
      return {
        has_error: true,
        original: sentence,
        wrong_span: sentence.includes("홍대에에서") ? "홍대에에서" : "맛있었어서",
        fixed: sentence.includes("홍대에에서") ? "홍대에서" : "맛있어서",
        rule_id: "DUPLICATE_PARTICLE",
        explanation_ko: "장소를 나타내는 조사 '에서'가 중복되었습니다.",
        explanation_en: "The locative particle '-eseo' was repeated.",
        cefr_level: "A1"
      };
    }
    return { has_error: false, original: sentence };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `당신은 외국인 한국어 학습자의 문장을 검토하는 한국어 문법 교정 전문가입니다.
사용자가 작성한 아래 한국어 문장에 문법, 맞춤법, 띄어쓰기 또는 부자연스러운 어휘 오류가 있는지 검사하세요.

사용자 문장: "${sentence}"

반드시 다음 JSON 형식으로만 응답하세요:
{
  "has_error": boolean,
  "original": string,
  "wrong_span": string (오류가 있는 부분, 오류가 없으면 ""),
  "fixed": string (올바르게 고친 부분, 오류가 없으면 ""),
  "rule_id": string (영문 대문자 코드, 예: DUPLICATE_PARTICLE, TENSE_ERROR, SPELLING_ERROR),
  "explanation_ko": string (한국어 문법 설명),
  "explanation_en": string (영어 문법 설명),
  "cefr_level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    return parsed;
  } catch (error) {
    console.error("Gemini 문장 교정 분석 오류:", error);
    return {
      has_error: false,
      original: sentence,
      error: error.message
    };
  }
}

/**
 * 3. 작문 첨삭 및 문장 단위 피드백
 */
export async function reviewWriting({ topic, content }) {
  if (!genAI) {
    return {
      topic,
      original: content,
      revised: content.replace(/에에서/g, "에서").replace(/맛있었어서/g, "맛있어서"),
      diff: [
        { type: "context", text: "지난 주말에 친구를 만났어요. 우리는 " },
        { type: "delete", text: "홍대에에서" },
        { type: "insert", text: "홍대에서" },
        { type: "context", text: " 떡볶이를 먹었어요. 정말 " },
        { type: "delete", text: "맛있었어서" },
        { type: "insert", text: "맛있어서" },
        { type: "context", text: " 또 가고 싶어요." }
      ],
      score: 85,
      feedback_ko: "자연스러운 문장 구성이며, 조사 중복만 주의하시면 완벽합니다!",
      feedback_en: "Natural sentence structure, just watch out for duplicate particles!"
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `한국어 작문 첨삭 전문가로서 다음 작문을 첨삭해 주세요.
주제: ${topic || "자유 작문"}
작문 내용: "${content}"

JSON 응답 규격:
{
  "topic": string,
  "original": string,
  "revised": string (첨삭된 전체 완성 문장),
  "score": number (1~100 점수),
  "feedback_ko": string (한국어 총평),
  "feedback_en": string (영어 총평),
  "rules": [
    { "category": string, "wrong": string, "correct": string, "reason": string }
  ]
}`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Gemini 작문 첨삭 오류:", error);
    return { error: error.message };
  }
}

/**
 * 4. 발음 및 음절별 억양/연음 평가
 */
export async function evaluatePronunciation({ targetSentence, romanization, userTranscript }) {
  if (!genAI) {
    return {
      target: targetSentence,
      score: 92,
      syllableScores: [
        { syllable: "안", score: 98, status: "good" },
        { syllable: "녕", score: 95, status: "good" },
        { syllable: "하", score: 90, status: "good" },
        { syllable: "세", score: 88, status: "good" },
        { syllable: "요", score: 91, status: "good" }
      ],
      tip_ko: "마지막 '요'의 음높이를 자연스럽게 내려보세요.",
      tip_en: "Try lowering your pitch naturally on the final syllable 'yo'."
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `한국어 발음 평가 코치로서 아래 목표 문장과 학습자의 발음 결과를 평가해 주세요.
목표 문장: "${targetSentence}" (로마자: ${romanization})
학습자 발화: "${userTranscript}"

JSON 규격:
{
  "target": string,
  "score": number (0~100 종합 점수),
  "syllableScores": [
    { "syllable": string, "score": number, "status": "good" | "weak" | "poor" }
  ],
  "tip_ko": string (한국어 튜터 팁),
  "tip_en": string (영어 튜터 팁)
}`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Gemini 발음 평가 오류:", error);
    return { error: error.message };
  }
}
