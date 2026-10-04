import React, { useEffect, useRef } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { loadLearnedTopics, recordLearnedTopic } from '../data/learnedData.js';
import { DICTATIONS, LISTENING_TEXT, LQ, SCRIPT } from '../data/listeningData.js';
import '../styles/listening.css';

const STUDY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const errorBoxStyle = { background: 'var(--hot-soft)', border: '1px solid var(--hot)', borderRadius: '12px', padding: '12px 16px', fontSize: '13.5px' };

function ListeningPage({
  lang = 'ko',
  selectedTutorId = 'jiwoo',
  listeningState,
  onListeningStateChange,
  studyLevel = 'beginner',
  onStudyLevelChange,
  translationState,
  onTranslationStateChange,
  onToggleTranslation,
  onRecordActivity,
  userId = null
}) {
  const L = lang === 'ko' ? 1 : 0;
  const t = LISTENING_TEXT[lang] || LISTENING_TEXT.en;
  const s = listeningState;
  const tr = translationState;
  const tutor = TUTORS.find((item) => item.id === selectedTutorId) || TUTORS[0];
  const tutorName = L ? tutor.ko : tutor.en;

  const stateRef = useRef(listeningState);
  stateRef.current = listeningState;
  const studyLevelRef = useRef(studyLevel);
  studyLevelRef.current = studyLevel;

  const audioRef = useRef(null);
  const requestRef = useRef(null);
  const objectUrlRef = useRef(null);
  const speechRef = useRef(null);
  const timerRef = useRef(null);
  const fallbackStartedAtRef = useRef(0);

  const update = onListeningStateChange;
  const updateTr = onTranslationStateChange;

  const clearListeningTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const releaseListeningAudio = () => {
    if (requestRef.current) { requestRef.current.abort(); requestRef.current = null; }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis && speechRef.current) window.speechSynthesis.cancel();
    speechRef.current = null;
    clearListeningTimer();
  };

  const stopListeningAudio = (reset = true) => {
    releaseListeningAudio();
    if (reset) update({ playing: false, prog: 0, listeningStatus: 'idle', listeningDuration: 0, listeningProvider: '', listeningSource: '' });
  };

  // Legacy go(): leaving Listening stops and resets playback.
  const stopRef = useRef(stopListeningAudio);
  stopRef.current = stopListeningAudio;
  useEffect(() => () => stopRef.current(true), []);

  const startListeningFallback = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      update({ playing: false, listeningStatus: 'error', listeningError: '이 브라우저에서 음성 재생을 지원하지 않습니다.' });
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices().filter((v) => String(v.lang || '').toLowerCase().startsWith('ko'));
    if (voices.length) utterance.voice = voices[0];
    utterance.lang = 'ko-KR';
    utterance.rate = stateRef.current.speed || 1;
    utterance.pitch = 1;
    const duration = Math.max(6, text.length / (4.2 * utterance.rate));
    speechRef.current = utterance;
    fallbackStartedAtRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - fallbackStartedAtRef.current) / 1000;
      update({ prog: Math.min(1, elapsed / duration) });
    };
    utterance.onstart = () => {
      update({ playing: true, listeningStatus: 'playing', listeningDuration: duration, listeningProvider: 'device', listeningError: '' });
      clearListeningTimer();
      timerRef.current = setInterval(tick, 200);
    };
    utterance.onend = () => {
      clearListeningTimer();
      speechRef.current = null;
      update({ playing: false, prog: 1, listeningStatus: 'ended' });
    };
    utterance.onerror = (event) => {
      clearListeningTimer();
      speechRef.current = null;
      update({ playing: false, listeningStatus: 'error', listeningError: `기기 음성을 재생하지 못했습니다: ${event.error || 'unknown'}` });
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const toggleListeningAudio = async (text, segments = [], ready = true) => {
    const st = stateRef.current;
    const speechText = String(text || '').trim();
    const speechSource = `${selectedTutorId}:${speechText}`;
    if (!ready || !speechText || st.listeningStatus === 'loading') return;
    if (st.playing) {
      if (audioRef.current) audioRef.current.pause();
      if (speechRef.current && window.speechSynthesis) window.speechSynthesis.pause();
      clearListeningTimer();
      update({ playing: false, listeningStatus: 'paused' });
      return;
    }
    if (audioRef.current && st.listeningSource === speechSource && audioRef.current.currentTime < audioRef.current.duration) {
      audioRef.current.playbackRate = st.speed || 1;
      await audioRef.current.play();
      update({ playing: true, listeningStatus: 'playing', listeningError: '' });
      return;
    }
    if (speechRef.current && st.listeningSource === speechSource && window.speechSynthesis?.paused) {
      const duration = st.listeningDuration || 1;
      fallbackStartedAtRef.current = performance.now() - st.prog * duration * 1000;
      window.speechSynthesis.resume();
      clearListeningTimer();
      timerRef.current = setInterval(() => {
        const elapsed = (performance.now() - fallbackStartedAtRef.current) / 1000;
        update({ prog: Math.min(1, elapsed / duration) });
      }, 200);
      update({ playing: true, listeningStatus: 'playing', listeningError: '' });
      return;
    }

    releaseListeningAudio();
    const controller = new AbortController();
    requestRef.current = controller;
    update({ playing: false, prog: 0, listeningStatus: 'loading', listeningError: '', listeningSource: speechSource, listeningProvider: '' });
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText, segments, tutorId: selectedTutorId }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`TTS_HTTP_${response.status}`);
      const blob = await response.blob();
      if (!blob.size || !String(blob.type || response.headers.get('content-type') || '').startsWith('audio/')) throw new Error('TTS_INVALID_AUDIO');
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.playbackRate = stateRef.current.speed || 1;
      requestRef.current = null;
      objectUrlRef.current = url;
      audioRef.current = audio;
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration)) update({ listeningDuration: audio.duration });
      };
      audio.ontimeupdate = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) update({ prog: Math.min(1, audio.currentTime / audio.duration), listeningDuration: audio.duration });
      };
      audio.onended = () => update({ playing: false, prog: 1, listeningStatus: 'ended' });
      audio.onerror = () => update({ playing: false, listeningStatus: 'error', listeningError: '서버 음성을 재생하지 못했습니다.' });
      await audio.play();
      update({ playing: true, listeningStatus: 'playing', listeningProvider: response.headers.get('X-TTS-Provider') || 'server', listeningError: '' });
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn('[Listening TTS] Server voice unavailable; using device Korean voice.', err.message);
      requestRef.current = null;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
      startListeningFallback(speechText);
    }
  };

  const setListeningSpeed = (speed) => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
    update({ speed });
  };

  const generateListening = async (level) => {
    const lv = level || studyLevelRef.current || 'beginner';
    if (stateRef.current.genLoading) return;
    stopListeningAudio(true);
    update({ genLoading: true, genError: '' });
    try {
      const seen = Object.values(loadLearnedTopics('listening')).map((v) => v.label).filter(Boolean);
      const payload = JSON.stringify({ kind: 'listening', level: lv, userId, seenTopics: seen });
      const request = () => fetch('/api/content/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload
      });
      let res;
      try {
        res = await request();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
        res = await request();
      }
      if (!res.ok) throw new Error(`서버 응답 ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.topic) recordLearnedTopic('listening', `${lv}:${data.topic}`, data.topic, userId);
      update({
        genLoading: false,
        genError: '',
        genListening: data,
        lAns: {},
        dictInputs: {},
        dictAnswers: {},
        prog: 0,
        playing: false,
        showScript: false,
        listeningDuration: 0,
        listeningProvider: '',
        listeningStatus: 'idle'
      });
      updateTr({ studyTrans: {} });
    } catch (err) {
      update({ genLoading: false, genError: `새 자료를 만들지 못했어요: ${err.message}` });
    }
  };

  const handleStudyLevel = (level) => {
    if (studyLevelRef.current === level) return;
    onStudyLevelChange?.(level);
    generateListening(level);
  };

  const submitDictationAt = (index, answer, total) => {
    const st = stateRef.current;
    const value = String((st.dictInputs || {})[index] || '').trim();
    if (!value || !answer || index >= total) return;
    const clean = (text) => String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const isCorrect = clean(value) === clean(answer);
    onRecordActivity?.({
      type: 'listening',
      module: '듣기 받아쓰기',
      icon: '🎧',
      title: isCorrect ? `받아쓰기 정답: ${answer}` : `받아쓰기 제출: ${value}`,
      detail: isCorrect ? `"${answer}" 정확하게 듣고 정답 처리` : `제출: "${value}" (정답: "${answer}")`,
      xp: isCorrect ? 25 : 10,
      tag: isCorrect ? '받아쓰기 정답' : '받아쓰기'
    });
    update((prev) => ({ dictAnswers: { ...(prev.dictAnswers || {}), [index]: { value, correct: isCorrect } } }));
    setTimeout(() => {
      const next = document.querySelector(`[data-dict-index="${index + 1}"]`);
      if (next && typeof next.focus === 'function') next.focus();
    }, 0);
  };

  const studyTrans = tr.studyTrans || {};
  const gL = s.genListening;
  const SCRIPT_SRC = gL?.script?.length ? gL.script.map((x) => ({ who: [x.whoEn || x.whoKo || '', x.whoKo || x.whoEn || ''], text: x.text, en: x.en || '' })) : SCRIPT;
  const LQ_SRC = gL?.questions?.length ? gL.questions : LQ;
  const listeningSpeechText = SCRIPT_SRC.map((line) => line.text).filter(Boolean).join(' ');
  const listeningSegments = SCRIPT_SRC.filter((line) => line.text).map((line) => ({ speaker: line.who?.[1] || line.who?.[0] || '상대', text: line.text }));
  const listeningGenerating = !!s.genLoading;
  const listeningReady = !listeningGenerating && !!listeningSpeechText;
  const estimatedListeningDuration = Math.max(6, listeningSpeechText.length / 4.2);
  const listeningDuration = s.listeningDuration || estimatedListeningDuration;
  const sec = Math.min(Math.round(s.prog * listeningDuration), Math.round(listeningDuration));
  const bars = Array.from({ length: 48 }, (_, i) => {
    const h = 18 + Math.abs(Math.sin(i * 1.7) * 50 + Math.sin(i * 0.45) * 28);
    const active = i / 48 <= s.prog;
    return {
      h: `${Math.min(100, h)}%`,
      c: active ? (i % 3 === 0 ? '#7DD3FC' : '#38BDF8') : (i % 4 === 0 ? '#315F7D' : '#234A66'),
      opacity: active ? '1' : '.72',
      shadow: active ? '0 0 10px rgba(56,189,248,.58)' : 'none',
      animation: s.playing ? `listeningWaveLive ${0.72 + (i % 7) * 0.055}s ${-(i % 9) * 0.06}s ease-in-out infinite` : 'none'
    };
  });

  const generatedDictations = gL?.dictations?.length ? gL.dictations : gL?.dictation ? [gL.dictation] : [];
  const DICTATION_SRC = [...generatedDictations, ...DICTATIONS.filter((base) => !generatedDictations.some((item) => item?.sentence === base.sentence))].slice(0, 3);

  const playLabel = listeningGenerating ? (L ? '자료 생성 중…' : 'Generating material…')
    : s.listeningStatus === 'loading' ? (L ? '음성 준비 중…' : 'Preparing audio…')
      : s.playing ? (L ? '일시정지' : 'Pause')
        : (s.prog >= 1 ? (L ? '다시 듣기' : 'Replay') : (L ? '재생' : 'Play'));
  const playIcon = (listeningGenerating || s.listeningStatus === 'loading') ? '◌' : s.playing ? 'Ⅱ' : '▶';
  const playTime = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const totalSec = Math.round(listeningDuration);
  const listeningTotalTime = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
  const provider = String(s.listeningProvider || '');
  const listeningProviderLabel = listeningGenerating ? (L ? '새 자료가 완성되면 재생할 수 있어요' : 'Playback unlocks when generation finishes')
    : s.listeningStatus === 'loading' ? (L ? `${tutorName} 튜터 음성 준비 중` : `Preparing ${tutorName}'s voice`)
      : s.listeningProvider === 'device' ? (L ? '기기 한국어 음성' : 'Device Korean voice')
        : provider.includes('MultiSpeaker') ? (L ? `${tutorName} 튜터 + 상대역 음성` : `${tutorName} + dialogue partner`)
          : provider.includes('Gemini') ? (L ? `${tutorName} 튜터 자연 음성` : `${tutorName}'s natural voice`)
            : (L ? 'AI 한국어 음성' : 'AI Korean voice');

  const listeningTitle = gL?.topic || t.lTitle;
  const listeningTitleEn = gL?.topicEn || studyTrans[gL?.topic] || '';
  const showListeningTitleEn = !!(tr.trOn && gL && (gL.topicEn || studyTrans[gL.topic]));
  const listeningSub = gL ? (L ? '두 번 듣고 문제를 풀어 보세요. 막힐 때만 대본을 열어요.' : 'Listen twice, then answer. Open the script only when you’re stuck.') : t.lSub;
  const levelLabels = { beginner: L ? '초급' : 'Beginner', intermediate: L ? '중급' : 'Intermediate', advanced: L ? '고급' : 'Advanced' };

  return (
    <div className="listening-screen" data-screen-label="05 Listening">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.1em' }}>{t.lEyebrow}</span>
          <h1 style={{ margin: 0, font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>
            {listeningTitle}{' '}
            {!gL && <span style={{ font: "400 .6em 'Gowun Batang',serif", color: 'var(--faint)' }}>{t.lTitleSub}</span>}
            {showListeningTitleEn && <span style={{ font: "400 .52em 'Pretendard',sans-serif", color: 'var(--faint)' }}> · {listeningTitleEn}</span>}
          </h1>
          <span style={{ color: 'var(--sub)' }}>{listeningSub}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!listeningGenerating && (
            <button type="button" onClick={() => generateListening()} style={{ border: '1px solid var(--line3)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{L ? '새로 생성' : 'New material'}</button>
          )}
          {listeningGenerating && (
            <span style={{ fontSize: '13px', color: 'var(--hot)', fontWeight: 600, whiteSpace: 'nowrap', padding: '8px 12px' }}>{L ? '만드는 중…' : 'Generating…'}</span>
          )}
          <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '12px', padding: '4px' }}>
            {STUDY_LEVELS.map((level) => (
              <button
                type="button"
                key={level}
                onClick={() => handleStudyLevel(level)}
                style={{ border: 0, background: studyLevel === level ? 'var(--accent)' : 'transparent', color: studyLevel === level ? '#fff' : 'var(--ink2)', borderRadius: '9px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                {levelLabels[level]}
              </button>
            ))}
          </div>
          <button type="button" onClick={onToggleTranslation} style={{ border: '1px solid var(--line3)', background: tr.trOn ? 'var(--accent-soft)' : 'var(--card)', color: tr.trOn ? 'var(--accent-ink)' : 'var(--ink)', borderRadius: '999px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {tr.trOn ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English')}
          </button>
        </div>
      </div>
      {s.genError && <div style={errorBoxStyle}>{s.genError}</div>}
      {tr.translationError && <div style={errorBoxStyle}>{tr.translationError}</div>}
      <div className="listening-player" style={{ borderRadius: '22px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div className="listening-wave-shell">
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '64px' }}>
            {bars.map((b, i) => (
              <span key={i} className="listening-wave-bar" style={{ flex: 1, height: b.h, background: b.c, opacity: b.opacity, boxShadow: b.shadow, borderRadius: '999px', animation: b.animation }} />
            ))}
          </div>
          <div className="listening-progress-track"><div className="listening-progress-fill" style={{ width: `${Math.round((s.prog || 0) * 100)}%` }} /></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="listening-control"
            onClick={() => toggleListeningAudio(listeningSpeechText, listeningSegments, listeningReady)}
            aria-disabled={String(!listeningReady)}
            style={{ height: '48px', padding: '0 22px', borderRadius: '999px', border: '1px solid rgba(125,211,252,.45)', background: 'linear-gradient(135deg,#E7F7FF,#BFEBFF)', color: '#08243A', cursor: listeningReady ? 'pointer' : 'not-allowed', pointerEvents: listeningReady ? 'auto' : 'none', opacity: listeningReady ? '1' : '.5', fontSize: '14px', fontWeight: 800, flex: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>{playIcon}</span><span>{playLabel}</span>
          </button>
          <span style={{ font: "500 13px 'IBM Plex Mono',monospace", color: '#B9D7E8' }}>{playTime} / {listeningTotalTime}</span>
          <span style={{ fontSize: '11.5px', color: '#7DD3FC', border: '1px solid rgba(125,211,252,.24)', borderRadius: '999px', padding: '4px 9px' }}>{listeningProviderLabel}</span>
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {[0.75, 1, 1.25].map((v) => (
              <button type="button" key={v} onClick={() => setListeningSpeed(v)} style={{ border: '1px solid #45443F', background: s.speed === v ? '#DDF4FF' : 'transparent', color: s.speed === v ? '#08243A' : '#B9D7E8', borderRadius: '8px', padding: '6px 10px', font: "500 12px 'IBM Plex Mono',monospace", cursor: 'pointer' }}>{`${v.toFixed(2).replace(/0$/, '')}×`}</button>
            ))}
          </div>
          <button type="button" onClick={() => update((prev) => ({ showScript: !prev.showScript }))} style={{ border: '1px solid #45443F', background: 'transparent', color: '#F5F2EB', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>
            {s.showScript ? (L ? '대본 숨기기' : 'Hide script') : (L ? '대본 보기' : 'Show script')}
          </button>
        </div>
        {s.showScript && (
          <div style={{ borderTop: '1px solid #33362F', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SCRIPT_SRC.map((l, i) => {
              const en = l.en || studyTrans[l.text] || '';
              return (
                <div key={i} style={{ display: 'flex', gap: '14px', fontSize: '15.5px', lineHeight: 1.55 }}>
                  <span style={{ width: '72px', flex: 'none', color: '#A9C1B6', fontSize: '13px', paddingTop: '2px' }}>{l.who[L]}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{l.text}</span>
                    {tr.trOn && <span style={{ fontSize: '13px', color: '#8F8C83' }}>{en}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {s.listeningError && <div style={{ ...errorBoxStyle, color: 'var(--ink)' }}>{s.listeningError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '20px' }}>
        {LQ_SRC.map((q, qi) => {
          const qEn = q.en || studyTrans[q.q] || '';
          return (
            <div key={`q-${qi}`} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>Q{qi + 1}</span>
              <span style={{ fontSize: '17px', fontWeight: 600 }}>{q.q}</span>
              {tr.trOn && <span style={{ fontSize: '13.5px', color: 'var(--faint)', marginTop: '-4px' }}>{qEn}</span>}
              {q.opts.map((o, oi) => {
                const picked = s.lAns[qi] === oi;
                const answered = s.lAns[qi] != null;
                const right = oi === q.a;
                const optionEn = q.optsEn?.[oi] || studyTrans[o] || '';
                const pick = () => {
                  update((prev) => ({ lAns: { ...prev.lAns, [qi]: oi } }));
                  onRecordActivity?.({
                    type: 'listening',
                    module: '듣기 퀴즈',
                    icon: '🎧',
                    title: `듣기 문제 풀이 (${qi + 1}번)`,
                    detail: `"${q.q}" ➔ 선택: "${o}" ${right ? '(정답 🎉)' : '(오답)'}`,
                    xp: right ? 20 : 10,
                    tag: right ? '정답 +20XP' : '듣기'
                  });
                };
                const bd = answered && right ? 'var(--accent-ink)' : picked ? 'var(--hot)' : 'var(--line)';
                const bg = answered && right ? 'var(--accent-soft)' : picked ? 'var(--hot-soft)' : 'var(--card)';
                const mark = answered && right ? (L ? '정답' : 'Correct') : picked ? (L ? '다시 해 봐요' : 'Try again') : '';
                return (
                  <button type="button" key={`o-${qi}-${oi}`} onClick={pick} style={{ textAlign: 'left', border: `1.5px solid ${bd}`, background: bg, borderRadius: '12px', padding: '12px 14px', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span>{o}</span>
                      {tr.trOn && optionEn && <span style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--faint)', fontWeight: 400 }}>{optionEn}</span>}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: right ? 'var(--accent-ink)' : 'var(--hot)', flex: 'none' }}>{mark}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
        {DICTATION_SRC.map((item, index) => {
          const answer = String(item?.answer || '');
          const value = String((s.dictInputs || {})[index] || '');
          const submitted = (s.dictAnswers || {})[index];
          const correct = !!submitted?.correct;
          const parts = String(item?.sentence || '').split(answer);
          const en = item?.en || studyTrans[item?.sentence] || SCRIPT_SRC.find((line) => line.text === item?.sentence)?.en || '';
          const msg = submitted
            ? (correct ? (L ? (item.okKo || '정답이에요!') : (item.okEn || 'Correct!')) : (L ? '아쉬워요. 다시 들어 보세요.' : 'Not quite. Listen again.'))
            : (L ? `힌트: ${item.hintKo || ''}` : `Hint: ${item.hintEn || ''}`);
          const bd = submitted ? (correct ? 'var(--accent-ink)' : 'var(--hot)') : value ? 'var(--accent)' : 'var(--line3)';
          const cardBd = submitted ? (correct ? 'var(--accent-ink)' : 'var(--hot)') : 'var(--line)';
          const color = submitted ? (correct ? 'var(--accent-ink)' : 'var(--hot)') : 'var(--faint)';
          return (
            <div key={`d-${index}`} style={{ background: 'var(--card)', border: `1px solid ${cardBd}`, borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}><span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{t.lDictLabel}</span><span style={{ font: "600 12px 'IBM Plex Mono',monospace", color: 'var(--accent-ink)' }}>{`${index + 1} / ${DICTATION_SRC.length}`}</span></div>
              <span style={{ fontSize: '13.5px', color: 'var(--faint)' }}>{t.lDictHint}</span>
              <span style={{ fontSize: '17px', lineHeight: 1.7 }}>
                “{parts[0] || ''}
                <input
                  value={value}
                  onChange={(e) => { const next = e.target.value; update((prev) => ({ dictInputs: { ...(prev.dictInputs || {}), [index]: next } })); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent?.isComposing) { e.preventDefault(); submitDictationAt(index, answer, DICTATION_SRC.length); } }}
                  data-dict-index={index}
                  placeholder="____"
                  aria-label={L ? `${index + 1}번 받아쓰기 정답` : `Dictation answer ${index + 1}`}
                  style={{ width: 'min(180px,42vw)', border: 0, borderBottom: `2px solid ${bd}`, background: 'transparent', color: 'var(--ink)', fontSize: '17px', textAlign: 'center', outline: 'none' }}
                />
                {parts[1] || ''}”
              </span>
              {tr.trOn && en && <span style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--faint)' }}>{en}</span>}
              <span style={{ fontSize: '13.5px', color }}>{msg}</span>
              <span style={{ fontSize: '12px', color: 'var(--faint)' }}>{index < DICTATION_SRC.length - 1 ? (L ? 'Enter를 누르면 다음 칸으로 이동해요.' : 'Press Enter to move to the next box.') : (L ? 'Enter를 눌러 답을 확인하세요.' : 'Press Enter to check your answer.')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ListeningPage;
