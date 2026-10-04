// Verbatim legacy Writing data and helpers (preview/index.html). Asset paths use the sandbox public root.

export const JEONG_POSES = [
  {src:'/assets/정이_축하.png', alt:['Jeongie celebrating with a fan','부채를 들고 축하하는 정이']},
  {src:'/assets/정이_붓글씨.png', alt:['Jeongie practicing calligraphy','붓글씨를 쓰는 정이']},
  {src:'/assets/정이_공부.png', alt:['Jeongie studying Hangul','한글을 공부하는 정이']},
  {src:'/assets/정이_장구.png', alt:['Jeongie playing the janggu','장구를 치며 응원하는 정이']}
];

export const JL = [['ㄱ',0],['ㄴ',2],['ㄷ',3],['ㄹ',5],['ㅁ',6],['ㅂ',7],['ㅅ',9],['ㅇ',11],['ㅈ',12],['ㅎ',18],
  ['ㅋ',15,1],['ㅌ',16,1],['ㅍ',17,1],['ㅊ',14,1],
  ['ㄲ',1,2],['ㄸ',4,2],['ㅃ',8,2],['ㅆ',10,2],['ㅉ',13,2]];
export const JV = [['ㅏ',0],['ㅓ',4],['ㅗ',8],['ㅜ',13],['ㅡ',18],['ㅣ',20],
  ['ㅑ',2,1],['ㅕ',6,1],['ㅛ',12,1],['ㅠ',17,1],['ㅐ',1,1],['ㅔ',5,1],
  ['ㅒ',3,2],['ㅖ',7,2],['ㅘ',9,2],['ㅙ',10,2],['ㅚ',11,2],['ㅝ',14,2],['ㅞ',15,2],['ㅟ',16,2],['ㅢ',19,2]];
export const JT_EXTRA = [['ㄷ',7,1],['ㅂ',17,1],['ㅅ',19,1],['ㅈ',22,1],['ㅊ',23,1],['ㅋ',24,1],['ㅌ',25,1],['ㅍ',26,1],['ㅎ',27,1],
  ['ㄲ',2,2],['ㄳ',3,2],['ㄵ',5,2],['ㄶ',6,2],['ㄺ',9,2],['ㄻ',10,2],['ㄼ',11,2],['ㄽ',12,2],['ㄾ',13,2],['ㄿ',14,2],['ㅀ',15,2],['ㅄ',18,2],['ㅆ',20,2]];
export const TARGETS_BY_LEVEL = [
  // 0: Basic (기초)
  [
    {ch:'한', L:18, V:0, T:4, en:'han · 한국 (Korea)', hint:'ㅎ + ㅏ + ㄴ', level:'Basic'},
    {ch:'글', L:0, V:18, T:8, en:'geul · 글자 (Letter)', hint:'ㄱ + ㅡ + ㄹ', level:'Basic'},
    {ch:'말', L:6, V:0, T:8, en:'mal · 한국말 (Speech)', hint:'ㅁ + ㅏ + ㄹ', level:'Basic'},
    {ch:'물', L:6, V:13, T:8, en:'mul · 시원한 물 (Water)', hint:'ㅁ + ㅜ + ㄹ', level:'Basic'},
    {ch:'봄', L:7, V:8, T:16, en:'bom · 따뜻한 봄 (Spring)', hint:'ㅂ + ㅗ + ㅁ', level:'Basic'},
    {ch:'달', L:3, V:0, T:8, en:'dal · 밝은 달 (Moon)', hint:'ㄷ + ㅏ + ㄹ', level:'Basic'},
    {ch:'산', L:9, V:0, T:4, en:'san · 푸른 산 (Mountain)', hint:'ㅅ + ㅏ + ㄴ', level:'Basic'},
    {ch:'공', L:0, V:8, T:21, en:'gong · 둥근 공 (Ball)', hint:'ㄱ + ㅗ + ㅇ', level:'Basic'}
  ],
  // 1: Expanded (확장)
  [
    {ch:'해', L:18, V:1, T:0, en:'hae · 밝은 해 (Sun)', hint:'ㅎ + ㅐ', level:'Expanded'},
    {ch:'별', L:7, V:6, T:8, en:'byeol · 밤하늘 별 (Star)', hint:'ㅂ + ㅕ + ㄹ', level:'Expanded'},
    {ch:'컵', L:15, V:4, T:17, en:'keop · 커피 컵 (Cup)', hint:'ㅋ + ㅓ + ㅂ', level:'Expanded'},
    {ch:'빛', L:7, V:20, T:23, en:'bit · 따스한 빛 (Light)', hint:'ㅂ + ㅣ + ㅊ', level:'Expanded'},
    {ch:'책', L:14, V:1, T:1, en:'chaek · 재미있는 책 (Book)', hint:'ㅊ + ㅐ + ㄱ', level:'Expanded'},
    {ch:'풀', L:17, V:13, T:8, en:'pul · 초록 풀 (Grass)', hint:'ㅍ + ㅜ + ㄹ', level:'Expanded'},
    {ch:'탑', L:16, V:0, T:17, en:'tap · 높은 탑 (Tower)', hint:'ㅌ + ㅏ + ㅂ', level:'Expanded'},
    {ch:'숲', L:9, V:13, T:26, en:'sup · 푸른 숲 (Forest)', hint:'ㅅ + ㅜ + ㅍ', level:'Expanded'}
  ],
  // 2: Advanced (심화)
  [
    {ch:'꿈', L:1, V:13, T:16, en:'kkum · 좋은 꿈 (Dream)', hint:'ㄲ + ㅜ + ㅁ', level:'Advanced'},
    {ch:'꽃', L:1, V:8, T:23, en:'kkot · 예쁜 꽃 (Flower)', hint:'ㄲ + ㅗ + ㅊ', level:'Advanced'},
    {ch:'닭', L:3, V:0, T:9, en:'dak · 새벽 닭 (Rooster)', hint:'ㄷ + ㅏ + ㄺ', level:'Advanced'},
    {ch:'값', L:0, V:0, T:18, en:'gap · 착한 값 (Price)', hint:'ㄱ + ㅏ + ㅄ', level:'Advanced'},
    {ch:'흙', L:18, V:18, T:9, en:'heuk · 기름진 흙 (Soil)', hint:'ㅎ + ㅡ + ㄺ', level:'Advanced'},
    {ch:'넓', L:2, V:4, T:11, en:'neol · 넓다 (Wide)', hint:'ㄴ + ㅓ + ㄼ', level:'Advanced'},
    {ch:'땀', L:4, V:0, T:16, en:'ttam · 구슬땀 (Sweat)', hint:'ㄸ + ㅏ + ㅁ', level:'Advanced'},
    {ch:'삶', L:9, V:0, T:10, en:'sam · 소중한 삶 (Life)', hint:'ㅅ + ㅏ + ㄻ', level:'Advanced'}
  ]
];
// 단어 만들기: 레벨별 단어 (1 기초 · 2 심화). 음절은 유니코드 분해로 초성·중성·종성을 구함
export const WORDS_BY_LEVEL = [
  [],
  [
    {w:'한국', en:'hanguk · Korea'}, {w:'사랑', en:'sarang · Love'}, {w:'친구', en:'chingu · Friend'}, {w:'커피', en:'keopi · Coffee'},
    {w:'바다', en:'bada · Sea'}, {w:'나무', en:'namu · Tree'}, {w:'학교', en:'hakgyo · School'}, {w:'가족', en:'gajok · Family'}
  ],
  [
    {w:'꽃잎', en:'kkonnip · Petal'}, {w:'떡볶이', en:'tteokbokki · Spicy rice cakes'}, {w:'닭고기', en:'dakgogi · Chicken'}, {w:'과일', en:'gwail · Fruit'},
    {w:'읽기', en:'ilgi · Reading'}, {w:'쌀밥', en:'ssalbap · Rice'}, {w:'의자', en:'uija · Chair'}, {w:'원숭이', en:'wonsungi · Monkey'}
  ]
];
export const JT_ALL = [['ㄱ',1],['ㄴ',4],['ㄹ',8],['ㅁ',16],['ㅇ',21],...JT_EXTRA];
export const decompSyl = ch => { const c = ch.charCodeAt(0) - 0xAC00; return { L: Math.floor(c / 588), V: Math.floor((c % 588) / 28), T: c % 28 }; };
export const jamoHint = d => [JL.find(j => j[1] === d.L)?.[0], JV.find(j => j[1] === d.V)?.[0], d.T ? JT_ALL.find(j => j[1] === d.T)?.[0] : null].filter(Boolean).join(' + ');

export const KB_SVG_ROWS = [
  // Row 0
  [
    {id:'Backquote', key:'`', ko:'`', shift:'~', w:56, finger:'LP'},
    {id:'Digit1', key:'1', ko:'1', shift:'!', w:56, finger:'LP'},
    {id:'Digit2', key:'2', ko:'2', shift:'@', w:56, finger:'LR'},
    {id:'Digit3', key:'3', ko:'3', shift:'#', w:56, finger:'LM'},
    {id:'Digit4', key:'4', ko:'4', shift:'$', w:56, finger:'LI'},
    {id:'Digit5', key:'5', ko:'5', shift:'%', w:56, finger:'LI'},
    {id:'Digit6', key:'6', ko:'6', shift:'^', w:56, finger:'RI'},
    {id:'Digit7', key:'7', ko:'7', shift:'&', w:56, finger:'RI'},
    {id:'Digit8', key:'8', ko:'8', shift:'*', w:56, finger:'RM'},
    {id:'Digit9', key:'9', ko:'9', shift:'(', w:56, finger:'RR'},
    {id:'Digit0', key:'0', ko:'0', shift:')', w:56, finger:'RP'},
    {id:'Minus', key:'-', ko:'-', shift:'_', w:56, finger:'RP'},
    {id:'Equal', key:'=', ko:'=', shift:'+', w:56, finger:'RP'},
    {id:'Backspace', key:'Backspace', ko:'지우기', shift:'', w:114, finger:'RP', isSpecial:true}
  ],
  // Row 1
  [
    {id:'Tab', key:'Tab', ko:'Tab', shift:'', w:84, finger:'LP', isSpecial:true},
    {id:'KeyQ', key:'Q', ko:'ㅂ', shift:'ㅃ', w:56, finger:'LP'},
    {id:'KeyW', key:'W', ko:'ㅈ', shift:'ㅉ', w:56, finger:'LR'},
    {id:'KeyE', key:'E', ko:'ㄷ', shift:'ㄸ', w:56, finger:'LM'},
    {id:'KeyR', key:'R', ko:'ㄱ', shift:'ㄲ', w:56, finger:'LI'},
    {id:'KeyT', key:'T', ko:'ㅅ', shift:'ㅆ', w:56, finger:'LI'},
    {id:'KeyY', key:'Y', ko:'ㅛ', shift:'', w:56, finger:'RI'},
    {id:'KeyU', key:'U', ko:'ㅕ', shift:'', w:56, finger:'RI'},
    {id:'KeyI', key:'I', ko:'ㅑ', shift:'', w:56, finger:'RM'},
    {id:'KeyO', key:'O', ko:'ㅐ', shift:'ㅒ', w:56, finger:'RR'},
    {id:'KeyP', key:'P', ko:'ㅔ', shift:'ㅖ', w:56, finger:'RP'},
    {id:'BracketLeft', key:'[', ko:'[', shift:'{', w:56, finger:'RP'},
    {id:'BracketRight', key:']', ko:']', shift:'}', w:56, finger:'RP'},
    {id:'Backslash', key:'\\', ko:'\\', shift:'|', w:86, finger:'RP', isSpecial:true}
  ],
  // Row 2
  [
    {id:'CapsLock', key:'Caps', ko:'Caps', shift:'', w:100, finger:'LP', isSpecial:true},
    {id:'KeyA', key:'A', ko:'ㅁ', shift:'', w:56, finger:'LP'},
    {id:'KeyS', key:'S', ko:'ㄴ', shift:'', w:56, finger:'LR'},
    {id:'KeyD', key:'D', ko:'ㅇ', shift:'', w:56, finger:'LM'},
    {id:'KeyF', key:'F', ko:'ㄹ', shift:'', w:56, finger:'LI'},
    {id:'KeyG', key:'G', ko:'ㅎ', shift:'', w:56, finger:'LI'},
    {id:'KeyH', key:'H', ko:'ㅗ', shift:'', w:56, finger:'RI'},
    {id:'KeyJ', key:'J', ko:'ㅓ', shift:'', w:56, finger:'RI'},
    {id:'KeyK', key:'K', ko:'ㅏ', shift:'', w:56, finger:'RM'},
    {id:'KeyL', key:'L', ko:'ㅣ', shift:'', w:56, finger:'RR'},
    {id:'Semicolon', key:';', ko:';', shift:':', w:56, finger:'RP'},
    {id:'Quote', key:'\'', ko:'\'', shift:'\"', w:56, finger:'RP'},
    {id:'Enter', key:'Enter', ko:'Enter', shift:'', w:132, finger:'RP', isSpecial:true}
  ],
  // Row 3
  [
    {id:'ShiftLeft', key:'Shift', ko:'Shift', shift:'', w:140, finger:'LP', isSpecial:true},
    {id:'KeyZ', key:'Z', ko:'ㅋ', shift:'', w:56, finger:'LP'},
    {id:'KeyX', key:'X', ko:'ㅌ', shift:'', w:56, finger:'LR'},
    {id:'KeyC', key:'C', ko:'ㅊ', shift:'', w:56, finger:'LM'},
    {id:'KeyV', key:'V', ko:'ㅍ', shift:'', w:56, finger:'LI'},
    {id:'KeyB', key:'B', ko:'ㅠ', shift:'', w:56, finger:'LI'},
    {id:'KeyN', key:'N', ko:'ㅜ', shift:'', w:56, finger:'RI'},
    {id:'KeyM', key:'M', ko:'ㅡ', shift:'', w:56, finger:'RI'},
    {id:'Comma', key:',', ko:',', shift:'<', w:56, finger:'RM'},
    {id:'Period', key:'.', ko:'.', shift:'>', w:56, finger:'RR'},
    {id:'Slash', key:'/', ko:'/', shift:'?', w:56, finger:'RP'},
    {id:'ShiftRight', key:'ShiftR', ko:'Shift', shift:'', w:154, finger:'RP', isSpecial:true}
  ],
  // Row 4
  [
    {id:'ControlLeft', key:'Ctrl', ko:'Ctrl', shift:'', w:80, finger:'LP', isSpecial:true},
    {id:'AltLeft', key:'Alt', ko:'Alt', shift:'', w:80, finger:'LT', isSpecial:true},
    {id:'Space', key:'Space', ko:'Space', shift:'', w:556, finger:'RT', isSpecial:true},
    {id:'AltRight', key:'AltR', ko:'한/영 (Alt)', shift:'', w:80, finger:'RT', isSpecial:true},
    {id:'ControlRight', key:'CtrlR', ko:'Ctrl', shift:'', w:100, finger:'RP', isSpecial:true}
  ]
];

export const KB_MAP = {};
const KB_GAP = 6;
const KB_START_X = 30;
const KB_START_Y = 56;
const KB_ROW_H = 50;
const KB_ROW_GAP = 7;

KB_SVG_ROWS.forEach((r, rIdx) => {
  let curX = KB_START_X;
  const y = KB_START_Y + rIdx * (KB_ROW_H + KB_ROW_GAP);
  r.forEach(k => {
    k.x = curX;
    k.y = y;
    k.h = KB_ROW_H;
    k.cx = curX + k.w / 2;
    k.cy = y + KB_ROW_H / 2;
    KB_MAP[k.key] = k;
    curX += k.w + KB_GAP;
  });
});

export const JAMO_KEY_MAP = {
  'ㄱ': {key:'R', shift:false, finger:'LI', ko:'왼손 검지', en:'Left Index'},
  'ㄲ': {key:'R', shift:true, finger:'LI', ko:'왼손 검지 (Shift)', en:'Left Index (Shift)'},
  'ㄴ': {key:'S', shift:false, finger:'LR', ko:'왼손 약지', en:'Left Ring'},
  'ㄷ': {key:'E', shift:false, finger:'LM', ko:'왼손 중지', en:'Left Middle'},
  'ㄸ': {key:'E', shift:true, finger:'LM', ko:'왼손 중지 (Shift)', en:'Left Middle (Shift)'},
  'ㄹ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지', en:'Left Index'},
  'ㅁ': {key:'A', shift:false, finger:'LP', ko:'왼손 새끼', en:'Left Pinky'},
  'ㅂ': {key:'Q', shift:false, finger:'LP', ko:'왼손 새끼', en:'Left Pinky'},
  'ㅃ': {key:'Q', shift:true, finger:'LP', ko:'왼손 새끼 (Shift)', en:'Left Pinky (Shift)'},
  'ㅅ': {key:'T', shift:false, finger:'LI', ko:'왼손 검지', en:'Left Index'},
  'ㅆ': {key:'T', shift:true, finger:'LI', ko:'왼손 검지 (Shift)', en:'Left Index (Shift)'},
  'ㅇ': {key:'D', shift:false, finger:'LM', ko:'왼손 중지', en:'Left Middle'},
  'ㅈ': {key:'W', shift:false, finger:'LR', ko:'왼손 약지', en:'Left Ring'},
  'ㅉ': {key:'W', shift:true, finger:'LR', ko:'왼손 약지 (Shift)', en:'Left Ring (Shift)'},
  'ㅊ': {key:'C', shift:false, finger:'LM', ko:'왼손 중지', en:'Left Middle'},
  'ㅋ': {key:'Z', shift:false, finger:'LP', ko:'왼손 새끼', en:'Left Pinky'},
  'ㅌ': {key:'X', shift:false, finger:'LR', ko:'왼손 약지', en:'Left Ring'},
  'ㅍ': {key:'V', shift:false, finger:'LI', ko:'왼손 검지', en:'Left Index'},
  'ㅎ': {key:'G', shift:false, finger:'LI', ko:'왼손 검지', en:'Left Index'},
  'ㅏ': {key:'K', shift:false, finger:'RM', ko:'오른손 중지', en:'Right Middle'},
  'ㅐ': {key:'O', shift:false, finger:'RR', ko:'오른손 약지', en:'Right Ring'},
  'ㅑ': {key:'I', shift:false, finger:'RM', ko:'오른손 중지', en:'Right Middle'},
  'ㅒ': {key:'O', shift:true, finger:'RR', ko:'오른손 약지 (Shift)', en:'Right Ring (Shift)'},
  'ㅓ': {key:'J', shift:false, finger:'RI', ko:'오른손 검지', en:'Right Index'},
  'ㅔ': {key:'P', shift:false, finger:'RP', ko:'오른손 새끼', en:'Right Pinky'},
  'ㅕ': {key:'U', shift:false, finger:'RI', ko:'오른손 검지', en:'Right Index'},
  'ㅖ': {key:'P', shift:true, finger:'RP', ko:'오른손 새끼 (Shift)', en:'Right Pinky (Shift)'},
  'ㅗ': {key:'H', shift:false, finger:'RI', ko:'오른손 검지', en:'Right Index'},
  'ㅘ': {key:'H', shift:false, finger:'RI', ko:'오른손 검지 (ㅗ+ㅏ)', en:'Right Index'},
  'ㅙ': {key:'H', shift:false, finger:'RI', ko:'오른손 검지 (ㅗ+ㅐ)', en:'Right Index'},
  'ㅚ': {key:'H', shift:false, finger:'RI', ko:'오른손 검지 (ㅗ+ㅣ)', en:'Right Index'},
  'ㅛ': {key:'Y', shift:false, finger:'RI', ko:'오른손 검지', en:'Right Index'},
  'ㅜ': {key:'N', shift:false, finger:'RI', ko:'오른손 검지', en:'Right Index'},
  'ㅝ': {key:'N', shift:false, finger:'RI', ko:'오른손 검지 (ㅜ+ㅓ)', en:'Right Index'},
  'ㅞ': {key:'N', shift:false, finger:'RI', ko:'오른손 검지 (ㅜ+ㅔ)', en:'Right Index'},
  'ㅟ': {key:'N', shift:false, finger:'RI', ko:'오른손 검지 (ㅜ+ㅣ)', en:'Right Index'},
  'ㅠ': {key:'B', shift:false, finger:'LI', ko:'왼손 검지', en:'Left Index'},
  'ㅡ': {key:'M', shift:false, finger:'RI', ko:'오른손 검지', en:'Right Index'},
  'ㅢ': {key:'M', shift:false, finger:'RI', ko:'오른손 검지 (ㅡ+ㅣ)', en:'Right Index'},
  'ㅣ': {key:'L', shift:false, finger:'RR', ko:'오른손 약지', en:'Right Ring'},
  'ㄳ': {key:'R', shift:false, finger:'LI', ko:'왼손 검지 (ㄱ+ㅅ)', en:'Left Index'},
  'ㄵ': {key:'S', shift:false, finger:'LR', ko:'왼손 약지 (ㄴ+ㅈ)', en:'Left Ring'},
  'ㄶ': {key:'S', shift:false, finger:'LR', ko:'왼손 약지 (ㄴ+ㅎ)', en:'Left Ring'},
  'ㄺ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지 (ㄹ+ㄱ)', en:'Left Index'},
  'ㄻ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지 (ㄹ+ㅁ)', en:'Left Index'},
  'ㄼ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지 (ㄹ+ㅂ)', en:'Left Index'},
  'ㄽ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지 (ㄹ+ㅅ)', en:'Left Index'},
  'ㄾ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지 (ㄹ+ㅌ)', en:'Left Index'},
  'ㄿ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지 (ㄹ+ㅍ)', en:'Left Index'},
  'ㅀ': {key:'F', shift:false, finger:'LI', ko:'왼손 검지 (ㄹ+ㅎ)', en:'Left Index'},
  'ㅄ': {key:'Q', shift:false, finger:'LP', ko:'왼손 새끼 (ㅂ+ㅅ)', en:'Left Pinky'}
};
// 두벌식에서 두 번 눌러야 하는 이중모음·겹받침: [첫 타, 둘째 타]
export const JAMO_SEQ = {
  'ㅘ':['ㅗ','ㅏ'], 'ㅙ':['ㅗ','ㅐ'], 'ㅚ':['ㅗ','ㅣ'], 'ㅝ':['ㅜ','ㅓ'], 'ㅞ':['ㅜ','ㅔ'], 'ㅟ':['ㅜ','ㅣ'], 'ㅢ':['ㅡ','ㅣ'],
  'ㄳ':['ㄱ','ㅅ'], 'ㄵ':['ㄴ','ㅈ'], 'ㄶ':['ㄴ','ㅎ'], 'ㄺ':['ㄹ','ㄱ'], 'ㄻ':['ㄹ','ㅁ'], 'ㄼ':['ㄹ','ㅂ'], 'ㄽ':['ㄹ','ㅅ'],
  'ㄾ':['ㄹ','ㅌ'], 'ㄿ':['ㄹ','ㅍ'], 'ㅀ':['ㄹ','ㅎ'], 'ㅄ':['ㅂ','ㅅ']
};

// ── 손 그림자: 이전에 확정한 실제 사람 손 비율의 고해상도 PNG 실루엣 ──
export const HAND_IMAGE = Object.freeze({
  left: {
    src: '/assets/hand_realistic_left_v2.png', x: 40, y: 80, width: 320, height: 320,
    tips: { P:[158,143], R:[215,113], M:[256,103], I:[293,135], T:[308,251] }
  },
  right: {
    src: '/assets/hand_realistic_right_v2.png', x: 620, y: 80, width: 320, height: 320,
    tips: { P:[822,143], R:[765,113], M:[724,103], I:[687,135], T:[672,251] }
  }
});

export function getHangulPron(text) {
  if (!text) return '';
  const L_MAP = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  const V_MAP = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
  const T_MAP = ['','k','k','k','n','n','n','t','l','l','l','l','l','l','l','l','m','p','p','t','t','ng','t','t','k','t','p','h'];
  let parts = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const syl = code - 0xAC00;
      const l = Math.floor(syl / 588);
      const v = Math.floor((syl % 588) / 28);
      const t = syl % 28;
      parts.push((L_MAP[l] || '') + (V_MAP[v] || '') + (T_MAP[t] || ''));
    } else if (code >= 0x3131 && code <= 0x318E) {
      const jamoMap = {
        'ㄱ':'g','ㄲ':'kk','ㄴ':'n','ㄷ':'d','ㄸ':'tt','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'pp',
        'ㅅ':'s','ㅆ':'ss','ㅇ':'ng','ㅈ':'j','ㅉ':'jj','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'h',
        'ㅏ':'a','ㅐ':'ae','ㅑ':'ya','ㅒ':'yae','ㅓ':'eo','ㅔ':'e','ㅕ':'yeo','ㅖ':'ye','ㅗ':'o',
        'ㅘ':'wa','ㅙ':'wae','ㅚ':'oe','ㅛ':'yo','ㅜ':'u','ㅝ':'wo','ㅞ':'we','ㅟ':'wi','ㅠ':'yu',
        'ㅡ':'eu','ㅢ':'ui','ㅣ':'i'
      };
      parts.push(jamoMap[text[i]] || text[i]);
    } else if (text[i].trim()) {
      parts.push(text[i]);
    }
  }
  return parts.join('-');
}

export const WRITING_TEXT = {
  en: {
    wTitle: 'Writing practice',
    wTab1: 'Build a syllable',
    wTab2: 'Write sentences',
    wTab3: 'Build a word',
    nextSyl: 'Next syllable',
    resetSyllable: 'Reset',
    jamoNote: 'Every Korean syllable is a block: consonant + vowel (+ optional final). ㅎ + ㅏ + ㄴ = 한.',
    sentPrompt: 'What did you do last weekend? Write three sentences.',
    sentHint: 'Try using',
    getFb: 'Get feedback',
    pastTense: 'past tense',
    fb1: 'Use 에서 for the place where an action happens (eating, studying, meeting). 에 is for where you go or where something is.',
    fb2: 'Never put 았/었 before -아서/어서 — the main verb carries the tense. 맛있다 → 맛있어서'
  },
  ko: {
    wTitle: '쓰기 연습',
    wTab1: '글자 만들기',
    wTab2: '문장 쓰기',
    wTab3: '단어 만들기',
    nextSyl: '다음 글자',
    resetSyllable: '다시 만들기',
    jamoNote: '한국어 글자는 블록이에요: 자음 + 모음 (+ 받침). ㅎ + ㅏ + ㄴ = 한.',
    sentPrompt: '지난 주말에 뭐 했어요? 세 문장으로 써 보세요.',
    sentHint: '써 볼 표현:',
    getFb: '첨삭 받기',
    pastTense: '과거형',
    fb1: '먹다, 공부하다, 만나다처럼 행동이 일어나는 장소에는 ‘에서’를 써요. ‘에’는 가는 곳이나 있는 곳에 써요.',
    fb2: '-아서/어서 앞에는 았/었을 붙이지 않아요. 시제는 뒤 문장이 나타내요. 맛있다 → 맛있어서'
  }
};

// Legacy app-level Writing state (survives navigation like the legacy single-component app).
export const INITIAL_WRITING_STATE = Object.freeze({
  wTab: 'jamo',
  jLevel: 1,
  ti: 0,
  wi: 0,
  si: 0,
  L: null,
  V: null,
  T: null,
  isKeyError: false,
  isPhysicalShift: false,
  reviewMode: false,
  learnedTick: 0,
  showHandShadow: true,
  showKbGuide: false,
  kbGuideTab: 'win',
  wText: '지난 주말에 친구를 만났어요. 우리는 홍대에 떡볶이를 먹었어요. 정말 맛있었어서 또 가고 싶어요.',
  wChecked: false
});
