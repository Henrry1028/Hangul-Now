import React, { useState } from 'react';
import IntroPage from './pages/IntroPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import TutorsPage from './pages/TutorsPage.jsx';
import ReadingPage from './pages/ReadingPage.jsx';
import './styles/intro.css';
import './styles/reading.css';

function App() {
  const [currentPage, setCurrentPage] = useState('intro');
  const [selectedTutorId, setSelectedTutorId] = useState('jiwoo');

  const handleNavigate = (target) => {
    console.info('[migration:navigate]', target);
    if (target === 'intro' || target === 'about' || target === 'tutors' || target === 'reading') {
      setCurrentPage(target);
    }
  };

  const handleSelectTutor = (id) => {
    console.info('[migration:selectTutor]', id);
    setSelectedTutorId(id);
  };

  return (
    <>
      {currentPage === 'intro' && (
        <IntroPage lang="ko" onNavigate={handleNavigate} />
      )}
      {currentPage === 'about' && (
        <AboutPage lang="ko" onNavigate={handleNavigate} />
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
        <ReadingPage lang="ko" />
      )}
    </>
  );
}

export default App;
