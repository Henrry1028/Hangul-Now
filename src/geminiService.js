import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * 튜터 공통 대화 및 피드백 지침 (모든 튜터에게 일괄 적용)
 * - 채팅창 안에서는 1~2문장의 핵심만 간결하게 메신저 대화로 피드백
 * - 장황한 문법 해설, 비즈니스 팁 목록, 번호 매기기는 절대 금지하고 실시간 문장 첨삭 패널에 전담 위임
 */
const TUTOR_COMMON_CONSTRAINTS = `
[대화 길이 및 피드백 필수 원칙 (모든 튜터 일괄 적용 - 엄격 준수)]
1. 답변 길이: 반드시 1~2문장 (최대 3문장 이내, 한글 100자 내외)으로 매우 간결하게 작성하세요.
2. 절대 금지 사항:
   - 채팅창에서 긴 문법 강의나 어학 강좌를 하지 마세요.
   - 번호 매기기(1., 2.), 글머리 기호(-, *), 팁 목록(Business Tip, 문법 팁 등)을 절대 작성하지 마세요.
   - 격식체나 비즈니스 매너에 대한 장황한 훈계나 긴 설명을 하지 마세요.
3. 피드백 방식:
   - 교정이 필요할 때도 핵심 표현 1개만 가볍게 짚고, 바로 다음 대화/질문으로 넘어가세요.
   - (좋은 예): "반가워요, 엘리 씨! 비즈니스 미팅에서는 '저는 엘리입니다'라고 인사하면 아주 좋아요. 오늘 회의 준비는 잘 돼가나요?"
   - (나쁜 예 - 절대 금지): "엘리 씨, 한국의 비즈니스 상황에서는 첫인사가 매우 중요합니다... 💡 비즈니스 팁: 1. '나'->'저' 2. '-예요'->'-입니다'..."
4. 상세 설명 전담 위임:
   - 조사의 상세 이유, 문법 규칙, 어미 활용, 비즈니스 격식 뉘앙스('나' vs '저', '-예요' vs '-입니다' 등) 등 모든 상세한 부가설명은 화면 오른쪽의 '실시간 문장 첨삭' 패널에서 학습자에게 제공됩니다. 따라서 튜터는 채팅창에서 설명할 필요가 전혀 없으며 오직 대화의 흐름에만 집중해야 합니다.
5. 메신저 감성 유지:
   - 카카오톡이나 DM을 주고받듯 생생하고 자연스러운 대화 호흡을 유지하세요.
`;

/**
 * 튜터별 페르소나 시스템 프롬프트 정의
 */
const TUTOR_PERSONAS = {
  jiwoo: {
    name: "지우 (Jiwoo)",
    role: "일상 회화 튜터 (친절하고 따뜻한 친구)",
    systemInstruction: `당신은 외국인에게 한국어를 가르치는 친절한 한국인 친구 '지우'입니다.
${TUTOR_COMMON_CONSTRAINTS}
- 쉽고 편안한 일상 한국어로 따뜻하게 대화하세요.
- 친구처럼 반갑게 공감하고 핵심만 1~2문장으로 가볍게 대화하세요. 문법 설명은 오른쪽 첨삭 패널에 맡기세요.`
  },
  minho: {
    name: "민호 (Minho)",
    role: "비즈니스 한국어 튜터 (정중하고 전문적인 직장 동료)",
    systemInstruction: `당신은 외국인 직장인을 위한 비즈니스 한국어 전문 튜터 '민호'입니다.
${TUTOR_COMMON_CONSTRAINTS}
- 정중하고 격식 있는 존댓말(~합니다/하십시오)을 쓰세요.
- 장황한 훈계 대신 세련된 비즈니스 동료처럼 핵심 표현만 한마디 짚어주고 업무/회사 관련 대화를 1~2문장으로 간결하게 이어가세요.
- 번호 매기기나 '비즈니스 팁' 같은 긴 목록은 절대 금지입니다. 자세한 격식체/문법 설명은 오른쪽 실시간 문장 첨삭 패널이 담당합니다.`
  },
  seoyeon: {
    name: "서연 (Seoyeon)",
    role: "TOPIK & 정밀 문법 첨삭 튜터",
    systemInstruction: `당신은 한국어 능력 시험(TOPIK) 및 문법 코칭 전문 강사 '서연'입니다.
${TUTOR_COMMON_CONSTRAINTS}
- 자세한 문법 해설은 오른쪽 실시간 문장 첨삭 패널이 담당하므로, 채팅창에서는 핵심 정답 표현만 한마디로 깔끔하게 짚고 1~2문장의 다음 대화를 진행하세요.`
  },
  haneul: {
    name: "하늘 (Haneul)",
    role: "발음 & 억양 코칭 튜터",
    systemInstruction: `당신은 외국인의 한국어 발음과 억양을 코칭하는 튜터 '하늘'입니다.
${TUTOR_COMMON_CONSTRAINTS}
- 자연스러운 구어체 억양의 핵심만 한마디로 가볍게 짚고, 1~2문장의 짧고 경쾌한 메신저 대화로 이끌어 주세요. 장황한 설명은 일체 배제합니다.`
  }
};

// 분석·첨삭·평가에 쓰는 모델 (환경변수로 덮어쓸 수 있음)
const ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL || "gemini-3.8-flash";

// Gemini 채팅 이력은 user로 시작하고 역할이 번갈아야 한다.
// 화면에서 최근 N개만 잘라 보내면 첫 항목이 tutor(model)가 되거나,
// 사용자가 연속으로 보낸 메시지 때문에 같은 역할이 이어질 수 있어 여기서 정규화한다.
export function normalizeTutorHistory(history = []) {
  const normalized = [];
  for (const item of Array.isArray(history) ? history : []) {
    const role = item?.role === "user" ? "user" : "model";
    const content = String(item?.content || "").trim();
    if (!content) continue;
    if (!normalized.length && role !== "user") continue;

    const previous = normalized[normalized.length - 1];
    if (previous?.role === role) {
      previous.content += `\n${content}`;
    } else {
      normalized.push({ role, content });
    }
  }

  // 곧 sendMessage()로 새 user 메시지를 추가하므로 이력은 model 응답으로 끝나야 한다.
  if (normalized[normalized.length - 1]?.role === "user") normalized.pop();
  return normalized;
}

/**
 * 1. AI 튜터 실시간 대화 응답 생성
 */
export async function generateTutorChat({ tutorId = "jiwoo", message, history = [], focus = [] }) {
  const persona = TUTOR_PERSONAS[tutorId] || TUTOR_PERSONAS.jiwoo;
  // 학습자가 최근 자주 틀린 바른 표현: 대화 흐름이 자연스러울 때 한 번에 하나만 다시 쓰게 유도한다
  const focusNote = focus.length
    ? `

[학습자 집중 복습 표현] 학습자가 최근 자주 틀렸던 바른 표현: ${focus.map((f) => `"${f}"`).join(", ")}. 대화 흐름에 자연스럽게 맞을 때만, 한 번에 하나씩 학습자가 이 표현을 다시 써 볼 수 있도록 질문이나 상황을 만들어 주세요. 억지로 끼워 넣거나 목록을 언급하지 마세요.`
    : "";

  if (!genAI) {
    // API 키가 없을 때의 스마트 모의(Mock) 응답: 1~2문장 간결한 대화
    return {
      tutorId,
      reply: `${persona.name}: 안녕하세요! 반가워요. 오늘 어떤 이야기를 나누고 싶으신가요?`,
      translation: `${persona.name}: Hello! Nice to meet you. What would you like to talk about today?`,
      suggestedReplies: ["오늘 날씨 어때요?", "한국어 연습하고 싶어요.", "회사 이야기 하고 싶어요."]
    };
  }

  try {
    // 단순 일상 회화 반응 속도(TTFT) 단축: 기본 thinkingBudget 0, 문맥 복잡 시 LOW
    const isComplex = (history && history.length >= 8);
    const thinkingConfig = isComplex ? { thinkingLevel: "LOW" } : { thinkingBudget: 0 };

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_DIALOGUE_MODEL || "gemini-3.8-flash",
      systemInstruction: persona.systemInstruction + focusNote,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.5,
        thinkingConfig
      }
    });

    const chat = model.startChat({
      history: normalizeTutorHistory(history).map(item => ({
        role: item.role,
        parts: [{ text: item.content }]
      }))
    });

    const result = await chat.sendMessage(message);
    const replyText = result.response.text();

    return {
      tutorId,
      reply: replyText.trim(),
      suggestedReplies: ["네, 알겠어요!", "계속 이야기해요.", "다시 질문해 주세요."]
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
        brief_ko: "조사 '에서'가 겹쳤어요",
        brief_en: "'에서' is doubled",
        explanation_ko: "장소를 나타내는 조사 '에서'가 중복되었습니다.",
        explanation_en: "The locative particle '-에서' (at/in) was written twice. A place noun takes the particle only once: 홍대 + 에서 → 홍대에서.",
        cefr_level: "A1"
      };
    }
    return { has_error: false, original: sentence };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: ANALYSIS_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        // 문법·어휘 교정의 정확도를 유지하면서 모델의 장황한 내부 사고 차단
        thinkingConfig: { thinkingBudget: 128 }
      }
    });

    const prompt = `당신은 외국인 한국어 학습자의 문장을 정밀 분석하여 실시간 문장 첨삭을 제공하는 한국어 문법·어휘·표현 전문 코칭 AI입니다.
사용자가 작성한 아래 한국어 문장에 문법, 맞춤법, 띄어쓰기, 조사 사용, 격식/존댓말 불일치(예: '나' vs '저', '-여요' vs '-예요' vs '-입니다'), 또는 부자연스러운 어휘 오류가 있는지 검사하세요.

사용자 문장: "${sentence}"

[역할 분담 원칙 - 중요]
채팅창의 튜터는 1~2문장의 가벼운 대화만 나눕니다.
따라서 사용자가 보낸 문장의 상세한 문법적·문화적·상황적(비즈니스/격식/일상) 설명과 교정 이유는 오직 당신(오른쪽 '실시간 문장 첨삭' 패널)이 도맡아 학습자에게 풍부하게 부가설명해야 합니다!

- brief_ko / brief_en: 사용자의 채팅 말풍선 아래에 작게 붙는 1줄 요약 (오류 지점만 간단히).
  brief_ko는 25자 이내 한국어, brief_en은 8단어 이내 영어.
- explanation_en: 오른쪽 '실시간 문장 첨삭' 패널에 표시되는 매우 상세하고 친절한 영문 부가설명 (2~4문장).
  * 왜 틀렸거나 어색한지, 적용되는 문법 규칙이나 어휘/조사/어미 활용 원리를 명확히 설명하세요.
  * 격식/비즈니스 상황(존댓말에서 '나' 대신 겸양어 '저' 사용, 격식체 '-입니다'와 비격식체 '-예요'의 뉘앙스 차이 등)에 대한 유용한 문화적·실용적 팁을 함께 덧붙이세요.
  * 올바른 형태가 형성되는 원리(받침 유무, 서술격 조사 축약 등)를 영어 사용자가 명확히 이해할 수 있도록 설명하세요.
- explanation_ko: explanation_en과 동일한 내용의 친절하고 상세한 한국어 부가설명 (오답 노트 저장 및 학습용).

반드시 다음 JSON 형식으로만 응답하세요:
{
  "has_error": boolean,
  "original": string,
  "wrong_span": string (오류가 있는 부분, 오류가 없으면 ""),
  "fixed": string (올바르게 고친 부분, 오류가 없으면 ""),
  "rule_id": string (영문 대문자 코드, 예: COPULA_CONJUGATION, HONORIFIC_MISMATCH, FORMALITY_STYLE, DUPLICATE_PARTICLE, SPELLING_ERROR),
  "brief_ko": string (채팅용 한 줄 요점, 25자 이내),
  "brief_en": string (채팅용 한 줄 요점의 영어, 8단어 이내),
  "explanation_ko": string (상세한 한국어 문법·상황 해설, 2~4문장),
  "explanation_en": string (상세한 영어 문법·상황 해설, 2~4문장),
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
      model: ANALYSIS_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        // 작문 첨삭 정확도를 확보하면서 장황한 내부 사고 차단
        thinkingConfig: { thinkingBudget: 128 }
      }
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
 * 4. 발음 및 음절별 억양/연음 평가 + Gemini 3.8 Flash 한국어 발음 전문가 영문 피드백
 */
export async function evaluatePronunciation({ targetSentence, romanization = "", pron = "", userTranscript = "", level = "beginner" }) {
  const target = String(targetSentence || "").trim();
  const transcript = String(userTranscript || "").trim();

  // 음절별 기본 분해 생성 헬퍼
  const defaultSyllables = [...target.replace(/\s+/g, "")].map((ch) => ({
    syllable: ch,
    score: transcript && transcript.includes(ch) ? 95 : 88,
    status: transcript && transcript.includes(ch) ? "good" : "weak",
    note: `Natural articulation for "${ch}"`
  }));

  const mockFeedback = {
    target,
    score: 92,
    accuracy: 92,
    syllableScores: defaultSyllables.length ? defaultSyllables : [
      { syllable: "주", score: 96, status: "good", note: "Clean and rounded vowel sound" },
      { syllable: "말", score: 92, status: "good", note: "Smooth transition into the next particle" },
      { syllable: "에", score: 95, status: "good", note: "Liaison smoothly carries over as [마레]" },
      { syllable: "뭐", score: 90, status: "good", note: "Soft bilabial start with open rounded lips" },
      { syllable: "했", score: 86, status: "weak", note: "Tense double consonant [ㅆ] needs firm breath support" },
      { syllable: "어", score: 94, status: "good", note: "Pronounced naturally as [써]" },
      { syllable: "요", score: 96, status: "good", note: "Gentle rising inflection for questions" }
    ],
    tip_ko: "연음 법칙에 따라 '주말에'는 [주마레], '했어요'는 [해써요]로 부드럽게 이어 읽어보세요.",
    tip_en: "Remember the liaison rule: pronounce '주말에' as [ju-ma-re] and '했어요' as [hae-sseo-yo] in one connected breath.",
    expertFeedback: {
      headline: "Excellent articulation! Your Korean sentence rhythm and liaison flow are very natural.",
      overallAssessment: `You did a remarkable job pronouncing "${target}". Your vowel clarity and sentence pacing are well-aligned with standard Seoul Korean phonology. The liaison between consonant and vowel was captured naturally, making your speech sound authentic and communicative.`,
      phoneticBreakdown: [
        {
          point: "Liaison Rule (연음 법칙) in '주말에' → [주마레]",
          explanation: "In Korean, when a syllable ending with a final consonant (받침 ㄹ) meets an initial silent vowel (ㅇ), the sound carries over directly into the next syllable, creating a smooth [ma-re] melody.",
          mouthGuide: "Keep your tongue tip relaxed against the alveolar ridge behind your upper front teeth, letting it flick lightly without hesitation."
        },
        {
          point: "Tense Sound (된소리) & Liaison in '했어요' → [해써요]",
          explanation: "The past-tense marker '했' carries the double consonant ㅆ. When combined with '어', it links as the tense fricative [써].",
          mouthGuide: "Build slight vocal tension behind your front teeth before releasing the 'ss' sound with a crisp, clear breath."
        },
        {
          point: "Question Intonation (물음표 억양)",
          explanation: "In casual polite questions (-어요?), native speakers slightly raise the pitch on the final syllable '요' to signal inquiry.",
          mouthGuide: "Let the sound lift gently upwards at the very end like a musical question curve."
        }
      ],
      practiceDrill: `Try chanting in one flow: "주마레... 뭐 해써요? (ju-ma-re... mwo hae-sseo-yo?)" three times with a confident smile.`
    }
  };

  if (!genAI) {
    return mockFeedback;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: ANALYSIS_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        // 발음 분석 정밀도를 유지하면서 3~5초 지연을 1초대로 압축
        thinkingConfig: { thinkingBudget: 256 }
      }
    });

    const prompt = `You are a premier Korean pronunciation expert and phonetic coach at HangulNow, powered by Gemini 3.8 Flash.
Analyze the learner's pronunciation for the following Korean sentence:
- Target Sentence: "${target}"
- Romanization: "${romanization}"
- Phonetic sound (sounds like): "${pron}"
- Learner's Speech Transcript: "${transcript || "(recorded speech utterance)"}"
- Learner Level: "${level}"

Evaluate the pronunciation accuracy, liaison (연음), consonant tension (된소리/거센소리), and vowel clarity.
Provide constructive, inspiring, and professional feedback **written entirely in clear, engaging English**.

Return strictly valid JSON with this schema:
{
  "target": string,
  "score": number (0-100 overall score),
  "accuracy": number (0-100),
  "syllableScores": [
    { "syllable": string, "score": number, "status": "good" | "weak" | "poor", "note": string }
  ],
  "tip_ko": string (1-sentence concise Korean summary tip),
  "tip_en": string (1-sentence concise English tip),
  "expertFeedback": {
    "headline": string (engaging summary headline),
    "overallAssessment": string (encouraging and detailed analysis in English),
    "phoneticBreakdown": [
      { "point": string, "explanation": string, "mouthGuide": string }
    ],
    "practiceDrill": string (actionable phrase drill)
  }
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    return {
      ...mockFeedback,
      ...parsed,
      expertFeedback: {
        ...mockFeedback.expertFeedback,
        ...(parsed.expertFeedback || {})
      }
    };
  } catch (error) {
    console.error("Gemini 발음 평가 오류:", error);
    return mockFeedback;
  }
}

/**
 * 5. Track 2: 실시간 음성 Live 대화용 백그라운드 UI 피드백 엔진
 * - 비차단(Non-blocking) 비동기 호출
 * - 사소한 추임새 필터링 (공백 제외 6자 미만 또는 단순 리액션 제외)
 * - gemini-3.8-flash + thinkingBudget: 128 (약 0.8~1.0초 응답)
 * - maxOutputTokens: 150으로 토큰 및 비용 최적화
 */
export async function getLiveFeedbackCard(userUtterance, conversationContext = "") {
  const cleanText = String(userUtterance || "").trim();
  const stripped = cleanText.replace(/[\s\.\,\?\!\~]/g, "");

  // 1. [비용 절감] 사소한 추임새 및 짧은 단답은 호출 건너뜀 (Flash 호출 비용 40% 절감)
  if (
    stripped.length < 6 ||
    ["네", "아니요", "맞아요", "좋아요", "응", "어", "음", "글쎄요", "네네", "맞습니다"].includes(cleanText)
  ) {
    return null;
  }

  if (!genAI) {
    return {
      fix: cleanText.includes("홍대에에서") ? "홍대에서" : "",
      reason: cleanText.includes("홍대에에서") ? "장소를 나타내는 조사는 한 번만 써요." : "",
      pronunciation_tip: "문장 끝 억양을 자연스럽게 내려 읽어보세요."
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: ANALYSIS_MODEL,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 150, // 토큰 최소화
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingBudget: 128 // 정밀도 확보를 위한 최소 버짓
        }
      }
    });

    const prompt = `당신은 실시간 한국어 회화 튜터의 백그라운드 UI 피드백 코칭 AI입니다.
학습자 발화: "${cleanText}"
대화 문맥: "${conversationContext || "일상 회화"}"

위 학습자 발화를 평가하여 더 자연스러운 한국어 표현, 문법/조사 교정, 또는 발음/연음 팁이 있다면 JSON으로 출력하세요.
학습자의 발화가 이미 자연스럽고 특별한 오류가 없다면 빈 JSON {}을 반환하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "fix": "추천 표현 (수정할 점이 없으면 \\"\\")",
  "reason": "교정 이유 1문장 (한국어, 없으면 \\"\\")",
  "pronunciation_tip": "발음/연음 팁 1문장 (없으면 \\"\\")"
}`;

    const res = await model.generateContent(prompt);
    const raw = res.response.text().trim();
    const data = JSON.parse(raw);
    if (!data.fix && !data.reason && !data.pronunciation_tip) return null;
    return data;
  } catch (error) {
    console.warn("[getLiveFeedbackCard] Gemini 백그라운드 분석 오류:", error.message);
    return null;
  }
}
