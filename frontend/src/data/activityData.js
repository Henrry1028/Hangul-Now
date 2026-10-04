export const DEFAULT_USER_XP = 2840;
export const DEFAULT_TOTAL_MINUTES = 2538;

export const DEFAULT_STUDY_DATES = [
  '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05',
  '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12',
  '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
  '2026-09-19', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24',
  '2026-09-25', '2026-09-26', '2026-09-27'
];

export const DEFAULT_ACTIVITY_LOGS = [
  { id: 'log_init_1', type: 'chat', module: '튜터 대화', title: '지우 튜터와 일상 대화', detail: '"지난 주말에 친구를 만났어요. 우리는 홍대에서 떡볶이를 먹었어요."', xp: 20, time: '10분 전', tag: '채팅 교정', icon: '💬' },
  { id: 'log_init_2', type: 'conversation', module: '실시간 회화', title: 'Gemini Live 실시간 롤플레잉', detail: '동대문 옷가게 상황극 8턴 완주 (원어민 발음 코칭 + 힌트 카드 1건)', xp: 60, time: '32분 전', tag: '실시간 음성', icon: '🗣️' },
  { id: 'log_init_3', type: 'writing', module: '자모 쓰기', title: '자모 글자 조립 완성', detail: '"한" (ㅎ + ㅏ + ㄴ) 유니코드 조합 완료', xp: 15, time: '1시간 전', tag: '쓰기 연습', icon: '✍️' },
  { id: 'log_init_4', type: 'speaking', module: '발음 코칭', title: 'AI 음절별 발음 분석', detail: '"주말에 뭐 했어요?" 발음 정확도 86점 (자연스러운 억양)', xp: 25, time: '2시간 전', tag: '발음 86점', icon: '🎙️' },
  { id: 'log_init_5', type: 'listening', module: '듣기 연습', title: '카페 주문 받아쓰기 통과', detail: '"포장해" 정확하게 듣고 받아쓰기 성공', xp: 20, time: '3시간 전', tag: '듣기 퀴즈', icon: '🎧' },
  { id: 'log_init_6', type: 'reading', module: '읽기 독해', title: '벚꽃 축제 독해 & 단어 저장', detail: '"벚꽃", "분위기" 어휘 학습 및 사전 조회', xp: 15, time: '어제', tag: '어휘 습득', icon: '📖' }
];

const ACTIVITY_LOGS_KEY = 'hn-activity-logs';
const STUDY_DATES_KEY = 'hn-study-dates';
const USER_XP_KEY = 'hn-user-xp';

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadActivityState() {
  if (typeof window === 'undefined') {
    return {
      activityLogs: DEFAULT_ACTIVITY_LOGS.map((item) => ({ ...item })),
      userXp: DEFAULT_USER_XP,
      studyDates: [...DEFAULT_STUDY_DATES],
      userTotalMins: DEFAULT_TOTAL_MINUTES
    };
  }

  const storedLogs = readJson(ACTIVITY_LOGS_KEY, []);
  const storedDates = readJson(STUDY_DATES_KEY, null);
  const storedXp = window.localStorage.getItem(USER_XP_KEY);
  return {
    activityLogs: Array.isArray(storedLogs) && storedLogs.length
      ? storedLogs
      : DEFAULT_ACTIVITY_LOGS.map((item) => ({ ...item })),
    userXp: storedXp ? Number(storedXp) : DEFAULT_USER_XP,
    studyDates: Array.isArray(storedDates) ? storedDates : [...DEFAULT_STUDY_DATES],
    userTotalMins: DEFAULT_TOTAL_MINUTES
  };
}

export function appendActivity(state, entry, at = new Date()) {
  const xp = entry.xp || 15;
  const timeString = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  const dateString = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const activity = {
    id: `act_${at.getTime()}_${Math.random().toString(36).slice(2, 5)}`,
    type: entry.type || 'study',
    module: entry.module || '읽기 독해',
    icon: entry.icon || '📖',
    title: entry.title || '학습 활동 완료',
    detail: entry.detail || '',
    xp,
    time: `방금 전 (${timeString})`,
    date: dateString,
    ts: at.getTime(),
    tag: entry.tag || '학습'
  };
  const dates = new Set(state.studyDates || []);
  dates.add(dateString);

  return {
    activityLogs: [activity, ...(state.activityLogs || [])].slice(0, 150),
    userXp: (state.userXp || DEFAULT_USER_XP) + xp,
    studyDates: Array.from(dates),
    userTotalMins: (state.userTotalMins || DEFAULT_TOTAL_MINUTES) + 2
  };
}

export function persistActivityState(state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(state.activityLogs));
    window.localStorage.setItem(STUDY_DATES_KEY, JSON.stringify(state.studyDates));
    window.localStorage.setItem(USER_XP_KEY, String(state.userXp));
  } catch {
    // Match the legacy client: storage failures do not block the learning action.
  }
}
