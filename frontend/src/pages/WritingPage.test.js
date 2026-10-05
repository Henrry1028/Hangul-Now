import { describe, expect, it } from 'vitest';
import { calcTypingStats, formatTime } from './WritingPage.jsx';

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
