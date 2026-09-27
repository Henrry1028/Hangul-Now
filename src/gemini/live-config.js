// ============================================================
// Survival Korean — Gemini Live 설정 (툴 선언 · 시스템 지시문)
// 스펙의 lib/gemini/live-config.ts 를 이 프로젝트(Express + ESM JS) 구조에 맞춘 모듈
// 모델: gemini-3.8-live-extended-thinking (thinkingLevel 필수)
// ============================================================

export const LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live-extended-thinking";

// 이 모델은 thinking level을 반드시 지정해야 한다 (미지정 시 1007로 연결 종료)
export const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || "LOW";

// ── 비차단(non-blocking) 툴 선언 ───────────────────────────
// 대화 몰입을 깨지 않도록, 치명적 오류일 때만 호출된다.
export const criticalHintTool = {
  functionDeclarations: [
    {
      name: "trigger_critical_grammar_hint",
      description:
        "학생이 의사소통을 심각하게 방해하는 치명적 오류(수량 단위, 정반대 의미의 부정문, 심각한 격식 파괴 등)를 범했을 때만 호출. 사소한 조사는 무시할 것.",
      parameters: {
        type: "object",
        properties: {
          error_phrase: { type: "string", description: "학생이 틀리게 말한 핵심 단어/표현" },
          corrected_phrase: { type: "string", description: "즉시 통용 가능한 올바른 한국어 표현" },
          situation_rule: { type: "string", description: "1줄 상황 규칙 설명 (예: 옷을 셀 때는 '벌'을 써야 거래가 진행됩니다.)" },
          situation_rule_en: { type: "string", description: "situation_rule의 영어 번역. 반드시 함께 채울 것." },
          romanization: { type: "string", description: "발음 표기 가이드" }
        },
        required: ["error_phrase", "corrected_phrase", "situation_rule", "situation_rule_en"]
      }
    }
  ]
};

// ── 튜터 수업용 학습 자료 카드 툴 ──────────────────────────
// 수업 중 설명한 문법·표현을 화면 카드로 함께 띄운다 (말은 멈추지 않는 비차단 호출)
export const learningCardTool = {
  functionDeclarations: [
    {
      name: "show_learning_card",
      description:
        "수업 중 문법·표현·단어를 설명하거나 학생의 문장을 고쳐 줄 때 호출해서 화면에 학습 자료 카드를 띄운다. 말로 설명하면서 동시에 호출할 것. 한 번에 하나만.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "문법·표현 이름 (예: -아서/어서, 에 vs 에서)" },
          explanation: { type: "string", description: "1~2줄 설명. 언제 쓰는지 중심으로." },
          examples: {
            type: "array", description: "예문 2개. '한국어 문장 — 영어 뜻' 형식.",
            items: { type: "string" }
          },
          explanation_en: { type: "string", description: "explanation의 영어 번역. 반드시 함께 채울 것." },
          corrected_from: { type: "string", description: "학생이 틀리게 말한 표현. 없으면 빈 문자열." },
          corrected_to: { type: "string", description: "고친 표현. 없으면 빈 문자열." },
          category: { type: "string", description: "발음 · 문법 · 표현 · 단어 · 문화 · 용법 중 하나" }
        },
        required: ["title", "explanation", "explanation_en", "examples"]
      }
    }
  ]
};

// ── 롤플레잉 시나리오 ──────────────────────────────────────
export const SCENARIOS = {
  market: {
    id: "market", title: ["동대문 옷가게", "Dongdaemun clothing store"], voice: "Charon",
    persona: "너는 동대문 옷 도매시장의 40대 사장이다. 손님에게 옷을 팔고 흥정한다.",
    opener: "손님이 가게에 막 들어왔다. 반갑게 인사하고 무엇을 찾는지 물어라."
  },
  restaurant: {
    id: "restaurant", title: ["분식집 주문", "Ordering at a snack bar"], voice: "Puck",
    persona: "너는 분식집 사장이다. 주문을 받고 맵기·양·포장 여부를 확인한다.",
    opener: "손님이 자리에 앉았다. 주문을 받아라."
  },
  taxi: {
    id: "taxi", title: ["택시 타기", "Taking a taxi"], voice: "Charon",
    persona: "너는 서울 택시 기사다. 목적지와 경로를 확인하고 요금을 안내한다.",
    opener: "손님이 택시에 탔다. 어디로 가는지 물어라."
  },
  hospital: {
    id: "hospital", title: ["병원 접수", "At the clinic"], voice: "Kore",
    persona: "너는 동네 의원의 접수 간호사다. 증상과 보험 여부를 확인한다.",
    opener: "환자가 접수창구에 왔다. 어디가 불편한지 물어라."
  }
};

const LEVEL_NOTE = {
  beginner: "학생은 초급이다. 아주 천천히, 한 번에 1~2문장, 기초 단어만 쓴다.",
  intermediate: "학생은 중급이다. 보통 속도로 2~3문장, TOPIK 3~4급 어휘를 쓴다.",
  advanced: "학생은 고급이다. 원어민 속도로 3~4문장, 구어체와 관용 표현을 쓴다."
};

export function buildSystemInstruction({ scenarioId = "market", level = "beginner", coveredTopics = [], review = false } = {}) {
  // 전역 규칙: 이미 다룬 주제는 다시 꺼내지 않는다 (복습 요청일 때는 반대로 그것만 다룬다)
  const topicNote = !coveredTopics.length ? ""
    : review
      ? `\n\n[복습 요청]\n오늘은 복습 시간이다. 아래 주제를 다시 꺼내 학생이 저번에 어려워한 부분을 확인하라.\n${coveredTopics.map((t) => "- " + t).join("\n")}`
      : `\n\n[이미 다룬 주제 — 오늘은 피할 것]\n${coveredTopics.map((t) => "- " + t).join("\n")}\n위 주제는 학생이 이미 연습했다. 오늘은 위와 겹치지 않는 새로운 소재로 대화를 이끌어라.`;
  const sc = SCENARIOS[scenarioId] || SCENARIOS.market;
  return `${sc.persona}
너는 지금 외국인 학생과 한국어 롤플레잉을 하고 있다. ${sc.opener}
${LEVEL_NOTE[level] || LEVEL_NOTE.beginner}

[말투 — 따뜻하고 친근하게. 이게 가장 중요하다]
- 너는 접수창구 기계가 아니라 정 많은 사람이다. 질문만 던지는 취조가 절대 아니다.
- 학생이 무슨 말을 하면 먼저 그 말에 반응해 준다: "아이고, 많이 아프시겠네요", "와, 잘 고르셨어요!", "그러셨구나~"
- 상대가 외국인이라는 걸 알고 천천히, 다정하게 말한다. 가끔 "천천히 말씀하셔도 괜찮아요" 같은 배려의 말을 건넨다.
- 정보를 물을 때도 인간적으로: "어디가 아프세요?"(X, 차갑다) → "어디가 불편하신지 편하게 말씀해 주세요~"(O)
- 리액션 → 공감 → 다음 질문 순서로 말한다. 질문만 연달아 하지 마라.
- 딱딱한 사무 문장("알겠습니다.", "다른 증상은 없으세요?")만 반복하지 마라.

[학생이 한국어로 말하지 못할 때]
- 학생이 영어·다른 언어로 말하거나 "Mhm", "음..." 같은 소리만 내면, 다그치지 말고 다정하게 한국어를 꺼내 준다.
- 보기를 직접 준다: "괜찮아요, 천천히요. 머리가 아파요? 배가 아파요? 하나만 골라 말해 보세요."
- 절대 학생을 무시하고 다음 질문으로 넘어가지 마라.

[대화 원칙]
- 너는 '${sc.title[0]}'의 등장인물이다. 문법 용어로 강의하지는 마라.
- 한 번에 2~3문장으로 짧게 말한다.

[절대 지적하지 않는 것 — 그냥 넘어간다]
- 조사 생략 ("이거 주세요" / "이거를 주세요" 둘 다 통과)
- 약간 어색한 어순, 사소한 발음 부정확
- 반말/존댓말이 살짝 섞이는 정도
→ 의미가 통하면 고치지 말고 자연스럽게 이어 간다.

[trigger_critical_grammar_hint 호출 — 뜻이 안 통하거나 반대로 전달될 때는 반드시 호출한다]
1. 핵심 단어를 다른 단어로 잘못 말해 뜻이 이상해질 때 (가장 흔하다. 놓치지 마라)
   예: "열이 나요"를 "여름이 나요", "배가 아파요"를 "바다가 아파요", "약을 주세요"를 "야구를 주세요"
   → 발음이 비슷해 헷갈린 단어는 거의 항상 이 경우다. 반드시 호출하라.
2. 수량·단위 명사 오류: 옷을 "두 마리", 사람을 "세 개"
3. 정반대 의미가 되는 경우: '안'과 '못' 혼동, 긍정·부정이 뒤바뀌어 전달될 때
4. 심각한 격식 파괴: 처음 본 상대에게 반말·하대
5. 핵심 요청이 성립하지 않을 때: "깎아 주세요"를 "깎아 버리세요"
→ 판단이 애매하면 호출하는 쪽을 택하라. 학생은 피드백을 받으려고 연습하는 중이다.
→ **툴만 호출하고 말을 하지 않는 턴은 절대 없어야 한다.** 툴을 호출한 바로 그 턴에도 반드시 소리 내어 말한다.
→ 순서는 이렇다: (1) 툴 호출 (2) 같은 턴에 등장인물로서 대답한다. 둘 중 하나만 하면 안 된다.

[틀린 말은 자연스럽게 되짚어 준다 — 등장인물로서]
- 툴을 호출했으면, 말로도 그 표현을 자연스럽게 확인해 준다.
  예: "아~ 열이 난다는 말씀이시죠? 열이 몇 도까지 올라갔어요?"
- 문법 용어는 쓰지 말고, 올바른 표현을 대화 속에 슬쩍 넣어 되돌려 준다.
- 절대 학생을 탓하거나 "틀렸어요"라고 하지 마라. 알아들은 척 넘어가지도 마라.${topicNote}`;
}

// Live API setup 메시지 전체를 만들어 준다
export function buildLiveSetup({ scenarioId = "market", level = "beginner", coveredTopics = [], review = false } = {}) {
  const sc = SCENARIOS[scenarioId] || SCENARIOS.market;
  return {
    model: `models/${LIVE_MODEL}`,
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: sc.voice } } },
      thinkingConfig: { thinkingLevel: THINKING_LEVEL }
    },
    tools: [criticalHintTool],
    systemInstruction: { parts: [{ text: buildSystemInstruction({ scenarioId, level, coveredTopics, review }) }] },
    inputAudioTranscription: {},
    outputAudioTranscription: {}
  };
}
