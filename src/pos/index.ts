/**
 * src/pos/index.ts
 * 공개 진입점. 분석기 + 정규화기를 사전 기본값과 함께 묶는다.
 */

import type { AnalyzeOptions } from './analyze.ts';
import { getAnalyzer } from './analyzer.ts';
import { AUX_LEMMAS, OVERRIDES } from './lexicon.ts';
import { normalize, type Options, type TaggedSentence } from './normalize.ts';
import { recoverPartial } from './partial.ts';
import { assignRoles } from './role.ts';

export type { Confidence, Morph, Segment, Eojeol, Diagnostic, TaggedSentence } from './normalize.ts';
export type { Bucket, Pos9, WordClass6 } from './tagmap.ts';
export type { Role, RoleAssignment } from './role.ts';
export { STYLE, TOOLTIP_EN, FIVE_CLASS_STYLE, WORD_CLASS6, toWordClass6 } from './tagmap.ts';
export { ROLE_STYLE, ROLE_TOOLTIP_EN, PARTICLE_ROLE, assignRoles } from './role.ts';
export { analyze } from './analyze.ts';
export { normalize } from './normalize.ts';
export { recoverPartial } from './partial.ts';
export { romanize, romanizeCapitalized, type RomanizeOptions } from './romanize.ts';
export {
  initAnalyzer,
  getAnalyzer,
  getAnalyzerStatus,
  setAnalyzer,
  legacyAnalyzer,
  loadProjectUserDictEntries,
  type Analyzer,
  type AnalyzerName,
  type AnalyzerStatus,
  type ProjectUserDictEntry,
  type UserDictCategory,
} from './analyzer.ts';

export interface TagOptions extends AnalyzeOptions, Options {}

/**
 * 문장 → 품사 태깅 결과. 순수 함수 (INV-5).
 *
 * M0 오버라이드와 M5 보조용언 목록은 사전에서 기본 주입되며,
 * 호출자가 `overrides`/`auxLemmas`로 덮어쓸 수 있다.
 */
export function tagSentence(text: string, opts: TagOptions = {}): TaggedSentence {
  // 분석기 뒤단에서 부분 복구를 건다. 어느 분석기를 쓰든 모르는 어절에서
  // 조사·어미까지 통째로 잃지 않게 한다.
  const morphs = recoverPartial(getAnalyzer().analyze(text, opts));
  const tagged = normalize(text, morphs, {
    level: opts.level ?? 2,
    overrides: { ...OVERRIDES, ...(opts.overrides ?? {}) },
    compoundNouns: opts.compoundNouns,
    auxLemmas: opts.auxLemmas ?? AUX_LEMMAS,
  });
  // 레이어 A는 항상 계산한다. 세 레이어(역할·품사·형태소)의 데이터를 모두 실어
  // 보내고, 어느 것으로 칠할지는 렌더러가 고른다.
  assignRoles(tagged.eojeols);
  return tagged;
}
