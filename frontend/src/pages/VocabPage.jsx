import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useStudyNotes from '../hooks/useStudyNotes.js';
import useTutorSpeech from '../hooks/useTutorSpeech.js';
import { VOCAB_DECK } from '../data/vocabDeck.js';
import { authHeaders } from '../data/authHeaders.js';
import {
  MASTERED_BOX,
  addVocabWord,
  buildVocabSession,
  dayKey,
  removeVocabWord,
  reviewVocabWord
} from '../data/studyNotes.js';
import {
  DAILY_WORD_COUNT,
  VOCAB_LEVELS,
  VOCAB_THEMES,
  buildDailySet,
  completeStreak,
  createMicroQuiz,
  loadDailyCache,
  loadStreak,
  normalizeDailyWords,
  saveDailyCache,
  streakCalendar
} from '../data/vocabRoutine.js';
import '../styles/notes.css';

const SOURCE_LABEL = {
  starter: ['기본 단어', 'Starter'],
  daily: ['데일리 루틴', 'Daily routine'],
  reading: ['읽기에서 저장', 'From reading'],
  manual: ['직접 추가', 'Added by me']
};

function BoxDots({ box = 0, mastered }) {
  return (
    <span className="notes-box" aria-label={`${mastered ? MASTERED_BOX : box}/${MASTERED_BOX}`}>
      {Array.from({ length: MASTERED_BOX }, (_, i) => <i key={i} className={i < (mastered ? MASTERED_BOX : box) ? 'is-on' : ''} />)}
    </span>
  );
}

function SpeakButton({ speech, text, speechKey, L }) {
  const playing = speech.isPlaying(speechKey);
  const loading = speech.isLoading(speechKey);
  const label = L ? '발음 듣기' : 'Listen';
  return (
    <button type="button" className={`notes-speak${playing ? ' is-playing' : ''}`} onClick={() => speech.play(text, speechKey)} title={label} aria-label={`${label}: ${text}`} aria-pressed={playing}>
      <span aria-hidden="true">{loading ? '···' : playing ? '■' : '▶'}</span>
    </button>
  );
}

function BrowserSpeakButton({ text, L }) {
  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.82;
    const koreanVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang?.toLowerCase().startsWith('ko'));
    if (koreanVoice) utterance.voice = koreanVoice;
    window.speechSynthesis.speak(utterance);
  };
  return <button type="button" className="notes-speak" onClick={speak} aria-label={`${L ? '브라우저 발음 듣기' : 'Browser pronunciation'}: ${text}`} title={L ? '발음 듣기' : 'Listen'}><span aria-hidden="true">▶</span></button>;
}

function VocabPage({ lang = 'ko', selectedTutorId = 'jiwoo', onNavigate, initialMode = 'cards', studyLevel = 'beginner', onStudyLevelChange }) {
  const L = lang === 'ko' ? 1 : 0;
  const { vocab } = useStudyNotes();
  const speech = useTutorSpeech(selectedTutorId);
  const [mode, setMode] = useState(initialMode === 'list' ? 'list' : 'cards');
  const [showEn, setShowEn] = useState(false);
  const [level, setLevel] = useState(VOCAB_LEVELS.some((item) => item.id === studyLevel) ? studyLevel : 'beginner');
  const [theme, setTheme] = useState('kdrama');
  const [routine, setRoutine] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState({});
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [streak, setStreak] = useState(() => loadStreak());
  const pointerStart = useRef(null);

  const plan = useMemo(() => buildVocabSession(vocab), [vocab]);
  const cards = Object.values(vocab);
  const masteredCount = cards.filter((card) => card.mastered).length;
  const learnedToday = cards.filter((card) => card.lastReviewedAt && dayKey(card.lastReviewedAt) === dayKey()).length;
  const current = routine?.words?.[cardIndex] || null;
  const calendar = useMemo(() => streakCalendar(streak), [streak]);

  const chooseLevel = (next) => {
    setLevel(next);
    setRoutine(null);
    setQuiz(null);
    setError('');
    if (next !== 'starter') onStudyLevelChange?.(next);
  };

  const startRoutine = async () => {
    setLoading(true);
    setError('');
    try {
      let generated = loadDailyCache(level, theme);
      if (!generated.length) {
        const controller = new AbortController();
        const timeout = globalThis.setTimeout(() => controller.abort(), 30_000);
        try {
          const response = await fetch('/api/vocabulary/daily-set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
            body: JSON.stringify({ level, theme, exclude: Object.keys(vocab) }),
            signal: controller.signal
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || `서버 응답 ${response.status}`);
          generated = normalizeDailyWords(data.words, { level, theme });
          if (generated.length !== DAILY_WORD_COUNT) throw new Error('단어 5개를 완성하지 못했어요.');
          saveDailyCache(level, theme, generated);
        } finally {
          globalThis.clearTimeout(timeout);
        }
      }
      const words = buildDailySet(vocab, generated, VOCAB_DECK, DAILY_WORD_COUNT);
      words.forEach((word) => addVocabWord(word, vocab[word.w]?.source || 'daily'));
      setRoutine({ words, fallback: false });
    } catch (cause) {
      const fallback = buildDailySet(vocab, [], VOCAB_DECK, DAILY_WORD_COUNT);
      fallback.forEach((word) => addVocabWord(word, vocab[word.w]?.source || 'daily'));
      setRoutine({ words: fallback, fallback: true });
      setError(cause?.name === 'AbortError' ? 'AI 생성 시간이 길어져 기본 단어로 시작해요.' : 'AI 세트를 불러오지 못해 기본 단어로 시작해요.');
    } finally {
      setCardIndex(0);
      setFlipped(false);
      setRatings({});
      setQuiz(null);
      setMode('cards');
      setLoading(false);
    }
  };

  const moveCard = useCallback((step) => {
    if (!routine?.words?.length) return;
    setCardIndex((index) => Math.max(0, Math.min(routine.words.length - 1, index + step)));
    setFlipped(false);
  }, [routine]);

  const beginQuiz = (words = routine?.words || []) => {
    setQuiz({ items: createMicroQuiz(words, level), index: 0, picked: null, score: 0, puzzle: [] });
    setMode('quiz');
  };

  const rateCard = (known) => {
    if (!current || ratings[current.w]) return;
    reviewVocabWord(current.w, known, { logMistake: true });
    const nextRatings = { ...ratings, [current.w]: known ? 'good' : 'again' };
    setRatings(nextRatings);
    const nextUnrated = routine.words.findIndex((word, index) => index > cardIndex && !nextRatings[word.w]);
    const anyUnrated = routine.words.findIndex((word) => !nextRatings[word.w]);
    if (anyUnrated < 0) beginQuiz(routine.words);
    else {
      setCardIndex(nextUnrated >= 0 ? nextUnrated : anyUnrated);
      setFlipped(false);
    }
  };

  useEffect(() => {
    if (mode !== 'cards' || !current) return undefined;
    const onKey = (event) => {
      if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target?.tagName || '')) return;
      if (event.code === 'Space') { event.preventDefault(); setFlipped((value) => !value); }
      if (event.key === 'ArrowLeft') moveCard(-1);
      if (event.key === 'ArrowRight') moveCard(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, current, moveCard]);

  const quizItem = quiz?.items?.[quiz.index] || null;
  const submitQuiz = (answer) => {
    if (!quizItem || quiz.picked) return;
    const correct = answer === quizItem.answer;
    reviewVocabWord(quizItem.word, correct, { logMistake: true });
    setQuiz((state) => ({ ...state, picked: answer, score: state.score + (correct ? 1 : 0) }));
  };
  const nextQuiz = () => {
    if (quiz.index + 1 >= quiz.items.length) {
      setStreak(completeStreak());
      setQuiz((state) => ({ ...state, index: state.items.length, picked: null, puzzle: [] }));
    } else {
      setQuiz((state) => ({ ...state, index: state.index + 1, picked: null, puzzle: [] }));
    }
  };
  const selectPuzzleBlock = (block, index) => {
    if (quiz.picked) return;
    setQuiz((state) => ({ ...state, puzzle: [...state.puzzle, { block, index }] }));
  };

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({ w: '', en: '' });
  const now = Date.now();
  const listed = cards
    .filter((card) => (filter === 'due' ? !card.mastered && card.nextReviewAt <= now : filter === 'mastered' ? card.mastered : filter === 'missed' ? (card.wrong || 0) > 0 : true))
    .filter((card) => !query.trim() || card.w.includes(query.trim()) || (card.en || '').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || b.addedAt - a.addedAt);
  const addOwnWord = (event) => {
    event.preventDefault();
    if (!draft.w.trim()) return;
    addVocabWord({ w: draft.w, en: draft.en }, 'manual');
    setDraft({ w: '', en: '' });
  };

  const tabs = [['cards', L ? '5분 데일리 루틴' : '5-minute routine'], ['quiz', L ? '퀵 테스트' : 'Micro quiz'], ['list', L ? '내 단어장' : 'My words']];
  const done = quiz && quiz.index >= quiz.items.length;

  return (
    <div className="notes-screen vocab-routine-screen" data-screen-label="13 Vocabulary">
      <header className="notes-head">
        <div>
          <h1>{L ? '단어 학습' : 'Vocabulary'}</h1>
          <p>{L ? '하루 5개, 단 5분. 맞춤 단어를 떠올리고 확인한 뒤 3문제 퀴즈로 기억을 굳혀요.' : 'Five words in five minutes. Recall, check, and lock them in with a three-question quiz.'}</p>
          {showEn && L === 1 && <p className="notes-en">Five words in five minutes. Recall, check, and lock them in with a three-question quiz.</p>}
        </div>
        <button type="button" className={`notes-tr-toggle${showEn ? ' is-on' : ''}`} onClick={() => setShowEn((value) => !value)} aria-pressed={showEn}>{showEn ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English')}</button>
      </header>

      <section className="vocab-routine-summary" aria-label={L ? '오늘의 학습 현황' : 'Today’s study status'}>
        <div className="vocab-streak"><span aria-hidden="true">🔥</span><strong>{streak.streak}</strong><span>{L ? '일 연속 학습' : 'day streak'}</span></div>
        <div><strong>{plan.due.filter((card) => (card.wrong || 0) > 0).length}</strong><span>{L ? '취약 단어 대기' : 'weak words due'}</span></div>
        <div><strong>{learnedToday}</strong><span>{L ? '오늘 본 단어' : 'studied today'}</span></div>
        <div><strong>{masteredCount}</strong><span>{L ? '익힌 단어' : 'mastered'}</span></div>
      </section>

      <div className="notes-tabs" role="tablist">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={mode === id} className={mode === id ? 'is-active' : ''} onClick={() => setMode(id)}>{label}</button>)}
      </div>

      {mode === 'cards' && (
        <section className="notes-panel">
          {!routine && (
            <div className="vocab-routine-start">
              <div className="vocab-routine-copy"><span className="notes-badge">5 MIN DAILY</span><h2>{L ? '오늘의 단어 5개를 준비할게요' : 'Let’s prepare today’s five words'}</h2><p>{L ? '레벨과 테마에 맞춘 새 단어 3~5개에, 복습할 취약 단어가 최대 2개 섞여요.' : 'Get 3–5 fresh words for your level and theme, plus up to two weak review words.'}</p></div>
              <div className="vocab-option-group"><strong>{L ? '학습 레벨' : 'Learning level'}</strong><div className="vocab-level-grid">{VOCAB_LEVELS.map((item) => <button type="button" key={item.id} className={level === item.id ? 'is-active' : ''} onClick={() => chooseLevel(item.id)}><b>{L ? item.ko : item.en}</b><span>{L ? item.en : item.detailEn}</span></button>)}</div></div>
              <div className="vocab-option-group"><strong>{L ? '오늘 공부할 테마' : 'Today’s theme'}</strong><div className="vocab-theme-chips">{VOCAB_THEMES.map((item) => <button type="button" key={item.id} className={theme === item.id ? 'is-active' : ''} onClick={() => { setTheme(item.id); setError(''); }}>{L ? item.ko : item.en}</button>)}</div></div>
              <div className="vocab-calendar">{calendar.map((date) => <div key={date.key} className={`${date.stamped ? 'is-stamped' : ''}${date.today ? ' is-today' : ''}`} title={date.key}><span>{date.weekday}</span><b>{date.stamped ? '🔥' : date.day}</b></div>)}</div>
              {error && <p className="vocab-routine-notice" role="status">{error}</p>}
              <button type="button" className="notes-primary vocab-start-button" onClick={startRoutine} disabled={loading}>{loading ? (L ? 'AI가 오늘의 세트를 만드는 중…' : 'AI is building today’s set…') : (L ? '오늘의 5분 루틴 시작' : 'Start today’s 5-minute routine')}</button>
            </div>
          )}
          {routine && current && (
            <div className="vocab-card-wrap">
              <div className="vocab-progress"><span style={{ width: `${(Object.keys(ratings).length / routine.words.length) * 100}%` }} /><b>{Object.keys(ratings).length}/{routine.words.length}</b></div>
              {routine.fallback && <span className="vocab-routine-notice">{L ? 'AI 연결 대신 기본 단어 세트로 학습 중이에요.' : 'Using the built-in set while AI is unavailable.'}</span>}
              <span className="notes-meta">{L ? `${cardIndex + 1}번째 카드 · Space 뒤집기 · ← → 이동` : `Card ${cardIndex + 1} · Space to flip · ← → move`}{Number.isInteger(current.weakStep) && <em className="notes-badge is-hot">{L ? '취약 복습' : 'Weak review'}</em>}</span>
              <div
                className={`vocab-card vocab-daily-card${flipped ? ' is-flipped' : ''}`}
                onPointerDown={(event) => { pointerStart.current = event.clientX; }}
                onPointerUp={(event) => { const delta = event.clientX - (pointerStart.current ?? event.clientX); if (Math.abs(delta) > 50) moveCard(delta < 0 ? 1 : -1); pointerStart.current = null; }}
              >
                {!flipped ? <>
                  <span className="notes-badge">{current.posKo || current.pos || (L ? '표현' : 'expression')}</span>
                  <div className="vocab-card-word"><span lang="ko">{current.w}</span><BrowserSpeakButton text={current.w} L={L} /></div>
                  {current.rom && <span className="vocab-card-rom">[{current.rom}]</span>}
                  <button type="button" className="notes-secondary" onClick={() => setFlipped(true)}>{L ? '뜻과 예문 보기' : 'Show meaning & examples'}</button>
                </> : <div className="vocab-card-back">
                  <strong>{current.en}</strong>
                  {current.ex && <div className="vocab-example-block"><span lang="ko">{current.ex}</span><small>{current.exEn}</small></div>}
                  {current.ex2 && <div className="vocab-example-block"><span lang="ko">{current.ex2}</span><small>{current.ex2En}</small></div>}
                  {(current.tipKo || current.tipEn) && <div className="vocab-ai-tip"><b>✨ {L ? 'AI 원포인트 팁' : 'AI one-point tip'}</b><span>{L ? current.tipKo : (current.tipEn || current.tipKo)}</span>{showEn && L === 1 && current.tipEn && <small>{current.tipEn}</small>}</div>}
                </div>}
              </div>
              <div className="vocab-card-actions">
                <button type="button" className="notes-again" onClick={() => rateCard(false)} disabled={Boolean(ratings[current.w])}>{ratings[current.w] === 'again' ? '✓ ' : ''}{L ? '헷갈려요 · Again' : 'Again'}</button>
                <button type="button" className="notes-primary" onClick={() => rateCard(true)} disabled={Boolean(ratings[current.w])}>{ratings[current.w] === 'good' ? '✓ ' : ''}{L ? '알아요 · Good' : 'Good'}</button>
              </div>
            </div>
          )}
        </section>
      )}

      {mode === 'quiz' && (
        <section className="notes-panel">
          {!routine && <div className="notes-empty"><strong>{L ? '먼저 오늘의 단어 5개를 학습해 주세요' : 'Study today’s five words first'}</strong><button type="button" className="notes-primary" onClick={() => setMode('cards')}>{L ? '5분 루틴 시작' : 'Start routine'}</button></div>}
          {routine && !quiz && <div className="notes-empty"><strong>{L ? '3문제 퀵 테스트로 기억을 확인해요' : 'Check your memory with three quick questions'}</strong><span>{L ? '뜻 맞히기 · 문맥 빈칸 · 문장 완성' : 'Meaning · context blank · sentence puzzle'}</span><button type="button" className="notes-primary" onClick={() => beginQuiz()}>{L ? '퀴즈 시작' : 'Start quiz'}</button></div>}
          {quizItem && <div className="vocab-quiz">
            <span className="notes-meta">{L ? `${quiz.index + 1}/3 · 맞힘 ${quiz.score}` : `${quiz.index + 1}/3 · ${quiz.score} correct`}</span>
            <h2 className="vocab-quiz-prompt">{L ? quizItem.promptKo : quizItem.promptEn}</h2>
            {quizItem.type === 'puzzle' ? <>
              <div className="vocab-puzzle-answer">{quiz.puzzle.map((part) => <span key={`${part.index}-${part.block}`}>{part.block}</span>)}</div>
              <div className="vocab-puzzle-blocks">{quizItem.blocks.map((block, index) => <button type="button" key={`${index}-${block}`} disabled={quiz.puzzle.some((part) => part.index === index) || Boolean(quiz.picked)} onClick={() => selectPuzzleBlock(block, index)}>{block}</button>)}</div>
              {!quiz.picked && <div className="notes-row"><button type="button" className="notes-secondary" onClick={() => setQuiz((state) => ({ ...state, puzzle: [] }))}>{L ? '다시 배열' : 'Reset'}</button><button type="button" className="notes-primary" onClick={() => submitQuiz(quiz.puzzle.map((part) => part.block).join(' '))} disabled={!quiz.puzzle.length}>{L ? '정답 확인' : 'Check'}</button></div>}
            </> : <div className="vocab-choices">{quizItem.choices.map((choice) => { const state = !quiz.picked ? '' : choice === quizItem.answer ? ' is-right' : choice === quiz.picked ? ' is-wrong' : ''; return <button key={choice} type="button" className={`vocab-choice${state}`} onClick={() => submitQuiz(choice)} disabled={Boolean(quiz.picked)}>{choice}</button>; })}</div>}
            {quiz.picked && <div className="vocab-quiz-result"><span className={quiz.picked === quizItem.answer ? 'notes-good' : 'notes-bad'}>{quiz.picked === quizItem.answer ? (L ? '정답이에요!' : 'Correct!') : (L ? `정답: ${quizItem.answer} · 오답 노트에 저장했어요.` : `Answer: ${quizItem.answer} · Saved to mistakes.`)}</span><button type="button" className="notes-primary" onClick={nextQuiz}>{quiz.index + 1 === quiz.items.length ? (L ? '루틴 완료' : 'Finish routine') : (L ? '다음 문제' : 'Next')}</button></div>}
          </div>}
          {done && <div className="vocab-complete"><span className="vocab-complete-fire">🔥</span><h2>{L ? `${streak.streak}일 연속 학습 완료!` : `${streak.streak}-day streak complete!`}</h2><p>{L ? `3문제 중 ${quiz.score}개를 맞혔어요. 헷갈린 단어는 1일·3일·7일 뒤 다시 만나요.` : `${quiz.score} of 3 correct. Weak words return after 1, 3, and 7 days.`}</p><div className="vocab-calendar">{calendar.map((date) => <div key={date.key} className={`${date.stamped ? 'is-stamped' : ''}${date.today ? ' is-today' : ''}`}><span>{date.weekday}</span><b>{date.stamped ? '🔥' : date.day}</b></div>)}</div><div className="notes-row"><button type="button" className="notes-secondary" onClick={() => onNavigate?.('mistakes')}>{L ? '오답 노트 보기' : 'Open mistakes'}</button><button type="button" className="notes-primary" onClick={() => setMode('list')}>{L ? '내 단어장 보기' : 'Open my words'}</button></div></div>}
        </section>
      )}

      {mode === 'list' && (
        <section className="notes-panel">
          <form className="vocab-add" onSubmit={addOwnWord}><input value={draft.w} onChange={(event) => setDraft((value) => ({ ...value, w: event.target.value }))} placeholder={L ? '한국어 단어' : 'Korean word'} aria-label={L ? '한국어 단어' : 'Korean word'} /><input value={draft.en} onChange={(event) => setDraft((value) => ({ ...value, en: event.target.value }))} placeholder={L ? '뜻 (영어)' : 'Meaning (English)'} aria-label={L ? '뜻' : 'Meaning'} /><button type="submit" className="notes-primary" disabled={!draft.w.trim()}>{L ? '단어 추가' : 'Add word'}</button></form>
          <div className="notes-filters">{[['all', L ? '전체' : 'All'], ['due', L ? '복습 필요' : 'Due'], ['missed', L ? '틀린 적 있음' : 'Missed'], ['mastered', L ? '익힘' : 'Mastered']].map(([id, label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}<input className="notes-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={L ? '검색' : 'Search'} aria-label={L ? '단어 검색' : 'Search words'} /></div>
          {!listed.length && <div className="notes-empty"><span>{L ? '아직 단어가 없어요. 데일리 루틴을 시작하거나 읽기에서 단어를 저장해 보세요.' : 'No words yet. Start the daily routine or save words in Reading.'}</span></div>}
          <ul className="vocab-list">{listed.map((card) => <li key={card.w}><div className="vocab-list-main"><span className="vocab-list-word" lang="ko">{card.w}</span>{card.rom && <span className="notes-meta">[{card.rom}]</span>}{showEn ? <span className="vocab-list-en">{card.en || '—'}</span> : <span className="notes-meta">{L ? '뜻은 영어 번역 보기로 확인' : 'Meaning hidden'}</span>}</div><div className="vocab-list-side">{(card.wrong || 0) > 0 && <em className="notes-badge is-hot">{L ? `${card.wrong}번 헷갈림` : `missed ${card.wrong}×`}</em>}<em className="notes-badge">{(SOURCE_LABEL[card.source] || SOURCE_LABEL.manual)[L ? 0 : 1]}</em><BoxDots box={card.box} mastered={card.mastered} /><SpeakButton speech={speech} text={card.w} speechKey={`vocab:${card.w}`} L={L} /><button type="button" className="notes-icon" onClick={() => removeVocabWord(card.w)} aria-label={L ? `${card.w} 삭제` : `Delete ${card.w}`} title={L ? '삭제' : 'Delete'}>✕</button></div></li>)}</ul>
        </section>
      )}
    </div>
  );
}

export default VocabPage;
