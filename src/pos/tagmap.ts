/**
 * src/pos/tagmap.ts
 * 태그 매핑 + 팔레트. 순수 데이터, 의존성 0.
 * 기준 태그셋: 세종 (Kiwi / mecab-ko / Komoran 공통)
 *
 * INV-2: 이 파일 어디에도 NOUN 폴백을 두지 않는다.
 */

// ─────────────────────────────────────────────────────────────
// 버킷 정의
// ─────────────────────────────────────────────────────────────

export const POS9 = [
  'NOUN',
  'PRONOUN',
  'NUMERAL',
  'VERB',
  'ADJECTIVE',
  'DETERMINER',
  'ADVERB',
  'PARTICLE',
  'INTERJECTION',
] as const;
export type Pos9 = (typeof POS9)[number];

export const NON_POS = ['ENDING', 'AFFIX', 'ROOT', 'PUNCT', 'OTHER', 'UNKNOWN'] as const;
export type NonPos = (typeof NON_POS)[number];

export type Bucket = Pos9 | NonPos;

export const isPos9 = (b: Bucket): b is Pos9 => (POS9 as readonly string[]).includes(b);

/** 학교문법 5언 — L1 렌더에서 사용 */
export const FIVE_CLASSES = {
  NOUN: 'SUBSTANTIVE',
  PRONOUN: 'SUBSTANTIVE',
  NUMERAL: 'SUBSTANTIVE',
  VERB: 'PREDICATE',
  ADJECTIVE: 'PREDICATE',
  DETERMINER: 'MODIFIER',
  ADVERB: 'MODIFIER',
  PARTICLE: 'RELATIONAL',
  INTERJECTION: 'INDEPENDENT',
} as const satisfies Record<Pos9, string>;

// ─────────────────────────────────────────────────────────────
// 태그 → 버킷 매핑 (SPEC §3)
// ─────────────────────────────────────────────────────────────

export const TAG_MAP: Readonly<Record<string, Bucket>> = Object.freeze({
  // 체언
  NNG: 'NOUN', NNP: 'NOUN', NNB: 'NOUN', NNBC: 'NOUN',
  SL: 'NOUN',   // 외국어
  SH: 'NOUN',   // 한자
  NP: 'PRONOUN',
  NR: 'NUMERAL',
  SN: 'NUMERAL', // 아라비아 숫자

  // 용언
  VV: 'VERB',
  VA: 'ADJECTIVE',
  VCN: 'ADJECTIVE',  // 아니다
  VCP: 'PARTICLE',   // 이다 = 서술격 조사 (학교문법)
  // 보조용언. M4가 rawTags로 감지해 앞 용언에 병합하므로 버킷을 경유하지 않는다.
  // 병합되지 않고 단독 잔류하면 그대로 VERB로 노출된다 (+ ORPHAN_AUX 진단).
  VX: 'VERB',

  // 수식언
  MM: 'DETERMINER', MMA: 'DETERMINER', MMD: 'DETERMINER', MMN: 'DETERMINER',
  MAG: 'ADVERB',    // ← 잠시 등. 관형사로 매핑하던 버그 지점
  MAJ: 'ADVERB',

  // 독립언
  IC: 'INTERJECTION',

  // 관계언
  JKS: 'PARTICLE', JKC: 'PARTICLE', JKG: 'PARTICLE', JKO: 'PARTICLE',
  JKB: 'PARTICLE', JKV: 'PARTICLE', JKQ: 'PARTICLE',
  JX: 'PARTICLE', JC: 'PARTICLE',

  // 품사 아님 — 어미
  EP: 'ENDING', EF: 'ENDING', EC: 'ENDING', ETN: 'ENDING', ETM: 'ENDING',

  // 품사 아님 — 접사 / 어근
  XPN: 'AFFIX', XSN: 'AFFIX', XSV: 'AFFIX', XSA: 'AFFIX', XSM: 'AFFIX',
  XR: 'ROOT',

  // 부호
  SF: 'PUNCT', SP: 'PUNCT', SS: 'PUNCT', SE: 'PUNCT', SO: 'PUNCT',
  SSO: 'PUNCT', SSC: 'PUNCT',

  // 부호 — Kiwi 확장. SB는 순서 있는 기호 `가)`, `1.`
  SB: 'PUNCT',

  // 기타
  SW: 'OTHER',
  W_URL: 'OTHER', W_EMAIL: 'OTHER', W_HASHTAG: 'OTHER',
  W_MENTION: 'OTHER', W_SERIAL: 'OTHER',
  W_EMOJI: 'OTHER', // Kiwi 확장

  // Kiwi 확장 — 구어체에서 떨어져 나온 종성(`그렇습니닷`의 ㅅ).
  // 품사가 아니므로 색을 주지 않는다 (INV-1).
  Z_CODA: 'ENDING',
});

/**
 * Kiwi는 용언 어간과 파생 접미사에 규칙/불규칙 표지를 붙인다.
 *   VA-I(반갑, 춥)  VV-I(듣, 돕)  XSA-I(-스럽, -롭)  그리고 -R 짝
 *
 * `-I`/`-R`은 활용 방식을 나타낼 뿐 품사가 아니다. 개별 태그를 열거하는 대신
 * 접미사를 벗겨 기본 태그로 재조회한다 — Kiwi가 표지를 늘려도 따라간다.
 * 벗긴 뒤에도 표에 없으면 그대로 UNKNOWN이다 (INV-2).
 */
const INFLECTION_SUFFIX = /^(.+)-[IR]$/;

/**
 * INV-2 준수. 미지 태그는 UNKNOWN이며 명사로 폴백하지 않는다.
 * 호출자는 반환값이 'UNKNOWN'일 때 반드시 diagnostics에 기록해야 한다.
 */
export function tagToBucket(tag: string): Bucket {
  const upper = tag.toUpperCase();
  const direct = TAG_MAP[upper];
  if (direct) return direct;

  const base = INFLECTION_SUFFIX.exec(upper)?.[1];
  return (base && TAG_MAP[base]) || 'UNKNOWN';
}

/** 어미 하위 종류 — L3 라벨링용 */
export const ENDING_KIND: Readonly<Record<string, string>> = Object.freeze({
  EP: 'PREFINAL',      // 선어말어미 (시, 었, 겠)
  EF: 'FINAL',         // 종결어미 (습니다, 어요)
  EC: 'CONNECTIVE',    // 연결어미 (고, 어서)
  ETN: 'NOMINALIZING', // 명사형 전성어미 (기, ㅁ)
  ETM: 'ADNOMINAL',    // 관형사형 전성어미 (는, 은, ㄹ)
});

// ─────────────────────────────────────────────────────────────
// 팔레트 (SPEC §5) — 모든 조합 대비 4.5:1 이상
// ─────────────────────────────────────────────────────────────

export interface BucketStyle {
  ko: string;
  en: string;
  badge: string;
  bg: string;
  fg: string;
  /** 수식 방향 마커. 색상 외 판별 수단 (INV-3) */
  marker?: string;
  /** 사선 해칭 여부 — 품사 아님을 시각적으로 명시 */
  hatched?: boolean;
}

export const STYLE: Readonly<Record<Bucket, BucketStyle>> = Object.freeze({
  NOUN:         { ko: '명사',   en: 'Noun',         badge: 'N',   bg: '#1D4ED8', fg: '#FFFFFF' },
  PRONOUN:      { ko: '대명사', en: 'Pronoun',      badge: 'Pro', bg: '#93C5FD', fg: '#1E3A8A' },
  NUMERAL:      { ko: '수사',   en: 'Numeral',      badge: 'Num', bg: '#4338CA', fg: '#FFFFFF' },
  // 동사와 형용사는 원거리 색이 아니라 같은 난색 형제여야 한다.
  // 한국어에서 형용사는 용언, 즉 동사의 한 종류다. 빨강 대 초록으로 떼어놓으면
  // "adjective는 verb와 다른 것"이라는 영어식 직관을 앱이 매 화면 강화해버리고,
  // 그 직관이 ×날씨가 좋이에요 / ×예쁜이에요 / ×피곤이에요의 공통 뿌리다.
  VERB:         { ko: '동사',   en: 'Verb',         badge: 'V',   bg: '#DC2626', fg: '#FFFFFF' },
  ADJECTIVE:    { ko: '형용사', en: 'Adjective (descriptive verb)', badge: 'Adj', bg: '#C2410C', fg: '#FFFFFF' },
  // 영어 determiner는 the/a/my를 뜻해서 관형사와 범위가 어긋난다(새/헌/옛이 빠진다).
  // KSL 교재의 용어를 쓰고, 배지도 라벨과 같은 말(PreN)로 맞춘다.
  DETERMINER:   { ko: '관형사', en: 'Pre-noun (determiner)', badge: 'PreN', bg: '#A16207', fg: '#FFFFFF', marker: '▸N' },
  // ▸V가 아니라 ▸Pred다. 부사는 동사만이 아니라 형용사도 수식한다(아주 예쁘다).
  // 빨강(동사)·주황(형용사)을 같은 용언 계열로 묶은 팔레트 설계와도 이 쪽이 맞는다.
  ADVERB:       { ko: '부사',   en: 'Adverb',       badge: 'Adv', bg: '#FACC15', fg: '#422006', marker: '▸Pred' },
  PARTICLE:     { ko: '조사',   en: 'Particle',     badge: 'P',   bg: '#DB2777', fg: '#FFFFFF' },
  INTERJECTION: { ko: '감탄사', en: 'Interjection', badge: 'Int', bg: '#7C3AED', fg: '#FFFFFF' },

  ENDING:  { ko: '어미', en: 'Ending', badge: '',  bg: '#D1D5DB', fg: '#374151', hatched: true },
  AFFIX:   { ko: '접사', en: 'Affix',  badge: '',  bg: '#CBD5E1', fg: '#334155', hatched: true },
  ROOT:    { ko: '어근', en: 'Root',   badge: '',  bg: '#CBD5E1', fg: '#334155', hatched: true },
  PUNCT:   { ko: '부호', en: '',       badge: '',  bg: 'transparent', fg: 'inherit' },
  OTHER:   { ko: '기타', en: 'Other',  badge: '',  bg: '#D1D5DB', fg: '#374151' },
  UNKNOWN: { ko: '미분류', en: 'Unknown', badge: '?', bg: '#FBBF24', fg: '#78350F' },
});

/** L1(5언) 렌더 시 대표색 — 계열 대표를 그대로 재사용해 학습 연속성 확보 */
export const FIVE_CLASS_STYLE = Object.freeze({
  SUBSTANTIVE: { en: 'Substantive (naming words)', bg: '#1D4ED8', fg: '#FFFFFF', badge: 'S' },
  PREDICATE:   { en: 'Predicate (action / state)', bg: '#DC2626', fg: '#FFFFFF', badge: 'P' },
  MODIFIER:    { en: 'Modifier',                   bg: '#A16207', fg: '#FFFFFF', badge: 'M' },
  RELATIONAL:  { en: 'Particle (role marker)',     bg: '#DB2777', fg: '#FFFFFF', badge: 'R' },
  INDEPENDENT: { en: 'Independent',                bg: '#7C3AED', fg: '#FFFFFF', badge: 'I' },
});

// ─────────────────────────────────────────────────────────────
// 레이어 B — 6품사 축약 뷰
// ─────────────────────────────────────────────────────────────

/**
 * 주요 영어권 교재(LingoDeer·90DayKorean·HowToStudyKorean 등)는 명사/동사/
 * 형용사/조사/부사 다섯 언저리에서 멈춘다. 수사·관형사·감탄사·대명사를 독립
 * 단원으로 다루는 곳은 거의 없다. 기본 품사 뷰를 그 수준에 맞춘다.
 * 9품사 전체는 레이어 C(형태소 뷰)에 그대로 살아 있다.
 */
export const WORD_CLASS6 = ['NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PARTICLE', 'OTHER'] as const;
export type WordClass6 = (typeof WORD_CLASS6)[number];

export const TO_WORD_CLASS6: Readonly<Record<Bucket, WordClass6 | null>> = Object.freeze({
  NOUN: 'NOUN', PRONOUN: 'NOUN', NUMERAL: 'NOUN',
  VERB: 'VERB',
  ADJECTIVE: 'ADJECTIVE',
  ADVERB: 'ADVERB',
  PARTICLE: 'PARTICLE',
  DETERMINER: 'OTHER', INTERJECTION: 'OTHER',
  ENDING: null, AFFIX: null, ROOT: null, PUNCT: null, OTHER: null, UNKNOWN: null,
});

/** 품사가 아닌 것은 레이어 B에서도 색을 받지 않는다 (INV-1) */
export const toWordClass6 = (b: Bucket): WordClass6 | null => TO_WORD_CLASS6[b] ?? null;

/** 영어권 학습자용 툴팁 (SPEC §6) */
export const TOOLTIP_EN: Readonly<Partial<Record<Bucket, string>>> = Object.freeze({
  ADJECTIVE:
    'Not like English adjectives. Korean adjectives conjugate like verbs and already contain "is/are" — 예쁘다 means "to be pretty". No separate verb needed.',
  VERB:
    'Always sentence-final. The dictionary form ends in -다; what you see is the stem plus endings.',
  DETERMINER:
    'Modifies nouns and noun-like words. Never conjugates, never takes a particle. Covers both English determiners (이 = this) and attributive adjectives (새 = new).',
  ADVERB:
    'Modifies verbs, adjectives, or other adverbs. Its position in the sentence is flexible.',
  PARTICLE:
    'No English equivalent. Glued to the previous word to mark its role — subject, object, topic, location. Particles make Korean word order more flexible than English, but not completely free.',
  PRONOUN:
    'Frequently dropped when obvious from context — unlike English, which requires a subject.',
  NUMERAL:
    'Korean has two number systems (native and Sino-Korean); the counter word decides which one you use.',
  INTERJECTION:
    'Stands alone with no grammatical link to the rest of the sentence.',
  ENDING:
    'Not a part of speech — that is why it has no color. Endings carry tense, politeness level, and mood. -습니다 marks formal polite speech.',
  AFFIX:
    'Not a part of speech. An affix attaches to a stem to build a new word.',
  // 무색과 회색 해칭은 이미 시각적으로 다르다. 부족한 것은 "왜 무색인지"뿐이라
  // 경고 표시(? 배지·노란 배경·점선) 대신 hover 문구로만 설명한다 (SPEC §4.6).
  UNKNOWN:
    'No color at all = a word we could not classify — a name, slang, or a brand. We leave it plain rather than guessing it as a noun.',
});
