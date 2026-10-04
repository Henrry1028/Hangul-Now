import React, { useRef } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { loadLearnedTopics, recordLearnedTopic } from '../data/learnedData.js';
import { SENTS, SPEAKING_TEXT } from '../data/speakingData.js';
import useTutorSpeech from '../hooks/useTutorSpeech.js';
import '../styles/speaking.css';

const STUDY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const roundButton = { width: '56px', height: '56px', borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--bg2)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--ink2)' };

function SpeakingPage({
  lang = 'ko',
  selectedTutorId = 'jiwoo',
  showRomanization = true,
  speakingState,
  onSpeakingStateChange,
  studyLevel = 'beginner',
  onStudyLevelChange,
  translationState,
  onToggleTranslation,
  onRecordActivity,
  userId = null
}) {
  const L = lang === 'ko' ? 1 : 0;
  const t = SPEAKING_TEXT[lang] || SPEAKING_TEXT.en;
  const s = speakingState;
  const update = onSpeakingStateChange;
  const tutor = TUTORS.find((item) => item.id === selectedTutorId) || TUTORS[0];
  const tutorName = L ? tutor.ko : tutor.en;
  const speech = useTutorSpeech(selectedTutorId);

  const stateRef = useRef(speakingState);
  stateRef.current = speakingState;
  const studyLevelRef = useRef(studyLevel);
  studyLevelRef.current = studyLevel;

  const generateSpeaking = async (level) => {
    const lv = level || studyLevelRef.current || 'beginner';
    if (stateRef.current.genLoading) return;
    update({ genLoading: true, genError: '' });
    try {
      const seen = Object.values(loadLearnedTopics('speaking')).map((v) => v.label).filter(Boolean);
      const payload = JSON.stringify({ kind: 'speaking', level: lv, userId, seenTopics: seen });
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
      if (data.topic) recordLearnedTopic('speaking', `${lv}:${data.topic}`, data.topic, userId);
      update({ genLoading: false, genError: '', genSpeaking: data, sIdx: 0, rec: 'idle' });
    } catch (err) {
      update({ genLoading: false, genError: `새 자료를 만들지 못했어요: ${err.message}` });
    }
  };

  const handleStudyLevel = (level) => {
    if (studyLevelRef.current === level) return;
    onStudyLevelChange?.(level);
    generateSpeaking(level);
  };

  const gS = s.genSpeaking;
  const SENTS_SRC = gS?.sentences?.length
    ? gS.sentences.map((x) => ({
      text: x.text, roman: x.roman || '', en: x.en || '', pron: x.pron || '', score: 88,
      weak: Array.isArray(x.weakIndex) ? x.weakIndex : [], tip: [x.tipEn || x.tipKo || '', x.tipKo || x.tipEn || '']
    }))
    : SENTS;
  const sent = SENTS_SRC[s.sIdx % SENTS_SRC.length];
  const nativeSpeechKey = `speaking-native:${selectedTutorId}:${sent.text}`;
  const recDone = s.rec === 'done';
  const sylls = [...sent.text].map((ch, i) => {
    const w = recDone && sent.weak.includes(i);
    return { ch: ch === ' ' ? ' ' : ch, c: w ? 'var(--hot)' : 'var(--ink)', u: w ? 'var(--hot)' : 'transparent' };
  });
  const recording = s.rec === 'rec';
  const recLabel = recording ? (L ? '멈춤' : 'Stop') : recDone ? (L ? '다시' : 'Retry') : (L ? '녹음' : 'Record');
  const recHint = recording
    ? (L ? '듣고 있어요… 문장을 소리 내어 읽어 주세요' : 'Listening… read the sentence aloud')
    : recDone ? (L ? '눌러서 다시 해 보세요' : 'Tap to try again') : (L ? '누르고 문장을 소리 내어 읽어 보세요' : 'Tap and read the sentence aloud');
  const levelLabels = { beginner: L ? '초급' : 'Beginner', intermediate: L ? '중급' : 'Intermediate', advanced: L ? '고급' : 'Advanced' };

  const toggleRec = () => {
    const nextRec = s.rec === 'rec' ? 'done' : 'rec';
    update({ rec: nextRec });
    if (nextRec === 'done') {
      onRecordActivity?.({
        type: 'speaking',
        module: '발음 코칭',
        icon: '🎙️',
        title: `AI 발음 코칭: ${sent.text}`,
        detail: `발음 정확도: ${sent.score}점 · ${sent.pron}`,
        xp: 25,
        tag: `발음 ${sent.score}점`
      });
    }
  };

  return (
    <div className="speaking-screen" data-screen-label="08 Speaking">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.1em' }}>{t.sEyebrow}</span>
          <h1 style={{ margin: 0, font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>{t.sTitle}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!s.genLoading && (
            <button type="button" onClick={() => generateSpeaking()} style={{ border: '1px solid var(--line3)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{L ? '새로 생성' : 'New material'}</button>
          )}
          {s.genLoading && (
            <span style={{ fontSize: '13px', color: 'var(--hot)', fontWeight: 600, whiteSpace: 'nowrap', padding: '8px 12px' }}>{L ? '만드는 중…' : 'Generating…'}</span>
          )}
          <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '12px', padding: '4px' }}>
            {STUDY_LEVELS.map((level) => (
              <button type="button" key={level} onClick={() => handleStudyLevel(level)} style={{ border: 0, background: studyLevel === level ? 'var(--accent)' : 'transparent', color: studyLevel === level ? '#fff' : 'var(--ink2)', borderRadius: '9px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{levelLabels[level]}</button>
            ))}
          </div>
          <button type="button" onClick={onToggleTranslation} style={{ border: '1px solid var(--line3)', background: translationState.trOn ? 'var(--accent-soft)' : 'var(--card)', color: translationState.trOn ? 'var(--accent-ink)' : 'var(--ink)', borderRadius: '999px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {translationState.trOn ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English')}
          </button>
          {/* Legacy quirk: the counter uses the static sentence count even for generated material. */}
          <span style={{ font: "500 13px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{`${(s.sIdx % SENTS.length) + 1} / ${SENTS.length}`}</span>
        </div>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '24px', padding: 'clamp(28px,5vw,48px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {sylls.map((y, i) => (
            <span key={i} style={{ font: "700 clamp(36px,6vw,56px)/1.25 'Gowun Batang',serif", color: y.c, borderBottom: `3px solid ${y.u}`, minWidth: '.3em' }}>{y.ch}</span>
          ))}
        </div>
        {s.genError && <div style={{ background: 'var(--hot-soft)', border: '1px solid var(--hot)', borderRadius: '12px', padding: '12px 16px', fontSize: '13.5px' }}>{s.genError}</div>}
        {showRomanization && <span style={{ font: "400 15px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{sent.roman}</span>}
        <span style={{ fontSize: '15px', color: 'var(--sub)' }}>{translationState.trOn && <>“{sent.en}” · </>}{t.soundsLike} <b style={{ color: 'var(--ink)', fontFamily: "'Gowun Batang',serif" }}>{sent.pron}</b></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginTop: '12px' }}>
          <button type="button" onClick={() => speech.play(sent.text, nativeSpeechKey)} title={L ? `${tutor.ko} 튜터 목소리로 예문 듣기` : `Hear the example in ${tutor.en}'s voice`} style={roundButton}>{t.native} 🔊</button>
          <button type="button" onClick={toggleRec} style={{ width: '92px', height: '92px', borderRadius: '50%', border: 0, background: recording ? 'var(--hot)' : 'var(--solid)', color: recording ? '#fff' : 'var(--on-solid)', cursor: 'pointer', fontSize: '15px', fontWeight: 700, animation: recording ? 'pulse 1.2s infinite' : 'none' }}>{recLabel}</button>
          <button type="button" onClick={() => update((prev) => ({ sIdx: prev.sIdx + 1, rec: 'idle' }))} style={roundButton}>{t.next}</button>
        </div>
        <span style={{ fontSize: '13.5px', color: 'var(--faint)' }}>{recHint}</span>
      </div>
      {recDone && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '16px' }}>
          <div style={{ background: '#23493F', color: '#F5F2EB', borderRadius: '18px', padding: '22px', display: 'flex', gap: '10px', alignItems: 'flex-end', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '13px', color: '#A9C1B6' }}>{t.pronLabel}</span><span style={{ font: "500 52px/1 'Newsreader',serif" }}>{sent.score}</span><span style={{ fontSize: '13.5px', color: '#DCE5E0' }}>{t.pronHint}</span></div>
            <img src="/assets/캐릭터-정이.png" alt="" style={{ width: '96px', flex: 'none', margin: '-20px -12px -26px 0' }} />
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}><span style={{ fontSize: '14px', fontWeight: 700 }}>{L ? `${tutorName} 튜터의 팁` : `Tip from ${tutorName}`}</span><span style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--ink2)' }}>{sent.tip[L]}</span></div>
        </div>
      )}
    </div>
  );
}

export default SpeakingPage;
