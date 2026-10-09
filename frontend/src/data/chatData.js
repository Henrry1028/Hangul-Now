export const RETENTION_DAYS = 7;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const CHAT_STORAGE_KEY = 'hn_chat_history_v1';
export const DEFAULT_GREETING_TEXT = '안녕하세요! 오늘은 어떤 얘기를 해볼까요?';
export const DEFAULT_GREETING_TR = 'Hello! What would you like to talk about today?';

export function getTodayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const TODAY = getTodayIso();

export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function createDefaultGreetingMessage(tutorId = 'jiwoo') {
  const now = Date.now();
  return {
    id: `greet_${tutorId}_${now}`,
    from: 't',
    text: DEFAULT_GREETING_TEXT,
    tr: DEFAULT_GREETING_TR,
    time: nowHM(),
    date: getTodayIso(),
    timestamp: now
  };
}

export const SEED = {
  jiwoo: [createDefaultGreetingMessage('jiwoo')],
  minho: [createDefaultGreetingMessage('minho')],
  seoyeon: [createDefaultGreetingMessage('seoyeon')],
  haneul: [createDefaultGreetingMessage('haneul')]
};

export const REPLIES = [
  {text:'오, 그렇군요! 조금 더 자세히 말해 줄 수 있어요?', tr:'Oh, I see! Can you tell me a bit more?'},
  {text:'좋아요. 방금 문장 아주 자연스러웠어요.', tr:'Nice — that sentence sounded really natural.'},
  {text:'그럴 때는 “같이 갈까요?”처럼 ‘-(으)ㄹ까요?’를 써 보세요.', tr:'Try ‘-(으)ㄹ까요?’ there, like “같이 갈까요?” (Shall we go together?)'},
  {text:'하하, 재미있네요. 그다음에는 뭐 했어요?', tr:'Haha, that’s fun. What did you do after that?'}
];

export const QUICK = [['다시 한번 말해 주세요','Say it again'],['무슨 뜻이에요?','What does it mean?'],['천천히 말해 주세요','Slower please'],['예문 보여 주세요','Show an example']];

export const CHAT_TEXT = {
  en: {
    onlineLabel: 'Online now',
    tapTr: 'Tap to translate',
    correction: 'CORRECTION',
    savedNotes: 'Saved to mistake notes',
    placeholder: 'Reply in Korean — mistakes are welcome',
    send: 'Send'
  },
  ko: {
    onlineLabel: '대화 가능',
    tapTr: '눌러서 번역 보기',
    correction: '고쳐 쓰기',
    savedNotes: '오답 노트에 저장됨',
    placeholder: '한국어로 답해 보세요. 틀려도 괜찮아요',
    send: '전송'
  }
};

const WD = [['Sunday', '일요일'], ['Monday', '월요일'], ['Tuesday', '화요일'], ['Wednesday', '수요일'], ['Thursday', '목요일'], ['Friday', '금요일'], ['Saturday', '토요일']];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function fmtDate(iso, L) {
  const d = new Date(`${iso}T12:00:00`);
  return L === 1
    ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()][1]}`
    : `${WD[d.getDay()][0]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function pruneOldMessages(messages, now = Date.now()) {
  if (!Array.isArray(messages)) return [];
  return messages.filter((m) => {
    if (!m) return false;
    // 과거 하드코딩 예시 대화(에마 씨 등)는 영구 제거
    if (m.text && m.text.includes('에마 씨, 좋은 아침이에요')) return false;
    if (m.text && m.text.includes('어제는 비가 많이 왔어서')) return false;

    const ts = typeof m.timestamp === 'number'
      ? m.timestamp
      : (m.date ? new Date(`${m.date}T12:00:00`).getTime() : 0);
    if (!ts || isNaN(ts)) return false;

    return (now - ts) <= RETENTION_MS;
  });
}

export function loadStoredChatMessages() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return JSON.parse(JSON.stringify(SEED));
  }
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(SEED));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return JSON.parse(JSON.stringify(SEED));

    const tutors = ['jiwoo', 'minho', 'seoyeon', 'haneul'];
    const result = {};
    const now = Date.now();

    tutors.forEach((tid) => {
      const list = Array.isArray(parsed[tid]) ? parsed[tid] : [];
      const validList = pruneOldMessages(list, now);
      if (!validList.length) {
        result[tid] = [createDefaultGreetingMessage(tid)];
      } else {
        result[tid] = validList;
      }
    });

    return result;
  } catch (err) {
    console.warn('[loadStoredChatMessages error]', err);
    return JSON.parse(JSON.stringify(SEED));
  }
}

export function saveStoredChatMessages(msgs) {
  if (typeof window === 'undefined' || !window.localStorage || !msgs) return;
  try {
    const tutors = Object.keys(msgs);
    const cleaned = {};
    const now = Date.now();
    tutors.forEach((tid) => {
      const list = Array.isArray(msgs[tid]) ? msgs[tid] : [];
      cleaned[tid] = pruneOldMessages(list, now);
    });
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('[saveStoredChatMessages error]', err);
  }
}

export function createInitialChatState() {
  return {
    msgs: loadStoredChatMessages(),
    unread: {},
    typing: false,
    draft: '',
    trAll: false,
    trOpen: {},
    chatTransLoading: false,
    chatTransTutorId: '',
    chatTranslationError: '',
    ri: 0
  };
}
