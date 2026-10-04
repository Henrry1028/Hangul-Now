import { useEffect, useRef } from 'react';

const TUTOR_ORDER = { jiwoo: 0, minho: 1, seoyeon: 2, haneul: 3 };
const TUTOR_STYLE = {
  jiwoo: { rate: 0.86, pitch: 1.06 }, minho: { rate: 0.96, pitch: 0.88 },
  seoyeon: { rate: 0.9, pitch: 1 }, haneul: { rate: 0.78, pitch: 0.92 }
};

// Legacy playTutorSpeech / stopTutorSpeech / speakWithDeviceVoice for screens whose
// speech buttons have no visual playing state (Speaking). The same key toggles stop.
export default function useTutorSpeech(tutorId) {
  const tutorRef = useRef(tutorId);
  tutorRef.current = tutorId;
  const statusRef = useRef({ speechStatus: 'idle', speechKey: '' });
  const requestRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  const stop = (resetState = true) => {
    if (requestRef.current) { requestRef.current.abort(); requestRef.current = null; }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    if (resetState) statusRef.current = { speechStatus: 'idle', speechKey: '' };
  };

  const speakWithDeviceVoice = (text, key) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      statusRef.current = { speechStatus: 'idle', speechKey: '' };
      return;
    }
    const id = tutorRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    const koreanVoices = window.speechSynthesis.getVoices().filter((v) => String(v.lang || '').toLowerCase().startsWith('ko'));
    if (koreanVoices.length) utterance.voice = koreanVoices[(TUTOR_ORDER[id] || 0) % koreanVoices.length];
    utterance.lang = 'ko-KR';
    utterance.rate = TUTOR_STYLE[id]?.rate || 0.9;
    utterance.pitch = TUTOR_STYLE[id]?.pitch || 1;
    const done = () => { if (statusRef.current.speechKey === key) statusRef.current = { speechStatus: 'idle', speechKey: '' }; };
    utterance.onend = done;
    utterance.onerror = done;
    statusRef.current = { speechStatus: 'playing', speechKey: key };
    window.speechSynthesis.speak(utterance);
  };

  const play = async (text, key) => {
    const speechText = String(text || '').trim();
    if (!speechText) return;
    if (statusRef.current.speechKey === key && statusRef.current.speechStatus !== 'idle') {
      stop();
      return;
    }
    stop(false);
    const controller = new AbortController();
    requestRef.current = controller;
    statusRef.current = { speechStatus: 'loading', speechKey: key };
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
      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      requestRef.current = null;
      objectUrlRef.current = objectUrl;
      audioRef.current = audio;
      audio.onended = () => { if (statusRef.current.speechKey === key) stop(); };
      audio.onerror = () => { if (statusRef.current.speechKey === key) stop(); };
      await audio.play();
      statusRef.current = { speechStatus: 'playing', speechKey: key };
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn('[Tutor TTS] Cloud voice unavailable; using device Korean voice.', err.message);
      requestRef.current = null;
      stop(false);
      speakWithDeviceVoice(speechText, key);
    }
  };

  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);

  return { play, stop };
}
