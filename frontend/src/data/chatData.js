// Verbatim legacy Chat data (preview/index.html 3556-3584).
export const TODAY='2026-09-26';

export const SEED = {
  jiwoo: [
    {from:'t', text:'에마 씨, 좋은 아침이에요! 주말에 뭐 할 거예요?', tr:'Good morning, Emma! What are you doing this weekend?', time:'09:12', date:TODAY},
    {from:'me', text:'저는 친구하고 한강에 갈 거예요.', time:'09:14'},
    {from:'t', text:'와, 좋겠다! 한강에서 뭐 하고 싶어요?', tr:'Oh, nice! What do you want to do at the Han River?', time:'09:14'},
    {from:'me', text:'치킨을 먹고 자전거를 탈 거예요.', time:'09:15'},
    {from:'me', text:'어제는 비가 많이 왔어서 못 갔어요.', time:'09:16', fix:{wrong:'왔어서', right:'와서', note:['-아서/어서 never takes the past tense: 오다 → 와서','-아서/어서 앞에는 과거형을 쓰지 않아요: 오다 → 와서']}},
    {from:'t', text:'맞아요, 어제 비가 정말 많이 왔죠. 오늘은 맑아서 다행이에요.', tr:'Right, it really poured yesterday. Glad it’s clear today.', time:'09:17'},
    {from:'t', text:'참, 한강에서 치킨 먹는 걸 “치맥”이라고 해요. 치킨 + 맥주!', tr:'By the way, eating chicken by the river is called “chimaek” — chicken + beer!', time:'09:17'}
  ],
  minho: [{from:'t', text:'월요일 회의 준비는 잘 되고 있어요? 오늘은 자기소개를 연습해 봐요.', tr:'How’s prep for Monday’s meeting going? Let’s practice introducing yourself.', time:'18:40', date:'2026-09-25'}],
  seoyeon: [{from:'t', text:'어제 보낸 작문 첨삭했어요. ‘에’와 ‘에서’만 조심하면 완벽해요!', tr:'I corrected your writing. Just watch 에 vs 에서 and it’s perfect!', time:'21:05', date:'2026-09-24'}],
  haneul: [{from:'t', text:'“했어요”는 [해써요]처럼 이어서 읽어요. 한번 녹음해 볼까요?', tr:'Read “했어요” linked together, like [hae-sseo-yo]. Want to try recording it?', time:'10:30', date:'2026-09-22'}]
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

export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function createInitialChatState() {
  return {
    msgs: JSON.parse(JSON.stringify(SEED)),
    unread: { minho: 1, seoyeon: 1 },
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
