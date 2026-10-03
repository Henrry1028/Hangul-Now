import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_READING_GLOSSARY,
  DEFAULT_READING_GRAMMAR,
  DEFAULT_READING_PARAGRAPHS,
  DEFAULT_READING_TITLE,
  DEFAULT_READING_TRANSLATIONS,
  READING_TEXT
} from '../data/readingData.js';
import { TUTORS } from '../data/tutorsData.js';

const FULL_READING_TEXT = DEFAULT_READING_PARAGRAPHS
  .map((paragraph) => paragraph.map((segment) => (typeof segment === 'string' ? segment : segment[0])).join(''))
  .join(' ');

function SpeakerIcon({ size = 17, full = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      {full && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}

function ReadingPage({ lang = 'ko', selectedTutorId = 'jiwoo' }) {
  const [selectedWordKey, setSelectedWordKey] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [saved, setSaved] = useState({});
  const [speechStatus, setSpeechStatus] = useState('idle');
  const [speechKey, setSpeechKey] = useState('');

  const requestRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const activeKeyRef = useRef('');
  const speechStatusRef = useRef('idle');
  const mountedRef = useRef(true);
  const previousTutorIdRef = useRef(selectedTutorId);

  const L = lang === 'ko' ? 1 : 0;
  const t = READING_TEXT[lang] || READING_TEXT.ko;
  const selectedWord = selectedWordKey ? DEFAULT_READING_GLOSSARY[selectedWordKey] : null;
  const selectedTutor = TUTORS.find((tutor) => tutor.id === selectedTutorId) || TUTORS[0];

  const updateSpeechState = useCallback((status, key) => {
    speechStatusRef.current = status;
    activeKeyRef.current = key;
    if (mountedRef.current) {
      setSpeechStatus(status);
      setSpeechKey(key);
    }
  }, []);

  const stopTutorSpeech = useCallback((updateState = true) => {
    if (requestRef.current) {
      requestRef.current.abort();
      requestRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (updateState) updateSpeechState('idle', '');
  }, [updateSpeechState]);

  const speakWithDeviceVoice = useCallback((text, key) => {
    if (
      typeof window === 'undefined'
      || !window.speechSynthesis
      || typeof window.SpeechSynthesisUtterance === 'undefined'
    ) {
      updateSpeechState('idle', '');
      return;
    }

    const tutorOrder = { jiwoo: 0, minho: 1, seoyeon: 2, haneul: 3 };
    const tutorStyle = {
      jiwoo: { rate: .86, pitch: 1.06 },
      minho: { rate: .96, pitch: .88 },
      seoyeon: { rate: .9, pitch: 1 },
      haneul: { rate: .78, pitch: .92 }
    };

    try {
      const utterance = new window.SpeechSynthesisUtterance(text);
      const koreanVoices = window.speechSynthesis
        .getVoices()
        .filter((voice) => String(voice.lang || '').toLowerCase().startsWith('ko'));
      if (koreanVoices.length) {
        utterance.voice = koreanVoices[(tutorOrder[selectedTutorId] || 0) % koreanVoices.length];
      }
      utterance.lang = 'ko-KR';
      utterance.rate = tutorStyle[selectedTutorId]?.rate || .9;
      utterance.pitch = tutorStyle[selectedTutorId]?.pitch || 1;
      utterance.onend = () => {
        if (activeKeyRef.current === key) updateSpeechState('idle', '');
      };
      utterance.onerror = () => {
        if (activeKeyRef.current === key) updateSpeechState('idle', '');
      };
      updateSpeechState('playing', key);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('[Tutor TTS] Device Korean voice unavailable.', error.message);
      if (activeKeyRef.current === key) updateSpeechState('idle', '');
    }
  }, [selectedTutorId, updateSpeechState]);

  const playTutorSpeech = useCallback(async (text, key) => {
    const speechText = String(text || '').trim();
    if (!speechText) return;
    if (activeKeyRef.current === key && speechStatusRef.current !== 'idle') {
      stopTutorSpeech();
      return;
    }

    stopTutorSpeech(false);
    const controller = new AbortController();
    requestRef.current = controller;
    updateSpeechState('loading', key);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText, tutorId: selectedTutorId }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`TTS_HTTP_${response.status}`);
      const audioBlob = await response.blob();
      if (!audioBlob.size) throw new Error('TTS_EMPTY_AUDIO');
      if (controller.signal.aborted || activeKeyRef.current !== key) return;

      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      requestRef.current = null;
      objectUrlRef.current = objectUrl;
      audioRef.current = audio;
      audio.onended = () => {
        if (activeKeyRef.current === key && audioRef.current === audio) stopTutorSpeech();
      };
      audio.onerror = () => {
        if (activeKeyRef.current === key && audioRef.current === audio) stopTutorSpeech();
      };
      await audio.play();
      if (controller.signal.aborted || activeKeyRef.current !== key || audioRef.current !== audio) return;
      updateSpeechState('playing', key);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.warn('[Tutor TTS] Cloud voice unavailable; using device Korean voice.', error.message);
      if (requestRef.current === controller) requestRef.current = null;
      stopTutorSpeech(false);
      speakWithDeviceVoice(speechText, key);
    }
  }, [selectedTutorId, speakWithDeviceVoice, stopTutorSpeech, updateSpeechState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopTutorSpeech(false);
    };
  }, [stopTutorSpeech]);

  useEffect(() => {
    if (previousTutorIdRef.current !== selectedTutorId) {
      previousTutorIdRef.current = selectedTutorId;
      stopTutorSpeech();
    }
  }, [selectedTutorId, stopTutorSpeech]);

  const toggleSavedWord = () => {
    if (!selectedWordKey) return;
    setSaved((current) => ({
      ...current,
      [selectedWordKey]: !current[selectedWordKey]
    }));
  };

  const fullSpeechKey = 'reading-full';
  const wordSpeechKey = selectedWordKey ? `reading-word-${selectedWordKey}` : '';
  const exampleSpeechKey = selectedWordKey ? `reading-ex-${selectedWordKey}` : '';
  const fullSpeechActive = speechKey === fullSpeechKey && speechStatus !== 'idle';
  const wordSpeechActive = wordSpeechKey && speechKey === wordSpeechKey && speechStatus !== 'idle';
  const exampleSpeechActive = exampleSpeechKey && speechKey === exampleSpeechKey && speechStatus !== 'idle';
  const fullSpeechTitle = lang === 'ko'
    ? `${selectedTutor.ko} 튜터 목소리로 전체 본문 듣기`
    : `Hear full passage in ${selectedTutor.en}'s voice`;
  const wordSpeechTitle = lang === 'ko'
    ? `${selectedTutor.ko} 튜터 목소리로 단어 듣기`
    : `Hear word in ${selectedTutor.en}'s voice`;
  const exampleSpeechTitle = lang === 'ko'
    ? `${selectedTutor.ko} 튜터 목소리로 예문 듣기`
    : `Hear example in ${selectedTutor.en}'s voice`;
  const fullSpeechLabel = fullSpeechActive && speechStatus === 'loading'
    ? (lang === 'ko' ? '로딩…' : 'Loading…')
    : fullSpeechActive && speechStatus === 'playing'
      ? (lang === 'ko' ? '중지' : 'Stop')
      : (lang === 'ko' ? '전체 듣기' : 'Listen');
  const exampleSpeechLabel = exampleSpeechActive && speechStatus === 'loading'
    ? '…'
    : exampleSpeechActive && speechStatus === 'playing'
      ? (lang === 'ko' ? '중지' : 'Stop')
      : (lang === 'ko' ? '예문' : 'Example');

  return (
    <div className="reading-screen" data-screen-label="06 Reading">
      <div className="reading-header">
        <div className="reading-title-block">
          <span className="reading-eyebrow">{t.eyebrow}</span>
          <h1>{DEFAULT_READING_TITLE}</h1>
          <span className="reading-subtitle">{t.subtitle}</span>
        </div>
      </div>

      <div className="reading-content-grid">
        <div className="reading-passage-card">
          <div className="reading-toolbar">
            <span>밑줄 친 단어를 누르면 뜻을 볼 수 있어요.</span>
            <div className="reading-toolbar-actions">
              <button
                type="button"
                title={fullSpeechTitle}
                aria-label={fullSpeechTitle}
                onClick={() => playTutorSpeech(FULL_READING_TEXT, fullSpeechKey)}
                className={fullSpeechActive
                  ? 'reading-speech-button reading-full-speech-button is-active'
                  : 'reading-speech-button reading-full-speech-button'}
              >
                <SpeakerIcon full />
                <span className="reading-speech-label">{fullSpeechLabel}</span>
              </button>
              <button
                type="button"
                aria-pressed={showTranslation}
                onClick={() => setShowTranslation((current) => !current)}
                className={showTranslation ? 'reading-translation-toggle is-active' : 'reading-translation-toggle'}
              >
                {showTranslation ? t.translationHide : t.translationShow}
              </button>
            </div>
          </div>

          {DEFAULT_READING_PARAGRAPHS.map((paragraph, paragraphIndex) => (
            <div className="reading-paragraph-block" key={`paragraph-${paragraphIndex}`}>
              <p className="reading-paragraph">
                {paragraph.map((segment, segmentIndex) => {
                  if (typeof segment === 'string') {
                    return <span key={`text-${paragraphIndex}-${segmentIndex}`}>{segment}</span>;
                  }

                  const word = segment[0];
                  const classNames = ['reading-word'];
                  if (selectedWordKey === word) classNames.push('is-selected');
                  if (saved[word]) classNames.push('is-saved');

                  return (
                    <span
                      key={`word-${paragraphIndex}-${segmentIndex}-${word}`}
                      className={classNames.join(' ')}
                      onClick={() => setSelectedWordKey(word)}
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
              {showTranslation && (
                <p className="reading-translation">
                  {DEFAULT_READING_TRANSLATIONS[paragraphIndex]}
                </p>
              )}
            </div>
          ))}
        </div>

        <aside className="reading-aside">
          {selectedWord ? (
            <div className="reading-glossary-card">
              <span className="reading-pos">{selectedWord.pos[L]}</span>
              <div className="reading-glossary-word-row">
                <span className="reading-word-base">{selectedWord.base}</span>
                <button
                  type="button"
                  title={wordSpeechTitle}
                  aria-label={wordSpeechTitle}
                  onClick={() => playTutorSpeech(selectedWord.base, wordSpeechKey)}
                  className={wordSpeechActive
                    ? 'reading-speech-button reading-word-speech-button is-active'
                    : 'reading-speech-button reading-word-speech-button'}
                >
                  <SpeakerIcon size={15} />
                </button>
              </div>
              <span className="reading-word-meaning">{selectedWord.en}</span>
              <span className="reading-word-example">{selectedWord.ex}</span>
              <div className="reading-glossary-actions">
                <button className="reading-save-button" type="button" onClick={toggleSavedWord}>
                  {saved[selectedWordKey] ? t.saved : t.save}
                </button>
                <button
                  type="button"
                  title={exampleSpeechTitle}
                  aria-label={exampleSpeechTitle}
                  onClick={() => playTutorSpeech(selectedWord.ex.split('—')[0].trim(), exampleSpeechKey)}
                  className={exampleSpeechActive
                    ? 'reading-speech-button reading-example-speech-button is-active'
                    : 'reading-speech-button reading-example-speech-button'}
                >
                  <SpeakerIcon size={14} />
                  <span className="reading-speech-label">{exampleSpeechLabel}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="reading-empty-card">
              <img src="/assets/캐릭터_훈이.png" alt="" />
              <span>{t.empty}</span>
            </div>
          )}

          <div className="reading-grammar-card">
            <span className="reading-grammar-heading">{t.grammarHeading}</span>
            {DEFAULT_READING_GRAMMAR.map((grammar) => (
              <span className="reading-grammar-item" key={grammar.form}>
                <b>{grammar.form}</b> — {grammar.explanation[L]}{' '}
                <span>{grammar.example}</span>
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ReadingPage;
