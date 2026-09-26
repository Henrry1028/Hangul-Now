/**
 * src/pos/lexicon.ts
 * 규칙 기반 분석기의 사전. 순수 데이터.
 *
 * 어휘 범위는 생활·숙박 시나리오(K-Survival)에 맞춰 큐레이션한다.
 * 미등재 고유명사는 `Options.userDict`로 런타임에 주입한다 (SPEC §8).
 */

import type { Alt, Irregular } from './inflect.ts';

// ─────────────────────────────────────────────────────────────
// 체언·수식언·독립언
// ─────────────────────────────────────────────────────────────

export interface NominalEntry {
  text: string;
  tag: string;
  /** 하/되 파생 가능성 — 'v'는 XSV(예약하다), 'a'는 XSA(죄송하다) */
  deriv?: 'v' | 'a';
}

/** 일반명사. 파생 가능한 것은 deriv를 붙인다 */
const NNG: readonly (string | [string, 'v' | 'a'])[] = [
  ['예약', 'v'], ['확인', 'v'], ['체크인', 'v'], ['체크아웃', 'v'], ['부탁', 'v'],
  ['사용', 'v'], ['준비', 'v'], ['시작', 'v'], ['주문', 'v'], ['계산', 'v'],
  ['청소', 'v'], ['안내', 'v'], ['취소', 'v'], ['변경', 'v'], ['도착', 'v'],
  ['출발', 'v'], ['전화', 'v'], ['감사', 'v'], ['식사', 'v'], ['결제', 'v'],
  ['불편', 'a'], ['편리', 'a'],
  '여권', '방', '번호', '손님', '프런트', '인터넷', '비밀번호', '열쇠', '카드',
  '신분증', '짐', '조식', '아침', '점심', '저녁', '시간', '엘리베이터', '수건',
  '화장실', '에어컨', '요금', '영수증', '이름', '성함', '자리', '물', '커피',
  '가격', '사람', '오늘', '내일', '어제', '지금', '침대', '창문', '금고', '수영장',
  '주차장', '보증금', '와이파이', '호텔', '택시', '지하철', '공항', '역', '길',
  '가방', '우산', '지갑', '휴대폰',
];

/** 어근 — 단독으로는 품사가 아니다 (INV-2). 하/되 파생으로만 쓰인다 */
const XR: readonly [string, 'v' | 'a'][] = [
  ['죄송', 'a'], ['미안', 'a'], ['조용', 'a'], ['따뜻', 'a'], ['시원', 'a'],
  ['깨끗', 'a'], ['조심', 'a'], ['피곤', 'a'], ['친절', 'a'], ['훌륭', 'a'],
];

/** 의존명사 */
const NNB: readonly string[] = ['분', '것', '수', '때', '데', '중', '쪽', '편', '씨'];

/** 단위명사 */
const NNBC: readonly string[] = [
  '박', '일', '명', '개', '시', '분', '초', '층', '인', '원', '번', '살', '마리',
  '병', '잔', '장', '권', '대', '켤레', '그릇', '주', '달', '년',
];

const NP: readonly string[] = [
  '저', '나', '저희', '우리', '너', '당신', '여기', '거기', '저기',
  '이것', '그것', '저것', '무엇', '뭐', '누구', '어디', '언제', '얼마',
  '제', // 저+의 축약. Kiwi도 NP로 태깅한다 — 조사가 녹아 있는 것은 감수한다
];

const NR: readonly string[] = [
  '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
  '스물', '서른', '마흔', '쉰', '백', '천', '만',
];

/** 관형사. 수관형사(한/두/세/네)가 수사와 갈리는 지점이다 */
const MM: readonly string[] = [
  '한', '두', '세', '네', '다섯', '여섯', '몇',
  '이', '그', '저', '새', '헌', '옛', '첫', '모든', '여러', '어느', '무슨', '온갖', '딴',
];

const MAG: readonly string[] = [
  '잠시', '너무', '좀', '아주', '매우', '잘', '더', '다시', '항상', '가장', '꼭',
  '미리', '같이', '함께', '빨리', '천천히', '정말', '진짜', '조금', '이제', '벌써',
  '아직', '이미', '또', '전혀', '별로', '거의', '바로', '먼저', '혹시', '제일', '어서',
];

/** 접속부사. 9품사에 접속사는 없다 — 부사다 (SPEC §3) */
const MAJ: readonly string[] = [
  '그리고', '하지만', '그러나', '그래서', '그런데', '그러면', '그러니까', '또는', '및', '즉',
];

const IC: readonly string[] = [
  '아', '어', '음', '네', '예', '아니요', '아니오', '여보세요', '글쎄요', '어머', '와',
];

function buildNominals(): NominalEntry[] {
  const out: NominalEntry[] = [];
  const push = (text: string, tag: string, deriv?: 'v' | 'a') => out.push({ text, tag, deriv });

  for (const e of NNG) {
    if (Array.isArray(e)) push(e[0], 'NNG', e[1]);
    else push(e, 'NNG');
  }
  for (const [text, d] of XR) push(text, 'XR', d);
  for (const t of NNB) push(t, 'NNB');
  for (const t of NNBC) push(t, 'NNBC');
  for (const t of NP) push(t, 'NP');
  for (const t of NR) push(t, 'NR');
  for (const t of MM) push(t, 'MM');
  for (const t of MAG) push(t, 'MAG');
  for (const t of MAJ) push(t, 'MAJ');
  for (const t of IC) push(t, 'IC');
  return out;
}

/** 긴 표제어 우선. 동일 길이면 등재 순서 유지 */
export const NOMINALS: readonly NominalEntry[] = Object.freeze(
  buildNominals().sort((a, b) => b.text.length - a.text.length),
);

/** 체언 파생 접미사 */
export const XSN: readonly string[] = Object.freeze(['님', '들', '씨']);

// ─────────────────────────────────────────────────────────────
// 용언
// ─────────────────────────────────────────────────────────────

export interface PredicateEntry {
  stem: string;
  tag: 'VV' | 'VA' | 'VX' | 'VCN' | 'XSV' | 'XSA';
  lemma: string;
  irr?: Irregular;
}

const VV: readonly (string | [string, Irregular])[] = [
  '하', '되', '가', '오', '보', '주', '받', '먹', '마시', '자', '앉', '알', '살',
  '넣', '빼', '열', '닫', '찾', '보내', '기다리', '만나', '나가', '들어가', '일어나',
  '보이', '알리', '바꾸', '비우', '비', '내리', '올리', '타', '내', '사', '팔',
  '씻', '입', '벗', '쉬', '자르', '부르', '맡기', '잃', '잊', '켜', '끊', '빌리',
  '계시', // 표준국어대사전 「동사」 — 계신다가 성립한다. 형용사가 아니다
  ['돕', 'p'], ['모르', 'reu'], ['쓰', 'eu'], ['끄', 'eu'], ['듣', 'd'], ['드리', 'none'],
];

const VA: readonly (string | [string, Irregular])[] = [
  '좁', '넓', '좋', '작', '많', '적', '같', '싫', '맛있', '맛없', '있', '없',
  ['크', 'eu'], ['예쁘', 'eu'], ['바쁘', 'eu'], ['아프', 'eu'], ['나쁘', 'eu'],
  ['춥', 'p'], ['덥', 'p'], ['반갑', 'p'], ['가볍', 'p'], ['무겁', 'p'], ['어렵', 'p'], ['쉽', 'p'],
  ['다르', 'reu'], ['빠르', 'reu'],
];

/** 보조용언 */
const VX: readonly string[] = ['주', '드리', '보', '있', '싶', '버리', '놓', '가', '오', '내'];

function buildPredicates(): PredicateEntry[] {
  const out: PredicateEntry[] = [];
  const add = (e: string | [string, Irregular], tag: PredicateEntry['tag']) => {
    const [stem, irr] = Array.isArray(e) ? e : [e, 'none' as Irregular];
    out.push({ stem, tag, lemma: `${stem}다`, irr });
  };
  for (const e of VV) add(e, 'VV');
  for (const e of VA) add(e, 'VA');
  for (const e of VX) add(e, 'VX');
  out.push({ stem: '아니', tag: 'VCN', lemma: '아니다', irr: 'none' });
  return out;
}

export const PREDICATES: readonly PredicateEntry[] = Object.freeze(
  buildPredicates().sort((a, b) => b.stem.length - a.stem.length),
);

/** 보조용언만 따로 — M4/M5 판정용 */
export const AUX_LEMMAS: ReadonlySet<string> = Object.freeze(
  new Set(VX.map((s) => `${s}다`)),
);

/** 용언 파생 접미사 (M1) */
export const DERIV_SUFFIX: Readonly<Record<'v' | 'a', PredicateEntry[]>> = Object.freeze({
  v: [
    { stem: '하', tag: 'XSV', lemma: '하다', irr: 'none' },
    { stem: '되', tag: 'XSV', lemma: '되다', irr: 'none' },
  ],
  a: [{ stem: '하', tag: 'XSA', lemma: '하다', irr: 'none' }],
});

/**
 * M0 — 어휘 오버라이드. 분석기별로 VV/VA가 갈리는 존재사를 못 박는다.
 *
 * 대상이 아닌 것:
 * - `비다`  — 표준국어대사전 기준 동사다 (SPEC §4)
 * - `계시다` — 표준국어대사전 기준 동사다. `계신다`가 성립한다
 *
 * `있다`는 형용사(존재)와 동사(머무르다: "집에 있는다") 양쪽이지만 형용사로 고정한다.
 * 학습 앱에서는 존재 의미가 압도적으로 빈번하고, 색이 문맥마다 바뀌면 학습을 방해한다.
 * 대가로 동사 용법을 표현할 수 없다 (SPEC §8).
 */
export const OVERRIDES: Readonly<Record<string, 'ADJECTIVE' | 'VERB'>> = Object.freeze({
  '있다': 'ADJECTIVE',
  '없다': 'ADJECTIVE',
  '맛있다': 'ADJECTIVE',
  '맛없다': 'ADJECTIVE',
});

// ─────────────────────────────────────────────────────────────
// 조사
// ─────────────────────────────────────────────────────────────

export interface ParticleEntry {
  text: string;
  tag: string;
  requires?: 'coda' | 'open';
}

const PARTICLE_DEFS: readonly ParticleEntry[] = [
  // 격조사
  { text: '이', tag: 'JKS', requires: 'coda' },
  { text: '가', tag: 'JKS', requires: 'open' },
  { text: '께서', tag: 'JKS' },
  { text: '을', tag: 'JKO', requires: 'coda' },
  { text: '를', tag: 'JKO', requires: 'open' },
  { text: '의', tag: 'JKG' },
  { text: '에서부터', tag: 'JKB' },
  { text: '에서', tag: 'JKB' },
  { text: '에게', tag: 'JKB' },
  { text: '한테', tag: 'JKB' },
  { text: '에', tag: 'JKB' },
  { text: '께', tag: 'JKB' },
  { text: '으로', tag: 'JKB', requires: 'coda' },
  { text: '로', tag: 'JKB' },
  { text: '부터', tag: 'JKB' },
  { text: '까지', tag: 'JKB' },
  { text: '보다', tag: 'JKB' },
  { text: '처럼', tag: 'JKB' },
  { text: '마다', tag: 'JKB' },
  { text: '야', tag: 'JKV', requires: 'open' },
  // 보조사
  { text: '는', tag: 'JX', requires: 'open' },
  { text: '은', tag: 'JX', requires: 'coda' },
  { text: '도', tag: 'JX' },
  { text: '만', tag: 'JX' },
  { text: '요', tag: 'JX' },
  { text: '라도', tag: 'JX' },
  { text: '밖에', tag: 'JX' },
  { text: '조차', tag: 'JX' },
  // 접속조사
  { text: '이랑', tag: 'JC', requires: 'coda' },
  { text: '랑', tag: 'JC', requires: 'open' },
  { text: '하고', tag: 'JC' },
  { text: '과', tag: 'JC', requires: 'coda' },
  { text: '와', tag: 'JC', requires: 'open' },
];

export const PARTICLES: readonly ParticleEntry[] = Object.freeze(
  [...PARTICLE_DEFS].sort((a, b) => b.text.length - a.text.length),
);

/** 서술격 조사 (이다). 학교문법상 조사이므로 PARTICLE 버킷 */
export const COPULA: ParticleEntry = Object.freeze({ text: '이', tag: 'VCP' });

// ─────────────────────────────────────────────────────────────
// 어미
// ─────────────────────────────────────────────────────────────

export type Slot = 'EP' | 'EF' | 'EC' | 'ETM' | 'ETN';

export interface EndingEntry {
  tag: string;
  lemma: string;
  slot: Slot;
  alts: Alt[];
}

export const ENDINGS: readonly EndingEntry[] = Object.freeze([
  // 선어말어미
  { tag: 'EP', lemma: '(으)시', slot: 'EP', alts: [
    { text: '시', link: 'cons', requires: 'open' },
    { text: '으시', link: 'cons', requires: 'coda' },
  ] },
  { tag: 'EP', lemma: '았/었', slot: 'EP', alts: [
    { text: '았', link: 'vowel', harmony: 'bright' },
    { text: '었', link: 'vowel', harmony: 'dark' },
    { text: '였', link: 'vowel', harmony: 'hada' },
  ] },
  { tag: 'EP', lemma: '겠', slot: 'EP', alts: [{ text: '겠', link: 'cons' }] },

  // 종결어미
  { tag: 'EF', lemma: '(스)ㅂ니다', slot: 'EF', alts: [
    { text: 'ㅂ니다', link: 'coda' },
    { text: '습니다', link: 'cons', requires: 'coda' },
  ] },
  { tag: 'EF', lemma: '(스)ㅂ니까', slot: 'EF', alts: [
    { text: 'ㅂ니까', link: 'coda' },
    { text: '습니까', link: 'cons', requires: 'coda' },
  ] },
  { tag: 'EF', lemma: '아/어요', slot: 'EF', alts: [
    { text: '아요', link: 'vowel', harmony: 'bright' },
    { text: '어요', link: 'vowel', harmony: 'dark' },
    { text: '여요', link: 'vowel', harmony: 'hada' },
  ] },
  { tag: 'EF', lemma: '(으)세요', slot: 'EF', alts: [
    { text: '세요', link: 'cons', requires: 'open' },
    { text: '으세요', link: 'cons', requires: 'coda' },
  ] },
  { tag: 'EF', lemma: '에요', slot: 'EF', alts: [{ text: '에요', link: 'vowel', harmony: 'any' }] },
  { tag: 'EF', lemma: '는데요', slot: 'EF', alts: [{ text: '는데요', link: 'cons' }] },
  { tag: 'EF', lemma: '네요', slot: 'EF', alts: [{ text: '네요', link: 'cons' }] },
  { tag: 'EF', lemma: '지요', slot: 'EF', alts: [{ text: '지요', link: 'cons' }] },
  { tag: 'EF', lemma: '(으)ㄹ까요', slot: 'EF', alts: [
    { text: 'ㄹ까요', link: 'coda' },
    { text: '을까요', link: 'cons', requires: 'coda' },
  ] },

  // 연결어미
  { tag: 'EC', lemma: '아/어', slot: 'EC', alts: [
    { text: '아', link: 'vowel', harmony: 'bright' },
    { text: '어', link: 'vowel', harmony: 'dark' },
    { text: '여', link: 'vowel', harmony: 'hada' },
  ] },
  { tag: 'EC', lemma: '아/어서', slot: 'EC', alts: [
    { text: '아서', link: 'vowel', harmony: 'bright' },
    { text: '어서', link: 'vowel', harmony: 'dark' },
    { text: '여서', link: 'vowel', harmony: 'hada' },
  ] },
  { tag: 'EC', lemma: '아/어도', slot: 'EC', alts: [
    { text: '아도', link: 'vowel', harmony: 'bright' },
    { text: '어도', link: 'vowel', harmony: 'dark' },
    { text: '여도', link: 'vowel', harmony: 'hada' },
  ] },
  { tag: 'EC', lemma: '고', slot: 'EC', alts: [{ text: '고', link: 'cons' }] },
  { tag: 'EC', lemma: '지', slot: 'EC', alts: [{ text: '지', link: 'cons' }] },
  { tag: 'EC', lemma: '게', slot: 'EC', alts: [{ text: '게', link: 'cons' }] },
  { tag: 'EC', lemma: '(으)면', slot: 'EC', alts: [
    { text: '면', link: 'cons', requires: 'open' },
    { text: '으면', link: 'cons', requires: 'coda' },
  ] },
  { tag: 'EC', lemma: '(으)니까', slot: 'EC', alts: [
    { text: '니까', link: 'cons', requires: 'open' },
    { text: '으니까', link: 'cons', requires: 'coda' },
  ] },

  // 전성어미
  { tag: 'ETM', lemma: '(으)ㄴ', slot: 'ETM', alts: [
    { text: 'ㄴ', link: 'coda' },
    { text: '은', link: 'cons', requires: 'coda' },
  ] },
  { tag: 'ETM', lemma: '는', slot: 'ETM', alts: [{ text: '는', link: 'cons' }] },
  { tag: 'ETM', lemma: '(으)ㄹ', slot: 'ETM', alts: [
    { text: 'ㄹ', link: 'coda' },
    { text: '을', link: 'cons', requires: 'coda' },
  ] },
  { tag: 'ETM', lemma: '던', slot: 'ETM', alts: [{ text: '던', link: 'cons' }] },
  { tag: 'ETN', lemma: '기', slot: 'ETN', alts: [{ text: '기', link: 'cons' }] },
  { tag: 'ETN', lemma: '(으)ㅁ', slot: 'ETN', alts: [
    { text: 'ㅁ', link: 'coda' },
    { text: '음', link: 'cons', requires: 'coda' },
  ] },
]);

export const ENDINGS_BY_SLOT: Readonly<Record<Slot, readonly EndingEntry[]>> = Object.freeze({
  EP: ENDINGS.filter((e) => e.slot === 'EP'),
  EF: ENDINGS.filter((e) => e.slot === 'EF'),
  EC: ENDINGS.filter((e) => e.slot === 'EC'),
  ETM: ENDINGS.filter((e) => e.slot === 'ETM'),
  ETN: ENDINGS.filter((e) => e.slot === 'ETN'),
});
