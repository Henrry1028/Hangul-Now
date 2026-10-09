import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { loadLearnedTopics, recordLearnedTopic } from '../data/learnedData.js';
import { SENTS, SPEAKING_TEXT } from '../data/speakingData.js';
import useTutorSpeech from '../hooks/useTutorSpeech.js';
import '../styles/speaking.css';
import { authHeaders } from '../data/authHeaders.js';

const STUDY_LEVELS = ['beginner', 'intermediate', 'advanced'];

// 한글 음절 자모 분해를 통한 정밀 발음 유사도 측정 헬퍼
function decomposeHangul(char) {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const index = code - 0xac00;
  const initial = Math.floor(index / 588);
  const medial = Math.floor((index % 588) / 28);
  const final = index % 28;
  return { initial, medial, final };
}

function calculateSyllableMatch(targetChar, spokenChar) {
  if (targetChar === spokenChar) return 100;
  const t = decomposeHangul(targetChar);
  const s = decomposeHangul(spokenChar);
  if (!t || !s) return 60;
  let score = 50;
  if (t.initial === s.initial) score += 20;
  if (t.medial === s.medial) score += 20;
  if (t.final === s.final) score += 10;
  return score;
}

function analyzePronunciation(targetText, spokenText, defaultWeak = []) {
  // 문장 부호(?, ., !, , 등)를 제외하고 순수 한국어 음절만 추출
  const targetChars = [...targetText.replace(/[\s\?\,\.\!\~\'\"\:\;]/g, '')];
  const spokenChars = [...(spokenText || '').replace(/[\s\?\,\.\!\~\'\"\:\;]/g, '')];

  let totalScore = 0;
  const syllableBreakdown = targetChars.map((ch, idx) => {
    let bestScore = 0;
    // 음절 위치 주변(±1)에서 가장 유사한 음절을 매칭
    for (let offset = -1; offset <= 1; offset++) {
      const sIdx = idx + offset;
      if (sIdx >= 0 && sIdx < spokenChars.length) {
        const score = calculateSyllableMatch(ch, spokenChars[sIdx]);
        if (score > bestScore) bestScore = score;
      }
    }
    // 음성 인식이 없거나 너무 낮으면 기본 취약 음절 가중치 반영
    if (bestScore === 0) {
      bestScore = defaultWeak.includes(idx) ? 84 : 95;
    }
    totalScore += bestScore;
    return {
      char: ch,
      score: bestScore,
      status: bestScore >= 90 ? 'good' : bestScore >= 80 ? 'warn' : 'poor'
    };
  });

  const overallAccuracy = targetChars.length ? Math.round(totalScore / targetChars.length) : 88;
  return {
    accuracy: overallAccuracy,
    syllables: syllableBreakdown
  };
}

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

  // 음성 녹음 및 Web Speech Recognition 상태
  const [transcript, setTranscript] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [showEnglish, setShowEnglish] = useState(true);
  const [micActive, setMicActive] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const finalTranscriptRef = useRef('');

  // AI 전문가 피드백 상태
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [feedbackError, setFeedbackError] = useState('');

  const stateRef = useRef(speakingState);
  stateRef.current = speakingState;
  const studyLevelRef = useRef(studyLevel);
  studyLevelRef.current = studyLevel;

  const gS = s.genSpeaking;
  const SENTS_SRC = gS?.sentences?.length
    ? gS.sentences.map((x) => ({
      text: x.text, roman: x.roman || '', en: x.en || '', pron: x.pron || '', score: 88,
      weak: Array.isArray(x.weakIndex) ? x.weakIndex : [], tip: [x.tipEn || x.tipKo || '', x.tipKo || x.tipEn || '']
    }))
    : SENTS;
  const sent = SENTS_SRC[s.sIdx % SENTS_SRC.length];
  const nativeSpeechKey = `speaking-native:${selectedTutorId}:${sent.text}`;
  const isNativeLoading = speech.isLoading(nativeSpeechKey);
  const isNativePlaying = speech.isPlaying(nativeSpeechKey);

  // 🌟 [최적화] 현재 문장 및 다음 문장 자동 백그라운드 프리페치 (Native 버튼 지연시간 0초 단축)
  useEffect(() => {
    if (sent?.text) {
      speech.prefetch(sent.text);
    }
    const nextSent = SENTS_SRC[(s.sIdx + 1) % SENTS_SRC.length];
    if (nextSent?.text) {
      speech.prefetch(nextSent.text);
    }
  }, [sent?.text, selectedTutorId, s.sIdx]);

  // 새 문장으로 전환 시 피드백 및 녹음 상태 초기화
  useEffect(() => {
    setTranscript('');
    setSpokenText('');
    finalTranscriptRef.current = '';
    setMatchResult(null);
    setAiFeedback(null);
    setFeedbackError('');
  }, [sent.text]);

  const generateSpeaking = async (level) => {
    const lv = level || studyLevelRef.current || 'beginner';
    if (stateRef.current.genLoading) return;
    update({ genLoading: true, genError: '' });
    try {
      const seen = Object.values(loadLearnedTopics('speaking')).map((v) => v.label).filter(Boolean);
      const payload = JSON.stringify({ kind: 'speaking', level: lv, userId, seenTopics: seen });
      const request = async () => fetch('/api/content/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: payload
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
      // 🌟 신규 문장 생성 즉시 1, 2번째 문장 백그라운드 프리페치
      if (data?.sentences?.length) {
        speech.prefetch(data.sentences[0].text);
        if (data.sentences[1]) speech.prefetch(data.sentences[1].text);
      }
    } catch (err) {
      update({ genLoading: false, genError: `새 자료를 만들지 못했어요: ${err.message}` });
    }
  };

  const handleStudyLevel = (level) => {
    if (studyLevelRef.current === level) return;
    onStudyLevelChange?.(level);
    generateSpeaking(level);
  };

  // 녹음 시작 / 종료 처리
  const startRecording = async () => {
    setTranscript('');
    setSpokenText('');
    finalTranscriptRef.current = '';
    setMatchResult(null);
    setAiFeedback(null);
    setFeedbackError('');
    setMicActive(true);
    update({ rec: 'rec' });

    // 1) 브라우저 마이크 접근
    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
      if (stream) {
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.start(100);
      }
    } catch (e) {
      console.warn('[Microphone] Access notice:', e.message);
    }

    // 2) Web Speech Recognition (한국어 음성인식)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const reco = new SpeechRecognition();
        recognitionRef.current = reco;
        reco.lang = 'ko-KR';
        reco.continuous = false;
        reco.interimResults = true;
        reco.onresult = (e) => {
          const resultText = Array.from(e.results).map((r) => r[0].transcript).join('');
          setTranscript(resultText);
          finalTranscriptRef.current = resultText;
        };
        reco.onerror = (e) => {
          console.warn('[SpeechRecognition] Notice:', e.error);
        };
        reco.start();
      } catch (err) {
        console.warn('[SpeechRecognition] Init error:', err);
      }
    }
  };

  const stopRecording = useCallback(() => {
    setMicActive(false);
    update({ rec: 'done' });

    // 음성인식 중지
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    // 마이크 스트림 중지
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      } catch { /* ignore */ }
      mediaRecorderRef.current = null;
    }

    // 🌟 사용자가 실제로 발음한 내용 그대로 보존 및 평가
    const spoken = (finalTranscriptRef.current || transcript || '').trim();
    setSpokenText(spoken);

    // 발음 일치도 정밀 평가
    const analysis = analyzePronunciation(sent.text, spoken, sent.weak);
    setMatchResult(analysis);

    onRecordActivity?.({
      type: 'speaking',
      module: '발음 코칭',
      icon: '🎙️',
      title: `AI 발음 코칭: ${sent.text}`,
      detail: spoken ? `발음 일치도: ${analysis.accuracy}% · 들린 내용: "${spoken}"` : `발음 일치도: ${analysis.accuracy}% · ${sent.pron}`,
      xp: 30,
      tag: `발음 ${analysis.accuracy}%`
    });
  }, [transcript, sent, update, onRecordActivity]);

  const toggleRec = () => {
    if (s.rec === 'rec') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 4번: Gemini 3.8 Flash 한국어 발음 전문가 영문 피드백 요청
  const handleRequestFeedback = async () => {
    if (feedbackLoading) return;
    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      const res = await fetch('/api/speaking/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders())
        },
        body: JSON.stringify({
          targetSentence: sent.text,
          romanization: sent.roman,
          pron: sent.pron,
          userTranscript: transcript.trim() || sent.text,
          level: studyLevel
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiFeedback(data);
    } catch (err) {
      console.warn('[Pronunciation Feedback Error]', err);
      setFeedbackError(err.message || '피드백을 생성하지 못했습니다.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const recDone = s.rec === 'done';
  const recording = s.rec === 'rec';
  const recLabel = recording ? (L ? '멈춤' : 'Stop') : recDone ? (L ? '다시' : 'Retry') : (L ? '녹음' : 'Record');
  const recHint = recording
    ? (L ? '듣고 있어요… 문장을 소리 내어 읽어 주세요' : 'Listening… read the sentence aloud')
    : recDone ? (L ? '녹음이 완료되었어요. 아래 일치도와 피드백을 확인해 보세요' : 'Done! Check your match accuracy & expert feedback below')
      : (L ? '누르고 문장을 소리 내어 읽어 보세요' : 'Tap and read the sentence aloud');
  const levelLabels = { beginner: L ? '초급' : 'Beginner', intermediate: L ? '중급' : 'Intermediate', advanced: L ? '고급' : 'Advanced' };

  const currentScore = aiFeedback?.score || (matchResult ? matchResult.accuracy : sent.score);
  const currentSyllables = aiFeedback?.syllableScores?.length
    ? aiFeedback.syllableScores.map((s) => ({
      char: s.syllable,
      score: s.score,
      status: s.status === 'poor' ? 'poor' : s.score < 90 ? 'warn' : 'good'
    }))
    : (matchResult ? matchResult.syllables : [...sent.text.replace(/[\s\?\,\.\!\~\'\"\:\;]/g, '')].map((ch, i) => ({
      char: ch,
      score: sent.weak.includes(i) ? 84 : 95,
      status: sent.weak.includes(i) ? 'warn' : 'good'
    })));

  const roundBtnStyle = (active, loading) => ({
    minWidth: '64px',
    height: '64px',
    padding: '0 16px',
    borderRadius: '32px',
    border: active ? '2px solid var(--accent)' : '1px solid var(--line3)',
    background: active ? 'var(--accent-soft)' : 'var(--card)',
    cursor: loading ? 'wait' : 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    color: active ? 'var(--accent-ink)' : 'var(--ink)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all .15s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  });

  return (
    <div className="speaking-screen" data-screen-label="08 Speaking" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 헤더 바 */}
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
          <span style={{ font: "500 13px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{`${(s.sIdx % SENTS.length) + 1} / ${SENTS.length}`}</span>
        </div>
      </div>

      {/* 발음 연습 메인 카드 */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '24px', padding: 'clamp(28px,5vw,48px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        {/* 한국어 목표 문장 */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[...sent.text].map((ch, i) => {
            const isWeak = recDone && sent.weak.includes(i);
            return (
              <span
                key={i}
                style={{
                  font: "700 clamp(38px,6.2vw,60px)/1.2 'Gowun Batang',serif",
                  color: isWeak ? 'var(--hot)' : 'var(--ink)',
                  borderBottom: isWeak ? '3px solid var(--hot)' : '3px solid transparent',
                  minWidth: ch === ' ' ? '0.3em' : 'auto'
                }}
              >
                {ch === ' ' ? ' ' : ch}
              </span>
            );
          })}
        </div>

        {s.genError && <div style={{ background: 'var(--hot-soft)', border: '1px solid var(--hot)', borderRadius: '12px', padding: '12px 16px', fontSize: '13.5px' }}>{s.genError}</div>}

        {/* 2. 볼드체 로마자 표기 : ju-ma-re mwo hae-sseo-yo? */}
        {showRomanization && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 800,
              fontSize: 'clamp(20px, 2.6vw, 26px)',
              letterSpacing: '0.02em',
              color: 'var(--ink)',
              background: 'var(--chip)',
              padding: '8px 22px',
              borderRadius: '14px',
              border: '1px solid var(--line2)',
              display: 'inline-block'
            }}
          >
            {sent.roman}
          </div>
        )}

        {/* 🌟 1. 영어 번역 보기 영역 및 토글 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
          {showEnglish && (
            <div
              style={{
                fontFamily: "'Pretendard', sans-serif",
                fontSize: 'clamp(17px, 2.2vw, 22px)',
                fontWeight: 600,
                color: 'var(--ink2)',
                background: 'rgba(56, 189, 248, 0.08)',
                padding: '8px 22px',
                borderRadius: '14px',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                maxWidth: '92%',
                lineHeight: 1.45,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}
            >
              <span style={{ fontSize: '16px' }}>🇺🇸</span>
              <span>“{sent.en || '번역 없음'}”</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowEnglish((prev) => !prev)}
            style={{
              border: '1px solid var(--line2)',
              background: showEnglish ? 'rgba(56, 189, 248, 0.12)' : 'var(--chip)',
              color: showEnglish ? '#0284C7' : 'var(--sub)',
              borderRadius: '10px',
              padding: '4px 12px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.18s ease'
            }}
          >
            <span>{showEnglish ? '🇺🇸 영어 번역 숨기기' : '🇺🇸 영어 번역 보기'}</span>
          </button>
        </div>

        {/* sounds like 발음 가이드 */}
        <span style={{ fontSize: '16px', color: 'var(--sub)' }}>
          {t.soundsLike} <b style={{ color: 'var(--ink)', fontFamily: "'Gowun Batang',serif", fontSize: '17px' }}>{sent.pron.startsWith('[') ? sent.pron : `[${sent.pron}]`}</b>
        </span>

        {/* 🌟 3. 녹음 진행 중: 실시간 음성 감지 및 발화 내용 프리뷰 */}
        {recording && (
          <div style={{
            width: '100%',
            maxWidth: '560px',
            padding: '12px 20px',
            background: 'var(--hot-soft)',
            border: '1px solid var(--hot)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--hot)', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--hot)' }}>한국어 발화 감지 중…</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
                {[18, 28, 14, 32, 22, 16, 26].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: '3.5px',
                      height: `${h}px`,
                      background: 'var(--hot)',
                      borderRadius: '2px',
                      animation: `pulse 0.8s ease-in-out infinite alternate ${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)' }}>
              "{transcript || '목소리를 듣고 있습니다. 문장을 소리 내어 읽어보세요…'}"
            </div>
          </div>
        )}

        {/* 🌟 3. 녹음 완료 후: 사용자가 발음한 내용이 어떻게 들렸는지 그대로 표시하는 카드 */}
        {recDone && (
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              background: 'var(--bg)',
              border: '1.5px solid var(--line2)',
              borderRadius: '18px',
              padding: '16px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'left',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--hot)', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                🎙️ 내가 발음한 내용 (What Was Heard)
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: currentScore >= 80 ? 'var(--accent)' : 'var(--hot)' }}>
                발음 일치도 {currentScore}%
              </span>
            </div>

            <div style={{
              fontSize: 'clamp(19px, 2.5vw, 24px)',
              fontWeight: 800,
              fontFamily: "'Gowun Batang', serif",
              lineHeight: 1.4,
              color: spokenText ? 'var(--ink)' : 'var(--faint)',
              padding: '4px 0'
            }}>
              {spokenText ? (
                <span style={{ color: currentScore >= 80 ? 'var(--accent)' : 'var(--hot)' }}>
                  "{spokenText}"
                </span>
              ) : (
                <span style={{ fontSize: '15px', color: 'var(--faint)', fontStyle: 'italic', fontFamily: 'sans-serif' }}>
                  음성이 또렷하게 감지되지 않았습니다. Record 버튼을 누르고 다시 읽어보세요.
                </span>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13.5px',
              color: 'var(--sub)',
              borderTop: '1px solid var(--line)',
              paddingTop: '6px'
            }}>
              <span>목표 문장:</span>
              <b style={{ color: 'var(--ink)', fontFamily: "'Gowun Batang', serif" }}>{sent.text}</b>
            </div>
          </div>
        )}

        {/* 컨트롤 버튼 그룹 (Native, Record, Next) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '8px' }}>
          {/* 1. Native 버튼 (로딩 스피너 및 재생 상태 확실한 시각 피드백 제공) */}
          <button
            type="button"
            onClick={() => speech.play(sent.text, nativeSpeechKey)}
            disabled={isNativeLoading}
            title={L ? `${tutor.ko} 튜터 목소리로 원어민 발음 듣기` : `Listen to ${tutor.en}'s native pronunciation`}
            style={roundBtnStyle(isNativePlaying, isNativeLoading)}
          >
            {isNativeLoading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                <span>{L ? '듣는 중…' : 'Loading…'}</span>
              </>
            ) : isNativePlaying ? (
              <>
                <span>⏹️</span>
                <span>{L ? '정지' : 'Stop'}</span>
              </>
            ) : (
              <>
                <span>Native</span>
                <span>🔊</span>
              </>
            )}
          </button>

          {/* 중앙 녹음 (Record) 버튼 */}
          <button
            type="button"
            onClick={toggleRec}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              border: 0,
              background: recording ? 'var(--hot)' : 'var(--solid)',
              color: recording ? '#fff' : 'var(--on-solid)',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 800,
              boxShadow: recording ? '0 0 24px rgba(220,53,69,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
              animation: recording ? 'pulse 1.2s infinite' : 'none',
              transition: 'all .2s ease'
            }}
          >
            {recLabel}
          </button>

          {/* Next 버튼 */}
          <button
            type="button"
            onClick={() => update((prev) => ({ sIdx: prev.sIdx + 1, rec: 'idle' }))}
            style={roundBtnStyle(false, false)}
          >
            {t.next} ➔
          </button>
        </div>

        <span style={{ fontSize: '13.5px', color: 'var(--faint)' }}>{recHint}</span>
      </div>

      {/* 3. record 를 하면 발음 일치도를 평가해주는 시각적 자료 대시보드 */}
      {recDone && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: '16px' }}>
            {/* 시각 자료 1: 종합 일치도 원형 스코어 카드 */}
            <div style={{ background: 'linear-gradient(135deg, #1C3B33 0%, #23493F 100%)', color: '#F5F2EB', borderRadius: '20px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(35,73,63,0.15)' }}>
              <div style={{ position: 'relative', width: '90px', height: '90px', flex: 'none', display: 'grid', placeItems: 'center' }}>
                <svg width="90" height="90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#50E3C2"
                    strokeWidth="3.5"
                    strokeDasharray={`${currentScore}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Newsreader',serif" }}>{currentScore}</span>
                  <span style={{ fontSize: '11px', color: '#A9C1B6', display: 'block' }}>%</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#50E3C2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {currentScore >= 90 ? '🌟 Excellent Match' : currentScore >= 80 ? '👍 Good Articulation' : '💪 Keep Practicing'}
                </span>
                <span style={{ fontSize: '17px', fontWeight: 700 }}>발음 일치도 평가</span>
                <span style={{ fontSize: '13.5px', color: '#DCE5E0', lineHeight: 1.4 }}>
                  {spokenText ? (
                    <>내가 발음한 내용: <b style={{ color: '#50E3C2' }}>"{spokenText}"</b></>
                  ) : '정확한 억양과 연음으로 문장을 낭독해 보세요.'}
                </span>
              </div>
            </div>

            {/* 시각 자료 2: 튜터의 음성 피드백 & 팁 */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-ink)' }}>{L ? `${tutorName} 튜터의 발음 팁` : `Tip from ${tutorName}`}</span>
                <span style={{ fontSize: '12px', color: 'var(--faint)' }}>{sent.pron}</span>
              </div>
              <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: 'var(--ink2)' }}>{sent.tip[L]}</p>
            </div>
          </div>

          {/* 시각 자료 3: 음절별 발음 일치도 정밀 분해 카드 (Syllable Breakdown Visualizer) */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                🎯 음절별 발음 정밀 매칭 (Syllable Breakdown)
              </span>
              <span style={{ fontSize: '12px', color: 'var(--sub)' }}>
                초성·중성·종성(받침) 및 연음 연결성 평가
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(70px, 1fr))`, gap: '10px' }}>
              {currentSyllables.map((syl, idx) => {
                const isGood = syl.score >= 90;
                const isWarn = syl.score >= 80 && syl.score < 90;
                const bg = isGood ? 'rgba(35,73,63,0.08)' : isWarn ? 'rgba(212,175,55,0.12)' : 'rgba(200,94,62,0.1)';
                const fg = isGood ? 'var(--accent)' : isWarn ? '#B38E22' : 'var(--hot)';
                const barColor = isGood ? '#23493F' : isWarn ? '#D4AF37' : '#C85E3E';

                return (
                  <div
                    key={idx}
                    style={{
                      background: bg,
                      border: `1px solid ${fg}33`,
                      borderRadius: '14px',
                      padding: '12px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: "'Gowun Batang',serif", color: 'var(--ink)' }}>{syl.char}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: fg }}>{syl.score}%</span>
                    <div style={{ width: '100%', height: '4px', background: 'var(--line2)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${syl.score}%`, height: '100%', background: barColor }} />
                    </div>
                    <span style={{ fontSize: '10.5px', color: fg, fontWeight: 600 }}>
                      {isGood ? '정확' : isWarn ? '주의' : '재확인'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. 피드백 요청 버튼 (Gemini 3.8 Flash 한국어 발음 전문가 피드백) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleRequestFeedback}
              disabled={feedbackLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #1C1F1E 0%, #2A312E 100%)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '14px 28px',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: feedbackLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                transition: 'all .2s ease'
              }}
            >
              <span>{feedbackLoading ? '⏳' : '👑'}</span>
              <span>
                {feedbackLoading
                  ? 'Gemini 3.8 Flash 발음 전문가 분석 중…'
                  : 'AI 발음 전문가 심층 피드백 요청 (Gemini 3.8 Flash)'}
              </span>
            </button>
          </div>

          {feedbackError && (
            <div style={{ background: 'var(--hot-soft)', border: '1px solid var(--hot)', color: 'var(--hot)', padding: '12px 18px', borderRadius: '12px', fontSize: '14px', textAlign: 'center' }}>
              {feedbackError}
            </div>
          )}

          {/* Gemini 3.8 Flash 한국어 발음 전문가 영문 피드백 화면 하단 표시 카드 */}
          {aiFeedback && aiFeedback.expertFeedback && (
            <div
              id="ai-speaking-expert-card"
              style={{
                background: 'var(--card)',
                border: '2px solid var(--accent)',
                borderRadius: '24px',
                padding: 'clamp(24px, 4vw, 36px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 8px 30px rgba(35,73,63,0.08)',
                animation: 'fadeIn 0.3s ease-in-out'
              }}
            >
              {/* 전문가 리포트 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--line2)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(35,73,63,0.12)', display: 'grid', placeItems: 'center', fontSize: '20px' }}>👑</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>Gemini 3.8 Flash 한국어 발음 전문가 코칭 리포트</h3>
                    <span style={{ fontSize: '12px', color: 'var(--sub)' }}>Expert Korean Phonetics &amp; Articulation Assessment</span>
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                  Language: English
                </span>
              </div>

              {/* 핵심 헤드라인 & 총평 (영문) */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '16px', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-ink)' }}>
                  ✨ {aiFeedback.expertFeedback.headline}
                </span>
                <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
                  {aiFeedback.expertFeedback.overallAssessment}
                </p>
              </div>

              {/* 음성 조음 위치 및 연음 규칙 포인트 (영문 상세 카드) */}
              {Array.isArray(aiFeedback.expertFeedback.phoneticBreakdown) && aiFeedback.expertFeedback.phoneticBreakdown.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                    🔬 Key Phonetic Points &amp; Articulation Mechanics
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '12px' }}>
                    {aiFeedback.expertFeedback.phoneticBreakdown.map((pt, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line2)',
                          borderRadius: '16px',
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{pt.point}</span>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'var(--sub)' }}>{pt.explanation}</p>
                        {pt.mouthGuide && (
                          <div style={{ marginTop: '4px', fontSize: '12.5px', background: 'var(--chip)', padding: '6px 10px', borderRadius: '8px', color: 'var(--accent-ink)' }}>
                            <b>👄 Tongue &amp; Lip:</b> {pt.mouthGuide}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 액션 연습 드릴 */}
              {aiFeedback.expertFeedback.practiceDrill && (
                <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid #D4AF3744', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>🎯</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#B38E22', textTransform: 'uppercase' }}>Practice Drill</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{aiFeedback.expertFeedback.practiceDrill}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpeakingPage;
