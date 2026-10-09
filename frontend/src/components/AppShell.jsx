import React, { useEffect, useRef, useState } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { profileInterests } from '../data/profileData.js';
import OnboardingModal from './OnboardingModal.jsx';
import AccountMenu, { LogoutIcon, MENU_TEXT, accountMenuItems } from './AccountMenu.jsx';
import { COMMUNITY_TEXT, KAKAO_OPENCHAT } from '../data/communityData.js';
import '../styles/shell.css';

const MenuIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const SHELL_TEXT = {
  en: { navHow: 'Home', navLearn: 'Learn', navResources: 'Resources', navTutors: 'Tutors', navAbout: 'About us', startFree: 'Start free', themeTitle: 'Toggle dark mode', navVideoClass: '1:1 Video', profileEdit: 'Edit profile & interests', profileInterests: 'My interests' },
  ko: { navHow: 'Home', navLearn: '학습', navResources: '자료실', navTutors: '튜터', navAbout: '회사 소개', startFree: '무료로 시작', themeTitle: '다크 모드 전환', navVideoClass: '화상수업', profileEdit: '프로필·관심사 수정 (Edit Profile)', profileInterests: '내 관심사 (My Interests)' }
};

// Legacy navDef (preview/index.html 6665-6670). The Video Class group is admin-only: it is
// appended only for a server-verified admin (AGENTS.md section 14 keeps it from general users).
// 헤더 '학습'은 오늘의 학습으로 이동하고, 사이드바의 학습 화면에 있는 동안 굵게 표시된다.
// 사이드바 없이 전체 폭으로 보여 주는 화면 (헤더 메뉴의 독립 화면들)
const NO_SIDEBAR_PAGES = ['intro', 'tutors', 'resources', 'videoclass', 'about', 'admin', 'notice'];
// 데스크톱 사이드바에서 그룹 제목(학습 / 4대 영역 연습)을 숨기는 그룹
const SIDEBAR_HIDDEN_LABELS = ['learn', 'practice'];
const SIDEBAR_EXCLUDED = ['tutors', 'about', 'videoclass', 'resources'];
const LEARN_PAGES = ['home', 'chat', 'listening', 'reading', 'writing', 'speaking', 'conversation', 'record'];

function navDefs(L, videoClassAccess) {
  return [
    { id: 'learn', label: L ? '학습' : 'LEARN', items: [['home', L ? '오늘의 학습' : 'Today', '오'], ['tutors', L ? '튜터' : 'Tutors', '튜'], ['chat', L ? '튜터 채팅' : 'Chat', '대']] },
    { id: 'practice', label: L ? '4대 영역 연습' : 'PRACTICE', items: [['listening', L ? '듣기 연습' : 'Listening', '듣'], ['reading', L ? '읽기 독해' : 'Reading', '읽'], ['writing', L ? '쓰기 조합' : 'Writing', '쓰'], ['speaking', L ? '말하기 코치' : 'Speaking', '말'], ['conversation', L ? '실시간 회화' : 'Conversation', '회']] },
    { id: 'you', label: L ? '나의 기록' : 'YOU', items: [['record', L ? '학습 기록' : 'My progress', '기'], ['resources', L ? '자료실' : 'Resources', '자'], ['about', L ? '회사 소개' : 'About us', '소']] },
    ...(videoClassAccess ? [{ id: 'videoclass', label: L ? '화상 수업 매칭' : 'LIVE VIDEO CLASS', items: [['videoclass', L ? '1:1 화상수업' : '1:1 Live Class', '화']] }] : [])
  ];
}

const SidebarIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>
);

function AppShell({
  lang, theme, page, wide, selectedTutorId,
  sidebarCollapsed, sidebarWidth, onToggleSidebar, onSidebarWidth,
  onNavigate, onSetLang, onToggleTheme, auth, onGoAdmin, videoClassAccess, onGoVideoClass, sidebarFooter = null, children
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const L = lang === 'ko' ? 1 : 0;
  const t = SHELL_TEXT[lang] || SHELL_TEXT.en;
  const go = (target) => () => {
    setMobileDrawerOpen(false);
    onNavigate(target);
  };
  const raw = TUTORS.find((tu) => tu.id === selectedTutorId) || TUTORS[0];
  const tutor = {
    ...raw,
    name: L ? raw.ko : raw.en,
    role: raw.role[L],
    genderSymbol: raw.gender === 'female' ? '♀' : '♂',
    genderBg: raw.gender === 'female' ? '#E06B82' : '#4B7BEC'
  };
  const groups = navDefs(L, videoClassAccess);
  // 데스크톱 사이드바(학습 메뉴)·모바일 서브내비에는 학습 화면만: 튜터·자료실·회사 소개·1:1 화상수업은 헤더(앱: ☰ 메뉴)로 이동한다.
  // 항목이 모두 빠진 그룹(화상 수업 매칭)은 숨긴다.
  const sidebarGroups = groups
    .map((g) => ({ ...g, items: g.items.filter(([k]) => !SIDEBAR_EXCLUDED.includes(k)) }))
    .filter((g) => g.items.length > 0);
  const userName = auth.profile?.nickname || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Learner';
  const userInitial = (auth.currentUser?.displayName || auth.currentUser?.email || 'U')[0].toUpperCase();
  const interestLabels = profileInterests(auth.profile).map((item) => `${item.icon} ${L ? item.ko : item.en}`).join('  ');
  const navItem = ([k, label, glyph]) => {
    const active = page === k;
    return { k, label, glyph, active };
  };

  // Legacy initSidebarResize: drag 180-460px, double-click restores 240px, both persisted.
  const asideRef = useRef(null);
  const handleRef = useRef(null);
  const mainRef = useRef(null);
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [page]);
  useEffect(() => {
    const handle = handleRef.current;
    const aside = asideRef.current;
    if (!handle || !aside) return undefined;
    let startX = 0;
    let startWidth = 240;
    const onMouseMove = (e) => {
      let newWidth = startWidth + (e.clientX - startX);
      if (newWidth < 180) newWidth = 180;
      if (newWidth > 460) newWidth = 460;
      aside.style.width = `${newWidth}px`;
      onSidebarWidth(newWidth, false);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      handle.classList.remove('is-dragging');
      const curW = parseInt(aside.style.width, 10);
      if (curW) onSidebarWidth(curW, true);
    };
    handle.onmousedown = (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = aside.getBoundingClientRect().width;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      handle.classList.add('is-dragging');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    handle.ondblclick = () => {
      aside.style.width = '240px';
      onSidebarWidth(240, true);
    };
    return () => {
      handle.onmousedown = null;
      handle.ondblclick = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [wide, onSidebarWidth]);

  return (
    <div className="app-root-shell" style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <OnboardingModal lang={lang} auth={auth} />
      <header className="marketing-header" style={{ position: 'sticky', top: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '8px clamp(16px,3vw,36px)', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexWrap: 'nowrap', flex: 'none', height: '60px', boxSizing: 'border-box' }}>
        <div className="header-brand-group">
          {/* 모바일(앱) 버전: 햄버거 메뉴는 로고 왼쪽 */}
          <button type="button" className="mobile-menu-btn" onClick={() => setMobileDrawerOpen(true)} aria-label="메뉴 열기" aria-expanded={mobileDrawerOpen} style={{ border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', width: '36px', height: '36px', borderRadius: '10px', placeItems: 'center', cursor: 'pointer', flex: 'none' }}>
            <MenuIcon />
          </button>
          <button type="button" onClick={go('intro')} aria-label="Hangul Now home" style={{ display: 'flex', alignItems: 'center', border: 0, background: 'none', cursor: 'pointer', padding: 0 }}>
            <img className="brand-logo brand-logo--header brand-logo--light" src="/assets/logo-new.png?v=2" alt="Hangul Now" />
            <img className="brand-logo brand-logo--header brand-logo--dark" src="/assets/logo-new-dark.png?v=2" alt="Hangul Now" />
          </button>
        </div>

        {/* 데스크톱 전용 헤더 내비게이션 */}
        <nav className="marketing-header__nav desktop-header-nav">
          <button type="button" onClick={go('intro')} style={{ border: 0, background: 'none', color: page === 'intro' ? 'var(--ink)' : 'var(--sub)', fontSize: '14px', cursor: 'pointer', fontWeight: page === 'intro' ? '700' : '400' }}>{t.navHow}</button>
          <button type="button" onClick={go('tutors')} style={{ border: 0, background: 'none', color: page === 'tutors' ? 'var(--ink)' : 'var(--sub)', fontSize: '14px', cursor: 'pointer', fontWeight: page === 'tutors' ? '700' : '400' }}>{t.navTutors}</button>
          <button type="button" onClick={go('home')} style={{ border: 0, background: 'none', color: LEARN_PAGES.includes(page) ? 'var(--ink)' : 'var(--sub)', fontSize: '14px', cursor: 'pointer', fontWeight: LEARN_PAGES.includes(page) ? '700' : '400' }}>{t.navLearn}</button>
          <button type="button" onClick={go('resources')} style={{ border: 0, background: 'none', color: page === 'resources' ? 'var(--ink)' : 'var(--sub)', fontSize: '14px', cursor: 'pointer', fontWeight: page === 'resources' ? '700' : '400' }}>{t.navResources}</button>
          {videoClassAccess && (
            <button type="button" onClick={onGoVideoClass} title="1:1 화상 한국어 수업 매칭 플랫폼 (관리자 전용 미리보기)" style={{ border: 0, background: 'none', color: 'var(--ink)', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '8px', transition: 'all .15s ease' }}>
              <span style={{ fontWeight: 600 }}>{t.navVideoClass}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1.5px 6px', borderRadius: '6px', background: 'rgba(212,175,55,0.18)', color: '#B8860B', border: '1px solid rgba(212,175,55,0.4)', letterSpacing: '0.3px' }}>Admin</span>
            </button>
          )}
          <button type="button" onClick={go('about')} style={{ border: 0, background: 'none', color: page === 'about' ? 'var(--ink)' : 'var(--sub)', fontSize: '14px', cursor: 'pointer', fontWeight: page === 'about' ? '700' : '400' }}>{t.navAbout}</button>
          <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '999px', padding: '3px' }}>
            <button type="button" onClick={() => onSetLang('en')} style={{ border: 0, background: L ? 'transparent' : 'var(--card)', color: L ? 'var(--faint)' : 'var(--ink)', borderRadius: '999px', padding: '5px 11px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>EN</button>
            <button type="button" onClick={() => onSetLang('ko')} style={{ border: 0, background: L ? 'var(--card)' : 'transparent', color: L ? 'var(--ink)' : 'var(--faint)', borderRadius: '999px', padding: '5px 11px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>한국어</button>
          </div>
          <button type="button" onClick={onToggleTheme} className="theme-toggle-btn" title={t.themeTitle}>
            {theme === 'dark'
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
          </button>
          {auth.isAdmin && (
            <button type="button" onClick={onGoAdmin} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #D4AF37', background: 'rgba(212,175,55,0.15)', color: 'var(--ink)', padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              <span>👑</span>
              <span>Admin</span>
            </button>
          )}
          <AccountMenu lang={lang} auth={auth} userName={userName} userInitial={userInitial} interestLabels={interestLabels} onNavigate={(target) => go(target)()} />
        </nav>

        {/* 모바일 전용 헤더 액션 영역 */}
        <div className="mobile-header-actions">
          <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '999px', padding: '2px' }}>
            <button type="button" onClick={() => onSetLang('en')} style={{ border: 0, background: L ? 'transparent' : 'var(--card)', color: L ? 'var(--faint)' : 'var(--ink)', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>EN</button>
            <button type="button" onClick={() => onSetLang('ko')} style={{ border: 0, background: L ? 'var(--card)' : 'transparent', color: L ? 'var(--ink)' : 'var(--faint)', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>한국어</button>
          </div>
          <button type="button" onClick={onToggleTheme} className="theme-toggle-btn" title={t.themeTitle}>
            {theme === 'dark'
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
          </button>
        </div>
      </header>

      {/* 모바일 햄버거 슬라이드 드로어 */}
      <div className={`mobile-drawer-overlay ${mobileDrawerOpen ? 'is-open' : ''}`} onClick={() => setMobileDrawerOpen(false)}>
        <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ font: "700 16px 'Gowun Batang',serif", color: 'var(--ink)' }}>Hangul Now</span>
            <button type="button" onClick={() => setMobileDrawerOpen(false)} style={{ border: 0, background: 'none', color: 'var(--ink)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>✕</button>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
            {/* 전담 튜터 카드 */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ font: "600 10px 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>{L ? '내 전담 튜터' : 'MY TUTOR'}</span>
                <button type="button" onClick={go('tutors')} style={{ border: 0, background: 'none', color: 'var(--sub)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  <span>{L ? '튜터 변경' : 'Change'}</span> ↺
                </button>
              </div>
              <div onClick={go('chat')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 700, flex: 'none', position: 'relative', overflow: 'hidden' }}>
                  {tutor.photo ? <img src={tutor.photo} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : tutor.initial}
                  <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '15px', height: '15px', borderRadius: '50%', background: tutor.genderBg, color: '#fff', fontSize: '9px', fontWeight: 700, display: 'grid', placeItems: 'center', border: '1.5px solid var(--card)' }}>{tutor.genderSymbol}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>{tutor.name}</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--sub)' }}>{tutor.role}</span>
                </div>
              </div>
            </div>

            {/* 주 메뉴: 웹 헤더와 같은 순서 (Home · 튜터 · 학습 · 자료실 · 화상수업 · 회사 소개). 학습 아래엔 학습 화면 8개 */}
            <nav className="drawer-nav" aria-label={L ? '메뉴' : 'Menu'}>
              <button type="button" className={`drawer-nav__item ${page === 'intro' ? 'is-active' : ''}`} onClick={go('intro')}>{t.navHow}</button>
              <button type="button" className={`drawer-nav__item ${page === 'tutors' ? 'is-active' : ''}`} onClick={go('tutors')}>{t.navTutors}</button>
              <div className="drawer-nav__group">
                <span className={`drawer-nav__group-label ${LEARN_PAGES.includes(page) ? 'is-active' : ''}`}>{t.navLearn}</span>
                {sidebarGroups.flatMap((g) => g.items).map(navItem).map((n) => (
                  <button type="button" key={n.k} className={`drawer-nav__sub ${n.active ? 'is-active' : ''}`} onClick={go(n.k)} aria-current={n.active ? 'page' : undefined}>
                    <span className="drawer-nav__glyph" aria-hidden="true">{n.glyph}</span>
                    <span>{n.label}</span>
                  </button>
                ))}
              </div>
              <button type="button" className={`drawer-nav__item ${page === 'resources' ? 'is-active' : ''}`} onClick={go('resources')}>{t.navResources}</button>
              {videoClassAccess && (
                <button type="button" className={`drawer-nav__item ${page === 'videoclass' ? 'is-active' : ''}`} onClick={() => { setMobileDrawerOpen(false); onGoVideoClass(); }}>
                  {t.navVideoClass} <span className="drawer-nav__badge">Admin</span>
                </button>
              )}
              <button type="button" className={`drawer-nav__item ${page === 'about' ? 'is-active' : ''}`} onClick={go('about')}>{t.navAbout}</button>
            </nav>

            {/* 커뮤니티 참여 (웹: 채팅 화면 오른쪽 QR 카드) */}
            <a className="drawer-community" href={KAKAO_OPENCHAT.url} target="_blank" rel="noopener noreferrer">
              <span className="drawer-community__title">💬 {(COMMUNITY_TEXT[lang] || COMMUNITY_TEXT.en).title}</span>
              <span className="drawer-community__body">{(COMMUNITY_TEXT[lang] || COMMUNITY_TEXT.en).body}</span>
              <span className="drawer-community__cta">{(COMMUNITY_TEXT[lang] || COMMUNITY_TEXT.en).join} ↗</span>
            </a>

            {/* 계정: 웹 헤더 계정 메뉴와 같은 항목 + 관리자 콘솔(관리자만) + 로그인/로그아웃 */}
            <div className="drawer-account">
              {auth.currentUser ? (
                <div className="drawer-account__user">
                  <span className="drawer-account__avatar">
                    {auth.currentUser.photoURL ? <img src={auth.currentUser.photoURL} alt="" /> : userInitial}
                  </span>
                  <span className="drawer-account__text">
                    <span className="drawer-account__name">{userName}</span>
                    {!!auth.currentUser.email && <span className="drawer-account__email">{auth.currentUser.email}</span>}
                  </span>
                </div>
              ) : (
                <button type="button" onClick={() => { setMobileDrawerOpen(false); auth.login(); }} className="drawer-account__login">
                  <GoogleIcon />
                  <span>{(MENU_TEXT[lang] || MENU_TEXT.en).loginGoogle}</span>
                </button>
              )}
              <div className="drawer-account__list">
                {accountMenuItems({ lang, auth, onNavigate: (target) => go(target)(), close: () => setMobileDrawerOpen(false) }).map((item) => (item.href ? (
                  <a key={item.key} className="drawer-account__item" href={item.href} onClick={item.onClick}>{item.icon}<span>{item.label}</span></a>
                ) : (
                  <button key={item.key} type="button" className="drawer-account__item" onClick={item.onClick}>{item.icon}<span>{item.label}</span></button>
                )))}
                {auth.isAdmin && (
                  <button type="button" className="drawer-account__item drawer-account__item--admin" onClick={() => { setMobileDrawerOpen(false); onGoAdmin(); }}>
                    <span aria-hidden="true">👑</span><span>{(MENU_TEXT[lang] || MENU_TEXT.en).adminConsole}</span>
                  </button>
                )}
                {auth.currentUser && (
                  <button type="button" className="drawer-account__item drawer-account__item--danger" onClick={() => { setMobileDrawerOpen(false); auth.logout(); }}>
                    <LogoutIcon /><span>{(MENU_TEXT[lang] || MENU_TEXT.en).logout}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="app-body-container" style={{ display: 'flex', flex: 1, minHeight: 0, height: 'calc(100dvh - 62px)', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        {/* Home·튜터·자료실·화상수업·회사 소개·관리자 콘솔·공지사항 화면에서는 왼쪽 사이드바를 띄우지 않는다 */}
        {wide && !NO_SIDEBAR_PAGES.includes(page) && (
          <>
            {sidebarCollapsed && (
              <button type="button" onClick={onToggleSidebar} title="사이드바 열기 (Ctrl + B)" className="sidebar-open-floating-btn" style={{ border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' }}>
                <SidebarIcon size={20} />
              </button>
            )}
            <aside ref={asideRef} id="app-sidebar" className={`app-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''} ${sidebarFooter ? 'has-footer-slot' : ''}`} style={{ width: `${sidebarWidth}px`, flex: 'none', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '2px 2px 8px', borderBottom: '1px solid var(--line2)', marginBottom: '4px', flex: 'none' }}>
                <button type="button" onClick={onToggleSidebar} title="사이드바 접기 (Ctrl + B)" className="sidebar-toggle-btn" style={{ border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s ease' }}>
                  <SidebarIcon size={18} />
                </button>
              </div>
              {sidebarGroups.map((g) => (
                <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {!SIDEBAR_HIDDEN_LABELS.includes(g.id) && <span style={{ font: "500 10.5px 'IBM Plex Mono',monospace", letterSpacing: '.12em', color: 'var(--faint)', padding: '0 10px 6px' }}>{g.label}</span>}
                  {g.items.map(navItem).map((n) => (
                    <button type="button" key={n.k} onClick={go(n.k)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', border: 0, background: n.active ? 'var(--accent)' : 'transparent', color: n.active ? '#F5F2EB' : 'var(--ink2)', padding: '8px 10px', borderRadius: '10px', fontSize: '13.5px', cursor: 'pointer', width: '100%', textAlign: 'left', position: 'relative', transition: 'all .15s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '6px', border: `1px solid ${n.active ? 'rgba(245,242,235,.35)' : 'var(--line3)'}`, display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700, flex: 'none', background: 'rgba(255,255,255,0.06)' }}>{n.glyph}</span>
                        <span style={{ fontWeight: n.active ? '600' : '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 페이지가 넘겨준 하단 영역(채팅 화면의 튜터 정보)이 있으면 '내 전담 튜터' 카드·관리자 콘솔 대신 표시 */}
                {sidebarFooter && <div className="sidebar-footer-slot">{sidebarFooter}</div>}
                {!sidebarFooter && <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ font: "600 10px 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>{L ? '내 전담 튜터' : 'MY TUTOR'}</span>
                    <button type="button" onClick={go('tutors')} style={{ border: 0, background: 'none', color: 'var(--sub)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span>{L ? '튜터 변경' : 'Change'}</span> ↺
                    </button>
                  </div>
                  <div onClick={go('chat')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 700, flex: 'none', position: 'relative', overflow: 'hidden' }}>
                      {tutor.photo ? <img src={tutor.photo} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : tutor.initial}
                      <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '15px', height: '15px', borderRadius: '50%', background: tutor.genderBg, color: '#fff', fontSize: '9px', fontWeight: 700, display: 'grid', placeItems: 'center', border: '1.5px solid var(--card)' }}>{tutor.genderSymbol}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>{tutor.name}</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tutor.role}</span>
                    </div>
                  </div>
                </div>}
                {!sidebarFooter && auth.isAdmin && (
                  <button type="button" onClick={onGoAdmin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px solid #D4AF37', background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(35,73,63,0.18) 100%)', color: 'var(--ink)', padding: '9px 12px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: '6px', transition: 'all .15s ease', boxShadow: '0 3px 10px rgba(212,175,55,0.12)' }}>
                    <span>👑</span>
                    <span>관리자 콘솔 (Admin)</span>
                  </button>
                )}
              </div>
              <div ref={handleRef} id="sidebar-resizer" className="sidebar-resizer" title="좌우로 드래그하여 사이드바 너비 조정 (더블클릭 시 240px 기본값 복원)" />
            </aside>
          </>
        )}

        <main ref={mainRef} className="app-main-viewport" style={{ flex: 1, minWidth: 0, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
