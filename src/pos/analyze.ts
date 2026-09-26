/**
 * src/pos/analyze.ts
 * 규칙 기반 형태소 분석기. 외부 분석기 의존 없음.
 *
 * 전략: 생성-검증(analysis-by-synthesis). 사전 항목에 어미를 붙여 표면형을
 * 만들고 원문과 접두 대조하며 탐색한다. 완성된 분석 중 형태소 수가 가장
 * 적은 것을 택한다.
 *
 * 순수 함수 (INV-5). 분석 실패는 UNK 태그이며 명사로 폴백하지 않는다 (INV-2).
 */

import { decompose, stripCoda } from './hangul.ts';
import { attachAny, attachLiteral, type AttachResult, type Irregular } from './inflect.ts';
import {
  COPULA,
  DERIV_SUFFIX,
  ENDINGS_BY_SLOT,
  NOMINALS,
  PARTICLES,
  PREDICATES,
  XSN,
  type NominalEntry,
  type Slot,
} from './lexicon.ts';
import type { Morph } from './normalize.ts';

export interface AnalyzeOptions {
  /** 고유명사 등 사전 미등재 어휘의 런타임 주입 (SPEC §8) */
  userDict?: Iterable<string>;
}

interface Draft {
  surface: string;
  lemma: string;
  tag: string;
  start: number; // 어절 내 상대 인덱스
  end: number;
  share?: 'coda' | 'fused';
}

interface Frame {
  acc: string;
  drafts: Draft[];
  cost: number;
}

const MAX_PARTICLES = 3;
const MAX_PREFINAL = 3;
const FINAL_SLOTS: readonly Slot[] = ['EF', 'EC', 'ETM', 'ETN'];

const PUNCT_TAG: Readonly<Record<string, string>> = Object.freeze({
  '.': 'SF', '?': 'SF', '!': 'SF',
  ',': 'SP', ':': 'SP', ';': 'SP', '/': 'SP', '·': 'SP',
  '…': 'SE',
  '"': 'SS', "'": 'SS', '“': 'SS', '”': 'SS', '‘': 'SS', '’': 'SS',
  '(': 'SSO', '[': 'SSO', '{': 'SSO', '<': 'SSO', '《': 'SSO',
  ')': 'SSC', ']': 'SSC', '}': 'SSC', '>': 'SSC', '》': 'SSC',
  '~': 'SO', '-': 'SO', '—': 'SO',
});

const isPunctChar = (ch: string) => ch in PUNCT_TAG;

// ─────────────────────────────────────────────────────────────
// 진입점
// ─────────────────────────────────────────────────────────────

export function analyze(text: string, opts: AnalyzeOptions = {}): Morph[] {
  const dict = buildUserDict(opts.userDict);
  const out: Morph[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    analyzeEojeol(out, m[0], m.index, dict);
  }
  return out;
}

function buildUserDict(words?: Iterable<string>): NominalEntry[] {
  if (!words) return [];
  return [...words]
    .filter((w) => w.length > 0)
    .map((w) => ({ text: w, tag: 'NNP' }))
    .sort((a, b) => b.text.length - a.text.length);
}

function analyzeEojeol(out: Morph[], word: string, base: number, dict: NominalEntry[]): void {
  // 어절 양끝의 부호를 떼어낸다 (S2 이후 단계)
  let s = 0;
  let e = word.length;
  while (s < e && isPunctChar(word[s])) s++;
  while (e > s && isPunctChar(word[e - 1])) e--;

  for (let i = 0; i < s; i++) out.push(punctMorph(word[i], base + i));

  const core = word.slice(s, e);
  if (core) {
    const drafts = analyzeCore(core, dict);
    if (drafts) {
      for (const d of drafts) {
        out.push({
          surface: d.surface,
          lemma: d.lemma,
          tag: d.tag,
          start: base + s + d.start,
          end: base + s + d.end,
          ...(d.share ? { share: d.share } : {}),
        });
      }
    } else {
      // INV-2: 명사로 폴백하지 않는다
      out.push({ surface: core, lemma: core, tag: 'UNK', start: base + s, end: base + s + core.length });
    }
  }

  for (let i = e; i < word.length; i++) out.push(punctMorph(word[i], base + i));
}

function punctMorph(ch: string, at: number): Morph {
  return { surface: ch, lemma: ch, tag: PUNCT_TAG[ch] ?? 'SW', start: at, end: at + 1 };
}

// ─────────────────────────────────────────────────────────────
// 어절 내부 탐색
// ─────────────────────────────────────────────────────────────

function analyzeCore(core: string, dict: NominalEntry[]): Draft[] | null {
  const results: Frame[] = [];
  const fits = (s: string) => prefixCompatible(core, s);

  const accept = (f: Frame) => {
    if (f.acc === core) results.push(f);
  };

  /**
   * 프레임 확장. `share`가 있으면 직전 형태소가 융합 음절을 공유하므로
   * 그 스팬과 표면형을 다시 계산한다 (SPEC §5).
   */
  function extend(
    frame: Frame,
    r: AttachResult | null,
    tag: string,
    lemma: string,
    costInc = 1,
    check = true,
  ): Frame | null {
    if (!r) return null;
    if (check && !fits(r.surface)) return null;

    const drafts = frame.drafts.slice();
    if (r.share && drafts.length > 0) {
      const prev = { ...drafts[drafts.length - 1] };
      prev.end = Math.max(prev.end, r.start + 1);
      // 종성 분리(S1a)는 앞 형태소의 표기가 그대로다. 모음 융합(S1b)은 바뀐다.
      if (r.share === 'fused') prev.surface = r.surface.slice(prev.start, prev.end);
      drafts[drafts.length - 1] = prev;
    }

    drafts.push({
      surface: r.share === 'coda' ? r.alt.text : r.surface.slice(r.start, r.end),
      lemma,
      tag,
      start: r.start,
      end: r.end,
      share: r.share,
    });
    return { acc: r.surface, drafts, cost: frame.cost + costInc };
  }

  // ── 조사 연쇄
  function particleTail(frame: Frame, count: number, jxOnly = false): void {
    if (count >= MAX_PARTICLES) return;
    for (const p of PARTICLES) {
      if (jxOnly && p.tag !== 'JX') continue;
      const f = extend(frame, attachLiteral(frame.acc, p.text, p.requires), p.tag, p.text);
      if (!f) continue;
      accept(f);
      particleTail(f, count + 1, jxOnly);
      copulaTail(f); // …까지입니다 / …에서입니다 — 조사 뒤에도 서술격 조사가 온다
    }
  }

  // ── 어말어미 이후
  function endingTail(frame: Frame, slot: Slot): void {
    accept(frame);
    if (slot === 'EC') vxTail(frame);       // 보조용언 (M4 대상)
    if (slot === 'ETN') particleTail(frame, 0); // 명사형 전성어미 + 조사
  }

  // ── 어미 부착. irr는 '다음 접합'에 적용될 불규칙 유형
  function predEndings(frame: Frame, irr: Irregular, epCount: number): void {
    if (epCount < MAX_PREFINAL) {
      for (const e of ENDINGS_BY_SLOT.EP) {
        for (const r of attachAny(frame.acc, e.alts, irr)) {
          const f = extend(frame, r, e.tag, e.lemma);
          if (f) predEndings(f, 'none', epCount + 1);
        }
      }
    }
    for (const slot of FINAL_SLOTS) {
      for (const e of ENDINGS_BY_SLOT[slot]) {
        for (const r of attachAny(frame.acc, e.alts, irr)) {
          const f = extend(frame, r, e.tag, e.lemma);
          if (f) endingTail(f, slot);
        }
      }
    }
  }

  // ── 보조용언
  function vxTail(frame: Frame): void {
    for (let i = 0; i < PREDICATES.length; i++) {
      const p = PREDICATES[i];
      if (p.tag !== 'VX') continue;
      const f = extend(frame, attachLiteral(frame.acc, p.stem), 'VX', p.lemma, 1 + i * 1e-6);
      if (f) predEndings(f, p.irr ?? 'none', 0);
    }
  }

  // ── 명사·어근 → 하/되 파생 (M1 대상)
  function derive(frame: Frame, entry: NominalEntry): void {
    if (!entry.deriv) return;
    for (const d of DERIV_SUFFIX[entry.deriv]) {
      const f = extend(frame, attachLiteral(frame.acc, d.stem), d.tag, d.lemma);
      if (f) predEndings(f, d.irr ?? 'none', 0);
    }
  }

  // ── 체언 이후
  function nomTail(frame: Frame, entry: NominalEntry): void {
    accept(frame);

    if (entry.tag === 'NNG' || entry.tag === 'NNP') {
      for (const suf of XSN) {
        const f = extend(frame, attachLiteral(frame.acc, suf), 'XSN', suf);
        if (f) nomTail(f, { text: suf, tag: 'NNG' });
      }
    }
    if (entry.tag === 'SN') {
      for (const n of NOMINALS) {
        if (n.tag !== 'NNBC') continue;
        const f = extend(frame, attachLiteral(frame.acc, n.text), n.tag, n.text);
        if (f) nomTail(f, n);
      }
    }
    derive(frame, entry);
    particleTail(frame, 0);
    copulaTail(frame);
  }

  // ── 서술격 조사 (이다)
  function copulaTail(frame: Frame): void {
    const f = extend(frame, attachLiteral(frame.acc, COPULA.text), COPULA.tag, '이다');
    if (!f) return;
    predEndings(f, 'none', 0);
    // …이요 — 서술격 조사 + 보조사. 용언 어미 뒤의 `요`와 구별된다 (SPEC §5 요 처리)
    const g = extend(f, attachLiteral(f.acc, '요'), 'JX', '요');
    if (g) accept(g);
  }

  // ── 시작 상태
  const numeric = /^[0-9]+(?:[.,][0-9]+)*/.exec(core);
  if (numeric) {
    const entry: NominalEntry = { text: numeric[0], tag: 'SN' };
    const f = extend({ acc: '', drafts: [], cost: 0 }, attachLiteral('', numeric[0]), 'SN', numeric[0]);
    if (f) nomTail(f, entry);
  }

  const latin = /^[A-Za-z][A-Za-z0-9-]*/.exec(core);
  if (latin) {
    const entry: NominalEntry = { text: latin[0], tag: 'SL' };
    const f = extend({ acc: '', drafts: [], cost: 0 }, attachLiteral('', latin[0]), 'SL', latin[0]);
    if (f) nomTail(f, entry);
  }

  const nominals = dict.length > 0 ? [...dict, ...NOMINALS] : NOMINALS;
  for (let i = 0; i < nominals.length; i++) {
    const entry = nominals[i];
    if (!core.startsWith(entry.text)) continue;
    const seed: Frame = { acc: '', drafts: [], cost: 0 };
    const f = extend(seed, attachLiteral('', entry.text), entry.tag, entry.text, 1 + i * 1e-6);
    if (!f) continue;

    switch (entry.tag) {
      case 'MM':
        accept(f); // 관형사는 조사를 취하지 않는다
        break;
      case 'MAG':
      case 'MAJ':
        accept(f);
        particleTail(f, 0, true); // 잠시만요 류의 보조사만 허용
        break;
      case 'IC':
        accept(f);
        break;
      case 'XR':
        derive(f, entry); // 어근 단독은 품사가 아니다 (INV-2)
        break;
      default:
        nomTail(f, entry);
    }
  }

  for (let i = 0; i < PREDICATES.length; i++) {
    const p = PREDICATES[i];
    if (!stemPlausible(core, p.stem)) continue;
    // 어간은 어미가 붙기 전까지 표면형이 확정되지 않으므로 접두 대조를 미룬다
    const f = extend({ acc: '', drafts: [], cost: 0 }, attachLiteral('', p.stem), p.tag, p.lemma, 1 + i * 1e-6, false);
    if (f) predEndings(f, p.irr ?? 'none', 0);
  }

  if (results.length === 0) return null;
  results.sort((a, b) => a.cost - b.cost || a.drafts.length - b.drafts.length);
  return results[0].drafts;
}

/**
 * 접두 호환 판정. 단순 `startsWith`로는 안 된다 — 뒤에 붙는 형태소가
 * 누적 표면형의 **마지막 음절을 바꾸기** 때문이다.
 *
 *   예약 + 하 → "예약하"  이후 ㄴ/ETM이 붙어 "예약한"     (종성 첨가, S1a)
 *   확인되 + 시 → "확인되시" 이후 었/EP이 붙어 "확인되셨"  (모음 융합, S1b)
 *
 * 따라서 마지막 음절은 초성만 대조하고, 그 앞은 르 불규칙의 ㄹ 첨가만 허용한다.
 * 최종 수락은 `acc === core` 완전 일치로 판정하므로 이 완화는 안전하다.
 */
function prefixCompatible(core: string, acc: string): boolean {
  if (acc.length === 0) return true;
  if (acc.length > core.length) return false;

  const k = acc.length - 1;
  for (let i = 0; i < k; i++) {
    if (acc[i] === core[i]) continue;
    if (i === k - 1 && stripCoda(core[i] ?? '') === acc[i]) continue; // 모르 → 몰라
    return false;
  }
  if (acc[k] === core[k]) return true;
  const a = decompose(acc[k]);
  const b = decompose(core[k]);
  return !!a && !!b && a.cho === b.cho;
}

/**
 * 어간 후보 사전 필터. 활용으로 마지막 음절의 중성·종성은 바뀔 수 있으나
 * 초성은 유지된다. 앞 음절은 르 불규칙의 ㄹ 첨가만 허용한다.
 */
function stemPlausible(core: string, stem: string): boolean {
  if (core.length < stem.length - 1) return false;
  for (let i = 0; i < stem.length - 1; i++) {
    if (core[i] === stem[i]) continue;
    if (stripCoda(core[i] ?? '') === stem[i]) continue; // 모르 → 몰라
    return false;
  }
  const k = stem.length - 1;
  const a = decompose(stem[k]);
  const b = decompose(core[k] ?? '');
  if (!a || !b) return false;
  return a.cho === b.cho;
}
