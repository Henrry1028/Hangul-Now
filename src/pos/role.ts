/**
 * src/pos/role.ts
 * 레이어 A — 문장성분(역할) 태깅.
 *
 * 품사 엔진(normalize.ts) 위에 얹는 얇은 변환 계층이다. 버리는 것은 없다.
 *
 * 왜 필요한가: 품사 색은 `저는 예약을 했어요`의 `는`과 `을`을 똑같은 핑크로
 * 칠한다. 그런데 이 둘의 차이야말로 영어권 학습자가 가장 오래 헤매는 지점이다.
 * 품사 색은 여기서 정보를 0비트 전달한다.
 *
 * 그래서 색의 기준축을 뒤집는다 — 조사를 독립 색으로 빼지 말고, 조사가 자기 앞
 * 명사구를 무슨 역할로 만드는지에 따라 어절 전체의 색이 결정되게 한다.
 *
 * 순수 함수 (INV-5).
 */

import type { Eojeol, Segment } from './normalize.ts';

// ─────────────────────────────────────────────────────────────
// 역할 정의
// ─────────────────────────────────────────────────────────────

export const ROLES = [
  'TOPIC',     // 은/는  — 화제
  'SUBJECT',   // 이/가  — 주어
  'OBJECT',    // 을/를  — 목적어
  'PLACE',     // 에/에서/로/에게 — 장소·시간·방향
  'OF',        // 의     — 관형격
  'PREDICATE', // 서술어 (동사·형용사·이다)
  'MODIFIER',  // 부사어·관형어
  'UNMARKED',  // 역할 미확정 (독립언, 추론 불가)
] as const;
export type Role = (typeof ROLES)[number];

export interface RoleAssignment {
  role: Role;
  /** 역할을 결정한 조사 세그먼트의 인덱스. 없으면 -1 */
  markerIndex: number;
  /** 조사가 생략되어 추론한 결과 — 렌더러는 유령 조사로 표시한다 */
  inferred?: boolean;
  /** 추론된 생략 조사의 표기 (유령 표시용) */
  ghostMarker?: string;
  /** 격조사 위에 보조사 은/는이 얹혀 화제화됨 */
  topicalized?: boolean;
  /** 보조사(도/만 등)라 역할이 확정적이지 않음 */
  uncertain?: boolean;
}

/**
 * 조사 태그 → 역할.
 * JX(보조사)를 JKS(주격)와 다른 색으로 분리하는 것이 이 계층의 절반이다.
 * 9품사 체계에서는 둘 다 그냥 '조사'라서 원리적으로 구분이 불가능했다.
 */
export const PARTICLE_ROLE: Readonly<Record<string, Role>> = Object.freeze({
  JKS: 'SUBJECT',
  JKC: 'SUBJECT',
  JKO: 'OBJECT',
  JKB: 'PLACE',
  JKG: 'OF',
  JKV: 'UNMARKED', // 호격 — 부르는 말이라 문장성분이 아니다
  JX: 'TOPIC',
});

/** 역할이 확정적인 보조사. 그 외 JX(도/만/조차…)는 uncertain으로 표시한다 */
const TOPIC_MARKERS = new Set(['은', '는']);

/** 격조사 태그 — 보조사보다 우선해서 역할을 결정한다 */
const CASE_TAGS = new Set(['JKS', 'JKC', 'JKO', 'JKB', 'JKG']);

const ENDING_TAGS = new Set(['EP', 'EF', 'EC']);
const SUBSTANTIVE = new Set(['NOUN', 'PRONOUN', 'NUMERAL']);

/**
 * 자동사·형용사 표제어. 조사가 생략된 체언의 역할을 추론할 때
 * '주어냐 목적어냐'를 가르는 유일한 단서다.
 */
const INTRANSITIVE_LEMMAS = new Set([
  '가다', '오다', '있다', '없다', '되다', '자다', '앉다', '일어나다',
  '나가다', '들어가다', '계시다', '이다', '아니다',
]);

// ─────────────────────────────────────────────────────────────
// 팔레트 (모든 배경 대비 4.5:1 이상 — INV-3)
// ─────────────────────────────────────────────────────────────

export interface RoleStyle {
  ko: string;
  en: string;
  badge: string;
  bg: string;
  fg: string;
  /** 조사 끝단 색 — 같은 계열의 진한 색. "저 꼬리가 이 색을 만들었다"를 보여준다 */
  tail: string;
}

export const ROLE_STYLE: Readonly<Record<Role, RoleStyle>> = Object.freeze({
  TOPIC:     { ko: '화제', en: 'Topic',     badge: 'Top',  bg: '#7C3AED', fg: '#FFFFFF', tail: '#5B21B6' },
  SUBJECT:   { ko: '주어', en: 'Subject',   badge: 'Subj', bg: '#1D4ED8', fg: '#FFFFFF', tail: '#1E3A8A' },
  OBJECT:    { ko: '목적어', en: 'Object',  badge: 'Obj',  bg: '#047857', fg: '#FFFFFF', tail: '#065F46' },
  PLACE:     { ko: '장소·때', en: 'Where / When', badge: 'Wh', bg: '#0E7490', fg: '#FFFFFF', tail: '#155E75' },
  OF:        { ko: '관형격', en: 'Of',      badge: 'of',   bg: '#64748B', fg: '#FFFFFF', tail: '#475569' },
  PREDICATE: { ko: '서술어', en: 'Predicate', badge: 'Pred', bg: '#DC2626', fg: '#FFFFFF', tail: '#991B1B' },
  MODIFIER:  { ko: '수식어', en: 'Modifier', badge: 'Mod', bg: '#B45309', fg: '#FFFFFF', tail: '#92400E' },
  // 중립 칩은 글자색이 어두우므로 끝단도 밝은 쪽으로 진하게 잡는다
  UNMARKED:  { ko: '미표시', en: 'Unmarked', badge: '',    bg: '#D1D5DB', fg: '#374151', tail: '#B9BEC6' },
});

export const ROLE_TOOLTIP_EN: Readonly<Record<Role, string>> = Object.freeze({
  TOPIC:
    '은/는 marks the TOPIC — "as for X". It is not the subject marker. Use it to set what the sentence is about, or to contrast. This is the single hardest particle for English speakers.',
  SUBJECT:
    '이/가 marks the SUBJECT — who or what does the action. Compare with 은/는 (topic): 제가 했어요 answers "who did it", 저는 했어요 answers "what about you".',
  OBJECT:
    '을/를 marks the OBJECT — what the action is done to. English uses word order for this; Korean uses this tag, so the word can move around the sentence.',
  PLACE:
    '에/에서/로/에게 mark WHERE, WHEN, or TO WHOM. 에 is a destination or point in time; 에서 is where an action happens.',
  OF: '의 links two nouns — "X of Y". It is often dropped in speech.',
  PREDICATE:
    'The predicate always comes last in a Korean sentence. Verbs and adjectives both go here — Korean adjectives are a kind of verb.',
  MODIFIER:
    'Describes something else: an adverb modifying the predicate, or a clause modifying a noun. It carries no case marker.',
  UNMARKED:
    'No particle, and the role could not be determined from context. In speech particles are dropped constantly — the role has to come from meaning.',
});

// ─────────────────────────────────────────────────────────────
// 역할 배정
// ─────────────────────────────────────────────────────────────

const visible = (e: Eojeol) => e.segments.filter((s) => s.bucket !== 'PUNCT');
const lastOf = <T>(xs: T[]): T | undefined => xs[xs.length - 1];

/** 문장 종결 부호(SF)를 경계로 어절을 문장 단위로 묶는다 — 역할 추론의 범위 */
function splitSentences(eojeols: Eojeol[]): Eojeol[][] {
  const out: Eojeol[][] = [];
  let cur: Eojeol[] = [];
  for (const e of eojeols) {
    cur.push(e);
    if (e.segments.some((s) => s.rawTags.includes('SF'))) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

function isPredicateEojeol(segs: Segment[]): boolean {
  if (segs.some((s) => s.bucket === 'ENDING')) return true;
  const last = lastOf(segs);
  return !!last && last.rawTags.some((t) => ENDING_TAGS.has(t));
}

/** 관형사형 전성어미로 끝나면 뒤 명사를 꾸미는 관형어다 */
function isAdnominal(segs: Segment[]): boolean {
  const last = lastOf(segs);
  return !!last && lastOf(last.rawTags) === 'ETM';
}

function roleFromParticles(segs: Segment[]): RoleAssignment | null {
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i];
    if (seg.bucket !== 'PARTICLE') continue;

    const caseTag = seg.rawTags.find((t) => CASE_TAGS.has(t));
    const hasJx = seg.rawTags.includes('JX');

    if (caseTag) {
      return {
        role: PARTICLE_ROLE[caseTag],
        markerIndex: i,
        // 에서 + 는 — 장소인데 화제화된 형태. 격이 역할을 정하고 보조사가 얹힌다
        ...(hasJx ? { topicalized: true } : {}),
      };
    }
    if (hasJx) {
      // 도/만/조차는 주어·목적어 자리를 모두 차지할 수 있어 역할이 확정되지 않는다
      const certain = TOPIC_MARKERS.has(seg.surface) || TOPIC_MARKERS.has(seg.surface.slice(-1));
      return { role: 'TOPIC', markerIndex: i, ...(certain ? {} : { uncertain: true }) };
    }
    if (seg.rawTags.includes('JKV')) return { role: 'UNMARKED', markerIndex: i };
  }
  return null;
}

/** 문장의 서술어가 자동사·형용사인가 — 생략 조사 추론의 유일한 단서 */
function predicateIsIntransitive(sentence: Eojeol[]): boolean {
  for (let i = sentence.length - 1; i >= 0; i--) {
    const segs = visible(sentence[i]);
    if (!isPredicateEojeol(segs) || isAdnominal(segs)) continue;

    const head = segs.find((s) => s.bucket === 'VERB' || s.bucket === 'ADJECTIVE');
    if (!head) return true; // 이다 서술어 (프런트입니다) → 주어를 취한다
    if (head.bucket === 'ADJECTIVE') return true;
    if (head.lemma && INTRANSITIVE_LEMMAS.has(head.lemma)) return true;
    // 확인되다 류 피동 파생 — absorb가 앞 형태소의 lemma를 유지하므로 표면형으로 본다
    if (head.rawTags.includes('XSV') && head.surface.endsWith('되')) return true;
    return false;
  }
  return true;
}

/**
 * 조사가 생략된 체언의 역할 추론.
 *
 * 회화에서 조사는 끊임없이 생략되고, 그때 학습자가 문장 구조를 놓친다.
 * "여기 원래 을이 있었고 그래서 이건 목적어"를 보여주는 것이 이 계층의 목적이다.
 *
 * 다만 추론은 **문장 안에 무표지 체언이 정확히 하나일 때만** 한다.
 * `켈리 손님.`처럼 둘 이상이면 어느 쪽이 주어인지 알 수 없고, 틀린 색은
 * 색이 없는 것보다 나쁘다.
 */
function inferElidedRole(sentence: Eojeol[], bareIdx: number[]): void {
  // 한국어는 서술어가 문말이다. 서술어 뒤에 오는 체언은 논항이 아니라
  // 호격·후치다 — `반갑습니다, 켈리 손님.`의 손님을 주어로 칠하면 안 된다.
  let lastPredicate = -1;
  sentence.forEach((e, i) => {
    if (e.role?.role === 'PREDICATE') lastPredicate = i;
  });

  const candidates = bareIdx.filter((i) => {
    // 무표지 체언 + 체언 = 수식 관계다. `제 가방`, `방 번호`, `열 시`, `켈리 손님`.
    // 조사가 생략된 논항이 아니라 뒤 명사를 꾸미는 관형어다.
    const next = sentence[i + 1];
    if (next) {
      const head = visible(next)[0];
      if (head && SUBSTANTIVE.has(head.bucket)) {
        sentence[i].role = { role: 'MODIFIER', markerIndex: -1 };
        return false;
      }
    }
    return lastPredicate < 0 || i < lastPredicate;
  });

  // 무표지 체언이 둘 이상이면 어느 쪽이 주어인지 알 수 없다.
  // 틀린 색은 색이 없는 것보다 나쁘므로 추론하지 않는다.
  if (candidates.length !== 1) return;
  const target = sentence[candidates[0]];

  const hasObject = sentence.some((e) => e.role?.role === 'OBJECT');
  const hasSubjectish = sentence.some(
    (e) => e.role?.role === 'SUBJECT' || e.role?.role === 'TOPIC',
  );

  let role: Role;
  if (hasObject && !hasSubjectish) role = 'SUBJECT';
  else if (predicateIsIntransitive(sentence)) role = 'SUBJECT';
  else role = 'OBJECT';

  const tail = lastOf(visible(target));
  const hasCoda = tail ? hasFinalCoda(tail.surface) : false;
  const ghost =
    role === 'SUBJECT' ? (hasCoda ? '이' : '가') : hasCoda ? '을' : '를';

  target.role = { role, markerIndex: -1, inferred: true, ghostMarker: ghost };
}

/** 유령 조사의 이형태 선택용 — 마지막 글자에 받침이 있는가 */
function hasFinalCoda(surface: string): boolean {
  const ch = surface.slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

/**
 * 어절마다 문장성분을 배정한다. `eojeols`의 각 항목에 `role`을 채운다.
 * 품사 결과는 건드리지 않는다 — 레이어 B/C는 그대로 살아 있다.
 */
export function assignRoles(eojeols: Eojeol[]): void {
  for (const sentence of splitSentences(eojeols)) {
    const bare: number[] = [];

    sentence.forEach((eojeol, index) => {
      const segs = visible(eojeol);
      const unmarked = (): void => {
        eojeol.role = { role: 'UNMARKED', markerIndex: -1 };
      };
      const modifier = (): void => {
        eojeol.role = { role: 'MODIFIER', markerIndex: -1 };
      };

      if (segs.length === 0) return unmarked();

      // R1 관형어 — 서술어보다 먼저 본다. 활용형이지만 뒤 명사를 꾸민다
      if (isAdnominal(segs)) return modifier();

      // R2 서술어 — 어미가 있으면 서술어다 (프런트입니다 포함)
      if (isPredicateEojeol(segs)) {
        eojeol.role = { role: 'PREDICATE', markerIndex: -1 };
        return;
      }

      // R3 조사가 역할을 정한다
      const byParticle = roleFromParticles(segs);
      if (byParticle) {
        eojeol.role = byParticle;
        return;
      }

      // R4 수식언 단독
      if (segs.every((s) => s.bucket === 'ADVERB' || s.bucket === 'DETERMINER')) {
        return modifier();
      }

      // R5 무표지 체언 — 뒤에서 추론
      unmarked();
      if (segs.some((s) => SUBSTANTIVE.has(s.bucket))) bare.push(index);
    });

    inferElidedRole(sentence, bare);
  }
}
