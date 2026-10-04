import { useRef } from 'react';
import { DICTATIONS, LQ, SCRIPT } from '../data/listeningData.js';

// Legacy toggleTranslation: one app-wide toggle (Listening, Speaking, Conversation) that,
// when switched on, fetches English for Conversation transcript lines and Listening lines
// that have none yet.
export default function useTranslationToggle(translationState, updateTranslationState, listeningState, conversationTurns) {
  const trRef = useRef(translationState);
  trRef.current = translationState;
  const listeningRef = useRef(listeningState);
  listeningRef.current = listeningState;
  const turnsRef = useRef(conversationTurns);
  turnsRef.current = conversationTurns;

  return async () => {
    const next = !trRef.current.trOn;
    updateTranslationState({ trOn: next, translationError: '' });
    if (!next) return;
    const studyTrans = trRef.current.studyTrans || {};
    const cvTrans = trRef.current.cvTrans || {};
    const cvNeed = (turnsRef.current || []).map((t) => t.text).filter((text) => text && !cvTrans[text]);
    const listeningNeed = [];
    const generated = listeningRef.current.genListening;
    if (generated?.topic && !generated.topicEn && !studyTrans[generated.topic]) listeningNeed.push(generated.topic);
    const listeningScript = generated?.script?.length ? generated.script : SCRIPT.map((x) => ({ text: x.text, en: x.en }));
    listeningScript.forEach((line) => { if (line.text && !line.en && !studyTrans[line.text]) listeningNeed.push(line.text); });
    const listeningQuestions = generated?.questions?.length ? generated.questions : LQ;
    listeningQuestions.forEach((q) => {
      if (q.q && !q.en && !studyTrans[q.q]) listeningNeed.push(q.q);
      (q.opts || []).forEach((option, i) => {
        if (option && !q.optsEn?.[i] && !studyTrans[option]) listeningNeed.push(option);
      });
    });
    const listeningDictations = generated?.dictations?.length
      ? generated.dictations
      : generated?.dictation
        ? [generated.dictation]
        : DICTATIONS;
    listeningDictations.forEach((item) => {
      if (item?.sentence && !item.en && !studyTrans[item.sentence]) listeningNeed.push(item.sentence);
    });
    const need = [...new Set([...cvNeed, ...listeningNeed])];
    if (!need.length) return;
    updateTranslationState({ cvTransLoading: true });
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: need })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`);
      updateTranslationState((prev) => {
        const cvMap = { ...(prev.cvTrans || {}) };
        const studyMap = { ...(prev.studyTrans || {}) };
        need.forEach((line, i) => {
          const translated = data.translations?.[i];
          if (!translated) return;
          if (cvNeed.includes(line)) cvMap[line] = translated;
          if (listeningNeed.includes(line)) studyMap[line] = translated;
        });
        return { cvTrans: cvMap, studyTrans: studyMap, cvTransLoading: false, translationError: '' };
      });
    } catch (err) {
      updateTranslationState({ cvTransLoading: false, translationError: `영어 번역을 불러오지 못했습니다: ${err?.message || err}` });
    }
  };
}
