import React, { useMemo, useRef, useState } from 'react';
import useStudyNotes from '../hooks/useStudyNotes.js';
import useTutorSpeech from '../hooks/useTutorSpeech.js';
import { VOCAB_DECK, VOCAB_TOPICS } from '../data/vocabDeck.js';
import {
  MASTERED_BOX,
  NEW_WORDS_PER_DAY,
  addVocabWord,
  buildVocabSession,
  dayKey,
  meaningChoices,
  removeVocabWord,
  reviewVocabWord
} from '../data/studyNotes.js';
import '../styles/notes.css';

const DECK_MAP = Object.fromEntries(VOCAB_DECK.map((d) => [d.w, d]));
const QUIZ_SIZE = 10;
const SOURCE_LABEL = {
  starter: ['기본 단어', 'Starter'], reading: ['읽기에서 저장', 'From reading'], manual: ['직접 추가', 'Added by me']
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

// 단어 학습: 오늘의 카드(복습 + 새 단어) → 뜻 맞히기 퀴즈 → 내 단어장. 모르는 단어는 오답 노트로 들어간다.
function VocabPage({ lang = 'ko', selectedTutorId = 'jiwoo', onNavigate }) {
  const L = lang === 'ko' ? 1 : 0;
  const { vocab } = useStudyNotes();
  const speech = useTutorSpeech(selectedTutorId);
  const [mode, setMode] = useState('cards');
  const [showEn, setShowEn] = useState(false);

  const plan = useMemo(() => buildVocabSession(vocab), [vocab]);
  const cards = Object.values(vocab);
  const masteredCount = cards.filter((c) => c.mastered).length;
  const learnedToday = cards.filter((c) => c.lastReviewedAt && dayKey(c.lastReviewedAt) === dayKey()).length;

  // ── 플래시카드: 세션 시작 시 목록을 고정해 복습 중에 순서가 바뀌지 않게 한다 ──
  const [session, setSession] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ known: 0, unknown: 0 });
  const repeatedRef = useRef(new Set());
  const startCards = () => {
    repeatedRef.current = new Set();
    setSession([...plan.due.map((c) => c.w), ...plan.fresh.map((d) => d.w)]);
    setFlipped(false);
    setTally({ known: 0, unknown: 0 });
  };
  const current = session?.[0] ? (vocab[session[0]] || DECK_MAP[session[0]]) : null;
  const answerCard = (known) => {
    if (!current) return;
    const isNew = !vocab[current.w];
    if (isNew) addVocabWord(current, 'starter');
    reviewVocabWord(current.w, known, { logMistake: !isNew });
    setTally((t) => ({ known: t.known + (known ? 1 : 0), unknown: t.unknown + (known ? 0 : 1) }));
    // 모르는 카드는 이번 세션 끝에 한 번만 더 보여 준다
    const again = !known && !repeatedRef.current.has(current.w);
    if (again) repeatedRef.current.add(current.w);
    setSession((list) => (again ? [...list.slice(1), list[0]] : list.slice(1)));
    setFlipped(false);
  };

  // ── 뜻 맞히기 퀴즈: 약한 단어(많이 틀림·낮은 상자)부터 ──
  const [quiz, setQuiz] = useState(null);
  const startQuiz = () => {
    const pool = cards.filter((c) => c.en).sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || (a.box || 0) - (b.box || 0)).slice(0, QUIZ_SIZE);
    const seed = Number(dayKey().replace(/-/g, '')) + cards.length;
    const distractors = [...VOCAB_DECK, ...cards];
    setQuiz({ items: pool.map((c, i) => ({ w: c.w, en: c.en, choices: meaningChoices(c, distractors, seed + i) })), i: 0, picked: null, score: 0 });
  };
  const pickChoice = (choice) => {
    if (!quiz || quiz.picked != null) return;
    const item = quiz.items[quiz.i];
    const correct = choice === item.en;
    reviewVocabWord(item.w, correct);
    setQuiz({ ...quiz, picked: choice, score: quiz.score + (correct ? 1 : 0) });
  };
  const nextQuiz = () => setQuiz((q) => ({ ...q, i: q.i + 1, picked: null }));

  // ── 내 단어장 ──
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({ w: '', en: '' });
  const now = Date.now();
  const listed = cards
    .filter((c) => (filter === 'due' ? !c.mastered && c.nextReviewAt <= now : filter === 'mastered' ? c.mastered : filter === 'missed' ? (c.wrong || 0) > 0 : true))
    .filter((c) => !query.trim() || c.w.includes(query.trim()) || (c.en || '').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || b.addedAt - a.addedAt);
  const addOwnWord = (e) => {
    e.preventDefault();
    if (!draft.w.trim()) return;
    addVocabWord({ w: draft.w, en: draft.en }, 'manual');
    setDraft({ w: '', en: '' });
  };

  const tabs = [['cards', L ? '오늘의 카드' : "Today's cards"], ['quiz', L ? '뜻 맞히기' : 'Meaning quiz'], ['list', L ? '내 단어장' : 'My words']];
  const quizItem = quiz && quiz.items[quiz.i];

  return (
    <div className="notes-screen" data-screen-label="13 Vocabulary">
      <header className="notes-head">
        <div>
          <h1>{L ? '단어 학습' : 'Vocabulary'}</h1>
          <p>{L ? '매일 새 단어를 조금씩 익히고, 잊을 때쯤 다시 복습해요. 모르는 단어는 오답 노트로 모여요.' : 'Learn a few new words every day and review them right before you forget. Missed words go to your mistake notes.'}</p>
          {showEn && L === 1 && <p className="notes-en">Learn a few new words every day and review them right before you forget. Missed words go to your mistake notes.</p>}
        </div>
        <button type="button" className={`notes-tr-toggle${showEn ? ' is-on' : ''}`} onClick={() => setShowEn((v) => !v)} aria-pressed={showEn}>
          {showEn ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English')}
        </button>
      </header>

      <div className="notes-stats">
        <div><strong>{plan.due.length}</strong><span>{L ? '복습할 단어' : 'Due for review'}</span></div>
        <div><strong>{plan.fresh.length}</strong><span>{L ? `오늘의 새 단어 (하루 ${NEW_WORDS_PER_DAY}개)` : `New today (${NEW_WORDS_PER_DAY}/day)`}</span></div>
        <div><strong>{learnedToday}</strong><span>{L ? '오늘 본 단어' : 'Studied today'}</span></div>
        <div><strong>{masteredCount}</strong><span>{L ? '익힌 단어' : 'Mastered'}</span></div>
      </div>

      <div className="notes-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} className={mode === id ? 'is-active' : ''} onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>

      {mode === 'cards' && (
        <section className="notes-panel">
          {!session && (
            <div className="notes-empty">
              <strong>{plan.due.length + plan.fresh.length > 0
                ? (L ? `오늘 볼 카드 ${plan.due.length + plan.fresh.length}장` : `${plan.due.length + plan.fresh.length} cards for today`)
                : (L ? '오늘 볼 카드를 모두 마쳤어요 🎉' : 'All cards done for today 🎉')}</strong>
              <span>{L ? '복습할 단어를 먼저, 그다음 새 단어를 보여 줘요. 이미 배운 단어는 새 단어로 다시 나오지 않아요.' : 'Reviews first, then new words. Words you already learned never come back as “new”.'}</span>
              {plan.due.length + plan.fresh.length > 0 && <button type="button" className="notes-primary" onClick={startCards}>{L ? '카드 시작하기' : 'Start cards'}</button>}
            </div>
          )}
          {session && current && (
            <div className="vocab-card-wrap">
              <span className="notes-meta">{L ? `남은 카드 ${session.length}장` : `${session.length} cards left`}{!vocab[current.w] && <em className="notes-badge">{L ? '새 단어' : 'New'}</em>}</span>
              <div className={`vocab-card${flipped ? ' is-flipped' : ''}`}>
                <div className="vocab-card-word">
                  <span lang="ko">{current.w}</span>
                  <SpeakButton speech={speech} text={current.w} speechKey={`vocab:${current.w}`} L={L} />
                </div>
                {current.rom && <span className="vocab-card-rom">[{current.rom}]</span>}
                {flipped ? (
                  <div className="vocab-card-back">
                    <strong>{current.en}</strong>
                    {current.pos && <span className="notes-meta">{current.pos}{current.topic && VOCAB_TOPICS[current.topic] ? ` · ${VOCAB_TOPICS[current.topic][L ? 'ko' : 'en']}` : ''}</span>}
                    {current.ex && (
                      <div className="vocab-card-ex">
                        <span lang="ko">{current.ex}</span>
                        <SpeakButton speech={speech} text={current.ex} speechKey={`vocab-ex:${current.w}`} L={L} />
                      </div>
                    )}
                    {current.exEn && <span className="notes-en">{current.exEn}</span>}
                  </div>
                ) : (
                  <button type="button" className="notes-secondary" onClick={() => setFlipped(true)}>{L ? '뜻 보기' : 'Show meaning'}</button>
                )}
              </div>
              <div className="vocab-card-actions">
                <button type="button" className="notes-again" onClick={() => answerCard(false)}>{L ? '몰라요 · 다시 볼래요' : "Didn't know"}</button>
                <button type="button" className="notes-primary" onClick={() => answerCard(true)}>{L ? '알아요' : 'I knew it'}</button>
              </div>
            </div>
          )}
          {session && !current && (
            <div className="notes-empty">
              <strong>{L ? '오늘 카드 완료! 🎉' : 'Cards done! 🎉'}</strong>
              <span>{L ? `알았던 카드 ${tally.known}번 · 다시 본 카드 ${tally.unknown}번. 모른 단어는 오답 노트에 담겼어요.` : `Knew ${tally.known} · Repeated ${tally.unknown}. Missed words were added to your mistake notes.`}</span>
              <div className="notes-row">
                <button type="button" className="notes-primary" onClick={() => { setMode('quiz'); startQuiz(); }}>{L ? '뜻 맞히기로 확인' : 'Check with a quiz'}</button>
                {tally.unknown > 0 && <button type="button" className="notes-secondary" onClick={() => onNavigate?.('mistakes')}>{L ? '오답 노트 보기' : 'Open mistake notes'}</button>}
              </div>
            </div>
          )}
        </section>
      )}

      {mode === 'quiz' && (
        <section className="notes-panel">
          {cards.length < 4 && (
            <div className="notes-empty">
              <strong>{L ? '퀴즈를 하려면 단어 카드가 4장 이상 필요해요' : 'You need at least 4 cards for a quiz'}</strong>
              <button type="button" className="notes-primary" onClick={() => setMode('cards')}>{L ? '오늘의 카드부터 보기' : "Start today's cards"}</button>
            </div>
          )}
          {cards.length >= 4 && !quiz && (
            <div className="notes-empty">
              <strong>{L ? `약한 단어부터 ${Math.min(QUIZ_SIZE, cards.length)}문제` : `${Math.min(QUIZ_SIZE, cards.length)} questions, weakest words first`}</strong>
              <span>{L ? '자주 틀린 단어와 아직 덜 익힌 단어가 먼저 나와요.' : 'Words you miss often and have not mastered come first.'}</span>
              <button type="button" className="notes-primary" onClick={startQuiz}>{L ? '퀴즈 시작' : 'Start quiz'}</button>
            </div>
          )}
          {quizItem && (
            <div className="vocab-quiz">
              <span className="notes-meta">{L ? `남은 문제 ${quiz.items.length - quiz.i}개 · 맞힘 ${quiz.score}` : `${quiz.items.length - quiz.i} left · ${quiz.score} correct`}</span>
              <div className="vocab-card-word"><span lang="ko">{quizItem.w}</span><SpeakButton speech={speech} text={quizItem.w} speechKey={`vocab:${quizItem.w}`} L={L} /></div>
              <span className="notes-meta">{L ? '알맞은 뜻을 고르세요' : 'Choose the meaning'}</span>
              <div className="vocab-choices">
                {quizItem.choices.map((c) => {
                  const state = quiz.picked == null ? '' : c === quizItem.en ? ' is-right' : c === quiz.picked ? ' is-wrong' : '';
                  return <button key={c} type="button" className={`vocab-choice${state}`} onClick={() => pickChoice(c)} disabled={quiz.picked != null}>{c}</button>;
                })}
              </div>
              {quiz.picked != null && (
                <div className="notes-row">
                  <span className={quiz.picked === quizItem.en ? 'notes-good' : 'notes-bad'}>{quiz.picked === quizItem.en ? (L ? '정답이에요!' : 'Correct!') : (L ? '오답 노트에 담았어요' : 'Added to mistake notes')}</span>
                  <button type="button" className="notes-primary" onClick={nextQuiz}>{L ? '다음' : 'Next'}</button>
                </div>
              )}
            </div>
          )}
          {quiz && !quizItem && (
            <div className="notes-empty">
              <strong>{L ? `${quiz.items.length}문제 중 ${quiz.score}개 맞혔어요` : `${quiz.score} of ${quiz.items.length} correct`}</strong>
              <div className="notes-row">
                <button type="button" className="notes-primary" onClick={startQuiz}>{L ? '한 번 더' : 'Again'}</button>
                <button type="button" className="notes-secondary" onClick={() => onNavigate?.('mistakes')}>{L ? '오답 노트 보기' : 'Open mistake notes'}</button>
              </div>
            </div>
          )}
        </section>
      )}

      {mode === 'list' && (
        <section className="notes-panel">
          <form className="vocab-add" onSubmit={addOwnWord}>
            <input value={draft.w} onChange={(e) => setDraft((d) => ({ ...d, w: e.target.value }))} placeholder={L ? '한국어 단어' : 'Korean word'} aria-label={L ? '한국어 단어' : 'Korean word'} />
            <input value={draft.en} onChange={(e) => setDraft((d) => ({ ...d, en: e.target.value }))} placeholder={L ? '뜻 (영어)' : 'Meaning (English)'} aria-label={L ? '뜻' : 'Meaning'} />
            <button type="submit" className="notes-primary" disabled={!draft.w.trim()}>{L ? '단어 추가' : 'Add word'}</button>
          </form>
          <div className="notes-filters">
            {[['all', L ? '전체' : 'All'], ['due', L ? '복습 필요' : 'Due'], ['missed', L ? '틀린 적 있음' : 'Missed'], ['mastered', L ? '익힘' : 'Mastered']].map(([id, label]) => (
              <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>
            ))}
            <input className="notes-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L ? '검색' : 'Search'} aria-label={L ? '단어 검색' : 'Search words'} />
          </div>
          {!listed.length && <div className="notes-empty"><span>{L ? '아직 단어가 없어요. 오늘의 카드를 보거나 읽기 독해에서 단어를 저장해 보세요.' : 'No words yet. Start today’s cards or save words in Reading.'}</span></div>}
          <ul className="vocab-list">
            {listed.map((c) => (
              <li key={c.w}>
                <div className="vocab-list-main">
                  <span className="vocab-list-word" lang="ko">{c.w}</span>
                  {c.rom && <span className="notes-meta">[{c.rom}]</span>}
                  {showEn ? <span className="vocab-list-en">{c.en || '—'}</span> : <span className="notes-meta">{L ? '뜻은 영어 번역 보기로 확인' : 'Meaning hidden'}</span>}
                </div>
                <div className="vocab-list-side">
                  {(c.wrong || 0) > 0 && <em className="notes-badge is-hot">{L ? `${c.wrong}번 틀림` : `missed ${c.wrong}×`}</em>}
                  <em className="notes-badge">{(SOURCE_LABEL[c.source] || SOURCE_LABEL.manual)[L ? 0 : 1]}</em>
                  <BoxDots box={c.box} mastered={c.mastered} />
                  <SpeakButton speech={speech} text={c.w} speechKey={`vocab:${c.w}`} L={L} />
                  <button type="button" className="notes-icon" onClick={() => removeVocabWord(c.w)} aria-label={L ? `${c.w} 삭제` : `Delete ${c.w}`} title={L ? '삭제' : 'Delete'}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default VocabPage;
