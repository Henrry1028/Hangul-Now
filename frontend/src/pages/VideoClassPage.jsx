import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/videoclass.css';

// Legacy "10 Video Class Platform" (preview/index.html 3220-3525) and its modals (731-972).
// Styles are the legacy inline strings as the legacy template runtime renders them: its
// expression resolver has no ternary/&&/arrow support, so those declarations, texts and
// handlers resolve to nothing. Those results are reproduced here on purpose (parity).
const cache = new Map();
const sx = (css) => {
  if (!cache.has(css)) {
    const o = {};
    for (const decl of css.split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim();
      const value = decl.slice(i + 1).trim();
      if (!value) continue;
      o[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    cache.set(css, o);
  }
  return cache.get(css);
};

const INPUT = 'border:1.5px solid var(--line);background:var(--bg);color:var(--ink);padding:10px 14px;border-radius:10px;font-size:14px;outline:none';
const LABEL = 'display:flex;flex-direction:column;gap:6px';
const LABEL_TEXT = 'font-size:13px;font-weight:700;color:var(--ink)';
const TAB = 'padding:10px 18px;border-radius:12px;font-size:13.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;border:1px solid;transition:all .15s ease';
const OVERLAY = 'position:fixed;inset:0;z-index:3600;background:rgba(20,22,21,.7);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px';

function deriveBooking(b, effectiveAdmin, vc) {
  const isScheduled = b.status === 'SCHEDULED';
  const isLive = b.status === 'LIVE';
  const isCompleted = b.status === 'COMPLETED';
  const slotDate = new Date(b.slotTime);
  const diffMins = Math.round((slotDate.getTime() - Date.now()) / 60000);
  const canEnterMeet = isLive || (isScheduled && diffMins <= 10 && diffMins >= -60);
  let countdownLabel = '';
  let countdownLabelEn = '';
  if (isCompleted) { countdownLabel = '수업 완료'; countdownLabelEn = 'Lesson completed'; }
  else if (isLive) { countdownLabel = '🔴 실시간 수업 진행 중'; countdownLabelEn = 'Live lesson in progress'; }
  else if (diffMins > 0) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    countdownLabel = hours > 0 ? `수업 시작까지 ${hours}시간 ${mins}분` : `수업 시작까지 ${mins}분`;
    countdownLabelEn = hours > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${mins}m`;
  } else {
    countdownLabel = '수업 진행 시간';
    countdownLabelEn = 'Lesson time';
  }
  const isAdmin = Boolean(effectiveAdmin);
  const isStudent = Boolean(b.viewerAccess && b.viewerAccess.student);
  const isTutor = Boolean(b.viewerAccess && b.viewerAccess.tutor);
  return {
    ...b,
    isScheduled,
    isLive,
    isCompleted,
    canTransition: (isAdmin || isTutor) && (isScheduled || isLive),
    canWriteTutorFeedback: isCompleted && (isAdmin || isTutor),
    canWriteStudentFeedback: isCompleted && isStudent,
    canEnterMeet,
    countdownLabel,
    countdownLabelEn,
    formattedTime: slotDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }),
    formattedTimeEn: slotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }),
    kstTimeLabel: `${slotDate.getUTCHours() + 9}:00 KST`,
    enterMeet: () => window.open(b.googleMeetUrl, '_blank'),
    copyMeet: () => { navigator.clipboard?.writeText(b.googleMeetUrl); window.alert(`회의 링크가 복사되었습니다:\n${b.googleMeetUrl}`); },
    makeLive: () => vc.simulateBookingStatus(b.id, 'LIVE'),
    makeCompleted: () => vc.simulateBookingStatus(b.id, 'COMPLETED'),
    openFeedbackTutor: () => vc.openFeedbackModal(b, 'tutor'),
    openFeedbackStudent: () => vc.openFeedbackModal(b, 'student'),
    openFeedbackView: () => vc.openFeedbackModal(b, 'view')
  };
}

const won = (n) => (typeof n === 'number' ? `₩${n.toLocaleString('ko-KR')}` : '');

// 영어 번역 보기: 켜져 있을 때만 한국어 아래에 영어를 덧붙인다.
const EnContext = createContext(false);
function En({ children }) {
  const on = useContext(EnContext);
  return on && children ? <span className="vc-en">{children}</span> : null;
}

const DAY_EN = { 월: 'Mon', 화: 'Tue', 수: 'Wed', 목: 'Thu', 금: 'Fri', 토: 'Sat', 일: 'Sun' };
export const daysToEnglish = (days) => (days || []).map((d) => DAY_EN[d] || d).join(' · ');

// 한국 표준시(Asia/Seoul) 기준 현재 날짜·시간 — 사용자 기기 타임존과 무관
export function formatKst(date, en = false) {
  const parts = new Intl.DateTimeFormat(en ? 'en-US' : 'ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: en ? 'short' : 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date);
  // ko-KR은 요일을 괄호 없이 내므로 "10일 (토)" 형태로 감싼다
  return parts.map((p) => (!en && p.type === 'weekday' ? `(${p.value})` : p.value)).join('');
}

// 1초마다 갱신되는 실시간 한국 시계 (이 컴포넌트만 다시 그린다)
function KstClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="vc-kst-clock" data-testid="vc-kst-clock">
      <span className="vc-kst-clock-label">🕐 한국 현재 시각 (KST)</span>
      <time dateTime={now.toISOString()}>{formatKst(now)}</time>
      <En>{formatKst(now, true)} · Current time in Korea</En>
    </div>
  );
}
const CapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></svg>
);
const LangIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h9M8.5 3v2M6 5c.5 3 3 6 6 7.5M11 5c-.5 3-3 6.5-7 8" /><path d="m13 21 4-9 4 9M14.5 18h5" /></svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);

// 튜터 소개 영상 주소 → 재생 방식. 서버는 YouTube만 embed 주소로 바꿔 주므로 Vimeo·파일은 여기서 처리한다.
export function tutorVideoSource(t) {
  const url = String((t && (t.embedVideoUrl || t.videoUrl)) || '').trim();
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return { kind: 'youtube', id: yt[1], thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`, embed: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { kind: 'vimeo', id: vm[1], thumb: null, embed: `https://player.vimeo.com/video/${vm[1]}?autoplay=1` };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url) && /^https?:\/\//i.test(url)) return { kind: 'file', src: url };
  return null;
}

// 카드 오른쪽 소개 영상: 썸네일 + ▶ 를 누르면 그 자리에서 재생 (미리 iframe을 띄우지 않는다)
function TutorVideo({ tutor: t }) {
  const [playing, setPlaying] = useState(false);
  const src = tutorVideoSource(t);
  if (!src) return null;
  const poster = src.thumb || t.photoURL;
  return (
    <aside className="vc-tutor-video" aria-label={`${t.name} 소개 영상`}>
      <div className="vc-tutor-video-frame">
        {src.kind === 'file' ? (
          <video src={src.src} poster={t.photoURL} controls preload="metadata" />
        ) : playing ? (
          <iframe title={`${t.name} 소개 영상`} src={src.embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <button type="button" className="vc-tutor-video-poster" onClick={() => setPlaying(true)} aria-label={`${t.name} 소개 영상 재생`}>
            {poster && <img src={poster} alt="" loading="lazy" />}
            <span className="vc-tutor-video-play" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
            </span>
          </button>
        )}
      </div>
      <span className="vc-tutor-video-caption">▶ {t.name} 소개 영상</span>
      <En>Intro video</En>
    </aside>
  );
}

// 튜터 소개 카드: 사진 | 이름·언어·전문분야·소개 | 수업료·평점·예약
function TutorCard({ tutor: t, onBook, tr, trLoading }) {
  const [expanded, setExpanded] = useState(false);
  const en = useContext(EnContext);
  const languages = t.languages || [];
  const langText = languages.slice(0, 2).join(', ') + (languages.length > 2 ? ` +${languages.length - 2}` : '');
  const highlight = (t.specialties || []).slice(0, 3).join(', ');
  const highlightEn = (t.specialties || []).slice(0, 3).map(tr).filter(Boolean).join(', ');
  const days = (t.availableDays || []).join(' · ');
  const introEn = tr(t.shortIntro);
  const bioEn = tr(t.bio);
  const descEn = [introEn, bioEn].filter(Boolean).join(' — ');
  return (
    <article className="vc-tutor-card">
      <div className="vc-tutor-photo">
        <img src={t.photoURL} alt={t.name} />
        <span className="vc-tutor-online" title="온라인" />
      </div>

      <div className="vc-tutor-info">
        <h3 className="vc-tutor-name">{t.name}</h3>
        <div className="vc-tutor-meta"><CapIcon /><span>한국어{en && <em className="vc-en-inline"> · Korean</em>}</span></div>
        {langText && <div className="vc-tutor-meta" title={languages.join(', ')}><LangIcon /><span>구사 언어: {langText}</span></div>}
        {en && langText && <En>Speaks: {langText.replace(/한국어/g, 'Korean')}</En>}
        {highlight && <span className="vc-tutor-pill" title={highlight}>✨ {highlight}</span>}
        {highlight && <En>{highlightEn || (trLoading ? 'Translating…' : '')}</En>}
        <p className={`vc-tutor-desc ${expanded ? '' : 'is-clamped'}`}>
          {t.shortIntro && <b>{t.shortIntro}</b>}{t.shortIntro && t.bio ? ' — ' : ''}{t.bio}
        </p>
        {en && (descEn || trLoading) && (
          <p className={`vc-tutor-desc vc-tutor-desc-en ${expanded ? '' : 'is-clamped'}`}>{descEn || 'Translating…'}</p>
        )}
        <button type="button" className="vc-tutor-more" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>{expanded ? '접기' : '자세히 보기'}{en && <em className="vc-en-inline"> · {expanded ? 'Show less' : 'Read more'}</em>}</button>
        {days && <span className="vc-tutor-days"><CalendarIcon /> {days} 수업 가능</span>}
        {days && <En>Available {daysToEnglish(t.availableDays)}</En>}
      </div>

      <div className="vc-tutor-side">
        <div className="vc-tutor-price">
          <strong>{won(t.pricePerSession?.min50)}</strong>
          <span>50분 수업</span>
          <En>50-min lesson</En>
        </div>
        <div className="vc-tutor-stats">
          <div className="vc-tutor-stat"><strong>{t.rating} ★</strong><span>리뷰 {t.reviewCount}개</span><En>{t.reviewCount} reviews</En></div>
          <div className="vc-tutor-stat"><strong>{t.lessonsCompleted}</strong><span>완료 수업</span><En>Lessons done</En></div>
        </div>
        <button type="button" className="vc-tutor-book" onClick={onBook}>수업 예약<En>Book a lesson</En></button>
        {t.pricePerSession?.min30 != null && <span className="vc-tutor-sub-price">30분 수업 {won(t.pricePerSession.min30)}<En>30-min lesson {won(t.pricePerSession.min30)}</En></span>}
      </div>
    </article>
  );
}

function VideoClassPage({ vc }) {
  const s = vc.state;
  const set = (field) => (e) => vc.update({ [field]: e.target.value });
  const tab = s.vcTab || 'tutors';
  const scheduledCount = (s.vcBookings || []).filter((b) => b.status === 'SCHEDULED' || b.status === 'LIVE').length;
  const bioCount = (s.vcAdminTutorBio || '').trim().length;

  // 영어 번역 보기: 고정 문구는 직접 번역, 튜터 소개·전문 분야(서버 데이터)는 켤 때 /api/translate로 번역한다.
  const [trOn, setTrOn] = useState(false);
  const [trMap, setTrMap] = useState({});
  const [trLoading, setTrLoading] = useState(false);
  const [trError, setTrError] = useState('');
  const trCache = useRef({});
  const tutors = s.vcTutors;
  const trNeeded = useMemo(() => [...new Set((tutors || []).flatMap((t) => [t.shortIntro, t.bio, ...(t.specialties || []).slice(0, 3)]).filter(Boolean))], [tutors]);
  useEffect(() => {
    if (!trOn) return undefined;
    const need = trNeeded.filter((line) => !trCache.current[line]);
    if (!need.length) return undefined;
    const ctrl = new AbortController();
    setTrLoading(true);
    setTrError('');
    fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: need }), signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`);
        need.forEach((line, i) => { if (data.translations?.[i]) trCache.current[line] = data.translations[i]; });
        setTrMap({ ...trCache.current });
        setTrLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setTrLoading(false);
        setTrError(`영어 번역을 불러오지 못했습니다: ${err?.message || err}`);
      });
    return () => { ctrl.abort(); setTrLoading(false); };
  }, [trOn, trNeeded]);
  const tr = (ko) => (ko && trMap[ko]) || '';
  const trLabel = trLoading ? '번역 중…' : trOn ? '영어 번역 숨기기' : '영어 번역 보기';

  return (
    <EnContext.Provider value={trOn}>
    <div data-screen-label="10 Video Class Platform" style={sx('max-width:1200px;width:100%;margin:0 auto;padding:clamp(20px,4vw,40px);display:flex;flex-direction:column;gap:24px')}>

      <div style={sx('background:var(--card);border:1px solid var(--line);border-radius:20px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px;box-shadow:0 4px 20px rgba(0,0,0,0.03)')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px;max-width:760px')}>
          <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
            <span style={sx('font-size:24px')}>📹</span>
            <h1 style={sx('margin:0;font-size:clamp(20px,2.5vw,26px);font-weight:700;color:var(--ink);letter-spacing:-0.02em')}>1:1 화상 한국어 수업 매칭 플랫폼</h1>
            <span style={sx('font-size:11px;font-weight:700;background:rgba(212,175,55,0.18);color:#B8860B;border:1px solid rgba(212,175,55,0.4);padding:3px 9px;border-radius:12px')}>👑 Admin Preview</span>
            <span style={sx('font-size:11px;font-weight:600;background:rgba(35,73,63,0.12);color:var(--accent);border:1px solid var(--accent);padding:3px 9px;border-radius:12px')}>Google Meet 연동 MVP</span>
          </div>
          <En>1:1 Online Korean Lesson Matching Platform</En>
          <p style={sx('margin:0;font-size:13.5px;color:var(--sub);line-height:1.55')}>원어민 튜터의 자기소개 영상과 프로필을 확인하고 시차 고민 없이 원하는 시간을 선택하여 1:1 맞춤 화상 수업을 예약하세요. 수업 10분 전 자동 발급된 Google Meet 회의실에 입장할 수 있습니다.</p>
          <En>Check native tutors&apos; intro videos and profiles, then pick a time without worrying about time zones to book a personalized 1:1 video lesson. You can join the auto-generated Google Meet room 10 minutes before class.</En>
        </div>
        <div className="vc-header-side">
          <KstClock />
          <div className="vc-header-actions">
            <button type="button" className={`vc-tr-toggle ${trOn ? 'is-on' : ''}`} onClick={() => setTrOn((v) => !v)} aria-pressed={trOn}>{trLabel}</button>
            <button type="button" onClick={vc.loadVideoClassData} style={sx('display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:9px 15px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer')}>
              <span>🔄</span>
              <span>데이터 새로고침{trOn && <em className="vc-en-inline"> · Refresh</em>}</span>
            </button>
          </div>
        </div>
      </div>
      {trOn && trError && <div className="vc-tr-error">{trError}</div>}

      <div style={sx('display:flex;gap:8px;border-bottom:1px solid var(--line2);padding-bottom:10px;flex-wrap:wrap')}>
        <button type="button" onClick={() => vc.setTab('tutors')} style={sx(TAB)}>
          <span>🔍</span>
          <span>튜터 탐색 및 예약 (Find Tutors)</span>
        </button>
        <button type="button" onClick={() => vc.setTab('mySessions')} style={sx(TAB)}>
          <span>📅</span>
          <span>내 화상 수업 대시보드 (My Sessions)</span>
          <span style={sx('font-size:11px;padding:1px 6px;border-radius:10px;font-weight:700')}>{scheduledCount}</span>
        </button>
        <button type="button" onClick={() => vc.setTab('admin')} style={sx(TAB)}>
          <span>⚙️</span>
          <span>튜터 프로필 및 슬롯 관리 (Tutor Admin)</span>
        </button>
      </div>

      {tab === 'tutors' && (
        <div style={sx('display:flex;flex-direction:column;gap:20px')}>
          <div style={sx('background:rgba(35,73,63,0.06);border:1px solid var(--line);border-radius:14px;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px')}>
            <div style={sx('display:flex;align-items:center;gap:8px')}>
              <span style={sx('font-size:16px')}>🌏</span>
              <span style={sx('font-size:13px;color:var(--ink);font-weight:600')}>내 로컬 타임존:</span>
              <code style={sx("font-family:'IBM Plex Mono',monospace;font-size:12.5px;background:var(--card);padding:2px 8px;border-radius:6px;border:1px solid var(--line)")}>{s.vcTimezone || 'Asia/Seoul'}</code>
              <span style={sx('font-size:12px;color:var(--sub)')}>· 한국 시간(KST) 슬롯이 현지 시간으로 자동 변환되어 표기됩니다.</span>
            </div>
            <span style={sx('font-size:12px;color:var(--faint)')}>FR-002 타임존 자동 변환 &amp; 이중 예약 방지 잠금 적용됨</span>
            {trOn && (
              <span className="vc-en vc-en-row">My local time zone — Korea time (KST) slots are automatically converted to your local time. · FR-002 time-zone conversion &amp; double-booking lock applied</span>
            )}
          </div>

          <section className="vc-tutor-section">
            <div>
              <h2 className="vc-tutor-section-title">목표와 일정에 맞는 한국어 튜터</h2>
              <En>Korean tutors who fit your goals and schedule</En>
            </div>
            <div className="vc-tutor-list">
              {(s.vcTutors || []).map((t) => (
                <div key={t.id} className="vc-tutor-row">
                  <TutorCard tutor={t} onBook={() => vc.openArrangeModal(t)} tr={tr} trLoading={trLoading} />
                  <TutorVideo tutor={t} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'mySessions' && (
        <div style={sx('display:flex;flex-direction:column;gap:20px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px')}>
            <div>
              <h2 style={sx('margin:0;font-size:17px;font-weight:700;color:var(--ink)')}>📅 예약된 1:1 화상 수업 세션</h2>
              <En>Your booked 1:1 video lessons</En>
            </div>
            <div>
              <span style={sx('font-size:12.5px;color:var(--sub)')}>Google Meet 화상 회의실 자동 생성 및 수업 전후 피드백 노트</span>
              <En>Auto-created Google Meet rooms and pre/post-lesson feedback notes</En>
            </div>
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:16px')}>
            {(s.vcBookings || []).map((raw) => {
              const b = deriveBooking(raw, s.vcEffectiveAdmin, vc);
              return (
                <div key={b.id} style={sx('background:var(--card);border:1.5px solid var(--line);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:0 4px 14px rgba(0,0,0,0.03)')}>
                  <div style={sx('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px')}>
                    <div style={sx('display:flex;align-items:center;gap:12px')}>
                      <img src={b.tutorPhoto} alt={b.tutorName} style={sx('width:46px;height:46px;border-radius:50%;object-fit:cover;border:1.5px solid var(--line)')} />
                      <div style={sx('display:flex;flex-direction:column;gap:2px')}>
                        <span style={sx('font-size:15px;font-weight:700;color:var(--ink)')}>{b.tutorName} 튜터와의 1:1 화상 수업</span>
                        <En>1:1 video lesson with {b.tutorName}</En>
                        <span style={sx('font-size:12.5px;color:var(--sub)')}>학생: {b.studentName} ({b.duration}분 세션)</span>
                        <En>Student: {b.studentName} ({b.duration}-min session)</En>
                      </div>
                    </div>
                    <div style={sx('display:flex;align-items:center;gap:8px')}>
                      {b.isScheduled && <span style={sx('font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:20px;background:rgba(47,128,237,0.12);color:#2F80ED;border:1px solid #2F80ED')}>SCHEDULED (예약 완료)</span>}
                      {b.isLive && <span style={sx('font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:20px;background:rgba(235,87,87,0.15);color:#EB5757;border:1px solid #EB5757;animation:pulse 1.5s infinite')}>🔴 LIVE (수업 진행 중)</span>}
                      {b.isCompleted && <span style={sx('font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:20px;background:rgba(39,174,96,0.12);color:#27AE60;border:1px solid #27AE60')}>COMPLETED (수업 완료)</span>}
                    </div>
                  </div>

                  <div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:14px 18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px')}>
                    <div style={sx('display:flex;flex-direction:column;gap:3px')}>
                      <span style={sx('font-size:11.5px;color:var(--faint);font-weight:600')}>수업 일시 (현지 시간)</span>
                      <span style={sx('font-size:13.5px;font-weight:700;color:var(--ink)')}>{b.formattedTime}</span>
                      <En>Lesson time (local): {b.formattedTimeEn}</En>
                      <span style={sx('font-size:11px;color:var(--sub)')}>한국 시간: {b.kstTimeLabel}</span>
                      <En>Korea time: {b.kstTimeLabel}</En>
                    </div>
                    <div style={sx('display:flex;flex-direction:column;gap:3px')}>
                      <span style={sx('font-size:11.5px;color:var(--faint);font-weight:600')}>Google Meet 회의실 링크 (FR-003)</span>
                      <En>Google Meet room link</En>
                      <div style={sx('display:flex;align-items:center;gap:6px')}>
                        <code style={sx("font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--accent);word-break:break-all")}>{b.googleMeetUrl}</code>
                        <button type="button" onClick={b.copyMeet} title="링크 복사" style={sx('border:0;background:none;cursor:pointer;font-size:13px;padding:2px')}>📋</button>
                      </div>
                    </div>
                    <div style={sx('display:flex;flex-direction:column;gap:3px')}>
                      <span style={sx('font-size:11.5px;color:var(--faint);font-weight:600')}>수업 카운트다운</span>
                      <span style={sx('font-size:13px;font-weight:700;color:var(--hot)')}>{b.countdownLabel}</span>
                      <En>Countdown: {b.countdownLabelEn}</En>
                    </div>
                  </div>

                  <div style={sx('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px')}>
                    {b.canEnterMeet && (
                      <button type="button" onClick={b.enterMeet} style={sx('display:inline-flex;align-items:center;gap:8px;border:0;background:#27AE60;color:#fff;padding:11px 22px;border-radius:12px;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(39,174,96,0.3)')}>
                        <span>📹</span>
                        <span>Google Meet 입장하기 (수업 참여){trOn && <em className="vc-en-inline"> · Join lesson</em>}</span>
                      </button>
                    )}
                    {/* Legacy `!b.canEnterMeet && !b.isCompleted` resolves to `!undefined`: always shown. */}
                    <button type="button" disabled style={sx('display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--bg);color:var(--faint);padding:11px 20px;border-radius:12px;font-size:13px;font-weight:600;cursor:not-allowed')}>
                      <span>🔒</span>
                      <span>Google Meet 입장 (수업 10분 전 오픈){trOn && <em className="vc-en-inline"> · Opens 10 min before class</em>}</span>
                    </button>
                    {b.isCompleted && (
                      <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                        <button type="button" onClick={b.openFeedbackView} style={sx('border:1px solid var(--accent);background:rgba(35,73,63,0.08);color:var(--accent);padding:9px 15px;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer')}>📋 피드백 리포트 열람{trOn && <em className="vc-en-inline"> · View report</em>}</button>
                        {b.canWriteTutorFeedback && <button type="button" onClick={b.openFeedbackTutor} style={sx('border:1px solid var(--line);background:var(--card);color:var(--ink);padding:9px 13px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer')}>✍️ 튜터 리포트 작성{trOn && <em className="vc-en-inline"> · Write lesson report</em>}</button>}
                        {b.canWriteStudentFeedback && <button type="button" onClick={b.openFeedbackStudent} style={sx('border:1px solid var(--line);background:var(--card);color:var(--ink);padding:9px 13px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer')}>⭐ 학생 리뷰 작성{trOn && <em className="vc-en-inline"> · Write review</em>}</button>}
                      </div>
                    )}
                    {b.canTransition && (
                      <div style={sx('display:flex;gap:6px;align-items:center')}>
                        <span style={sx('font-size:11px;color:var(--faint)')}>상태 변경{trOn ? ' (Status)' : ''}:</span>
                        {b.isScheduled && <button type="button" onClick={b.makeLive} style={sx('border:1px solid var(--line);background:var(--card);color:var(--sub);font-size:11px;padding:4px 8px;border-radius:6px;cursor:pointer')}>LIVE</button>}
                        {b.isLive && <button type="button" onClick={b.makeCompleted} style={sx('border:1px solid var(--line);background:var(--card);color:var(--sub);font-size:11px;padding:4px 8px;border-radius:6px;cursor:pointer')}>COMPLETED</button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'admin' && (
        <div style={sx('background:var(--card);border:1.5px solid var(--line);border-radius:20px;padding:26px;display:flex;flex-direction:column;gap:20px')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px')}>
            <h2 style={sx('margin:0;font-size:18px;font-weight:700;color:var(--ink)')}>👨‍🏫 튜터 프로필 및 수업 소개 영상 등록 (FR-001)</h2>
            <En>Register tutor profile &amp; intro video</En>
            <p style={sx('margin:0;font-size:13px;color:var(--sub)')}>튜터 프로필, YouTube/Vimeo 소개 영상(Embed), 전문 분야 및 예약 시간표를 등록합니다.</p>
            <En>Register the tutor profile, YouTube/Vimeo intro video (embed), specialties and booking schedule.</En>
          </div>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px')}>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>튜터 성명 및 영문명</span>
              <En>Tutor name (Korean &amp; English)</En>
              <input value={s.vcAdminTutorName || ''} onChange={set('vcAdminTutorName')} placeholder="예: 정하늘 (Haneul Jung)" style={sx(INPUT)} />
            </label>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>한 줄 소개 (Catchphrase)</span>
              <En>One-line intro</En>
              <input value={s.vcAdminTutorShort || ''} onChange={set('vcAdminTutorShort')} placeholder="예: 첫걸음부터 유창한 발음까지 이끌어 드립니다" style={sx(INPUT)} />
            </label>
          </div>
          <label style={sx(LABEL)}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
              <span style={sx(LABEL_TEXT)}>상세 자기소개 및 티칭 스타일 (최소 50자 필수 검증)<En>Detailed bio &amp; teaching style (min. 50 characters)</En></span>
              <span style={sx('font-size:12px;font-weight:600')}>{bioCount} / 50자 이상 필수</span>
            </div>
            <textarea value={s.vcAdminTutorBio || ''} onChange={set('vcAdminTutorBio')} rows={4} placeholder="안녕하세요! 외국인 학습자를 대상으로 한국어 발음과 실전 회화를 1:1로 지도하는 튜터입니다..." style={sx('border:1.5px solid var(--line);background:var(--bg);color:var(--ink);padding:12px 14px;border-radius:10px;font-size:13.5px;line-height:1.5;outline:none')} />
          </label>
          <label style={sx(LABEL)}>
            <span style={sx(LABEL_TEXT)}>소개 영상 URL (YouTube 또는 Vimeo 링크)</span>
            <En>Intro video URL (YouTube or Vimeo link)</En>
            <input value={s.vcAdminTutorVideo || ''} onChange={set('vcAdminTutorVideo')} placeholder="예: https://www.youtube.com/watch?v=kJQP7kiw5Fk" style={sx(INPUT)} />
            <span style={sx('font-size:11.5px;color:var(--faint)')}>유효한 YouTube / Vimeo / MP4 링크 형식 검증이 수행됩니다.</span>
            <En>Valid YouTube / Vimeo / MP4 link formats are checked.</En>
          </label>
          <label style={sx(LABEL)}>
            <span style={sx(LABEL_TEXT)}>Firebase Auth UID (선택 사항)</span>
            <En>Firebase Auth UID (optional)</En>
            <input value={s.vcAdminTutorUid || ''} onChange={set('vcAdminTutorUid')} placeholder="예: Firebase Auth UID 문자열 (미입력 시 기존 매핑 유지)" style={sx(INPUT)} />
            <span style={sx('font-size:11.5px;color:var(--faint)')}>화상 수업을 배정받을 실제 튜터의 Firebase 사용자 UID입니다. (미입력 시 기존 매핑 유지)</span>
            <En>The Firebase user UID of the real tutor assigned to video lessons. (Leave blank to keep the existing mapping.)</En>
          </label>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px')}>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>전문 분야 (쉼표 구분)</span>
              <En>Specialties (comma-separated)</En>
              <input value={s.vcAdminTutorSpecialties || ''} onChange={set('vcAdminTutorSpecialties')} placeholder="일상 회화, 발음 교정, K-드라마" style={sx(INPUT)} />
            </label>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>지원 가능 언어 (쉼표 구분)</span>
              <En>Languages spoken (comma-separated)</En>
              <input value={s.vcAdminTutorLanguages || ''} onChange={set('vcAdminTutorLanguages')} placeholder="한국어 (Native), English (Fluent)" style={sx(INPUT)} />
            </label>
          </div>
          <div style={sx('display:flex;justify-content:flex-end;border-top:1px solid var(--line2);padding-top:16px')}>
            <button type="button" onClick={vc.submitTutorProfile} style={sx('border:0;background:var(--accent);color:#fff;padding:12px 26px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer')}>튜터 프로필 저장 (POST /api/v1/tutors/profile){trOn && <em className="vc-en-inline vc-en-on-solid"> · Save profile</em>}</button>
          </div>
        </div>
      )}

    </div>
    </EnContext.Provider>
  );
}

export function VideoClassModals({ vc }) {
  const s = vc.state;
  const set = (field) => (e) => vc.update({ [field]: e.target.value });
  const fbInput = 'border:1.5px solid var(--line);background:var(--card);color:var(--ink);padding:8px 12px;border-radius:8px;font-size:13px;outline:none';
  const field = 'border:1.5px solid var(--line);background:var(--card);color:var(--ink);padding:10px 14px;border-radius:10px;font-size:13.5px;outline:none';
  const activeTutorFb = s.vcActiveFeedbackBooking?.feedback?.tutor;
  const activeStudentFb = s.vcActiveFeedbackBooking?.feedback?.student;
  const selectedSlotLabel = s.vcSelectedSlot ? `${s.vcSelectedSlot.clientFormattedTime} (${s.vcSelectedSlot.kstTime} KST)` : '선택 안 됨';

  return (
    <>
      {s.vcVideoModalOpen && (
        <div role="dialog" aria-modal="true" style={sx('position:fixed;inset:0;z-index:3600;background:rgba(20,22,21,.75);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px')}>
          <div style={sx('width:min(100%,700px);background:var(--bg);border:1.5px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line2)')}>
              <div style={sx('display:flex;align-items:center;gap:8px')}>
                <span style={sx('font-size:18px')}>▶</span>
                <span style={sx('font-size:14.5px;font-weight:700;color:var(--ink)')}>{s.vcPlayingVideoTitle || '튜터 소개 영상'} 튜터 자기소개 영상</span>
              </div>
              <button type="button" onClick={vc.closeVideoModal} style={sx('border:0;background:none;color:var(--faint);font-size:20px;cursor:pointer;padding:4px')}>✕</button>
            </div>
            <div style={sx('position:relative;padding-bottom:56.25%;height:0;background:#000')}>
              <iframe title="tutor-intro-video" src={s.vcPlayingVideoUrl || ''} style={sx('position:absolute;top:0;left:0;width:100%;height:100%;border:0')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </div>
        </div>
      )}

      {s.vcArrangeModalOpen && (
        <div role="dialog" aria-modal="true" style={sx(`${OVERLAY};overflow-y:auto`)}>
          <div style={sx('width:min(100%,600px);background:var(--bg);border:1.5px solid var(--line);border-radius:22px;padding:24px;display:flex;flex-direction:column;gap:18px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);max-height:calc(100vh - 40px);overflow-y:auto')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line2);padding-bottom:14px')}>
              <div style={sx('display:flex;align-items:center;gap:10px')}>
                <span style={sx('font-size:20px')}>🗓️</span>
                <div>
                  <h3 style={sx('margin:0;font-size:16px;font-weight:700;color:var(--ink)')}>{s.vcSelectedTutor?.name} 튜터 1:1 수업 예약</h3>
                  <span style={sx('font-size:12px;color:var(--sub)')}>타임존: {s.vcTimezone || 'Asia/Seoul'}</span>
                </div>
              </div>
              <button type="button" onClick={vc.closeArrangeModal} style={sx('border:0;background:none;color:var(--faint);font-size:20px;cursor:pointer')}>✕</button>
            </div>

            <div style={sx('display:flex;flex-direction:column;gap:8px')}>
              <span style={sx(LABEL_TEXT)}>1. 수업 시간 선택</span>
              <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
                <button type="button" onClick={() => vc.update({ vcSelectedDuration: 30 })} style={sx('border:1.5px solid;color:var(--ink);padding:12px;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:3px')}>
                  <span>30분 집중 수업</span>
                  <span style={sx('font-size:12px;color:var(--accent)')}>₩19,000</span>
                </button>
                <button type="button" onClick={() => vc.update({ vcSelectedDuration: 50 })} style={sx('border:1.5px solid;color:var(--ink);padding:12px;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:3px')}>
                  <span>50분 표준 수업 (권장)</span>
                  <span style={sx('font-size:12px;color:var(--accent)')}>₩29,000</span>
                </button>
              </div>
            </div>

            <div style={sx('display:flex;flex-direction:column;gap:8px')}>
              <span style={sx(LABEL_TEXT)}>2. 수업 희망 일자</span>
              <input type="date" value={s.vcSelectedDate || ''} onChange={(e) => { vc.update({ vcSelectedDate: e.target.value }); if (s.vcSelectedTutor) vc.loadTutorSlots(s.vcSelectedTutor.id, e.target.value); }} style={sx('border:1.5px solid var(--line);background:var(--card);color:var(--ink);padding:10px 14px;border-radius:10px;font-size:14px;outline:none')} />
            </div>

            <div style={sx('display:flex;flex-direction:column;gap:8px')}>
              <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
                <span style={sx(LABEL_TEXT)}>3. 시간 슬롯 선택 (현지 시간 기준)</span>
                <span style={sx('font-size:12px;color:var(--sub)')}>선택: {selectedSlotLabel}</span>
              </div>
              <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px')}>
                {(s.vcTutorSlots || []).map((slot) => (
                  <button type="button" key={slot.slotTime} disabled={!!slot.isBooked} onClick={() => { if (!slot.isBooked) vc.update({ vcSelectedSlot: slot }); }} style={sx('border:1.5px solid;padding:9px 6px;border-radius:10px;font-size:12.5px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:2px')}>
                    <span>{slot.clientFormattedTime}</span>
                    <span style={sx('font-size:10px;opacity:0.8')} />
                  </button>
                ))}
              </div>
            </div>

            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>4. 튜터에게 남길 메모 / 연습하고 싶은 주제</span>
              <input value={s.vcBookingNote || ''} onChange={set('vcBookingNote')} placeholder="예: 카페 주문 및 과거형 표현을 집중 연습하고 싶어요" style={sx(field)} />
            </label>

            <div style={sx('display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line2);padding-top:16px')}>
              <button type="button" onClick={vc.closeArrangeModal} style={sx('border:1px solid var(--line);background:var(--card);color:var(--ink);padding:11px 18px;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer')}>취소</button>
              <button type="button" onClick={vc.submitBooking} style={sx('border:0;background:var(--accent);color:#fff;padding:11px 22px;border-radius:10px;font-size:13.5px;font-weight:700;cursor:pointer')}>Google Meet 링크 발급 &amp; 예약 확정</button>
            </div>
          </div>
        </div>
      )}

      {s.vcFeedbackTutorModalOpen && (
        <div role="dialog" aria-modal="true" style={sx(`${OVERLAY};overflow-y:auto`)}>
          <div style={sx('width:min(100%,600px);background:var(--bg);border:1.5px solid var(--line);border-radius:22px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);max-height:calc(100vh - 40px);overflow-y:auto')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line2);padding-bottom:12px')}>
              <h3 style={sx('margin:0;font-size:16px;font-weight:700;color:var(--ink)')}>📝 튜터 전용 학습 리포트 피드백 등록 (FR-004)</h3>
              <button type="button" onClick={() => vc.update({ vcFeedbackTutorModalOpen: false })} style={sx('border:0;background:none;color:var(--faint);font-size:20px;cursor:pointer')}>✕</button>
            </div>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>1. 수업 총평 및 요약</span>
              <textarea value={s.vcTutorFbSummary || ''} onChange={set('vcTutorFbSummary')} rows={3} placeholder="오늘 수업에서 다룬 주요 대화 내용과 학습자 참여도를 적어주세요." style={sx(field)} />
            </label>
            <div style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>2. 오늘 배운 핵심 표현 (3~5개 권장)</span>
              <input value={s.vcTutorFbKeyExp1 || ''} onChange={set('vcTutorFbKeyExp1')} placeholder="핵심 표현 1: 예) 디카페인으로 변경해 주세요" style={sx(fbInput)} />
              <input value={s.vcTutorFbKeyExp2 || ''} onChange={set('vcTutorFbKeyExp2')} placeholder="핵심 표현 2: 예) 여기서 마시고 갈게요" style={sx(fbInput)} />
              <input value={s.vcTutorFbKeyExp3 || ''} onChange={set('vcTutorFbKeyExp3')} placeholder="핵심 표현 3: 예) 영수증은 버려주세요" style={sx(fbInput)} />
            </div>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>3. 발음 및 문법 교정 노트</span>
              <textarea value={s.vcTutorFbCorrections || ''} onChange={set('vcTutorFbCorrections')} rows={2} placeholder="자주 실수한 조사나 발음 억양 교정 피드백을 기록하세요." style={sx(field)} />
            </label>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>4. 학생에게 남기는 따뜻한 격려</span>
              <input value={s.vcTutorFbEncouragement || ''} onChange={set('vcTutorFbEncouragement')} placeholder="오늘 정말 열심히 잘 하셨어요! 다음 수업도 기대됩니다." style={sx('border:1.5px solid var(--line);background:var(--card);color:var(--ink);padding:10px 14px;border-radius:10px;font-size:13px;outline:none')} />
            </label>
            <div style={sx('display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line2);padding-top:14px')}>
              <button type="button" onClick={() => vc.update({ vcFeedbackTutorModalOpen: false })} style={sx('border:1px solid var(--line);background:var(--card);color:var(--ink);padding:10px 16px;border-radius:10px;font-size:13px;cursor:pointer')}>닫기</button>
              <button type="button" onClick={vc.submitTutorFeedback} style={sx('border:0;background:var(--accent);color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer')}>학습 리포트 등록</button>
            </div>
          </div>
        </div>
      )}

      {s.vcFeedbackStudentModalOpen && (
        <div role="dialog" aria-modal="true" style={sx(OVERLAY)}>
          <div style={sx('width:min(100%,520px);background:var(--bg);border:1.5px solid var(--line);border-radius:22px;padding:24px;display:flex;flex-direction:column;gap:18px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line2);padding-bottom:12px')}>
              <h3 style={sx('margin:0;font-size:16px;font-weight:700;color:var(--ink)')}>⭐ 수업 만족도 리뷰 작성 (FR-004)</h3>
              <button type="button" onClick={() => vc.update({ vcFeedbackStudentModalOpen: false })} style={sx('border:0;background:none;color:var(--faint);font-size:20px;cursor:pointer')}>✕</button>
            </div>
            <div style={sx('display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0')}>
              <span style={sx(LABEL_TEXT)}>튜터님의 수업은 어떠셨나요?</span>
              {/* Legacy star handlers are arrow expressions the template runtime cannot resolve: not clickable. */}
              <div style={sx('display:flex;gap:10px;font-size:28px;cursor:pointer')}>
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
              <span style={sx('font-size:12.5px;color:var(--accent);font-weight:700')}>{s.vcStudentFbRating || 5}점 / 5.0점 만점</span>
            </div>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>수업 만족도 코멘트</span>
              <textarea value={s.vcStudentFbComment || ''} onChange={set('vcStudentFbComment')} rows={3} placeholder="수업에서 좋았던 점이나 튜터님께 전하고 싶은 말을 남겨주세요." style={sx(field)} />
            </label>
            <label style={sx('display:flex;align-items:center;gap:8px;cursor:pointer')}>
              <input type="checkbox" checked={!!s.vcStudentFbRecommend} onChange={() => vc.update({ vcStudentFbRecommend: !s.vcStudentFbRecommend })} style={sx('width:16px;height:16px')} />
              <span style={sx('font-size:13px;color:var(--ink);font-weight:600')}>이 튜터님을 다른 친구에게도 적극 추천합니다!</span>
            </label>
            <div style={sx('display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line2);padding-top:14px')}>
              <button type="button" onClick={() => vc.update({ vcFeedbackStudentModalOpen: false })} style={sx('border:1px solid var(--line);background:var(--card);color:var(--ink);padding:10px 16px;border-radius:10px;font-size:13px;cursor:pointer')}>닫기</button>
              <button type="button" onClick={vc.submitStudentFeedback} style={sx('border:0;background:var(--accent);color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer')}>리뷰 제출하기</button>
            </div>
          </div>
        </div>
      )}

      {s.vcFeedbackViewModalOpen && (
        <div role="dialog" aria-modal="true" style={sx(`${OVERLAY};overflow-y:auto`)}>
          <div style={sx('width:min(100%,640px);background:var(--bg);border:1.5px solid var(--line);border-radius:24px;padding:26px;display:flex;flex-direction:column;gap:20px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);max-height:calc(100vh - 40px);overflow-y:auto')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line2);padding-bottom:14px')}>
              <div style={sx('display:flex;align-items:center;gap:10px')}>
                <span style={sx('font-size:22px')}>📋</span>
                <div>
                  <h3 style={sx('margin:0;font-size:17px;font-weight:700;color:var(--ink)')}>{s.vcActiveFeedbackBooking?.tutorName} 튜터 1:1 수업 학습 리포트</h3>
                  <span style={sx('font-size:12px;color:var(--sub)')}>수업 일시: {s.vcActiveFeedbackBooking?.slotTime}</span>
                </div>
              </div>
              <button type="button" onClick={() => vc.update({ vcFeedbackViewModalOpen: false })} style={sx('border:0;background:none;color:var(--faint);font-size:20px;cursor:pointer')}>✕</button>
            </div>

            {activeTutorFb ? (
              <div style={sx('background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px')}>
                <div style={sx('display:flex;align-items:center;gap:6px')}>
                  <span style={sx('font-size:16px')}>👨‍🏫</span>
                  <span style={sx('font-size:14px;font-weight:700;color:var(--ink)')}>튜터 피드백 (Lesson Report)</span>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:4px')}>
                  <span style={sx('font-size:12px;font-weight:700;color:var(--sub)')}>📌 오늘 수업 요약</span>
                  <p style={sx('margin:0;font-size:13px;color:var(--ink);line-height:1.55')}>{activeTutorFb.summary}</p>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:6px')}>
                  <span style={sx('font-size:12px;font-weight:700;color:var(--sub)')}>🎯 오늘 배운 핵심 표현</span>
                  <div style={sx('display:flex;flex-wrap:wrap;gap:6px')}>
                    {(activeTutorFb.keyExpressions || []).map((exp, i) => (
                      <span key={`${exp}-${i}`} style={sx('font-size:12px;padding:4px 10px;border-radius:8px;background:rgba(35,73,63,0.1);color:var(--accent);font-weight:700')}>{exp}</span>
                    ))}
                  </div>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:4px')}>
                  <span style={sx('font-size:12px;font-weight:700;color:var(--sub)')}>✍️ 발음 및 문법 교정 노트</span>
                  <p style={sx('margin:0;font-size:13px;color:var(--ink);line-height:1.55;background:var(--bg);padding:10px 12px;border-radius:8px;border:1px solid var(--line2)')}>{activeTutorFb.corrections}</p>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:4px')}>
                  <span style={sx('font-size:12px;font-weight:700;color:var(--sub)')}>💌 튜터의 격려 메시지</span>
                  <p style={sx('margin:0;font-size:13px;color:var(--accent);font-weight:600;font-style:italic')}>“{activeTutorFb.encouragement}”</p>
                </div>
              </div>
            ) : (
              <div style={sx('padding:16px;background:var(--card);border-radius:12px;text-align:center;font-size:13px;color:var(--sub)')}>아직 튜터 학습 리포트가 등록되지 않았습니다.</div>
            )}

            {activeStudentFb && (
              <div style={sx('background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px')}>
                <div style={sx('display:flex;align-items:center;justify-content:space-between')}>
                  <div style={sx('display:flex;align-items:center;gap:6px')}>
                    <span style={sx('font-size:16px')}>🎓</span>
                    <span style={sx('font-size:14px;font-weight:700;color:var(--ink)')}>학습자 리뷰 (Student Review)</span>
                  </div>
                  <span style={sx('font-size:13.5px;font-weight:700;color:#F2C94C')}>★ {activeStudentFb.rating}.0 / 5.0</span>
                </div>
                <p style={sx('margin:0;font-size:13px;color:var(--ink);line-height:1.55')}>“{activeStudentFb.comment}”</p>
                {activeStudentFb.recommend && <span style={sx('font-size:11.5px;color:var(--accent);font-weight:700')}>👍 이 튜터를 다른 학습자에게 적극 추천함</span>}
              </div>
            )}

            <div style={sx('display:flex;justify-content:flex-end;border-top:1px solid var(--line2);padding-top:14px')}>
              <button type="button" onClick={() => vc.update({ vcFeedbackViewModalOpen: false })} style={sx('border:0;background:var(--solid);color:var(--on-solid);padding:10px 22px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer')}>닫기 (Close)</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VideoClassPage;
