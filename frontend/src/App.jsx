import React, { useState } from 'react';
import IntroPage from './pages/IntroPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import './styles/intro.css';

function App() {
  const [currentPage, setCurrentPage] = useState('intro');

  const handleNavigate = (target) => {
    console.info('[migration:navigate]', target);
    if (target === 'intro' || target === 'about') {
      setCurrentPage(target);
    }
  };

  return (
    <>
      {currentPage === 'intro' && (
        <IntroPage lang="ko" onNavigate={handleNavigate} />
      )}
      {currentPage === 'about' && (
        <AboutPage lang="ko" onNavigate={handleNavigate} />
      )}
    </>
  );
}

export default App;
