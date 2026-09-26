/**
 * src/pos/kiwi-adapter.ts
 * Kiwi(WASM) → Morph[] 어댑터.
 *
 * 배포 형태는 **서버 사이드 WASM**이다. 모델이 84MB라 브라우저로 내려보낼 수
 * 없고, 서버는 Node이므로 Python(kiwipiepy) 사이드카 대신 같은 Kiwi의 공식
 * WASM 빌드를 Node 안에서 돌린다. 클라이언트는 이미 있는 /api/pos 왕복을 쓴다.
 *
 * `Kiwi.tokenize`는 동기 함수다. 그래서 초기화만 비동기이고 분석은 동기로
 * 유지된다 — tagSentence의 동기 시그니처를 깨지 않는다.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { AnalyzeOptions } from './analyze.ts';
import type { Morph } from './normalize.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** fetch-kiwi-model.mjs 가 푸는 위치. KIWI_MODEL_PATH 로 덮어쓸 수 있다 */
export function resolveModelDir(): string | null {
  const explicit = process.env.KIWI_MODEL_PATH;
  if (explicit) return existsSync(explicit) ? explicit : null;

  // 모델 tgz 는 models/<타입>/<크기>/ 구조로 풀린다
  const base = join(ROOT, '.kiwi-model', 'models');
  if (!existsSync(base)) return null;
  for (const type of readdirSync(base)) {
    const dir = join(base, type);
    for (const size of readdirSync(dir)) {
      const candidate = join(dir, size);
      if (existsSync(join(candidate, 'sj.morph'))) return candidate;
    }
  }
  return null;
}

interface TokenInfo {
  str: string;
  position: number;
  length: number;
  tag: string;
  morphId: number;
}

/** 분석 실패 형태소에 붙이는 태그. TAG_MAP에 없으므로 UNKNOWN이 된다 */
const UNKNOWN_TAG = 'UNK';

/**
 * Kiwi는 모르는 문자열을 명사로 **추측한다**. `즈큵랟`도 `뿌링클`도 명사가 된다.
 * 그대로 두면 INV-2(명사 폴백 금지)가 깨진다.
 *
 * 미등재 형태소는 품사별 공용 OOV 항목을 가리키므로 `morphId`가 낮은 센티넬로
 * 고정된다(실측: NNG는 2, NNP는 3). 문서는 -1이라고 하지만 실제 빌드는 다르고,
 * 품사마다 값이 달라 상수로 박을 수 없다.
 *
 * 그래서 **서로 다른 무의미 문자열이 공유하는 id만 센티넬**이라는 성질로 찾는다.
 * 실재하는 형태소라면 서로 다른 헛소리 두 개가 같은 id를 가리킬 수 없다.
 * 문맥을 바꿔가며 뽑아 품사별 센티넬을 모두 수집한다.
 */
function detectOovMorphIds(kiwi: KiwiInstance): Set<number> {
  const NONSENSE = ['즈큵랟쒥', '뷁쯅믟', '흫뷁쓺'];
  const CONTEXTS = ['%s', '%s에서 샀어요.', '%s이나 주세요.', '%s가 좋아요.'];

  const byId = new Map<number, Set<string>>();
  for (const word of NONSENSE) {
    for (const context of CONTEXTS) {
      let tokens: TokenInfo[];
      try {
        tokens = kiwi.tokenize(context.replace('%s', word), MATCH_OPTIONS, []);
      } catch {
        continue;
      }
      for (const token of tokens) {
        if (token.str !== word) continue;
        let words = byId.get(token.morphId);
        if (!words) byId.set(token.morphId, (words = new Set()));
        words.add(word);
      }
    }
  }

  return new Set([...byId].filter(([, words]) => words.size >= 2).map(([id]) => id));
}

interface KiwiInstance {
  tokenize(text: string, matchOptions: number, blockList: unknown[]): TokenInfo[];
}

/**
 * `allWithNormalizing` — Kiwi 기본 매칭.
 * `compatibleJamo` — 자모 어미를 결합형(ᆫ, U+11AB)이 아니라 호환형(ㄴ, U+3134)으로
 *   내보낸다. hangul.ts의 자모 표가 호환형 기준이라 맞춰 둔다.
 *
 * 두 값은 kiwi-nlp의 Match enum 상수다. enum을 import 하면 런타임 의존이 생겨
 * 모델 없는 환경에서 모듈 로딩이 실패하므로 숫자로 고정한다.
 */
const MATCH_ALL_WITH_NORMALIZING = 8454207;
const MATCH_COMPATIBLE_JAMO = 16777216;
const MATCH_OPTIONS = MATCH_ALL_WITH_NORMALIZING | MATCH_COMPATIBLE_JAMO;

/** 용언·서술격 조사는 사전형(-다)을 만들어 둔다. M0 오버라이드와 M9가 lemma로 판정한다 */
const PREDICATE_TAGS = new Set(['VV', 'VA', 'VX', 'VCN', 'VCP']);

function lemmaOf(token: TokenInfo): string {
  return PREDICATE_TAGS.has(token.tag) ? `${token.str}다` : token.str;
}

/**
 * 어간이 실제로 차지하는 길이.
 *
 * 르 불규칙 등에서 Kiwi는 어간에 실현 길이보다 짧은 span을 준다.
 *   몰라요 → 모르/VV[0,1) + 어요/EF[1,3)
 * 이대로 두면 `몰`만 동사 칩이 되는데, `몰`은 형태소가 아니라 조각이다.
 * 형태소 표기(str)가 span보다 길면 실현 길이만큼 넓혀 뒤 어미와 겹치게 만든다.
 * 겹침은 normalize의 S1이 우선순위(품사 > 어미)로 해소해 `몰라` + `요`가 된다.
 *
 * 다음 토큰이 덮는 범위 안으로만 넓힌다 — 어절 밖으로 새지 않게 한다.
 */
function realizedLength(tokens: TokenInfo[], index: number): number {
  const token = tokens[index];
  if (token.str.length <= token.length) return token.length;

  const next = tokens[index + 1];
  if (!next || next.position !== token.position + token.length) return token.length;

  const limit = next.position + next.length - token.position;
  return Math.min(token.str.length, limit);
}

/**
 * Kiwi 토큰 → Morph.
 *
 * - 폭 0 토큰(`거예요`의 이/VCP[1,1))은 표면에 실현되지 않은 형태소다.
 *   세그먼트로 남길 수 없으므로 버리되, 태그는 뒤 형태소로 넘겨 흔적을 남긴다.
 * - 겹치는 스팬(`예약한`의 하[2,3)+ᆫ[2,3))은 그대로 넘긴다.
 *   INV-4에 따라 normalize의 S1이 우선순위로 음절 소유권을 정한다.
 */
export function toMorphs(
  tokens: TokenInfo[],
  oovMorphIds: ReadonlySet<number> = new Set(),
  verifiedUserWords: ReadonlySet<string> = new Set(),
): Morph[] {
  const out: Morph[] = [];

  for (const [index, token] of tokens.entries()) {
    // 폭 0 — 표면에 실현되지 않은 형태소. 세그먼트로 만들 수 없다.
    // `거예요`의 이/VCP가 여기 해당한다. 뒤의 예요/EF가 서술어 역할을 이어받는다.
    if (token.length <= 0) continue;

    const previous = out[out.length - 1];
    const share = previous && token.position < previous.end ? 'fused' : undefined;
    // INV-2 — Kiwi가 추측한 미등재어는 명사로 두지 않는다
    const isOov = oovMorphIds.has(token.morphId);

    out.push({
      surface: token.str,
      lemma: lemmaOf(token),
      tag: isOov ? UNKNOWN_TAG : token.tag,
      start: token.position,
      end: token.position + realizedLength(tokens, index),
      ...(share ? { share } : {}),
      ...(verifiedUserWords.has(token.str) && !isOov ? { confidence: 'verified' as const } : {}),
    });
  }

  return out;
}

export interface KiwiAnalyzerHandle {
  name: 'kiwi';
  version: string;
  modelDir: string;
  userWords: UserWord[];
  /** 탐지된 OOV 센티넬 형태소 id. 비어 있으면 미등재어 판별 불가 */
  oovMorphIds: ReadonlySet<number>;
  analyze(text: string, opts?: AnalyzeOptions): Morph[];
}

/**
 * Kiwi 인스턴스를 만든다. 모델이 없으면 null을 돌려주고 호출자가 폴백한다.
 * WASM 로딩과 모델 빌드에 수 초가 걸리므로 프로세스당 한 번만 호출한다.
 *
 * `userWords`는 **빌드 시점에만** 주입할 수 있다. 요청마다 넘어오는 userDict로
 * 인스턴스를 다시 만드는 것은 비용이 너무 크고(수 초), 대안인 `pretokenized`는
 * 이 바인딩에서 토큰 위치를 망가뜨린다(실측). 그래서 고유명사는 프로젝트 사전
 * (data/user-dict.json)에 등재해 부팅 시 한 번 심는다.
 */
export interface UserWord {
  word: string;
  /** 세종 태그. 고유명사는 NNP, 사전 표제어 굳히기는 해당 품사 태그 */
  tag: string;
}

export async function createKiwiAnalyzer(
  userWords: readonly UserWord[] = [],
): Promise<KiwiAnalyzerHandle | null> {
  const modelDir = resolveModelDir();
  if (!modelDir) return null;

  const require = createRequire(join(ROOT, 'package.json'));
  let KiwiBuilder: {
    create(wasmPath: string): Promise<{
      build(args: Record<string, unknown>): Promise<KiwiInstance>;
      version(): string;
    }>;
  };
  let wasmPath: string;
  try {
    ({ KiwiBuilder } = await import(pathToFileURL(require.resolve('kiwi-nlp')).href));
    wasmPath = require.resolve('kiwi-nlp/dist/kiwi-wasm.wasm');
  } catch {
    return null; // 패키지 미설치
  }

  const modelFiles: Record<string, Uint8Array> = {};
  for (const file of readdirSync(modelDir)) {
    modelFiles[file] = new Uint8Array(readFileSync(join(modelDir, file)));
  }

  const builder = await KiwiBuilder.create(wasmPath);
  const kiwi = await builder.build({
    modelFiles,
    ...(userWords.length > 0
      ? { userWords: userWords.map((e) => ({ word: e.word, tag: e.tag, score: 10 })) }
      : {}),
  });

  const oovMorphIds = detectOovMorphIds(kiwi);
  const verifiedUserWords = new Set(userWords.map((entry) => entry.word));

  return {
    name: 'kiwi',
    version: builder.version(),
    modelDir,
    userWords: [...userWords],
    oovMorphIds,
    analyze(text: string): Morph[] {
      return toMorphs(kiwi.tokenize(text, MATCH_OPTIONS, []), oovMorphIds, verifiedUserWords);
    },
  };
}
