import React, { useEffect, useRef } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { profileInterests } from '../data/profileData.js';
import OnboardingModal from './OnboardingModal.jsx';
import '../styles/shell.css';

const SHELL_TEXT = {
  en: { navHow: 'How it works', navTutors: 'Curriculum', navAbout: 'About us', startFree: 'Start free', themeTitle: 'Toggle dark mode', login: 'Log in', profileEdit: 'Edit profile & interests', profileInterests: 'My interests' },
  ko: { navHow: '학습 방법', navTutors: '커리큘럼', navAbout: '회사 소개', startFree: '무료로 시작', themeTitle: '다크 모드 전환', login: '로그인', profileEdit: '프로필·관심사 수정 (Edit Profile)', profileInterests: '내 관심사 (My Interests)' }
};

// Legacy navDef (preview/index.html 6665-6670). The admin-only Video Class group stays
// hidden: Video Class is deferred product scope (AGENTS.md section 14).
function navDefs(L) {
  return [
    { label: L ? '학습' : 'LEARN', items: [['home', L ? '오늘의 학습' : 'Today', '오'], ['tutors', L ? '커리큘럼' : 'Curriculum', '커'], ['chat', L ? '튜터 채팅' : 'Chat', '대']] },
    { label: L ? '4대 영역 연습' : 'PRACTICE', items: [['listening', L ? '듣기 연습' : 'Listening', '듣'], ['reading', L ? '읽기 독해' : 'Reading', '읽'], ['writing', L ? '쓰기 조합' : 'Writing', '쓰'], ['speaking', L ? '말하기 코치' : 'Speaking', '말'], ['conversation', L ? '실시간 회화' : 'Conversation', '회']] },
    { label: L ? '나의 기록' : 'YOU', items: [['record', L ? '학습 기록' : 'My progress', '기'], ['about', L ? '서비스 소개' : 'About us', '소']] }
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
  lang, theme, page, wide, selectedTutorId, unreadTotal,
  sidebarCollapsed, sidebarWidth, onToggleSidebar, onSidebarWidth,
  onNavigate, onSetLang, onToggleTheme, auth, onGoAdmin, children
}) {
  const L = lang === 'ko' ? 1 : 0;
  const t = SHELL_TEXT[lang] || SHELL_TEXT.en;
  const go = (target) => () => onNavigate(target);
  const raw = TUTORS.find((tu) => tu.id === selectedTutorId) || TUTORS[0];
  const tutor = {
    ...raw,
    name: L ? raw.ko : raw.en,
    role: raw.role[L],
    genderSymbol: raw.gender === 'female' ? '♀' : '♂',
    genderBg: raw.gender === 'female' ? '#E06B82' : '#4B7BEC'
  };
  const groups = navDefs(L);
  const userName = auth.profile?.nickname || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Learner';
  const userInitial = (auth.currentUser?.displayName || auth.currentUser?.email || 'U')[0].toUpperCase();
  const interestLabels = profileInterests(auth.profile).map((item) => `${item.icon} ${L ? item.ko : item.en}`).join('  ');
  const navItem = ([k, label, glyph]) => {
    const active = page === k;
    return { k, label, glyph, active, hasBadge: k === 'chat' && unreadTotal > 0 };
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
      <header className="marketing-header" style={{ position: 'sticky', top: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '8px clamp(16px,3vw,36px)', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexWrap: 'wrap', flex: 'none', height: '62px', boxSizing: 'border-box' }}>
        <button type="button" onClick={go('intro')} aria-label="Hangul Now home" style={{ display: 'flex', alignItems: 'center', border: 0, background: 'none', cursor: 'pointer', padding: 0 }}>
          <img className="brand-logo brand-logo--header brand-logo--light" src="/assets/logo-new.png?v=2" alt="Hangul Now" />
          <img className="brand-logo brand-logo--header brand-logo--dark" src="/assets/logo-new-dark.png?v=2" alt="Hangul Now" />
        </button>
        <nav className="marketing-header__nav" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px', flexWrap: 'wrap' }}>
          {/* Legacy goHow scrolls the window, which never scrolls inside the shell: it only opens Intro. */}
          <button type="button" onClick={go('intro')} style={{ border: 0, background: 'none', color: 'var(--sub)', fontSize: '14px', cursor: 'pointer' }}>{t.navHow}</button>
          <button type="button" onClick={go('tutors')} style={{ border: 0, background: 'none', color: 'var(--sub)', fontSize: '14px', cursor: 'pointer' }}>{t.navTutors}</button>
          <button type="button" onClick={go('about')} style={{ border: 0, background: 'none', color: page === 'about' ? 'var(--ink)' : 'var(--sub)', fontSize: '14px', cursor: 'pointer', fontWeight: page === 'about' ? '700' : '400' }}>{t.navAbout}</button>
          <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '999px', padding: '3px' }}>
            <button type="button" onClick={() => onSetLang('en')} style={{ border: 0, background: L ? 'transparent' : 'var(--card)', color: L ? 'var(--faint)' : 'var(--ink)', borderRadius: '999px', padding: '5px 11px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>EN</button>
            <button type="button" onClick={() => onSetLang('ko')} style={{ border: 0, background: L ? 'var(--card)' : 'transparent', color: L ? 'var(--ink)' : 'var(--faint)', borderRadius: '999px', padding: '5px 11px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>한국어</button>
          </div>
          <button type="button" onClick={onToggleTheme} title={t.themeTitle} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
          </button>
          {auth.isAdmin && (
            <button type="button" onClick={onGoAdmin} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #D4AF37', background: 'rgba(212,175,55,0.15)', color: 'var(--ink)', padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              <span>👑</span>
              <span>Admin</span>
            </button>
          )}
          {!auth.currentUser && <button type="button" onClick={auth.login} style={{ border: 0, background: 'none', color: 'var(--ink)', fontSize: '14px', cursor: 'pointer' }}>{t.login}</button>}
          <button type="button" onClick={go('tutors')} style={{ border: 0, background: 'var(--solid)', color: 'var(--on-solid)', padding: '10px 18px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t.startFree}</button>
        </nav>
      </header>

      <div className="app-body-container" style={{ display: 'flex', flex: 1, minHeight: 0, height: 'calc(100dvh - 62px)', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        {wide && (
          <>
            {sidebarCollapsed && (
              <button type="button" onClick={onToggleSidebar} title="사이드바 열기 (Ctrl + B)" className="sidebar-open-floating-btn" style={{ border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' }}>
                <SidebarIcon size={20} />
              </button>
            )}
            <aside ref={asideRef} id="app-sidebar" className={`app-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`} style={{ width: `${sidebarWidth}px`, flex: 'none', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '2px 2px 8px', borderBottom: '1px solid var(--line2)', marginBottom: '4px', flex: 'none' }}>
                <button type="button" onClick={onToggleSidebar} title="사이드바 접기 (Ctrl + B)" className="sidebar-toggle-btn" style={{ border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s ease' }}>
                  <SidebarIcon size={18} />
                </button>
              </div>
              {groups.map((g) => (
                <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ font: "500 10.5px 'IBM Plex Mono',monospace", letterSpacing: '.12em', color: 'var(--faint)', padding: '0 10px 6px' }}>{g.label}</span>
                  {g.items.map(navItem).map((n) => (
                    <button type="button" key={n.k} onClick={go(n.k)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', border: 0, background: n.active ? 'var(--accent)' : 'transparent', color: n.active ? '#F5F2EB' : 'var(--ink2)', padding: '8px 10px', borderRadius: '10px', fontSize: '13.5px', cursor: 'pointer', width: '100%', textAlign: 'left', position: 'relative', transition: 'all .15s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '6px', border: `1px solid ${n.active ? 'rgba(245,242,235,.35)' : 'var(--line3)'}`, display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700, flex: 'none', background: 'rgba(255,255,255,0.06)' }}>{n.glyph}</span>
                        <span style={{ fontWeight: n.active ? '600' : '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</span>
                      </div>
                      {n.hasBadge && <span style={{ background: '#C25E3E', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>{unreadTotal}</span>}
                    </button>
                  ))}
                </div>
              ))}
              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ font: "600 10px 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>{L ? '내 전담 튜터' : 'MY TUTOR'}</span>
                    <button type="button" onClick={go('tutors')} style={{ border: 0, background: 'none', color: 'var(--sub)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span>{L ? '튜터 변경' : 'Change'}</span> ↺
                    </button>
                  </div>
                  <div onClick={go('chat')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '13px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 700, flex: 'none', position: 'relative' }}>
                      {tutor.initial}
                      <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '15px', height: '15px', borderRadius: '50%', background: tutor.genderBg, color: '#fff', fontSize: '9px', fontWeight: 700, display: 'grid', placeItems: 'center', border: '1.5px solid var(--card)' }}>{tutor.genderSymbol}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>{tutor.name}</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tutor.role}</span>
                    </div>
                  </div>
                </div>
                {auth.currentUser ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#D7DCE3', color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 700, flex: 'none', overflow: 'hidden' }}>
                          {auth.currentUser.photoURL ? <img src={auth.currentUser.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userInitial}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</span>
                          <span style={{ fontSize: '11px', color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{auth.currentUser.email}</span>
                        </div>
                      </div>
                      <button type="button" onClick={auth.logout} title="로그아웃" style={{ border: 0, background: 'none', color: 'var(--faint)', fontSize: '13px', cursor: 'pointer', padding: '2px 4px', flex: 'none' }}>✕</button>
                    </div>
                    {auth.profile?.onboarded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 8px', borderRadius: '10px', background: 'var(--chip)' }}>
                        <span style={{ font: "600 10.5px 'IBM Plex Mono',monospace", letterSpacing: '.06em', color: 'var(--faint)' }}>{t.profileInterests}</span>
                        <span style={{ fontSize: '11.5px', lineHeight: 1.5, color: 'var(--ink2)' }}>{interestLabels}</span>
                      </div>
                    )}
                    <button type="button" onClick={auth.openOnboarding} style={{ border: 0, background: 'none', color: 'var(--accent-ink)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: '2px 8px', textAlign: 'left' }}>✎ {t.profileEdit}</button>
                  </>
                ) : (
                  <button type="button" onClick={auth.login} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', padding: '8px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: '100%', transition: 'background .15s' }}>
                    <GoogleIcon />
                    <span>{L ? 'Google 계정으로 로그인' : 'Sign in with Google'}</span>
                  </button>
                )}
                {auth.isAdmin && (
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
          {!wide && (
            <div style={{ position: 'sticky', top: '69px', zIndex: 5, background: 'var(--bg2)', borderBottom: '1px solid var(--line)', display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 12px', alignItems: 'center' }}>
              {groups.flatMap((g) => g.items).map(navItem).map((n) => (
                <button type="button" key={n.k} onClick={go(n.k)} style={{ flex: 'none', border: `1px solid ${n.active ? 'var(--accent)' : 'var(--line)'}`, background: n.active ? 'var(--accent)' : 'var(--card)', color: n.active ? '#F5F2EB' : 'var(--ink2)', padding: '7px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{n.label}</button>
              ))}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
