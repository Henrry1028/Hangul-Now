import React, { useMemo, useState } from 'react';
import useStudyNotes from '../hooks/useStudyNotes.js';
import useTutorSpeech from '../hooks/useTutorSpeech.js';
import { MASTERED_BOX, MISTAKE_AREAS, MISTAKE_CATEGORIES, buildFocus, deleteMistake, reviewMistake } from '../data/studyNotes.js';
import '../styles/notes.css';

const HANGUL = /[가-힣ㄱ-ㆎ]/;
const AREA_ORDER = ['chat', 'conversation', 'reading', 'listening', 'writing', 'speaking', 'vocab'];
const AREA_PAGE = { chat: 'chat', conversation: 'conversation', reading: 'reading', listening: 'listening', writing: 'writing', speaking: 'speaking', vocab: 'vocab' };

// 영역마다 '무엇을 틀렸는지'를 한 줄로: 질문/원문 · 내 답 → 바른 답
function kindLabel(m, L) {
  if (m.kind === 'quiz') return L ? '문제' : 'Question';
  if (m.kind === 'dictation') return L ? '받아쓰기' : 'Dictation';
  if (m.kind === 'jamo') return L ? '글자' : 'Syllable';
  if (m.kind === 'pronunciation') return L ? '문장' : 'Sentence';
  if (m.kind === 'word') return L ? '단어' : 'Word';
  return L ? '내 문장' : 'My sentence';
}
const wrongLabel = (m, L) => (m.kind === 'pronunciation' ? (L ? '들린 발음' : 'Heard') : m.kind === 'jamo' ? (L ? '누른 키' : 'Pressed') : (L ? '내 답' : 'Mine'));

function MistakeItem({ m, L, showEn, speech, actions = null }) {
  const area = MISTAKE_AREAS[m.area] || MISTAKE_AREAS.chat;
  const cat = MISTAKE_CATEGORIES[m.category];
  const showPrompt = m.prompt && m.prompt !== m.right && m.prompt !== m.wrong;
  const note = L ? (m.noteKo || m.noteEn) : (m.noteEn || m.noteKo);
  return (
    <li className="mistake-item" data-mistake-area={m.area}>
      <div className="mistake-item-top">
        <span className="notes-meta">{area.icon} {area[L ? 'ko' : 'en']}{cat ? ` · ${cat[L ? 'ko' : 'en']}` : ''}</span>
        <span className="mistake-item-badges">
          {m.count > 1 && <em className="notes-badge is-hot">{L ? `${m.count}번 틀림` : `missed ${m.count}×`}</em>}
          {m.mastered && <em className="notes-badge is-good">{L ? '익힘' : 'Mastered'}</em>}
        </span>
      </div>
      {showPrompt && <div className="mistake-prompt"><span className="notes-meta">{kindLabel(m, L)}</span> <span lang="ko">{m.prompt}</span></div>}
      <div className="mistake-diff">
        {m.wrong && <span className="mistake-wrong" title={wrongLabel(m, L)}>{m.wrong}</span>}
        {m.wrong && <span className="notes-meta" aria-hidden="true">→</span>}
        <span className="mistake-right">{m.right}</span>
        {HANGUL.test(m.right) && (
          <button type="button" className={`notes-speak${speech.isPlaying(`mistake:${m.key}`) ? ' is-playing' : ''}`} onClick={() => speech.play(m.right, `mistake:${m.key}`)} aria-label={`${L ? '바른 답 듣기' : 'Listen to the answer'}: ${m.right}`} title={L ? '바른 답 듣기' : 'Listen'}>
            <span aria-hidden="true">{speech.isLoading(`mistake:${m.key}`) ? '···' : speech.isPlaying(`mistake:${m.key}`) ? '■' : '▶'}</span>
          </button>
        )}
      </div>
      {note && <p className="mistake-note">💡 {note}</p>}
      {showEn && L === 1 && m.noteEn && m.noteEn !== note && <p className="notes-en" lang="en">{m.noteEn}</p>}
      {actions}
    </li>
  );
}

// 오답 노트: 모든 학습 영역에서 틀린 내용을 모아 오늘의 오답 · 집중 복습 · 전체 오답으로 보여 준다.
function MistakesPage({ lang = 'ko', selectedTutorId = 'jiwoo', onNavigate }) {
  const L = lang === 'ko' ? 1 : 0;
  const { mistakes } = useStudyNotes();
  const speech = useTutorSpeech(selectedTutorId);
  const focus = useMemo(() => buildFocus(mistakes), [mistakes]);
  const [tab, setTab] = useState(focus.today.length ? 'today' : 'focus');
  const [showEn, setShowEn] = useState(false);
  const [areaFilter, setAreaFilter] = useState('all');

  // 집중 복습: 시작할 때 순서를 고정한다 (복습 결과로 점수가 바뀌어도 화면이 뒤섞이지 않게)
  const [review, setReview] = useState(null);
  const startReview = () => setReview({ keys: focus.queue.map((m) => m.key), i: 0, revealed: false, right: 0 });
  const reviewItem = review ? mistakes[review.keys[review.i]] : null;
  const grade = (correct) => {
    reviewMistake(reviewItem.key, correct);
    setReview((r) => ({ ...r, i: r.i + 1, revealed: false, right: r.right + (correct ? 1 : 0) }));
  };

  const todayByArea = AREA_ORDER
    .map((area) => ({ area, items: focus.today.filter((m) => m.area === area) }))
    .filter((g) => g.items.length);
  const allList = focus.ranked.concat(Object.values(mistakes).filter((m) => m.mastered))
    .filter((m) => areaFilter === 'all' || m.area === areaFilter);
  const maxWeak = focus.weakCategories[0]?.count || 1;

  const tabs = [
    ['today', L ? `오늘의 오답 ${focus.today.length}` : `Today ${focus.today.length}`],
    ['focus', L ? `집중 복습 ${focus.dueCount}` : `Focus review ${focus.dueCount}`],
    ['all', L ? '전체 오답' : 'All mistakes']
  ];

  return (
    <div className="notes-screen" data-screen-label="14 Mistake Notes">
      <header className="notes-head">
        <div>
          <h1>{L ? '오답 노트' : 'Mistake Notes'}</h1>
          <p>{L ? '튜터 채팅·회화·읽기·듣기·쓰기·말하기·단어에서 틀린 내용이 자동으로 모여요. 자주, 최근에 틀린 것부터 집중 복습해요.' : 'Mistakes from chat, conversation, reading, listening, writing, speaking and words are collected automatically. Review what you miss most and most recently first.'}</p>
          {showEn && L === 1 && <p className="notes-en">Mistakes from every area are collected automatically. Review what you miss most and most recently first.</p>}
        </div>
        <button type="button" className={`notes-tr-toggle${showEn ? ' is-on' : ''}`} onClick={() => setShowEn((v) => !v)} aria-pressed={showEn}>
          {showEn ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English')}
        </button>
      </header>

      <div className="notes-stats">
        <div><strong>{focus.today.length}</strong><span>{L ? '오늘 틀린 내용' : 'Missed today'}</span></div>
        <div><strong>{focus.dueCount}</strong><span>{L ? '지금 복습할 차례' : 'Due now'}</span></div>
        <div><strong>{focus.total - focus.masteredCount}</strong><span>{L ? '아직 익히는 중' : 'Still learning'}</span></div>
        <div><strong>{focus.masteredCount}</strong><span>{L ? '익힌 오답' : 'Mastered'}</span></div>
      </div>

      {focus.weakCategories.length > 0 && (
        <section className="notes-panel">
          <h2 className="notes-h2">{L ? '자주 틀리는 유형' : 'Your weak spots'}</h2>
          <ul className="weak-list">
            {focus.weakCategories.slice(0, 5).map((w) => (
              <li key={w.id}>
                <span>{MISTAKE_CATEGORIES[w.id]?.[L ? 'ko' : 'en'] || w.id}</span>
                <span className="weak-bar"><i style={{ width: `${Math.round((w.count / maxWeak) * 100)}%` }} /></span>
                <span className="notes-meta">{L ? `${w.count}회 · ${w.share}%` : `${w.count} · ${w.share}%`}</span>
              </li>
            ))}
          </ul>
          <p className="notes-meta">{L ? '같은 유형이 쌓일수록 그 유형의 오답이 집중 복습 앞쪽으로 올라오고, 튜터 채팅에서도 자연스럽게 다시 연습하게 돼요.' : 'The more a type piles up, the earlier its mistakes come in focus review — and your chat tutor works them back into conversation.'}</p>
        </section>
      )}

      <div className="notes-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'today' && (
        <section className="notes-panel">
          {!todayByArea.length && <div className="notes-empty"><strong>{L ? '오늘은 아직 틀린 내용이 없어요' : 'No mistakes yet today'}</strong><span>{L ? '학습하다 틀리거나 교정을 받으면 여기에 바로 모여요.' : 'Anything you miss or get corrected on today shows up here.'}</span></div>}
          {todayByArea.map((g) => (
            <div key={g.area} className="mistake-group">
              <div className="mistake-group-head">
                <h2 className="notes-h2">{MISTAKE_AREAS[g.area].icon} {MISTAKE_AREAS[g.area][L ? 'ko' : 'en']} <span className="notes-meta">{L ? `${g.items.length}개` : g.items.length}</span></h2>
                <button type="button" className="notes-link" onClick={() => onNavigate?.(AREA_PAGE[g.area])}>{L ? '다시 연습하기 →' : 'Practice again →'}</button>
              </div>
              <ul className="mistake-list">{g.items.map((m) => <MistakeItem key={m.key} m={m} L={L} showEn={showEn} speech={speech} />)}</ul>
            </div>
          ))}
        </section>
      )}

      {tab === 'focus' && (
        <section className="notes-panel">
          {!review && (
            <div className="notes-empty">
              <strong>{focus.queue.length ? (L ? `집중 복습할 오답 ${focus.queue.length}개` : `${focus.queue.length} mistakes to focus on`) : (L ? '지금 복습할 오답이 없어요 🎉' : 'Nothing due right now 🎉')}</strong>
              <span>{L ? '여러 번 틀린 것 · 최근에 틀린 것 · 자주 틀리는 유형 순서로 자동 정렬돼요. 맞히면 다음 복습이 1일 → 3일 → 7일 → 14일 → 30일 뒤로 미뤄지고, 끝까지 맞히면 익힘으로 넘어가요.' : 'Sorted by repeats, recency and weak type. Each correct review pushes the next one back (1 → 3 → 7 → 14 → 30 days) until it is mastered.'}</span>
              {focus.queue.length > 0 && <button type="button" className="notes-primary" onClick={startReview}>{L ? '집중 복습 시작' : 'Start focus review'}</button>}
            </div>
          )}
          {review && reviewItem && (
            <div className="mistake-review">
              <span className="notes-meta">{L ? `남은 오답 ${review.keys.length - review.i}개` : `${review.keys.length - review.i} left`}</span>
              <div className="mistake-review-card">
                <span className="notes-meta">{MISTAKE_AREAS[reviewItem.area]?.icon} {MISTAKE_AREAS[reviewItem.area]?.[L ? 'ko' : 'en']} · {MISTAKE_CATEGORIES[reviewItem.category]?.[L ? 'ko' : 'en']}</span>
                {reviewItem.prompt && reviewItem.prompt !== reviewItem.right && <div className="mistake-prompt"><span className="notes-meta">{kindLabel(reviewItem, L)}</span> <span lang="ko">{reviewItem.prompt}</span></div>}
                {reviewItem.wrong && <div className="mistake-diff"><span className="mistake-wrong">{reviewItem.wrong}</span></div>}
                <strong className="mistake-review-q">{L ? '바른 답을 떠올려 보세요' : 'Recall the correct answer'}</strong>
                {review.revealed ? (
                  <div className="mistake-answer">
                    <div className="mistake-diff">
                      <span className="mistake-right">{reviewItem.right}</span>
                      {HANGUL.test(reviewItem.right) && (
                        <button type="button" className={`notes-speak${speech.isPlaying(`mistake:${reviewItem.key}`) ? ' is-playing' : ''}`} onClick={() => speech.play(reviewItem.right, `mistake:${reviewItem.key}`)} aria-label={`${L ? '바른 답 듣기' : 'Listen to the answer'}: ${reviewItem.right}`}>
                          <span aria-hidden="true">{speech.isPlaying(`mistake:${reviewItem.key}`) ? '■' : '▶'}</span>
                        </button>
                      )}
                    </div>
                    {(L ? reviewItem.noteKo || reviewItem.noteEn : reviewItem.noteEn || reviewItem.noteKo) && <p className="mistake-note">💡 {L ? reviewItem.noteKo || reviewItem.noteEn : reviewItem.noteEn || reviewItem.noteKo}</p>}
                    {showEn && L === 1 && reviewItem.noteEn && reviewItem.noteKo && <p className="notes-en" lang="en">{reviewItem.noteEn}</p>}
                    {reviewItem.count > 1 && <em className="notes-badge is-hot">{L ? `${reviewItem.count}번 틀렸던 내용` : `missed ${reviewItem.count}×`}</em>}
                  </div>
                ) : (
                  <button type="button" className="notes-secondary" onClick={() => setReview((r) => ({ ...r, revealed: true }))}>{L ? '정답 보기' : 'Show answer'}</button>
                )}
              </div>
              {review.revealed && (
                <div className="vocab-card-actions">
                  <button type="button" className="notes-again" onClick={() => grade(false)}>{L ? '또 틀렸어요' : 'Missed it'}</button>
                  <button type="button" className="notes-primary" onClick={() => grade(true)}>{L ? '맞혔어요' : 'Got it'}</button>
                </div>
              )}
            </div>
          )}
          {review && !reviewItem && (
            <div className="notes-empty">
              <strong>{L ? `집중 복습 완료! ${review.keys.length}개 중 ${review.right}개 맞힘` : `Done! ${review.right} of ${review.keys.length} correct`}</strong>
              <span>{L ? '틀린 것은 다시 맨 앞 상자로 돌아가 곧 다시 나와요.' : 'Missed items go back to the first box and come back soon.'}</span>
              <button type="button" className="notes-primary" onClick={() => setReview(null)}>{L ? '확인' : 'OK'}</button>
            </div>
          )}
        </section>
      )}

      {tab === 'all' && (
        <section className="notes-panel">
          <div className="notes-filters">
            {['all', ...AREA_ORDER].map((id) => (
              <button key={id} type="button" className={areaFilter === id ? 'is-active' : ''} onClick={() => setAreaFilter(id)}>
                {id === 'all' ? (L ? '전체' : 'All') : `${MISTAKE_AREAS[id].icon} ${MISTAKE_AREAS[id][L ? 'ko' : 'en']}`}
              </button>
            ))}
          </div>
          {!allList.length && <div className="notes-empty"><span>{L ? '아직 모인 오답이 없어요.' : 'No mistakes collected yet.'}</span></div>}
          <ul className="mistake-list">
            {allList.map((m) => (
              <MistakeItem
                key={m.key}
                m={m}
                L={L}
                showEn={showEn}
                speech={speech}
                actions={(
                  <div className="mistake-item-foot">
                    <span className="notes-box" aria-label={L ? `복습 단계 ${m.mastered ? MASTERED_BOX : m.box}` : `Review stage ${m.mastered ? MASTERED_BOX : m.box}`}>
                      {Array.from({ length: MASTERED_BOX }, (_, i) => <i key={i} className={i < (m.mastered ? MASTERED_BOX : m.box) ? 'is-on' : ''} />)}
                    </span>
                    <button type="button" className="notes-icon" onClick={() => deleteMistake(m.key)} aria-label={L ? '이 오답 삭제' : 'Delete this mistake'} title={L ? '삭제' : 'Delete'}>✕</button>
                  </div>
                )}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default MistakesPage;
