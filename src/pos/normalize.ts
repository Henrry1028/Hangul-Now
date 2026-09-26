/**
 * src/pos/normalize.ts
 * 분석기 출력(형태소 배열) → 렌더 가능한 TaggedSentence
 * SPEC §4 병합 규칙 M0~M8, 스팬 규칙 S1~S3 구현.
 *
 * 순수 함수. 무작위성·시간 의존성 없음 (INV-5).
 */

import type { RoleAssignment } from './role.ts';
import {
  type Bucket,
  type Pos9,
  type WordClass6,
  FIVE_CLASSES,
  ENDING_KIND,
  isPos9,
  tagToBucket,
  toWordClass6,
} from './tagmap.ts';

// ─────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────

export type Confidence = 'verified' | 'inferred';

/** 분석기 어댑터가 반드시 이 형태로 정규화해서 넘긴다 */
export interface Morph {
  surface: string;
  lemma: string;
  tag: string;
  start: number; // 원문 문자 인덱스 (inclusive)
  end: number;   // exclusive
  /**
   * 앞 형태소와 음절을 공유하는 방식 (SPEC §5).
   * 'coda'  = 종성 분리 (하 + ㄴ → 한). 양쪽 모두 세그먼트로 남는다.
   * 'fused' = 모음 융합·불규칙 (모르 + 아 → 몰라). 우선순위 높은 쪽이 음절을 갖는다.
   */
  share?: 'coda' | 'fused';
  /** 프로젝트 사전에서 경계와 표제어를 검증한 형태소 */
  confidence?: Confidence;
}

export interface Segment {
  surface: string;
  start: number;
  end: number;
  bucket: Bucket;
  displayBucket: Bucket | string;
  lemma?: string;
  isAux?: boolean;
  rawTags: string[];
  endingKind?: string;
  /**
   * 분석기가 이 형태소의 경계가 음절 내부에 걸린다고 선언했음을 나타낸다.
   * 'coda'  = 종성 경계 (하 + ㄴ → 한)
   * 'fused' = 모음 융합·불규칙 (모르 + 아 → 몰라)
   * INV-4에 따라 **둘 다 분할하지 않는다.** 진단(SPAN_COLLISION)에서
   * 선언된 겹침과 분석기 오류를 구별하는 데만 쓰인다.
   */
  share?: 'coda' | 'fused';
  /** 레이어 B — 6품사 축약. 품사가 아닌 것은 null (INV-1) */
  wordClass: WordClass6 | null;
  /** 검증 사전 항목인지, 인접 NOUN 병합으로 추론된 경계인지 구분한다 */
  confidence?: Confidence;
}

export interface Eojeol {
  surface: string;
  start: number;
  end: number;
  segments: Segment[];
  /** 레이어 A — 문장성분. role.ts의 assignRoles가 채운다 */
  role?: RoleAssignment;
}

export interface Diagnostic {
  kind: 'UNKNOWN_TAG' | 'SPAN_COLLISION' | 'ORPHAN_AUX';
  tag?: string;
  surface: string;
  at: number;
}

export interface TaggedSentence {
  text: string;
  level: 1 | 2 | 3;
  eojeols: Eojeol[];
  diagnostics: Diagnostic[];
}

export interface Options {
  level?: 1 | 2 | 3;
  /** M0 오버라이드: key = `${lemma}/${tag}` 또는 `${lemma}` */
  overrides?: Record<string, Pos9>;
  /** M7 합성명사 사전 */
  compoundNouns?: Set<string>;
  /** M5 보조용언 표제어 — 어절 경계를 넘는 보조용언 표지에 사용 */
  auxLemmas?: ReadonlySet<string>;
}

// ─────────────────────────────────────────────────────────────
// 내부 표현
// ─────────────────────────────────────────────────────────────

interface Node {
  surface: string;
  start: number;
  end: number;
  bucket: Bucket;
  lemma: string;
  rawTags: string[];
  isAux?: boolean;
  endingKind?: string;
  share?: 'coda' | 'fused';
  confidence?: Confidence;
}

const AFFIX_VERB = new Set(['XSV']);
const AFFIX_ADJ = new Set(['XSA']);
const AFFIX_NOUN = new Set(['XSN']);
const AFFIX_ADV = new Set(['XSM']);
const NOUNISH_TAGS = new Set(['NNG', 'NNP', 'XR']);

/** 세그먼트 귀속 우선순위 — S1b에서 음절 충돌 해소에 사용 */
const PRIORITY: Record<string, number> = {
  __POS9__: 3,
  ENDING: 2,
  AFFIX: 1,
  ROOT: 1,
  OTHER: 0,
  UNKNOWN: 0,
  PUNCT: -1,
};
const priorityOf = (b: Bucket) => (isPos9(b) ? PRIORITY.__POS9__ : (PRIORITY[b] ?? 0));

// ─────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────

export function normalize(text: string, morphs: Morph[], opts: Options = {}): TaggedSentence {
  const level = opts.level ?? 2;
  const diagnostics: Diagnostic[] = [];

  // 1) 태그 → 버킷 (M0 오버라이드 우선)
  let nodes: Node[] = morphs.map((m) => {
    const override = opts.overrides?.[`${m.lemma}/${m.tag}`] ?? opts.overrides?.[m.lemma];
    const bucket: Bucket = override ?? tagToBucket(m.tag);

    if (bucket === 'UNKNOWN') {
      diagnostics.push({ kind: 'UNKNOWN_TAG', tag: m.tag, surface: m.surface, at: m.start });
    }
    return {
      surface: m.surface,
      start: m.start,
      end: m.end,
      bucket,
      lemma: m.lemma,
      rawTags: [m.tag],
      endingKind: ENDING_KIND[m.tag.toUpperCase()],
      share: m.share,
      confidence: m.confidence,
    };
  });

  // M3(VCP→PARTICLE, VCN→ADJECTIVE), M5(어미→ENDING), M8(UNKNOWN 폴백 금지)은
  // tagmap.ts의 TAG_MAP/tagToBucket이 이미 수행했다.

  // 2) 병합 규칙 (순서 고정)
  nodes = mergeDerivation(nodes);        // M1, M2
  nodes = mergeAux(nodes, diagnostics);  // M4
  nodes = mergeParticles(nodes);         // M6
  nodes = mergeCompoundNouns(text, nodes, opts.compoundNouns); // M7

  // 3) 어절 분할 (S2) + 스팬 해석 (S1) + 동일색 병합 (S3)
  const eojeols = buildEojeols(text, nodes, level, diagnostics);

  // 4) 어절 경계를 넘는 보조용언 표지 (M9 — 스펙 확장)
  markAuxAcrossEojeols(eojeols, opts.auxLemmas);

  return { text, level, eojeols, diagnostics };
}

// ─────────────────────────────────────────────────────────────
// M1 / M2 — 파생 접사 병합. 좌→우 스캔, 반복 적용
//   확인/NNG + 되/XSV      → VERB     (확인되다)
//   조용/XR  + 하/XSA      → ADJECTIVE(조용하다)
//   선생/NNG + 님/XSN      → NOUN
//   조용/XR  + 히/XSM      → ADVERB
//   XPN + 체언             → NOUN
// ─────────────────────────────────────────────────────────────
function mergeDerivation(nodes: Node[]): Node[] {
  const out: Node[] = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    const tag = n.rawTags[n.rawTags.length - 1];

    if (prev && isAdjacent(prev, n)) {
      const prevTag = prev.rawTags[prev.rawTags.length - 1];
      const prevNounish = NOUNISH_TAGS.has(prevTag) || prev.bucket === 'NOUN';

      // M1
      if (prevNounish && AFFIX_VERB.has(tag)) { absorb(prev, n, 'VERB'); continue; }
      if (prevNounish && AFFIX_ADJ.has(tag))  { absorb(prev, n, 'ADJECTIVE'); continue; }
      // M2
      if (prevNounish && AFFIX_NOUN.has(tag)) { absorb(prev, n, 'NOUN'); continue; }
      if (prevNounish && AFFIX_ADV.has(tag))  { absorb(prev, n, 'ADVERB'); continue; }
      // M2 — XPN + 체언
      if (prevTag === 'XPN' && isPos9(n.bucket) && FIVE_CLASSES[n.bucket] === 'SUBSTANTIVE') {
        // 접두사를 뒤 체언에 흡수
        const merged: Node = {
          ...n,
          surface: prev.surface + n.surface,
          start: prev.start,
          rawTags: [...prev.rawTags, ...n.rawTags],
          confidence: undefined,
        };
        out.pop();
        out.push(merged);
        continue;
      }
    }
    out.push({ ...n });
  }
  // XR 단독 잔류 → 명사로 취급하지 않고 ROOT 유지 (INV-2). L3에서만 노출
  return out;
}

// ─────────────────────────────────────────────────────────────
// M4 — 보조용언 병합 (어절 내부)
//   HEAD(VERB|ADJECTIVE) + EC + VX (+EC+VX)* → HEAD 품사 유지, isAux
// ─────────────────────────────────────────────────────────────
function mergeAux(nodes: Node[], diags: Diagnostic[]): Node[] {
  const out: Node[] = [];
  for (const n of nodes) {
    if (n.rawTags[n.rawTags.length - 1] !== 'VX') { out.push({ ...n }); continue; }

    // 직전 두 노드가 [HEAD 용언] [연결어미] 인지 확인
    const ending = out[out.length - 1];
    const head = out[out.length - 2];
    const headIsPredicate =
      head && isPos9(head.bucket) && FIVE_CLASSES[head.bucket] === 'PREDICATE';

    if (headIsPredicate && ending?.bucket === 'ENDING' && isAdjacent(ending, n)) {
      // 연결어미까지 삼켜 하나의 용언 세그먼트로
      head.end = n.end;
      head.rawTags = [...head.rawTags, ...ending.rawTags, ...n.rawTags];
      head.isAux = true;
      out.splice(out.length - 1, 1); // ending 제거
      continue;
    }

    // 고립된 VX — 분석 오류일 가능성. 동사로 두되 기록
    diags.push({ kind: 'ORPHAN_AUX', surface: n.surface, at: n.start });
    out.push({ ...n });
  }
  return out;
}

/**
 * M6 — 연속 조사 병합 (에서 + 는 → 하나)
 *
 * 단, 서술격 조사(VCP)는 오른쪽 피병합자가 될 수 없다. `까지` + `이다`를 합치면
 * `까지이`라는 없는 표면형이 나오고, 범위 표시와 서술어라는 다른 역할이 한 칩에
 * 뭉개진다. 반대 방향(`이` + `요`)은 허용된다 — VCP가 보조사를 흡수하는 것은 정상이다.
 */
function mergeParticles(nodes: Node[]): Node[] {
  return foldAdjacentSame(nodes, (n) => n.bucket === 'PARTICLE' && !isCopula(n));
}

const isCopula = (x: { rawTags: string[] }) => x.rawTags.includes('VCP');

// M7 — 합성명사 병합 (사전 등재된 경우만)
function mergeCompoundNouns(text: string, nodes: Node[], dict?: Set<string>): Node[] {
  if (!dict || dict.size === 0) return nodes;
  const out: Node[] = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (
      prev && prev.bucket === 'NOUN' && n.bucket === 'NOUN' &&
      isAdjacent(prev, n) && dict.has(text.slice(prev.start, n.end))
    ) {
      absorb(prev, n, 'NOUN');
      prev.lemma = prev.surface;
      prev.confidence = 'verified';
      continue;
    }
    out.push({ ...n });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 어절 분할 + S1 스팬 해석 + S3 동일색 병합
// ─────────────────────────────────────────────────────────────
function buildEojeols(
  text: string,
  nodes: Node[],
  level: 1 | 2 | 3,
  diags: Diagnostic[],
): Eojeol[] {
  // S2: 공백 기준 어절 경계 산출
  const bounds: Array<{ start: number; end: number }> = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) bounds.push({ start: m.index, end: m.index + m[0].length });

  return bounds.map((b) => {
    const inside = nodes.filter((n) => n.start < b.end && n.end > b.start);

    let segs = inside.map<Segment>((n) => {
      const start = Math.max(n.start, b.start);
      const end = Math.min(n.end, b.end);
      return {
        // 표면형은 항상 원문 슬라이스다. 세그먼트는 연속된 문자 구간이며
        // 자모 단위 표기(`ㄴ`, `ㅂ니다`)를 갖지 않는다 (INV-4, SPEC §7).
        surface: text.slice(start, end),
        start,
        end,
        bucket: n.bucket,
        displayBucket: toDisplay(n.bucket, level),
        wordClass: toWordClass6(n.bucket),
        lemma: n.lemma,
        isAux: n.isAux,
        rawTags: n.rawTags,
        endingKind: n.endingKind,
        ...(n.share ? { share: n.share } : {}),
        ...(n.confidence ? { confidence: n.confidence } : {}),
      };
    });

    segs = resolveSyllableCollisions(text, segs, diags);               // S1
    if (level < 3) {
      segs = foldAdjacentSame(segs, (s) => !isCopula(s), true); // S3
    }
    return { surface: text.slice(b.start, b.end), start: b.start, end: b.end, segments: segs };
  });
}

/**
 * S1 — 형태소 경계가 음절 내부에 걸리면 **분할하지 않는다** (INV-4).
 * 우선순위(품사 > ENDING > AFFIX)가 높은 쪽이 겹친 음절 전체를 가져간다.
 * 동순위면 앞 세그먼트가 가져간다.
 *
 *   예약한   = 예약/NNG + 하/XSV + ㄴ/ETM   → M1로 VERB(3) vs ETM(2) → [예약한]
 *   죄송합니다 = 죄송/XR + 하/XSA + ㅂ니다/EF → ADJ(3) vs EF(2)      → [죄송합][니다]
 *   프런트입니다 = 프런트 + 이/VCP + ㅂ니다/EF → PARTICLE(3) vs EF(2) → [프런트][입][니다]
 *   몰라요   = 모르/VV + 아요/EF            → VERB(3) vs EF(2)      → [몰라][요]
 *   셨      = 시/EP + 었/EP                → 동순위 → 앞이 가져감    → [셨]
 *
 * 스팬이 0이 된 형태소는 세그먼트로 남지 않지만 rawTags는 승자에게 이관된다.
 * 이관하지 않으면 "어미가 어디로 갔는지"를 검증할 수 없다.
 */
function resolveSyllableCollisions(
  text: string,
  segs: Segment[],
  diags: Diagnostic[],
): Segment[] {
  if (segs.length <= 1) return segs;
  const out: Segment[] = [];

  for (const s of segs) {
    const prev = out[out.length - 1];
    if (!prev || prev.end <= s.start) { out.push(s); continue; }

    // 분석기가 선언하지 않은 겹침만 오류다. 선언된 겹침은 정상 동작이므로
    // 진단을 내지 않는다 — 모든 축약형마다 오진단이 쌓이면 진단이 무용해진다.
    if (!s.share) {
      diags.push({ kind: 'SPAN_COLLISION', surface: s.surface, at: s.start });
    }

    if (priorityOf(prev.bucket) >= priorityOf(s.bucket)) {
      s.start = prev.end;
      prev.surface = text.slice(prev.start, prev.end);
      if (s.start >= s.end) {
        prev.rawTags = [...prev.rawTags, ...s.rawTags];
        continue;
      }
      s.surface = text.slice(s.start, s.end);
    } else {
      prev.end = s.start;
      if (prev.end <= prev.start) {
        s.rawTags = [...prev.rawTags, ...s.rawTags];
        out.pop();
      } else {
        prev.surface = text.slice(prev.start, prev.end);
      }
    }
    out.push(s);
  }
  return out;
}

/**
 * M9 (스펙 확장) — 공백으로 끊긴 보조용언 표지. 병합하지 않고 isAux만 부여한다.
 * 스펙 M4는 어절 내부만 다루고 S2가 공백 병합을 금지하므로, `바꿔 주시겠어요`의
 * `주`는 병합 대상이 아니다. 그런데 골든 픽스처가 이 `주`에 isAux=true를 요구한다.
 * 병합 없이 표지만 붙여 양쪽을 만족시킨다.
 */
function markAuxAcrossEojeols(eojeols: Eojeol[], auxLemmas?: ReadonlySet<string>): void {
  if (!auxLemmas || auxLemmas.size === 0) return;
  for (let i = 1; i < eojeols.length; i++) {
    const head = eojeols[i].segments[0];
    if (!head || !isPos9(head.bucket) || FIVE_CLASSES[head.bucket] !== 'PREDICATE') continue;
    if (head.isAux || !head.lemma || !auxLemmas.has(head.lemma)) continue;

    const prev = eojeols[i - 1].segments.filter((s) => s.bucket !== 'PUNCT');
    const tail = prev[prev.length - 1];
    if (!tail) continue;
    const tailIsPredicative =
      tail.bucket === 'ENDING' || (isPos9(tail.bucket) && FIVE_CLASSES[tail.bucket] === 'PREDICATE');
    if (tailIsPredicative && tail.rawTags.includes('EC')) head.isAux = true;
  }
}

// ─────────────────────────────────────────────────────────────
// 레벨별 표시 버킷 (L1 = 5언 병합)
// ─────────────────────────────────────────────────────────────
function toDisplay(bucket: Bucket, level: 1 | 2 | 3): Bucket | string {
  if (level === 1 && isPos9(bucket)) return FIVE_CLASSES[bucket];
  if (level === 1 && (bucket === 'AFFIX' || bucket === 'ROOT')) return 'ENDING';
  return bucket;
}

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────
const isAdjacent = (a: { end: number }, b: { start: number }) => a.end === b.start;

function absorb(prev: Node, n: Node, bucket: Bucket) {
  prev.surface += n.surface;
  prev.end = n.end;
  prev.bucket = bucket;
  prev.rawTags = [...prev.rawTags, ...n.rawTags];
  prev.confidence = undefined;
}

function foldAdjacentSame<
  T extends {
    bucket: Bucket;
    surface: string;
    end: number;
    start: number;
    rawTags: string[];
    confidence?: Confidence;
  },
>(items: T[], predicate: (item: T) => boolean, markInferredNoun = false): T[] {
  const out: T[] = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    if (
      prev && prev.bucket === it.bucket && prev.end === it.start &&
      predicate(it) && it.bucket !== 'PUNCT'
    ) {
      prev.surface += it.surface;
      prev.end = it.end;
      prev.rawTags = [...prev.rawTags, ...it.rawTags];
      if (markInferredNoun && prev.bucket === 'NOUN') prev.confidence = 'inferred';
      continue;
    }
    out.push({ ...it });
  }
  return out;
}
