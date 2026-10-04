import React, { useCallback, useMemo, useRef, useState } from 'react';
import IntroPage from './pages/IntroPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import HomePage from './pages/HomePage.jsx';
import TutorsPage from './pages/TutorsPage.jsx';
import ReadingPage from './pages/ReadingPage.jsx';
import WritingPage from './pages/WritingPage.jsx';
import ListeningPage from './pages/ListeningPage.jsx';
import RecordPage from './pages/RecordPage.jsx';
import SpeakingPage from './pages/SpeakingPage.jsx';
import useAudioReview from './hooks/useAudioReview.js';
import useTranslationToggle from './hooks/useTranslationToggle.js';
import { appendActivity, loadActivityState, persistActivityState } from './data/activityData.js';
import { INITIAL_WRITING_STATE } from './data/writingData.js';
import { INITIAL_LISTENING_STATE } from './data/listeningData.js';
import { INITIAL_RECORD_STATE } from './data/recordData.js';
import { INITIAL_SPEAKING_STATE } from './data/speakingData.js';
import './styles/intro.css';
import './styles/reading.css';

// Legacy app-wide translation toggle state (shared by Listening, Speaking and Conversation).
const INITIAL_TRANSLATION_STATE = Object.freeze({
  trOn: false,
  studyTrans: {},
  translationError: '',
  cvTrans: {},
  cvTransLoading: false
});

const mergeState = (setState) => (patch) => setState((prev) => ({
  ...prev,
  ...(typeof patch === 'function' ? patch(prev) : patch)
}));

function App() {
  const [currentPage, setCurrentPage] = useState('intro');
  const [selectedTutorId, setSelectedTutorId] = useState('jiwoo');
  const [activityState, setActivityState] = useState(loadActivityState);
  const activityRef = useRef(activityState);
  const [writingState, setWritingState] = useState(INITIAL_WRITING_STATE);
  const [listeningState, setListeningState] = useState(INITIAL_LISTENING_STATE);
  const [translationState, setTranslationState] = useState(INITIAL_TRANSLATION_STATE);
  const [studyLevel, setStudyLevel] = useState('beginner');
  const updateListeningState = useMemo(() => mergeState(setListeningState), []);
  const updateTranslationState = useMemo(() => mergeState(setTranslationState), []);
  const [recordState, setRecordState] = useState(INITIAL_RECORD_STATE);
  const updateRecordState = useMemo(() => mergeState(setRecordState), []);
  const audioReview = useAudioReview(recordState, updateRecordState);
  const [speakingState, setSpeakingState] = useState(INITIAL_SPEAKING_STATE);
  const updateSpeakingState = useMemo(() => mergeState(setSpeakingState), []);
  const toggleTranslation = useTranslationToggle(translationState, updateTranslationState, listeningState);

  const handleNavigate = (target) => {
    console.info('[migration:navigate]', target);
    if (target === 'intro' || target === 'about' || target === 'home' || target === 'tutors' || target === 'reading' || target === 'writing' || target === 'listening' || target === 'record' || target === 'speaking') {
      setCurrentPage(target);
    }
  };

  const handleSelectTutor = (id) => {
    console.info('[migration:selectTutor]', id);
    setSelectedTutorId(id);
  };

  const handleRecordActivity = useCallback((entry) => {
    const next = appendActivity(activityRef.current, entry);
    activityRef.current = next;
    persistActivityState(next);
    setActivityState(next);
  }, []);

  return (
    <>
      {currentPage === 'intro' && (
        <IntroPage lang="ko" onNavigate={handleNavigate} />
      )}
      {currentPage === 'about' && (
        <AboutPage lang="ko" onNavigate={handleNavigate} />
      )}
      {currentPage === 'home' && (
        <HomePage
          lang="ko"
          selectedTutorId={selectedTutorId}
          onSelectTutor={handleSelectTutor}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'tutors' && (
        <TutorsPage
          lang="ko"
          selectedTutorId={selectedTutorId}
          onSelectTutor={handleSelectTutor}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'reading' && (
        <ReadingPage
          lang="ko"
          selectedTutorId={selectedTutorId}
          studyLevel={studyLevel}
          onStudyLevelChange={setStudyLevel}
          onRecordActivity={handleRecordActivity}
        />
      )}
      {currentPage === 'writing' && (
        <WritingPage
          lang="ko"
          selectedTutorId={selectedTutorId}
          writingState={writingState}
          onWritingStateChange={setWritingState}
          onRecordActivity={handleRecordActivity}
        />
      )}
      {currentPage === 'listening' && (
        <ListeningPage
          lang="ko"
          selectedTutorId={selectedTutorId}
          listeningState={listeningState}
          onListeningStateChange={updateListeningState}
          studyLevel={studyLevel}
          onStudyLevelChange={setStudyLevel}
          translationState={translationState}
          onTranslationStateChange={updateTranslationState}
          onToggleTranslation={toggleTranslation}
          onRecordActivity={handleRecordActivity}
        />
      )}
      {currentPage === 'record' && (
        <RecordPage
          lang="ko"
          recordState={recordState}
          onRecordStateChange={updateRecordState}
          audioReview={audioReview}
          activityState={activityState}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'speaking' && (
        <SpeakingPage
          lang="ko"
          selectedTutorId={selectedTutorId}
          speakingState={speakingState}
          onSpeakingStateChange={updateSpeakingState}
          studyLevel={studyLevel}
          onStudyLevelChange={setStudyLevel}
          translationState={translationState}
          onToggleTranslation={toggleTranslation}
          onRecordActivity={handleRecordActivity}
        />
      )}
    </>
  );
}

export default App;
