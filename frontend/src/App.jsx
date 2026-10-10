import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SitePasswordGate from './components/SitePasswordGate.jsx';
import AppShell from './components/AppShell.jsx';
import IntroPage from './pages/IntroPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import NoticePage from './pages/NoticePage.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import HomePage from './pages/HomePage.jsx';
import TutorsPage from './pages/TutorsPage.jsx';
import ReadingPage from './pages/ReadingPage.jsx';
import WritingPage from './pages/WritingPage.jsx';
import ListeningPage from './pages/ListeningPage.jsx';
import RecordPage from './pages/RecordPage.jsx';
import SpeakingPage from './pages/SpeakingPage.jsx';
import ChatPage, { ChatTutorHeader } from './pages/ChatPage.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import AdminPage, { buildAdminView } from './pages/AdminPage.jsx';
import VideoClassPage, { VideoClassModals } from './pages/VideoClassPage.jsx';
import VocabPage from './pages/VocabPage.jsx';
import MistakesPage from './pages/MistakesPage.jsx';
import useAudioReview from './hooks/useAudioReview.js';
import useTranslationToggle from './hooks/useTranslationToggle.js';
import useChat from './hooks/useChat.js';
import useConversation from './hooks/useConversation.js';
import useAuthProfile from './hooks/useAuthProfile.js';
import useVideoClass from './hooks/useVideoClass.js';
import useAppUpdate from './hooks/useAppUpdate.js';
import { authHeaders } from './data/authHeaders.js';
import UpdateNotificationBanner from './components/UpdateNotificationBanner.jsx';
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
  // Legacy Firestore restore only sets tutorId state; hn-tutor is written by selectTutor alone.
  const handleRestoreTutor = useCallback((id) => {
    if (!TUTORS.some((tutor) => tutor.id === id)) return false;
    setSelectedTutorId(id);
    return true;
  }, []);
  const auth = useAuthProfile({ selectedTutorId, onRestoreTutor: handleRestoreTutor });
  // Admin-only Video Class preview: legacy admin UI flag + signed-in + server-verified admin.
  const videoClass = useVideoClass({ isAdminFlag: auth.isAdmin, currentUser: auth.currentUser });
  // 앱 내 실시간 업데이트 감지 (In-App Push)
  const appUpdate = useAppUpdate();
  // Legacy app-wide admin console state (adminData/adminLoading/adminSearch/adminFilter).
  const [adminData, setAdminData] = useState(null);
  const [, setAdminLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState('all');
  const [vocabInitialMode, setVocabInitialMode] = useState('cards');

  const handleNavigate = (target, options = {}) => {
    if (target === 'admin') {
      handleGoAdmin();
      return;
    }
    if (target === 'intro' || target === 'about' || target === 'notice' || target === 'resources' || target === 'home' || target === 'tutors' || target === 'reading' || target === 'writing' || target === 'listening' || target === 'record' || target === 'vocab' || target === 'mistakes' || target === 'speaking' || target === 'chat' || target === 'conversation') {
      if (target === 'vocab') setVocabInitialMode(options.tab === 'list' ? 'list' : 'cards');
      setCurrentPage(target);
      const viewport = document.querySelector('.app-main-viewport');
      if (viewport) viewport.scrollTop = 0;
      window.scrollTo(0, 0);
    } else if (target === 'videoclass' && videoClass.access) {
      // Legacy sidebar/pill go('videoclass') opens the page without loading its data.
      setCurrentPage(target);
      const viewport = document.querySelector('.app-main-viewport');
      if (viewport) viewport.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  };

  // Legacy goVideoClass (header entry): open the page and load tutors/bookings.
  const handleGoVideoClass = () => {
    if (!videoClass.access) return;
    setCurrentPage('videoclass');
    videoClass.loadVideoClassData();
    const viewport = document.querySelector('.app-main-viewport');
    if (viewport) viewport.scrollTop = 0;
    window.scrollTo(0, 0);
  };

  // Losing admin access (sign-out, account switch) never leaves the Video Class page open.
  useEffect(() => {
    if (currentPage === 'videoclass' && !videoClass.access) setCurrentPage('home');
  }, [currentPage, videoClass.access]);

  // Legacy loadAdminDashboard: Bearer ID token when signed in; failures keep the previous data.
  const loadAdminDashboard = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', { headers: await authHeaders() });
      const data = await res.json();
      if (data && data.success) {
        setAdminData(data);
      }
      setAdminLoading(false);
    } catch (err) {
      console.warn('[Admin Dashboard] Load error:', err);
      setAdminLoading(false);
    }
  }, []);

  const handleGoAdmin = useCallback(() => {
    setCurrentPage('admin');
    loadAdminDashboard();
    const viewport = document.querySelector('.app-main-viewport');
    if (viewport) viewport.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [loadAdminDashboard]);

  // #admin 또는 ?page=admin 딥링크: 서버가 관리자로 확인한 로그인 사용자만 콘솔을 연다.
  useEffect(() => {
    if (!auth.currentUser || !auth.isAdmin) return;
    if (window.location.hash === '#admin' || new URLSearchParams(window.location.search).get('page') === 'admin') {
      handleGoAdmin();
    }
  }, [auth.currentUser, auth.isAdmin, handleGoAdmin]);

  // Dev-only test aid (stripped from production builds): open a screen directly in browser tests.
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__hnSandboxNavigate = handleNavigate;

  const handleSelectTutor = (id) => {
    setSelectedTutorId(id);
    writeStorage('hn-tutor', id);
    chat.onTutorSelected(id);
    auth.persistTutor(id);
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
  // Legacy applyTheme: data-theme on <html> and sync meta theme-color for mobile status bar.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#121413' : '#F5F2EB');
    }
  }, [theme]);
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
  const chat = useChat(chatState, updateChatState, selectedTutorId, handleRecordActivity, auth.currentUser?.uid || null);

  // 튜터 채팅 진입 시 및 튜터 변경 시 7일 보존 검사 및 기본 첫 인사 동기화
  useEffect(() => {
    if (currentPage === 'chat') {
      chat.onTutorSelected(selectedTutorId);
    }
  }, [currentPage, selectedTutorId, chat]);

  // Legacy reviewMode is one app-wide flag (Writing's review toggle also drives Conversation).
  const conversation = useConversation({
    tutorId: selectedTutorId,
    lang,
    reviewMode: writingState.reviewMode,
    recordActivity: handleRecordActivity,
    currentUser: auth.currentUser,
    profile: auth.profile
  });
  const toggleTranslation = useTranslationToggle(translationState, updateTranslationState, listeningState, conversation.state.cvTurns);

  // 채팅 화면 + 데스크톱 사이드바가 열려 있으면 튜터 정보를 사이드바 하단(관리자 콘솔 자리)으로 옮긴다.
  const chatTutorInSidebar = currentPage === 'chat' && wide && !sidebarCollapsed;

  return (
    <SitePasswordGate>
      {appUpdate.updateAvailable && (
        <UpdateNotificationBanner
          lang={lang}
          versionInfo={appUpdate.versionInfo}
          isApplying={appUpdate.isApplying}
          onApply={appUpdate.applyUpdate}
          onDismiss={appUpdate.dismissUpdate}
        />
      )}
      <AppShell
      lang={lang}
      theme={theme}
      page={currentPage}
      wide={wide}
      selectedTutorId={selectedTutorId}
      sidebarCollapsed={sidebarCollapsed}
      sidebarWidth={sidebarWidth}
      onToggleSidebar={handleToggleSidebar}
      onSidebarWidth={handleSidebarWidth}
      onNavigate={handleNavigate}
      onSetLang={handleSetLang}
      onToggleTheme={handleToggleTheme}
      auth={auth}
      onGoAdmin={handleGoAdmin}
      videoClassAccess={videoClass.access}
      onGoVideoClass={handleGoVideoClass}
      sidebarFooter={chatTutorInSidebar ? (
        <ChatTutorHeader variant="sidebar" lang={lang} selectedTutorId={selectedTutorId} chatState={chatState} chat={chat} onNavigate={handleNavigate} />
      ) : null}
    >
      {currentPage === 'intro' && (
        <IntroPage lang={lang} onNavigate={handleNavigate} />
      )}
      {currentPage === 'about' && (
        <AboutPage lang={lang} onNavigate={handleNavigate} />
      )}
      {currentPage === 'resources' && (
        <ResourcesPage lang={lang} />
      )}
      {currentPage === 'notice' && (
        <NoticePage lang={lang} />
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
          onNavigate={handleNavigate}
          userId={auth.currentUser?.uid || null}
        />
      )}
      {currentPage === 'writing' && (
        <WritingPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          writingState={writingState}
          onWritingStateChange={setWritingState}
          onRecordActivity={handleRecordActivity}
          userId={auth.currentUser?.uid || null}
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
          userId={auth.currentUser?.uid || null}
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
      {currentPage === 'vocab' && (
        <VocabPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          studyLevel={studyLevel}
          onStudyLevelChange={setStudyLevel}
          onNavigate={handleNavigate}
          initialMode={vocabInitialMode}
        />
      )}
      {currentPage === 'mistakes' && (
        <MistakesPage lang={lang} selectedTutorId={selectedTutorId} onNavigate={handleNavigate} />
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
          userId={auth.currentUser?.uid || null}
        />
      )}
      {currentPage === 'chat' && (
        <ChatPage
          lang={lang}
          selectedTutorId={selectedTutorId}
          chatState={chatState}
          chat={chat}
          onNavigate={handleNavigate}
          tutorInSidebar={chatTutorInSidebar}
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
      {currentPage === 'admin' && (
        <AdminPage
          view={buildAdminView({
            adminData,
            adminSearch,
            adminFilter,
            currentUser: auth.currentUser,
            userProfile: auth.profile,
            selectedTutorId,
            userXp: activityState.userXp
          })}
          adminSearch={adminSearch}
          onAdminSearch={setAdminSearch}
          onAdminFilter={setAdminFilter}
          onRefresh={loadAdminDashboard}
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === 'videoclass' && videoClass.access && <VideoClassPage vc={videoClass} />}
      {videoClass.access && <VideoClassModals vc={videoClass} />}
    </AppShell>
    </SitePasswordGate>
  );
}

export default App;
