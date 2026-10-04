import React, { useCallback, useRef, useState } from 'react';
import IntroPage from './pages/IntroPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import HomePage from './pages/HomePage.jsx';
import TutorsPage from './pages/TutorsPage.jsx';
import ReadingPage from './pages/ReadingPage.jsx';
import WritingPage from './pages/WritingPage.jsx';
import { appendActivity, loadActivityState, persistActivityState } from './data/activityData.js';
import { INITIAL_WRITING_STATE } from './data/writingData.js';
import './styles/intro.css';
import './styles/reading.css';

function App() {
  const [currentPage, setCurrentPage] = useState('intro');
  const [selectedTutorId, setSelectedTutorId] = useState('jiwoo');
  const [activityState, setActivityState] = useState(loadActivityState);
  const activityRef = useRef(activityState);
  const [writingState, setWritingState] = useState(INITIAL_WRITING_STATE);

  const handleNavigate = (target) => {
    console.info('[migration:navigate]', target);
    if (target === 'intro' || target === 'about' || target === 'home' || target === 'tutors' || target === 'reading' || target === 'writing') {
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
    </>
  );
}

export default App;
