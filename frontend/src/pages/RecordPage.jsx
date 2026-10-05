import React from 'react';
import { COLORS, DAYS, MON, RECORD_TEXT, WEEK } from '../data/recordData.js';
import '../styles/record.css';

// Legacy inline onmouseover/onmouseout style swaps.
const hover = (over, out) => ({
  onMouseOver: (e) => Object.assign(e.currentTarget.style, over),
  onMouseOut: (e) => Object.assign(e.currentTarget.style, out)
});
const iconButtonStyle = { background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s' };
const seekButtonStyle = { background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', position: 'relative', transition: 'all .15s' };
const seekLabelStyle = { position: 'absolute', fontSize: '9.5px', fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", top: '10.5px' };
const segButton = (active) => ({ border: 0, background: active ? 'var(--accent)' : 'transparent', color: active ? '#ffffff' : 'var(--ink2)', borderRadius: '9px', padding: '8px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', transition: 'all .18s', display: 'flex', alignItems: 'center', gap: '6px' });
const calNavStyle = { border: '1px solid var(--line2)', background: 'var(--bg)', borderRadius: '7px', padding: '4px 9px', cursor: 'pointer', fontSize: '12px' };
const chapterStyle = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' };
const chapterItemStyle = { background: 'var(--card)', padding: '10px', borderRadius: '8px', border: '1px solid var(--line2)' };
const wordChipStyle = { background: 'var(--card)', border: '1px solid var(--line)', padding: '4px 10px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 };
const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

function RecordPage({ lang = 'ko', recordState, onRecordStateChange, audioReview, activityState, onNavigate }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = RECORD_TEXT[lang] || RECORD_TEXT.en;
  const s = recordState;
  const update = onRecordStateChange;
  const navigate = (target) => () => onNavigate?.(target);
  const userName = L ? '게스트' : 'Guest';
  const allLogs = activityState.activityLogs || [];
  const userXp = activityState.userXp;
  const userTotalMins = activityState.userTotalMins;
  const userStreak = 12;

  const legend = COLORS.map((c) => ({ n: c[L], c: c[2] }));
  const weekTotalMins = WEEK.reduce((sum, day) => sum + day.reduce((a, b) => a + b, 0), 0);
  const weekBars = WEEK.map((mins, i) => {
    const dayTotal = mins.reduce((a, b) => a + b, 0);
    return {
      d: DAYS[i][L],
      tc: i === 5 ? 'var(--ink)' : 'var(--faint)',
      totalMins: dayTotal > 0 ? `${dayTotal}분` : '-',
      totalMinsFg: dayTotal > 0 ? 'var(--accent-ink)' : 'var(--faint)',
      tooltip: `${DAYS[i][L]}요일 (${dayTotal}분): 대화 ${mins[0]}분, 듣기 ${mins[1]}분, 읽기 ${mins[2]}분, 쓰기 ${mins[3]}분, 말하기 ${mins[4]}분`,
      parts: mins.map((m, j) => ({ h: `${m * 3.4}px`, c: COLORS[j][2] }))
    };
  });

  const liveCvWeeklyMins = 48;
  const liveCvTargetMins = 60;
  const liveCvRate = Math.min(100, Math.round((liveCvWeeklyMins / liveCvTargetMins) * 100));
  const liveCvTotalTime = L ? '3시간 14분' : '3h 14m';

  const curYear = s.calYear || 2026;
  const curMonth = s.calMonth != null ? s.calMonth : 8;
  const monthNamesKo = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const calTitle = L ? `${curYear}년 ${monthNamesKo[curMonth]}` : `${MON[curMonth]} ${curYear}`;
  const startDayOfWeek = new Date(curYear, curMonth, 1).getDay();
  const daysInCurMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(curYear, curMonth, 0).getDate();
  const studyDateSet = new Set(activityState.studyDates || []);
  const todayStr = '2026-09-27';
  const selectedDateStr = s.calSelectedDate || todayStr;
  const pad = (n) => String(n).padStart(2, '0');
  const calDays = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevD = daysInPrevMonth - i;
    const prevM = curMonth === 0 ? 12 : curMonth;
    const prevY = curMonth === 0 ? curYear - 1 : curYear;
    const dateStr = `${prevY}-${pad(prevM)}-${pad(prevD)}`;
    calDays.push({ d: prevD, dateStr, isStudied: studyDateSet.has(dateStr) });
  }
  for (let d = 1; d <= daysInCurMonth; d++) {
    const dateStr = `${curYear}-${pad(curMonth + 1)}-${pad(d)}`;
    calDays.push({ d, dateStr, isStudied: studyDateSet.has(dateStr) });
  }
  const remainingSlots = (calDays.length > 35 ? 42 : 35) - calDays.length;
  for (let d = 1; d <= remainingSlots; d++) {
    const nextM = curMonth === 11 ? 1 : curMonth + 2;
    const nextY = curMonth === 11 ? curYear + 1 : curYear;
    const dateStr = `${nextY}-${pad(nextM)}-${pad(d)}`;
    calDays.push({ d, dateStr, isStudied: studyDateSet.has(dateStr) });
  }
  const curMonthStudiedCount = Array.from(studyDateSet).filter((ds) => ds.startsWith(`${curYear}-${pad(curMonth + 1)}`)).length;
  const curMonthRate = Math.min(100, Math.round((curMonthStudiedCount / daysInCurMonth) * 100));
  const selDateParts = selectedDateStr.split('-');
  const selDateObj = new Date(Number(selDateParts[0]), Number(selDateParts[1]) - 1, Number(selDateParts[2]));
  // Legacy quirk: getDay() (Sunday = 0) indexes the Monday-first DAYS table.
  const selDayName = DAYS[selDateObj.getDay()][L];
  const selDateLabel = L ? `${Number(selDateParts[1])}월 ${Number(selDateParts[2])}일 (${selDayName})` : `${MON[Number(selDateParts[1]) - 1]} ${Number(selDateParts[2])} (${selDayName})`;
  const calPrevMonth = () => update((st) => { let y = st.calYear; let m = st.calMonth - 1; if (m < 0) { y--; m = 11; } return { calYear: y, calMonth: m }; });
  const calNextMonth = () => update((st) => { let y = st.calYear; let m = st.calMonth + 1; if (m > 11) { y++; m = 0; } return { calYear: y, calMonth: m }; });
  const calGoToday = () => {
    const d = new Date();
    update({ calYear: d.getFullYear(), calMonth: d.getMonth(), calSelectedDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` });
  };

  const totalLearners = '12,840';
  const isStreakRank = s.rankTab === 'streak';
  const streakLeaderboard = [
    { rank: 1, medal: '🥇', name: '김민지', level: 'Lv.12', score: '38일 연속', sub: '총 89시간 학습', badgeBg: '#FEF3C7', badgeFg: '#92400E' },
    { rank: 2, medal: '🥈', name: 'Alex Mueller', level: 'Lv.11', score: '35일 연속', sub: '총 82시간 학습', badgeBg: '#F3F4F6', badgeFg: '#374151' },
    { rank: 3, medal: '🥉', name: '박준호', level: 'Lv.10', score: '31일 연속', sub: '총 78시간 학습', badgeBg: '#FFEDD5', badgeFg: '#9A3412' },
    { rank: 4, medal: '4', name: 'Kenji Sato', level: 'Lv.9', score: '29일 연속', sub: '총 71시간 학습', badgeBg: 'var(--chip)', badgeFg: 'var(--ink2)' },
    { rank: 5, medal: '5', name: 'Sarah Jenkins', level: 'Lv.9', score: '27일 연속', sub: '총 65시간 학습', badgeBg: 'var(--chip)', badgeFg: 'var(--ink2)' },
    { rank: 142, medal: '👑', name: `${userName} (나)`, level: 'Lv.6', score: '12일 연속', sub: '총 42시간 18분 · 상위 1.1%', badgeBg: 'var(--accent)', badgeFg: '#fff' }
  ];
  const timeLeaderboard = [
    { rank: 1, medal: '🥇', name: 'Alex Mueller', level: 'Lv.12', score: '112시간', sub: '35일 연속 학습', badgeBg: '#FEF3C7', badgeFg: '#92400E' },
    { rank: 2, medal: '🥈', name: '김민지', level: 'Lv.12', score: '108시간', sub: '38일 연속 학습', badgeBg: '#F3F4F6', badgeFg: '#374151' },
    { rank: 3, medal: '🥉', name: '최수현', level: 'Lv.10', score: '94시간', sub: '25일 연속 학습', badgeBg: '#FFEDD5', badgeFg: '#9A3412' },
    { rank: 4, medal: '4', name: 'Michael Chen', level: 'Lv.9', score: '88시간', sub: '24일 연속 학습', badgeBg: 'var(--chip)', badgeFg: 'var(--ink2)' },
    { rank: 5, medal: '5', name: '김서윤', level: 'Lv.9', score: '82시간', sub: '26일 연속 학습', badgeBg: 'var(--chip)', badgeFg: 'var(--ink2)' },
    { rank: 318, medal: '👑', name: `${userName} (나)`, level: 'Lv.6', score: '42시간 18분', sub: '12일 연속 · 상위 2.4%', badgeBg: 'var(--accent)', badgeFg: '#fff' }
  ];
  const currentLeaderboard = isStreakRank ? streakLeaderboard : timeLeaderboard;
  const myRankNumber = isStreakRank ? '142위' : '318위';
  const myRankPercent = isStreakRank ? '상위 1.1%' : '상위 2.4%';
  const myRankDelta = isStreakRank ? '▲ 8계단 상승' : '▲ 12계단 상승';
  const myRankComment = isStreakRank
    ? (L ? '🔥 2일만 더 연속 학습하면 상위 0.8% "집현전 정예" 리그로 승급해요!' : '🔥 Study 2 more days in a row to reach the top 0.8% Elite tier!')
    : (L ? '⏱️ 이번 주 3시간만 더 학습하면 상위 1.9% 리그에 진입해요!' : '⏱️ Add 3 more study hours this week to enter the top 1.9% tier!');

  const currentXp = userXp || 2840;
  const currentLevelNum = Math.floor(currentXp / 500) + 1;
  const levelProgPercent = `${Math.min(100, Math.round(((currentXp - (currentLevelNum - 1) * 500) / 500) * 100))}%`;
  const levelTitles = L
    ? ['훈민 입문자', '자모 개척자', '초급 훈민인', '중급 문장가', '상급 토론자', '집현전 정자', '훈민정음 훈도사', '대제학 마스터']
    : ['Hangul Novice', 'Jamo Explorer', 'Junior Scholar', 'Sentence Crafter', 'Fluent Speaker', 'Jiphyeonjeon Scholar', 'Hunmin Master', 'Grand Sage'];
  const currentLevelTitle = `Lv.${currentLevelNum} ${levelTitles[Math.min(levelTitles.length - 1, currentLevelNum - 1)]}`;
  const nextLevelTitle = `Lv.${currentLevelNum + 1} ${levelTitles[Math.min(levelTitles.length - 1, currentLevelNum)] || '훈민 마스터'}`;
  const dailyQuests = [
    { id: 'q1', icon: '💬', title: L ? '튜터와 대화 3회 나누기' : 'Send 3 messages to your tutor', prog: '3 / 3', xp: '+50 XP' },
    { id: 'q2', icon: '🎙️', title: L ? 'AI 발음 코칭 80점 이상 기록' : 'Score 80+ in Speaking Coach', prog: '1 / 1', xp: '+40 XP' },
    { id: 'q3', icon: '🗣️', title: L ? '실시간 회화 또는 자모 조립 완주' : 'Complete 1 Live Chat or Jamo drill', prog: '1 / 1', xp: '+60 XP' }
  ];
  const badges = [
    { id: 'b1', icon: '👑', name: L ? '첫 걸음의 설렘' : 'First Exchange', desc: L ? '튜터에게 첫 메시지 전송' : 'First message sent' },
    { id: 'b2', icon: '🔥', name: L ? '불꽃의 7일' : '7-Day Flame', desc: L ? '7일 연속 학습 달성' : '7-day study streak' },
    { id: 'b3', icon: '🎯', name: L ? '황금 보이스' : 'Golden Voice', desc: L ? '발음 점수 85점 이상 기록' : 'Pronunciation 85+ score' },
    { id: 'b4', icon: '✍️', name: L ? '훈민 타자왕' : 'Hangul Typist', desc: L ? '자모 글자 조립 15개 완성' : '15 syllables assembled' },
    { id: 'b5', icon: '🗣️', name: L ? '거침없는 회화' : 'Free Talker', desc: L ? 'Gemini Live 회화 5분 완주' : '5-min live session complete' },
    { id: 'b6', icon: '📚', name: L ? '문법 해결사' : 'Grammar Solver', desc: L ? '오답 교정 노트 10개 복습' : '10 corrections reviewed' }
  ];

  const totalMins = userTotalMins || 2538;
  const stats = L ? [
    { label: '누적 학습 시간', value: `${Math.floor(totalMins / 60)}시간 ${totalMins % 60}분`, sub: '전체 상위 2.4% (318위)' },
    { label: '연속 학습일', value: `${userStreak}일 연속`, sub: '전체 상위 1.1% (142위)' },
    { label: '획득 경험치', value: `${(userXp || 2840).toLocaleString()} XP`, sub: currentLevelTitle },
    { label: '실시간 학습 기록', value: `${allLogs.length}건`, sub: '오늘 5개 활동 완료' },
    { label: '내 현재 순위', value: myRankNumber, sub: `전체 ${myRankPercent} (${myRankDelta})` }
  ] : [
    { label: 'Total Study Time', value: `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`, sub: 'Top 2.4% (#318)' },
    { label: 'Current Streak', value: `${userStreak} days`, sub: 'Top 1.1% (#142)' },
    { label: 'Earned XP', value: `${(userXp || 2840).toLocaleString()} XP`, sub: currentLevelTitle },
    { label: 'Live Activities', value: `${allLogs.length} items`, sub: '5 drills done today' },
    { label: 'My Current Rank', value: myRankNumber, sub: `${myRankPercent} (${myRankDelta})` }
  ];

  const view = s.recordViewTab || 'activity';
  const progress = `${((s.audioReviewCurrentTime / s.audioReviewDuration) * 100).toFixed(1)}%`;

  return (
    <div className="record-screen" data-screen-label="09 My progress">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.1em' }}>LEARNING ANALYTICS &amp; RANKING</span>
          <h1 style={{ margin: 0, font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>{t.recH1}</h1>
        </div>
        <div className="record-view-tabs" style={{ display: 'flex', background: 'var(--seg)', borderRadius: '12px', padding: '4px', gap: '2px' }}>
          <button type="button" onClick={() => update({ recordViewTab: 'activity' })} style={segButton(view === 'activity')}><span>⚡</span><span>{L ? '실시간 학습 기록' : 'Activity Feed'}</span></button>
          <button type="button" onClick={() => update({ recordViewTab: 'analytics' })} style={segButton(s.recordViewTab === 'analytics')}><span>📊</span><span>{L ? '학습 분석 & 캘린더' : 'Analytics & Calendar'}</span></button>
          <button type="button" onClick={() => update({ recordViewTab: 'ranking' })} style={segButton(s.recordViewTab === 'ranking')}><span>🏆</span><span>{L ? '랭킹 & 업적' : 'Leaderboard & Badges'}</span></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--line)' }}>
        {stats.map((st) => (
          <div key={st.label} style={{ padding: '20px 16px 20px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--faint)' }}>{st.label}</span>
            <span className="record-stat-value" style={{ font: "500 32px 'Newsreader','Gowun Batang',serif" }}>{st.value}</span>
            <span style={{ fontSize: '12.5px', color: 'var(--sub)' }}>{st.sub}</span>
          </div>
        ))}
      </div>

      {s.recordViewTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 6px 18px rgba(0,0,0,0.03)', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <h2 style={{ margin: 0, font: "600 18px 'Newsreader','Gowun Batang',serif", color: 'var(--ink)' }}>{calTitle}</h2>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" onClick={calPrevMonth} style={calNavStyle}>◀</button>
                  <button type="button" onClick={calNextMonth} style={calNavStyle}>▶</button>
                  <button type="button" onClick={calGoToday} style={{ ...calNavStyle, fontSize: '11.5px', fontWeight: 600 }}>오늘</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--sub)' }}>
                <span>출석: <strong style={{ color: 'var(--accent-ink)' }}>{curMonthStudiedCount}일</strong> / {daysInCurMonth}일</span>
                <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', fontSize: '12px' }}>출석률 {curMonthRate}%</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--faint)', paddingBottom: '4px', borderBottom: '1px solid var(--line2)', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <span style={{ color: '#EF4444' }}>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style={{ color: '#3B82F6' }}>토</span>
            </div>
            <div className="study-cal-grid">
              {calDays.map((cd) => (
                <div
                  key={cd.dateStr}
                  onClick={() => update({ calSelectedDate: cd.dateStr })}
                  /* Legacy quirk: its template engine renders ternary interpolations as empty, so the
                     is-other-month/is-studied/is-today/is-selected modifiers never reach the DOM. */
                  className="study-cal-cell"
                >
                  <span>{cd.d}</span>
                  {cd.isStudied && <span className="cal-flame-dot">🔥</span>}
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📌</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{selDateLabel} 학습 요약</span>
                  {/* Legacy quirk: the ternary briefing text renders empty. */}
                  <span style={{ fontSize: '12px', color: 'var(--sub)' }} />
                </div>
              </div>
              <button type="button" onClick={navigate('chat')} style={{ border: 0, background: 'var(--accent)', color: '#fff', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>이날 복습하기 →</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>{t.weekH}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '3px 9px', borderRadius: '999px' }}>⏱️ 총 {weekTotalMins}분</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--sub)', flexWrap: 'wrap' }}>
                  {legend.map((l) => (
                    <span key={l.n} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.c }} />{l.n}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', height: '185px', paddingTop: '14px' }}>
                {weekBars.map((d) => (
                  <div key={d.d} title={d.tooltip} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end', cursor: 'default' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: d.totalMinsFg, lineHeight: 1 }}>{d.totalMins}</span>
                    <div style={{ width: '100%', maxWidth: '30px', display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px', overflow: 'hidden' }}>
                      {d.parts.map((p, j) => <span key={j} style={{ height: p.h, background: p.c }} />)}
                    </div>
                    <span style={{ fontSize: '12px', color: d.tc }}>{d.d}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--faint)', borderTop: '1px solid var(--line2)', paddingTop: '10px' }}>
                <span>💡 각 요일 막대 위에 <b>학습 시간(분)</b>이 표시됩니다</span>
                <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>일평균 21.6분</span>
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎙️</span>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>실시간 회화 시간 (Live Conversation)</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', color: '#92400E', padding: '3px 9px', borderRadius: '999px' }}>이번 주 {liveCvWeeklyMins}분</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: '14px', padding: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--faint)' }}>누적 회화</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-ink)' }}>{liveCvTotalTime}</span>
                  <span style={{ fontSize: '10px', color: 'var(--sub)' }}>전체 연습 시간</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center', borderLeft: '1px solid var(--line2)', borderRight: '1px solid var(--line2)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--faint)' }}>음성 발화</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>42회</span>
                  <span style={{ fontSize: '10px', color: 'var(--sub)' }}>대화 턴 수</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--faint)' }}>발화 일치도</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E' }}>88점</span>
                  <span style={{ fontSize: '10px', color: 'var(--sub)' }}>원어민 억양 점수</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>주간 회화 목표 달성도</span>
                  <span style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>{liveCvWeeklyMins}분 / {liveCvTargetMins}분 ({liveCvRate}%)</span>
                </div>
                <div style={{ height: '9px', background: 'var(--line2)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${liveCvRate}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), #10B981)', borderRadius: '999px', transition: 'width .4s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line2)', paddingTop: '12px', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>💬</span>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>김지우 튜터와 일상 대화</span>
                    <span style={{ fontSize: '11px', color: 'var(--faint)' }}>최근 세션 18분 완료 · 즉시 교정 3회</span>
                  </div>
                </div>
                <button type="button" onClick={navigate('speaking')} style={{ border: 0, background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flex: 'none' }}>회화 시작 →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ margin: 0, font: "700 26px/1.2 'Newsreader','Gowun Batang',serif", letterSpacing: '-0.02em', color: 'var(--ink)' }}>Your Weekly Review</h2>
            </div>
            <div style={{ background: '#13161F', border: '1px solid #242A38', borderRadius: '24px', padding: '26px 30px', color: '#FFFFFF', boxShadow: '0 18px 40px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}>{s.audioReviewTitle || '26-09-27 Hangul Weekly Review'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button type="button" onClick={audioReview.download} title="오디오 대본 및 분석 리포트 다운로드" style={iconButtonStyle} {...hover({ color: '#FFFFFF' }, { color: '#94A3B8' })}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </button>
                  <button type="button" onClick={() => audioReview.rate('like')} title="좋아요" style={iconButtonStyle} {...hover({ color: '#3B82F6' }, { color: '#94A3B8' })}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.5L12 3a2 2 0 0 1 3 2.88z" /></svg>
                  </button>
                  <button type="button" onClick={() => audioReview.rate('dislike')} title="아쉬워요" style={iconButtonStyle} {...hover({ color: '#EF4444' }, { color: '#94A3B8' })}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.5L12 21a2 2 0 0 1-3-2.88z" /></svg>
                  </button>
                  <button type="button" onClick={audioReview.toggleScript} title="AI 종합 분석 리포트 전문 보기" style={iconButtonStyle} {...hover({ color: '#FFFFFF' }, { color: '#94A3B8' })}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                  </button>
                  <button type="button" onClick={audioReview.generate} title="주간 데이터 재분석 및 새 오디오 리뷰 생성" style={{ ...iconButtonStyle, transition: 'all .15s' }} {...hover({ color: '#3B82F6' }, { color: '#94A3B8' })}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div onClick={audioReview.setProgress} style={{ height: '6px', background: '#2B3345', borderRadius: '999px', position: 'relative', cursor: 'pointer', width: '100%' }}>
                  <div style={{ width: progress, height: '100%', background: '#3B82F6', borderRadius: '999px', position: 'relative', transition: 'width .1s linear' }}>
                    <span style={{ position: 'absolute', right: '-6px', top: '-4px', width: '14px', height: '14px', borderRadius: '50%', background: '#3B82F6', border: '3px solid #FFFFFF', boxShadow: '0 0 8px rgba(59,130,246,0.6)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, color: '#94A3B8', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
                  <span>{mmss(s.audioReviewCurrentTime)} / {mmss(s.audioReviewDuration)}</span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>주간 맞춤형 AI 보이스 총평</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
                <button type="button" onClick={audioReview.cycleSpeed} title="재생 속도 조절" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '4px 6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{Number(s.audioReviewSpeed || 1.0).toFixed(1)}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>Speed</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <button type="button" onClick={() => audioReview.seek(-10)} title="10초 뒤로" style={seekButtonStyle} {...hover({ color: '#FFFFFF', background: 'rgba(255,255,255,0.06)' }, { color: '#94A3B8', background: 'none' })}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    <span style={seekLabelStyle}>10</span>
                  </button>
                  <button type="button" onClick={audioReview.togglePlay} style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF', boxShadow: '0 6px 20px rgba(37,99,235,0.45)', transition: 'transform .12s, box-shadow .12s' }} {...hover({ transform: 'scale(1.05)' }, { transform: 'none' })}>
                    {s.audioReviewPlaying
                      ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>
                      : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                  </button>
                  <button type="button" onClick={() => audioReview.seek(10)} title="10초 앞으로" style={seekButtonStyle} {...hover({ color: '#FFFFFF', background: 'rgba(255,255,255,0.06)' }, { color: '#94A3B8', background: 'none' })}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                    <span style={seekLabelStyle}>10</span>
                  </button>
                </div>
                <button type="button" onClick={audioReview.toggleScript} title="리포트 스크립트 열기" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '50%', transition: 'color .15s' }} {...hover({ color: '#FFFFFF' }, { color: '#94A3B8' })}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </button>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '4px' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#94A3B8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                  <span style={{ fontWeight: 600 }}>Saved for 7 days</span>
                </div>
                <button type="button" onClick={audioReview.toggleScript} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} {...hover({ color: '#FFFFFF' }, { color: '#94A3B8' })}>
                  <span>3 chapters · AI 종합 코칭 리포트 보기</span>
                  <span style={{ fontSize: '10px' }}>▼</span>
                </button>
              </div>
            </div>

            {s.audioReviewShowScript && (
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--accent)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 8px 24px rgba(35,73,63,0.08)', animation: 'fadeIn .2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line2)', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📋</span>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>AI 전담 코치 주간 종합 평가 리포트</span>
                      <span style={{ fontSize: '12px', color: 'var(--faint)' }}>한 주 동안 학습자가 작성하고 첨삭·지적받은 내용을 분석한 평가서</span>
                    </div>
                  </div>
                  <button type="button" onClick={audioReview.download} style={{ border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
                    텍스트 다운로드 📥
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '16px' }}>
                  <div style={chapterStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>✍️</span>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>문장 쓰기 첨삭 분석 (Writing)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                      <div style={chapterItemStyle}>
                        <div style={{ color: 'var(--hot)', fontWeight: 600 }}>❌ "홍대에 친구를 만났어요"</div>
                        <div style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>➔ ⭕ "홍대에서 친구를 만났어요"</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--sub)', marginTop: '4px' }}>활동·동작이 일어나는 장소 격조사 '-에서' 교정</div>
                      </div>
                      <div style={chapterItemStyle}>
                        <div style={{ color: 'var(--hot)', fontWeight: 600 }}>❌ "정말 맛있었어서"</div>
                        <div style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>➔ ⭕ "정말 맛있어서"</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--sub)', marginTop: '4px' }}>이유 연결어미 '-아서/어서' 앞 과거 시제 불필요</div>
                      </div>
                    </div>
                  </div>
                  <div style={chapterStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🎙️</span>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>실시간 회화 &amp; 발음 평가 (Speaking)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                      <div style={chapterItemStyle}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-ink)' }}>김지우 튜터와 일상 대화 (18분)</div>
                        <div style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '4px' }}>자연스러운 질문 답변 흐름 유지, 망설임 시간 전주 대비 25% 단축</div>
                      </div>
                      <div style={chapterItemStyle}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>발음 및 억양 점수: <b style={{ color: 'var(--accent-ink)' }}>88점</b> (우수)</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--sub)', marginTop: '4px' }}>모음 'ㅓ'와 'ㅗ' 구별 정확도 대폭 향상, 받침 'ㄺ' 연음 주의 권장</div>
                      </div>
                    </div>
                  </div>
                  <div style={chapterStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>📚</span>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>복습 필요 어휘 (Word Bank)</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                      <span style={wordChipStyle}>🌸 벚꽃</span>
                      <span style={wordChipStyle}>👀 구경</span>
                      <span style={wordChipStyle}>🍗 치맥</span>
                      <span style={wordChipStyle}>✨ 분위기</span>
                      <span style={wordChipStyle}>📦 포장하다</span>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg,rgba(35,73,63,0.08),rgba(200,80,42,0.08))', borderRadius: '8px', padding: '10px', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.4 }}>
                      💡 <b>코치 조언:</b> 다음 주에는 '분위기'와 '포장하다'를 활용한 실전 회화 드릴을 하루 10분 진행해 보세요.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {s.recordViewTab === 'ranking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'linear-gradient(135deg, rgba(35,73,63,0.07) 0%, rgba(201,162,74,0.1) 100%)', border: '1px solid var(--line2)', borderRadius: '16px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>🎖️</span>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--accent-ink)' }}>{currentLevelTitle}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '4px 10px', borderRadius: '999px' }}>{currentXp.toLocaleString()} XP</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--sub)' }}>
                    <span>다음 승급: {nextLevelTitle}</span>
                    <span>{levelProgPercent} 달성</span>
                  </div>
                  <div style={{ height: '10px', background: 'var(--line2)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: levelProgPercent, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--gold))', borderRadius: '999px', transition: 'width .4s ease' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>오늘의 일일 퀘스트 (Daily Quests)</span>
                  <span style={{ fontSize: '12px', color: 'var(--accent-ink)', fontWeight: 600 }}>올클리어 보너스 +100 XP ✓</span>
                </div>
                {dailyQuests.map((q) => (
                  <div className="quest-item" key={q.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{q.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{q.title}</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--faint)' }}>진행도: {q.prog}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '3px 8px', borderRadius: '6px' }}>{q.xp}</span>
                      <span style={{ color: '#22C55E', fontSize: '16px', fontWeight: 700 }}>✓</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>명예의 훈민 배지 (Badges)</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {badges.map((b) => (
                    <div className="badge-card" key={b.id}>
                      <span style={{ fontSize: '24px' }}>{b.icon}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>{b.name}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--faint)', lineHeight: 1.3 }}>{b.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 6px 18px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>전체 학습자 순위 (Leaderboard)</span>
                  <span style={{ fontSize: '12px', color: 'var(--faint)' }}>총 {totalLearners}명 참가 중</span>
                </div>
                {/* Legacy quirk: the toggle styles are static and do not follow the selected tab. */}
                <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                  <button type="button" onClick={() => update({ rankTab: 'streak' })} style={{ border: 0, background: 'var(--card)', color: 'var(--ink)', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', fontSize: '12.5px', cursor: 'pointer' }}>🔥 연속 학습일</button>
                  <button type="button" onClick={() => update({ rankTab: 'time' })} style={{ border: 0, background: 'transparent', color: 'var(--faint)', fontWeight: 500, padding: '6px 12px', borderRadius: '8px', fontSize: '12.5px', cursor: 'pointer' }}>⏱️ 총 학습 시간</button>
                </div>
              </div>
              <div className="rank-row is-me" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flex: 'none' }}>👑</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700 }}>내 현재 순위: {myRankNumber}</span>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, background: 'var(--accent-ink)', color: '#fff', padding: '2px 8px', borderRadius: '999px' }}>{myRankPercent}</span>
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--accent-ink)', fontWeight: 600 }}>{myRankDelta}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--sub)', lineHeight: 1.4, display: 'block', maxWidth: '180px' }}>{myRankComment}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentLeaderboard.map((rk) => (
                  <div className="rank-row" key={rk.rank}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '18px', width: '28px', textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{rk.medal}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{rk.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{rk.level}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--sub)' }}>{rk.sub}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: rk.badgeFg, background: rk.badgeBg, padding: '4px 10px', borderRadius: '8px' }}>{rk.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordPage;
