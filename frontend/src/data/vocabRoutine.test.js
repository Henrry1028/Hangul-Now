import { describe, expect, it } from 'vitest';
import { applyAddWord, applyWordReview, dayKey } from './studyNotes.js';
import { applyStreakCompletion, buildDailySet, createMicroQuiz, normalizeDailyWords } from './vocabRoutine.js';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 10, 12).getTime();

const words = Array.from({ length: 5 }, (_, index) => ({
  w: `단어${index + 1}`,
  en: `meaning ${index + 1}`,
  pos: '명사',
  ex: `단어${index + 1} 예문입니다.`,
  exEn: `Example ${index + 1}.`
}));

describe('5분 데일리 단어 루틴', () => {
  it('normalizes and limits generated words to five', () => {
    const normalized = normalizeDailyWords([...words, words[0]], { level: 'intermediate', theme: 'emotion' });
    expect(normalized).toHaveLength(5);
    expect(normalized[0]).toMatchObject({ level: 'intermediate', theme: 'emotion' });
  });

  it('mixes at most two due weak words into a five-word set', () => {
    let store = {};
    ['취약1', '취약2', '취약3'].forEach((w) => {
      store = applyAddWord(store, { w, en: w }, 'daily', T0 - 2 * DAY);
      store = applyWordReview(store, w, false, T0 - DAY);
    });
    const set = buildDailySet(store, words, [], 5, T0);
    expect(set).toHaveLength(5);
    expect(set.filter((word) => word.w.startsWith('취약'))).toHaveLength(2);
  });

  it('creates exactly three quiz types including a beginner puzzle', () => {
    const quiz = createMicroQuiz(words, 'beginner', 7);
    expect(quiz.map((item) => item.type)).toEqual(['meaning', 'blank', 'puzzle']);
  });

  it('increments a streak only once per day and continues the next day', () => {
    const first = applyStreakCompletion({}, T0);
    expect(first).toMatchObject({ streak: 1, lastDay: dayKey(T0) });
    expect(applyStreakCompletion(first, T0 + 1000).streak).toBe(1);
    expect(applyStreakCompletion(first, T0 + DAY).streak).toBe(2);
  });
});
