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
import { authHeaders } from '../data/authHeaders.js';
import { addVocabWord, recordMistake, recordMistakeFixed } from '../data/studyNotes.js';

const FULL_READING_TEXT = DEFAULT_READING_PARAGRAPHS
  .map((paragraph) => paragraph.map((segment) => (typeof segment === 'string' ? segment : segment[0])).join(''))
  .join(' ');

const STUDY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const GENERATION_TIMEOUT_MS = 30_000;
const DICTIONARY_TIMEOUT_MS = 18_000;

export function normalizeSelectedKorean(value) {
  const selected = String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^가-힣ㄱ-ㅎㅏ-ㅣ0-9]+|[^가-힣ㄱ-ㅎㅏ-ㅣ0-9]+$/g, '');
  if (!selected || selected.length > 40 || !/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(selected)) return '';
  return selected;
}

async function requestReadingGeneration(payload) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
  try {
    const response = await fetch('/api/content/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `서버 응답 ${response.status}`);
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('자료 생성이 30초를 넘었어요. 다시 시도해 주세요.');
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function requestDictionaryLookup(payload, signal) {
  const response = await fetch('/api/dictionary/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
    signal
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `서버 응답 ${response.status}`);
  if (data.error) throw new Error(data.error);
  return data;
}

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
  onRecordActivity,
  onNavigate,
  userId = null
}) {
  const [localReadingState, setLocalReadingState] = useState(INITIAL_READING_STATE);
  const [speechStatus, setSpeechStatus] = useState('idle');
  const [speechKey, setSpeechKey] = useState('');
  const [selectionCard, setSelectionCard] = useState(null);
  const state = readingState || localReadingState;
  const {
    selectedWordKey,
    showTranslation,
    saved,
    generatedReading,
    generationLoading,
    generationDetailLoading,
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
  const passageRef = useRef(null);
  const dictionaryRequestRef = useRef(null);

  const L = lang === 'ko' ? 1 : 0;
  const t = READING_TEXT[lang] || READING_TEXT.ko;
  const generatedParagraphs = generatedReading?.paragraphs?.length ? generatedReading.paragraphs : null;
  const readingParagraphs = generatedParagraphs
    ? generatedParagraphs.map((paragraph) => splitGeneratedParagraph(paragraph.text, paragraph.words))
    : DEFAULT_READING_PARAGRAPHS;
  const readingTranslations = generatedParagraphs
    ? generatedParagraphs.map((paragraph) => paragraph.en || '')
    : DEFAULT_READING_TRANSLATIONS;
  const readingGlossary = generatedReading
    ? Object.fromEntries((generatedReading.glossary || []).map((item) => [item.word, {
      base: item.word,
      pos: [item.pos || '', item.pos || ''],
      ko: item.ko || '',
      en: item.en || '',
      ex: item.ex || ''
    }]))
    : DEFAULT_READING_GLOSSARY;
  const readingGrammar = generatedReading
    ? (generatedReading.grammar || []).map((item) => ({
      form: item.form,
      explanation: [item.ko || '', item.ko || ''],
      example: item.example || ''
    }))
    : DEFAULT_READING_GRAMMAR;
  const readingQuestions = generatedReading
    ? (generatedReading.questions || [])
    : DEFAULT_READING_QUESTIONS;
  const selectedWord = selectedWordKey ? readingGlossary[selectedWordKey] : null;
  const selectedTutor = TUTORS.find((tutor) => tutor.id === selectedTutorId) || TUTORS[0];
  const readingPlainText = readingParagraphs
    .map((paragraph) => paragraph.map((segment) => (typeof segment === 'string' ? segment : segment[0])).join(''))
    .join(' ');

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
      dictionaryRequestRef.current?.abort();
      stopTutorSpeech(false);
    };
  }, [stopTutorSpeech]);

  const generationBusy = generationLoading || generationDetailLoading;

  useEffect(() => {
    generationLoadingRef.current = generationBusy;
  }, [generationBusy]);

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
    updateReadingState({ generationLoading: true, generationDetailLoading: false, generationError: '' });

    let coreData;
    try {
      const seenTopics = Object.values(loadLearnedTopics('reading'))
        .map((item) => item?.label)
        .filter(Boolean);
      coreData = await requestReadingGeneration({
        kind: 'reading',
        phase: 'core',
        level: nextLevel,
        userId,
        seenTopics
      });
      if (coreData.topic) {
        recordLearnedTopic('reading', `${nextLevel}:${coreData.topic}`, coreData.topic, userId);
      }
      updateReadingState({
        generatedReading: {
          ...coreData,
          glossary: [],
          questions: [],
          grammar: []
        },
        selectedWordKey: null,
        showTranslation: false,
        quizAnswers: {},
        generationLoading: false,
        generationDetailLoading: true
      });
    } catch (error) {
      updateReadingState({ generationError: `새 자료를 만들지 못했어요: ${error?.message || error}` });
      generationLoadingRef.current = false;
      updateReadingState({ generationLoading: false, generationDetailLoading: false });
      return;
    }

    try {
      const details = await requestReadingGeneration({
        kind: 'reading',
        phase: 'enrichment',
        level: nextLevel,
        baseContent: {
          topic: coreData.topic,
          title: coreData.title,
          paragraphs: coreData.paragraphs
        }
      });
      updateReadingState((current) => ({
        generatedReading: {
          ...(current.generatedReading || coreData),
          ...details,
          paragraphs: (coreData.paragraphs || []).map((paragraph, index) => ({
            ...paragraph,
            words: details.paragraphWords?.[index] || []
          }))
        },
        generationError: '',
        generationDetailLoading: false
      }));
    } catch (error) {
      updateReadingState({
        generationError: `본문은 준비됐지만 추가 문제를 만들지 못했어요: ${error?.message || error}`,
        generationDetailLoading: false
      });
    } finally {
      generationLoadingRef.current = false;
      updateReadingState({ generationLoading: false, generationDetailLoading: false });
    }
  }, [updateReadingState, userId]);

  const handleStudyLevel = (level) => {
    if (studyLevel === level) return;
    onStudyLevelChange?.(level);
    generateReadingMaterial(level);
  };

  const saveWordAndOpenVocab = (wordKey, wordData) => {
    if (!wordKey || !wordData) return;
    const [legacyExampleKo, legacyExampleEn] = String(wordData.ex || '').split('—').map((part) => part.trim());
    const savedWord = wordData.base || wordData.word || wordKey;
    addVocabWord({
      w: savedWord,
      en: wordData.meaningEn || wordData.en || '',
      pos: wordData.posKo || wordData.pos?.[1] || wordData.pos?.[0] || '',
      ex: wordData.exampleKo || legacyExampleKo || '',
      exEn: wordData.exampleEn || legacyExampleEn || ''
    }, 'reading');
    updateReadingState((current) => ({
      saved: {
        ...current.saved,
        [wordKey]: true,
        [savedWord]: true
      }
    }));
    onNavigate?.('vocab', { tab: 'list' });
  };

  const toggleSavedWord = () => saveWordAndOpenVocab(selectedWordKey, selectedWord);

  const lookupSelection = async () => {
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;
    if (!passageRef.current?.contains(commonNode)) return;

    const word = normalizeSelectedKorean(selection.toString());
    if (!word) return;
    const rect = range.getBoundingClientRect();
    const fallback = readingGlossary[word];
    const placeAbove = rect.bottom + 280 > window.innerHeight;
    const position = {
      left: Math.max(16, Math.min(window.innerWidth - 16, rect.left + rect.width / 2)),
      top: placeAbove ? Math.max(12, rect.top - 10) : Math.min(window.innerHeight - 12, rect.bottom + 10),
      placeAbove
    };
    const initialData = fallback ? {
      word,
      base: fallback.base || word,
      posKo: fallback.pos?.[1] || '',
      posEn: fallback.pos?.[0] || '',
      meaningKo: fallback.ko || '',
      meaningEn: fallback.en || '',
      exampleKo: String(fallback.ex || '').split('—')[0]?.trim() || '',
      exampleEn: String(fallback.ex || '').split('—')[1]?.trim() || ''
    } : null;
    setSelectionCard({ word, status: 'loading', data: initialData, error: '', ...position });

    dictionaryRequestRef.current?.abort();
    const controller = new AbortController();
    dictionaryRequestRef.current = controller;
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DICTIONARY_TIMEOUT_MS);
    try {
      const data = await requestDictionaryLookup({ word, context: readingPlainText }, controller.signal);
      setSelectionCard((current) => current?.word === word ? { ...current, status: 'ready', data, error: '' } : current);
    } catch (error) {
      if (controller.signal.aborted && dictionaryRequestRef.current !== controller) return;
      const message = controller.signal.aborted
        ? (lang === 'ko' ? '뜻 조회 시간이 초과되었습니다. 다시 선택해 주세요.' : 'The lookup timed out. Please select the word again.')
        : (error?.message || String(error));
      setSelectionCard((current) => current?.word === word ? { ...current, status: initialData ? 'ready' : 'error', error: message } : current);
    } finally {
      globalThis.clearTimeout(timeoutId);
      if (dictionaryRequestRef.current === controller) dictionaryRequestRef.current = null;
    }
  };

  const handleTextSelection = (event) => {
    if (event.target.closest?.('.reading-selection-card')) return;
    lookupSelection();
  };

  const handleTouchSelection = (event) => {
    if (event.target.closest?.('.reading-selection-card')) return;
    globalThis.setTimeout(lookupSelection, 120);
  };

  const answerQuizQuestion = (question, questionIndex, option, optionIndex) => {
    const isCorrect = optionIndex === question.a;
    const mistake = { area: 'reading', kind: 'quiz', prompt: question.q, wrong: option, right: question.opts?.[question.a] };
    if (isCorrect) recordMistakeFixed(mistake);
    else recordMistake(mistake);
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
          {!generationBusy && (
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
              {lang === 'ko' ? '본문 만드는 중…' : 'Generating passage…'}
            </span>
          )}
          {generationDetailLoading && (
            <span className="reading-generation-loading">
              {lang === 'ko' ? '본문 완성 · 문제 준비 중…' : 'Passage ready · adding practice…'}
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

      <section className="reading-wordbook-guide" aria-label={lang === 'ko' ? '단어장 기능 안내' : 'Word bank guide'}>
        <span className="reading-wordbook-guide-label">{lang === 'ko' ? '단어장 활용법' : 'BUILD YOUR WORD BANK'}</span>
        <p>
          {lang === 'ko'
            ? '모르는 단어를 드래그하거나 길게 눌러 한글·영어 뜻을 확인하세요. ‘단어장 저장’을 누르면 단어 학습의 내 단어장에서 다시 공부할 수 있어요.'
            : 'Select an unfamiliar word to see its Korean and English meanings. Save it to review later in Vocabulary → My words.'}
        </p>
      </section>

      {generationError && (
        <div className="reading-generation-error" role="alert">{generationError}</div>
      )}

      <div className="reading-content-grid">
        <div
          className="reading-passage-card"
          ref={passageRef}
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTouchSelection}
        >
          <div className="reading-toolbar">
            <span>{lang === 'ko' ? '단어를 드래그하거나 길게 선택하면 한국어·영어 뜻과 단어장 저장 버튼이 나타나요.' : 'Select any Korean word to see both meanings and save it to your word bank.'}</span>
            <div className="reading-toolbar-actions">
              <button
                type="button"
                title={fullSpeechTitle}
                aria-label={fullSpeechTitle}
                onClick={() => playTutorSpeech(readingPlainText || FULL_READING_TEXT, fullSpeechKey)}
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

          {selectionCard && (
            <section
              className={`reading-selection-card${selectionCard.placeAbove ? ' is-above' : ''}`}
              style={{ left: `${selectionCard.left}px`, top: `${selectionCard.top}px` }}
              role="dialog"
              aria-label={lang === 'ko' ? `${selectionCard.word} 단어 뜻` : `Meaning of ${selectionCard.word}`}
              onMouseUp={(event) => event.stopPropagation()}
              onTouchEnd={(event) => event.stopPropagation()}
            >
              <div className="reading-selection-head">
                <div>
                  <strong lang="ko">{selectionCard.data?.base || selectionCard.word}</strong>
                  <span>{lang === 'ko' ? '선택한 단어' : 'Selected word'}</span>
                </div>
                <button type="button" onClick={() => setSelectionCard(null)} aria-label={lang === 'ko' ? '닫기' : 'Close'}>×</button>
              </div>
              {selectionCard.status === 'loading' && !selectionCard.data && (
                <div className="reading-selection-loading" role="status">
                  <i />{lang === 'ko' ? '문맥에 맞는 뜻을 찾고 있어요…' : 'Looking up the meaning in context…'}
                </div>
              )}
              {selectionCard.data && (
                <div className="reading-selection-meanings">
                  <p><em>한국어</em><span>{selectionCard.data.meaningKo || (lang === 'ko' ? '한국어 뜻을 불러오는 중…' : 'Loading Korean meaning…')}</span></p>
                  <p><em>English</em><span>{selectionCard.data.meaningEn || 'Loading English meaning…'}</span></p>
                  {(selectionCard.data.exampleKo || selectionCard.data.exampleEn) && (
                    <div className="reading-selection-example">
                      {!!selectionCard.data.exampleKo && <span lang="ko">{selectionCard.data.exampleKo}</span>}
                      {!!selectionCard.data.exampleEn && <span>{selectionCard.data.exampleEn}</span>}
                    </div>
                  )}
                </div>
              )}
              {!!selectionCard.error && <span className="reading-selection-error">{selectionCard.error}</span>}
              {selectionCard.data && (
                <button
                  type="button"
                  className="reading-selection-save"
                  onClick={() => saveWordAndOpenVocab(selectionCard.word, selectionCard.data)}
                >
                  {saved[selectionCard.word] || saved[selectionCard.data.base]
                    ? (lang === 'ko' ? '내 단어장 보기 →' : 'Open my word bank →')
                    : (lang === 'ko' ? '단어장 저장' : 'Save to word bank')}
                </button>
              )}
            </section>
          )}

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
            {generationDetailLoading && (
              <span className="reading-generation-loading">
                {lang === 'ko' ? '본문을 읽는 동안 문제를 준비하고 있어요.' : 'Practice questions are being prepared while you read.'}
              </span>
            )}
            {!generationDetailLoading && readingQuestions.map((question, questionIndex) => (
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
              {!!selectedWord.ko && (
                <span className="reading-word-meaning reading-word-meaning-ko"><b>한국어</b>{selectedWord.ko}</span>
              )}
              <span className="reading-word-meaning"><b>English</b>{selectedWord.en}</span>
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
            {generationDetailLoading && (
              <span className="reading-generation-loading">
                {lang === 'ko' ? '문법 설명 준비 중…' : 'Preparing grammar notes…'}
              </span>
            )}
            {!generationDetailLoading && readingGrammar.map((grammar) => (
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
