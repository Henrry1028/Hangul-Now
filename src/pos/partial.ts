/**
 * src/pos/partial.ts
 * 부분 분석 — 미등재 어절에서 조사·어미만이라도 건져낸다.
 *
 * 분석기가 어절 분석에 실패하면 어절 전체가 UNK 한 덩어리가 된다. 그러면
 * `화장품이나`는 정상 등재된 조사 `이나`까지 함께 사라진다. 앞부분 하나를
 * 몰랐다는 이유로 아는 것까지 버리는 셈이다.
 *
 * 조사·어미는 폐쇄 집합(closed class)이라 어휘가 아무리 늘어도 목록이 늘지
 * 않는다. 그래서 어절 끝에서부터 최장일치로 떼어내면 사전이 작아도 정확도가
 * 높다.
 *
 * **분석기와 독립이다.** Morph[] 위에서만 동작하므로 Kiwi로 교체해도 그대로
 * 살아남아, Kiwi도 모르는 단어(신조어·브랜드명·오타)에 동일하게 동작한다.
 *
 * INV-2: 남은 앞부분을 명사로 추정하지 않는다. UNKNOWN 그대로 둔다.
 * INV-5: 순수 함수.
 */

import { ENDINGS, PARTICLES } from './lexicon.ts';
import type { Morph } from './normalize.ts';

/** 분석 실패 형태소의 태그 */
export const UNKNOWN_TAG = 'UNK';

/**
 * 떼어낸 뒤 남는 앞부분의 최소 길이.
 *
 * 1로 두면 `사과`가 `[사][과/조사]`로, `포도`가 `[포][도/조사]`로 깨진다.
 * 조사와 충돌하는 음절(과·도·만·와·로)로 끝나는 2음절 명사가 흔하기 때문이다.
 * 2로 잡으면 그 계열이 통째로 걸러진다.
 */
const MIN_HEAD = 2;

/** 한 어절에서 떼어낼 수 있는 최대 꼬리 개수 (조사 연쇄 등) */
const MAX_PEEL = 3;

interface SuffixEntry {
  tag: string;
  /** 어미로도 조사로도 읽히는 형태 */
  ambiguous: boolean;
}

/**
 * 꼬리 후보 표. 조사와 어미를 합쳐 만들고, 겹치는 형태는 **어미로 확정한다.**
 *
 * 조사는 품사(색을 받음)이고 어미는 품사가 아니다(무채색). 잘못 조사로 찍으면
 * 어미에 품사 색이 칠해져 INV-1을 깬다. 반대 방향의 실수는 색을 덜 칠할 뿐이다.
 * 그래서 애매하면 어미 쪽으로 눕힌다.
 */
function buildSuffixTable(): Map<string, SuffixEntry> {
  const particles = new Map<string, string>();
  for (const p of PARTICLES) {
    if (!particles.has(p.text)) particles.set(p.text, p.tag);
  }
  // 서술격 조사 — `…이요`, `…이라` 처럼 미등재 체언 뒤에 자주 붙는다
  particles.set('이', particles.get('이') ?? 'JKS');

  // 레거시 사전에 없는 흔한 조사. 어휘가 아니라 문법이므로 폐쇄 집합에 속한다.
  for (const [text, tag] of [
    ['이나', 'JX'], ['나', 'JX'], ['이라도', 'JX'], ['마저', 'JX'], ['대로', 'JX'],
    ['만큼', 'JKB'], ['이랑', 'JC'], ['이며', 'JC'], ['이든', 'JX'], ['든지', 'JX'],
    ['에게서', 'JKB'], ['한테서', 'JKB'], ['으로부터', 'JKB'], ['로부터', 'JKB'],
    ['라고', 'JKQ'], ['이라고', 'JKQ'], ['에다', 'JKB'], ['에다가', 'JKB'],
  ] as const) {
    if (!particles.has(text)) particles.set(text, tag);
  }

  const endings = new Map<string, string>();
  for (const e of ENDINGS) {
    for (const alt of e.alts) {
      // 자모 시작 이형태(ㅂ니다, ㄴ)는 음절 경계에서 떨어지지 않는다
      if (alt.link === 'coda') continue;
      if (!endings.has(alt.text)) endings.set(alt.text, e.tag);
    }
  }

  // 홑 `요`는 보조사이기도 하고 해요체 종결어미의 잔여이기도 하다.
  // 모르는 어간 뒤에 붙은 `요`는 후자일 때가 압도적이다 — `좋아해요`, `거예요`.
  // 조사로 찍으면 어미에 품사 색이 칠해져 INV-1을 깬다. 어미로 눕힌다.
  endings.set('요', 'EF');

  const table = new Map<string, SuffixEntry>();
  for (const [text, tag] of particles) table.set(text, { tag, ambiguous: false });
  for (const [text, tag] of endings) {
    const clash = table.has(text);
    table.set(text, { tag, ambiguous: clash }); // 겹치면 어미가 이긴다
  }
  return table;
}

const SUFFIXES = buildSuffixTable();
const MAX_SUFFIX_LEN = Math.max(...[...SUFFIXES.keys()].map((s) => s.length));

/** 어절 끝에서 최장일치로 조사·어미를 떼어낸다 */
function peel(surface: string): { head: string; tail: { text: string; tag: string }[] } {
  const tail: { text: string; tag: string }[] = [];
  let end = surface.length;

  for (let i = 0; i < MAX_PEEL; i++) {
    let matched: { text: string; tag: string } | null = null;

    for (let len = Math.min(MAX_SUFFIX_LEN, end - MIN_HEAD); len >= 1; len--) {
      const candidate = surface.slice(end - len, end);
      const entry = SUFFIXES.get(candidate);
      if (entry) {
        matched = { text: candidate, tag: entry.tag };
        break;
      }
    }

    if (!matched) break;
    tail.unshift(matched);
    end -= matched.text.length;
  }

  return { head: surface.slice(0, end), tail };
}

/**
 * UNK 형태소를 [UNKNOWN 앞부분] + [조사·어미 꼬리]로 쪼갠다.
 * 분석에 성공한 형태소는 건드리지 않는다.
 */
export function recoverPartial(morphs: Morph[]): Morph[] {
  const out: Morph[] = [];

  for (const morph of morphs) {
    if (morph.tag !== UNKNOWN_TAG || morph.surface.length <= MIN_HEAD) {
      out.push(morph);
      continue;
    }

    const { head, tail } = peel(morph.surface);
    if (tail.length === 0) {
      out.push(morph);
      continue;
    }

    // INV-2: 앞부분은 여전히 모르는 것이다. 명사로 추정하지 않는다.
    out.push({ ...morph, surface: head, lemma: head, end: morph.start + head.length });

    let cursor = morph.start + head.length;
    for (const t of tail) {
      out.push({
        surface: t.text,
        lemma: t.text,
        tag: t.tag,
        start: cursor,
        end: cursor + t.text.length,
      });
      cursor += t.text.length;
    }
  }

  return out;
}
