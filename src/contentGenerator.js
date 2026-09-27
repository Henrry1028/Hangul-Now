// ============================================================
// 학습자료 생성 (듣기 · 읽기 · 말하기)
// gemini-3.8-flash로 난이도에 맞는 새 자료를 만든다.
// 전역 규칙: 이미 학습한 주제는 제외하고 매번 새로운 내용을 만든다.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCoveredTopics, recordLearned } from "./learningHistory.js";

const MODEL = process.env.GEMINI_CONTENT_MODEL || "gemini-3.8-flash";

// 세 영역 공통 난이도 기준 — 어디서든 같은 기준으로 적용된다
export const LEVEL_SPEC = {
  beginner: {
    ko: "초급", topik: "TOPIK 1~2급",
    listening: "2~3문장씩 오가는 짧은 대화 6줄. 아주 흔한 상황(주문, 인사, 길 묻기). 천천히 또박또박한 말투.",
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
    listening: "10줄 정도의 대화. 협상·불만 접수·의견 충돌처럼 미묘한 장면. 자연스러운 구어체와 줄임말.",
    reading: "5~6문장짜리 문단 3개. 관용 표현, 사회·문화 소재, 함축된 의미.",
    speaking: "20자 이상의 긴 문장. 억양과 끊어 읽기가 중요한 문장."
  }
};

function genAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  return new GoogleGenerativeAI(key);
}

async function askJson(prompt, { maxOutputTokens = 2200 } = {}) {
  const model = genAI().getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens,
      thinkingConfig: { thinkingLevel: "LOW" }
    }
  });
  const res = await model.generateContent(prompt);
  const raw = res.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
  return JSON.parse(raw);
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

const avoidBlock = (covered) =>
  covered.length
    ? `\n[이미 학습한 주제 — 반드시 피할 것]\n${covered.map((t) => "- " + t).join("\n")}\n위와 겹치지 않는 완전히 새로운 소재로 만들어라.\n`
    : "";

// ── 듣기 ────────────────────────────────────────────────
export async function generateListening({ level = "beginner", covered = [] }) {
  const L = LEVEL_SPEC[level] || LEVEL_SPEC.beginner;
  const data = await askJson(`너는 한국어 교재를 만드는 30년차 어학당 교사다.
${L.ko}(${L.topik}) 학습자를 위한 '듣기 연습' 자료를 하나 만들어라.
조건: ${L.listening}
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
export async function generateReading({ level = "beginner", covered = [] }) {
  const L = LEVEL_SPEC[level] || LEVEL_SPEC.beginner;
  const data = await askJson(`너는 한국어 교재를 만드는 30년차 어학당 교사다.
${L.ko}(${L.topik}) 학습자를 위한 '읽기 독해' 지문을 하나 만들어라.
조건: ${L.reading}
${avoidBlock(covered)}
반드시 아래 JSON 형식으로만 답하라.
{
  "topic": "주제",
  "title": "지문 제목 (한국어)",
  "subtitle": "한 줄 영어 요약",
  "paragraphs": [{"text":"문단 전체 한국어","en":"문단 영어 번역","words":["이 문단에서 뜻을 알아야 할 단어"]}],
  "glossary": [{"word":"단어","pos":"noun","en":"영어 뜻","ex":"한국어 예문 — 영어 번역"}],
  "questions": [{"q":"한국어 질문","en":"영어 질문","opts":["보기1","보기2","보기3"],"a":0}],
  "grammar": [{"form":"-(으)러 가다","ko":"문법 설명 한 줄","example":"예문"}]
}
words에 넣는 단어는 그 문단 text 안에 그대로 등장해야 한다. glossary는 words에 쓴 단어를 모두 포함하라. questions는 2개, grammar는 2개.`, { maxOutputTokens: 2800 });
  return data;
}

// ── 말하기 ──────────────────────────────────────────────
export async function generateSpeaking({ level = "beginner", covered = [] }) {
  const L = LEVEL_SPEC[level] || LEVEL_SPEC.beginner;
  const data = await askJson(`너는 한국어 발음을 가르치는 30년차 어학당 교사다.
${L.ko}(${L.topik}) 학습자를 위한 '말하기(발음) 연습' 문장을 3개 만들어라.
조건: ${L.speaking}
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
  return data;
}

export async function generateContent({ kind, level = "beginner", userId = null, seenTopics = [] }) {
  // 전역 규칙: 이미 다룬 주제를 프롬프트에서 제외한다
  const covered = userId ? await getCoveredTopics(userId, 20) : seenTopics.slice(0, 20);
  const fn = { listening: generateListening, reading: generateReading, speaking: generateSpeaking }[kind];
  if (!fn) throw new Error(`알 수 없는 kind: ${kind}`);
  const data = await fn({ level, covered });

  // 만든 주제를 바로 학습 이력에 남겨 다음에는 다른 주제가 나오게 한다
  if (userId && data.topic) {
    await recordLearned(userId, kind, [{ key: `${level}:${data.topic}`, label: data.topic }]);
  }
  return { ...data, level };
}

// ── 회화 전사 번역 (영어 번역 보기 토글용) ────────────────
export async function translateLines(lines = []) {
  const items = lines.map((t, i) => ({ i, t }));
  if (!items.length) return [];
  const data = await askJson(`아래 한국어 문장들을 자연스러운 영어로 번역하라.
학습자가 원문과 대조해 볼 수 있도록 문장 단위로 충실하게 옮긴다. 의역보다 원문의 뜻과 말투를 살린다.

${items.map((x) => `${x.i}. ${x.t}`).join("\n")}

반드시 아래 JSON 형식으로만 답하라.
{"translations":[{"i":0,"en":"영어 번역"}]}
i는 위 번호를 그대로 쓰고, 모든 문장을 빠짐없이 포함하라.`, { maxOutputTokens: Math.min(2400, 300 + items.length * 70) });
  const map = new Map((data.translations || []).map((x) => [Number(x.i), x.en]));
  return items.map((x) => map.get(x.i) || "");
}
