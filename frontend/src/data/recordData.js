// Verbatim legacy Record data (preview/index.html 3929-3933, 4109-4120).
export const COLORS = [['Chat','대화','#23493F'],['Listening','듣기','#5B7FA6'],['Reading','읽기','#C9A24A'],['Writing','쓰기','#C8502A'],['Speaking','말하기','#9B8BBF']];
export const WEEK = [[10,6,5,0,4],[12,0,8,6,5],[8,7,0,0,6],[15,5,6,8,0],[10,8,7,0,5],[6,4,0,0,0],[0,0,0,0,0]];
export const DAYS = [['Mon','월'],['Tue','화'],['Wed','수'],['Thu','목'],['Fri','금'],['Sat','토'],['Sun','일']];
export const WD = [['Sunday','일요일'],['Monday','월요일'],['Tuesday','화요일'],['Wednesday','수요일'],['Thursday','목요일'],['Friday','금요일'],['Saturday','토요일']];
export const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const WEEKLY_REVIEW_SCRIPT_KO = `안녕하세요! Hangul Now 개인 전담 코치 민준입니다. 이번 주 동안 총 42시간 18분의 누적 학습과 12일 연속 학습 스트릭을 이어가시며 대단히 성실하게 학습하셨습니다. 이번 주 학습 데이터에서 꼭 짚고 넘어가야 할 핵심 분석 내용을 전해드립니다.

첫째, 문장 쓰기 첨삭 분석입니다.
작성하신 문장 중 "우리는 홍대에 떡볶이를 먹었어요"에서 격조사 '에'를 사용하셨는데요, 동작이나 활동이 일어나는 장소에는 조사 '-에서'를 사용해야 자연스럽습니다. 따라서 "홍대에서 떡볶이를 먹었어요"로 교정되었습니다. 또한 "정말 맛있었어서"라는 표현은 이유 연결어미 '-아서/어서' 앞에 과거 시제 '-었-'을 중복해서 쓰지 않으므로 "정말 맛있어서"로 쓰는 것이 표준 규범에 맞습니다.

둘째, 실시간 회화 및 발음 분석입니다.
김지우 튜터와의 일상 대화 세션에서 18분간 적극적으로 소통하셨으며, 특히 받침 발음과 억양 정확도가 88점으로 지난주 대비 12% 향상되었습니다. 'ㅓ'와 'ㅗ' 모음의 입술 모양 구별이 한층 더 뚜렷해졌습니다.

셋째, 이번 주 핵심 추천 복습 어휘입니다.
새로 저장하신 '벚꽃', '구경', '치맥', '분위기', '포장하다' 5개 단어를 오늘 가볍게 복습해 보세요.

이번 주도 정말 수고 많으셨습니다. 다음 주에도 함께 즐겁게 한국어 실력을 키워봐요!`;

export const RECORD_TEXT = {
  en: { recH1: 'My progress', weekH: 'Study time this week' },
  ko: { recH1: '나의 학습 기록', weekH: '이번 주 학습 시간' }
};

// Legacy app-level Record state (tabs/calendar/rank and the weekly audio review).
export const INITIAL_RECORD_STATE = Object.freeze({
  recordViewTab: 'activity',
  calYear: 2026,
  calMonth: 8,
  calSelectedDate: '2026-09-27',
  rankTab: 'streak',
  audioReviewEpisode: 1,
  audioReviewTitle: '26-09-27 Hangul Weekly Review',
  audioReviewPlaying: false,
  audioReviewCurrentTime: 0,
  audioReviewDuration: 165,
  audioReviewSpeed: 1.0,
  audioReviewLiked: null,
  audioReviewShowScript: false,
  audioReviewGenerating: false
});
