import { describe, expect, it } from 'vitest';
import { CJ_MAP, CJ_SEQ, JAMO_SEQ, JL, JT_ALL, JV, TARGETS_BY_LEVEL, WORDS_BY_LEVEL, decompSyl } from './writingData.js';

// 연습 단계에서 실제로 입력되는 자모 = 단일 자모, 또는 이중모음·겹받침을 JAMO_SEQ로 나눈 조각.
const stepJamos = (ch) => JAMO_SEQ[ch] || [ch];

describe('천지인 탭 순서 (CJ_SEQ)', () => {
  it('covers every jamo used by the Writing lessons with real keypad keys', () => {
    const all = new Set();
    const addSyl = (syl) => {
      const d = decompSyl(syl);
      stepJamos(JL.find((j) => j[1] === d.L)[0]).forEach((j) => all.add(j));
      stepJamos(JV.find((j) => j[1] === d.V)[0]).forEach((j) => all.add(j));
      if (d.T) stepJamos(JT_ALL.find((j) => j[1] === d.T)[0]).forEach((j) => all.add(j));
    };
    Object.values(TARGETS_BY_LEVEL).flat().forEach((t) => addSyl(t.ch));
    Object.values(WORDS_BY_LEVEL).flat().forEach((w) => [...w.w].forEach(addSyl));
    [...JL, ...JV, ...JT_ALL].forEach(([ch]) => stepJamos(ch).forEach((j) => all.add(j)));
    for (const jamo of all) {
      expect(CJ_SEQ[jamo], jamo).toBeTruthy();
      CJ_SEQ[jamo].forEach((k) => expect(CJ_MAP[k], `${jamo}:${k}`).toBeTruthy());
    }
  });

  it('builds compound vowels the standard 천지인 way when split by JAMO_SEQ', () => {
    const taps = (ch) => stepJamos(ch).flatMap((j) => CJ_SEQ[j]).map((k) => CJ_MAP[k].label).join('');
    expect(taps('ㅘ')).toBe('ㆍㅡㅣㆍ');
    expect(taps('ㅝ')).toBe('ㅡㆍㆍㅣ');
    expect(taps('ㅢ')).toBe('ㅡㅣ');
    expect(taps('ㅐ')).toBe('ㅣㆍㅣ');
    expect(CJ_SEQ['ㄲ']).toEqual(['CJ_GK', 'CJ_GK', 'CJ_GK']);
  });
});
