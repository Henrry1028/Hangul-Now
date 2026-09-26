/**
 * src/pos/hangul.ts
 * 한글 음절 분해/조합. 순수 함수, 의존성 0.
 *
 * S1a(종성 분리) / S1b(모음 융합) 판정의 기반이다.
 */

export const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

export const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const;

export const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const BASE = 0xac00;
const LAST = 0xd7a3;

export interface Jamo {
  cho: string;
  jung: string;
  jong: string;
}

export function isSyllable(ch: string): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return c >= BASE && c <= LAST;
}

/** 한글 음절 → 자모. 음절이 아니면 null */
export function decompose(ch: string): Jamo | null {
  if (!isSyllable(ch)) return null;
  const n = ch.charCodeAt(0) - BASE;
  return {
    cho: CHO[Math.floor(n / 588)],
    jung: JUNG[Math.floor((n % 588) / 28)],
    jong: JONG[n % 28],
  };
}

/** 자모 → 음절. 조합 불가면 null */
export function compose(cho: string, jung: string, jong = ''): string | null {
  const ci = CHO.indexOf(cho as (typeof CHO)[number]);
  const vi = JUNG.indexOf(jung as (typeof JUNG)[number]);
  const ti = JONG.indexOf(jong as (typeof JONG)[number]);
  if (ci < 0 || vi < 0 || ti < 0) return null;
  return String.fromCharCode(BASE + ci * 588 + vi * 28 + ti);
}

export function hasCoda(ch: string): boolean {
  const j = decompose(ch);
  return !!j && j.jong !== '';
}

/** 종성 자모만. 종성이 없으면 '' */
export function codaOf(ch: string): string {
  return decompose(ch)?.jong ?? '';
}

/** 종성을 떼어낸 음절. `한` → `하`, `입` → `이` */
export function stripCoda(ch: string): string {
  const j = decompose(ch);
  if (!j || !j.jong) return ch;
  return compose(j.cho, j.jung) ?? ch;
}

/** 종성을 붙인 음절. `하` + `ㄴ` → `한` */
export function withCoda(ch: string, jong: string): string | null {
  const j = decompose(ch);
  if (!j || j.jong) return null; // 이미 종성이 있으면 붙일 수 없다
  return compose(j.cho, j.jung, jong);
}

/** 종성 자모 하나로 쓸 수 있는가 (S1a 판정) */
export function isCodaJamo(ch: string): boolean {
  return JONG.indexOf(ch as (typeof JONG)[number]) > 0;
}

export const lastCharOf = (s: string) => s.slice(-1);

/** 어미 이형태 선택용. 종성이 없거나 `ㄹ`이면 매개모음 `으`가 불필요 */
export function takesBareEnding(stemSurface: string): boolean {
  const j = decompose(lastCharOf(stemSurface));
  if (!j) return false;
  return j.jong === '' || j.jong === 'ㄹ';
}

/** 양성모음(ㅏ/ㅗ) 어간인가 — `아/어` 교체 판정 */
export function isBrightVowel(stemSurface: string): boolean {
  const j = decompose(lastCharOf(stemSurface));
  if (!j) return false;
  return j.jung === 'ㅏ' || j.jung === 'ㅗ' || j.jung === 'ㅑ' || j.jung === 'ㅘ';
}
