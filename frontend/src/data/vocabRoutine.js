import { VOCAB_DECK } from './vocabDeck.js';
import { dayKey, meaningChoices } from './studyNotes.js';

export const DAILY_WORD_COUNT = 5;
export const MICRO_QUIZ_COUNT = 3;
export const VOCAB_ROUTINE_KEY = 'hn-vocab-routine';
export const VOCAB_STREAK_KEY = 'hn-vocab-streak';

export const VOCAB_LEVELS = [
  { id: 'starter', ko: '입문', en: 'Pre-A1–A1', detailKo: '자모·기초 표현', detailEn: 'Jamo & essentials' },
  { id: 'beginner', ko: '초급', en: 'TOPIK 1–2', detailKo: '생활 대화', detailEn: 'Daily survival Korean' },
  { id: 'intermediate', ko: '중급', en: 'TOPIK 3–4', detailKo: '뉘앙스·연어', detailEn: 'Nuance & collocations' },
  { id: 'advanced', ko: '고급', en: 'TOPIK 5–6', detailKo: '시사·비즈니스', detailEn: 'News & business' }
];

export const VOCAB_THEMES = [
  { id: 'kdrama', ko: '#K-드라마단골단어', en: '#K-drama favorites' },
  { id: 'cafe', ko: '#카페주문', en: '#Cafe orders' },
  { id: 'business', ko: '#비즈니스이메일', en: '#Business email' },
  { id: 'emotion', ko: '#감정표현', en: '#Emotions' }
];

const clean = (value) => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

export function normalizeDailyWords(input, { level = 'beginner', theme = 'kdrama' } = {}) {
  const seen = new Set();
  return (Array.isArray(input) ? input : [])
    .map((word) => ({
      w: clean(word?.w || word?.word),
      rom: clean(word?.rom || word?.roman),
      en: clean(word?.en || word?.meaningEn),
      pos: clean(word?.posKo || word?.pos || word?.posEn),
      posKo: clean(word?.posKo || word?.pos),
      posEn: clean(word?.posEn),
      ex: clean(word?.ex || word?.exampleKo),
      exEn: clean(word?.exEn || word?.exampleEn),
      ex2: clean(word?.ex2 || word?.example2Ko),
      ex2En: clean(word?.ex2En || word?.example2En),
      tipKo: clean(word?.tipKo),
      tipEn: clean(word?.tipEn),
      hanja: clean(word?.hanja),
      level,
      theme,
      topic: theme
    }))
    .filter((word) => word.w && word.en && !seen.has(word.w) && seen.add(word.w))
    .slice(0, DAILY_WORD_COUNT);
}

export function buildDailySet(store = {}, generated = [], fallback = VOCAB_DECK, count = DAILY_WORD_COUNT, now = Date.now()) {
  const due = Object.values(store)
    .filter((card) => !card.mastered && card.nextReviewAt <= now && ((card.wrong || 0) > 0 || Number.isInteger(card.weakStep)))
    .sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || a.nextReviewAt - b.nextReviewAt)
    .slice(0, 2);
  const used = new Set(due.map((word) => word.w));
  const fresh = [];
  const addFresh = (word) => {
    if (!word?.w || used.has(word.w) || store[word.w]) return;
    used.add(word.w);
    fresh.push(word);
  };
  generated.forEach(addFresh);
  fallback.forEach(addFresh);
  const selected = [...due, ...fresh];
  [...generated, ...fallback, ...Object.values(store)].forEach((word) => {
    if (selected.length >= count || !word?.w || used.has(word.w)) return;
    used.add(word.w);
    selected.push(store[word.w] || word);
  });
  return selected.slice(0, count);
}

function seededShuffle(items, seed) {
  let state = (seed >>> 0) || 1;
  const copy = items.slice();
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createMicroQuiz(words, level = 'beginner', seed = Number(dayKey().replace(/-/g, ''))) {
  const cards = words.filter((word) => word?.w && word?.en);
  if (!cards.length) return [];
  const at = (index) => cards[index % cards.length];
  const meaning = at(0);
  const blank = at(1);
  const third = at(2);
  const blankText = blank.ex?.includes(blank.w) ? blank.ex.replace(blank.w, '____') : `____: ${blank.en}`;
  const quiz = [
    {
      id: 'meaning', type: 'meaning', word: meaning.w,
      promptKo: `“${meaning.w}”의 뜻은 무엇인가요?`, promptEn: `What does “${meaning.w}” mean?`,
      choices: meaningChoices(meaning, [...cards, ...VOCAB_DECK], seed), answer: meaning.en
    },
    {
      id: 'blank', type: 'blank', word: blank.w,
      promptKo: blankText, promptEn: blank.exEn || 'Choose the word that completes the sentence.',
      choices: seededShuffle([blank.w, ...cards.filter((word) => word.w !== blank.w).map((word) => word.w)].slice(0, 4), seed + 11),
      answer: blank.w
    }
  ];
  if (level === 'starter' || level === 'beginner') {
    const sentence = third.ex || `${third.w} 좋아요`;
    quiz.push({
      id: 'puzzle', type: 'puzzle', word: third.w,
      promptKo: '어절을 순서대로 눌러 문장을 완성하세요.', promptEn: 'Tap the blocks in the correct order.',
      blocks: seededShuffle(sentence.split(/\s+/).filter(Boolean), seed + 23),
      answer: sentence
    });
  } else {
    const context = third.ex?.includes(third.w) ? third.ex.replace(third.w, '____') : `____: ${third.en}`;
    quiz.push({
      id: 'context', type: 'blank', word: third.w,
      promptKo: context, promptEn: third.exEn || 'Choose the best word for the context.',
      choices: seededShuffle([third.w, ...cards.filter((word) => word.w !== third.w).map((word) => word.w)].slice(0, 4), seed + 23),
      answer: third.w
    });
  }
  return quiz.slice(0, MICRO_QUIZ_COUNT);
}

export function applyStreakCompletion(state = {}, now = Date.now()) {
  const today = dayKey(now);
  const stamps = Array.from(new Set([...(state.stamps || []), today])).sort().slice(-60);
  if (state.lastDay === today) return { ...state, stamps };
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const streak = state.lastDay === dayKey(yesterday.getTime()) ? (state.streak || 0) + 1 : 1;
  return { streak, best: Math.max(state.best || 0, streak), lastDay: today, stamps };
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
}

export const loadStreak = () => readJson(VOCAB_STREAK_KEY, { streak: 0, best: 0, lastDay: '', stamps: [] });
export function completeStreak(now = Date.now()) {
  const next = applyStreakCompletion(loadStreak(), now);
  try { window.localStorage.setItem(VOCAB_STREAK_KEY, JSON.stringify(next)); } catch { /* continue without persistence */ }
  return next;
}

export function loadDailyCache(level, theme, now = Date.now()) {
  const cached = readJson(VOCAB_ROUTINE_KEY, null);
  return cached?.day === dayKey(now) && cached.level === level && cached.theme === theme ? cached.words || [] : [];
}

export function saveDailyCache(level, theme, words, now = Date.now()) {
  try { window.localStorage.setItem(VOCAB_ROUTINE_KEY, JSON.stringify({ day: dayKey(now), level, theme, words })); } catch { /* continue without persistence */ }
}

export function streakCalendar(state, days = 14, now = Date.now()) {
  const stamped = new Set(state?.stamps || []);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - index - 1));
    const key = dayKey(date.getTime());
    return { key, day: date.getDate(), weekday: date.toLocaleDateString('ko-KR', { weekday: 'short' }).slice(0, 1), stamped: stamped.has(key), today: key === dayKey(now) };
  });
}
