// Verbatim legacy Listening data (preview/index.html).
export const SCRIPT = [
  {who:['Staff','직원'], text:'어서 오세요. 주문하시겠어요?', en:'Welcome. Are you ready to order?'},
  {who:['Customer','손님'], text:'아이스 아메리카노 한 잔하고 치즈 케이크 하나 주세요.', en:'One iced americano and a cheesecake, please.'},
  {who:['Staff','직원'], text:'드시고 가세요, 아니면 포장해 드릴까요?', en:'For here, or shall I pack it to go?'},
  {who:['Customer','손님'], text:'먹고 갈게요.', en:'I’ll eat here.'},
  {who:['Staff','직원'], text:'네, 모두 만 이천 원입니다.', en:'Okay, that’s 12,000 won in total.'}
];
export const LQ = [
  {q:'손님은 무엇을 주문했어요?', en:'What did the customer order?', opts:['따뜻한 아메리카노와 쿠키','아이스 아메리카노와 치즈 케이크','라테와 치즈 케이크'], optsEn:['A hot americano and a cookie','An iced americano and cheesecake','A latte and cheesecake'], a:1},
  {q:'손님은 어디에서 먹어요?', en:'Where will the customer eat?', opts:['카페에서','집에서','회사에서'], optsEn:['At the café','At home','At the office'], a:0},
  {q:'모두 얼마예요?', en:'How much is it in total?', opts:['2,000원','10,200원','12,000원'], optsEn:['2,000 won','10,200 won','12,000 won'], a:2}
];
export const DICTATIONS = [
  {sentence:'아이스 아메리카노 한 잔하고 치즈 케이크 하나 주세요.',answer:'아이스 아메리카노',en:'One iced americano and a cheesecake, please.',hintKo:'차가운 커피 이름이에요.',hintEn:'It is the name of a cold coffee drink.',okKo:'정답이에요. 아이스 아메리카노를 주문했어요.',okEn:'Correct — the customer ordered an iced americano.'},
  {sentence:'드시고 가세요, 아니면 포장해 드릴까요?',answer:'포장해',en:'For here, or shall I pack it to go?',hintKo:'가져갈 수 있게 싸는 행동이에요.',hintEn:'It means packing something to take away.',okKo:'정답이에요. 포장하다는 가져가게 싸다는 뜻이에요.',okEn:'Correct — 포장하다 means “to pack to go.”'},
  {sentence:'네, 모두 만 이천 원입니다.',answer:'만 이천 원',en:'Okay, that is 12,000 won in total.',hintKo:'주문한 음식의 전체 가격이에요.',hintEn:'It is the total price of the order.',okKo:'정답이에요. 모두 만 이천 원이에요.',okEn:'Correct — the total is 12,000 won.'}
];

export const LISTENING_TEXT = {
  en: {
    lEyebrow: 'LISTENING · BEGINNER 2',
    lTitle: 'Ordering at a café',
    lTitleSub: '카페에서 주문하기',
    lSub: 'Listen twice, then answer. Open the script only when you’re stuck.',
    lDictLabel: 'DICTATION',
    lDictHint: 'Type the missing word you heard.'
  },
  ko: {
    lEyebrow: '듣기 · 초급 2',
    lTitle: '카페에서 주문하기',
    lTitleSub: 'Ordering at a café',
    lSub: '두 번 듣고 문제를 풀어 보세요. 막힐 때만 대본을 열어요.',
    lDictLabel: '받아쓰기',
    lDictHint: '들은 단어를 빈칸에 써 보세요.'
  }
};

// Legacy app-level Listening state (survives navigation; playback resets on leave).
export const INITIAL_LISTENING_STATE = Object.freeze({
  genListening: null,
  genLoading: false,
  genError: '',
  lAns: {},
  dictInputs: {},
  dictAnswers: {},
  showScript: false,
  speed: 1,
  repeatStart: null,
  repeatEnd: null,
  repeatEnabled: false,
  playing: false,
  prog: 0,
  listeningStatus: 'idle',
  listeningDuration: 0,
  listeningError: '',
  listeningProvider: '',
  listeningSource: ''
});
