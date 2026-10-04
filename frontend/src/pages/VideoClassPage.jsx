import React from 'react';

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
  if (isCompleted) countdownLabel = '수업 완료';
  else if (isLive) countdownLabel = '🔴 실시간 수업 진행 중';
  else if (diffMins > 0) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    countdownLabel = hours > 0 ? `수업 시작까지 ${hours}시간 ${mins}분` : `수업 시작까지 ${mins}분`;
  } else {
    countdownLabel = '수업 진행 시간';
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
    formattedTime: slotDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }),
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

function VideoClassPage({ vc }) {
  const s = vc.state;
  const set = (field) => (e) => vc.update({ [field]: e.target.value });
  const tab = s.vcTab || 'tutors';
  const scheduledCount = (s.vcBookings || []).filter((b) => b.status === 'SCHEDULED' || b.status === 'LIVE').length;
  const bioCount = (s.vcAdminTutorBio || '').trim().length;

  return (
    <div data-screen-label="10 Video Class Platform" style={sx('max-width:1200px;width:100%;margin:0 auto;padding:clamp(20px,4vw,40px);display:flex;flex-direction:column;gap:24px')}>

      <div style={sx('background:var(--card);border:1px solid var(--line);border-radius:20px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px;box-shadow:0 4px 20px rgba(0,0,0,0.03)')}>
        <div style={sx('display:flex;flex-direction:column;gap:6px;max-width:760px')}>
          <div style={sx('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
            <span style={sx('font-size:24px')}>📹</span>
            <h1 style={sx('margin:0;font-size:clamp(20px,2.5vw,26px);font-weight:700;color:var(--ink);letter-spacing:-0.02em')}>1:1 화상 한국어 수업 매칭 플랫폼</h1>
            <span style={sx('font-size:11px;font-weight:700;background:rgba(212,175,55,0.18);color:#B8860B;border:1px solid rgba(212,175,55,0.4);padding:3px 9px;border-radius:12px')}>👑 Admin Preview</span>
            <span style={sx('font-size:11px;font-weight:600;background:rgba(35,73,63,0.12);color:var(--accent);border:1px solid var(--accent);padding:3px 9px;border-radius:12px')}>Google Meet 연동 MVP</span>
          </div>
          <p style={sx('margin:0;font-size:13.5px;color:var(--sub);line-height:1.55')}>원어민 튜터의 자기소개 영상과 프로필을 확인하고 시차 고민 없이 원하는 시간을 선택하여 1:1 맞춤 화상 수업을 예약하세요. 수업 10분 전 자동 발급된 Google Meet 회의실에 입장할 수 있습니다.</p>
        </div>
        <div style={sx('display:flex;align-items:center;gap:10px')}>
          <button type="button" onClick={vc.loadVideoClassData} style={sx('display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:9px 15px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer')}>
            <span>🔄</span>
            <span>데이터 새로고침</span>
          </button>
        </div>
      </div>

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
          </div>

          <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px')}>
            {(s.vcTutors || []).map((t) => (
              <div key={t.id} style={sx('background:var(--card);border:1.5px solid var(--line);border-radius:18px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;gap:18px;box-shadow:0 4px 14px rgba(0,0,0,0.03);transition:transform .15s ease,box-shadow .15s ease')}>
                <div style={sx('display:flex;flex-direction:column;gap:14px')}>
                  <div style={sx('display:flex;align-items:center;gap:14px')}>
                    <div style={sx('position:relative;width:56px;height:56px;flex:none')}>
                      <img src={t.photoURL} alt={t.name} style={sx('width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid var(--line)')} />
                      <span title="온라인" style={sx('position:absolute;bottom:0;right:0;width:14px;height:14px;background:#27AE60;border:2px solid var(--card);border-radius:50%')} />
                    </div>
                    <div style={sx('display:flex;flex-direction:column;gap:3px;min-width:0')}>
                      <h3 style={sx('margin:0;font-size:16px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{t.name}</h3>
                      <div style={sx('display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sub)')}>
                        <span style={sx('color:#F2C94C;font-weight:700')}>★ {t.rating}</span>
                        <span>· 리뷰 {t.reviewCount}개</span>
                        <span>· 완료 {t.lessonsCompleted}회</span>
                      </div>
                    </div>
                  </div>
                  <p style={sx('margin:0;font-size:13px;font-weight:600;color:var(--accent);line-height:1.4')}>“{t.shortIntro}”</p>
                  <p style={sx('margin:0;font-size:12.5px;color:var(--sub);line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden')}>{t.bio}</p>
                  <div style={sx('display:flex;flex-wrap:wrap;gap:6px')}>
                    {(t.specialties || []).slice(0, 3).map((sp) => (
                      <span key={sp} style={sx('font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(35,73,63,0.08);color:var(--accent);font-weight:600')}>#{sp}</span>
                    ))}
                  </div>
                </div>
                <div style={sx('display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line2);padding-top:14px')}>
                  <div style={sx('display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--sub)')}>
                    <span>수업료 (회당)</span>
                    <span style={sx('font-weight:700;color:var(--ink);font-size:13.5px')}>50분 ₩{t.pricePerSession?.min50}</span>
                  </div>
                  <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
                    <button type="button" onClick={() => vc.openVideoModal(t)} style={sx('display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:10px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer')}>
                      <span>▶</span>
                      <span>소개 영상</span>
                    </button>
                    <button type="button" onClick={() => vc.openArrangeModal(t)} style={sx('display:flex;align-items:center;justify-content:center;gap:6px;border:0;background:var(--accent);color:#fff;padding:10px;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer')}>
                      <span>🗓️</span>
                      <span>수업 예약</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'mySessions' && (
        <div style={sx('display:flex;flex-direction:column;gap:20px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px')}>
            <h2 style={sx('margin:0;font-size:17px;font-weight:700;color:var(--ink)')}>📅 예약된 1:1 화상 수업 세션</h2>
            <span style={sx('font-size:12.5px;color:var(--sub)')}>Google Meet 화상 회의실 자동 생성 및 수업 전후 피드백 노트</span>
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
                        <span style={sx('font-size:12.5px;color:var(--sub)')}>학생: {b.studentName} ({b.duration}분 세션)</span>
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
                      <span style={sx('font-size:11px;color:var(--sub)')}>한국 시간: {b.kstTimeLabel}</span>
                    </div>
                    <div style={sx('display:flex;flex-direction:column;gap:3px')}>
                      <span style={sx('font-size:11.5px;color:var(--faint);font-weight:600')}>Google Meet 회의실 링크 (FR-003)</span>
                      <div style={sx('display:flex;align-items:center;gap:6px')}>
                        <code style={sx("font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--accent);word-break:break-all")}>{b.googleMeetUrl}</code>
                        <button type="button" onClick={b.copyMeet} title="링크 복사" style={sx('border:0;background:none;cursor:pointer;font-size:13px;padding:2px')}>📋</button>
                      </div>
                    </div>
                    <div style={sx('display:flex;flex-direction:column;gap:3px')}>
                      <span style={sx('font-size:11.5px;color:var(--faint);font-weight:600')}>수업 카운트다운</span>
                      <span style={sx('font-size:13px;font-weight:700;color:var(--hot)')}>{b.countdownLabel}</span>
                    </div>
                  </div>

                  <div style={sx('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px')}>
                    {b.canEnterMeet && (
                      <button type="button" onClick={b.enterMeet} style={sx('display:inline-flex;align-items:center;gap:8px;border:0;background:#27AE60;color:#fff;padding:11px 22px;border-radius:12px;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(39,174,96,0.3)')}>
                        <span>📹</span>
                        <span>Google Meet 입장하기 (수업 참여)</span>
                      </button>
                    )}
                    {/* Legacy `!b.canEnterMeet && !b.isCompleted` resolves to `!undefined`: always shown. */}
                    <button type="button" disabled style={sx('display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--bg);color:var(--faint);padding:11px 20px;border-radius:12px;font-size:13px;font-weight:600;cursor:not-allowed')}>
                      <span>🔒</span>
                      <span>Google Meet 입장 (수업 10분 전 오픈)</span>
                    </button>
                    {b.isCompleted && (
                      <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                        <button type="button" onClick={b.openFeedbackView} style={sx('border:1px solid var(--accent);background:rgba(35,73,63,0.08);color:var(--accent);padding:9px 15px;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer')}>📋 피드백 리포트 열람</button>
                        {b.canWriteTutorFeedback && <button type="button" onClick={b.openFeedbackTutor} style={sx('border:1px solid var(--line);background:var(--card);color:var(--ink);padding:9px 13px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer')}>✍️ 튜터 리포트 작성</button>}
                        {b.canWriteStudentFeedback && <button type="button" onClick={b.openFeedbackStudent} style={sx('border:1px solid var(--line);background:var(--card);color:var(--ink);padding:9px 13px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer')}>⭐ 학생 리뷰 작성</button>}
                      </div>
                    )}
                    {b.canTransition && (
                      <div style={sx('display:flex;gap:6px;align-items:center')}>
                        <span style={sx('font-size:11px;color:var(--faint)')}>상태 변경:</span>
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
            <p style={sx('margin:0;font-size:13px;color:var(--sub)')}>튜터 프로필, YouTube/Vimeo 소개 영상(Embed), 전문 분야 및 예약 시간표를 등록합니다.</p>
          </div>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px')}>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>튜터 성명 및 영문명</span>
              <input value={s.vcAdminTutorName || ''} onChange={set('vcAdminTutorName')} placeholder="예: 정하늘 (Haneul Jung)" style={sx(INPUT)} />
            </label>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>한 줄 소개 (Catchphrase)</span>
              <input value={s.vcAdminTutorShort || ''} onChange={set('vcAdminTutorShort')} placeholder="예: 첫걸음부터 유창한 발음까지 이끌어 드립니다" style={sx(INPUT)} />
            </label>
          </div>
          <label style={sx(LABEL)}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
              <span style={sx(LABEL_TEXT)}>상세 자기소개 및 티칭 스타일 (최소 50자 필수 검증)</span>
              <span style={sx('font-size:12px;font-weight:600')}>{bioCount} / 50자 이상 필수</span>
            </div>
            <textarea value={s.vcAdminTutorBio || ''} onChange={set('vcAdminTutorBio')} rows={4} placeholder="안녕하세요! 외국인 학습자를 대상으로 한국어 발음과 실전 회화를 1:1로 지도하는 튜터입니다..." style={sx('border:1.5px solid var(--line);background:var(--bg);color:var(--ink);padding:12px 14px;border-radius:10px;font-size:13.5px;line-height:1.5;outline:none')} />
          </label>
          <label style={sx(LABEL)}>
            <span style={sx(LABEL_TEXT)}>소개 영상 URL (YouTube 또는 Vimeo 링크)</span>
            <input value={s.vcAdminTutorVideo || ''} onChange={set('vcAdminTutorVideo')} placeholder="예: https://www.youtube.com/watch?v=kJQP7kiw5Fk" style={sx(INPUT)} />
            <span style={sx('font-size:11.5px;color:var(--faint)')}>유효한 YouTube / Vimeo / MP4 링크 형식 검증이 수행됩니다.</span>
          </label>
          <label style={sx(LABEL)}>
            <span style={sx(LABEL_TEXT)}>Firebase Auth UID (선택 사항)</span>
            <input value={s.vcAdminTutorUid || ''} onChange={set('vcAdminTutorUid')} placeholder="예: Firebase Auth UID 문자열 (미입력 시 기존 매핑 유지)" style={sx(INPUT)} />
            <span style={sx('font-size:11.5px;color:var(--faint)')}>화상 수업을 배정받을 실제 튜터의 Firebase 사용자 UID입니다. (미입력 시 기존 매핑 유지)</span>
          </label>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px')}>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>전문 분야 (쉼표 구분)</span>
              <input value={s.vcAdminTutorSpecialties || ''} onChange={set('vcAdminTutorSpecialties')} placeholder="일상 회화, 발음 교정, K-드라마" style={sx(INPUT)} />
            </label>
            <label style={sx(LABEL)}>
              <span style={sx(LABEL_TEXT)}>지원 가능 언어 (쉼표 구분)</span>
              <input value={s.vcAdminTutorLanguages || ''} onChange={set('vcAdminTutorLanguages')} placeholder="한국어 (Native), English (Fluent)" style={sx(INPUT)} />
            </label>
          </div>
          <div style={sx('display:flex;justify-content:flex-end;border-top:1px solid var(--line2);padding-top:16px')}>
            <button type="button" onClick={vc.submitTutorProfile} style={sx('border:0;background:var(--accent);color:#fff;padding:12px 26px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer')}>튜터 프로필 저장 (POST /api/v1/tutors/profile)</button>
          </div>
        </div>
      )}

    </div>
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
