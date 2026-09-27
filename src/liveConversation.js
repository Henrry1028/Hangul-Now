// ============================================================
// 실시간 회화 (Conversation) — Gemini Live API 프록시
// 브라우저 ↔ (이 서버) ↔ gemini-3.8-live
// API 키가 브라우저에 노출되지 않도록 서버가 중계한다.
// 대화 전사는 Live API가 제공하는 입력/출력 transcription을 사용한다.
// ============================================================

import { WebSocketServer, WebSocket } from "ws";
import { buildLiveSetup, SCENARIOS, LIVE_MODEL as RP_MODEL, learningCardTool } from "./gemini/live-config.js";
import { getCoveredTopics, recordLearned } from "./learningHistory.js";

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";
const LIVE_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

// 튜터별 목소리와 전문 분야 (preview/index.html의 TUTORS와 대응)
const TUTOR_PROFILES = {
  jiwoo:   { name: "김지우", voice: "Aoede",  focus: "일상 회화", style: "밝고 친근하게, 조금 천천히 말한다." },
  minho:   { name: "박민호", voice: "Charon", focus: "비즈니스 한국어", style: "차분하고 정중하게, 보통 속도로 말한다." },
  seoyeon: { name: "이서연", voice: "Kore",   focus: "TOPIK·정밀 문법", style: "또박또박 설명하며 이유를 꼭 덧붙인다." },
  haneul:  { name: "최하늘", voice: "Iapetus", focus: "발음·억양 교정", style: "발음을 시범 보이듯 또렷하게 말한다." }
};

// 난이도별로 말 속도·문장 길이·어휘·교정 깊이·영어 사용을 뚜렷하게 구분한다
const LEVEL_NOTE = {
  beginner: `[난이도: 초급]
- 말 속도: 아주 천천히, 또박또박. 문장 사이를 충분히 쉰다.
- 문장 길이: 한 번에 1~2문장, 한 문장은 10단어 이내.
- 어휘: TOPIK 1~2급 기초 단어만 쓴다. 어려운 단어가 필요하면 바로 쉬운 말로 풀어 준다.
- 질문: "네/아니요"나 한 단어로 답할 수 있는 쉬운 질문을 한다.
- 교정: 한 번에 딱 하나만. 의미가 통하면 작은 실수는 넘어간다.
- 영어: 학생이 막히면 영어로 짧게 힌트를 준 뒤 다시 한국어로 돌아온다.`,
  intermediate: `[난이도: 중급]
- 말 속도: 보통 속도. 자연스럽게 말한다.
- 문장 길이: 한 번에 2~3문장.
- 어휘: TOPIK 3~4급 수준. 새 표현은 예문 하나와 함께 알려 준다.
- 질문: 이유나 경험을 설명해야 하는 질문을 한다. ("왜 그렇게 생각하세요?")
- 교정: 중요한 것 1~2개. 틀린 이유를 한 줄로 설명한다.
- 영어: 꼭 필요할 때만 단어 뜻 정도로 쓴다.`,
  advanced: `[난이도: 고급]
- 말 속도: 원어민과 같은 자연스러운 속도. 줄임말과 실제 구어체를 쓴다.
- 문장 길이: 한 번에 3~4문장.
- 어휘: TOPIK 5~6급, 관용 표현·사자성어·신조어도 섞어 쓴다.
- 질문: 의견을 묻거나 반대 입장을 제시해 토론하듯 이끈다.
- 교정: 문법보다 뉘앙스·격식·자연스러움 위주로 짚는다. 틀리지 않았어도 더 세련된 표현을 제안한다.
- 영어: 쓰지 않는다. 설명도 한국어로 한다.`
};

function buildSystemInstruction(tutorId, level) {
  const p = TUTOR_PROFILES[tutorId] || TUTOR_PROFILES.jiwoo;
  const lv = LEVEL_NOTE[level] || LEVEL_NOTE.beginner;
  return `너는 '${p.name}' 선생님이다. 한국어 어학당에서 30년간 외국인에게 한국어를 가르쳐 온 베테랑 교사이고, 전문 분야는 ${p.focus}이다.
지금 학생과 음성으로 1:1 대화 수업을 하고 있다. ${p.style}
${lv}

[말투 — 따뜻하고 친근하게]
- 30년 동안 외국인 학생을 가르치며 쌓인 정과 여유가 묻어나는 말투로 말한다.
- 학생이 말하면 먼저 그 말에 반응해 준다: "오~ 좋은데요?", "아이고, 고생하셨네요", "그러셨구나~"
- 질문만 연달아 던지지 마라. 리액션 → 공감 → 질문 순서로 말한다.
- 잘한 점을 자주 짚어 준다. 작은 것이라도 구체적으로 칭찬한다.
- 딱딱한 사무 문장("알겠습니다.", "다음 질문입니다.")을 반복하지 마라.

[수업 진행]
- 네가 먼저 "오늘은 어떤 얘기를 해 볼까요?"처럼 가볍게 말을 걸어 주제를 정하고, 대화를 계속 이끈다.
- 학생이 말을 멈추면 반드시 이어질 질문을 던져 대화가 끊기지 않게 한다.
- 한 번에 2~4문장 정도로 짧게 말한다. 혼자 길게 설명하지 않는다.
- 학생이 영어로 물으면 짧게 영어로 답하되, 수업은 한국어로 되돌린다.
- 학생이 "음…", "Mhm" 같은 소리만 내거나 막히면, 다그치지 말고 보기를 직접 준다:
  "천천히 하셔도 괜찮아요. 머리가 아파요? 배가 아파요? 하나만 골라 보세요."

[뜻이 안 통하는 실수는 반드시 짚는다]
- 발음이 비슷한 단어를 헷갈려 뜻이 이상해지면 꼭 확인해 준다.
  예: "열이 나요"를 "여름이 나요", "배가 아파요"를 "바다가 아파요"
- 알아들은 척 그냥 넘어가지 마라. 다만 탓하지 말고 다정하게 되짚어 준다.
  "아~ 열이 난다는 말씀이시죠? 여름이 아니라 열이에요. 열이 몇 도까지 올랐어요?"

[실시간 피드백 — 아래 모든 영역을 다룬다]
- 발음: 받침, 연음, 경음화, 억양에서 어색한 부분을 직접 소리 내어 시범 보인다.
- 문법: 조사·어미·시제 오류를 바로잡고 왜 틀렸는지 한 줄로 설명한다.
- 표현: 어색하지만 틀리지는 않은 문장을 한국 사람이 실제로 쓰는 표현으로 바꿔 준다.
- 단어: 학생이 쓴 단어보다 더 알맞은 단어가 있으면 알려 주고 예문을 하나 든다.
- 문화: 말투·높임말·상황에 맞는 예절처럼 문화적 배경이 필요한 부분을 알려 준다.
- 용법: 비슷한 표현의 차이(예: 은/는과 이/가, -아서와 -니까)를 상황에 맞게 구분해 준다.

[피드백 방식]
- 칭찬 → 교정 → 다시 질문 순서로 자연스럽게 이어 간다.
- 틀린 부분이 여러 개면 그 중 가장 중요한 한두 개만 고른다. 학생이 주눅 들지 않게 한다.
- 교정할 때는 "지금 '홍대에 갔어요'라고 하셨죠? '홍대에서'가 더 자연스러워요"처럼 학생이 한 말을 그대로 인용한 뒤 고쳐 준다.

[화면에 학습 자료 띄우기 — show_learning_card]
- 문법·표현·단어를 설명하거나 학생 문장을 고쳐 줄 때는 말로 설명하면서 동시에 show_learning_card를 호출해 화면에 카드를 띄운다.
- 학생이 눈으로도 확인할 수 있게, 설명한 내용에는 되도록 카드를 함께 띄운다.
- 카드는 보조 자료다. 카드를 띄웠다고 말을 멈추지 말고 설명과 대화를 그대로 이어 간다.
- 예문은 항상 2개, '한국어 문장 — 영어 뜻' 형식으로 넣는다.
- 한 번에 카드 하나만. 같은 내용을 반복해서 띄우지 않는다.`;
}

export function attachLiveConversation(server, { path: wsPath = "/api/live" } = {}) {
  const wss = new WebSocketServer({ server, path: wsPath });

  wss.on("connection", (client) => {
    const apiKey = process.env.GEMINI_API_KEY;
    let upstream = null;
    let closed = false;

    const toClient = (obj) => {
      if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(obj));
    };

    if (!apiKey) {
      toClient({ type: "error", message: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." });
      client.close();
      return;
    }

    const closeAll = () => {
      if (closed) return;
      closed = true;
      try { upstream?.close(); } catch {}
      try { client.close(); } catch {}
    };

    // mode: 'tutor'(어학당 선생님) | 'roleplay'(Survival Korean 롤플레잉 + 치명적 오류 힌트)
    const startSession = async ({ tutorId = "jiwoo", level = "beginner", mode = "tutor", scenarioId = "market", userId = null, review = false }) => {
      if (upstream) return;
      // 전역 규칙: 이미 다룬 주제를 프롬프트에 넘겨 오늘은 새로운 소재로 이끌게 한다
      const coveredTopics = userId ? await getCoveredTopics(userId) : [];
      client._userId = userId;
      const p = TUTOR_PROFILES[tutorId] || TUTOR_PROFILES.jiwoo;
      const roleplay = mode === "roleplay";
      upstream = new WebSocket(`${LIVE_URL}?key=${apiKey}`);

      upstream.on("open", () => {
        const setup = roleplay
          ? buildLiveSetup({ scenarioId, level, coveredTopics, review })
          : {
              model: `models/${LIVE_MODEL}`,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: p.voice } } }
              },
              tools: [learningCardTool],
              systemInstruction: { parts: [{ text: buildSystemInstruction(tutorId, level) }] },
              inputAudioTranscription: {},
              outputAudioTranscription: {}
            };
        client._roleplay = roleplay;
        client._scenarioId = scenarioId;
        upstream.send(JSON.stringify({ setup }));
      });

      upstream.on("message", (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        if (msg.setupComplete) {
          const sc = SCENARIOS[scenarioId];
          toClient({
            type: "ready",
            tutor: roleplay ? (sc?.title?.[0] || "롤플레잉") : p.name,
            voice: roleplay ? sc?.voice : p.voice,
            model: roleplay ? RP_MODEL : LIVE_MODEL,
            mode
          });
          upstream.send(JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: roleplay
                ? "(상황극을 시작합니다. 등장인물로서 먼저 손님에게 말을 거세요.)"
                : "(수업을 시작합니다. 선생님이 먼저 인사하고 오늘 대화 주제를 물어봐 주세요.)" }] }],
              turnComplete: true
            }
          }));
          return;
        }

        // ── 비차단 툴 호출: 힌트 카드를 띄우고 즉시 응답해 대화를 멈추지 않는다 ──
        if (msg.toolCall) {
          const responses = [];
          for (const fc of msg.toolCall.functionCalls || []) {
            if (fc.name === "trigger_critical_grammar_hint") {
              toClient({ type: "hint", hint: { ...(fc.args || {}), at: Date.now() } });
            } else if (fc.name === "show_learning_card") {
              toClient({ type: "card", card: { ...(fc.args || {}), at: Date.now() } });
            }
            responses.push({ id: fc.id, name: fc.name, response: { status: "displayed" } });
          }
          if (responses.length) {
            upstream.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
          }
          return;
        }
        if (msg.toolCallCancellation) return;

        if (msg.voiceActivity) {
          toClient({ type: "vad", event: msg.voiceActivity.type });
          return;
        }

        const sc = msg.serverContent;
        if (!sc) return;

        if (sc.inputTranscription?.text) toClient({ type: "transcript", role: "user", text: sc.inputTranscription.text });
        if (sc.outputTranscription?.text) toClient({ type: "transcript", role: "tutor", text: sc.outputTranscription.text });
        if (sc.interrupted) toClient({ type: "interrupted" });

        for (const part of sc.modelTurn?.parts || []) {
          if (part.inlineData?.data) toClient({ type: "audio", data: part.inlineData.data });
          if (part.text) toClient({ type: "transcript", role: "tutor", text: part.text });
        }
        if (sc.turnComplete) toClient({ type: "turnComplete" });
      });

      upstream.on("error", (err) => {
        toClient({ type: "error", message: `Gemini Live 연결 오류: ${err.message}` });
        closeAll();
      });
      upstream.on("close", (code, reason) => {
        toClient({ type: "closed", code, reason: reason?.toString().slice(0, 200) || "" });
        closeAll();
      });
    };

    client.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === "start") return startSession(msg);
      if (!upstream || upstream.readyState !== WebSocket.OPEN) return;

      if (msg.type === "audio" && msg.data) {
        upstream.send(JSON.stringify({
          realtimeInput: { audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" } }
        }));
      } else if (msg.type === "audioEnd") {
        upstream.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      } else if (msg.type === "text" && msg.text) {
        upstream.send(JSON.stringify({
          clientContent: { turns: [{ role: "user", parts: [{ text: msg.text }] }], turnComplete: true }
        }));
      } else if (msg.type === "stop") {
        closeAll();
      }
    });

    client.on("close", closeAll);
    client.on("error", closeAll);
  });

  console.log(` 🎙️ 실시간 회화 WebSocket 준비됨: ${wsPath} (${LIVE_MODEL})`);
  return wss;
}
