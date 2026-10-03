import React from 'react';
import IntroPage from './pages/IntroPage.jsx';
import './styles/intro.css';

function App() {
  const handleNavigate = (target) => {
    console.info('[migration:navigate]', target);
  };

  return <IntroPage lang="ko" onNavigate={handleNavigate} />;
}

export default App;
