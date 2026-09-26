/**
 * src/pos/inflect.ts
 * 활용 생성 엔진. 어간 + 어미 → 표면형, 그리고 붙은 형태소의 스팬.
 *
 * 분석 전략은 생성-검증(analysis-by-synthesis)이다. 어미를 붙여 표면형을
 * 만들고 원문과 대조한다. 역방향 규칙을 쓰지 않기 때문에 불규칙 처리가
 * 한 곳에 모인다.
 *
 * SPEC §5: 종성 분리는 share='coda', 모음 융합·불규칙은 share='fused'.
 */

import {
  compose,
  decompose,
  hasCoda,
  isCodaJamo,
  lastCharOf,
  stripCoda,
  withCoda,
} from './hangul.ts';

export type Irregular = 'none' | 'reu' | 'p' | 'eu' | 'l' | 's' | 'd';

/** 이형태의 접합 방식 */
export type Link =
  | 'coda'   // 종성 자모로 시작 (ㄴ, ㅂ니다) — 앞 음절의 종성이 된다
  | 'cons'   // 자음으로 시작 (습니다, 세요, 겠) — 그대로 이어 붙는다
  | 'vowel'; // 모음으로 시작 (아, 어요, 였) — 융합이 일어날 수 있다

export type Harmony = 'bright' | 'dark' | 'hada' | 'any';

export interface Alt {
  text: string;
  link: Link;
  /** 모음조화 제약 — link='vowel'에만 유효 */
  harmony?: Harmony;
  /** 어간말 종성 유무 제약 */
  requires?: 'coda' | 'open';
}

export interface AttachResult {
  /** 접합 후의 누적 표면형 */
  surface: string;
  /** 붙은 형태소의 스팬 (누적 표면형 기준) */
  start: number;
  end: number;
  share?: 'coda' | 'fused';
  alt: Alt;
}

// ─────────────────────────────────────────────────────────────
// 모음 융합표
// ─────────────────────────────────────────────────────────────

const MERGE: Readonly<Record<string, string>> = Object.freeze({
  'ㅗ+ㅏ': 'ㅘ', // 보 + 아 → 봐
  'ㅜ+ㅓ': 'ㅝ', // 바꾸 + 어 → 바꿔
  'ㅣ+ㅓ': 'ㅕ', // 보이 + 어 → 보여, 시 + 었 → 셨
  'ㅣ+ㅏ': 'ㅑ',
  'ㅚ+ㅓ': 'ㅙ', // 되 + 어 → 돼
  'ㅏ+ㅏ': 'ㅏ', // 가 + 아 → 가
  'ㅓ+ㅓ': 'ㅓ', // 서 + 어 → 서
  'ㅐ+ㅓ': 'ㅐ', // 내 + 어 → 내
  'ㅔ+ㅓ': 'ㅔ', // 세 + 어 → 세
  'ㅕ+ㅓ': 'ㅕ',
  'ㅏ+ㅕ': 'ㅐ', // 하 + 여 → 해   (하 + 였 → 했)
  'ㅘ+ㅏ': 'ㅘ',
  'ㅝ+ㅓ': 'ㅝ',
});

/**
 * 모음조화 판정 기준 음절의 중성.
 * `ㅡ`/`르`로 끝나는 어간은 그 앞 음절을 본다 — 모르+아→몰라, 아프+아→아파.
 */
function harmonyJung(acc: string, irr: Irregular): string | null {
  const last = decompose(lastCharOf(acc));
  if (!last) return null;
  const neutral = last.jung === 'ㅡ' && !last.jong && (irr === 'reu' || irr === 'eu');
  if (neutral && acc.length >= 2) {
    return decompose(acc[acc.length - 2])?.jung ?? last.jung;
  }
  return last.jung;
}

export function harmonyOf(acc: string, irr: Irregular = 'none'): Harmony {
  if (lastCharOf(acc) === '하') return 'hada';
  const jung = harmonyJung(acc, irr);
  if (!jung) return 'dark';
  return jung === 'ㅏ' || jung === 'ㅗ' || jung === 'ㅑ' || jung === 'ㅘ' ? 'bright' : 'dark';
}

// ─────────────────────────────────────────────────────────────
// 접합
// ─────────────────────────────────────────────────────────────

/**
 * `acc`에 이형태 `alt`를 붙인다. 제약을 어기면 null.
 * 호출자는 null이 아닐 때 직전 형태소의 end를 `share`가 있으면
 * `start + 1`로 늘려야 한다 (융합 음절은 양쪽이 공유한다).
 */
export function attachAlt(acc: string, alt: Alt, irr: Irregular = 'none'): AttachResult | null {
  if (!acc) return null;
  const last = lastCharOf(acc);
  const lj = decompose(last);
  if (!lj) return null;

  // ── link='coda' — 종성 자모 접합 (S1a)
  if (alt.link === 'coda') {
    if (!isCodaJamo(alt.text[0])) return null;
    let base = last;
    if (lj.jong === 'ㄹ' && irr === 'l') base = stripCoda(last); // ㄹ 탈락
    else if (lj.jong !== '') return null;                        // 종성이 있으면 이 이형태 불가

    const merged = withCoda(base, alt.text[0]);
    if (!merged) return null;
    const rest = alt.text.slice(1);
    const start = acc.length - 1;
    return {
      surface: acc.slice(0, -1) + merged + rest,
      start,
      end: start + 1 + rest.length,
      share: 'coda',
      alt,
    };
  }

  // ── link='cons' — 단순 연결
  if (alt.link === 'cons') {
    if (alt.requires === 'coda' && (!lj.jong || irr === 'l')) return null;
    if (alt.requires === 'open' && lj.jong) return null;
    return {
      surface: acc + alt.text,
      start: acc.length,
      end: acc.length + alt.text.length,
      alt,
    };
  }

  // ── link='vowel' — 모음 어미. 융합·불규칙이 여기서 갈린다
  const ej = decompose(alt.text[0]);
  if (!ej || ej.cho !== 'ㅇ') return null;
  if (alt.harmony && alt.harmony !== 'any' && harmonyOf(acc, irr) !== alt.harmony) return null;

  const rest = alt.text.slice(1);
  const fused = (head: string, syl: string, start: number): AttachResult => ({
    surface: head + syl + rest,
    start,
    end: start + 1 + rest.length,
    share: 'fused',
    alt,
  });

  // 르 불규칙 — 모르 + 아 → 몰라 (앞 음절에 ㄹ 종성, 새 음절은 ㄹ 초성)
  if (irr === 'reu' && lj.cho === 'ㄹ' && lj.jung === 'ㅡ' && !lj.jong && acc.length >= 2) {
    const prev = withCoda(acc[acc.length - 2], 'ㄹ');
    const syl = compose('ㄹ', ej.jung, ej.jong);
    if (!prev || !syl) return null;
    return fused(acc.slice(0, -2) + prev, syl, acc.length - 1);
  }

  // ㅡ 탈락 — 예쁘 + 어 → 예뻐
  if (lj.jung === 'ㅡ' && !lj.jong && irr !== 'reu') {
    const syl = compose(lj.cho, ej.jung, ej.jong);
    if (!syl) return null;
    return fused(acc.slice(0, -1), syl, acc.length - 1);
  }

  // ㅂ 불규칙 — 돕 + 아 → 도와 / 춥 + 어 → 추워
  if (irr === 'p' && lj.jong === 'ㅂ') {
    const merged = MERGE[`ㅜ+${ej.jung}`] ?? (ej.jung === 'ㅏ' ? 'ㅘ' : 'ㅝ');
    const syl = compose('ㅇ', merged, ej.jong);
    if (!syl) return null;
    // ㅂ이 우로 바뀌며 음절이 하나 늘어난다. 늘어난 음절이 어미와 융합한다.
    return fused(acc.slice(0, -1) + stripCoda(last), syl, acc.length);
  }

  // ㅅ 불규칙 — 낫 + 아 → 나아 (융합 없음, 음절 추가)
  if (irr === 's' && lj.jong === 'ㅅ') {
    return {
      surface: acc.slice(0, -1) + stripCoda(last) + alt.text,
      start: acc.length,
      end: acc.length + alt.text.length,
      alt,
    };
  }

  // ㄷ 불규칙 — 듣 + 어 → 들어
  if (irr === 'd' && lj.jong === 'ㄷ') {
    const changed = compose(lj.cho, lj.jung, 'ㄹ');
    if (!changed) return null;
    return {
      surface: acc.slice(0, -1) + changed + alt.text,
      start: acc.length,
      end: acc.length + alt.text.length,
      alt,
    };
  }

  // 열린 음절 — 융합표 적용
  if (!lj.jong) {
    const merged = MERGE[`${lj.jung}+${ej.jung}`];
    if (merged) {
      const syl = compose(lj.cho, merged, ej.jong);
      if (!syl) return null;
      return fused(acc.slice(0, -1), syl, acc.length - 1);
    }
  }

  // 융합 없음 — 음절 추가 (좁 + 아요 → 좁아요)
  return {
    surface: acc + alt.text,
    start: acc.length,
    end: acc.length + alt.text.length,
    alt,
  };
}

/** 이형태 목록에서 붙을 수 있는 것을 모두 시도한다 */
export function attachAny(acc: string, alts: readonly Alt[], irr: Irregular = 'none'): AttachResult[] {
  const out: AttachResult[] = [];
  for (const alt of alts) {
    const r = attachAlt(acc, alt, irr);
    if (r) out.push(r);
  }
  return out;
}

/** 리터럴 접합 — 조사·보조용언·접미사처럼 변형 없이 이어 붙는 형태소 */
export function attachLiteral(
  acc: string,
  text: string,
  requires?: 'coda' | 'open',
): AttachResult | null {
  if (requires) {
    const last = lastCharOf(acc);
    if (!decompose(last)) return null;
    if (requires === 'coda' && !hasCoda(last)) return null;
    if (requires === 'open' && hasCoda(last)) return null;
  }
  return {
    surface: acc + text,
    start: acc.length,
    end: acc.length + text.length,
    alt: { text, link: 'cons' },
  };
}
