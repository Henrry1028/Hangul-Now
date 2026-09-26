/**
 * src/pos/analyzer.ts
 * 분석기 레지스트리. 어느 분석기를 쓰든 normalize 이하는 동일하게 동작한다.
 *
 * 두 구현을 모두 살려 둔다.
 *   · kiwi   — 기본값. 어휘 집합이 닫혀 있지 않은 입력(학습자 자유 입력, LLM 응답)을 처리한다
 *   · legacy — 수기 사전 규칙 엔진. 모델이 없을 때의 폴백이자 A/B 비교 대상이다
 *
 * `Kiwi.tokenize`가 동기이므로 분석 자체는 동기다. 초기화(WASM 로딩 + 84MB
 * 모델 빌드)만 비동기이고 프로세스당 한 번만 수행한다.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze as legacyAnalyze, type AnalyzeOptions } from './analyze.ts';
import { createKiwiAnalyzer, resolveModelDir } from './kiwi-adapter.ts';
import type { Morph } from './normalize.ts';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const USER_DICT_PATH = join(PROJECT_ROOT, 'data', 'user-dict.json');

export type UserDictCategory =
  | 'person'
  | 'kpop_group'
  | 'brand'
  | 'place'
  | 'interjection_exception';

export interface ProjectUserDictEntry {
  surface: string;
  tags: string[];
  lemma: string;
  category: UserDictCategory;
  note: string;
  addedAt?: string;
}

/**
 * 프로젝트 고유명사 사전. Kiwi는 빌드 시점에만 사용자 어휘를 받으므로
 * 부팅 때 한 번 심는다. 운영 절차는 docs/user-dict-guide.md 참조.
 */
export function loadProjectUserDictEntries(): ProjectUserDictEntry[] {
  if (!existsSync(USER_DICT_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(USER_DICT_PATH, 'utf8')) as {
      entries?: ProjectUserDictEntry[];
    };
    return (data.entries ?? [])
      .filter((e) => e?.surface && Array.isArray(e.tags) && e.tags.length > 0);
  } catch {
    return [];
  }
}

export function loadProjectUserDict(): { word: string; tag: string }[] {
  return loadProjectUserDictEntries().map((entry) => ({
    word: entry.surface,
    tag: entry.tags[0],
  }));
}

export type AnalyzerName = 'kiwi' | 'legacy';

export interface Analyzer {
  readonly name: AnalyzerName;
  analyze(text: string, opts?: AnalyzeOptions): Morph[];
}

export const legacyAnalyzer: Analyzer = {
  name: 'legacy',
  analyze: (text, opts) => legacyAnalyze(text, opts),
};

export interface AnalyzerStatus {
  name: AnalyzerName;
  /** kiwi 로 가지 못했다면 그 이유 */
  reason?: string;
  version?: string;
  modelDir?: string;
  userWords?: number;
}

let current: Analyzer = legacyAnalyzer;
let status: AnalyzerStatus = { name: 'legacy', reason: '초기화 전' };
let pending: Promise<AnalyzerStatus> | null = null;

function useLegacy(reason: string): AnalyzerStatus {
  current = legacyAnalyzer;
  status = { name: 'legacy', reason };

  if (process.env.POS_REQUIRE_KIWI === '1') {
    throw new Error(
      `POS_REQUIRE_KIWI=1인데 Kiwi 분석기를 사용할 수 없습니다: ${reason}`,
    );
  }

  return status;
}

/**
 * 분석기를 준비한다. 서버 부팅 시 한 번 await 한다.
 * 기본값은 실패해도 legacy 로 폴백한다. 운영 환경에서 저품질 폴백을 허용하지
 * 않으려면 POS_REQUIRE_KIWI=1을 설정한다. 그 경우 초기화 실패가 부팅 실패로
 * 전파된다.
 */
export function initAnalyzer(): Promise<AnalyzerStatus> {
  pending ??= (async (): Promise<AnalyzerStatus> => {
    if (process.env.POS_ANALYZER === 'legacy') {
      return useLegacy('POS_ANALYZER=legacy');
    }

    if (!resolveModelDir()) {
      return useLegacy('Kiwi 모델 없음 (npm run kiwi:model)');
    }

    let kiwi;
    try {
      kiwi = await createKiwiAnalyzer(loadProjectUserDict());
    } catch (error) {
      return useLegacy(`Kiwi 초기화 실패: ${(error as Error).message}`);
    }

    if (!kiwi) {
      return useLegacy('kiwi-nlp 패키지를 불러오지 못함');
    }

    current = kiwi;
    status = {
      name: 'kiwi',
      version: kiwi.version,
      modelDir: kiwi.modelDir,
      userWords: kiwi.userWords.length,
    };
    return status;
  })();

  return pending;
}

export function getAnalyzer(): Analyzer {
  return current;
}

export function getAnalyzerStatus(): AnalyzerStatus {
  return status;
}

/** 테스트에서 A/B 비교할 때 쓴다 */
export function setAnalyzer(analyzer: Analyzer): void {
  current = analyzer;
  status = { name: analyzer.name };
}
