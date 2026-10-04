// Legacy Conversation (Gemini Live) labels, constants and local history (preview/index.html).
export const TUTOR_SESSION_SECONDS = 10 * 60;

export const CONVERSATION_TEXT = {
  en: {
    cvEyebrow: 'CONVERSATION',
    cvTitle: 'Talk with your tutor',
    cvStart: 'Start conversation',
    cvStop: 'End conversation',
    cvTranscriptH: 'Live transcript',
    cvMe: 'Me',
    cvEmpty: 'Press “Start conversation” and your tutor opens with “오늘은 어떤 얘기를 해 볼까요?” Just answer out loud — everything is transcribed as you speak.',
    cvFeedbackH: 'Real-time feedback',
    cvFeedbackP: 'A teacher with 30 years at a Korean language institute listens and corrects you as you talk.',
    cvAreas: ['Pronunciation', 'Grammar', 'Expressions', 'Vocabulary', 'Culture', 'Usage'],
    cvSaveH: 'Transcript file',
    cvSaveP: 'When the conversation ends, the whole transcript is ready to download as a text file.',
    cvScenarioLabel: 'SCENARIO',
    cvHintH: 'Critical fixes',
    cvHintEmpty: 'Small slips are ignored so the roleplay keeps flowing. Only errors that would break the exchange — wrong counters, reversed negation — pop up here.',
    cvReportH: 'PDF review note',
    cvReportP: 'Morpheme analysis (Kiwi) plus a teacher’s corrections, laid out as a PDF with Korean fonts embedded. Signed in, it is archived to your account too.',
    cvCardH: 'Lesson notes',
    cvCardEmpty: 'When your tutor explains a grammar point or corrects you, the card appears here so you can see it as well as hear it.',
    cvHelperH: 'Essential Expressions',
    cvLevelLabel: 'THIS LEVEL',
    cvKeepNotice: 'Transcripts are kept in this browser for 7 days and then deleted automatically. Download anything you want to keep longer.',
    cvKeepBadge: 'Kept for 7 days',
    cvDownloadShort: 'Transcript',
    cvReportShort: 'Review PDF',
    cvHistoryH: 'Conversation history',
    cvHistorySub: 'Every conversation from the last 7 days, newest first.',
    cvHistoryEmpty: 'No conversations yet. Once you finish one, it is saved here for 7 days.',
    cvReviewGenerating: 'Creating your 10-minute review in your feedback language. You can keep using the app.',
    cvReviewReady: 'Your personal audio review is ready.',
    cvReviewDownload: 'Download audio review'
  },
  ko: {
    cvEyebrow: '실시간 회화',
    cvTitle: '튜터와 음성으로 대화하기',
    cvStart: '대화 시작',
    cvStop: '대화 종료',
    cvTranscriptH: '실시간 전사',
    cvMe: '나',
    cvEmpty: '‘대화 시작’을 누르면 선생님이 먼저 “오늘은 어떤 얘기를 해 볼까요?”라고 말을 걸어요. 소리 내어 답하면 말하는 내용이 그대로 전사돼요.',
    cvFeedbackH: '실시간 피드백',
    cvFeedbackP: '',
    cvAreas: ['발음', '문법', '표현', '단어', '문화', '용법'],
    cvSaveH: '전사본 파일',
    cvSaveP: '대화가 끝나면 전체 대화 내용을 텍스트 파일로 바로 내려받을 수 있어요.',
    cvScenarioLabel: '상황',
    cvHintH: '꼭 고쳐야 할 표현',
    cvHintEmpty: '사소한 실수는 몰입을 위해 넘어가요. 단위를 잘못 쓰거나 뜻이 반대가 되는 것처럼 거래가 막히는 오류만 여기에 떠요.',
    cvReportH: '복습 노트 PDF',
    cvReportP: '형태소 분석(Kiwi)과 선생님 첨삭을 합쳐 한글이 깨지지 않는 PDF로 만들어요.',
    cvCardH: '수업 자료',
    cvCardEmpty: '선생님이 문법을 설명하거나 문장을 고쳐 주면 그 내용이 카드로 여기에 떠요. 듣기만 하지 않고 눈으로도 확인할 수 있어요.',
    cvHelperH: '대화 필수 표현 퀵 레퍼런스',
    cvLevelLabel: '이 난이도는',
    cvKeepNotice: '전사본은 이 브라우저에 7일간 보관되고 그 뒤 자동으로 삭제돼요. 더 오래 두려면 파일로 내려받아 주세요.',
    cvKeepBadge: '7일간 보관',
    cvDownloadShort: '전사본',
    cvReportShort: '복습 PDF',
    cvHistoryH: '대화 기록',
    cvHistorySub: '최근 7일 동안 나눈 대화예요. 최신순으로 보여 줘요.',
    cvHistoryEmpty: '아직 대화 기록이 없어요. 대화를 마치면 여기에 7일간 보관돼요.',
    cvReviewGenerating: '지정한 피드백 언어로 10분 오디오 복습을 만들고 있어요. 다른 화면을 이용해도 괜찮아요.',
    cvReviewReady: '나만의 오디오 복습이 준비됐어요.',
    cvReviewDownload: '오디오 복습 내려받기'
  }
};

export const SCENARIO_NAMES = { market: '동대문 옷가게', restaurant: '분식집 주문', taxi: '택시 타기', hospital: '병원 접수' };

const CV_STORE_KEY = 'hn-conversations';
const CV_KEEP_DAYS = 7;

// Legacy loadConversations: 7-day retention, pruned on read.
export function loadConversations() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(CV_STORE_KEY) || '[]'); } catch { list = []; }
  const cutoff = Date.now() - CV_KEEP_DAYS * 864e5;
  const kept = list.filter((c) => c && c.savedAt && c.savedAt >= cutoff);
  if (kept.length !== list.length) { try { localStorage.setItem(CV_STORE_KEY, JSON.stringify(kept)); } catch { /* ignore */ } }
  return kept;
}

export function storeConversations(list) {
  try { localStorage.setItem(CV_STORE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function createInitialConversationState() {
  return {
    cvStatus: 'idle',
    cvTurns: [],
    cvPartial: { user: '', tutor: '' },
    cvError: '',
    cvMuted: false,
    cvLevelMeter: 0,
    cvSpeaking: false,
    cvLevel: 'beginner',
    cvTutorName: '',
    cvModel: '',
    cvHistory: loadConversations(),
    cvMode: 'tutor',
    cvScenario: 'market',
    cvHints: [],
    cvReport: null,
    cvReportLoading: false,
    cvReportError: '',
    cvCards: [],
    cvRemainingSeconds: TUTOR_SESSION_SECONDS,
    cvWrapUpSent: false,
    cvFinalizePayload: null,
    cvReviewStatus: 'idle',
    cvReviewStage: '',
    cvReviewUrl: '',
    cvReviewError: ''
  };
}
