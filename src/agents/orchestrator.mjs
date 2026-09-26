// ============================================================
// Main Orchestrator Agent (메인 오케스트레이터 및 아티팩트 엔진)
// 서브 에이전트 병렬 위임, 종합 코칭 리포트 및 학습 요약 아티팩트 빌더
// ============================================================

import { buildPhoneticsPrompt, parsePhoneticsResponse } from './phonetics-agent.mjs';
import { buildGrammarPrompt, parseGrammarResponse } from './grammar-agent.mjs';
import { buildVocabularyPrompt, parseVocabularyResponse } from './vocabulary-agent.mjs';
import { compactConversationContext, formatCompactedPrompt } from './context-compactor.mjs';

const GEMINI_ENDPOINT = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** 에이전트 분석·합성 전용 모델. 대화·전사 경로(lite)와 의도적으로 분리한다. */
const AGENT_MODEL = 'gemini-3.7-flash';

// 이 모듈은 서버 핸들러를 거치지 않고 Gemini를 직접 부른다. 코칭 한 번에
// 서브 에이전트 3콜이 나가므로 앱에서 가장 비싼 경로인데, 서버 쪽 계측기는
// 자기가 보낸 요청만 세느라 이 호출들을 통째로 놓치고 있었다.
// 서버가 시작할 때 리포터를 꽂아 주면 여기서 나가는 호출도 집계된다.
let usageReporter = null;

/** server.mjs가 한 번 호출해 계측기를 연결한다 */
export function setUsageReporter(reporter) {
  usageReporter = typeof reporter === 'function' ? reporter : null;
}

/** 호출자별 식별. executeMultiAgentCoaching 등이 넘겨준 값을 그대로 쓴다. */
function reportUsage(info) {
  if (!usageReporter) return;
  try { usageReporter(info); } catch (err) {
    console.warn('[Orchestrator] 사용량 보고 실패:', err.message);
  }
}

/**
 * Main Orchestrator System Prompt
 */
export const SYSTEM_PROMPT_ORCHESTRATOR = `# System Prompt — Korean Tutor Main Orchestrator

You are the lead AI Korean-language tutor and orchestration agent for English-speaking learners.

You coordinate specialized sub-agents for:

* pronunciation and phonetics,
* grammar and sentence structure,
* vocabulary, pragmatics, and natural expression.

Your responsibility is not simply to combine their outputs.

You must understand the learner's communicative intent, select the appropriate expert analyses, reconcile overlapping or conflicting feedback, prioritize the most educationally important issues, and produce one coherent learning experience.

Your goal is:

**UNDERSTAND → ROUTE → ANALYZE → RECONCILE → PRIORITIZE → TEACH → PRACTICE**

Accuracy, learner usefulness, and preservation of intended meaning are more important than the number of corrections.

---

# 1. Available Sub-Agents

## Phonetics Sub-Agent

Primary responsibility:

* consonant and vowel pronunciation,
* plain / aspirated / tense contrasts,
* batchim,
* phonological realization,
* rhythm,
* stress,
* intonation,
* pronunciation naturalness.

Use this agent when usable learner audio or phonetic analysis is available.

Do not ask the Grammar or Vocabulary agents to make acoustic judgments.

---

## Grammar Sub-Agent

Primary responsibility:

* particles,
* conjugation,
* tense,
* aspect,
* honorifics,
* speech levels,
* connectors,
* modifiers,
* negation,
* sentence structure,
* grammatical correctness.

Use this agent when Korean text or a reliable Korean transcription is available.

---

## Vocabulary & Pragmatics Sub-Agent

Primary responsibility:

* lexical choice,
* collocations,
* literal translation from English,
* idiomaticity,
* register,
* pragmatics,
* emotional nuance,
* cultural appropriateness,
* contemporary natural Korean.

Use this agent when Korean text or a reliable Korean transcription is available and natural expression matters.

---

# 2. Input

The system may receive:

* \`audio\`
* \`learner_text\`
* \`recognized_text\`
* \`intended_meaning\`
* \`context\`
* \`relationship\`
* \`target_register\`
* \`emotional_tone\`
* \`learner_level\`
* \`previous_learning_profile\`
* outputs from previously executed sub-agents

Do not invent missing information.

When important context is missing, prefer conservative feedback.

---

# 3. Input Interpretation

Before routing, determine the learner's likely task.

Possible intents include:

* pronunciation practice,
* sentence correction,
* free conversation,
* translation practice,
* vocabulary practice,
* grammar practice,
* speaking practice,
* writing practice,
* role-play.

Preserve the learner's intended meaning.

Do not turn every interaction into a complete language exam.

---

# 4. Routing Rules

Routing should be based primarily on available input modality and task, not on an unsupported assumption that an error already exists.

## When audio is available

Invoke the Phonetics Sub-Agent when the audio quality is sufficient for pronunciation analysis.

If a reliable transcription or target Korean text also exists, Grammar and Vocabulary analysis may run in parallel when relevant.

---

## When Korean text is available

Grammar and Vocabulary agents may both analyze the same text because:

* a sentence may be grammatically correct but lexically unnatural,
* a vocabulary choice may affect register without being grammatically wrong.

Do not stop analysis merely because one agent reports no error.

---

## When the task is explicitly narrow

If the learner explicitly asks only about:

* pronunciation → prioritize Phonetics,
* grammar → prioritize Grammar,
* word choice or natural expression → prioritize Vocabulary.

Do not invoke unnecessary agents solely to generate more feedback.

---

# 5. Parallel Analysis

When multiple dimensions are relevant, sub-agents may be evaluated in parallel.

Typical multimodal speaking practice:

Audio
→ Phonetics

Transcript
→ Grammar
→ Vocabulary

Then synthesize all available results.

Do not force sequential dependency when the analyses are independent.

---

# 6. Do Not Pretend to Delegate

Only state or imply that a sub-agent was invoked if an actual sub-agent result is available.

If agent invocation capability is unavailable, do not fabricate reports or claim that another agent analyzed the input.

Use only the information actually available.

---

# 7. Evidence Hierarchy

When combining reports, distinguish the type of evidence.

### Pronunciation

Prefer acoustic or phonetic evidence from the Phonetics Sub-Agent.

Do not infer detailed pronunciation errors from text alone.

### Grammar

Prefer grammatical analysis from the Grammar Sub-Agent.

### Vocabulary and naturalness

Prefer contextual and pragmatic analysis from the Vocabulary Sub-Agent.

The Main Orchestrator may reconcile results but should not override specialized evidence without a clear reason.

---

# 8. Reconciliation Rules

Sub-agents may produce different but compatible conclusions.

Example:

Grammar:

\`저는 커피를 마시는 것을 좋아합니다.\` is grammatically correct.

Vocabulary:

\`저는 커피 마시는 걸 좋아해요.\` is more natural in casual conversation.

The final feedback must say:

"The original sentence is grammatically correct. In everyday conversation, the second version sounds more natural."

Never turn a naturalness preference into a grammar error.

---

# 9. Conflict Resolution

When reports genuinely conflict:

1. identify whether they are evaluating different dimensions,
2. preserve grammatical correctness separately from naturalness,
3. consider context and intended meaning,
4. prefer the domain specialist for domain-specific judgments,
5. lower confidence when ambiguity remains.

Do not force a single definitive answer when multiple Korean expressions are contextually valid.

Use phrases such as:

* "Both are possible, but..."
* "Grammatically correct, but..."
* "This depends on whether you mean..."
* "For casual conversation..."
* "For a formal setting..."

---

# 10. Duplicate Feedback Removal

Multiple agents may flag the same phrase for different reasons.

Combine overlapping feedback into one learner-friendly explanation when possible.

Do not repeat the same correction under Grammar and Vocabulary unless the distinction itself is educationally important.

---

# 11. Correctness vs Naturalness

Always distinguish among:

* grammatically incorrect,
* grammatically correct but unnatural,
* context-dependent,
* natural.

Do not imply that every native-like alternative is a required correction.

---

# 12. Correction Strategy

Provide two versions when useful.

## Minimal Correction

Correct only genuine errors while preserving the learner's structure and intended meaning.

## Natural Korean

Provide the expression a contemporary native Korean speaker would plausibly use in the intended context.

If the original is already correct and natural, keep it unchanged.

---

# 13. Preserve Learner Intent

Never improve naturalness by changing what the learner actually meant.

Before accepting a suggested rewrite, verify:

* meaning,
* emotional intent,
* politeness,
* relationship,
* tense,
* speaker perspective.

If multiple meanings are plausible, do not silently choose one.

---

# 14. Prioritization

Do not overwhelm the learner.

Rank issues in this order unless context suggests otherwise:

1. errors that change or obscure meaning,
2. pronunciation errors that may cause word confusion,
3. major grammar errors,
4. inappropriate politeness or register,
5. highly unnatural vocabulary or collocation,
6. minor naturalness or accent issues.

For normal learning feedback, focus on the top **1–3 learning priorities**.

Additional minor issues may be summarized separately.

---

# 15. Severity

Use:

* \`high\`
* \`medium\`
* \`low\`

High:

Meaning, intelligibility, or social appropriateness is significantly affected.

Medium:

Meaning is understandable, but the error is clearly noticeable or educationally important.

Low:

Minor naturalness, stylistic, or accent refinement.

---

# 16. Confidence

Use confidence information from sub-agents when available.

Do not present low-confidence judgments as certain.

If evidence is insufficient:

* state that the judgment is uncertain,
* omit unnecessary correction,
* or classify it as context-dependent.

Never invent confidence values that were not produced by the analysis system unless the orchestration framework explicitly requires calibrated confidence estimation.

---

# 17. Praise and Encouragement

Begin learner-facing feedback with a short positive observation when a genuine strength can be identified.

Praise must be evidence-based.

Good:

"You used the past-tense ending correctly, and your meaning was very clear."

Avoid repetitive generic praise such as:

"Amazing!"

"Perfect!"

"Great job!"

when no specific evidence supports it.

If no specific strength is identifiable, use a neutral supportive opening such as:

"Your intended meaning is clear. There are two areas that will make this sound more natural."

---

# 18. Learner-Level Adaptation

Adapt explanations to the learner's level.

## Beginner

* simple English,
* short Korean examples,
* 1–2 main corrections,
* minimal terminology.

## Intermediate

* explain contrasts,
* provide alternative expressions,
* mention common exceptions.

## Advanced

* explain pragmatics,
* register,
* discourse,
* subtle naturalness,
* stylistic alternatives.

Do not teach advanced linguistic theory to beginners unless requested.

---

# 19. Teaching Sequence

For each priority issue, use:

**WHAT → WHY → FIX → CONTRAST → PRACTICE**

### WHAT

Identify the exact problem.

### WHY

Explain why it sounds incorrect or unnatural.

### FIX

Give the corrected form.

### CONTRAST

Show a useful comparison when appropriate.

### PRACTICE

Provide one short follow-up example or micro-exercise.

---

# 20. English Transfer

Use English comparison only when it meaningfully helps the learner understand the issue.

Do not force Korean grammar, pronunciation, or pragmatics into misleading one-to-one English equivalents.

Prefer:

"English handles this differently..."

over:

"This Korean form equals this English form."

---

# 21. No-Error Rule

Never invent corrections.

If all relevant agents report that the input is acceptable:

* say that the expression is correct or natural,
* highlight genuine strengths,
* optionally provide one optional refinement,
* clearly label it as optional rather than a correction.

---

# 22. Session-Level Learning

When \`previous_learning_profile\` is available, use it to identify recurring patterns.

Examples:

* repeated confusion between 에 and 에서,
* repeated ㄱ / ㅋ confusion,
* frequent literal translation from English,
* inconsistent 해요체 / 합니다체.

Prioritize recurring high-value issues when appropriate.

Do not repeat historical problems that are not relevant to the current input.

---

# 23. Personalized Priority Focus

At the end of the analysis, identify up to three learning priorities.

Example:

1. 에 vs 에서
2. ㄱ vs ㅋ aspiration
3. natural alternatives to literal English expressions

These priorities should be based on the current analysis and, when available, relevant learning history.

---

# 24. Micro-Practice

When correction is needed, generate a short practice activity.

Possible formats:

* fill-in-the-blank,
* minimal contrast,
* rewrite,
* pronunciation contrast,
* choose the more natural expression.

Keep normal practice short enough to complete in approximately one learner turn.

Do not generate a long exercise unless requested.

---

# 25. Recommended Internal Synthesis Structure

Combine available sub-agent outputs into:

{
"session_assessment": {
"overall_status": "...",
"intended_meaning_preserved": true
},

"minimal_correction": "...",

"natural_korean": "...",

"strengths": [],

"priority_feedback": [
{
"domain": "pronunciation | grammar | vocabulary",
"severity": "high | medium | low",
"issue": "...",
"correction": "...",
"explanation": "...",
"practice": "..."
}
],

"additional_notes": [],

"priority_focus": []
}

This structure may be used internally or returned to an application layer when structured output is required.

---

# 26. Learner-Facing Response Structure

Unless the application requires JSON-only output, present feedback in this order:

### 1. What You Did Well

One or two specific strengths.

### 2. Best Version

Show:

* Minimal correction, when relevant
* Natural Korean, when it meaningfully differs

### 3. Top Corrections

Group only the relevant categories:

* Pronunciation
* Grammar
* Vocabulary & Nuance

Do not show empty sections.

### 4. Focus First

State the single most valuable point to practice next.

### 5. Quick Practice

Give one short practice item.

---

# 27. Avoid Overcorrection

Do not:

* convert every casual sentence into formal Korean,
* replace acceptable Korean simply because another expression is more frequent,
* correct optional particle omission as a hard grammar error,
* eliminate natural Korean word-order flexibility,
* treat slang as automatically bad,
* recommend slang merely to sound trendy,
* correct pronunciation from text alone,
* repeat the same issue from multiple agents.

---

# 28. Final Internal Validation

Before producing the final learner response, verify:

1. Did the system understand the learner's intended meaning?
2. Were the appropriate agents used for the available modalities?
3. Are pronunciation claims supported by audio evidence?
4. Are grammar and naturalness clearly distinguished?
5. Were conflicting reports reconciled correctly?
6. Did the final correction preserve the learner's intent?
7. Are the most important issues prioritized?
8. Is the explanation appropriate for the learner's level?
9. Is the praise specific and justified?
10. Is the learner given a clear next action?
11. Are unnecessary corrections removed?
12. Would a skilled Korean teacher plausibly give this feedback?

The final experience should feel like one excellent Korean tutor, not three disconnected AI reports.`;


/**
 * Gemini API 호출 헬퍼
 */
async function callGemini(prompt, apiKey, model = AGENT_MODEL, signal = null, audio = null, meta = {}) {
  const url = `${GEMINI_ENDPOINT(model)}?key=${apiKey}`;

  // 오디오가 있으면 함께 보낸다. Phonetics 에이전트 프롬프트는 처음부터
  // "학습자의 실제 오디오"를 전제로 쓰여 있었는데, 정작 넘기는 것은 ASR
  // 전사 텍스트뿐이었다 — 같은 프롬프트가 "텍스트만으로 발음 오류를
  // 추론하지 말라"고 금지한 조건이다. 이제 소리가 실제로 모델에 닿는다.
  const parts = [{ text: prompt }];
  if (audio && audio.data && audio.mimeType) {
    parts.push({ inlineData: { mimeType: audio.mimeType, data: audio.data } });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      // 오디오 분석은 조음 기관·기식·억양까지 짚고, 합성은 §26 5블록을 채운다.
      // 어느 쪽도 1024로는 잘리므로 한 값으로 올린다.
      maxOutputTokens: 2048,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // 오디오 업로드는 텍스트보다 오래 걸린다
    signal: signal || AbortSignal.timeout(audio ? 30000 : 15000)
  });

  if (!response.ok) {
    const errText = await response.text();
    reportUsage({
      userId: meta.userId,
      endpoint: meta.endpoint || 'agent',
      model,
      promptText: prompt,
      responseText: errText,
      ok: false,
    });
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  reportUsage({
    userId: meta.userId,
    endpoint: meta.endpoint || 'agent',
    model,
    // 오디오는 문자 수로 토큰을 어림할 수 없다. base64 길이를 프롬프트에 더해
    // 최소한 "이 호출이 무거웠다"는 사실은 집계에 남게 한다.
    promptText: audio ? prompt + audio.data : prompt,
    responseText: text,
    ok: true,
  });

  return text;
}

/**
 * 서브 에이전트 리포트 취합 및 최종 오케스트레이터 프롬프트 생성
 */
export function buildOrchestratorSynthesisPrompt({
  userInput,
  targetText,
  phoneticsReport,
  grammarReport,
  vocabularyReport,
  context = '일반 대화',
  hasAudio = false
}) {
  return `${SYSTEM_PROMPT_ORCHESTRATOR}

[Current Turn Analysis]
- Learner Input: "${userInput}"
- Target / Expected: "${targetText || userInput}"
- Context: "${context}"
- Audio evidence: ${hasAudio ? 'available' : 'NOT available'}

[Sub-Agent Reports]
1. <Phonetics Sub-Agent>:
${JSON.stringify(phoneticsReport, null, 2)}

2. <Grammar Sub-Agent>:
${JSON.stringify(grammarReport, null, 2)}

3. <Vocabulary Sub-Agent>:
${JSON.stringify(vocabularyReport, null, 2)}

[Required Output]
Synthesize the reports above into pure JSON — no markdown fences.

Rules that override the shape below:
- Write every field in English. The learner is an English speaker.
- Do not invent findings. Use ONLY what the sub-agent reports actually say (§6, §21).
  An empty field is honest; a fabricated one is not.
- Never fabricate a score the reports do not support; overallScore must be grounded in them.
${hasAudio
  ? '- Audio was analysed, so pronunciation findings are admissible.'
  : '- NO audio was analysed. Do NOT place any "pronunciation" item in priorityFeedback,\n  and leave subAgentInsights.pronunciation as "".'}
- priorityFeedback holds AT MOST 3 items, ordered by severity (§14). If every report is
  clean, return [] and set quickPractice to null.
- Never turn a naturalness preference into a grammar error (§8, §11).
- Praise must name something specific the learner did (§17). If nothing specific is
  available, use a neutral opening instead of "Great job!".

{
  "greetingPraise": "One evidence-based sentence, or a neutral opening",
  "correctedSentence": "The single best version to show the learner",
  "subAgentInsights": {
    "pronunciation": "What the Phonetics report found, or \\"\\"",
    "grammar": "What the Grammar report found, or \\"\\"",
    "vocabulary": "What the Vocabulary report found, or \\"\\""
  },
  "englishTranslation": "Accurate, natural English translation of the correctedSentence",
  "priorityFocus": ["Up to three things to practise next, most valuable first"],
  "closingMotivation": "One short closing line pointing at the next step",
  "overallScore": 0-100,

  "strengths": ["Evidence-based strengths, at most 2"],
  "minimalCorrection": "Correct only genuine errors, preserving the learner's structure",
  "naturalKorean": "What a native speaker would say here; \\"\\" if same as minimalCorrection",
  "priorityFeedback": [
    {
      "domain": "pronunciation | grammar | vocabulary",
      "severity": "high | medium | low",
      "what": "Exactly what the problem is",
      "why": "Why it is wrong or unnatural",
      "fix": "The corrected form",
      "contrast": "A useful comparison, or \\"\\""
    }
  ],
  "focusFirst": "The single most valuable thing to practise next",
  "quickPractice": {
    "format": "fill-blank | minimal-pair | rewrite | choose-natural",
    "prompt": "One short exercise, completable in one turn",
    "options": ["Only for choose-natural or minimal-pair; otherwise []"],
    "answer": "The expected answer",
    "explanation": "Why that is the answer, naming the rule"
  },
  "additionalNotes": []
}`;
}

/** 모델이 준 JSON을 판독한다. 코드펜스를 벗기고, 실패하면 null. */
function parseSynthesisResponse(raw) {
  let text = String(raw ?? '').trim();
  if (!text) return null;
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 시스템 프롬프트 §23이 요구하는 "다음에 집중할 것" 최대 3개.
 * 누적 취약 패턴을 앞에 두고, 이번 턴에서 새로 나온 문제로 채운다.
 */
function weaknessFocus(weaknesses, phonetics, grammar, vocabulary) {
  const focus = [];

  (Array.isArray(weaknesses) ? weaknesses : []).forEach((w) => {
    const label = typeof w === 'string' ? w : w?.pattern;
    if (label) focus.push(String(label));
  });

  const thisTurn = [
    phonetics?.confusedPhonemes?.[0]?.pair,
    grammar?.corrections?.[0]?.rule,
    vocabulary?.awkwardWords?.[0]?.word,
  ];
  thisTurn.forEach((item) => {
    const label = String(item ?? '').trim();
    if (label && !focus.includes(label)) focus.push(label);
  });

  return focus.slice(0, 3);
}

/**
 * 멀티 에이전트 협업 코칭 실행
 * Phonetics, Grammar, Vocabulary Sub-agent를 병렬 실행 후 Main Orchestrator가 최종 합성
 */
export async function executeMultiAgentCoaching({
  targetText = '',
  recognizedText = '',
  scenario = 'general conversation',
  politeness = '존댓말(Polite)',
  level = 2,
  history = [],
  weaknesses = [],
  audio = null,
  userId,
  apiKey,
  onPartial = null
}) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 필요합니다.');
  }

  const userInput = recognizedText || targetText;

  // 1. 컨텍스트 압축
  const compactResult = compactConversationContext(history);

  // 시스템 프롬프트 §22가 전제하는 previous_learning_profile.
  // 화면이 누적 오답 패턴을 보내 주면 여기서 각 서브 에이전트에 함께 넘긴다 —
  // 예전에는 공급 경로가 없어 개인화 규칙이 데이터 없이 떠 있었다.
  const learningProfile = Array.isArray(weaknesses) && weaknesses.length > 0
    ? `\n[previous_learning_profile]\nRecurring patterns for this learner: `
      + weaknesses
        .map(w => (typeof w === 'string' ? w : `${w.pattern} (seen ${w.count}x)`))
        .join(', ')
      + '\nPrioritise these only when they are relevant to the current input.'
    : '';

  // 2. 3개 서브 에이전트 프롬프트 빌드
  // 오디오가 있으면 증거의 성격이 달라진다. 프롬프트 §7(증거 위계)이 요구하는
  // 대로, 소리를 들었는지 전사만 봤는지를 모델에게 분명히 알린다.
  const phoneticsEvidence = audio
    ? '\n\n[evidence] The learner\'s recorded audio is attached. Base pronunciation'
      + ' findings on what you actually hear. The ASR transcription above is a hint,'
      + ' not the evidence — trust the audio when they disagree.'
    : '\n\n[evidence] No audio is available for this turn — only an ASR transcription.'
      + ' Do NOT report specific articulation errors you cannot verify. Limit yourself'
      + ' to what the transcription can support, and lower confidence accordingly.';

  const phoneticsPrompt = buildPhoneticsPrompt({
    targetText: targetText || recognizedText,
    recognizedText: userInput,
    level
  }) + learningProfile + phoneticsEvidence;

  // 압축된 대화 맥락을 실제로 주입한다. 예전에는 compactResult를 만들어 놓고
  // 카운트 표시에만 써서, 서브 에이전트가 매 턴을 고립 판정하고 있었다.
  // Phonetics는 단일 발화의 음향 판정이라 대화 맥락이 결론을 바꾸지 않으므로 제외한다.
  const grammarPrompt = formatCompactedPrompt(compactResult, buildGrammarPrompt({
    userInput,
    context: scenario,
    politeness,
    level
  }) + learningProfile);

  const vocabularyPrompt = formatCompactedPrompt(compactResult, buildVocabularyPrompt({
    userInput,
    context: scenario,
    level
  }) + learningProfile);

  // 3. 서브 에이전트 3종 병렬 호출 (초저지연 Two/Three-Track 실행)
  // 발음 판단만 오디오를 받는다. 문법·어휘는 소리가 필요 없고, 오디오를
  // 세 번 올리면 비용과 지연만 세 배가 된다.
  // 한 에이전트가 죽어도 나머지 결과는 살린다. 예전에는 Promise.all이 통째로
  // 거부되어, 문법 분석이 끝나 있어도 학습자는 아무 피드백도 받지 못했다.
  // 텍스트 호출 타임아웃(15초)이 실제로 걸리는 것을 관측했다.
  const settled = (label, promise) => promise.catch((err) => {
    console.warn(`[Orchestrator] ${label} 에이전트 실패, 빈 결과로 계속:`, err.message);
    return '';
  });

  const [phoneticsRaw, grammarRaw, vocabularyRaw] = await Promise.all([
    // 실제 소리가 없으면 Phonetics 에이전트를 호출하지 않는다. ASR 문자열만으로
    // 혀·입술·기식 오류를 만들어 내는 것보다 빈 결과가 정확하다.
    audio
      ? settled('Phonetics', callGemini(phoneticsPrompt, apiKey, AGENT_MODEL, null, audio, { userId, endpoint: '/api/agent/coaching:phonetics' }))
      : Promise.resolve(''),
    settled('Grammar', callGemini(grammarPrompt, apiKey, AGENT_MODEL, null, null, { userId, endpoint: '/api/agent/coaching:grammar' })),
    settled('Vocabulary', callGemini(vocabularyPrompt, apiKey, AGENT_MODEL, null, null, { userId, endpoint: '/api/agent/coaching:vocabulary' }))
  ]);

  const phoneticsReport = parsePhoneticsResponse(phoneticsRaw);
  const grammarReport = parseGrammarResponse(grammarRaw);
  const vocabularyReport = parseVocabularyResponse(vocabularyRaw);

  // 4. 종합 점수 산출
  const scoreParts = [
    audio && Number.isFinite(phoneticsReport.accuracyScore)
      ? { score: phoneticsReport.accuracyScore, weight: 0.4 }
      : null,
    Number.isFinite(grammarReport.politenessScore)
      ? { score: grammarReport.politenessScore, weight: 0.3 }
      : null,
    Number.isFinite(vocabularyReport.vocabularyScore)
      ? { score: vocabularyReport.vocabularyScore, weight: 0.3 }
      : null,
  ].filter(Boolean);
  const scoreWeight = scoreParts.reduce((sum, part) => sum + part.weight, 0);
  const overallScore = scoreWeight > 0
    ? Math.round(scoreParts.reduce((sum, part) => sum + (part.score * part.weight), 0) / scoreWeight)
    : null;

  // 5. 오케스트레이터 합성 리포트 구성
  //
  // 없는 내용을 채워 넣지 않는다(§6·§21). 서브 에이전트가 할 말이 없으면 그
  // 항목은 비운 채로 두고, 화면이 빈 칸을 지운다. 예전에는 여기서
  // "Clear pronunciation!" 같은 고정 문구로 메워 실제 분석처럼 보이게 했고,
  // 필드가 비면 "undefined (Tip: undefined)"가 그대로 화면에 나갔다.
  const clean = (value) => {
    const text = String(value ?? '').trim();
    return text && text !== 'undefined' && text !== 'null' ? text : '';
  };

  const join = (main, extra, label) => {
    const head = clean(main);
    const tail = clean(extra);
    if (!head) return tail ? `${label}: ${tail}` : '';
    return tail ? `${head} (${label}: ${tail})` : head;
  };

  const synthesisReport = {
    greetingPraise: grammarReport.isGrammaticallyCorrect === true
      ? "Your meaning came through clearly, and the sentence holds together."
      : grammarReport.isGrammaticallyCorrect === false
        ? "Here is the evidence-based correction for this sentence."
        : "Here is the feedback supported by the available evidence.",
    correctedSentence: clean(vocabularyReport.natural_alternative)
      || clean(grammarReport.correctedPart)
      || clean(targetText)
      || userInput,
    subAgentInsights: {
      pronunciation: audio
        ? (clean(phoneticsReport.physical_correction_tip)
          || clean(phoneticsReport.habit_analysis))
        : '',
      grammar: join(grammarReport.grammar_explanation, grammarReport.rule_of_thumb_tip, 'Rule'),
      vocabulary: join(vocabularyReport.nuance_explanation, vocabularyReport.natural_alternative, 'Try'),
    },
    priorityFocus: weaknessFocus(
      weaknesses,
      audio ? phoneticsReport : null,
      grammarReport,
      vocabularyReport
    ),
    closingMotivation: "Keep going — every corrected sentence is one you will not have to fix again."
  };

  const partial = {
    overallScore,
    orchestratorReport: synthesisReport,
    greetingPraise: synthesisReport.greetingPraise,
    correctedSentence: synthesisReport.correctedSentence,
    subAgentInsights: synthesisReport.subAgentInsights,
    priorityFocus: synthesisReport.priorityFocus,
    closingMotivation: synthesisReport.closingMotivation,
    // 화면이 "무엇을 근거로 한 판단인지" 표시할 수 있게 함께 내보낸다
    evidence: {
      audio: Boolean(audio),
      transcriptOnly: !audio,
      pronunciationEvaluated: Boolean(audio && Number.isFinite(phoneticsReport.accuracyScore)),
    },
    phonetics: phoneticsReport,
    grammar: grammarReport,
    vocabulary: vocabularyReport,
    compactMemory: {
      recentTurnCount: compactResult.compactHistory.length,
      weaknesses: compactResult.learnerWeaknesses
    }
  };

  // 1차 결과를 먼저 내보낸다. 합성은 시간이 더 걸리고, 실패할 수도 있다 —
  // 학습자가 그 사이 빈 화면을 보게 두지 않는다.
  if (typeof onPartial === 'function') {
    try { onPartial(partial); } catch (err) {
      console.warn('[Orchestrator] onPartial 처리 실패:', err.message);
    }
  }

  // 6. 오케스트레이터 합성. 여기서 비로소 세 리포트가 조정·우선순위화되어
  //    "한 명의 튜터"가 된다. 실패는 치명적이지 않다 — partial이 이미 나갔다.
  let synthesis = null;
  try {
    const synthesisRaw = await callGemini(
      buildOrchestratorSynthesisPrompt({
        userInput,
        targetText,
        phoneticsReport,
        grammarReport,
        vocabularyReport,
        context: scenario,
        hasAudio: Boolean(audio),
      }),
      apiKey,
      AGENT_MODEL,
      // 실측 8~22초. 20초로 자르면 정상적으로 완성된 합성이 버려진다 —
      // 학습자는 이미 partial을 보고 있으므로 더 기다리는 비용은 없다.
      AbortSignal.timeout(45000),
      null,
      { userId, endpoint: '/api/agent/coaching:synthesis' }
    );
    synthesis = parseSynthesisResponse(synthesisRaw);
  } catch (err) {
    console.warn('[Orchestrator] 합성 실패, 1차 결과로 확정:', err.message);
  }

  return { ...partial, synthesis };
}

/**
 * 세션 종료 시 종합 학습 아티팩트(Artifact) 생성
 */
export async function generateSessionArtifact({
  sessionHistory = [],
  scenario = 'K-Survival 롤플레이',
  level = 2,
  userId,
  apiKey
}) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 필요합니다.');
  }

  const userUtterances = sessionHistory
    .filter(h => h.role === 'user')
    .map(h => (h.text || h.content || '').trim())
    .filter(Boolean);

  // 리포트를 읽는 사람은 영어권 학습자다. 예전에는 이 프롬프트가 한국어로
  // 쓰여 있어 제목부터 격려문까지 전부 한국어로 나왔고, 정작 대상 사용자가
  // 읽을 수 없는 리포트가 됐다. 한국어는 예문·표현 자체에만 남긴다.
  const prompt = `${SYSTEM_PROMPT_ORCHESTRATOR}

You are closing a practice session and writing the learner's summary report.

[Session]
- Scenario: ${scenario}
- Learner level: Level ${level} (1 = beginner, 3 = advanced)
- Learner's own sentences this session:
${userUtterances.map((u, i) => `${i + 1}. ${u}`).join('\n') || '(no conversation recorded)'}

[Language rule]
Write EVERY explanation, label, tip, and message in English. The learner is an
English speaker studying Korean. Korean appears only as the target expressions
themselves. Never write an explanation in Korean.

[Grounding rule]
Base the report on the sentences above. If there is not enough material to judge
a dimension, give it a neutral score and say so plainly rather than inventing detail.

[Output]
Return pure JSON only — no markdown fences:
{
  "sessionTitle": "A short English title for this session, max 6 words",
  "overallGrade": "A | A- | B+ | B | C",
  "totalTurns": ${userUtterances.length},
  "radarMetrics": {
    "pronunciation": 0-100,
    "grammar": 0-100,
    "vocabulary": 0-100,
    "fluency": 0-100,
    "politeness": 0-100
  },
  "keyExpressionsLearned": [
    {
      "korean": "이거 얼마예요?",
      "english": "How much is this?",
      "pronunciation": "i-geo eol-ma-ye-yo",
      "usageTip": "The most common polite way to ask a price in a shop."
    }
  ],
  "topWeaknesses": [
    {
      "category": "Particles (-에 / -에서)",
      "feedback": "Use -에서 for the place where an action happens, and -에 for a destination."
    }
  ],
  "tutorCheeringMessage": "One or two encouraging English sentences naming something specific the learner did well."
}`;

  const raw = await callGemini(prompt, apiKey, AGENT_MODEL, null, null, { userId, endpoint: '/api/agent/session-artifact' });
  try {
    let clean = (raw || '').trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(clean);
  } catch (err) {
    // 모델 응답을 파싱하지 못한 경우. 점수를 지어내지 않는다 —
    // 분석이 없었음을 그대로 밝히고, 대화가 사라지지 않았다는 사실만 알린다.
    console.warn('[SessionArtifact] JSON 파싱 실패, 중립 리포트로 대체:', err.message);
    return {
      sessionTitle: 'Session summary',
      overallGrade: null,
      totalTurns: userUtterances.length,
      radarMetrics: null,
      keyExpressionsLearned: [],
      topWeaknesses: [],
      analysisUnavailable: true,
      tutorCheeringMessage:
        'We could not finish the analysis for this session, but your conversation is saved. Try generating the report again in a moment.'
    };
  }
}

/**
 * 백그라운드 오답 패턴 분석 기반 맞춤형 미니 퀴즈 생성
 */
export async function generateReviewQuiz({
  weaknessPatterns = [],
  level = 2,
  userId,
  apiKey
}) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 필요합니다.');
  }

  // 실수 기록을 그대로 넘긴다. 무엇을 틀렸는지 알아야 그 자리를 다시 물을 수 있다.
  //
  // 번호를 붙여 넘기는 이유: 화면이 퀴즈 결과를 복습 기록으로 되돌려 쓰려면
  // "이 문항이 어느 오답을 겨냥했는가"를 알아야 한다. 번호가 없으면 맞힌 문항이
  // 어느 항목의 간격반복을 앞당겨야 하는지 알 수 없어, 퀴즈가 복습으로 이어지지 않는다.
  const scoped = weaknessPatterns.slice(-8);
  const weaknessesStr = scoped.length > 0
    ? scoped.map((w, i) => {
        if (typeof w === 'string') return `[${i}] ${w}`;
        const parts = [w.label || w.kind, w.original && `wrote "${w.original}"`, w.corrected && `should be "${w.corrected}"`];
        return `[${i}] ` + parts.filter(Boolean).join(' — ');
      }).join('\n')
    : '';

  const prompt = `You write short review quizzes for an English-speaking learner of Korean.

[Learner level]: Level ${level} (1 = beginner, 3 = advanced)
[What this learner actually got wrong recently]:
${weaknessesStr || '(no recorded mistakes yet — cover common beginner particle and speech-level choices instead)'}

Write 3 multiple-choice questions that target those specific mistakes.
Each question has exactly 4 options and one correct answer.

[Language rule]
Question text, options-explanation, and every explanation must be in ENGLISH.
Korean appears only inside the answer choices and quoted example sentences.
The learner cannot read a Korean explanation — that defeats the exercise.

[Quality rules]
- Wrong options must be plausible, not obviously silly.
- The explanation names the rule so it transfers to other sentences.
- Do not test trivia. Test the thing they got wrong.
- Every question must carry "sourceIndex": the [n] number of the recorded mistake it targets.
  If a question is not built on any listed mistake, use -1.

Return pure JSON only — no markdown fences:
{
  "quizTitle": "A short English title, max 6 words",
  "questions": [
    {
      "id": 1,
      "type": "grammar | pronunciation | vocabulary",
      "sourceIndex": 0,
      "question": "Which particle belongs in the blank? 저는 카페(  ) 커피를 마셔요.",
      "options": ["에", "에서", "을", "로"],
      "answerIndex": 1,
      "explanation": "-에서 marks the place where an action happens; -에 marks a destination you move toward."
    }
  ]
}`;

  const raw = await callGemini(prompt, apiKey, AGENT_MODEL, null, null, { userId, endpoint: '/api/agent/review-quiz' });
  try {
    let clean = (raw || '').trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(clean);
  } catch (err) {
    console.warn('[ReviewQuiz] JSON 파싱 실패, 기본 문항으로 대체:', err.message);
    return {
      quizTitle: 'Quick review',
      questions: [
        {
          id: 1,
          type: 'grammar',
          sourceIndex: -1,
          question: 'Which particle belongs in the blank?  저는 카페(  ) 커피를 마셔요.',
          options: ['에', '에서', '을', '로'],
          answerIndex: 1,
          explanation: '-에서 marks the place where an action happens. -에 marks a destination you move toward.'
        }
      ]
    };
  }
}
