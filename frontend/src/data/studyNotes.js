// ── 오답 노트 + 단어 학습 공용 저장소 ──
// 모든 학습 영역(튜터 채팅·실시간 회화·읽기·듣기·쓰기·말하기·단어)에서 틀린 내용을 한곳에 모으고,
// 간격 반복(라이트너 상자)으로 다시 볼 때를 정한다. 같은 실수가 반복되거나 같은 유형이 쌓이면
// 집중 점수가 올라가 '집중 복습' 맨 앞으로 자동으로 올라온다.
// 저장은 이 브라우저(localStorage)에만 한다. 화면들은 'hn-study-notes' 이벤트로 갱신을 알 수 있다.
import { VOCAB_DECK } from './vocabDeck.js';

const MISTAKES_KEY = 'hn-mistakes';
const VOCAB_KEY = 'hn-vocab';
export const STUDY_NOTES_EVENT = 'hn-study-notes';

const DAY = 24 * 60 * 60 * 1000;
// 상자 번호 → 다음 복습까지 일수. 마지막 상자(5)에 올라가면 '익힘'으로 본다.
export const SRS_DAYS = [0, 1, 3, 7, 14, 30];
export const MASTERED_BOX = 5;
const MAX_MISTAKES = 400;
const REPEAT_GUARD_MS = 4000; // 같은 실수를 연달아 누른 것은 한 번으로 친다
export const NEW_WORDS_PER_DAY = 5;

export const MISTAKE_AREAS = {
  chat: { ko: '튜터 채팅', en: 'Tutor chat', icon: '💬' },
  conversation: { ko: '실시간 회화', en: 'Live conversation', icon: '🗣️' },
  reading: { ko: '읽기 독해', en: 'Reading', icon: '📖' },
  listening: { ko: '듣기 연습', en: 'Listening', icon: '🎧' },
  writing: { ko: '쓰기 조합', en: 'Writing', icon: '✍️' },
  speaking: { ko: '말하기 코치', en: 'Speaking', icon: '🎙️' },
  vocab: { ko: '단어 학습', en: 'Vocabulary', icon: '🗂️' }
};

export const MISTAKE_CATEGORIES = {
  particle: { ko: '조사', en: 'Particles' },
  ending: { ko: '시제·어미', en: 'Tense & endings' },
  spelling: { ko: '맞춤법·띄어쓰기', en: 'Spelling & spacing' },
  wording: { ko: '어휘·표현', en: 'Word choice' },
  pronunciation: { ko: '발음', en: 'Pronunciation' },
  jamo: { ko: '자모·받침 입력', en: 'Jamo & batchim typing' },
  comprehension: { ko: '듣기·독해 이해', en: 'Comprehension' },
  dictation: { ko: '받아쓰기', en: 'Dictation' },
  meaning: { ko: '단어 뜻', en: 'Word meanings' }
};

export const dayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const clean = (v) => String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

export function mistakeCategory({ area, kind, rule }) {
  const r = String(rule || '').toUpperCase();
  if (r.includes('PARTICLE')) return 'particle';
  if (r.includes('TENSE') || r.includes('ENDING') || r.includes('CLAUSE') || r.includes('CONJUG') || r.includes('HONORIFIC')) return 'ending';
  if (r.includes('SPELL') || r.includes('SPACING')) return 'spelling';
  if (r.includes('VOCAB') || r.includes('WORD') || r.includes('NATURAL')) return 'wording';
  if (area === 'speaking') return 'pronunciation';
  if (area === 'writing') return 'jamo';
  if (area === 'vocab') return 'meaning';
  if (kind === 'dictation') return 'dictation';
  if (kind === 'quiz') return 'comprehension';
  return 'wording';
}

export const mistakeKey = ({ area, kind, prompt, right, key }) => key || `${area}:${kind}:${clean(prompt || right).slice(0, 80)}:${clean(right).slice(0, 40)}`;

const addDay = (dates, ts) => {
  const d = dayKey(ts);
  return (dates || []).includes(d) ? dates : [...(dates || []), d].slice(-30);
};

// 순수 함수: 실수 한 건을 저장소(객체 key → 항목)에 반영한 새 저장소를 돌려준다.
export function applyMistake(store, input, now = Date.now()) {
  const key = mistakeKey(input);
  const prev = store[key];
  if (prev && now - prev.lastAt < REPEAT_GUARD_MS) return store;
  const base = {
    area: input.area,
    kind: input.kind || 'correction',
    prompt: clean(input.prompt),
    wrong: clean(input.wrong),
    right: clean(input.right),
    noteEn: clean(input.noteEn),
    noteKo: clean(input.noteKo),
    rule: clean(input.rule)
  };
  const next = prev
    ? { ...prev, ...Object.fromEntries(Object.entries(base).filter(([, v]) => v)), count: prev.count + 1, lastAt: now, dates: addDay(prev.dates, now), box: 0, nextReviewAt: now, mastered: false }
    : { id: `m_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`, key, ...base, category: mistakeCategory(input), count: 1, firstAt: now, lastAt: now, dates: [dayKey(now)], box: 0, nextReviewAt: now, reviews: 0, mastered: false };
  const out = { ...store, [key]: next };
  const keys = Object.keys(out);
  if (keys.length > MAX_MISTAKES) {
    // 익힌 것 → 오래된 것 순으로 덜어낸다
    keys.sort((a, b) => (Number(out[b].mastered) - Number(out[a].mastered)) || out[a].lastAt - out[b].lastAt)
      .slice(0, keys.length - MAX_MISTAKES)
      .forEach((k) => { delete out[k]; });
  }
  return out;
}

// 복습 결과: 맞히면 상자를 한 칸 올려 다음 복습을 미루고, 틀리면 처음 상자로 돌아가 횟수를 올린다.
export function applyReview(item, correct, now = Date.now()) {
  if (correct) {
    const box = Math.min((item.box || 0) + 1, MASTERED_BOX);
    return { ...item, box, nextReviewAt: now + SRS_DAYS[box] * DAY, reviews: (item.reviews || 0) + 1, lastReviewedAt: now, mastered: box >= MASTERED_BOX };
  }
  return { ...item, box: 0, nextReviewAt: now, reviews: (item.reviews || 0) + 1, lastReviewedAt: now, count: (item.count || 0) + 1, lastAt: now, dates: addDay(item.dates, now), mastered: false };
}

// 집중 점수: 반복 횟수 > 최근성 > 아직 못 익힌 정도 > 같은 유형이 쌓인 정도
export function focusScore(item, categoryLoad = {}, now = Date.now()) {
  if (item.mastered) return -1;
  const age = now - (item.lastAt || 0);
  const recency = age < DAY ? 4 : age < 3 * DAY ? 2 : age < 7 * DAY ? 1 : 0;
  const due = (item.nextReviewAt || 0) <= now ? 3 : 0;
  const weakness = MASTERED_BOX - (item.box || 0);
  const load = Math.min(4, (categoryLoad[item.category] || 0) / 2);
  return (item.count || 1) * 3 + recency + due + weakness + load;
}

export function buildFocus(store, now = Date.now()) {
  const items = Object.values(store || {});
  const open = items.filter((m) => !m.mastered);
  const categoryLoad = {};
  open.forEach((m) => { categoryLoad[m.category] = (categoryLoad[m.category] || 0) + (m.count || 1); });
  const scored = open.map((m) => ({ ...m, score: focusScore(m, categoryLoad, now) })).sort((a, b) => b.score - a.score || b.lastAt - a.lastAt);
  const total = Object.values(categoryLoad).reduce((a, b) => a + b, 0) || 1;
  const today = dayKey(now);
  return {
    queue: scored.filter((m) => m.nextReviewAt <= now).slice(0, 20),
    ranked: scored,
    weakCategories: Object.entries(categoryLoad)
      .map(([id, count]) => ({ id, count, share: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count),
    today: items.filter((m) => (m.dates || []).includes(today)).sort((a, b) => b.lastAt - a.lastAt),
    dueCount: open.filter((m) => m.nextReviewAt <= now).length,
    masteredCount: items.length - open.length,
    total: items.length
  };
}

// 튜터 채팅에 넘길 '요즘 자주 틀리는 표현' (가장 집중이 필요한 교정 3개)
export function focusExpressions(store, now = Date.now(), limit = 3) {
  return buildFocus(store, now).ranked
    .filter((m) => m.right && (m.area === 'chat' || m.area === 'conversation' || m.area === 'speaking'))
    .slice(0, limit)
    .map((m) => m.right.slice(0, 40));
}

// ── 단어 카드 ──
export function applyAddWord(store, word, source = 'manual', now = Date.now()) {
  const w = clean(word.w);
  if (!w) return store;
  const prev = store[w];
  const fields = Object.fromEntries([
    'rom', 'en', 'pos', 'posKo', 'posEn', 'ex', 'exEn', 'ex2', 'ex2En',
    'tipKo', 'tipEn', 'topic', 'theme', 'level', 'hanja'
  ].map((k) => [k, clean(word[k])]).filter(([, v]) => v));
  if (prev) return { ...store, [w]: { ...fields, ...prev, ...Object.fromEntries(Object.entries(fields).filter(([k]) => !prev[k])) } };
  return { ...store, [w]: { w, ...fields, source, addedAt: now, addedDay: dayKey(now), box: 0, nextReviewAt: now, correct: 0, wrong: 0, mastered: false } };
}

export function applyWordReview(store, w, correct, now = Date.now()) {
  const card = store[w];
  if (!card) return store;
  let reviewed;
  if (!correct) {
    reviewed = {
      ...applyReview(card, false, now),
      weakStep: 0,
      nextReviewAt: now + DAY
    };
  } else if (Number.isInteger(card.weakStep)) {
    const nextWeakStep = card.weakStep + 1;
    if (nextWeakStep <= 2) {
      reviewed = {
        ...applyReview(card, true, now),
        weakStep: nextWeakStep,
        nextReviewAt: now + [0, 3, 7][nextWeakStep] * DAY,
        mastered: false
      };
    } else {
      reviewed = { ...applyReview(card, true, now), weakStep: null };
    }
  } else {
    reviewed = applyReview(card, true, now);
  }
  return { ...store, [w]: { ...reviewed, correct: (card.correct || 0) + (correct ? 1 : 0), wrong: (card.wrong || 0) + (correct ? 0 : 1) } };
}

// 오늘의 단어 세션: 복습할 카드(틀린 적 많은 것 먼저) + 아직 안 본 새 단어(하루 NEW_WORDS_PER_DAY개까지).
// 이미 소개한 단어는 다시 '새 단어'로 나오지 않는다 (복습 일정으로만 다시 나온다).
export function buildVocabSession(store, now = Date.now(), deck = VOCAB_DECK) {
  const cards = Object.values(store || {});
  const due = cards
    .filter((c) => !c.mastered && c.nextReviewAt <= now)
    .sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || a.nextReviewAt - b.nextReviewAt);
  const introducedToday = cards.filter((c) => c.source === 'starter' && c.addedDay === dayKey(now)).length;
  const room = Math.max(0, NEW_WORDS_PER_DAY - introducedToday);
  const fresh = deck.filter((d) => !store[d.w]).slice(0, room);
  return { due, fresh, introducedToday, room };
}

// 4지선다 뜻 퀴즈 보기: 정답 + 같은 품사를 우선한 오답 3개 (seed로 순서를 고정)
export function meaningChoices(card, pool, seed = 1) {
  let s = (seed >>> 0) || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const others = pool.filter((p) => p.w !== card.w && p.en && p.en !== card.en);
  const same = others.filter((p) => p.pos === card.pos);
  const pick = [];
  const take = (list) => {
    const copy = list.slice();
    while (copy.length && pick.length < 3) {
      const [x] = copy.splice(Math.floor(rnd() * copy.length), 1);
      if (!pick.some((p) => p.en === x.en)) pick.push(x);
    }
  };
  take(same);
  take(others);
  const opts = [card.en, ...pick.map((p) => p.en)];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}

// ── localStorage 입출력 ──
function read(key) {
  try { return JSON.parse(window.localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
}
function write(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 실패해도 학습은 계속 */ }
  try { window.dispatchEvent(new CustomEvent(STUDY_NOTES_EVENT, { detail: { key } })); } catch { /* ignore */ }
}

export const loadMistakes = () => read(MISTAKES_KEY);
export const loadVocab = () => read(VOCAB_KEY);

export function recordMistake(input) {
  if (typeof window === 'undefined' || !input?.area || !(input.right || input.prompt)) return;
  const before = loadMistakes();
  const after = applyMistake(before, input);
  if (after !== before) write(MISTAKES_KEY, after);
}

// 학습 화면에서 예전에 틀린 문제를 이번에 맞히면 복습 성공으로 친다.
export function recordMistakeFixed(input) {
  if (typeof window === 'undefined') return;
  const store = loadMistakes();
  const key = mistakeKey(input);
  if (!store[key] || store[key].mastered) return;
  write(MISTAKES_KEY, { ...store, [key]: applyReview(store[key], true) });
}

export function reviewMistake(key, correct) {
  const store = loadMistakes();
  if (!store[key]) return;
  write(MISTAKES_KEY, { ...store, [key]: applyReview(store[key], correct) });
}

export function deleteMistake(key) {
  const store = loadMistakes();
  if (!store[key]) return;
  const next = { ...store };
  delete next[key];
  write(MISTAKES_KEY, next);
}

export function addVocabWord(word, source) {
  if (typeof window === 'undefined') return;
  write(VOCAB_KEY, applyAddWord(loadVocab(), word, source));
}

// logMistake=false: 처음 보는 새 단어를 모른다고 한 것은 실수가 아니므로 오답 노트에 넣지 않는다.
export function reviewVocabWord(w, correct, { logMistake = true } = {}) {
  const store = loadVocab();
  if (!store[w]) return;
  write(VOCAB_KEY, applyWordReview(store, w, correct));
  if (!logMistake) return;
  if (!correct) recordMistake({ area: 'vocab', kind: 'word', prompt: w, right: store[w].en, noteEn: store[w].ex ? `${store[w].ex} — ${store[w].exEn || ''}` : '' });
  else recordMistakeFixed({ area: 'vocab', kind: 'word', prompt: w, right: store[w].en });
}

export function removeVocabWord(w) {
  const store = loadVocab();
  if (!store[w]) return;
  const next = { ...store };
  delete next[w];
  write(VOCAB_KEY, next);
}
