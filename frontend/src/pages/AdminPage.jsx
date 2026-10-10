import React, { useEffect, useState } from 'react';
import { XLSX_MIME, buildXlsx, downloadBlob, stamp, toCsv } from '../utils/tableExport.js';
import { driveErrorMessage, prepareDriveSave, saveCsvAsGoogleSheet } from '../utils/googleDrive.js';
import { GENDERS, INTERESTS, NATIONALITIES } from '../data/profileData.js';

// Legacy "09 Admin Console" (preview/index.html 2990-3205, derivations 6946-7017).
// Read-only dashboard; authorization is enforced by the server (requireAdmin).
const DAY_MS = 86400000;
const TUTOR_NAMES = { jiwoo: '김지우', minho: '박민호', seoyeon: '이서연', haneul: '최하늘' };


const GoogleMark = () => (
  <svg width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>
);

export function buildAdminView({ adminData, adminSearch, adminFilter, currentUser, userProfile, selectedTutorId, userXp }) {
  const now = Date.now();
  const rawAdminUsers = (adminData && adminData.users) ? adminData.users : (currentUser ? [
    {
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Learner',
      nickname: userProfile?.nickname || (currentUser.displayName || '').split(' ')[0] || 'henry',
      nationality: userProfile?.nationality || 'US',
      nationalityName: userProfile?.nationalityName || 'United States',
      gender: userProfile?.gender || 'male',
      interests: (userProfile?.interests && userProfile.interests.length) ? userProfile.interests : ['kdrama', 'kpop', 'food', 'travel', 'work'],
      email: currentUser.email || 'learner@hangulnow.com',
      photoURL: currentUser.photoURL || '',
      selectedTutorId: selectedTutorId || 'jiwoo',
      level: 'beginner',
      xp: userXp || 2840,
      createdAt: now - 7 * DAY_MS,
      lastLoginAt: now,
      isActiveToday: true,
      provider: 'google.com'
    }
  ] : [
    {
      uid: 'demo_user_01',
      displayName: 'Henry Levin',
      nickname: 'henry',
      nationality: 'US',
      nationalityName: 'United States',
      gender: 'male',
      interests: ['kdrama', 'kpop', 'food', 'travel', 'work'],
      email: 'henry.levin@example.com',
      photoURL: '',
      selectedTutorId: 'jiwoo',
      level: 'intermediate',
      xp: 2850,
      createdAt: now - 14 * DAY_MS,
      lastLoginAt: now - 15 * 60 * 1000,
      isActiveToday: true,
      provider: 'google.com'
    },
    {
      uid: 'demo_user_02',
      displayName: 'Sarah Tanaka',
      nickname: 'sarah_t',
      nationality: 'JP',
      nationalityName: 'Japan',
      gender: 'female',
      interests: ['kpop', 'beauty', 'food', 'travel'],
      email: 'sarah.t@example.com',
      photoURL: '',
      selectedTutorId: 'minho',
      level: 'beginner',
      xp: 1420,
      createdAt: now - 3 * DAY_MS,
      lastLoginAt: now - 2 * 3600 * 1000,
      isActiveToday: true,
      provider: 'google.com'
    },
    {
      uid: 'demo_user_03',
      displayName: 'Liam Wilson',
      nickname: 'liam_w',
      nationality: 'GB',
      nationalityName: 'United Kingdom',
      gender: 'male',
      interests: ['tech', 'sports', 'culture'],
      email: 'liam.w@example.com',
      photoURL: '',
      selectedTutorId: 'seoyeon',
      level: 'advanced',
      xp: 4190,
      createdAt: now - 60 * DAY_MS,
      lastLoginAt: now - 25 * 3600 * 1000,
      isActiveToday: false,
      provider: 'password'
    },
    {
      uid: 'demo_user_04',
      displayName: 'Elena Rostova',
      nickname: 'elena_r',
      nationality: 'RU',
      nationalityName: 'Russia',
      gender: 'female',
      interests: ['kdrama', 'study', 'work'],
      email: 'elena.r@example.com',
      photoURL: '',
      selectedTutorId: 'jiwoo',
      level: 'beginner',
      xp: 980,
      createdAt: now - 5 * DAY_MS,
      lastLoginAt: now - 45 * 60 * 1000,
      isActiveToday: true,
      provider: 'google.com'
    }
  ]);

  const q = (adminSearch || '').trim().toLowerCase();
  const filter = adminFilter || 'all';
  const filtered = rawAdminUsers.filter((u) => {
    const natObj = NATIONALITIES.find((n) => n.code === u.nationality);
    const natText = natObj ? `${natObj.code} ${natObj.ko} ${natObj.en}` : (u.nationalityName || '');
    const interestsText = (u.interests || []).map((id) => {
      const it = INTERESTS.find((item) => item.id === id);
      return it ? `${it.id} ${it.ko} ${it.en}` : id;
    }).join(' ');

    const matchQ = !q ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.nickname && u.nickname.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      natText.toLowerCase().includes(q) ||
      interestsText.toLowerCase().includes(q);

    if (!matchQ) return false;
    if (filter === 'today') return !!u.isActiveToday;
    if (filter === 'new') return u.createdAt >= (now - 7 * DAY_MS);
    return true;
  });

  const users = filtered.map((u) => {
    const isOnline = u.lastLoginAt && (now - u.lastLoginAt < 3600000);
    const isToday = !!u.isActiveToday;
    const statusBadge = isOnline ? { label: '🟢 온라인', bg: 'rgba(35,73,63,0.12)', fg: '#23493F' }
      : isToday ? { label: '🟡 오늘 접속', bg: 'rgba(212,175,55,0.14)', fg: '#B38E22' }
        : { label: '⚪ 이전 접속', bg: 'var(--chip)', fg: 'var(--faint)' };
    const diffMin = Math.floor((now - (u.lastLoginAt || u.createdAt || now)) / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    const relTime = diffMin < 5 ? '방금 전' : diffMin < 60 ? `${diffMin}분 전` : diffHr < 24 ? `${diffHr}시간 전` : `${diffDay}일 전`;
    const cDate = new Date(u.createdAt || now);
    const joinDate = `${cDate.getFullYear()}.${String(cDate.getMonth() + 1).padStart(2, '0')}.${String(cDate.getDate()).padStart(2, '0')}`;

    const natObj = NATIONALITIES.find((n) => n.code === u.nationality);
    const nationalityDisplay = natObj ? `${natObj.ko} (${natObj.en})` : (u.nationalityName || '-');

    const genderObj = GENDERS.find((g) => g.id === u.gender);
    const genderDisplay = genderObj ? genderObj.ko : (u.gender === 'male' ? '남성' : u.gender === 'female' ? '여성' : (u.gender || '-'));

    const userInterests = (u.interests || []).map((id) => {
      const item = INTERESTS.find((it) => it.id === id);
      return item ? { id, ko: item.ko, en: item.en, icon: item.icon } : { id, ko: id, en: id, icon: '✨' };
    });

    return {
      uid: u.uid,
      name: u.displayName || 'Learner',
      nickname: u.nickname || '',
      nationality: nationalityDisplay,
      nationalityCode: u.nationality || '',
      gender: genderDisplay,
      genderRaw: u.gender,
      interests: userInterests,
      interestsText: userInterests.map((it) => `${it.icon} ${it.ko}`).join(', '),
      email: u.email || '비공개',
      photoURL: u.photoURL || '',
      initial: (u.nickname || u.displayName || u.email || 'L')[0].toUpperCase(),
      joinDate,
      lastLoginRel: relTime,
      statusLabel: statusBadge.label,
      statusBg: statusBadge.bg,
      statusFg: statusBadge.fg,
      tutorName: TUTOR_NAMES[u.selectedTutorId] || '김지우',
      level: u.level === 'beginner' ? '초급' : u.level === 'intermediate' ? '중급' : '고급',
      xp: `${(u.xp || 0).toLocaleString()} XP`,
      isGoogle: String(u.provider || '').includes('google')
    };
  });

  const summary = (adminData && adminData.summary) ? adminData.summary : null;
  const totalUsers = summary ? summary.totalUsers : rawAdminUsers.length;
  const todayDau = summary ? summary.todayDau : rawAdminUsers.filter((u) => u.isActiveToday).length;
  return {
    users,
    totalUsers,
    todayDau,
    dauRatio: summary ? summary.dauRatio : (totalUsers > 0 ? ((todayDau / totalUsers) * 100).toFixed(1) : '50.0'),
    aiCalls: summary ? summary.aiUsage.totalCalls : 142,
    aiCost: summary ? Number(summary.aiUsage.totalCostUsd).toFixed(3) : '0.048',
    jiwoo: summary ? (summary.tutorDistribution.jiwoo || 0) : 2,
    minho: summary ? (summary.tutorDistribution.minho || 0) : 0,
    seoyeon: summary ? (summary.tutorDistribution.seoyeon || 0) : 0
  };
}

// 회원 목록 내보내기용 표 (온보딩 프로필 항목 포함: 닉네임, 국적, 성별, 관심사)
export function memberExportRows(users) {
  const header = ['회원 이름', '닉네임', '국적', '성별', '관심사', '계정 이메일', '로그인 방식', '가입일', '최근 로그인', '접속 상태', '담당 튜터', '학습 레벨', 'XP'];
  const rows = users.map((u) => [
    u.name,
    u.nickname || '-',
    u.nationality || '-',
    u.gender || '-',
    u.interestsText || '-',
    u.email,
    u.isGoogle ? 'Google' : '이메일',
    u.joinDate,
    u.lastLoginRel,
    String(u.statusLabel || '').replace(/^[^\p{L}\p{N}]+/u, '').trim(),
    u.tutorName,
    u.level,
    Number(String(u.xp || '').replace(/[^0-9]/g, '')) || 0
  ]);
  return [header, ...rows];
}

const exportBtn = { display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--line3)', background: 'var(--card)', color: 'var(--ink)', padding: '7px 13px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
const SheetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D6F42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></svg>
);
const DriveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0F9D58" d="M8.2 3h7.6l6.2 10.7-3.8 6.6L12 9.6z" /><path fill="#FFC107" d="M8.2 3 2 13.7l3.8 6.6L12 9.6z" /><path fill="#2196F3" d="M5.8 20.3h12.4l3.8-6.6H9.6z" /></svg>
);

const card = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' };
const kpiHead = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const kpiLabel = { fontSize: '12.5px', fontWeight: 600, color: 'var(--faint)' };
const kpiIcon = (bg) => ({ fontSize: '18px', background: bg, width: '34px', height: '34px', borderRadius: '10px', display: 'grid', placeItems: 'center' });
const kpiValue = { fontSize: '30px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em' };
const filterBtn = { border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', padding: '7px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' };
const th = { padding: '12px 16px', whiteSpace: 'nowrap' };
const td = { padding: '14px 16px' };
const panelRow = { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: '10px' };
const mono = "'IBM Plex Mono',monospace";

function TutorBar({ label, count, width, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--accent-ink)' }}>{count}명 배정</span>
      </div>
      <div style={{ height: '8px', background: 'var(--line2)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
}

function AdminPage({ view, adminSearch, onAdminSearch, onAdminFilter, onRefresh, onNavigate }) {
  // 회원 목록 내보내기: 엑셀(.xlsx) 다운로드 / Google Drive(스프레드시트) 저장
  const [driveState, setDriveState] = useState({ busy: false, msg: '', url: '', error: false });
  useEffect(() => { prepareDriveSave(); }, []);
  const exportName = `HangulNow_회원목록_${stamp()}`;
  const downloadExcel = () => {
    downloadBlob(buildXlsx(memberExportRows(view.users), '회원 목록'), `${exportName}.xlsx`, XLSX_MIME);
  };
  const saveToDrive = async () => {
    setDriveState({ busy: true, msg: 'Google Drive에 저장하는 중…', url: '', error: false });
    try {
      const { url } = await saveCsvAsGoogleSheet({ csv: toCsv(memberExportRows(view.users)), name: exportName });
      setDriveState({ busy: false, msg: 'Google Drive에 스프레드시트로 저장했어요.', url, error: false });
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.warn('[Admin Drive Export]', err);
      setDriveState({ busy: false, msg: driveErrorMessage(err), url: '', error: true });
    }
  };

  return (
    <div data-screen-label="09 Admin Console" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: 'clamp(20px,4vw,40px)', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>👑</span>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Hangul Now 관리자 콘솔</h1>
            <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(35,73,63,0.12)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#23493F', display: 'inline-block' }} />
              Firebase Auth &amp; Firestore 연동됨
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--sub)' }}>실시간 전체 회원 현황, 로그인 로그, AI 튜터 사용량 및 가드레일을 통합 모니터링합니다.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button type="button" onClick={onRefresh} title="데이터 새로고침" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--chip)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '9px 15px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
            <span>🔄</span>
            <span>새로고침</span>
          </button>
          <button type="button" onClick={() => onNavigate('home')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', border: 0, color: '#fff', padding: '9px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
            <span>←</span>
            <span>학습 홈으로</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '16px' }}>
        <div style={card}>
          <div style={kpiHead}><span style={kpiLabel}>총 가입 회원</span><span style={kpiIcon('rgba(35,73,63,0.08)')}>👥</span></div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={kpiValue}>{view.totalUsers}</span><span style={{ fontSize: '14px', color: 'var(--sub)', fontWeight: 600 }}>명</span></div>
          <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>● Firebase Auth 인증 계정</div>
        </div>
        <div style={card}>
          <div style={kpiHead}><span style={kpiLabel}>오늘 활성 회원 (DAU)</span><span style={kpiIcon('rgba(212,175,55,0.12)')}>🟢</span></div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={kpiValue}>{view.todayDau}</span><span style={{ fontSize: '14px', color: 'var(--sub)', fontWeight: 600 }}>명</span></div>
          <div style={{ fontSize: '12px', color: '#B38E22', fontWeight: 600 }}>활동률 {view.dauRatio}% 달성</div>
        </div>
        <div style={card}>
          <div style={kpiHead}><span style={kpiLabel}>누적 AI 코칭 턴 수</span><span style={kpiIcon('rgba(66,133,244,0.1)')}>💬</span></div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={kpiValue}>{view.aiCalls}</span><span style={{ fontSize: '14px', color: 'var(--sub)', fontWeight: 600 }}>회</span></div>
          <div style={{ fontSize: '12px', color: '#1A73E8', fontWeight: 600 }}>성공률 100% (오류 0건)</div>
        </div>
        <div style={card}>
          <div style={kpiHead}><span style={kpiLabel}>AI 토큰 계측 비용</span><span style={kpiIcon('rgba(200,94,62,0.1)')}>⚡</span></div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={kpiValue}>${view.aiCost}</span><span style={{ fontSize: '13px', color: 'var(--sub)', fontWeight: 600 }}>USD</span></div>
          <div style={{ fontSize: '12px', color: 'var(--hot)', fontWeight: 600 }}>Gemini 3.8-flash 프로모션 적용</div>
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '420px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--faint)' }}>🔍</span>
              <input type="text" placeholder="이름, 닉네임, 국적, 이메일, 관심사 검색..." value={adminSearch} onChange={(e) => onAdminSearch(e.target.value)} style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: '13.5px', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => onAdminFilter('all')} style={filterBtn}>전체 ({view.totalUsers})</button>
            <button type="button" onClick={() => onAdminFilter('today')} style={filterBtn}>🟢 오늘 접속 ({view.todayDau})</button>
            <button type="button" onClick={() => onAdminFilter('new')} style={filterBtn}>신규 가입</button>
            <span style={{ width: '1px', height: '22px', background: 'var(--line)', margin: '0 2px' }} aria-hidden="true" />
            <button type="button" onClick={downloadExcel} disabled={!view.users.length} title={`현재 목록 ${view.users.length}명을 엑셀(.xlsx)로 내려받기`} style={{ ...exportBtn, opacity: view.users.length ? 1 : 0.5 }}><SheetIcon /> 엑셀 다운로드</button>
            <button type="button" onClick={saveToDrive} disabled={!view.users.length || driveState.busy} title={`현재 목록 ${view.users.length}명을 Google Drive에 스프레드시트로 저장`} style={{ ...exportBtn, opacity: view.users.length && !driveState.busy ? 1 : 0.5 }}><DriveIcon /> {driveState.busy ? '저장 중…' : 'Google Drive 저장'}</button>
          </div>
        </div>
        {!!driveState.msg && (
          <div role="status" style={{ fontSize: '12.5px', color: driveState.error ? 'var(--hot)' : 'var(--accent-ink)', background: driveState.error ? 'var(--hot-soft)' : 'var(--accent-soft)', borderRadius: '10px', padding: '9px 12px', marginTop: '-8px' }}>
            {driveState.msg}{!!driveState.url && <> <a href={driveState.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>스프레드시트 열기 ↗</a></>}
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid var(--line2)', borderRadius: '14px' }}>
          <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--chip)', color: 'var(--faint)', fontWeight: 600, borderBottom: '1px solid var(--line2)' }}>
                <th style={th}>회원 정보</th>
                <th style={th}>닉네임</th>
                <th style={th}>국적 (Nationality)</th>
                <th style={th}>성별 (Gender)</th>
                <th style={th}>관심사 (Interests)</th>
                <th style={th}>계정 이메일</th>
                <th style={th}>가입일시</th>
                <th style={th}>최근 로그인</th>
                <th style={th}>접속 상태</th>
                <th style={th}>담당 튜터</th>
                <th style={th}>학습 레벨</th>
              </tr>
            </thead>
            <tbody>
              {view.users.map((u) => (
                <tr key={u.uid} style={{ borderBottom: '1px solid var(--line2)', transition: 'background .15s' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--chip)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#D7DCE3', color: '#1C1F1E', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '13px', overflow: 'hidden', flex: 'none' }}>
                        {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.initial}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {u.nickname ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(35,73,63,0.08)', color: 'var(--accent-ink)', padding: '3px 8px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700 }}>
                        <span>🏷️</span>
                        <span>{u.nickname}</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--faint)' }}>-</span>
                    )}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--ink)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {u.nationalityCode && u.nationalityCode !== 'OTHER' && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'var(--chip)', color: 'var(--sub)', letterSpacing: '0.04em' }}>
                          {u.nationalityCode}
                        </span>
                      )}
                      <span>{u.nationality}</span>
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {u.gender !== '-' ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: u.genderRaw === 'female' ? 'rgba(233,75,127,0.1)' : u.genderRaw === 'male' ? 'rgba(33,150,243,0.1)' : 'var(--chip)',
                        color: u.genderRaw === 'female' ? '#D81B60' : u.genderRaw === 'male' ? '#1976D2' : 'var(--ink)'
                      }}>
                        {u.genderRaw === 'female' ? '♀ 여성' : u.genderRaw === 'male' ? '♂ 남성' : u.gender}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--faint)' }}>-</span>
                    )}
                  </td>
                  <td style={{ ...td, minWidth: '200px' }}>
                    {u.interests && u.interests.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        {u.interests.slice(0, 3).map((it) => (
                          <span
                            key={it.id}
                            title={`${it.icon} ${it.ko} (${it.en})`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--chip)', color: 'var(--ink)', padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            <span>{it.icon}</span>
                            <span>{it.ko}</span>
                          </span>
                        ))}
                        {u.interests.length > 3 && (
                          <span
                            title={u.interests.slice(3).map((it) => `${it.icon} ${it.ko}`).join(', ')}
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '2px 6px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700, cursor: 'help' }}
                          >
                            +{u.interests.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--faint)' }}>미선택</span>
                    )}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--sub)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {u.isGoogle && <GoogleMark />}
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--faint)', fontFamily: mono, fontSize: '12px' }}>{u.joinDate}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--ink)', fontWeight: 600 }}>{u.lastLoginRel}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <span style={{ background: u.statusBg, color: u.statusFg, padding: '4px 9px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700 }}>{u.statusLabel}</span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--accent-ink)' }}>{u.tutorName}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: 'var(--chip)', color: 'var(--ink)', padding: '2px 7px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600 }}>{u.level}</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--faint)' }}>{u.xp}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.users.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '14px' }}>검색 조건에 일치하는 회원이 없습니다.</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,480px),1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>전담 AI 튜터 선호도</h3>
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}>Firestore 실시간 집계</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <TutorBar label="김지우 (일상 대화)" count={view.jiwoo} width="100%" color="#E9C2A6" />
            <TutorBar label="박민호 (비즈니스 한국어)" count={view.minho} width="20%" color="#B9C7A5" />
            <TutorBar label="이서연 (TOPIK · 정밀 문법)" count={view.seoyeon} width="20%" color="#C9BEDD" />
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>시스템 및 AI 가드레일 상태</h3>
            <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(35,73,63,0.1)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '6px' }}>정상 가동</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={panelRow}><span style={{ color: 'var(--sub)' }}>Firebase 프로젝트 ID</span><span style={{ fontWeight: 600, fontFamily: mono, color: 'var(--ink)' }}>hnageul-copilot-dev-918</span></div>
            <div style={panelRow}><span style={{ color: 'var(--sub)' }}>대화 및 첨삭 주 모델</span><span style={{ fontWeight: 600, fontFamily: mono, color: 'var(--accent-ink)' }}>gemini-3.8-flash</span></div>
            <div style={panelRow}><span style={{ color: 'var(--sub)' }}>실시간 회화 중계 (Live)</span><span style={{ fontWeight: 600, fontFamily: mono, color: 'var(--ink)' }}>WebSocket /api/live</span></div>
            <div style={panelRow}><span style={{ color: 'var(--sub)' }}>보안 및 권한 체계</span><span style={{ fontWeight: 600, color: 'var(--ink)' }}>Firebase ID Token + RBAC</span></div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default AdminPage;
