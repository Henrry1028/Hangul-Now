// ============================================================
// 학습자료 생성 (듣기 · 읽기 · 말하기)
// gemini-3.5-flash-lite로 초고속(1~3초) 난이도 맞춤형 새 자료를 만든다.
// 전역 규칙: 이미 학습한 주제는 제외하고 매번 새로운 내용을 만든다.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLearned, recordLearned } from "./learningHistory.js";

const MODEL = process.env.GEMINI_CONTENT_MODEL || "gemini-3.5-flash-lite";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_CONTENT_TIMEOUT_MS) || 25_000;
const READING_CORE_TOKENS = { beginner: 900, intermediate: 1300, advanced: 1700 };
const READING_DETAIL_TOKENS = { beginner: 1000, intermediate: 1200, advanced: 1400 };

// 세 영역 공통 난이도 기준 — 어디서든 같은 기준으로 적용된다
export const LEVEL_SPEC = {
  beginner: {
    ko: "초급", topik: "TOPIK 1~2급",
    listening: "2~3문장씩 오가는 짧은 대화 6줄. 아주 흔한 일상 상황(주문, 인사, 길 묻기). 천천히 또박또박한 말투.",
    reading: "3문장짜리 문단 2개. 현재형 위주, 기초 단어만.",
    speaking: "6~10자 내외의 짧은 문장. 받침과 기본 연음 위주."
  },
  intermediate: {
    ko: "중급", topik: "TOPIK 3~4급",
    listening: "8줄 정도의 대화. 이유를 설명하거나 의견을 말하는 장면. 보통 속도.",
    reading: "4~5문장짜리 문단 3개. 과거·이유·비교 표현 포함.",
    speaking: "12~18자 문장. 경음화·비음화 같은 발음 규칙이 들어간 문장."
  },
  advanced: {
    ko: "고급", topik: "TOPIK 5~6급",
    listening: "10줄 정도의 대화. 협상·불만 접수·사회적 이슈·의견 충돌처럼 깊이 있는 장면. 사자성어, 관용구, 자연스러운 고급 구어체 포함. 단순 일상 표현을 지양하고 수준 높은 어휘 사용.",
    reading: "5~6문장짜리 문단 3개. 사자성어, 관용 표현, 한국 문화·사회적 깊이 있는 소재, 격식체(하십시오체 또는 설명문 해라체). 어학당 고급 교재 수준의 풍부한 어휘 사용.",
    speaking: "20자 이상의 긴 문장. 복합 받침 연음, 비음화, 유음화 등 고급 음운 변동과 끊어 읽기 호흡이 중요한 문장."
  }
};

function genAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  return new GoogleGenerativeAI(key);
}

async function askJson(prompt, { maxOutputTokens = 2200, operation = "content" } = {}) {
  const generationConfig = {
    responseMimeType: "application/json",
    maxOutputTokens
  };
  // 모델에 따라 thinkingBudget 처리 (3.8 등 reasoning 모델일 경우 사고 지연 차단)
  if (MODEL.includes("3.8") || MODEL.includes("thinking")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const model = genAI().getGenerativeModel({
    model: MODEL,
    generationConfig
  });
  const startedAt = Date.now();
  console.info("[content.generate] gemini:start", { operation, model: MODEL, maxOutputTokens });
  try {
    const res = await model.generateContent(prompt, { timeout: GEMINI_TIMEOUT_MS });
    const raw = res.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    console.info("[content.generate] gemini:success", { operation, durationMs: Date.now() - startedAt });
    return parsed;

  } catch (error) {
    console.error("[content.generate] gemini:failed", {
      operation,
      durationMs: Date.now() - startedAt,
      error: error?.message || String(error)
    });
    throw error;
  }
}

function normalizeDictations(data) {
  const script = Array.isArray(data?.script) ? data.script : [];
  const supplied = Array.isArray(data?.dictations)
    ? data.dictations
    : data?.dictation
      ? [data.dictation]
      : [];
  const normalized = [];

  const add = (item) => {
    const sentence = String(item?.sentence || "").trim();
    const answer = String(item?.answer || "").trim();
    if (!sentence || !answer || !sentence.includes(answer)) return;
    if (normalized.some((x) => x.sentence === sentence && x.answer === answer)) return;
    const scriptLine = script.find((line) => line?.text === sentence);
    normalized.push({
      sentence,
      answer,
      en: String(item?.en || scriptLine?.en || "").trim(),
      hintKo: String(item?.hintKo || "대화에서 들린 핵심 단어를 써 보세요.").trim(),
      hintEn: String(item?.hintEn || "Type the key word you hear.").trim(),
      okKo: String(item?.okKo || `정답이에요. “${answer}”가 들어가요.`).trim(),
      okEn: String(item?.okEn || `Correct — “${answer}” completes the sentence.`).trim()
    });
  };

  supplied.forEach(add);
  for (const line of script) {
    if (normalized.length >= 3) break;
    const words = String(line?.text || "")
      .split(/\s+/)
      .map((word) => word.replace(/^[^가-힣]+|[^가-힣]+$/g, ""))
      .filter((word) => word.length >= 2)
      .sort((a, b) => b.length - a.length);
    if (words[0]) add({ sentence: line.text, answer: words[0], en: line.en });
  }

  return normalized.slice(0, 3);
}

function normalizeSpeaking(data, level = "beginner") {
  const sentences = Array.isArray(data?.sentences) ? data.sentences : [];
  const normalized = sentences.slice(0, 3).map((item, index) => {
    const text = String(item?.text || "").trim();
    return {
      text: text || (level === "advanced" ? "끊임없는 자기 성찰과 학습이 필요합니다." : "안녕하세요, 만나서 반갑습니다."),
      roman: String(item?.roman || "").trim(),
      en: String(item?.en || "").trim(),
      pron: String(item?.pron || `[${text || ""}]`).trim(),
      weakIndex: Array.isArray(item?.weakIndex) ? item.weakIndex.filter((n) => Number.isInteger(n)) : [0, 2],
      tipKo: String(item?.tipKo || "자연스러운 연음과 받침 발음에 유의하세요.").trim(),
      tipEn: String(item?.tipEn || "Pay attention to natural linking and final consonants.").trim()
    };
  });
  return {
    topic: String(data?.topic || "일상 표현"),
    sentences: normalized.length ? normalized : [{
      text: "안녕하세요, 만나서 반갑습니다.",
      roman: "annyeonghaseyo, mannaseo bangapssumnida",
      en: "Hello, nice to meet you.",
      pron: "[안녕핫세여, 만나서 반갑씀니다]",
      weakIndex: [0, 4],
      tipKo: "부드럽게 이어 발음하세요.",
      tipEn: "Pronounce smoothly."
    }]
  };
}

const avoidBlock = (covered) =>
  covered.length
    ? `\n[이미 학습한 주제 — 반드시 피할 것]\n${covered.map((t) => "- " + t).join("\n")}\n위와 겹치지 않는 완전히 새로운 소재로 만들어라.\n`
    : "";

const levelPromptGuidance = (level) => {
  if (level === "advanced") {
    return "\n[고급 레벨 필수 지침: TOPIK 5~6급]\n단순한 일상 대화에 머물지 말고, 사자성어, 관용구, 비유적 표현, 사회·문화적 어휘를 풍부하게 활용하여 깊이 있고 격식 있는 한국어로 구성하라.\n";
  }
  if (level === "intermediate") {
    return "\n[중급 레벨 지침: TOPIK 3~4급]\n이유·원인(-아서/어서, -기 때문에), 비교, 과거 경험 등 복문 구조와 다양한 연결어미를 적절히 사용하라.\n";
  }
  return "\n[초급 레벨 지침: TOPIK 1~2급]\n기초 어휘와 명확한 주어-서술어 구조 위주로 이해하기 쉽게 구성하라.\n";
};

// ── 듣기 ────────────────────────────────────────────────
export async function generateListening({ level = "beginner", covered = [] }) {
  const L = LEVEL_SPEC[level] || LEVEL_SPEC.beginner;
  const data = await askJson(`너는 한국어 교재를 만드는 30년차 어학당 교사다.
${L.ko}(${L.topik}) 학습자를 위한 '듣기 연습' 자료를 하나 만들어라.
조건: ${L.listening}
${levelPromptGuidance(level)}
${avoidBlock(covered)}
반드시 아래 JSON 형식으로만 답하라.
{
  "topic": "이 자료의 주제 (예: 카페에서 주문하기)",
  "topicEn": "Natural English translation of the topic",
  "script": [{"whoKo":"직원","whoEn":"Staff","text":"한국어 대사","en":"영어 번역"}],
  "questions": [{"q":"한국어 질문","en":"영어 질문","opts":["보기1","보기2","보기3"],"optsEn":["English option 1","English option 2","English option 3"],"a":0}],
  "dictations": [{"sentence":"대본에 나오는 문장 한 줄 (정답 단어를 그대로 포함할 것)","answer":"그 문장 안의 정답 단어 또는 짧은 구","en":"sentence 전체의 자연스러운 영어 번역","hintKo":"한국어 힌트","hintEn":"영어 힌트","okKo":"정답일 때 한국어 설명","okEn":"정답일 때 영어 설명"}]
}
questions와 dictations는 각각 정확히 3개. opts와 optsEn은 각각 정확히 3개이고 같은 인덱스끼리 정확한 번역이어야 한다. a는 정답 인덱스(0~2). 모든 en, topicEn, optsEn, hintEn, okEn 필드는 자연스러운 영어로 채운다. dictations의 각 sentence는 서로 다른 script 대사 한 줄을 그대로 쓰고, answer는 해당 문장 안에 반드시 그대로 포함되어야 한다.`, { maxOutputTokens: 2200 });
  const dictations = normalizeDictations(data);
  return { ...data, dictations, dictation: dictations[0] || null };
}

// ── 읽기 ────────────────────────────────────────────────
export async function generateReadingCore({ level = "beginner", covered = [] }) {
  const L = LEVEL_SPEC[level] || LEVEL_SPEC.beginner;
  return askJson(`너는 한국어 교재를 만드는 30년차 어학당 교사다.
${L.ko}(${L.topik}) 학습자를 위한 '읽기 독해' 지문을 하나 만들어라.
조건: ${L.reading}
${levelPromptGuidance(level)}
${avoidBlock(covered)}
반드시 아래 JSON 형식으로만 답하라.
{
  "topic": "주제",
  "title": "지문 제목 (한국어)",
  "subtitle": "아주 짧은 한 줄 영어 요약",
  "paragraphs": [{"text":"문단 전체 한국어","en":"문단의 간결한 영어 번역"}]
}
본문과 번역만 만들고 단어 설명, 문제, 문법 설명은 만들지 마라.`, {
    maxOutputTokens: READING_CORE_TOKENS[level] || READING_CORE_TOKENS.beginner,
    operation: `reading.core.${level}`
  });
}

export async function generateReadingEnrichment({ level = "beginner", reading }) {
  const paragraphs = Array.isArray(reading?.paragraphs)
    ? reading.paragraphs.slice(0, 3).map((paragraph) => String(paragraph?.text || "").trim().slice(0, 1200)).filter(Boolean)
    : [];
  if (!paragraphs.length) throw new Error("읽기 본문이 필요합니다.");

  return askJson(`너는 한국어 교재를 만드는 30년차 어학당 교사다.
아래 ${LEVEL_SPEC[level]?.ko || LEVEL_SPEC.beginner.ko} 읽기 본문을 바탕으로 학습 보조 자료만 만들어라.

제목: ${String(reading?.title || "").slice(0, 200)}
본문:
${paragraphs.map((text, index) => `${index + 1}. ${text}`).join("\n")}
${levelPromptGuidance(level)}
반드시 아래 JSON 형식으로만 답하라.
{
  "paragraphWords": [["각 문단에서 꼭 배울 단어 최대 2개"]],
  "glossary": [{"word":"본문에 실제 등장한 단어","pos":"noun","ko":"짧고 쉬운 한국어 뜻풀이","en":"짧은 영어 뜻","ex":"짧은 한국어 예문 — 영어 번역"}],
  "questions": [{"q":"한국어 질문","en":"영어 질문","opts":["보기1","보기2","보기3"],"a":0}],
  "grammar": [{"form":"문법 형태","ko":"문법 설명 한 줄","example":"본문과 연결된 짧은 예문"}]
}
paragraphWords는 본문의 문단 수와 같은 개수의 배열이어야 하고 각 배열은 최대 2개 단어만 포함한다.
모든 단어는 해당 문단에 실제 등장해야 한다. glossary는 paragraphWords의 고유 단어만 포함하고 최대 6개로 제한한다.
questions는 정확히 2개, grammar는 정확히 2개로 만든다.`, {
    maxOutputTokens: READING_DETAIL_TOKENS[level] || READING_DETAIL_TOKENS.beginner,
    operation: `reading.enrichment.${level}`
  });
}

export async function generateReading({ level = "beginner", covered = [] }) {
  const core = await generateReadingCore({ level, covered });
  const enrichment = await generateReadingEnrichment({ level, reading: core });
  return {
    ...core,
    ...enrichment,
    paragraphs: (core.paragraphs || []).map((paragraph, index) => ({
      ...paragraph,
      words: enrichment.paragraphWords?.[index] || []
    }))
  };
}

// ── 말하기 ──────────────────────────────────────────────
export async function generateSpeaking({ level = "beginner", covered = [] }) {
  const L = LEVEL_SPEC[level] || LEVEL_SPEC.beginner;
  const rawData = await askJson(`너는 한국어 발음을 가르치는 30년차 어학당 교사다.
${L.ko}(${L.topik}) 학습자를 위한 '말하기(발음) 연습' 문장을 3개 만들어라.
조건: ${L.speaking}
${levelPromptGuidance(level)}
${avoidBlock(covered)}
반드시 아래 JSON 형식으로만 답하라.
{
  "topic": "주제",
  "sentences": [{
    "text":"연습할 한국어 문장",
    "roman":"로마자 표기",
    "en":"영어 뜻",
    "pron":"[실제 발음 표기]",
    "weakIndex":[0,1],
    "tipKo":"이 문장에서 주의할 발음 설명",
    "tipEn":"영어 설명"
  }]
}
weakIndex는 text에서 발음이 어려운 글자의 위치(0부터, 공백 포함)를 2개 정도 넣어라.`, { maxOutputTokens: 1800 });
  return normalizeSpeaking(rawData, level);
}


export async function generateContent({ kind, level = "beginner", userId = null, seenTopics = [], phase = "full", baseContent = null }) {
  if (kind === "reading" && phase === "enrichment") {
    const data = await generateReadingEnrichment({ level, reading: baseContent });
    return { ...data, level, phase };
  }

  let learned = null;
  let covered = seenTopics.slice(0, 20);
  if (userId) {
    const historyStartedAt = Date.now();
    learned = await getLearned(userId, kind);
    covered = Object.values(learned)
      .sort((a, b) => (b?.lastAt || 0) - (a?.lastAt || 0))
      .slice(0, 20)
      .map((item) => item?.label)
      .filter(Boolean);
    console.info("[content.generate] history:read", { kind, durationMs: Date.now() - historyStartedAt, count: covered.length });
  }

  const fn = kind === "reading" && phase === "core"
    ? generateReadingCore
    : { listening: generateListening, reading: generateReading, speaking: generateSpeaking }[kind];
  if (!fn) throw new Error(`알 수 없는 kind: ${kind}`);
  const data = await fn({ level, covered });

  if (userId && data.topic) {
    const saveStartedAt = Date.now();
    await recordLearned(userId, kind, [{ key: `${level}:${data.topic}`, label: data.topic }], learned);
    console.info("[content.generate] history:write", { kind, durationMs: Date.now() - saveStartedAt });
  }
  return { ...data, level, phase };
}

const VOCAB_LEVEL_GUIDANCE = {
  starter: "입문(Pre-A1~A1). 한글 자모 결합 원리와 기초 명사·동사를 고르고 로마자 발음을 반드시 병기한다. 예문은 '사과예요', '물을 마셔요'처럼 아주 짧게 쓴다.",
  beginner: "초급(TOPIK 1~2급). 기본 시제와 조사, 해요체와 기본형을 익힐 수 있는 여행·식당·쇼핑 중심 생활 표현을 고른다.",
  intermediate: "중급(TOPIK 3~4급). 유의어의 미묘한 뉘앙스, 자주 쓰는 연어와 관용 표현을 고르고 드라마 대사처럼 자연스러운 복문 예문을 쓴다.",
  advanced: "고급(TOPIK 5~6급). 한자어 어원, 사자성어, 시사·비즈니스·추상 개념어를 고르고 신문·칼럼·격식 발표 문체의 예문을 쓴다."
};

const VOCAB_THEME_LABELS = {
  kdrama: "K-드라마 단골 표현",
  cafe: "카페 주문",
  business: "비즈니스 이메일",
  emotion: "감정 표현"
};

export async function generateVocabularyDailySet({ level = "beginner", theme = "kdrama", exclude = [] }) {
  const guidance = VOCAB_LEVEL_GUIDANCE[level] || VOCAB_LEVEL_GUIDANCE.beginner;
  const themeLabel = VOCAB_THEME_LABELS[theme] || VOCAB_THEME_LABELS.kdrama;
  const excluded = (Array.isArray(exclude) ? exclude : []).map((word) => String(word || "").trim()).filter(Boolean).slice(0, 80);
  const data = await askJson(`너는 외국인을 위한 한국어 어휘 교재를 만드는 전문 교사다.
오늘 5분 동안 배울 단어를 정확히 5개 만든다.

[학습자 수준]
${guidance}

[오늘의 테마]
${themeLabel}

${excluded.length ? `[이미 단어장에 있는 단어 — 가능한 한 피할 것]\n${excluded.join(", ")}` : ""}

각 단어는 실제 한국어 사용에서 자연스러워야 하고 서로 중복되지 않아야 한다. AI 원포인트 팁에는 어감 차이, 한자 의미, 활용형 또는 함께 자주 쓰는 말 중 가장 유용한 하나를 짧게 설명한다.
반드시 아래 JSON 형식으로만 답하라.
{
  "words": [{
    "w": "한국어 단어 또는 짧은 표현",
    "rom": "로마자 발음",
    "posKo": "한국어 품사",
    "posEn": "English part of speech",
    "en": "concise natural English meaning",
    "ex": "수준과 테마에 맞는 실사용 한국어 예문",
    "exEn": "natural English translation",
    "ex2": "두 번째 짧은 실사용 한국어 예문",
    "ex2En": "natural English translation",
    "tipKo": "AI 원포인트 팁 한국어",
    "tipEn": "AI one-point tip in English",
    "hanja": "관련 한자가 있을 때만 표기, 없으면 빈 문자열"
  }]
}
words는 정확히 5개이며 모든 필드를 빠짐없이 채운다.`, {
    maxOutputTokens: 2300,
    operation: `vocabulary.daily.${level}.${theme}`
  });

  const seen = new Set();
  const words = (Array.isArray(data?.words) ? data.words : []).map((word) => ({
    w: String(word?.w || "").trim(),
    rom: String(word?.rom || "").trim(),
    posKo: String(word?.posKo || "표현").trim(),
    posEn: String(word?.posEn || "expression").trim(),
    en: String(word?.en || "").trim(),
    ex: String(word?.ex || "").trim(),
    exEn: String(word?.exEn || "").trim(),
    ex2: String(word?.ex2 || "").trim(),
    ex2En: String(word?.ex2En || "").trim(),
    tipKo: String(word?.tipKo || "").trim(),
    tipEn: String(word?.tipEn || "").trim(),
    hanja: String(word?.hanja || "").trim()
  })).filter((word) => word.w && word.en && !seen.has(word.w) && seen.add(word.w)).slice(0, 5);
  if (words.length !== 5) throw new Error("데일리 단어 5개를 완성하지 못했습니다. 다시 시도해 주세요.");
  return { level, theme, words };
}

// ── 회화·채팅 번역 (영어 번역 보기 토글용) ───────────────
// 한 요청을 작은 묶음으로 나누어 긴 대화도 모델 출력 한도에 걸리지 않게 한다.
// 문장 수뿐 아니라 글자 수도 제한해 유난히 긴 한 문장이 다른 번역을 밀어내지 않게 한다.
const TRANSLATION_BATCH_LINES = 20;
const TRANSLATION_BATCH_CHARS = 5000;

function translationBatches(items) {
  const batches = [];
  let batch = [];
  let chars = 0;
  for (const item of items) {
    const itemChars = item.t.length;
    if (batch.length && (batch.length >= TRANSLATION_BATCH_LINES || chars + itemChars > TRANSLATION_BATCH_CHARS)) {
      batches.push(batch);
      batch = [];
      chars = 0;
    }
    batch.push(item);
    chars += itemChars;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function translateBatch(items) {
  const totalChars = items.reduce((sum, item) => sum + item.t.length, 0);
  const data = await askJson(`아래 한국어 문장들을 자연스러운 영어로 번역하라.
학습자가 원문과 대조해 볼 수 있도록 문장 단위로 충실하게 옮긴다. 의역보다 원문의 뜻과 말투를 살린다.

${items.map((x) => `${x.i}. ${x.t}`).join("\n")}

반드시 아래 JSON 형식으로만 답하라.
{"translations":[{"i":0,"en":"영어 번역"}]}
i는 위 번호를 그대로 쓰고, 모든 문장을 빠짐없이 포함하라.`, {
    maxOutputTokens: Math.min(4096, Math.max(800, 300 + Math.ceil(totalChars * 1.5)))
  });
  return new Map(
    (Array.isArray(data?.translations) ? data.translations : [])
      .map((x) => [Number(x?.i), String(x?.en || "").trim()])
      .filter(([i, en]) => Number.isInteger(i) && en)
  );
}

export async function translateLines(lines = []) {
  const items = lines.map((text, i) => ({ i, t: String(text || "").trim() }));
  if (!items.length) return [];

  const translated = new Map();
  for (const batch of translationBatches(items.filter((item) => item.t))) {
    const batchMap = await translateBatch(batch);
    batchMap.forEach((value, key) => translated.set(key, value));

    // 모델이 드물게 일부 번호를 생략하면 그 문장들만 한 번 더 요청한다.
    const missing = batch.filter((item) => !translated.has(item.i));
    if (missing.length) {
      const retryMap = await translateBatch(missing);
      retryMap.forEach((value, key) => translated.set(key, value));
    }
  }

  const result = items.map((item) => item.t ? (translated.get(item.i) || "") : "");
  if (items.some((item) => item.t && !result[item.i])) {
    throw new Error("일부 문장의 영어 번역이 누락되었습니다. 다시 시도해 주세요.");
  }
  return result;
}

// 읽기 본문에서 사용자가 직접 선택한 한국어 단어·짧은 표현을 문맥에 맞게 풀이한다.
export async function lookupKoreanWord(word, context = "") {
  const selected = String(word || "").trim().slice(0, 40);
  const sentence = String(context || "").replace(/\s+/g, " ").trim().slice(0, 1200);
  if (!selected) throw new Error("조회할 단어가 필요합니다.");

  const data = await askJson(`너는 외국인 한국어 학습자를 위한 간결하고 정확한 양한영 사전이다.
아래 선택된 한국어 단어 또는 짧은 표현을 본문 문맥에 맞게 풀이하라.

선택: ${selected}
본문 문맥: ${sentence || "문맥 없음"}

조사나 어미가 붙어 있으면 base에는 기본형을 적고, 문맥에서 실제로 쓰인 뜻만 설명한다.
반드시 아래 JSON 형식으로만 답하라.
{
  "word": "선택된 표기",
  "base": "사전 기본형",
  "posKo": "한국어 품사",
  "posEn": "영어 품사",
  "meaningKo": "초급 학습자도 이해할 수 있는 짧은 한국어 뜻풀이",
  "meaningEn": "short natural English meaning",
  "exampleKo": "이 뜻으로 쓴 짧은 한국어 예문",
  "exampleEn": "natural English translation of the example"
}`, { maxOutputTokens: 650, operation: "dictionary.lookup" });

  const result = {
    word: selected,
    base: String(data?.base || data?.word || selected).trim(),
    posKo: String(data?.posKo || "표현").trim(),
    posEn: String(data?.posEn || "expression").trim(),
    meaningKo: String(data?.meaningKo || "").trim(),
    meaningEn: String(data?.meaningEn || "").trim(),
    exampleKo: String(data?.exampleKo || "").trim(),
    exampleEn: String(data?.exampleEn || "").trim()
  };
  if (!result.meaningKo || !result.meaningEn) {
    throw new Error("단어 뜻을 완성하지 못했습니다. 다시 선택해 주세요.");
  }
  return result;
}
