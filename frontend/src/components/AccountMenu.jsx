import React, { useEffect, useRef, useState } from 'react';

// 1:1 문의 수신 주소 (AboutPage 문의처의 학습자 창구와 동일).
const SUPPORT_EMAIL = 'hello@hangulnow.com';

export const MENU_TEXT = {
  en: { profileEdit: 'Edit profile & interests', adminConsole: 'Admin console', login: 'Log in', loginGoogle: 'Sign in with Google', guestHint: 'Sign in to save your progress', changeTutor: 'Change tutor', manual: 'User guide', notice: 'Notices', inquiry: '1:1 Support', logout: 'Log out' },
  ko: { profileEdit: '프로필·관심사 수정', adminConsole: '관리자 콘솔', login: '로그인', loginGoogle: 'Google 계정으로 로그인', guestHint: '로그인하면 학습 기록이 저장돼요', changeTutor: '튜터 변경', manual: '이용 매뉴얼', notice: '공지사항', inquiry: '1:1 문의', logout: '로그아웃' }
};

const Icon = ({ children }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const TutorIcon = () => <Icon><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></Icon>;
const BookIcon = () => <Icon><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></Icon>;
const MegaphoneIcon = () => <Icon><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M16 8.5a5 5 0 0 1 0 7" /><path d="M19 5.5a9 9 0 0 1 0 13" /></Icon>;
const ChatIcon = () => <Icon><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z" /></Icon>;
export const LogoutIcon = () => <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>;
const EditIcon = () => <Icon><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></Icon>;
const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transition: 'transform .18s ease', transform: open ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
);

function Avatar({ user, initial, size }) {
  return (
    <span className="account-menu__avatar" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.4)}px` }}>
      {user?.photoURL ? <img src={user.photoURL} alt="" /> : initial}
    </span>
  );
}

// 계정 메뉴 항목 (웹: 헤더 계정 메뉴, 앱: ☰ 메뉴가 같은 목록을 쓴다). close: 항목 선택 시 메뉴를 닫는 함수.
export function accountMenuItems({ lang, auth, onNavigate, close = () => {} }) {
  const t = MENU_TEXT[lang] || MENU_TEXT.en;
  const run = (fn) => () => { close(); fn(); };
  return [
    ...(auth.currentUser && auth.openOnboarding ? [{ key: 'profileEdit', label: t.profileEdit, icon: <EditIcon />, onClick: run(auth.openOnboarding) }] : []),
    { key: 'tutors', label: t.changeTutor, icon: <TutorIcon />, onClick: run(() => onNavigate('tutors')) },
    { key: 'manual', label: t.manual, icon: <BookIcon />, onClick: run(() => onNavigate('intro')) },
    { key: 'notice', label: t.notice, icon: <MegaphoneIcon />, onClick: run(() => onNavigate('notice')) },
    { key: 'inquiry', label: t.inquiry, icon: <ChatIcon />, href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[Hangul Now] 1:1 문의')}`, onClick: close }
  ];
}

// 헤더 우측 계정 버튼 + 하위 메뉴. 로그아웃 상태에서도 열리며, 이때는 로그인 버튼이 사용자 카드 자리를 대신한다.
function AccountMenu({ lang, auth, userName, userInitial, interestLabels, onNavigate }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const t = MENU_TEXT[lang] || MENU_TEXT.en;
  const user = auth.currentUser;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn) => () => { setOpen(false); fn(); };
  const items = accountMenuItems({ lang, auth, onNavigate, close: () => setOpen(false) });

  return (
    <div ref={rootRef} className="account-menu">
      <button type="button" className={`account-menu__trigger ${user ? 'is-user' : ''}`} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        {user ? <Avatar user={user} initial={userInitial} size={28} /> : null}
        <span className="account-menu__trigger-label">{user ? userName : t.login}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="account-menu__panel" role="menu">
          {user ? (
            <>
              <div className="account-menu__profile">
                <Avatar user={user} initial={userInitial} size={42} />
                <div className="account-menu__profile-text">
                  <span className="account-menu__name">{userName}</span>
                  <span className="account-menu__email">{user.email}</span>
                </div>
              </div>
              {auth.profile?.onboarded && interestLabels && (
                <div className="account-menu__interests" style={{ padding: '6px 10px', background: 'var(--chip)', borderRadius: '8px', fontSize: '11.5px', color: 'var(--ink2)', margin: '0 4px 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ font: "600 10px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{lang === 'ko' ? '관심사' : 'Interests'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{interestLabels}</span>
                </div>
              )}
            </>
          ) : (
            <div className="account-menu__profile account-menu__profile--guest">
              <span className="account-menu__guest-hint">{t.guestHint}</span>
              <button type="button" role="menuitem" className="account-menu__login" onClick={run(auth.login)}>{t.loginGoogle}</button>
            </div>
          )}

          <div className="account-menu__list">
            {items.map((item) => (item.href ? (
              <a key={item.key} role="menuitem" className="account-menu__item" href={item.href} onClick={item.onClick}>
                {item.icon}<span>{item.label}</span>
              </a>
            ) : (
              <button key={item.key} type="button" role="menuitem" className="account-menu__item" onClick={item.onClick}>
                {item.icon}<span>{item.label}</span>
              </button>
            )))}
          </div>

          {user && (
            <div className="account-menu__list account-menu__list--footer">
              <button type="button" role="menuitem" className="account-menu__item account-menu__item--danger" onClick={run(auth.logout)}>
                <LogoutIcon /><span>{t.logout}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
