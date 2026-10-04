import React, { useState, useEffect } from 'react';

// 비공개 접속 허용 비밀번호
const REQUIRED_PASSWORD = 'hangul1028!';
const STORAGE_KEY = 'hn-site-access';
const ACCESS_GRANTED_VALUE = 'granted_20261028';

export default function SitePasswordGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(true);

  // 브라우저에 이미 인증 기록이 있는지 확인
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === ACCESS_GRANTED_VALUE) {
        setIsAuthenticated(true);
      }
    } catch {
      // 로컬스토리지 접근 불가 시 패스스루 방지
    } finally {
      setChecking(false);
    }
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력해 주세요.');
      triggerShake();
      return;
    }

    if (password === REQUIRED_PASSWORD) {
      try {
        localStorage.setItem(STORAGE_KEY, ACCESS_GRANTED_VALUE);
      } catch {
        // 로컬스토리지 저장 실패해도 세션 중에는 통과
      }
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // 초기 로컬스토리지 확인 중에는 깜빡임 방지용 빈 화면 또는 로더
  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#1C1F1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#A9C1B6',
        fontFamily: "'Inter', sans-serif"
      }}>
        접속 확인 중…
      </div>
    );
  }

  // 인증 완료 시 메인 애플리케이션 렌더링
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // 미인증 시 비밀번호 게이트 화면 렌더링
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#161817',
      backgroundImage: 'radial-gradient(circle at 50% 20%, #23493F 0%, #161817 65%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#F5F2EB',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes gateShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .gate-card-shake {
          animation: gateShake 0.4s ease-in-out;
        }
        .gate-input:focus {
          border-color: #55EFC4 !important;
          box-shadow: 0 0 0 3px rgba(85, 239, 196, 0.25) !important;
        }
        .gate-btn:hover {
          background-color: #48D6AE !important;
          transform: translateY(-1px);
        }
        .gate-btn:active {
          transform: translateY(0);
        }
      `}</style>

      <div
        className={shake ? 'gate-card-shake' : ''}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(28, 31, 30, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 242, 235, 0.12)',
          borderRadius: '24px',
          padding: 'clamp(28px, 6vw, 40px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        {/* 보안 잠금 아이콘 */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'rgba(85, 239, 196, 0.12)',
          border: '1px solid rgba(85, 239, 196, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#55EFC4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        {/* 타이틀 및 설명 */}
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: '#F5F2EB',
          letterSpacing: '-0.02em'
        }}>
          Hangul Now
        </h1>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#A9C1B6',
          lineHeight: '1.5'
        }}>
          비공개 사전 테스트 중입니다.<br />
          발급받으신 입장 비밀번호를 입력해 주세요.
        </p>

        {/* 비밀번호 입력 폼 */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="입장 비밀번호 입력"
              autoFocus
              className="gate-input"
              style={{
                width: '100%',
                padding: '14px 44px 14px 16px',
                borderRadius: '12px',
                border: error ? '1px solid #FF7675' : '1px solid rgba(245, 242, 235, 0.18)',
                background: 'rgba(22, 24, 23, 0.65)',
                color: '#F5F2EB',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            />
            {/* 눈 모양 비밀번호 보이기/숨기기 토글 */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#A9C1B6',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{
              fontSize: '13px',
              color: '#FF7675',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          {/* 입장 버튼 */}
          <button
            type="submit"
            className="gate-btn"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: '#55EFC4',
              color: '#161817',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '4px'
            }}
          >
            입장하기
          </button>
        </form>

        {/* 안내 푸터 */}
        <div style={{
          marginTop: '28px',
          fontSize: '12px',
          color: 'rgba(245, 242, 235, 0.4)',
          borderTop: '1px solid rgba(245, 242, 235, 0.08)',
          paddingTop: '16px',
          width: '100%'
        }}>
          Hangul Now · Private Preview Gate
        </div>
      </div>
    </div>
  );
}
