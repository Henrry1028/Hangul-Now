import React from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { CONVERSATION_TEXT, TUTOR_SESSION_MINUTE_OPTIONS, TUTOR_SESSION_SECONDS } from '../data/conversationData.js';
import '../styles/conversation.css';

const SCENARIOS = [['market', '🧥 동대문 옷가게', '🧥 Clothing store'], ['restaurant', '🍜 분식집 주문', '🍜 Snack bar'], ['taxi', '🚕 택시 타기', '🚕 Taxi'], ['hospital', '🏥 병원 접수', '🏥 Clinic']];
const EXPRESSIONS = [
  ['“다시 한 번 말씀해 주시겠어요?”', '(Could you say that again?)'],
  ['“조금만 천천히 말씀해 주세요.”', '(Please speak a bit slower.)'],
  ['“이건 한국어로 뭐라고 하나요?”', '(How do you say this in Korean?)'],
  ['“아, 그렇군요! 이해했어요.”', '(Oh, I see! I got it.)']
];

function ConversationPage({ lang = 'ko', selectedTutorId = 'jiwoo', conversation, translationState, onToggleTranslation }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = CONVERSATION_TEXT[lang] || CONVERSATION_TEXT.en;
  const s = conversation.state;
  const tr = translationState;
  const raw = TUTORS.find((item) => item.id === selectedTutorId) || TUTORS[0];
  const tutor = { ...raw, name: L ? raw.ko : raw.en, role: raw.role[L] };
  const isRoleplay = s.cvMode === 'roleplay';
  const live = s.cvStatus === 'live';
  const durationLocked = live || s.cvStatus === 'connecting';
  const durationMinutes = s.cvDurationMinutes || 10;
  const remaining = s.cvRemainingSeconds ?? TUTOR_SESSION_SECONDS;
  const cvTimeLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const statusLabel = live
    ? (s.cvSpeaking ? (L ? '선생님이 말하는 중…' : 'Tutor is speaking…') : (L ? '듣고 있어요 — 편하게 말해 보세요' : 'Listening — go ahead and speak'))
    : s.cvStatus === 'connecting' ? (L ? '연결하는 중…' : 'Connecting…')
      : s.cvStatus === 'ended' ? (L ? '대화가 끝났어요' : 'Conversation ended') : (L ? '시작을 누르면 선생님이 먼저 말을 걸어요' : 'Press start — your tutor will open the conversation');
  const statusColor = live ? 'var(--accent-ink)' : s.cvStatus === 'connecting' ? 'var(--hot)' : 'var(--faint)';
  const tutorInitial = isRoleplay ? ({ market: '🧥', restaurant: '🍜', taxi: '🚕', hospital: '🏥' }[s.cvScenario] || '🎭') : tutor.initial;
  const tutorColor = isRoleplay ? 'var(--chip)' : tutor.color;
  const tutorRole = isRoleplay
    ? ({ market: L ? '옷 사기 · 흥정' : 'Buying clothes', restaurant: L ? '음식 주문' : 'Ordering food', taxi: L ? '목적지 말하기' : 'Giving directions', hospital: L ? '증상 설명' : 'Describing symptoms' }[s.cvScenario] || '')
    : tutor.role;
  const tutorSub = isRoleplay
    ? `${{ market: L ? '동대문 옷가게' : 'Clothing store', restaurant: L ? '분식집 주문' : 'Snack bar', taxi: L ? '택시 타기' : 'Taxi', hospital: L ? '병원 접수' : 'Clinic' }[s.cvScenario] || ''} · ${L ? '상황극' : 'Roleplay'}`
    : `${tutor.name} · ${tutor.role}`;
  const levelDesc = {
    beginner: L ? '아주 천천히 · 한 번에 1~2문장 · 기초 단어(TOPIK 1~2급) · 막히면 영어 힌트 · 한 번에 한 가지만 교정'
      : 'Very slow · 1–2 sentences at a time · basic words (TOPIK 1–2) · English hints when stuck · one correction at a time',
    intermediate: L ? '보통 속도 · 2~3문장 · TOPIK 3~4급 어휘 · 이유를 묻는 질문 · 중요한 것 1~2개 교정'
      : 'Normal pace · 2–3 sentences · TOPIK 3–4 vocabulary · asks you to explain why · 1–2 key corrections',
    advanced: L ? '원어민 속도 · 3~4문장 · 관용 표현·구어체 · 토론하듯 반대 의견 · 뉘앙스와 자연스러움까지 교정'
      : 'Native pace · 3–4 sentences · idioms and casual speech · debates with you · corrects nuance and naturalness'
  }[s.cvLevel] || '';
  const tutorLabel = s.cvTutorName || tutor.name;
  const turnCount = (s.cvTurns || []).length + (L ? '개 대화' : (s.cvTurns || []).length === 1 ? ' turn' : ' turns');
  const cvTrans = tr.cvTrans || {};

  const historyGroups = (() => {
    const dayNames = L ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pad = (n) => String(n).padStart(2, '0');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const groups = [];
    (s.cvHistory || []).forEach((rec) => {
      const d = new Date(rec.savedAt);
      const day = new Date(d); day.setHours(0, 0, 0, 0);
      const diff = Math.round((today - day) / 864e5);
      const label = diff === 0 ? (L ? '오늘' : 'Today') : diff === 1 ? (L ? '어제' : 'Yesterday')
        : L ? `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})` : `${dayNames[d.getDay()]}, ${d.getMonth() + 1}/${d.getDate()}`;
      let g = groups.find((x) => x.label === label);
      if (!g) { g = { label, items: [] }; groups.push(g); }
      const lv = { beginner: L ? '초급' : 'Beginner', intermediate: L ? '중급' : 'Intermediate', advanced: L ? '고급' : 'Advanced' }[rec.level] || rec.level;
      const left = Math.max(0, 7 - Math.round((Date.now() - rec.savedAt) / 864e5));
      g.items.push({
        rec,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        tutor: rec.tutor || (L ? '선생님' : 'Tutor'),
        level: lv,
        turns: rec.turns.length + (L ? '개 대화' : rec.turns.length === 1 ? ' turn' : ' turns'),
        preview: (rec.turns.find((x) => x.role === 'tutor') || rec.turns[0] || {}).text || '',
        expires: L ? `${left}일 후 삭제` : `${left}d left`,
        reportLabel: s.cvReportLoading === rec.id ? (L ? '만드는 중…' : 'Generating…') : t.cvReportShort
      });
    });
    return groups;
  })();

  const reportMsg = s.cvReport ? (s.cvReport.archive?.archived
    ? (L ? '내려받았어요. 내 계정에도 영구 보관됐어요.' : 'Downloaded and archived to your account.')
    : (L ? '내려받았어요. (로그인하면 계정에 영구 보관돼요)' : 'Downloaded. Sign in to archive it to your account.')) : '';
  const segButton = (active, pad) => ({ border: 0, background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--ink2)', borderRadius: '9px', padding: pad, fontSize: pad === '8px 14px' ? '13.5px' : '14px', fontWeight: 600, cursor: 'pointer' });

  return (
    <div className="conversation-screen" data-screen-label="08b Conversation">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.1em' }}>{t.cvEyebrow}</span>
          <h1 style={{ margin: 0, font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>{t.cvTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '12px', padding: '4px' }}>
            {[['tutor', L ? '튜터 수업' : 'Tutor lesson'], ['roleplay', L ? '상황극 (Survival)' : 'Roleplay (Survival)']].map(([k, lb]) => (
              <button type="button" key={k} onClick={() => conversation.setMode(k)} style={segButton(s.cvMode === k, '8px 14px')}>{lb}</button>
            ))}
          </div>
          <div style={{ display: 'flex', background: 'var(--seg)', borderRadius: '12px', padding: '4px' }}>
            {[['beginner', L ? '초급' : 'Beginner'], ['intermediate', L ? '중급' : 'Intermediate'], ['advanced', L ? '고급' : 'Advanced']].map(([k, lb]) => (
              <button type="button" key={k} onClick={() => conversation.setLevel(k)} style={segButton(s.cvLevel === k, '8px 16px')}>{lb}</button>
            ))}
          </div>
        </div>
      </div>

      {isRoleplay && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ font: "600 11px 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: 'var(--hot)' }}>{t.cvScenarioLabel}</span>
          {SCENARIOS.map(([k, ko, en]) => (
            <button type="button" key={k} onClick={() => conversation.setScenario(k)} style={{ border: `1.5px solid ${s.cvScenario === k ? 'var(--accent)' : 'var(--line)'}`, background: s.cvScenario === k ? 'var(--accent-soft)' : 'var(--card)', color: 'var(--ink)', borderRadius: '999px', padding: '8px 16px', fontSize: '13.5px', fontWeight: s.cvScenario === k ? '700' : '500', cursor: 'pointer' }}>{L ? ko : en}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--accent-soft)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '10px 16px' }}>
        <span style={{ font: "700 11.5px 'Pretendard',sans-serif", color: 'var(--accent-ink)', flex: 'none', whiteSpace: 'nowrap' }}>{t.cvLevelLabel}</span>
        <span style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--ink2)' }}>{levelDesc}</span>
      </div>

      {!isRoleplay && (
        <div className="cv-duration-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{L ? '수업 시간' : 'Lesson time'}</span>
          <div role="group" aria-label={L ? '수업 시간 선택' : 'Choose lesson duration'} style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', background: 'var(--seg)', borderRadius: '11px', padding: '4px' }}>
            {TUTOR_SESSION_MINUTE_OPTIONS.map((minutes) => (
              <button
                type="button"
                key={minutes}
                disabled={durationLocked}
                aria-pressed={durationMinutes === minutes}
                onClick={() => conversation.setDuration(minutes)}
                style={{ ...segButton(durationMinutes === minutes, '7px 12px'), opacity: durationLocked && durationMinutes !== minutes ? 0.48 : 1, cursor: durationLocked ? 'not-allowed' : 'pointer' }}
              >
                {minutes}{L ? '분' : ' min'}
              </button>
            ))}
          </div>
          <span role="note" style={{ flex: '1 1 260px', fontSize: '12.5px', lineHeight: 1.5, color: 'var(--sub)' }}>
            {L
              ? `선택한 ${durationMinutes}분 동안 튜터와 대화하며, 종료 1분 전에는 오늘 배운 내용을 함께 마무리해요.`
              : `Your tutor keeps the conversation going for the selected ${durationMinutes} minutes, then wraps up the lesson during the final minute.`}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: live ? 'var(--hot)' : s.cvStatus === 'connecting' ? 'var(--gold)' : 'var(--line3)', animation: live ? 'pulse 1.6s infinite' : 'none', flex: 'none' }} />
          <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: tutorColor, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '11.5px', fontWeight: 700, flex: 'none' }}>{tutorInitial}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{ fontSize: '14.5px', fontWeight: 600, color: statusColor }}>{statusLabel}</span>
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}>{tutorSub}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {!isRoleplay && (
            <span style={{ font: "600 13px 'IBM Plex Mono',monospace", color: s.cvWrapUpSent ? 'var(--hot)' : 'var(--accent-ink)', background: 'var(--seg)', borderRadius: '999px', padding: '8px 12px', minWidth: '72px', textAlign: 'center' }}>{cvTimeLabel}</span>
          )}
          {live && (
            <>
              <div style={{ width: '74px', height: '8px', borderRadius: '999px', background: 'var(--seg)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.round((s.cvLevelMeter || 0) * 100)}%`, background: 'var(--accent)', borderRadius: '999px', transition: 'width .1s' }} /></div>
              <button type="button" onClick={conversation.toggleMute} style={{ border: '1px solid var(--line3)', background: s.cvMuted ? 'var(--hot-soft)' : 'var(--card)', color: 'var(--ink)', borderRadius: '999px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>{s.cvMuted ? (L ? '🔇 마이크 꺼짐' : '🔇 Mic off') : (L ? '🎙️ 마이크 켜짐' : '🎙️ Mic on')}</button>
              <button type="button" onClick={() => conversation.stop(true)} style={{ border: 0, background: 'var(--hot)', color: '#fff', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t.cvStop}</button>
            </>
          )}
          {!live && (
            <button type="button" onClick={conversation.start} style={{ border: 0, background: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '10px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t.cvStart}</button>
          )}
        </div>
      </div>

      {s.cvError && <div style={{ background: 'var(--hot-soft)', border: '1px solid var(--hot)', borderRadius: '12px', padding: '14px 18px', fontSize: '14px', color: 'var(--ink)' }}>{s.cvError}</div>}

      <div className="cv-layout-grid">
        <div style={{ minWidth: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '520px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>{t.cvTranscriptH}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {tr.cvTransLoading && <span style={{ fontSize: '12px', color: 'var(--hot)', fontWeight: 600 }}>{L ? '만드는 중…' : 'Generating…'}</span>}
              <button type="button" onClick={onToggleTranslation} style={{ border: '1px solid var(--line3)', background: tr.trOn ? 'var(--accent-soft)' : 'var(--card)', color: tr.trOn ? 'var(--accent-ink)' : 'var(--ink)', borderRadius: '999px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{tr.trOn ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English')}</button>
              <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{turnCount}</span>
            </div>
          </div>

          {(s.cvTurns || []).length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
              <div style={{ width: '84px', height: '84px', borderRadius: '26px', background: tutorColor, color: '#1C1F1E', display: 'grid', placeItems: 'center', font: "700 22px 'Gowun Batang',serif", flex: 'none', boxShadow: '0 8px 20px rgba(0,0,0,.12)' }}>{tutorInitial}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>{tutorLabel}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--hot)', fontWeight: 600 }}>{tutorRole}</span>
                <span style={{ color: 'var(--sub)', fontSize: '14px', lineHeight: 1.6 }}>{t.cvEmpty}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(s.cvTurns || []).map((turn, i) => {
              const isTutor = turn.role === 'tutor';
              const en = cvTrans[turn.text] || '';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignSelf: isTutor ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--faint)', fontWeight: 600 }}>{isTutor ? tutorLabel : (L ? '나' : 'Me')}</span>
                  <span style={{ background: isTutor ? 'var(--card)' : 'var(--accent-soft)', border: '1px solid var(--line2)', borderRadius: isTutor ? '4px 14px 14px 14px' : '14px 4px 14px 14px', padding: '10px 14px', fontSize: '15px', lineHeight: 1.6, color: 'var(--ink)' }}>{turn.text}</span>
                  {!!(tr.trOn && en) && <span style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--sub)', padding: '0 4px 0 12px', borderLeft: '2px solid var(--line3)' }}>{en}</span>}
                </div>
              );
            })}
            {!!(s.cvPartial?.user || '').trim() && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignSelf: 'flex-end', maxWidth: '82%', opacity: 0.6 }}>
                <span style={{ fontSize: '11.5px', color: 'var(--faint)', fontWeight: 600 }}>{t.cvMe}</span>
                <span style={{ background: 'var(--accent-soft)', border: '1px dashed var(--line3)', borderRadius: '14px 4px 14px 14px', padding: '10px 14px', fontSize: '15px', lineHeight: 1.6 }}>{s.cvPartial.user}</span>
              </div>
            )}
            {!!(s.cvPartial?.tutor || '').trim() && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignSelf: 'flex-start', maxWidth: '82%', opacity: 0.6 }}>
                <span style={{ fontSize: '11.5px', color: 'var(--faint)', fontWeight: 600 }}>{tutorLabel}</span>
                <span style={{ background: 'var(--card)', border: '1px dashed var(--line3)', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', fontSize: '15px', lineHeight: 1.6 }}>{s.cvPartial.tutor}</span>
              </div>
            )}
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--accent)', borderRadius: '20px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 24px rgba(35,73,63,.08)', minHeight: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📚</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-ink)' }}>{t.cvCardH}</span>
              </div>
              <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderRadius: '999px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>{(s.cvCards || []).length}</span>
            </div>
            <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--sub)' }}>{t.cvCardEmpty}</span>
            {(s.cvCards || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                {s.cvCards.map((c) => (
                  <div key={c.id} style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'var(--chip)', color: 'var(--ink2)', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 }}>{c.category || (L ? '문법' : 'Grammar')}</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Gowun Batang',serif" }}>{c.title || ''}</span>
                    </div>
                    <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink2)' }}>{c.explanation || ''}</span>
                    {!!(tr.trOn && c.explanation_en) && <span style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--sub)', paddingLeft: '10px', borderLeft: '2px solid var(--line3)' }}>{c.explanation_en}</span>}
                    {!!(c.corrected_from && c.corrected_to) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', background: 'var(--hot-soft)', borderRadius: '8px', padding: '6px 10px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--hot)', textDecoration: 'line-through' }}>{c.corrected_from}</span>
                        <span style={{ color: 'var(--faint)' }}>→</span>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--accent-ink)' }}>{c.corrected_to}</span>
                      </div>
                    )}
                    {(c.examples || []).map((x, xi) => (
                      <span key={xi} style={{ fontSize: '12.5px', lineHeight: 1.55, color: 'var(--sub)', paddingLeft: '10px', borderLeft: '2px solid var(--line3)' }}>{x}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 'auto', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '15px' }}>💡</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>{t.cvHelperH}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', lineHeight: 1.5, color: 'var(--ink2)' }}>
                {EXPRESSIONS.map(([ko, en]) => (
                  <div key={ko} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>•</span>
                    <span><strong>{ko}</strong> <span style={{ color: 'var(--faint)', fontSize: '11.5px' }}>{en}</span></span>
                  </div>
                ))}
              </div>
            </div>
            {s.cvReviewStatus === 'generating' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'var(--accent-soft)', borderRadius: '10px', padding: '10px 12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--hot)', animation: 'pulse 1.4s infinite' }} />
                <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--ink2)' }}>{t.cvReviewGenerating}</span>
              </div>
            )}
            {s.cvReviewStatus === 'ready' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--accent-soft)', borderRadius: '10px', padding: '12px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-ink)' }}>{t.cvReviewReady}</span>
                <audio controls preload="metadata" src={s.cvReviewUrl || ''} style={{ width: '100%', height: '38px' }} />
                <a href={s.cvReviewUrl || ''} download style={{ fontSize: '12px', color: 'var(--accent-ink)', fontWeight: 600, textDecoration: 'none' }}>⬇ {t.cvReviewDownload}</a>
              </div>
            )}
          </div>

          {isRoleplay && (
            <div style={{ background: 'var(--card)', border: '1.5px solid var(--hot)', borderRadius: '18px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 8px 24px rgba(200,80,42,.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--hot)' }}>🚨 {t.cvHintH}</span>
                <span style={{ background: 'var(--hot-soft)', color: 'var(--hot)', borderRadius: '999px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700 }}>{(s.cvHints || []).length}</span>
              </div>
              {(s.cvHints || []).length === 0 && <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--sub)' }}>{t.cvHintEmpty}</span>}
              {(s.cvHints || []).map((h) => (
                <div key={h.id} style={{ background: 'var(--hot-soft)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', color: 'var(--hot)', textDecoration: 'line-through' }}>{h.error_phrase}</span>
                    <span style={{ color: 'var(--faint)' }}>→</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-ink)' }}>{h.corrected_phrase}</span>
                  </div>
                  {!!h.romanization && <span style={{ font: "500 11.5px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>[{h.romanization}]</span>}
                  <span style={{ fontSize: '12.5px', lineHeight: 1.55, color: 'var(--ink2)' }}>{h.situation_rule}</span>
                  {!!(tr.trOn && h.situation_rule_en) && <span style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--sub)', paddingLeft: '10px', borderLeft: '2px solid var(--line3)' }}>{h.situation_rule_en}</span>}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>{t.cvHistoryH}</span>
            <span style={{ fontSize: '12.5px', color: 'var(--faint)' }}>{t.cvHistorySub}</span>
          </div>
          <span style={{ background: 'var(--chip)', borderRadius: '999px', padding: '5px 12px', fontSize: '12px', color: 'var(--ink2)' }}>{t.cvKeepBadge}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--hi)', borderRadius: '14px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, flex: 'none' }}>{t.cvFeedbackH}</span>
            <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--sub)', flex: 1, minWidth: '220px' }}>{t.cvFeedbackP}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {t.cvAreas.map((a) => (
              <span key={a} style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: '999px', padding: '5px 12px', fontSize: '12.5px', color: 'var(--ink2)' }}>{a}</span>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--line2)', paddingTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: '12px 24px' }}>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
              <span style={{ flex: 'none' }}>📄</span>
              <span style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--ink2)' }}><strong style={{ color: 'var(--ink)' }}>{t.cvReportH}</strong> · {t.cvReportP}</span>
            </div>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
              <span style={{ flex: 'none' }}>⬇</span>
              <span style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--ink2)' }}><strong style={{ color: 'var(--ink)' }}>{t.cvSaveH}</strong> · {t.cvSaveP} {t.cvKeepNotice}</span>
            </div>
          </div>
        </div>
        {!!s.cvReport && <span style={{ fontSize: '12.5px', color: 'var(--accent-ink)', fontWeight: 600 }}>{reportMsg}</span>}
        {!!s.cvReportError && <span style={{ fontSize: '12.5px', color: 'var(--hot)' }}>{s.cvReportError}</span>}
        {(s.cvHistory || []).length === 0 && <span style={{ fontSize: '13.5px', color: 'var(--faint)', padding: '8px 0' }}>{t.cvHistoryEmpty}</span>}
        {historyGroups.map((g) => (
          <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ font: "600 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.06em' }}>{g.label}</span>
            {g.items.map((it) => (
              <div key={it.rec.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', border: '1px solid var(--line2)', borderRadius: '12px', padding: '12px 16px' }}>
                <span style={{ font: "600 13px 'IBM Plex Mono',monospace", color: 'var(--ink2)', flex: 'none' }}>{it.time}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '140px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{it.tutor} · {it.level} · {it.turns}</span>
                  <span style={{ fontSize: '12.5px', color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.preview}</span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--faint)', flex: 'none' }}>{it.expires}</span>
                <div style={{ display: 'flex', gap: '6px', flex: 'none' }}>
                  <button type="button" onClick={() => conversation.requestReport(it.rec)} style={{ border: 0, background: 'var(--accent)', color: '#fff', borderRadius: '8px', padding: '7px 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>📄 {it.reportLabel}</button>
                  <button type="button" onClick={() => conversation.downloadRecord(it.rec)} style={{ border: '1px solid var(--line3)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '8px', padding: '7px 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>⬇ {t.cvDownloadShort}</button>
                  <button type="button" onClick={() => conversation.deleteConversation(it.rec.id)} style={{ border: '1px solid var(--line3)', background: 'transparent', color: 'var(--faint)', borderRadius: '8px', padding: '7px 11px', fontSize: '12.5px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConversationPage;
