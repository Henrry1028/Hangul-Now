export const HOME_TEXT = {
  en: {
    homeDate: 'Saturday, September 26',
    homeHello: 'Good morning, Emma.',
    homeHelloSub: '좋은 아침이에요',
    levelFrom: 'Beginner 2 → Beginner 3',
    planH: 'Today’s plan',
    planMeta: '1 of 4 done · about 15 min',
    exprLabel: 'EXPRESSION OF THE DAY',
    exprDesc: 'Literally “Have you eaten?” — but really a warm “How are you?” Answer with “네, 먹었어요. ○○ 씨는요?”',
    exprBtn: 'Say it out loud',
    streakT: '12 days in a row',
    reviewLabel: 'Time to review',
    reviewT: '18 words · 3 corrected sentences',
    reviewP: 'Yesterday you mixed up “-아서/어서” with the past tense. Want to rebuild that sentence?',
    mockName: 'Jiwoo Kim'
  },
  ko: {
    homeDate: '9월 26일 토요일',
    homeHello: '좋은 아침이에요, 에마 씨.',
    homeHelloSub: '',
    levelFrom: '초급 2 → 초급 3',
    planH: '오늘의 계획',
    planMeta: '4개 중 1개 완료 · 약 15분',
    exprLabel: '오늘의 표현',
    exprDesc: '직역하면 “밥 먹었어요?”지만 실제로는 “잘 지내요?” 같은 따뜻한 인사예요. “네, 먹었어요. ○○ 씨는요?”로 답해 보세요.',
    exprBtn: '소리 내어 말해 보기',
    streakT: '12일 연속 공부 중',
    reviewLabel: '복습할 시간이에요',
    reviewT: '단어 18개 · 교정 문장 3개',
    reviewP: '어제 “-아서/어서”에 과거형을 붙였어요. 그 문장을 다시 만들어 볼까요?',
    mockName: '김지우'
  }
};

// [target, glyph, title [en, ko], sub [en, ko], minutes, done]; the chat title is tutor-dependent.
export const HOME_PLAN = [
  ['chat', '대', null, ['Keep your conversation going', '대화 이어 가기'], '5', false],
  ['listening', '듣', ['Ordering at a café', '카페에서 주문하기'], ['Listening · Beginner 2', '듣기 · 초급 2'], '3', true],
  ['reading', '읽', ['Cherry blossom season', '벚꽃 구경'], ['Reading · 7 new words', '읽기 · 새 단어 7개'], '4', false],
  ['speaking', '말', ['Shadow 3 sentences', '세 문장 따라 말하기'], ['Speaking · linking sounds', '말하기 · 연음'], '3', false]
];

export const HOME_DAYS = [['Mon', '월'], ['Tue', '화'], ['Wed', '수'], ['Thu', '목'], ['Fri', '금'], ['Sat', '토'], ['Sun', '일']];

// Last message time of the legacy Jiwoo chat seed; the sandbox has no chat state yet.
export const JIWOO_LAST_MESSAGE_TIME = '09:17';

export function formatTime(hm, L) {
  const [h, m] = hm.split(':').map(Number);
  const pm = h >= 12;
  const h12 = h % 12 || 12;
  return L === 1
    ? `${pm ? '오후 ' : '오전 '}${h12}:${String(m).padStart(2, '0')}`
    : `${h12}:${String(m).padStart(2, '0')}${pm ? ' PM' : ' AM'}`;
}

export const HOME_FEATURES = [
  { target: 'jiwoo', icon: '💬', badge: '실시간 메신저', badgeBg: 'rgba(35,73,63,0.12)', badgeFg: 'var(--accent)', title: 'AI 튜터 대화 & 교정', desc: '친구 지우와 메신저로 대화해 보세요. 실수한 문장은 실시간 교정 카드로 바로잡아 줍니다.', cta: '지금 대화 시작하기 →' },
  { target: 'writing', icon: '🧩', badge: '초·중·종성', badgeBg: 'rgba(200,94,62,0.12)', badgeFg: '#C25E3E', title: '한글 글자 조합 쓰기', desc: '훈민정음 원리로 자모 블록을 조합하고, 작성한 문장의 첨삭 피드백을 받아보세요.', cta: '글자 만들기 체험 →' },
  { target: 'speaking', icon: '🎙️', badge: 'AI Voice Coach', badgeBg: 'rgba(35,73,63,0.12)', badgeFg: 'var(--accent)', title: '음절별 발음 코칭', desc: '원어민 발음을 듣고 따라 말해 보세요. 음절별 정확도 점수와 억양 팁을 측정해 드립니다.', cta: '발음 점수 측정하기 →' },
  { target: 'reading', icon: '📖', badge: 'Kiwi 형태소', badgeBg: 'rgba(120,120,120,0.15)', badgeFg: 'var(--ink)', title: '스마트 형태소 독해', desc: '문장 속 모르는 단어를 누르면 품사, 기본형, 영문 사전 뜻풀이가 팝업으로 나타납니다.', cta: '읽기 연습 시작하기 →' }
];
