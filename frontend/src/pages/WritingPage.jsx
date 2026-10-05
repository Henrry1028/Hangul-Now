import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { loadLearnedTopics, recordLearnedTopic } from '../data/learnedData.js';
import {
  CJ_HAND,
  CJ_MAP,
  CJ_NUM_KEYS,
  CJ_ROWS,
  CJ_SEQ,
  CJ_VIEWBOX,
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

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function calcTypingStats(prev, keyName, expectedKey, now = Date.now()) {
  const isModifierKey = ['Shift', 'ShiftR', 'Ctrl', 'CtrlR', 'Alt', 'AltR', 'Caps', 'Tab'].includes(keyName);
  if (keyName === expectedKey) {
    const start = prev.startTime || now;
    const nextCorrect = prev.correctStrokes + 1;
    const total = nextCorrect + prev.errorStrokes;
    const accuracy = Math.round((nextCorrect / total) * 100);
    const elapsedMinutes = Math.max(0.015, (now - start) / 60000);
    const currentCpm = Math.round(nextCorrect / elapsedMinutes);
    return {
      ...prev,
      correctStrokes: nextCorrect,
      cpm: currentCpm,
      maxCpm: Math.max(prev.maxCpm, currentCpm),
      accuracy,
      startTime: start,
      lastStrokeTime: now,
      isActive: true
    };
  }
  if (!isModifierKey) {
    const nextError = prev.errorStrokes + 1;
    const total = prev.correctStrokes + nextError;
    const accuracy = total > 0 ? Math.round((prev.correctStrokes / total) * 100) : 100;
    return {
      ...prev,
      errorStrokes: nextError,
      accuracy,
      lastStrokeTime: now
    };
  }
  return prev;
}

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
const cjGuideGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: '12px' };
const cjGuideNoteStyle = { fontSize: '13px', color: 'var(--ink2)', lineHeight: 1.5 };
const cjGuideTipStyle = { fontSize: '12.5px', color: 'var(--sub)', lineHeight: 1.5, background: 'var(--card)', border: '1px dashed var(--line3)', borderRadius: '10px', padding: '9px 12px' };
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

// 📱 스마트폰 양손 파지 인체공학적 엄지 손 그림자 엔진 (PC 키보드 손 그림자와 100% 동일한 실루엣 퀄리티)
function buildMobileHandGrip(side, targetPos, isTargetActive) {
  const isLeft = side === 'left';
  const sign = isLeft ? 1 : -1;

  // 대기 위치: 왼손은 한/영 키 부근 [86, 268], 오른손은 Space 키 부근 [372, 268]
  const restTip = isLeft ? [86, 268] : [372, 268];
  const [tx, ty] = isTargetActive && targetPos ? targetPos : restTip;

  // 1. 기저점 B (스마트폰 좌우 측면 베젤 x: 0 또는 516)
  // 타겟 키의 y 높이에 따라 손바닥/엄지 기저부가 베젤을 따라 유기적으로 승강 (180 ~ 235)
  const bx = isLeft ? 0 : 516;
  const by = 205 + (ty - 165) * 0.25;

  const dx = tx - bx;
  const dy = ty - by;
  const dist = Math.max(Math.hypot(dx, dy), 1);
  const ux = dx / dist;
  const uy = dy / dist;

  // 법선 벡터 (엄지 등쪽 = 윗방향)
  const nx = -uy * sign;
  const ny = ux * sign;

  // 인체공학적 엄지 두께 (자연스러운 사람 손가락 해부학 비율)
  const wTip = 22.0;    // 손끝 돔 반경
  const wJoint = 24.5;  // 중간 관절 두께
  const wBase = 32.0;   // 베젤 진입부 손바닥 두께

  // 중간 관절 J (위쪽으로 살짝 볼록한 자연스러운 아치)
  const jDist = dist * 0.52;
  const arch = Math.sin(Math.min(dist / 220, 1) * Math.PI) * 10.0 * sign;
  const jx = bx + ux * jDist + nx * (arch * 0.4);
  const jy = by + uy * jDist + ny * (arch * 0.4);

  const d2x = tx - jx;
  const d2y = ty - jy;
  const dist2 = Math.max(Math.hypot(d2x, d2y), 1);
  const u2x = d2x / dist2;
  const u2y = d2y / dist2;
  const n2x = -u2y * sign;
  const n2y = u2x * sign;

  // 엄지 등쪽 점들
  const pBase_top = [bx + nx * wBase, by + ny * wBase];
  const pJoint_top = [jx + n2x * wJoint, jy + n2y * wJoint];
  const pTip_top = [tx + n2x * wTip, ty + n2y * wTip];

  // 손끝 둥근 돔 및 정면 점
  const pTip_front = [tx + u2x * (wTip * 1.05), ty + u2y * (wTip * 1.05)];
  const pTip_bottom = [tx - n2x * wTip, ty - n2y * wTip];

  // 돔 제어점 (표준 큐빅 베지어 둥근 호)
  const cTip1 = [pTip_top[0] + u2x * (wTip * 0.58), pTip_top[1] + u2y * (wTip * 0.58)];
  const cTip2 = [pTip_front[0] + n2x * (wTip * 0.58), pTip_front[1] + n2y * (wTip * 0.58)];
  const cTip3 = [pTip_front[0] - n2x * (wTip * 0.58), pTip_front[1] - n2y * (wTip * 0.58)];
  const cTip4 = [pTip_bottom[0] + u2x * (wTip * 0.58), pTip_bottom[1] + u2y * (wTip * 0.58)];

  // 엄지 안쪽(물갈퀴) 점들
  const pJoint_bottom = [jx - n2x * (wJoint * 0.92), jy - n2y * (wJoint * 0.92)];
  const pBase_bottom = [bx - nx * (wBase * 0.88), by - ny * (wBase * 0.88)];

  let pathD = '';
  if (isLeft) {
    pathD = `
      M -24 334
      C -22 295 -14 260 -4 230
      C 0 216 0 206 ${pBase_top[0].toFixed(1)} ${pBase_top[1].toFixed(1)}
      C ${(pBase_top[0] + ux * 18).toFixed(1)} ${(pBase_top[1] + uy * 18).toFixed(1)} ${(pJoint_top[0] - u2x * 18).toFixed(1)} ${(pJoint_top[1] - u2y * 18).toFixed(1)} ${pJoint_top[0].toFixed(1)} ${pJoint_top[1].toFixed(1)}
      C ${(pJoint_top[0] + u2x * 16).toFixed(1)} ${(pJoint_top[1] + u2y * 16).toFixed(1)} ${(pTip_top[0] - u2x * 14).toFixed(1)} ${(pTip_top[1] - u2y * 14).toFixed(1)} ${pTip_top[0].toFixed(1)} ${pTip_top[1].toFixed(1)}
      C ${cTip1[0].toFixed(1)} ${cTip1[1].toFixed(1)} ${cTip2[0].toFixed(1)} ${cTip2[1].toFixed(1)} ${pTip_front[0].toFixed(1)} ${pTip_front[1].toFixed(1)}
      C ${cTip3[0].toFixed(1)} ${cTip3[1].toFixed(1)} ${cTip4[0].toFixed(1)} ${cTip4[1].toFixed(1)} ${pTip_bottom[0].toFixed(1)} ${pTip_bottom[1].toFixed(1)}
      C ${(pTip_bottom[0] - u2x * 14).toFixed(1)} ${(pTip_bottom[1] - u2y * 14).toFixed(1)} ${(pJoint_bottom[0] + u2x * 16).toFixed(1)} ${(pJoint_bottom[1] + u2y * 16).toFixed(1)} ${pJoint_bottom[0].toFixed(1)} ${pJoint_bottom[1].toFixed(1)}
      C ${(pJoint_bottom[0] - u2x * 18).toFixed(1)} ${(pJoint_bottom[1] - u2y * 18).toFixed(1)} ${(pBase_bottom[0] + ux * 16).toFixed(1)} ${(pBase_bottom[1] + uy * 16).toFixed(1)} ${pBase_bottom[0].toFixed(1)} ${pBase_bottom[1].toFixed(1)}
      C 2 275 8 305 22 326
      C 32 334 46 334 68 334
      L -24 334 Z
    `;
  } else {
    pathD = `
      M 540 334
      C 538 295 530 260 520 230
      C 516 216 516 206 ${pBase_top[0].toFixed(1)} ${pBase_top[1].toFixed(1)}
      C ${(pBase_top[0] + ux * 18).toFixed(1)} ${(pBase_top[1] + uy * 18).toFixed(1)} ${(pJoint_top[0] - u2x * 18).toFixed(1)} ${(pJoint_top[1] - u2y * 18).toFixed(1)} ${pJoint_top[0].toFixed(1)} ${pJoint_top[1].toFixed(1)}
      C ${(pJoint_top[0] + u2x * 16).toFixed(1)} ${(pJoint_top[1] + u2y * 16).toFixed(1)} ${(pTip_top[0] - u2x * 14).toFixed(1)} ${(pTip_top[1] - u2y * 14).toFixed(1)} ${pTip_top[0].toFixed(1)} ${pTip_top[1].toFixed(1)}
      C ${cTip1[0].toFixed(1)} ${cTip1[1].toFixed(1)} ${cTip2[0].toFixed(1)} ${cTip2[1].toFixed(1)} ${pTip_front[0].toFixed(1)} ${pTip_front[1].toFixed(1)}
      C ${cTip3[0].toFixed(1)} ${cTip3[1].toFixed(1)} ${cTip4[0].toFixed(1)} ${cTip4[1].toFixed(1)} ${pTip_bottom[0].toFixed(1)} ${pTip_bottom[1].toFixed(1)}
      C ${(pTip_bottom[0] - u2x * 14).toFixed(1)} ${(pTip_bottom[1] - u2y * 14).toFixed(1)} ${(pJoint_bottom[0] + u2x * 16).toFixed(1)} ${(pJoint_bottom[1] + u2y * 16).toFixed(1)} ${pJoint_bottom[0].toFixed(1)} ${pJoint_bottom[1].toFixed(1)}
      C ${(pJoint_bottom[0] - u2x * 18).toFixed(1)} ${(pJoint_bottom[1] - u2y * 18).toFixed(1)} ${(pBase_bottom[0] + ux * 16).toFixed(1)} ${(pBase_bottom[1] + uy * 16).toFixed(1)} ${pBase_bottom[0].toFixed(1)} ${pBase_bottom[1].toFixed(1)}
      C 514 275 508 305 494 326
      C 484 334 470 334 448 334
      L 540 334 Z
    `;
  }

  return { pathD, tipCenter: [tx, ty] };
}

// 📱 스마트폰 양손 파지 천지인 손 그림자 컴포넌트 (두 번째 첨부 PC 키보드 손 그림자와 동일한 실루엣 퀄리티)
function CheonjiinHandGrip({ targetKey, opacity = 1 }) {
  // 실제 사람이 스마트폰을 쥘 때의 인체공학적 키 분담:
  // 1열(col 0: 1, 4, 7, 한/영) 및 2열(col 1: 2, 5, 8, 0)은 왼손 엄지가 탭! (오른손은 Space 대기)
  // 3열(col 2: 3, 6, 9) 및 4열(col 3: Delete, Enter, .,?!, Space)은 오른손 엄지가 탭! (왼손은 한/영 대기)
  const isLeftActive = !!(targetKey && targetKey.col <= 1);
  const isRightActive = !!(targetKey && targetKey.col >= 2);

  const leftTarget = isLeftActive ? [targetKey.cx, targetKey.cy] : null;
  const rightTarget = isRightActive ? [targetKey.cx, targetKey.cy] : null;

  const leftGrip = buildMobileHandGrip('left', leftTarget, isLeftActive);
  const rightGrip = buildMobileHandGrip('right', rightTarget, isRightActive);

  return (
    <g className="cji-mobile-grip-layer" pointerEvents="none">
      {/* 📱 왼손 손 그림자 (두 번째 첨부 PC 키보드와 100% 동일한 실루엣 룩앤필) */}
      <path
        className="hand-layer"
        d={leftGrip.pathD}
        fill="#000000"
        opacity={(isLeftActive ? 0.36 : 0.11) * opacity}
        style={{ transition: 'opacity 150ms ease-out' }}
      />

      {/* 📱 오른손 손 그림자 (두 번째 첨부 PC 키보드와 100% 동일한 실루엣 룩앤필) */}
      <path
        className="hand-layer"
        d={rightGrip.pathD}
        fill="#000000"
        opacity={(isRightActive ? 0.36 : 0.11) * opacity}
        style={{ transition: 'opacity 150ms ease-out' }}
      />
    </g>
  );
}

// 천지인 탭 진행 상태는 지금 입력 중인 자모 단계에만 유효하다.
const cjSig = (st, step) => (step ? [st.wTab, st.jLevel, st.reviewMode ? 1 : 0, st.ti, st.wi, st.si, st.L, st.V, st.T, step.stage, step.jamo].join('|') : '');

// 앱(모바일) 화면: 데스크톱 사이드바 기준(860px)과 같은 폭에서 QWERTY 키보드 대신 천지인만 쓴다.
const APP_VIEW_QUERY = '(max-width: 859px)';
function useIsAppView() {
  const [isApp, setIsApp] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(APP_VIEW_QUERY).matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(APP_VIEW_QUERY);
    const onChange = () => setIsApp(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isApp;
}

function WritingPage({ lang = 'ko', selectedTutorId = 'jiwoo', writingState, onWritingStateChange, onRecordActivity, userId = null }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = WRITING_TEXT[lang] || WRITING_TEXT.en;
  const s = writingState;

  const stateRef = useRef(writingState);
  const isAppView = useIsAppView();
  const appViewRef = useRef(isAppView);
  appViewRef.current = isAppView;
  stateRef.current = writingState;
  const autoNextRef = useRef(null);

  // ⚡ 타자 연습 실시간 속도 및 정확도 측정 상태
  const [typingStats, setTypingStats] = useState({
    correctStrokes: 0,
    errorStrokes: 0,
    cpm: 0,          // 현재 타수 (CPM: 타/분)
    maxCpm: 0,       // 최고 타수
    accuracy: 100,   // 정확도 (%)
    elapsedSec: 0,   // 경과 시간 (초)
    startTime: null, // 시작 시각
    lastStrokeTime: null,
    isActive: false
  });

  const resetTypingStats = useCallback(() => {
    setTypingStats({
      correctStrokes: 0,
      errorStrokes: 0,
      cpm: 0,
      maxCpm: 0,
      accuracy: 100,
      elapsedSec: 0,
      startTime: null,
      lastStrokeTime: null,
      isActive: false
    });
  }, []);

  // 1초 단위 타이머: 경과 시간 및 분당 타수 실시간 갱신
  useEffect(() => {
    if (!typingStats.isActive || !typingStats.startTime) return;
    const interval = setInterval(() => {
      setTypingStats((prev) => {
        if (!prev.isActive || !prev.startTime) return prev;
        const now = Date.now();
        const elapsedSec = Math.max(1, Math.floor((now - prev.startTime) / 1000));
        const idleMs = now - (prev.lastStrokeTime || now);
        const minutes = elapsedSec / 60;
        let cpm = prev.correctStrokes > 0 ? Math.round(prev.correctStrokes / minutes) : 0;
        // 장시간(12초 이상) 입력이 없을 경우 타수를 점진적으로 낮춤
        if (idleMs > 12000) {
          cpm = Math.max(0, Math.round(cpm * 0.9));
        }
        return {
          ...prev,
          elapsedSec,
          cpm,
          maxCpm: Math.max(prev.maxCpm, cpm)
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [typingStats.isActive, typingStats.startTime]);

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
    recordLearnedTopic(type, key, label, userId);
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

    setTypingStats((prev) => calcTypingStats(prev, keyName, expectedKey));

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

  // 모바일 천지인: 자모 하나가 여러 탭(ㅏ = ㅣ+ㆍ, ㅋ = ㄱㅋ×2)이라 단계 안의 탭 진행을 따로 센다.
  const [cjTap, setCjTap] = useState({ sig: '', n: 0 });
  const cjTapRef = useRef(cjTap);
  const setCjProgress = (next) => { cjTapRef.current = next; setCjTap(next); };
  const handleCjKey = (keyId) => {
    const st = stateRef.current;
    const step = nextStroke(st);
    const sig = cjSig(st, step);
    const n = cjTapRef.current.sig === sig ? cjTapRef.current.n : 0;

    if (keyId === 'Backspace') {
      if (n > 0) setCjProgress({ sig, n: n - 1 });
      else backspaceJamo();
      return;
    }
    if (keyId === 'Enter') {
      nextTarget();
      return;
    }
    if (keyId === 'Space') {
      if (isComplete(st)) advance();
      return;
    }
    if (keyId === 'CJ_LANG') return;
    if (isComplete(st)) {
      advance();
      setTimeout(() => handleCjKeyRef.current(keyId), 0);
      return;
    }

    const seq = step ? CJ_SEQ[step.jamo] : null;
    const expectedKey = seq ? seq[n] : null;
    setTypingStats((prev) => calcTypingStats(prev, keyId, expectedKey));
    if (keyId === expectedKey) {
      if (n + 1 >= seq.length) {
        setCjProgress({ sig: '', n: 0 });
        update({ [step.stage]: step.value, isKeyError: false });
      } else {
        setCjProgress({ sig, n: n + 1 });
        update({ isKeyError: false });
      }
    } else {
      update({ isKeyError: true });
      setTimeout(() => {
        if (stateRef.current.isKeyError) update({ isKeyError: false });
      }, 500);
    }
  };
  const handleCjKeyRef = useRef(handleCjKey);
  handleCjKeyRef.current = handleCjKey;

  const keyActionsRef = useRef({});
  keyActionsRef.current = { backspaceJamo, nextTarget, resetTarget, handleVirtualKeyName, handleCjKey, update };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!isBuildTab(stateRef.current)) return;
      const actions = keyActionsRef.current;

      if (stateRef.current.kbMode === 'cji' || appViewRef.current) {
        // 천지인 모드: 숫자키 1~0이 피처폰처럼 천지인 키가 된다.
        const cjKey = CJ_NUM_KEYS[e.key] || (e.key === 'Backspace' ? 'Backspace' : e.key === 'Enter' ? 'Enter' : e.key === ' ' ? 'Space' : null);
        if (cjKey) {
          e.preventDefault();
          actions.handleCjKey(cjKey);
          return;
        }
      }
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
  let activeFingerLabel = ok ? (L ? '완성되었습니다! ➔ 다음 글자' : 'Complete! ➔ Next letter') : (keyInfo ? (L ? `${keyInfo.ko} (${keyInfo.key} 키)` : `${keyInfo.en} (${keyInfo.key} key)`) : (L ? '자유 입력' : 'Free input'));

  // 모바일 천지인: 현재 단계 자모의 탭 순서 중 다음에 누를 키.
  const isCji = isAppView || s.kbMode === 'cji';
  const cjSeq = step ? CJ_SEQ[step.jamo] : null;
  const cjN = cjSeq && cjTap.sig === cjSig(s, step) ? cjTap.n : 0;
  const cjTargetKey = !ok && cjSeq ? CJ_MAP[cjSeq[cjN]] : null;
  if (isCji && cjTargetKey) {
    const stageName = { L: L ? '1단계 [초성]' : 'Step 1 [Initial]', V: L ? '2단계 [중성]' : 'Step 2 [Vowel]', T: L ? '3단계 [종성]' : 'Step 3 [Final]' }[step.stage];
    const compoundNote = step.compound ? `${step.compound} = ${JAMO_SEQ[step.compound].join(' + ')} · ` : '';
    const tapNote = cjSeq.length > 1 ? `${step.jamo} = ${cjSeq.map((k) => CJ_MAP[k].label).join(' + ')} · ${cjN + 1}/${cjSeq.length}` : '';
    const note = compoundNote || tapNote ? ` (${compoundNote}${tapNote || step.jamo})` : '';
    activeStepGuide = L ? `${stageName} ➔ '${cjTargetKey.label}' 키를 누르세요${note}` : `${stageName} ➔ Tap '${cjTargetKey.label}'${note}`;
    const leftThumb = cjTargetKey.col <= 1;
    activeFingerLabel = L ? `${leftThumb ? '왼손' : '오른손'} 엄지 ('${cjTargetKey.label}' 키)` : `${leftThumb ? 'Left' : 'Right'} thumb ('${cjTargetKey.label}' key)`;
  }

  const showHandShadow = s.showHandShadow ?? true;
  const showKbGuide = !!s.showKbGuide;
  const isWinTab = (s.kbGuideTab || 'win') === 'win';
  const isMacTab = (s.kbGuideTab || 'win') === 'mac';
  const showCjGuide = !!s.showCjGuide;
  const cjGuideTab = s.cjGuideTab || 'samsung';

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

  const keyboardFooter = (
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
  );

  const tabStyle = (active) => ({ border: 0, background: active ? 'var(--card)' : 'transparent', borderRadius: '9px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' });
  const guideTabStyle = (active) => ({ border: 0, background: active ? 'var(--accent)' : 'transparent', color: active ? '#ffffff' : 'var(--ink2)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' });

  return (
    <div className={`writing-screen ${isBuildTab(s) ? 'is-build' : ''}`} data-screen-label="07 Writing">
      <div className="writing-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.1em' }}>WRITING</span><h1 style={{ margin: 0, font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}><Interp>{t.wTitle}</Interp></h1></div>
      </div>

      {/* 상단 통합 바: 좌측 레벨 선택 + 우측 글자/단어/문장 탭 버튼 */}
      <div className="writing-level-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '10px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isBuildTab(s) ? (
            <>
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
            </>
          ) : (
            <span style={{ font: "600 11px 'IBM Plex Mono',monospace", letterSpacing: '.1em', color: 'var(--hot)', textTransform: 'uppercase' }}>SENTENCE CORRECTION</span>
          )}
        </div>

        {/* 탭 버튼 이동배치 (두 번째 첨부 영역 대체) */}
        <div className="writing-mode-nav-tabs" style={{ display: 'flex', background: 'var(--seg)', borderRadius: '12px', padding: '4px' }}>
          <button type="button" onClick={wTabGo('jamo')} style={tabStyle(s.wTab === 'jamo')}><Interp>{t.wTab1}</Interp></button>
          <button type="button" onClick={wTabGo('word')} style={tabStyle(s.wTab === 'word')}><Interp>{t.wTab3}</Interp></button>
          <button type="button" onClick={wTabGo('sent')} style={tabStyle(s.wTab === 'sent')}><Interp>{t.wTab2}</Interp></button>
        </div>
      </div>

      {isBuildTab(s) && (
        <div className="writing-build-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div className="writing-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '24px', alignItems: 'start' }}>
            <div className="writing-target-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', position: 'relative' }}>

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

              <div className="writing-canvas-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '8px 0', width: '100%' }}>
                <div className="writing-build-stage">
                  {/* 1. 목표 글자 (녹색 한글 박스) */}
                  <div className="writing-target-col">
                    <div className="target-letter-badge" style={{ borderRadius: '20px', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: "'Gowun Batang',serif", fontWeight: 700, lineHeight: 1, boxShadow: '0 8px 22px rgba(35,73,63,0.28)', textAlign: 'center' }}>
                      <Interp>{tg.ch}</Interp>
                    </div>
                    <span className="target-letter-pron">[<Interp>{getHangulPron(tg.ch)}</Interp>]</span>
                  </div>

                  <span className="writing-build-arrow" aria-hidden="true">➔</span>

                  {/* 2. 내가 조합 중인 글자 (물음표 박스) */}
                  <div className="writing-build-block" style={{ borderRadius: '20px', background: 'var(--bg)', border: `2.5px solid ${ok ? 'var(--accent-ink)' : 'var(--line)'}`, display: 'grid', placeItems: 'center', font: "700 70px/1 'Gowun Batang',serif", position: 'relative', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)' }}>
                    <Interp>{composed}</Interp>
                    <span style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize: '50% 50%', backgroundPosition: '-1px -1px', opacity: 0.55, pointerEvents: 'none', borderRadius: '18px' }} />
                  </div>

                  {/* 3. 물음표 오른쪽 공간: 안내 텍스트 & 정이 축하 슬롯 */}
                  <div className="writing-build-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: '6px', minWidth: '140px', paddingLeft: '8px', flex: 1 }}>
                    <span style={{ fontSize: '15.5px', fontWeight: 700, color: jamoMsgC, lineHeight: 1.35 }}><Interp>{jamoMsg}</Interp></span>
                    <span style={{ fontSize: '13.5px', color: 'var(--sub)', fontWeight: 500, lineHeight: 1.4 }}><Interp>{tg.en}</Interp></span>
                    {showJeongCelebration && (
                      <div className="writing-jeong-slot" style={{ marginTop: '4px' }}>
                        <img className="jeong-celebration" src={poseData.src} alt={poseData.alt[L]} />
                      </div>
                    )}
                  </div>
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
              <div className="writing-kb-mode">
                <div className="writing-kb-mode-tabs" role="tablist" aria-label={L ? '키보드 종류' : 'Keyboard type'}>
                  {!isAppView && <button type="button" role="tab" aria-selected={!isCji} className={!isCji ? 'is-active' : ''} onClick={() => update({ kbMode: 'hancom' })}>⌨️ {L ? '한컴 타자 키보드' : 'PC Keyboard (2-Set)'}</button>}
                  <button type="button" role="tab" aria-selected={isCji} className={isCji ? 'is-active' : ''} onClick={() => update({ kbMode: 'cji', showKbGuide: false })}>📱 {L ? '모바일 천지인' : 'Mobile Cheonjiin'}</button>
                </div>
                <span className="writing-kb-mode-desc">
                  {isCji
                    ? (L ? 'ㅣ·ㆍ·ㅡ 세 획으로 모음을, 같은 키를 여러 번 눌러 자음을 만들어요 (숫자키 1~0으로도 입력)' : 'Build vowels from ㅣ·ㆍ·ㅡ and tap a key repeatedly for consonants (number keys 1–0 work too)')
                    : (L ? 'QWERTY 키보드 위 손가락 그림자 위치로 한글 2벌식 타자를 익혀요' : 'Learn Korean 2-Set typing by following the finger shadows on a QWERTY keyboard')}
                </span>
              </div>

              {/* ⚡ 실시간 타자 속도 대시보드 */}
              <div className="writing-typing-dashboard">
                <div className="typing-stat-pill stat-speed" title={L ? '현재 분당 타수' : 'Current typing speed'}>
                  <span className="stat-pill-icon">⚡</span>
                  <span className="stat-pill-label">{L ? '타수' : 'Speed'}</span>
                  <span className="stat-pill-num">{typingStats.cpm}</span>
                  <span className="stat-pill-unit">{L ? '타/분' : 'CPM'}</span>
                </div>
                <div className="typing-stat-pill stat-acc" title={L ? '타자 정확도' : 'Typing accuracy'}>
                  <span className="stat-pill-icon">🎯</span>
                  <span className="stat-pill-label">{L ? '정확도' : 'Acc'}</span>
                  <span className="stat-pill-num">{typingStats.accuracy}%</span>
                </div>
                <div className="typing-stat-pill stat-max" title={L ? '이번 세션 최고 타수' : 'Highest speed'}>
                  <span className="stat-pill-icon">🏆</span>
                  <span className="stat-pill-label">{L ? '최고' : 'Max'}</span>
                  <span className="stat-pill-num">{typingStats.maxCpm}</span>
                </div>
                <div className="typing-stat-pill stat-time" title={L ? '연습 시간' : 'Elapsed time'}>
                  <span className="stat-pill-icon">⏱️</span>
                  <span className="stat-pill-num">{formatTime(typingStats.elapsedSec)}</span>
                </div>
                <button
                  type="button"
                  onClick={resetTypingStats}
                  className="typing-stat-reset-btn"
                  title={L ? '타자 속도 및 기록 초기화' : 'Reset speed & accuracy stats'}
                >
                  ↺ {L ? '리셋' : 'Reset'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => update((st) => ({ showHandShadow: !st.showHandShadow }))} style={{ border: '1px solid var(--line3)', background: 'var(--bg2)', color: 'var(--ink)', borderRadius: '999px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .15s' }}>
                  <span>🖐️</span>
                  <span>손 그림자</span>
                </button>
                {!isCji && <button type="button" onClick={() => update((st) => ({ showKbGuide: !st.showKbGuide }))} style={{ border: '1px solid var(--accent)', background: 'rgba(35,73,63,0.08)', color: 'var(--accent-ink)', borderRadius: '999px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .15s' }}>
                  <span>🌐</span>
                  <span>QWERTY Korean Setup Guide</span>
                </button>}
                {isCji && <button type="button" onClick={() => update((st) => ({ showCjGuide: !st.showCjGuide }))} aria-expanded={showCjGuide} style={{ border: '1px solid var(--accent)', background: 'rgba(35,73,63,0.08)', color: 'var(--accent-ink)', borderRadius: '999px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .15s' }}>
                  <span>📱</span>
                  <span>Cheonjiin Keyboard Setup Guide</span>
                </button>}
              </div>
            </div>

            {showKbGuide && !isCji && (
              <div className="writing-kb-guide" style={{ background: 'var(--bg2)', border: '1.5px solid var(--accent)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 24px rgba(35,73,63,0.08)' }}>
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

            {showCjGuide && isCji && (
              <div className="writing-kb-guide" style={{ background: 'var(--bg2)', border: '1.5px solid var(--accent)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 24px rgba(35,73,63,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 420px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ font: "700 16px 'Newsreader',serif", color: 'var(--ink)' }}>📱 How to Set Up the Korean Cheonjiin Keyboard</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>Samsung · Android · iPhone</span>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--sub)', lineHeight: 1.5 }}>If you are learning Korean, try using the Cheonjiin (10-Key) keyboard. You do not need to change your phone's main language to Korean. You can simply add a Korean keyboard and switch to it whenever you need it.</span>
                  </div>
                  <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '10px', padding: '3px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => update({ cjGuideTab: 'samsung' })} style={guideTabStyle(cjGuideTab === 'samsung')}>📱 Samsung Galaxy</button>
                    <button type="button" onClick={() => update({ cjGuideTab: 'android' })} style={guideTabStyle(cjGuideTab === 'android')}>🤖 Other Android</button>
                    <button type="button" onClick={() => update({ cjGuideTab: 'ios' })} style={guideTabStyle(cjGuideTab === 'ios')}>🍎 iPhone</button>
                  </div>
                </div>

                {cjGuideTab === 'samsung' && (
                  <>
                    <span style={cjGuideNoteStyle}>On most Samsung Galaxy phones, you do not need to download an additional app. You can use the built-in <b>Samsung Keyboard</b>.</span>
                    <div style={cjGuideGridStyle}>
                      <GuideCard step="STEP 1" title="Open Settings">Open the <b>Settings</b> app.</GuideCard>
                      <GuideCard step="STEP 2" title="General Management">Tap <b>General management</b>.</GuideCard>
                      <GuideCard step="STEP 3" title="Keyboard Settings">Open <b>Samsung Keyboard settings</b>.</GuideCard>
                      <GuideCard step="STEP 4" title="Languages and Types">Select <b>Languages and types</b>.</GuideCard>
                      <GuideCard step="STEP 5" title="Add Korean">Add or enable <b>Korean (한국어)</b>.</GuideCard>
                      <GuideCard step="STEP 6" title="Choose Cheonjiin">Choose <b>Cheonjiin / 3×4</b> as the Korean keyboard layout.</GuideCard>
                    </div>
                    <span style={cjGuideTipStyle}>🌐 You can now tap the <b>globe icon</b> on the keyboard to switch between English and Korean.</span>
                  </>
                )}

                {cjGuideTab === 'android' && (
                  <>
                    <span style={cjGuideNoteStyle}>For other Android phones, <b>Gboard</b> is usually the easiest option.</span>
                    <div style={cjGuideGridStyle}>
                      <GuideCard step="DOWNLOAD FIRST" title="Install Gboard">Open the <b>Google Play Store</b>, search for <b>Gboard – the Google Keyboard</b>, and install the app on your phone.</GuideCard>
                      <GuideCard step="STEP 1" title="Open Gboard Settings">Open <b>Gboard Settings</b>.</GuideCard>
                      <GuideCard step="STEP 2" title="Add Keyboard">Tap <b>Languages</b> → <b>Add keyboard</b>.</GuideCard>
                      <GuideCard step="STEP 3" title="Select Korean">Select <b>Korean (한국어)</b>.</GuideCard>
                      <GuideCard step="STEP 4" title="Choose 10-Key">If available, choose the <b>10-Key</b> or <b>Cheonjiin-style</b> layout.</GuideCard>
                      <GuideCard step="STEP 5" title="Done">Tap <b>Done</b>.</GuideCard>
                    </div>
                    <span style={cjGuideTipStyle}>※ The available Korean keyboard layouts may vary depending on your phone model and Gboard version.</span>
                  </>
                )}

                {cjGuideTab === 'ios' && (
                  <>
                    <span style={cjGuideNoteStyle}>On iPhone, you do not need to download an additional keyboard app from the App Store. The Korean <b>10-Key</b> keyboard is built into iOS.</span>
                    <div style={cjGuideGridStyle}>
                      <GuideCard step="STEP 1" title="Open Settings">Open <b>Settings</b>.</GuideCard>
                      <GuideCard step="STEP 2" title="Keyboards">Go to <b>General</b> → <b>Keyboard</b> → <b>Keyboards</b>.</GuideCard>
                      <GuideCard step="STEP 3" title="Add New Keyboard">Tap <b>Add New Keyboard</b>.</GuideCard>
                      <GuideCard step="STEP 4" title="Select Korean">Select <b>Korean (한국어)</b>.</GuideCard>
                      <GuideCard step="STEP 5" title="Choose 10-Key">Choose <b>10-Key</b>.</GuideCard>
                      <GuideCard step="STEP 6" title="Done">Tap <b>Done</b>.</GuideCard>
                    </div>
                    <span style={cjGuideTipStyle}>🌐 When typing, tap the <b>globe icon</b> to switch between English and Korean.</span>
                  </>
                )}
              </div>
            )}

            {isCji && !showCjGuide && (
              <>
                <div className="writing-keyboard-viewport" style={{ position: 'relative', background: 'var(--bg)', border: '1px solid var(--line2)', borderRadius: '18px', padding: '16px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)', width: '100%' }}>
                  <div className="writing-cji-bubble-row" style={{ width: '100%', position: 'relative', height: '38px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="writing-cji-bubble" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0F172A', color: '#FFFFFF', padding: '7px 16px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(15,23,42,0.35), 0 0 0 1px rgba(255,255,255,0.15)', border: '1.5px solid #38BDF8', whiteSpace: 'nowrap', maxWidth: '100%', zIndex: 2 }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8', flex: 'none' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis' }}><Interp>{activeStepGuide}</Interp></span>
                      <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #0F172A' }} />
                    </div>
                  </div>
                  <div className="writing-cji-root">
                    <svg viewBox="-36 0 588 350" xmlns="http://www.w3.org/2000/svg" role="group" aria-label={L ? '천지인 키패드' : 'Cheonjiin keypad'}>
                      <defs>
                        <filter id="cjKeyShadow" x="-10%" y="-10%" width="120%" height="130%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.06)" />
                        </filter>
                      </defs>
                      {/* 스마트폰 기기 외곽 프레임 */}
                      <rect x="4" y="4" width="508" height="324" rx="24" fill="var(--bg)" stroke="var(--line2)" strokeWidth="1.5" opacity="0.8" />
                      {/* 천지인 키패드 디스플레이 영역 */}
                      <rect x="10" y="10" width={CJ_VIEWBOX.w - 20} height={CJ_VIEWBOX.h - 20} rx="20" fill="var(--card)" stroke="var(--line2)" strokeWidth="1.5" />
                      <g className="keys-layer">
                        {CJ_ROWS.map((row) => row.map((k) => {
                          const isTarget = !!cjTargetKey && k.key === cjTargetKey.key;
                          let fill = k.isSpecial ? 'var(--chip)' : 'var(--card)';
                          let stroke = 'var(--line2)';
                          let strokeWidth = '1';
                          let labelColor = k.isSpecial ? 'var(--ink2)' : 'var(--ink)';
                          let subColor = 'var(--faint)';
                          if (isTarget) {
                            fill = isError ? '#E53935' : '#B25353';
                            stroke = isError ? '#B71C1C' : '#8E3636';
                            strokeWidth = '2';
                            labelColor = '#FFFFFF';
                            subColor = 'rgba(255,255,255,0.85)';
                          }
                          const sub = k.sub ? k.sub[L ? 0 : 1] : null;
                          return (
                            <g key={k.key} className={`key-node ${isTarget ? (isError ? 'key-error' : 'key-target') : ''}`} onClick={() => handleCjKey(k.key)} style={{ cursor: 'pointer' }}>
                              <rect x={k.x} y={k.y} width={k.w} height={k.h} rx="12" ry="12" fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter="url(#cjKeyShadow)" />
                              {k.num && <text x={k.x + 11} y={k.y + 17} fontFamily="'IBM Plex Mono', monospace" fontSize="11" fontWeight="600" fill={subColor}>{k.num}</text>}
                              <text x={k.cx} y={sub ? k.cy - 2 : k.cy + 8} textAnchor="middle" fontFamily="'Pretendard', sans-serif" fontSize={k.isSpecial ? (k.label.length > 2 ? '15' : '20') : '24'} fontWeight="700" fill={labelColor}>{k.label}</text>
                              {sub && <text x={k.cx} y={k.cy + 18} textAnchor="middle" fontFamily="'Pretendard', sans-serif" fontSize="11.5" fontWeight="600" fill={subColor}>{sub}</text>}
                            </g>
                          );
                        }))}
                      </g>
                      {showHandShadow && !ok && (
                        <CheonjiinHandGrip targetKey={cjTargetKey} opacity={1} />
                      )}
                    </svg>
                  </div>
                </div>
                {keyboardFooter}
              </>
            )}

            {!isCji && !showKbGuide && (
              <>
                <div className="writing-keyboard-viewport" style={{ position: 'relative', background: 'var(--bg)', border: '1px solid var(--line2)', borderRadius: '18px', padding: '6px 12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)', width: '100%', maxWidth: '964px', margin: '0 auto' }}>
                  <div style={{ width: '100%', maxWidth: '940px', position: 'relative', height: '36px', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: '21.7%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0F172A', color: '#FFFFFF', padding: '6px 14px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(15,23,42,0.35), 0 0 0 1px rgba(255,255,255,0.15)', border: '1.5px solid #38BDF8', whiteSpace: 'nowrap', zIndex: 2 }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}><Interp>{activeStepGuide}</Interp></span>
                      <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #0F172A' }} />
                    </div>
                  </div>
                  <div id="virtual-keyboard-root" style={{ width: '100%', maxWidth: '940px', display: 'flex', justifyContent: 'center' }}>
                    <svg viewBox="0 26 980 334" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: '940px', display: 'block' }}>
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
                              <text x={k.cx} y={k.isSpecial ? k.cy + 5 : k.y + 23} textAnchor="middle" fontFamily="'Pretendard', sans-serif" fontSize={k.isSpecial ? (k.ko.length > 4 ? '11' : '13') : '17.5'} fontWeight="700" fill={textKoColor}>{displayKo}</text>
                              {!k.isSpecial && (
                                <text x={k.cx} y={k.y + 40} textAnchor="middle" fontFamily="'Pretendard', monospace" fontSize="12" fontWeight="600" fill={textEnColor}>{displayEn}</text>
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

                {keyboardFooter}
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
