import { useEffect, useState } from 'react';
import { STUDY_NOTES_EVENT, loadMistakes, loadVocab } from '../data/studyNotes.js';

// 오답·단어 저장소를 읽고, 다른 화면(또는 다른 탭)에서 바뀌면 다시 읽는다.
export default function useStudyNotes() {
  const [notes, setNotes] = useState(() => ({ mistakes: loadMistakes(), vocab: loadVocab() }));
  useEffect(() => {
    const reload = () => setNotes({ mistakes: loadMistakes(), vocab: loadVocab() });
    const onStorage = (e) => { if (!e.key || e.key === 'hn-mistakes' || e.key === 'hn-vocab') reload(); };
    window.addEventListener(STUDY_NOTES_EVENT, reload);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(STUDY_NOTES_EVENT, reload);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return notes;
}
