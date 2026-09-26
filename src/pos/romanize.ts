/**
 * src/pos/romanize.ts
 * 국어의 로마자 표기법(문화체육관광부 고시) 전사 방식 로마자 변환.
 *
 * 자모를 그대로 대치하면 `감사합니다`가 `gamsahabnida`가 된다 — 학습자가
 * 화면을 보고 그대로 읽으면 틀린 발음을 배운다. 그래서 표기가 아니라
 * **소리**를 옮긴다. 고시가 표기에 반영하라고 정한 것만 반영한다:
 *
 *   반영함   연음 · 비음화 · 유음화 · 구개음화 · ㅎ 축약(격음화)/탈락
 *   반영 안 함  된소리되기 (학교 → hakgyo, hakkyo 아님)
 *
 * 순수 함수이며 hangul.ts 외에 의존성이 없다. 서버가 단일 출처이고
 * 화면은 결과만 받는다 — 같은 문장이 화면마다 다르게 표기되면 안 된다.
 */

import { decompose, isSyllable } from './hangul.ts';

// ── 자모 → 로마자 ─────────────────────────────────────────────

/** 초성 위치의 소리값 */
const ONSET_ROMAN: Record<string, string> = {
  'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt',
  'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's',
  'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch',
  'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h',
};

/** 종성 위치의 소리값. 중화 이후 7종성만 남는다 */
const CODA_ROMAN: Record<string, string> = {
  '': '', 'ㄱ': 'k', 'ㄴ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅇ': 'ng',
};

const VOWEL_ROMAN: Record<string, string> = {
  'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo',
  'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa',
  'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo',
  'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui', 'ㅣ': 'i',
};

// ── 음운 규칙 테이블 ──────────────────────────────────────────

/**
 * 겹받침 분해. [남는 종성, 뒤로 넘어갈 자음].
 * 뒤에 모음이 오면 둘째 자음이 다음 음절 초성으로 간다 (값이 → 갑시).
 */
const COMPLEX_CODA: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

/**
 * 겹받침이 그대로 발음될 때의 대표음. 둘 중 어느 쪽이 살아남는지는
 * 짝마다 다르다 — `닭`은 [닥]이고 `삶`은 [삼]이다. 규칙으로 유도되지 않으므로
 * 표로 둔다.
 */
const COMPLEX_CODA_REPRESENTATIVE: Record<string, string> = {
  'ㄳ': 'ㄱ', 'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ',
  'ㄺ': 'ㄱ', 'ㄻ': 'ㅁ', 'ㄼ': 'ㄹ',
  'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㄿ': 'ㅂ',
  'ㅀ': 'ㄹ', 'ㅄ': 'ㅂ',
};

/** 음절의 끝소리 규칙 — 종성으로 발음될 수 있는 소리는 7개뿐이다 */
const CODA_NEUTRALIZE: Record<string, string> = {
  'ㄲ': 'ㄱ', 'ㅋ': 'ㄱ',
  'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅎ': 'ㄷ',
  'ㅍ': 'ㅂ',
};

/** ㅎ과 만나 거센소리가 되는 짝 */
const ASPIRATED: Record<string, string> = {
  'ㄱ': 'ㅋ', 'ㄷ': 'ㅌ', 'ㅂ': 'ㅍ', 'ㅈ': 'ㅊ',
};

/** 비음 앞에서 막힘소리가 콧소리로 바뀐다 (합니다 → 함니다) */
const NASALIZE: Record<string, string> = {
  'ㄱ': 'ㅇ', 'ㄷ': 'ㄴ', 'ㅂ': 'ㅁ',
};

/** 구개음화를 일으키는 모음 — ㅣ 계열 */
const PALATAL_VOWELS = new Set(['ㅣ', 'ㅑ', 'ㅕ', 'ㅛ', 'ㅠ', 'ㅒ', 'ㅖ']);

interface Syl {
  cho: string;
  jung: string;
  jong: string;
}

// ── 규칙 적용 ─────────────────────────────────────────────────

/**
 * 한 어절(공백 없는 한글 덩어리) 안에서 음운 변동을 적용한다.
 * 어절 경계를 넘는 동화는 적용하지 않는다 — 띄어 쓴 두 단어는 각각 발음된다.
 */
function applyPhonology(sylls: Syl[]): Syl[] {
  const out = sylls.map(s => ({ ...s }));

  for (let i = 0; i < out.length - 1; i++) {
    const cur = out[i];
    const next = out[i + 1];
    const nextIsVowel = next.cho === 'ㅇ';

    // ① 겹받침 — 뒤에 모음이 오면 둘째 자음을 넘기고, 아니면 하나로 줄인다
    if (COMPLEX_CODA[cur.jong]) {
      const [keep, move] = COMPLEX_CODA[cur.jong];
      if (move === 'ㅎ') {
        // ㄶ·ㅀ의 ㅎ은 넘어가지 않는다. 뒤 예사소리를 거세게 만들거나(많다 → 만타)
        // 모음 앞에서 그냥 사라진다(많이 → 마니). 남은 ㄴ·ㄹ은 아래 연음이 옮긴다.
        cur.jong = keep;
        if (ASPIRATED[next.cho]) next.cho = ASPIRATED[next.cho];
      } else if (nextIsVowel) {
        // 뒤가 모음이면 둘째 자음이 다음 음절 첫소리로 (값이 → 갑시)
        cur.jong = keep;
        next.cho = move;
      } else {
        cur.jong = COMPLEX_CODA_REPRESENTATIVE[cur.jong] ?? keep;
      }
    }

    // ② ㅎ — 뒤 예사소리를 거세게 만들고 자신은 사라진다 (축하 → 추카)
    if (cur.jong === 'ㅎ') {
      if (ASPIRATED[next.cho]) {
        next.cho = ASPIRATED[next.cho];
        cur.jong = '';
      } else if (nextIsVowel) {
        cur.jong = ''; // 좋아요 → 조아요
      }
    }
    if (next.cho === 'ㅎ' && ASPIRATED[CODA_NEUTRALIZE[cur.jong] ?? cur.jong]) {
      // 입학 → 이팍, 꽂히다 → 꼬치다
      const base = CODA_NEUTRALIZE[cur.jong] ?? cur.jong;
      next.cho = ASPIRATED[base];
      cur.jong = '';
    }

    // ③ 구개음화 — ㄷ/ㅌ 받침이 ㅣ 계열 모음을 만나면 ㅈ/ㅊ이 된다 (같이 → 가치)
    if (nextIsVowel && PALATAL_VOWELS.has(next.jung)) {
      if (cur.jong === 'ㄷ') { cur.jong = ''; next.cho = 'ㅈ'; }
      else if (cur.jong === 'ㅌ') { cur.jong = ''; next.cho = 'ㅊ'; }
    }

    // ④ 연음 — 받침이 뒤 음절 첫소리로 넘어간다 (한국어 → 한구거)
    //    ㅇ 받침은 넘어가지 않는다 (강아지 → 강아지)
    if (cur.jong && cur.jong !== 'ㅇ' && next.cho === 'ㅇ') {
      next.cho = cur.jong;
      cur.jong = '';
    }

    // ⑤ 끝소리 규칙 — 남은 받침을 7종성으로 중화한다
    if (CODA_NEUTRALIZE[cur.jong]) {
      cur.jong = CODA_NEUTRALIZE[cur.jong];
    }

    // ⑥ 유음화 — ㄴ과 ㄹ이 만나면 둘 다 ㄹ이 된다 (신라 → 실라, 설날 → 설랄)
    if (cur.jong === 'ㄴ' && next.cho === 'ㄹ') { cur.jong = 'ㄹ'; }
    else if (cur.jong === 'ㄹ' && next.cho === 'ㄴ') { next.cho = 'ㄹ'; }

    // ⑦ ㄹ의 비음화 — ㄹ이 ㄹ·ㄴ 아닌 자음 뒤에서 ㄴ이 된다 (종로 → 종노, 백리 → 뱅니)
    if (next.cho === 'ㄹ' && cur.jong && cur.jong !== 'ㄹ') {
      next.cho = 'ㄴ';
    }

    // ⑧ 비음화 — 막힘소리가 콧소리 앞에서 콧소리가 된다 (합니다 → 함니다)
    if ((next.cho === 'ㄴ' || next.cho === 'ㅁ') && NASALIZE[cur.jong]) {
      cur.jong = NASALIZE[cur.jong];
    }
  }

  // 마지막 음절의 받침도 중화한다 — 뒤 음절이 없어 위 루프가 건드리지 않았다
  const last = out[out.length - 1];
  if (last) {
    if (COMPLEX_CODA[last.jong]) {
      last.jong = COMPLEX_CODA_REPRESENTATIVE[last.jong] ?? COMPLEX_CODA[last.jong][0];
    }
    if (CODA_NEUTRALIZE[last.jong]) last.jong = CODA_NEUTRALIZE[last.jong];
  }

  return out;
}

/** 규칙이 적용된 음절 배열을 로마자 문자열로 */
function spell(sylls: Syl[], hyphenate: boolean): string {
  const parts: string[] = [];

  for (let i = 0; i < sylls.length; i++) {
    const s = sylls[i];
    const prev = sylls[i - 1];

    // ㄹ 받침 + ㄹ 초성 → ll (설랄 → seollal). r이 두 번 나오면 안 된다.
    const onset = (prev?.jong === 'ㄹ' && s.cho === 'ㄹ') ? 'l' : (ONSET_ROMAN[s.cho] ?? '');
    const vowel = VOWEL_ROMAN[s.jung] ?? '';
    const coda = CODA_ROMAN[s.jong] ?? '';

    parts.push(onset + vowel + coda);
  }

  return hyphenate ? parts.join('-') : parts.join('');
}

export interface RomanizeOptions {
  /** 음절 사이에 하이픈을 넣는다. 초급 학습자용 읽기 보조 */
  hyphenate?: boolean;
}

/**
 * 한국어 문장을 소리 나는 대로 로마자로 옮긴다.
 * 한글이 아닌 문자(숫자·문장부호·라틴 문자)는 그대로 통과시킨다.
 */
export function romanize(text: string, opts: RomanizeOptions = {}): string {
  const source = String(text ?? '');
  if (!source) return '';

  const hyphenate = opts.hyphenate === true;
  let out = '';
  let run: Syl[] = [];

  const flush = () => {
    if (run.length === 0) return;
    out += spell(applyPhonology(run), hyphenate);
    run = [];
  };

  for (const ch of source) {
    if (isSyllable(ch)) {
      const j = decompose(ch);
      if (j) { run.push({ cho: j.cho, jung: j.jung, jong: j.jong }); continue; }
    }
    flush();
    out += ch;
  }
  flush();

  return out;
}

/**
 * 어절마다 첫 글자를 대문자로. 고유명사나 제목에 쓴다.
 * 학습용 본문에는 쓰지 않는다 — 문장 전체가 대문자로 시작하면 읽기 흐름이 끊긴다.
 */
export function romanizeCapitalized(text: string, opts: RomanizeOptions = {}): string {
  return romanize(text, opts)
    .split(/(\s+)/)
    .map(part => (/^\s+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}
