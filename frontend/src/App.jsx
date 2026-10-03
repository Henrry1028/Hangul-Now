import React, { useState } from 'react';
import IntroPage from './pages/IntroPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import TutorsPage from './pages/TutorsPage.jsx';
import './styles/intro.css';

function App() {
  const [currentPage, setCurrentPage] = useState('intro');
  const [selectedTutorId, setSelectedTutorId] = useState('jiwoo');

  const handleNavigate = (target) => {
    console.info('[migration:navigate]', target);
    if (target === 'intro' || target === 'about' || target === 'tutors') {
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
    </>
  );
}

export default App;
