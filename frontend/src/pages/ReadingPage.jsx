import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_READING_GLOSSARY,
  DEFAULT_READING_GRAMMAR,
  DEFAULT_READING_PARAGRAPHS,
  DEFAULT_READING_QUESTIONS,
  DEFAULT_READING_TITLE,
  DEFAULT_READING_TRANSLATIONS,
  INITIAL_READING_STATE,
  READING_TEXT
} from '../data/readingData.js';
import { loadLearnedTopics, recordLearnedTopic } from '../data/learnedData.js';
import { TUTORS } from '../data/tutorsData.js';

const FULL_READING_TEXT = DEFAULT_READING_PARAGRAPHS
  .map((paragraph) => paragraph.map((segment) => (typeof segment === 'string' ? segment : segment[0])).join(''))
  .join(' ');

const STUDY_LEVELS = ['beginner', 'intermediate', 'advanced'];

function splitGeneratedParagraph(text, words) {
  const source = String(text || '');
  const candidates = (Array.isArray(words) ? words : [])
    .filter((word) => word && source.includes(word))
    .sort((a, b) => b.length - a.length);
  if (!candidates.length) return [source];

  const escapedWords = candidates.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const wordPattern = new RegExp(`(${escapedWords.join('|')})`);
  return source
    .split(wordPattern)
    .filter(Boolean)
    .map((part) => (candidates.includes(part) ? [part] : part));
}

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

function ReadingPage({
  lang = 'ko',
  selectedTutorId = 'jiwoo',
  studyLevel = 'beginner',
  onStudyLevelChange,
  readingState,
  onReadingStateChange,
  onRecordActivity
}) {
  const [localReadingState, setLocalReadingState] = useState(INITIAL_READING_STATE);
  const [speechStatus, setSpeechStatus] = useState('idle');
  const [speechKey, setSpeechKey] = useState('');
  const state = readingState || localReadingState;
  const {
    selectedWordKey,
    showTranslation,
    saved,
    generatedReading,
    generationLoading,
    generationError,
    quizAnswers
  } = state;
  const updateReadingState = useCallback((patch) => {
    if (onReadingStateChange) {
      onReadingStateChange(patch);
      return;
    }
    setLocalReadingState((current) => ({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch)
    }));
  }, [onReadingStateChange]);

  const requestRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const activeKeyRef = useRef('');
  const speechStatusRef = useRef('idle');
  const generationLoadingRef = useRef(generationLoading);
  const mountedRef = useRef(true);
  const previousTutorIdRef = useRef(selectedTutorId);

  const L = lang === 'ko' ? 1 : 0;
  const t = READING_TEXT[lang] || READING_TEXT.ko;
  const generatedParagraphs = generatedReading?.paragraphs?.length ? generatedReading.paragraphs : null;
  const readingParagraphs = generatedParagraphs
    ? generatedParagraphs.map((paragraph) => splitGeneratedParagraph(paragraph.text, paragraph.words))
    : DEFAULT_READING_PARAGRAPHS;
  const readingTranslations = generatedParagraphs
    ? generatedParagraphs.map((paragraph) => paragraph.en || '')
    : DEFAULT_READING_TRANSLATIONS;
  const readingGlossary = generatedReading?.glossary?.length
    ? Object.fromEntries(generatedReading.glossary.map((item) => [item.word, {
      base: item.word,
      pos: [item.pos || '', item.pos || ''],
      en: item.en || '',
      ex: item.ex || ''
    }]))
    : DEFAULT_READING_GLOSSARY;
  const readingGrammar = generatedReading?.grammar?.length
    ? generatedReading.grammar.map((item) => ({
      form: item.form,
      explanation: [item.ko || '', item.ko || ''],
      example: item.example || ''
    }))
    : DEFAULT_READING_GRAMMAR;
  const readingQuestions = generatedReading?.questions?.length
    ? generatedReading.questions
    : DEFAULT_READING_QUESTIONS;
  const selectedWord = selectedWordKey ? readingGlossary[selectedWordKey] : null;
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
    generationLoadingRef.current = generationLoading;
  }, [generationLoading]);

  useEffect(() => {
    if (previousTutorIdRef.current !== selectedTutorId) {
      previousTutorIdRef.current = selectedTutorId;
      stopTutorSpeech();
    }
  }, [selectedTutorId, stopTutorSpeech]);

  const generateReadingMaterial = useCallback(async (level) => {
    const nextLevel = level || 'beginner';
    if (generationLoadingRef.current) return;

    generationLoadingRef.current = true;
    updateReadingState({ generationLoading: true, generationError: '' });

    try {
      const seenTopics = Object.values(loadLearnedTopics('reading'))
        .map((item) => item?.label)
        .filter(Boolean);
      const payload = JSON.stringify({
        kind: 'reading',
        level: nextLevel,
        userId: null,
        seenTopics
      });
      const request = () => fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });

      let response;
      try {
        response = await request();
      } catch {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        response = await request();
      }

      if (!response.ok) throw new Error(`서버 응답 ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.topic) {
        recordLearnedTopic('reading', `${nextLevel}:${data.topic}`, data.topic);
      }
      updateReadingState({
        generatedReading: data,
        selectedWordKey: null,
        showTranslation: false,
        quizAnswers: {}
      });
    } catch (error) {
      updateReadingState({ generationError: `새 자료를 만들지 못했어요: ${error?.message || error}` });
    } finally {
      generationLoadingRef.current = false;
      updateReadingState({ generationLoading: false });
    }
  }, [updateReadingState]);

  const handleStudyLevel = (level) => {
    if (studyLevel === level) return;
    onStudyLevelChange?.(level);
    generateReadingMaterial(level);
  };

  const toggleSavedWord = () => {
    if (!selectedWordKey) return;
    updateReadingState((current) => ({
      saved: {
        ...current.saved,
        [selectedWordKey]: !current.saved[selectedWordKey]
      }
    }));
  };

  const answerQuizQuestion = (question, questionIndex, option, optionIndex) => {
    const isCorrect = optionIndex === question.a;
    updateReadingState((current) => ({
      quizAnswers: { ...current.quizAnswers, [questionIndex]: optionIndex }
    }));
    onRecordActivity?.({
      type: 'reading',
      module: '독해 퀴즈',
      icon: '📖',
      title: `독해 문제 풀이 (${questionIndex + 1}번)`,
      detail: `"${question.q}" ➔ 선택: "${option}" ${isCorrect ? '(정답 🎉)' : '(오답)'}`,
      xp: isCorrect ? 20 : 10,
      tag: isCorrect ? '정답 +20XP' : '독해'
    });
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
          <h1>{generatedReading?.title || DEFAULT_READING_TITLE}</h1>
          <span className="reading-subtitle">{generatedReading?.subtitle || t.subtitle}</span>
        </div>
        <div className="reading-generation-controls">
          {!generationLoading && (
            <button
              type="button"
              className="reading-generate-button"
              onClick={() => generateReadingMaterial(studyLevel)}
            >
              {lang === 'ko' ? '새로 생성' : 'New material'}
            </button>
          )}
          {generationLoading && (
            <span className="reading-generation-loading">
              {lang === 'ko' ? '만드는 중…' : 'Generating…'}
            </span>
          )}
          <div className="reading-level-selector">
            {STUDY_LEVELS.map((level) => {
              const levelLabel = {
                beginner: lang === 'ko' ? '초급' : 'Beginner',
                intermediate: lang === 'ko' ? '중급' : 'Intermediate',
                advanced: lang === 'ko' ? '고급' : 'Advanced'
              }[level];
              return (
                <button
                  type="button"
                  key={level}
                  aria-pressed={studyLevel === level}
                  className={studyLevel === level ? 'is-active' : ''}
                  onClick={() => handleStudyLevel(level)}
                >
                  {levelLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {generationError && (
        <div className="reading-generation-error" role="alert">{generationError}</div>
      )}

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
                onClick={() => updateReadingState((current) => ({ showTranslation: !current.showTranslation }))}
                className={showTranslation ? 'reading-translation-toggle is-active' : 'reading-translation-toggle'}
              >
                {showTranslation ? t.translationHide : t.translationShow}
              </button>
            </div>
          </div>

          {readingParagraphs.map((paragraph, paragraphIndex) => (
            <div className="reading-paragraph-block" key={`paragraph-${paragraphIndex}`}>
              <p className="reading-paragraph">
                {paragraph.map((segment, segmentIndex) => {
                  if (typeof segment === 'string') {
                    return <span key={`text-${paragraphIndex}-${segmentIndex}`} style={{ borderRadius: '3px' }}>{segment}</span>;
                  }

                  const word = segment[0];
                  const classNames = ['reading-word'];
                  if (selectedWordKey === word) classNames.push('is-selected');
                  if (saved[word]) classNames.push('is-saved');

                  return (
                    <span
                      key={`word-${paragraphIndex}-${segmentIndex}-${word}`}
                      className={classNames.join(' ')}
                      onClick={() => updateReadingState({ selectedWordKey: word })}
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
              {showTranslation && (
                <p className="reading-translation">
                  {readingTranslations[paragraphIndex] || ''}
                </p>
              )}
            </div>
          ))}

          <div className="reading-quiz">
            <span className="reading-quiz-heading">{t.checkHeading}</span>
            {readingQuestions.map((question, questionIndex) => (
              <div className="reading-quiz-question" key={`question-${questionIndex}`}>
                <span className="reading-quiz-prompt">
                  {questionIndex + 1}. {question.q}{' '}
                  <span className="reading-quiz-english">{question.en}</span>
                </span>
                <div className="reading-quiz-options">
                  {question.opts.map((option, optionIndex) => {
                    const picked = quizAnswers[questionIndex] === optionIndex;
                    const right = optionIndex === question.a;
                    const classNames = ['reading-quiz-option'];
                    if (picked) classNames.push(right ? 'is-correct' : 'is-wrong');

                    return (
                      <button
                        type="button"
                        key={`option-${questionIndex}-${optionIndex}`}
                        className={classNames.join(' ')}
                        onClick={() => answerQuizQuestion(question, questionIndex, option, optionIndex)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
              {/* Legacy dynamicT.rEmpty names the selected tutor. */}
              <span>{L ? `밑줄 친 단어를 눌러 보세요. ${selectedTutor.ko} 튜터가 뜻과 예문을 보여 줄게요.` : `Tap any underlined word — ${selectedTutor.en} will show its meaning and an example here.`}</span>
            </div>
          )}

          <div className="reading-grammar-card">
            <span className="reading-grammar-heading">{t.grammarHeading}</span>
            {readingGrammar.map((grammar) => (
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
