import { useMemo, useRef } from 'react';
import { WEEKLY_REVIEW_SCRIPT_KO } from '../data/recordData.js';

// Legacy weekly audio review controller. It lives at App level because legacy keeps
// the speech and the progress timer running after leaving the Record screen.
export default function useAudioReview(recordState, updateRecordState) {
  const stateRef = useRef(recordState);
  stateRef.current = recordState;
  const timerRef = useRef(null);

  return useMemo(() => {
    const clearTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const pause = (resetToStart = false) => {
      clearTimer();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      }
      updateRecordState((st) => ({
        audioReviewPlaying: false,
        audioReviewCurrentTime: resetToStart ? 0 : st.audioReviewCurrentTime
      }));
    };

    const play = () => {
      clearTimer();
      const speed = stateRef.current.audioReviewSpeed || 1.0;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(WEEKLY_REVIEW_SCRIPT_KO);
          utter.lang = 'ko-KR';
          utter.rate = speed;
          utter.pitch = 1.0;
          const koVoice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko'));
          if (koVoice) utter.voice = koVoice;
          utter.onend = () => pause(true);
          utter.onerror = () => {};
          window.speechSynthesis.speak(utter);
        } catch (e) {
          console.warn('Speech synthesis error:', e);
        }
      }
      updateRecordState({ audioReviewPlaying: true });
      timerRef.current = setInterval(() => {
        const st = stateRef.current;
        const nextTime = st.audioReviewCurrentTime + 1;
        if (nextTime >= st.audioReviewDuration) {
          clearTimer();
          stateRef.current = { ...st, audioReviewCurrentTime: st.audioReviewDuration, audioReviewPlaying: false };
          updateRecordState({ audioReviewCurrentTime: st.audioReviewDuration, audioReviewPlaying: false });
          return;
        }
        stateRef.current = { ...st, audioReviewCurrentTime: nextTime };
        updateRecordState({ audioReviewCurrentTime: nextTime });
      }, 1000 / speed);
    };

    return {
      togglePlay: () => (stateRef.current.audioReviewPlaying ? pause() : play()),
      seek: (delta) => updateRecordState((st) => ({
        audioReviewCurrentTime: Math.max(0, Math.min(st.audioReviewDuration, st.audioReviewCurrentTime + delta))
      })),
      setProgress: (e) => {
        if (!e || !e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        updateRecordState({ audioReviewCurrentTime: Math.round(ratio * stateRef.current.audioReviewDuration) });
      },
      cycleSpeed: () => {
        const speeds = [1.0, 1.25, 1.5, 2.0, 0.8];
        const st = stateRef.current;
        const nextSpeed = speeds[(speeds.indexOf(st.audioReviewSpeed) + 1) % speeds.length];
        stateRef.current = { ...st, audioReviewSpeed: nextSpeed };
        updateRecordState({ audioReviewSpeed: nextSpeed });
        if (st.audioReviewPlaying) setTimeout(play, 50);
      },
      rate: (type) => updateRecordState((st) => ({ audioReviewLiked: st.audioReviewLiked === type ? null : type })),
      toggleScript: () => updateRecordState((st) => ({ audioReviewShowScript: !st.audioReviewShowScript })),
      generate: () => {
        updateRecordState({ audioReviewGenerating: true });
        setTimeout(() => {
          updateRecordState((st) => ({
            audioReviewGenerating: false,
            audioReviewEpisode: st.audioReviewEpisode + 1,
            audioReviewCurrentTime: 0,
            audioReviewPlaying: false
          }));
          // Legacy quirk: a blocking alert confirms the (simulated) regeneration.
          window.alert('한 주간의 첨삭 및 지적 사항을 재분석하여 새로운 주간 오디오 리뷰가 생성되었습니다!');
        }, 1500);
      },
      download: () => {
        const element = document.createElement('a');
        const file = new Blob([WEEKLY_REVIEW_SCRIPT_KO], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = `${stateRef.current.audioReviewTitle}_Script.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    };
  }, [updateRecordState]);
}
