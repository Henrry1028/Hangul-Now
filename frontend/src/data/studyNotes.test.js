import { describe, expect, it } from 'vitest';
import { VOCAB_DECK } from './vocabDeck.js';
import {
  MASTERED_BOX,
  NEW_WORDS_PER_DAY,
  SRS_DAYS,
  applyAddWord,
  applyMistake,
  applyReview,
  applyWordReview,
  buildFocus,
  buildVocabSession,
  dayKey,
  focusExpressions,
  meaningChoices,
  mistakeCategory
} from './studyNotes.js';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-10-09T10:00:00').getTime();
const chatFix = { area: 'chat', kind: 'correction', prompt: '몰르겠어요', wrong: '몰르겠어요', right: '모르겠어요', rule: 'SPELLING_ERROR' };

describe('오답 저장 (applyMistake)', () => {
  it('collects one entry per mistake and counts repeats instead of duplicating', () => {
    let store = applyMistake({}, chatFix, T0);
    store = applyMistake(store, chatFix, T0 + 60_000);
    const items = Object.values(store);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ count: 2, box: 0, category: 'spelling', dates: [dayKey(T0)] });
  });

  it('ignores the same mistake repeated within a few seconds (key mashing)', () => {
    const once = applyMistake({}, chatFix, T0);
    expect(applyMistake(once, chatFix, T0 + 1000)).toBe(once);
  });

  it('maps rules and areas to weak-spot categories', () => {
    expect(mistakeCategory({ area: 'chat', rule: 'PARTICLE_MISUSE' })).toBe('particle');
    expect(mistakeCategory({ area: 'chat', rule: 'TENSE_ERROR' })).toBe('ending');
    expect(mistakeCategory({ area: 'speaking', kind: 'pronunciation' })).toBe('pronunciation');
    expect(mistakeCategory({ area: 'writing', kind: 'jamo' })).toBe('jamo');
    expect(mistakeCategory({ area: 'listening', kind: 'dictation' })).toBe('dictation');
    expect(mistakeCategory({ area: 'reading', kind: 'quiz' })).toBe('comprehension');
  });
});

describe('간격 반복 (applyReview)', () => {
  it('moves up one box per correct review and masters at the last box', () => {
    let item = Object.values(applyMistake({}, chatFix, T0))[0];
    for (let i = 1; i <= MASTERED_BOX; i++) {
      item = applyReview(item, true, T0);
      expect(item.box).toBe(i);
      expect(item.nextReviewAt).toBe(T0 + SRS_DAYS[i] * DAY);
    }
    expect(item.mastered).toBe(true);
  });

  it('a miss sends it back to the first box and counts again', () => {
    let item = Object.values(applyMistake({}, chatFix, T0))[0];
    item = applyReview(applyReview(item, true, T0), false, T0 + DAY);
    expect(item).toMatchObject({ box: 0, count: 2, mastered: false, nextReviewAt: T0 + DAY });
  });
});

describe('집중화 (buildFocus)', () => {
  it('ranks repeated, recent mistakes and their weak category first', () => {
    let store = {};
    store = applyMistake(store, { area: 'reading', kind: 'quiz', prompt: 'Q1', wrong: 'a', right: 'b' }, T0 - 5 * DAY);
    for (let i = 0; i < 3; i++) store = applyMistake(store, chatFix, T0 + i * 10_000);
    store = applyMistake(store, { ...chatFix, prompt: '않해요', wrong: '않해요', right: '안 해요' }, T0);
    const focus = buildFocus(store, T0 + 60_000);
    expect(focus.queue[0].right).toBe('모르겠어요');
    expect(focus.queue[1].category).toBe('spelling');
    expect(focus.weakCategories[0]).toMatchObject({ id: 'spelling', count: 4 });
    expect(focus.today.map((m) => m.right)).toEqual(expect.arrayContaining(['모르겠어요', '안 해요']));
    expect(focus.today.map((m) => m.right)).not.toContain('b');
  });

  it('leaves mastered or not-yet-due items out of the review queue', () => {
    let store = applyMistake({}, chatFix, T0);
    const key = Object.keys(store)[0];
    store = { ...store, [key]: applyReview(store[key], true, T0) };
    expect(buildFocus(store, T0 + 1000).queue).toHaveLength(0);
    expect(buildFocus(store, T0 + DAY + 1).queue).toHaveLength(1);
  });

  it('hands the tutor the top corrected expressions from chat-like areas', () => {
    let store = applyMistake({}, chatFix, T0);
    store = applyMistake(store, { area: 'reading', kind: 'quiz', prompt: 'Q', wrong: 'x', right: '정답' }, T0);
    expect(focusExpressions(store, T0)).toEqual(['모르겠어요']);
  });
});

describe('단어 학습', () => {
  it('introduces at most NEW_WORDS_PER_DAY new words and never re-introduces learned ones', () => {
    let store = {};
    const first = buildVocabSession(store, T0);
    expect(first.fresh).toHaveLength(NEW_WORDS_PER_DAY);
    first.fresh.slice(0, 3).forEach((w) => { store = applyAddWord(store, w, 'starter', T0); });
    const later = buildVocabSession(store, T0 + 1000);
    expect(later.fresh).toHaveLength(NEW_WORDS_PER_DAY - 3);
    expect(later.fresh.some((w) => store[w.w])).toBe(false);
    expect(buildVocabSession(store, T0 + DAY).fresh).toHaveLength(NEW_WORDS_PER_DAY);
  });

  it('puts often-missed words first among due cards', () => {
    let store = {};
    ['사람', '친구'].forEach((w) => { store = applyAddWord(store, { w, en: w }, 'manual', T0); });
    store = applyWordReview(store, '친구', false, T0);
    expect(buildVocabSession(store, T0 + 1000).due.map((c) => c.w)).toEqual(['사람']);
    expect(buildVocabSession(store, T0 + DAY).due.map((c) => c.w)).toEqual(['친구', '사람']);
  });

  it('schedules an Again word after 1, 3, and 7 days', () => {
    let store = applyAddWord({}, { w: '눈치', en: 'social awareness' }, 'daily', T0);
    store = applyWordReview(store, '눈치', false, T0);
    expect(store['눈치']).toMatchObject({ weakStep: 0, nextReviewAt: T0 + DAY });
    store = applyWordReview(store, '눈치', true, T0 + DAY);
    expect(store['눈치']).toMatchObject({ weakStep: 1, nextReviewAt: T0 + 4 * DAY });
    store = applyWordReview(store, '눈치', true, T0 + 4 * DAY);
    expect(store['눈치']).toMatchObject({ weakStep: 2, nextReviewAt: T0 + 11 * DAY });
  });

  it('builds four distinct meaning choices that include the answer', () => {
    const card = VOCAB_DECK.find((d) => d.w === '친구');
    const choices = meaningChoices(card, VOCAB_DECK, 7);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain(card.en);
  });

  it('merges a re-saved word without losing review progress', () => {
    let store = applyAddWord({}, { w: '벚꽃', en: 'cherry blossom' }, 'reading', T0);
    store = applyWordReview(store, '벚꽃', true, T0);
    store = applyAddWord(store, { w: '벚꽃', en: 'other', ex: '벚꽃이 예뻐요.' }, 'reading', T0);
    expect(store['벚꽃']).toMatchObject({ en: 'cherry blossom', ex: '벚꽃이 예뻐요.', box: 1 });
  });
});
