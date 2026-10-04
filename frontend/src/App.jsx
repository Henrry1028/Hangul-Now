import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import IntroPage from './pages/IntroPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import HomePage from './pages/HomePage.jsx';
import TutorsPage from './pages/TutorsPage.jsx';
import ReadingPage from './pages/ReadingPage.jsx';
import WritingPage from './pages/WritingPage.jsx';
import ListeningPage from './pages/ListeningPage.jsx';
import RecordPage from './pages/RecordPage.jsx';
import SpeakingPage from './pages/SpeakingPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import useAudioReview from './hooks/useAudioReview.js';
import useTranslationToggle from './hooks/useTranslationToggle.js';
import useChat from './hooks/useChat.js';
import useConversation from './hooks/useConversation.js';
import { appendActivity, loadActivityState, persistActivityState } from './data/activityData.js';
import { INITIAL_WRITING_STATE } from './data/writingData.js';
import { INITIAL_LISTENING_STATE } from './data/listeningData.js';
import { INITIAL_RECORD_STATE } from './data/recordData.js';
import { INITIAL_SPEAKING_STATE } from './data/speakingData.js';
import { createInitialChatState } from './data/chatData.js';
import { INITIAL_READING_STATE } from './data/readingData.js';
import { TUTORS } from './data/tutorsData.js';
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

const readStorage = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStorage = (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };

// Legacy componentDidMount: hn-lang (default en), hn-theme, hn-tutor, sidebar collapsed/width.
const initialShell = () => {
  const lang = readStorage('hn-lang');
  const theme = readStorage('hn-theme');
  const tutor = readStorage('hn-tutor');
  const width = parseInt(readStorage('hn-sidebar-width'), 10);
  return {
    lang: lang === 'ko' || lang === 'en' ? lang : 'en',
    theme: theme || 'light',
    tutorId: tutor && TUTORS.some((tu) => tu.id === tutor) ? tutor : 'jiwoo',
    sidebarCollapsed: readStorage('hn-sidebar-collapsed') === '1',
    sidebarWidth: width >= 180 && width <= 460 ? width : 240
  };
};

const isWide = () => (typeof window === 'undefined' ? true : window.innerWidth >= 860);

function App() {
  const shellInit = useMemo(initialShell, []);
  const [currentPage, setCurrentPage] = useState('intro');
  const [selectedTutorId, setSelectedTutorId] = useState(shellInit.tutorId);
  const [lang, setLang] = useState(shellInit.lang);
  const [theme, setTheme] = useState(shellInit.theme);
  const [wide, setWide] = useState(isWide);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(shellInit.sidebarCollapsed);
  const [sidebarWidth, setSidebarWidth] = useState(shellInit.sidebarWidth);
  const [activityState, setActivityState] = useState(loadActivityState);
  const activityRef = useRef(activityState);
  const [writingState, setWritingState] = useState(INITIAL_WRITING_STATE);
  const [listeningState, setListeningState] = useState(INITIAL_LISTENING_STATE);
  const [translationState, setTranslationState] = useState(INITIAL_TRANSLATION_STATE);
  const [studyLevel, setStudyLevel] = useState('beginner');
  const [readingState, setReadingState] = useState(INITIAL_READING_STATE);
  const updateReadingState = useMemo(() => mergeState(setReadingState), []);
  const updateListeningState = useMemo(() => mergeState(setListeningState), []);
  const updateTranslationState = useMemo(() => mergeState(setTranslationState), []);
  const [recordState, setRecordState] = useState(INITIAL_RECORD_STATE);
  const updateRecordState = useMemo(() => mergeState(setRecordState), []);
  const audioReview = useAudioReview(recordState, updateRecordState);
  const [speakingState, setSpeakingState] = useState(INITIAL_SPEAKING_STATE);
  const updateSpeakingState = useMemo(() => mergeState(setSpeakingState), []);
  const [chatState, setChatState] = useState(createInitialChatState);
  const updateChatState = useMemo(() => mergeState(setChatState), []);

  const handleNavigate = (target) => {
    console.info('[migration:navigate]', target);
    if (target === 'intro' || target === 'about' || target === 'home' || target === 'tutors' || target === 'reading' || target === 'writing' || target === 'listening' || target === 'record' || target === 'speaking' || target === 'chat' || target === 'conversation') {
      setCurrentPage(target);
      const viewport = document.querySelector('.app-main-viewport');
      if (viewport) viewport.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  };

  // Dev-only test aid (stripped from production builds): open a screen directly in browser tests.
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__hnSandboxNavigate = handleNavigate;

  const handleSelectTutor = (id) => {
    console.info('[migration:selectTutor]', id);
    setSelectedTutorId(id);
    writeStorage('hn-tutor', id);
    chat.onTutorSelected(id);
  };

  const handleSetLang = (next) => { setLang(next); writeStorage('hn-lang', next); };
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    writeStorage('hn-theme', next);
  };
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      writeStorage('hn-sidebar-collapsed', prev ? '0' : '1');
      return !prev;
    });
  }, []);
  const handleSidebarWidth = useCallback((width, persist) => {
    setSidebarWidth(width);
    if (persist) writeStorage('hn-sidebar-width', String(width));
  }, []);
  // Google sign-in arrives with the auth/profile milestone (P4C).
  const handleLogin = () => console.info('[migration:login] pending P4C');

  // Legacy applyTheme: data-theme on <html>.
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  // Legacy resize listener (wide = innerWidth >= 860) and Ctrl/Cmd+B sidebar toggle.
  useEffect(() => {
    const onResize = () => setWide(isWide());
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [handleToggleSidebar]);

  const handleRecordActivity = useCallback((entry) => {
    const next = appendActivity(activityRef.current, entry);
    activityRef.current = next;
    persistActivityState(next);
    setActivityState(next);
  }, []);
  const chat = useChat(chatState, updateChatState, selectedTutorId, handleRecordActivity);
  // Legacy reviewMode is one app-wide flag (Writing's review toggle also drives Conversation).
  const conversation = useConversation({ tutorId: selectedTutorId, lang, reviewMode: writingState.reviewMode, recordActivity: handleRecordActivity });
  const toggleTranslation = useTranslationToggle(translationState, updateTranslationState, listeningState, conversation.state.cvTurns);

  const unreadTotal = Object.values(chatState.unread || {}).reduce((a, b) => a + b, 0);

  return (
    <AppShell
      lang={lang}
      theme={theme}
      page={currentPage}
      wide={wide}
      selectedTutorId={selectedTutorId}
      unreadTotal={unreadTotal}
      sidebarCollapsed={sidebarCollapsed}
      sidebarWidth={sidebarWidth}
      onToggleSidebar={handleToggleSidebar}
      onSidebarWidth={handleSidebarWidth}
      onNavigate={handleNavigate}
      onSetLang={handleSetLang}
      onToggleTheme={handleToggleTheme}
      onLogin={handleLogin}
    >
      {currentPage === 'intro' && (
        <IntroPage lang={lang} onNavigate={handleNavigate} />
      )}
      {currentPage === 'about' && (
        <AboutPage lang={lang} onNavigate={handleNavigate} />
      )}
      {currentPage === 'home' && (
        <HomePage
          lang={lang}
          selectedTutorId={selectedTutorId}
          onSelectTutor={handleSelectTutor}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'tutors' && (
        <TutorsPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          onSelectTutor={handleSelectTutor}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'reading' && (
        <ReadingPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          studyLevel={studyLevel}
          onStudyLevelChange={setStudyLevel}
          readingState={readingState}
          onReadingStateChange={updateReadingState}
          onRecordActivity={handleRecordActivity}
        />
      )}
      {currentPage === 'writing' && (
        <WritingPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          writingState={writingState}
          onWritingStateChange={setWritingState}
          onRecordActivity={handleRecordActivity}
        />
      )}
      {currentPage === 'listening' && (
        <ListeningPage
          lang={lang}
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
          lang={lang}
          recordState={recordState}
          onRecordStateChange={updateRecordState}
          audioReview={audioReview}
          activityState={activityState}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'speaking' && (
        <SpeakingPage
          lang={lang}
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
      {currentPage === 'chat' && (
        <ChatPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          chatState={chatState}
          chat={chat}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'conversation' && (
        <ConversationPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          conversation={conversation}
          translationState={translationState}
          onToggleTranslation={toggleTranslation}
        />
      )}
    </AppShell>
  );
}

export default App;
