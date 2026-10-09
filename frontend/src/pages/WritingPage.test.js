import { describe, expect, it } from 'vitest';
import { calcTypingStats, cheonjiinGuide, formatTime } from './WritingPage.jsx';
import { CJ_SEQ } from '../data/writingData.js';

describe('WritingPage typing speed utilities', () => {
  it('formats elapsed seconds into MM:SS correctly', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(9)).toBe('00:09');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(300)).toBe('05:00');
  });

  it('updates correct strokes, accuracy and CPM on valid key press', () => {
    const initial = {
      correctStrokes: 0,
      errorStrokes: 0,
      cpm: 0,
      maxCpm: 0,
      accuracy: 100,
      elapsedSec: 0,
      startTime: null,
      lastStrokeTime: null,
      isActive: false
    };

    const t0 = 1000000;
    // 첫 올바른 키 입력 ('T' 예상, 'T' 입력)
    const s1 = calcTypingStats(initial, 'T', 'T', t0);
    expect(s1.correctStrokes).toBe(1);
    expect(s1.errorStrokes).toBe(0);
    expect(s1.accuracy).toBe(100);
    expect(s1.isActive).toBe(true);
    expect(s1.startTime).toBe(t0);
    expect(s1.cpm).toBeGreaterThan(0);

    // 2초 후 다음 올바른 키 입력 ('K' 예상, 'K' 입력)
    const t1 = t0 + 2000; // 2초 경과 (2/60 분)
    const s2 = calcTypingStats(s1, 'K', 'K', t1);
    expect(s2.correctStrokes).toBe(2);
    expect(s2.errorStrokes).toBe(0);
    expect(s2.accuracy).toBe(100);
    // 2타 / (2/60 분) = 60 CPM (최고 타수는 첫 타건 시점의 67 유지)
    expect(s2.cpm).toBe(60);
    expect(s2.maxCpm).toBe(67);
  });

  it('calculates error strokes and decreases accuracy on wrong key press without affecting modifiers', () => {
    const base = {
      correctStrokes: 4,
      errorStrokes: 0,
      cpm: 120,
      maxCpm: 120,
      accuracy: 100,
      elapsedSec: 2,
      startTime: 1000000,
      lastStrokeTime: 1002000,
      isActive: true
    };

    // 오타 발생: 'T'를 쳐야 하는데 'Q'를 침
    const wrong = calcTypingStats(base, 'Q', 'T', 1003000);
    expect(wrong.correctStrokes).toBe(4);
    expect(wrong.errorStrokes).toBe(1);
    // 4 / (4 + 1) = 80%
    expect(wrong.accuracy).toBe(80);

    // Shift, Ctrl 등의 모디파이어 키는 오타로 간주하지 않음
    const shiftPress = calcTypingStats(base, 'Shift', 'T', 1002500);
    expect(shiftPress.errorStrokes).toBe(0);
    expect(shiftPress.accuracy).toBe(100);
  });
});

describe('cheonjiinGuide (천지인 단계 안내)', () => {
  const step = (stage, jamo, extra = {}) => ({ stage, jamo, ...extra });
  it('says how many times to tap the same key instead of showing fractions', () => {
    const g = cheonjiinGuide(step('L', 'ㅊ'), CJ_SEQ['ㅊ'], 0, true);
    expect(g.head).toBe('1단계 초성 ㅊ');
    expect(g.action).toBe("'ㅈㅊ' 키를 두 번 누르세요");
    expect(g.chips.map((c) => c.state)).toEqual(['now', 'todo']);
    expect(g.text).not.toMatch(/\d\/\d/);
    expect(cheonjiinGuide(step('L', 'ㅊ'), CJ_SEQ['ㅊ'], 1, true).action).toBe("'ㅈㅊ' 키를 한 번 더 누르세요");
  });

  it('shows the key order for multi-key vowels with done/now/todo chips', () => {
    const g = cheonjiinGuide(step('V', 'ㅕ'), CJ_SEQ['ㅕ'], 1, true);
    expect(g.action).toBe("이번엔 'ㆍ' 키를 누르세요");
    expect(g.chips).toEqual([{ label: 'ㆍ', state: 'done' }, { label: 'ㆍ', state: 'now' }, { label: 'ㅣ', state: 'todo' }]);
  });

  it('single taps have no chips and compounds name the part in words', () => {
    const g = cheonjiinGuide(step('V', 'ㅗ', { compound: 'ㅘ', part: 1 }), CJ_SEQ['ㅗ'], 0, true);
    expect(g.compound).toBe('ㅘ = ㅗ + ㅏ 중 앞부분 ㅗ');
    expect(cheonjiinGuide(step('L', 'ㅂ'), CJ_SEQ['ㅂ'], 0, false)).toMatchObject({ action: "Tap 'ㅂㅍ' once", chips: [] });
  });
});
