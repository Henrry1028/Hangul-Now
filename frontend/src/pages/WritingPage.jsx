import React, { useCallback, useEffect, useRef } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { loadLearnedTopics, recordLearnedTopic } from '../data/learnedData.js';
import {
  HAND_IMAGE,
  JAMO_KEY_MAP,
  JAMO_SEQ,
  JEONG_POSES,
  JL,
  JT_ALL,
  JT_EXTRA,
  JV,
  KB_MAP,
  KB_SVG_ROWS,
  TARGETS_BY_LEVEL,
  WORDS_BY_LEVEL,
  WRITING_TEXT,
  decompSyl,
  getHangulPron,
  jamoHint
} from '../data/writingData.js';
import '../styles/writing.css';

// Date-seeded shuffle: same order within a day, a new order the next day.
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = (seed >>> 0) || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function todaySeed() {
  const d = new Date();
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
}

// Not-yet-learned items first; review mode shows learned items only (oldest first).
function orderByHistory(type, candidates, keyOf, review) {
  const learned = loadLearnedTopics(type);
  const fresh = [];
  const seen = [];
  for (const c of candidates) (learned[keyOf(c)] ? seen : fresh).push(c);
  if (review) return seen.length ? seen.slice().sort((a, b) => (learned[keyOf(a)]?.lastAt || 0) - (learned[keyOf(b)]?.lastAt || 0)) : candidates;
  if (fresh.length) return seededShuffle(fresh, todaySeed());
  return seen.slice().sort((a, b) => (learned[keyOf(a)]?.lastAt || 0) - (learned[keyOf(b)]?.lastAt || 0));
}

function getTarget(st) {
  const review = !!st.reviewMode;
  if (st.wTab === 'word') {
    const all = WORDS_BY_LEVEL[st.jLevel] || WORDS_BY_LEVEL[1];
    const list = orderByHistory('word', all, (w) => w.w, review);
    const wd = list[st.wi % list.length];
    const si = Math.min(st.si, wd.w.length - 1);
    const d = decompSyl(wd.w[si]);
    return { ...d, ch: wd.w[si], en: wd.en, hint: jamoHint(d), word: wd.w, si };
  }
  const all = TARGETS_BY_LEVEL[st.jLevel] || TARGETS_BY_LEVEL[1];
  const list = orderByHistory('syllable', all, (t) => t.ch, review);
  return list[st.ti % list.length];
}

function isComplete(st) {
  const tg = getTarget(st);
  return st.L === tg.L && st.V === tg.V && (st.T || 0) === tg.T;
}

// Celebration only when a syllable (or the last syllable of a word) is complete.
function isCelebrating(st) {
  if (!isComplete(st)) return false;
  if (st.wTab !== 'word') return true;
  const tg = getTarget(st);
  return tg.si + 1 >= tg.word.length;
}

// Next keystroke: { stage, jamo, value, compound?, part? }, or null when complete.
function nextStroke(st) {
  if (isComplete(st)) return null;
  const tg = getTarget(st);
  const chOf = (arr, v) => arr.find((j) => j[1] === v)?.[0];
  const idxOf = (arr, ch) => arr.find((j) => j[0] === ch)?.[1];
  const stepOf = (stage, arr, cur, want) => {
    const full = chOf(arr, want);
    const seq = JAMO_SEQ[full];
    if (cur == null) return seq ? { stage, jamo: seq[0], value: idxOf(arr, seq[0]), compound: full, part: 1 } : { stage, jamo: full, value: want };
    if (seq && cur === idxOf(arr, seq[0])) return { stage, jamo: seq[1], value: want, compound: full, part: 2 };
    return null;
  };
  if (st.L == null) return { stage: 'L', jamo: chOf(JL, tg.L), value: tg.L };
  if (st.V !== tg.V) { const r = stepOf('V', JV, st.V, tg.V); if (r) return r; }
  if (tg.T > 0 && st.T !== tg.T) { const r = stepOf('T', JT_ALL, st.T, tg.T); if (r) return r; }
  return null;
}

const isBuildTab = (st) => st.wTab === 'jamo' || st.wTab === 'word';

const kbdStyle = { background: 'var(--seg)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--line)', fontSize: '11px' };
const guideCardStyle = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' };
const guideStepStyle = { fontSize: '11px', fontWeight: 700, color: 'var(--accent)' };
const guideTitleStyle = { fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' };
const guideBodyStyle = { fontSize: '12.5px', color: 'var(--sub)', lineHeight: 1.5 };
const delStyle = { color: 'var(--hot)' };
const insStyle = { color: 'var(--accent-ink)', textDecoration: 'none', background: 'var(--accent-soft)', padding: '0 2px' };
const feedbackNoteStyle = { background: 'var(--hot-soft)', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14.5px', lineHeight: 1.6 };

// Legacy wraps every {{ }} text interpolation in an inline <span class="sc-interp">.
// Desktop Writing CSS uses generic descendant span selectors that also match these wrappers.
function Interp({ children }) {
  return <span className="sc-interp">{children}</span>;
}

function GuideCard({ step, title, children }) {
  return (
    <div style={guideCardStyle}>
      <span style={guideStepStyle}>{step}</span>
      <span style={guideTitleStyle}>{title}</span>
      <span style={guideBodyStyle}>{children}</span>
    </div>
  );
}

function HandImage({ side, active, target, opacity }) {
  const hand = HAND_IMAGE[side];
  const homeTip = active ? hand.tips[active] : null;
  const dx = target && homeTip ? target[0] - homeTip[0] : 0;
  const dy = target && homeTip ? target[1] - homeTip[1] : 0;
  return (
    <image
      className="hand-layer"
      href={hand.src}
      x={hand.x}
      y={hand.y}
      width={hand.width}
      height={hand.height}
      preserveAspectRatio="xMidYMid meet"
      opacity={opacity}
      transform={`translate(${dx.toFixed(1)} ${dy.toFixed(1)})`}
    />
  );
}

function WritingPage({ lang = 'ko', selectedTutorId = 'jiwoo', writingState, onWritingStateChange, onRecordActivity }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = WRITING_TEXT[lang] || WRITING_TEXT.en;
  const s = writingState;

  const stateRef = useRef(writingState);
  stateRef.current = writingState;
  const autoNextRef = useRef(null);

  const update = useCallback((patch) => {
    const current = stateRef.current;
    const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
    stateRef.current = next;
    onWritingStateChange(next);
  }, [onWritingStateChange]);

  const clearAutoNext = () => {
    clearTimeout(autoNextRef.current);
    autoNextRef.current = null;
  };

  const recordLearn = (type, key, label) => {
    if (!key) return;
    recordLearnedTopic(type, key, label);
    update((st) => ({ learnedTick: (st.learnedTick || 0) + 1 }));
  };

  const backspaceJamo = () => {
    update({ isKeyError: false });
    const st = stateRef.current;
    if (st.T != null) update({ T: null });
    else if (st.V != null) update({ V: null });
    else if (st.L != null) update({ L: null });
  };

  const resetTarget = () => update({ L: null, V: null, T: null, isKeyError: false });

  // Manual move (Next button / Enter): next syllable, or next word in word mode.
  const nextTarget = () => {
    clearAutoNext();
    update((st) => (st.wTab === 'word'
      ? { wi: st.wi + 1, si: 0, L: null, V: null, T: null, isKeyError: false }
      : { ti: st.ti + 1, L: null, V: null, T: null, isKeyError: false }));
  };

  // Auto move after completion: next syllable of the word, or the next target.
  const advance = () => {
    const st = stateRef.current;
    const done = getTarget(st);
    if (st.wTab === 'word') {
      if (done.si + 1 >= done.word.length) {
        recordLearn('word', done.word, done.en || done.word);
        onRecordActivity?.({
          type: 'writing',
          module: '단어 조립',
          icon: '✍️',
          title: `단어 쓰기 완성: ${done.word}`,
          detail: `${done.en || done.word} 조립 성공`,
          xp: 25,
          tag: '단어 쓰기'
        });
      }
    } else {
      recordLearn('syllable', done.ch, `${done.ch} (${done.en || ''})`.trim());
      onRecordActivity?.({
        type: 'writing',
        module: '자모 쓰기',
        icon: '✍️',
        title: `자모 글자 완성: ${done.ch}`,
        detail: `[${done.hint || ''}] 유니코드 자모 결합 완료`,
        xp: 15,
        tag: '자모 조합'
      });
    }
    if (st.wTab === 'word') {
      const tg = getTarget(st);
      if (tg.si + 1 < tg.word.length) {
        clearAutoNext();
        update({ si: tg.si + 1, L: null, V: null, T: null, isKeyError: false });
        return;
      }
    }
    nextTarget();
  };

  const handleVirtualKeyName = (keyName) => {
    const st = stateRef.current;
    const ok = isComplete(st);

    if (keyName === 'Backspace' || keyName === '지우기') {
      backspaceJamo();
      return;
    }
    if (keyName === 'Enter') {
      nextTarget();
      return;
    }
    if (keyName === 'Space' || keyName === ' ') {
      if (ok) advance();
      return;
    }
    if (ok) {
      // A key pressed right after completion becomes the first stroke of the next syllable.
      advance();
      setTimeout(() => handleVirtualKeyNameRef.current(keyName), 0);
      return;
    }

    const step = nextStroke(st);
    const expectedKey = step ? JAMO_KEY_MAP[step.jamo]?.key : null;

    if (keyName === expectedKey) {
      // Compound vowels/batchim: the first stroke enters the first jamo, the second completes it.
      update({ [step.stage]: step.value, isKeyError: false });
    } else {
      update({ isKeyError: true });
      setTimeout(() => {
        if (stateRef.current.isKeyError) update({ isKeyError: false });
      }, 500);
    }
  };
  const handleVirtualKeyNameRef = useRef(handleVirtualKeyName);
  handleVirtualKeyNameRef.current = handleVirtualKeyName;
  const keyActionsRef = useRef({});
  keyActionsRef.current = { backspaceJamo, nextTarget, resetTarget, handleVirtualKeyName, update };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!isBuildTab(stateRef.current)) return;
      const actions = keyActionsRef.current;

      if (e.key === 'Shift') {
        actions.update({ isPhysicalShift: true });
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        actions.backspaceJamo();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        actions.nextTarget();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        actions.resetTarget();
        return;
      }
      actions.handleVirtualKeyName(e.key.toUpperCase());
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') keyActionsRef.current.update({ isPhysicalShift: false });
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Legacy componentDidUpdate: show the celebration long enough, move mid-word syllables quickly.
  useEffect(() => {
    if (isBuildTab(s) && isComplete(s) && !autoNextRef.current) {
      const wait = isCelebrating(s) ? 1800 : 240;
      autoNextRef.current = setTimeout(() => {
        autoNextRef.current = null;
        const st = stateRef.current;
        if (isBuildTab(st) && isComplete(st)) keyActionsRef.current.advance();
      }, wait);
    }
  });
  keyActionsRef.current.advance = advance;

  useEffect(() => () => clearAutoNext(), []);

  const tutor = TUTORS.find((item) => item.id === selectedTutorId) || TUTORS[0];
  const tutorName = L ? tutor.ko : tutor.en;
  const fbFrom = L ? `${tutorName} 튜터의 첨삭` : `Feedback from ${tutorName}`;

  const isWordMode = s.wTab === 'word';
  const curLevelTargets = TARGETS_BY_LEVEL[s.jLevel] || TARGETS_BY_LEVEL[1];
  const curLevelWords = WORDS_BY_LEVEL[s.jLevel] || WORDS_BY_LEVEL[1];
  const levelName = s.jLevel === 2 ? (L ? '심화' : 'Advanced') : (L ? '기초' : 'Basic');
  const tg = { ...getTarget(s), level: levelName };
  const targetIdxLabel = isWordMode
    ? `${(s.wi % curLevelWords.length) + 1} / ${curLevelWords.length}`
    : `${(s.ti % curLevelTargets.length) + 1} / ${curLevelTargets.length}`;
  const targetPromptText = isWordMode
    ? (L ? '단어를 한 글자씩 완성해 보세요' : 'Build the word one syllable at a time')
    : s.L ? (L ? '자음과 모음을 골라 목표 글자를 완성하세요' : 'Select letters to build the target syllable') : (L ? '제시된 목표 글자를 완성해 보세요!' : 'Combine consonants and vowels to make the target letter');
  const JT = [[L ? '없음' : 'none', 0], ['ㄱ', 1], ['ㄴ', 4], ['ㄹ', 8], ['ㅁ', 16], ['ㅇ', 21], ...JT_EXTRA];
  const upTo = (arr) => arr.filter((j) => (j[2] || 0) <= s.jLevel);

  let composed = '?';
  if (s.L != null && s.V == null) composed = JL.find((j) => j[1] === s.L)?.[0] || '?';
  if (s.L != null && s.V != null) composed = String.fromCharCode(0xAC00 + (s.L * 21 + s.V) * 28 + (s.T || 0));

  const ok = s.L === tg.L && s.V === tg.V && (s.T || 0) === tg.T;
  const wordComplete = isWordMode && ok && tg.si === tg.word.length - 1;
  const showJeongCelebration = ok && (!isWordMode || wordComplete);
  const wordSyls = isWordMode ? [...tg.word].map((c, i) => {
    const completed = i < tg.si || (ok && i === tg.si);
    const current = i === tg.si && !ok;
    return { ch: c, c: completed ? 'var(--accent-ink)' : current ? 'var(--hot)' : 'var(--faint)', bd: current ? 'var(--hot)' : completed ? 'var(--accent-ink)' : 'transparent' };
  }) : [];
  const poseSeed = isWordMode ? s.wi + s.si : s.ti;
  const poseData = JEONG_POSES[poseSeed % JEONG_POSES.length];

  const step = nextStroke(s);
  const neededJamo = step ? step.jamo : '';
  const seqNote = step && step.compound ? ` (${step.compound} = ${JAMO_SEQ[step.compound].join(' + ')} · ${step.part}/2)` : '';
  let activeStepGuide;
  if (ok) activeStepGuide = L ? `🎉 완벽해요! [${tg.ch}] 글자가 완성되었습니다` : `🎉 Perfect! [${tg.ch}] is complete`;
  else if (step && step.stage === 'L') activeStepGuide = L ? `1단계 [초성] ➔ '${neededJamo}' 키를 누르세요` : `Step 1 [Initial] ➔ Press '${neededJamo}'`;
  else if (step && step.stage === 'V') activeStepGuide = L ? `2단계 [중성] ➔ '${neededJamo}' 키를 누르세요${seqNote}` : `Step 2 [Vowel] ➔ Press '${neededJamo}'${seqNote}`;
  else if (step && step.stage === 'T') activeStepGuide = L ? `3단계 [종성] ➔ '${neededJamo}' 키를 누르세요${seqNote}` : `Step 3 [Final] ➔ Press '${neededJamo}'${seqNote}`;
  else activeStepGuide = L ? '목표 글자를 자모로 조합해 보세요' : 'Assemble the target syllable block';

  const keyInfo = (!ok && neededJamo) ? JAMO_KEY_MAP[neededJamo] : null;
  const activeFingerLabel = ok ? (L ? '완성되었습니다! ➔ 다음 글자' : 'Complete! ➔ Next letter') : (keyInfo ? (L ? `${keyInfo.ko} (${keyInfo.key} 키)` : `${keyInfo.en} (${keyInfo.key} key)`) : (L ? '자유 입력' : 'Free input'));

  const showHandShadow = s.showHandShadow ?? true;
  const showKbGuide = !!s.showKbGuide;
  const isWinTab = (s.kbGuideTab || 'win') === 'win';
  const isMacTab = (s.kbGuideTab || 'win') === 'mac';

  const jLevels = [[1, L ? '기초' : 'Basic'], [2, L ? '심화' : 'Advanced']];
  const wTabGo = (tab) => () => update({ wTab: tab, L: null, V: null, T: null, isKeyError: false });
  const jamoRows = [
    [L ? '1 · 첫 자음' : '1 · First consonant', upTo(JL), 'L'],
    [L ? '2 · 모음' : '2 · Vowel', upTo(JV), 'V'],
    [L ? '3 · 받침' : '3 · Final consonant (batchim)', upTo(JT), 'T']
  ];

  const learnType = s.wTab === 'word' ? 'word' : 'syllable';
  const learnAll = learnType === 'word' ? curLevelWords : curLevelTargets;
  const learned = loadLearnedTopics(learnType);
  const learnKeyOf = learnType === 'word' ? ((x) => x.w) : ((x) => x.ch);
  const learnDone = learnAll.filter((x) => learned[learnKeyOf(x)]).length;
  const learnProgress = L ? `${learnDone} / ${learnAll.length} 완료` : `${learnDone} / ${learnAll.length} done`;
  const learnNote = s.reviewMode
    ? (L ? '이미 배운 것만 다시 보여 줘요' : 'Showing only what you already studied')
    : (L ? '배운 내용은 빼고 새로운 것만 나와요' : 'Already-studied items are skipped');
  const reviewLabel = s.reviewMode ? (L ? '복습 중' : 'Reviewing') : (L ? '복습하기' : 'Review');
  const nextLabel = isWordMode ? (L ? '다음 단어' : 'Next word') : t.nextSyl;
  const targetMeaning = (tg.en || '').includes('·') ? (tg.en.split('·')[1] || '').trim() : (tg.en || '');
  const targetPron = isWordMode ? getHangulPron(tg.word) : getHangulPron(tg.ch);
  const jamoMsg = ok
    ? (L ? `완벽해요! ${tg.ch} 완성! 🎉` : `Perfect! ${tg.ch} is built! 🎉`)
    : (s.L == null ? (L ? '첫 자음부터 골라 보세요' : 'Start with the first consonant')
      : (s.V == null ? (L ? '가운데 모음을 골라 보세요' : 'Pick the middle vowel')
        : (tg.T > 0 && s.T == null ? (L ? '마지막 받침을 골라 보세요' : 'Add the final batchim') : (L ? '계속해 보세요…' : 'Keep going…'))));
  const jamoMsgC = ok ? 'var(--accent-ink)' : (s.L != null ? 'var(--ink)' : 'var(--faint)');

  // SVG keyboard (legacy updateVirtualKeyboardSvg)
  const activeKeyName = keyInfo ? keyInfo.key : null;
  const activeFinger = keyInfo ? keyInfo.finger : null;
  const isShiftNeeded = !!(keyInfo && keyInfo.shift);
  const isShiftActive = isShiftNeeded || !!s.isPhysicalShift;
  const isError = !!s.isKeyError;
  const targetKey = activeKeyName ? KB_MAP[activeKeyName] : null;
  const isLeft = ['LP', 'LR', 'LM', 'LI', 'LT'].includes(activeFinger);
  const fingerId = activeFinger ? activeFinger[1] : null;
  const tgtPt = targetKey ? [targetKey.cx, targetKey.cy] : null;

  const checkW = () => {
    update({ wChecked: true });
    onRecordActivity?.({
      type: 'writing',
      module: '문장 쓰기',
      icon: '✍️',
      title: '문장 쓰기 첨삭 피드백 확인',
      detail: `"${s.wText.slice(0, 50)}…" 첨삭 피드백 확인`,
      xp: 30,
      tag: '문장 첨삭'
    });
  };

  const tabStyle = (active) => ({ border: 0, background: active ? 'var(--card)' : 'transparent', borderRadius: '9px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' });
  const guideTabStyle = (active) => ({ border: 0, background: active ? 'var(--accent)' : 'transparent', color: active ? '#ffffff' : 'var(--ink2)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' });

  return (
    <div className="writing-screen" data-screen-label="07 Writing">
      <div className="writing-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.1em' }}>WRITING</span><h1 style={{ margin: 0, font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}><Interp>{t.wTitle}</Interp></h1></div>
        <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '12px', padding: '4px' }}>
          <button type="button" onClick={wTabGo('jamo')} style={tabStyle(s.wTab === 'jamo')}><Interp>{t.wTab1}</Interp></button>
          <button type="button" onClick={wTabGo('word')} style={tabStyle(s.wTab === 'word')}><Interp>{t.wTab3}</Interp></button>
          <button type="button" onClick={wTabGo('sent')} style={tabStyle(s.wTab === 'sent')}><Interp>{t.wTab2}</Interp></button>
        </div>
      </div>

      {isBuildTab(s) && (
        <div className="writing-build-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="writing-level-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '12px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ font: "600 11px 'IBM Plex Mono',monospace", letterSpacing: '.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>LEVEL SELECT</span>
              <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '10px', padding: '3px' }}>
                {jLevels.map(([n, label]) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => update({ jLevel: n, ti: 0, wi: 0, si: 0, L: null, V: null, T: null })}
                    style={{ border: 0, background: s.jLevel === n ? 'var(--accent)' : 'transparent', color: s.jLevel === n ? '#ffffff' : 'var(--ink2)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                  >
                    <Interp>{label}</Interp>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--faint)' }} title={learnNote}><Interp>{learnProgress}</Interp></span>
              <button type="button" onClick={() => update((st) => ({ reviewMode: !st.reviewMode, ti: 0, wi: 0, si: 0, L: null, V: null, T: null }))} title={learnNote} style={{ border: '1px solid var(--line3)', background: s.reviewMode ? 'var(--hot)' : 'transparent', color: s.reviewMode ? '#fff' : 'var(--ink2)', borderRadius: '999px', padding: '6px 13px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>↻ <Interp>{reviewLabel}</Interp></button>
              <span style={{ fontSize: '12.5px', color: 'var(--faint)' }}><Interp>{targetIdxLabel}</Interp></span>
              <button type="button" onClick={nextTarget} style={{ border: '1px solid var(--line3)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span><Interp>{nextLabel}</Interp></span> ➔
              </button>
            </div>
          </div>

          <div className="writing-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '24px', alignItems: 'start' }}>
            <div className="writing-target-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', position: 'relative' }}>
              <div className="writing-target-header" style={{ background: 'linear-gradient(135deg, rgba(35,73,63,0.08) 0%, rgba(200,80,42,0.06) 100%)', border: '1.5px solid var(--line)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ font: "600 11px 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: 'var(--hot)', textTransform: 'uppercase' }}>🎯 TARGET LETTER</span>
                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--chip)', color: 'var(--sub)', fontWeight: 600 }}><Interp>{tg.level}</Interp></span>
                  </div>
                  <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600, lineHeight: 1.4 }}><Interp>{targetPromptText}</Interp></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span style={{ font: "700 11px 'IBM Plex Mono',monospace", letterSpacing: '.06em', color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '6px' }}>발음 기호</span>
                    <span style={{ font: "700 16px 'IBM Plex Mono',monospace", color: 'var(--ink)', letterSpacing: '0.04em' }}>[<Interp>{targetPron}</Interp>]</span>
                    <span style={{ fontSize: '12.5px', color: 'var(--faint)' }}><Interp>{targetMeaning}</Interp></span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 'none', marginLeft: 'auto' }}>
                  <div className="target-letter-badge" style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', font: "700 46px/1 'Gowun Batang',serif", boxShadow: '0 8px 20px rgba(35,73,63,0.28)', textAlign: 'center' }}>
                    <Interp>{tg.ch}</Interp>
                  </div>
                  <span style={{ font: "700 12px 'IBM Plex Mono',monospace", color: 'var(--accent-ink)', background: 'var(--bg2)', padding: '1px 8px', borderRadius: '6px', border: '1px solid var(--line2)' }}>[<Interp>{getHangulPron(tg.ch)}</Interp>]</span>
                </div>
              </div>

              {isWordMode && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '2px 0', flexWrap: 'wrap' }}>
                  <div className="writing-word-progress" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    {wordSyls.map((ws, i) => (
                      <span key={i} style={{ font: "700 32px/1.1 'Gowun Batang',serif", color: ws.c, borderBottom: `3px solid ${ws.bd}`, padding: '0 4px' }}><Interp>{ws.ch}</Interp></span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-soft)', border: '1px solid var(--line2)', borderRadius: '999px', padding: '4px 13px' }}>
                    <span style={{ font: "700 10px 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: 'var(--accent-ink)' }}>PRONUNCIATION</span>
                    <span style={{ font: "700 15px 'IBM Plex Mono',monospace", color: 'var(--ink)', letterSpacing: '0.03em' }}>[<Interp>{targetPron}</Interp>]</span>
                    <span style={{ fontSize: '12px', color: 'var(--sub)' }}><Interp>{targetMeaning}</Interp></span>
                  </div>
                </div>
              )}

              <div className="writing-canvas-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '10px 0' }}>
                <div className="writing-build-stage">
                  <div className="writing-build-block" style={{ borderRadius: '20px', background: 'var(--bg)', border: `2.5px solid ${ok ? 'var(--accent-ink)' : 'var(--line)'}`, display: 'grid', placeItems: 'center', font: "700 110px/1 'Gowun Batang',serif", position: 'relative', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)' }}>
                    <Interp>{composed}</Interp>
                    <span style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize: '50% 50%', backgroundPosition: '-1px -1px', opacity: 0.55, pointerEvents: 'none', borderRadius: '18px' }} />
                  </div>
                  {showJeongCelebration && (
                    <img className="jeong-celebration" src={poseData.src} alt={poseData.alt[L]} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: jamoMsgC }}><Interp>{jamoMsg}</Interp></span>
                  <span style={{ fontSize: '12.5px', color: 'var(--faint)' }}><Interp>{tg.en}</Interp></span>
                </div>
              </div>

              <div className="writing-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center', borderTop: '1px solid var(--line2)', paddingTop: '16px' }}>
                <button type="button" onClick={resetTarget} style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--sub)', borderRadius: '10px', padding: '9px 16px', fontSize: '13.5px', cursor: 'pointer' }}>↺ <Interp>{t.resetSyllable}</Interp></button>
                <button type="button" onClick={nextTarget} style={{ border: 0, background: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '9px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span><Interp>{nextLabel}</Interp></span> ➔
                </button>
              </div>
            </div>

            <div className="writing-jamo-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              {jamoRows.map(([label, arr, key]) => (
                <div className="writing-jamo-row" key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}><Interp>{label}</Interp></span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {arr.map(([ch, v]) => {
                      const active = s[key] === v;
                      return (
                        <button
                          type="button"
                          key={`${key}-${ch}-${v}`}
                          className="writing-jamo-key"
                          onClick={() => update({ [key]: v })}
                          style={{ minWidth: '44px', height: '44px', padding: '0 6px', borderRadius: '11px', border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`, background: active ? 'var(--accent)' : 'var(--card)', color: active ? '#fff' : 'var(--ink)', font: `600 ${ch.length > 1 ? '13px' : '20px'} 'Pretendard',sans-serif`, cursor: 'pointer', transition: 'transform .1s' }}
                        >
                          <Interp>{ch}</Interp>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <span className="writing-jamo-note" style={{ fontSize: '13px', color: 'var(--faint)', lineHeight: 1.6, borderTop: '1px solid var(--line2)', paddingTop: '12px' }}><Interp>{t.jamoNote}</Interp></span>
            </div>
          </div>

          <div className="writing-keyboard-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '22px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
            <div className="writing-keyboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--line2)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '15px' }}>⌨️</div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>한컴 타자 키보드</span>
                  <span style={{ fontSize: '12px', color: 'var(--sub)' }}>QWERTY 키보드 위 손가락 그림자 위치로 한글 2벌식 타자를 익혀요</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => update((st) => ({ showHandShadow: !st.showHandShadow }))} style={{ border: '1px solid var(--line3)', background: 'var(--bg2)', color: 'var(--ink)', borderRadius: '999px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .15s' }}>
                  <span>🖐️</span>
                  <span>손 그림자</span>
                </button>
                <button type="button" onClick={() => update((st) => ({ showKbGuide: !st.showKbGuide }))} style={{ border: '1px solid var(--accent)', background: 'rgba(35,73,63,0.08)', color: 'var(--accent-ink)', borderRadius: '999px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .15s' }}>
                  <span>🌐</span>
                  <span>QWERTY Korean Setup Guide</span>
                </button>
              </div>
            </div>

            {showKbGuide && (
              <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--accent)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 24px rgba(35,73,63,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ font: "700 16px 'Newsreader',serif", color: 'var(--ink)' }}>🌐 How to Type Korean on a Standard US QWERTY Keyboard</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>Windows &amp; Mac</span>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--sub)', lineHeight: 1.5 }}>You do NOT need Korean printed on your physical keycaps! Your OS will automatically map US QWERTY keys directly to the standard Korean 2-Set (두벌식) layout.</span>
                  </div>
                  <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '10px', padding: '3px' }}>
                    <button type="button" onClick={() => update({ kbGuideTab: 'win' })} style={guideTabStyle(isWinTab)}>🪟 Windows</button>
                    <button type="button" onClick={() => update({ kbGuideTab: 'mac' })} style={guideTabStyle(isMacTab)}>🍎 macOS</button>
                  </div>
                </div>

                {isWinTab && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: '12px' }}>
                    <GuideCard step="STEP 1" title="Open Language Settings">Press <kbd style={kbdStyle}>Win + I</kbd> → Go to <b>Time &amp; language</b> → <b>Language &amp; region</b>.</GuideCard>
                    <GuideCard step="STEP 2" title="Add Korean Language">Click <b>"Add a language"</b>, search for <b>Korean (한국어)</b>, and click <b>Install</b>.</GuideCard>
                    <GuideCard step="STEP 3" title="Automatic Microsoft IME">The official <b>"Microsoft IME"</b> is automatically enabled with Korean 2-Set mapping.</GuideCard>
                    <GuideCard step="STEP 4" title="Toggle &amp; Start Typing">Press <kbd style={kbdStyle}>Win + Space</kbd> or click the taskbar language icon to switch. Press <kbd style={kbdStyle}>Right Alt</kbd> to toggle Han/Eng!</GuideCard>
                  </div>
                )}

                {isMacTab && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: '12px' }}>
                    <GuideCard step="STEP 1" title="Open Keyboard Settings">Go to Apple menu  → <b>System Settings</b> → <b>Keyboard</b> → <b>Input Sources</b>.</GuideCard>
                    <GuideCard step="STEP 2" title="Add 2-Set Korean">Click the <b>"+"</b> button, select <b>Korean</b>, and choose <b>2-Set Korean (두벌식)</b>.</GuideCard>
                    <GuideCard step="STEP 3" title="Toggle Shortcut">Switch easily using <kbd style={kbdStyle}>Control + Space</kbd> (or <kbd style={kbdStyle}>Globe 🌐</kbd> key), or the menu bar icon.</GuideCard>
                    <GuideCard step="STEP 4" title="Direct QWERTY Mapping">Your English keys automatically type Korean syllables directly (e.g. G=ㅎ, K=ㅏ, S=ㄴ ➔ 한)!</GuideCard>
                  </div>
                )}
              </div>
            )}

            {!showKbGuide && (
              <>
                <div className="writing-keyboard-viewport" style={{ position: 'relative', background: 'var(--bg)', border: '1px solid var(--line2)', borderRadius: '18px', padding: '16px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)', width: '100%' }}>
                  <div style={{ width: '100%', maxWidth: '980px', position: 'relative', height: '38px', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: '21.7%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0F172A', color: '#FFFFFF', padding: '7px 16px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(15,23,42,0.35), 0 0 0 1px rgba(255,255,255,0.15)', border: '1.5px solid #38BDF8', whiteSpace: 'nowrap', zIndex: 2 }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}><Interp>{activeStepGuide}</Interp></span>
                      <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #0F172A' }} />
                    </div>
                  </div>
                  <div id="virtual-keyboard-root" style={{ width: '100%', maxWidth: '980px', display: 'flex', justifyContent: 'center' }}>
                    <svg viewBox="0 26 980 334" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: '960px', display: 'block' }}>
                      <defs>
                        <filter id="kbKeyShadow" x="-10%" y="-10%" width="120%" height="130%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.06)" />
                        </filter>
                      </defs>
                      <rect x="10" y="36" width="960" height="314" rx="16" fill="var(--card)" stroke="var(--line2)" strokeWidth="1.5" />
                      <g className="keys-layer">
                        {KB_SVG_ROWS.map((row) => row.map((k) => {
                          const isTarget = !ok && k.key === activeKeyName;
                          const isShiftTarget = !ok && isShiftNeeded && (k.key === 'Shift' || k.key === 'ShiftR');
                          let fill = k.isSpecial ? 'var(--chip)' : 'var(--card)';
                          let stroke = 'var(--line2)';
                          let strokeWidth = '1';
                          let textKoColor = k.isSpecial ? 'var(--ink2)' : 'var(--ink)';
                          let textEnColor = 'var(--faint)';
                          if (isTarget) {
                            fill = isError ? '#E53935' : '#B25353';
                            stroke = isError ? '#B71C1C' : '#8E3636';
                            strokeWidth = '2';
                            textKoColor = '#FFFFFF';
                            textEnColor = 'rgba(255,255,255,0.85)';
                          } else if (isShiftTarget) {
                            fill = '#C05621';
                            stroke = '#9C4221';
                            strokeWidth = '2';
                            textKoColor = '#FFFFFF';
                            textEnColor = 'rgba(255,255,255,0.85)';
                          }
                          const displayKo = (isShiftActive && k.shift) ? k.shift : k.ko;
                          const displayEn = k.key.length === 1 ? k.key.toUpperCase() : '';
                          return (
                            <g
                              key={k.id}
                              className={`key-node ${isTarget ? (isError ? 'key-error' : 'key-target') : ''}`}
                              onClick={() => handleVirtualKeyName(k.key)}
                              style={{ cursor: 'pointer' }}
                            >
                              <rect x={k.x} y={k.y} width={k.w} height={k.h} rx="7" ry="7" fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter="url(#kbKeyShadow)" />
                              <text x={k.cx} y={k.isSpecial ? k.cy + 5 : k.y + 22} textAnchor="middle" fontFamily="'Pretendard', sans-serif" fontSize={k.isSpecial ? '12' : '15'} fontWeight="700" fill={textKoColor}>{displayKo}</text>
                              {!k.isSpecial && (
                                <text x={k.cx} y={k.y + 40} textAnchor="middle" fontFamily="'Pretendard', monospace" fontSize="11" fontWeight="600" fill={textEnColor}>{displayEn}</text>
                              )}
                            </g>
                          );
                        }))}
                      </g>
                      {showHandShadow && !ok && (
                        <>
                          <HandImage side="left" active={isLeft ? fingerId : null} target={isLeft ? tgtPt : null} opacity={activeFinger && isLeft ? 0.34 : 0.1} />
                          <HandImage side="right" active={!isLeft ? fingerId : null} target={!isLeft ? tgtPt : null} opacity={activeFinger && !isLeft ? 0.34 : 0.1} />
                        </>
                      )}
                    </svg>
                  </div>
                </div>

                <div className="writing-keyboard-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--line2)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ font: "600 11px 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase' }}>RECOMMENDED FINGER</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-ink)' }}><Interp>{activeFingerLabel}</Interp></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--sub)' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#B25353', display: 'inline-block' }} />
                    <span>버건디 키 = 현재 눌러야 할 키 (Target Key)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {s.wTab === 'sent' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '24px', alignItems: 'start' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '17px', fontWeight: 600 }}><Interp>{t.sentPrompt}</Interp></span>
            </div>
            <span style={{ fontSize: '13.5px', color: 'var(--faint)' }}><Interp>{t.sentHint}</Interp> <span style={{ fontFamily: "'Gowun Batang',serif", color: 'var(--ink)' }}>-에서, -아서/어서, -고 싶어요</span></span>
            <textarea value={s.wText} onChange={(e) => update({ wText: e.target.value, wChecked: false })} rows={7} style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '14px', font: "400 17px/1.8 'Gowun Batang',serif", resize: 'vertical', outline: 'none', background: 'var(--bg2)', color: 'var(--ink)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}><Interp>{s.wText.replace(/\s/g, '').length + (L ? '자' : ' characters')}</Interp></span><button type="button" onClick={checkW} style={{ border: 0, background: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '11px 18px', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}><Interp>{t.getFb}</Interp></button></div>
          </div>
          {s.wChecked && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-ink)' }}><Interp>{fbFrom}</Interp></span>
                <p style={{ margin: 0, font: "400 17px/1.9 'Gowun Batang',serif" }}>지난 주말에 친구를 만났어요. 우리는 홍대<del style={delStyle}>에</del><ins style={insStyle}>에서</ins> 떡볶이를 먹었어요. 정말 <del style={delStyle}>맛있었어서</del> <ins style={insStyle}>맛있어서</ins> 또 가고 싶어요.</p>
              </div>
              <div style={feedbackNoteStyle}><b style={{ fontFamily: "'Gowun Batang',serif" }}>에 vs 에서</b><span><Interp>{t.fb1}</Interp></span></div>
              <div style={feedbackNoteStyle}><b style={{ fontFamily: "'Gowun Batang',serif" }}>-아서/어서 + <Interp>{t.pastTense}</Interp></b><span><Interp>{t.fb2}</Interp></span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WritingPage;
