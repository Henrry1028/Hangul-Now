import { useEffect, useRef, useState, useCallback } from 'react';

const TUTOR_ORDER = { jiwoo: 0, minho: 1, seoyeon: 2, haneul: 3 };
const TUTOR_STYLE = {
  jiwoo: { rate: 0.86, pitch: 1.06 }, minho: { rate: 0.96, pitch: 0.88 },
  seoyeon: { rate: 0.9, pitch: 1 }, haneul: { rate: 0.78, pitch: 0.92 }
};

// 동일 세션 내 중복 TTS 호출 방지용 오디오 캐시 및 진행 중인 프리페치 프로미스 맵
const ttsBlobCache = new Map();
const prefetchPromiseCache = new Map();

// Legacy playTutorSpeech / stopTutorSpeech / speakWithDeviceVoice for screens whose
// speech buttons have visual playing/loading state (Speaking, etc.).
export default function useTutorSpeech(tutorId) {
  const tutorRef = useRef(tutorId);
  tutorRef.current = tutorId;
  const [speechState, setSpeechState] = useState({ status: 'idle', key: '' });
  const statusRef = useRef({ speechStatus: 'idle', speechKey: '' });
  const requestRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  const syncStatus = (status, key = '') => {
    statusRef.current = { speechStatus: status, speechKey: key };
    setSpeechState({ status, key });
  };

  const stop = useCallback((resetState = true) => {
    if (requestRef.current) {
      requestRef.current.abort();
      requestRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (resetState) {
      syncStatus('idle', '');
    }
  }, []);

  const speakWithDeviceVoice = useCallback((text, key) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      syncStatus('idle', '');
      return;
    }
    const id = tutorRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    const koreanVoices = window.speechSynthesis.getVoices().filter((v) => String(v.lang || '').toLowerCase().startsWith('ko'));
    if (koreanVoices.length) utterance.voice = koreanVoices[(TUTOR_ORDER[id] || 0) % koreanVoices.length];
    utterance.lang = 'ko-KR';
    utterance.rate = TUTOR_STYLE[id]?.rate || 0.9;
    utterance.pitch = TUTOR_STYLE[id]?.pitch || 1;
    const done = () => {
      if (statusRef.current.speechKey === key) syncStatus('idle', '');
    };
    utterance.onend = done;
    utterance.onerror = done;
    syncStatus('playing', key);
    window.speechSynthesis.speak(utterance);
  }, []);

  // 🌟 백그라운드 TTS 사전 호출 (Pre-fetch) 캐시 생성
  const prefetch = useCallback((text) => {
    const speechText = String(text || '').trim();
    if (!speechText) return;
    const cacheKey = `${tutorRef.current}:${speechText}`;
    if (ttsBlobCache.has(cacheKey) || prefetchPromiseCache.has(cacheKey)) return;

    const controller = new AbortController();
    const promise = (async () => {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: speechText, tutorId: tutorRef.current }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`TTS_HTTP_${response.status}`);
        const audioBlob = await response.blob();
        if (!audioBlob.size) throw new Error('TTS_EMPTY_AUDIO');
        const url = URL.createObjectURL(audioBlob);
        ttsBlobCache.set(cacheKey, url);
        prefetchPromiseCache.delete(cacheKey);
        return url;
      } catch {
        prefetchPromiseCache.delete(cacheKey);
        return null;
      }
    })();

    prefetchPromiseCache.set(cacheKey, promise);
  }, []);

  const play = useCallback(async (text, key) => {
    const speechText = String(text || '').trim();
    if (!speechText) return;

    // 이미 재생 중이면 정지
    if (statusRef.current.speechKey === key && statusRef.current.speechStatus === 'playing') {
      stop();
      return;
    }
    // 이미 로딩 중이면 중복 클릭 무시
    if (statusRef.current.speechKey === key && statusRef.current.speechStatus === 'loading') {
      return;
    }

    stop(false);
    syncStatus('loading', key);

    const cacheKey = `${tutorRef.current}:${speechText}`;
    let objectUrl = ttsBlobCache.get(cacheKey);

    // 🌟 [최적화 1] 이미 캐시된 오디오 URL이 있으면 즉시 0초 재생
    if (objectUrl) {
      try {
        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        audio.onended = () => { if (statusRef.current.speechKey === key) syncStatus('idle', ''); };
        audio.onerror = () => { if (statusRef.current.speechKey === key) syncStatus('idle', ''); };
        await audio.play();
        syncStatus('playing', key);
        return;
      } catch {
        // 캐시된 URL 만료 시 재요청
        ttsBlobCache.delete(cacheKey);
      }
    }

    // 🌟 [최적화 2] 백그라운드 프리페치가 진행 중인 경우 기다려서 즉시 재생
    if (prefetchPromiseCache.has(cacheKey)) {
      try {
        const prefetchedUrl = await prefetchPromiseCache.get(cacheKey);
        if (prefetchedUrl) {
          const audio = new Audio(prefetchedUrl);
          audioRef.current = audio;
          objectUrlRef.current = prefetchedUrl;
          audio.onended = () => { if (statusRef.current.speechKey === key) syncStatus('idle', ''); };
          audio.onerror = () => { if (statusRef.current.speechKey === key) syncStatus('idle', ''); };
          await audio.play();
          syncStatus('playing', key);
          return;
        }
      } catch {
        // 프리페치 실패 시 신규 요청으로 계속 진행
      }
    }

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText, tutorId: tutorRef.current }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`TTS_HTTP_${response.status}`);
      const audioBlob = await response.blob();
      if (!audioBlob.size) throw new Error('TTS_EMPTY_AUDIO');

      objectUrl = URL.createObjectURL(audioBlob);
      ttsBlobCache.set(cacheKey, objectUrl);

      const audio = new Audio(objectUrl);
      requestRef.current = null;
      objectUrlRef.current = objectUrl;
      audioRef.current = audio;

      audio.onended = () => { if (statusRef.current.speechKey === key) syncStatus('idle', ''); };
      audio.onerror = () => { if (statusRef.current.speechKey === key) syncStatus('idle', ''); };

      await audio.play();
      syncStatus('playing', key);
    } catch (err) {
      if (controller.signal?.aborted) return;
      console.warn('[Tutor TTS] Cloud voice fallback to device voice:', err.message);
      requestRef.current = null;
      stop(false);
      speakWithDeviceVoice(speechText, key);
    }
  }, [stop, speakWithDeviceVoice]);

  useEffect(() => () => stop(), [stop]);

  // A tutor change must never leave the previous tutor's voice playing.
  useEffect(() => {
    stop();
  }, [tutorId, stop]);

  return {
    play,
    stop,
    prefetch,
    status: speechState.status,
    activeKey: speechState.key,
    isPlaying: (k) => speechState.key === k && speechState.status === 'playing',
    isLoading: (k) => speechState.key === k && speechState.status === 'loading'
  };
}
