import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { CHAT_TEXT, QUICK, fmtDate } from '../data/chatData.js';
import { formatTime } from '../data/homeData.js';
import { KAKAO_OPENCHAT } from '../data/communityData.js';
import '../styles/chat.css';

function TypingDots() {
  return (
    <div style={{ background: 'var(--tbubble)', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: 3, background: '#8A96A0', animation: `dot 1.2s ${i * 0.15}s infinite` }} />
      ))}
    </div>
  );
}

// 문장 첨삭 아래 QR 코드 2칸. src(예: '/assets/qr/app.png')와 라벨을 채우면 표시되고, 비어 있으면 빈 칸으로 자리만 잡는다.
// href를 넣으면 QR 아래에 링크로 표시된다.
const CHAT_QR_CODES = [
  { id: 'qr-1', src: KAKAO_OPENCHAT.qr, label: KAKAO_OPENCHAT.label, href: KAKAO_OPENCHAT.url },
  { id: 'qr-2', src: '', label: { ko: '', en: '' }, href: '' }
];

// 교정 피드백 역할 분리 (지침): 채팅 말풍선 아래에는 짧은 요점만, '실시간 문장 첨삭' 패널에는 자세한 영어 설명.
// fix.brief = [en, ko] 한 줄 요점(서버 brief_en/brief_ko), fix.note = [en, ko] 자세한 설명.
const firstSentence = (text) => {
  const t = String(text || '').trim();
  const m = t.match(/^.+?(?:[.!?。]|다\.|요\.)(?=\s|$)/);
  return (m ? m[0] : t).trim();
};
const clampText = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function correctionBrief(fix) {
  const brief = Array.isArray(fix?.brief) ? fix.brief : [];
  const notes = Array.isArray(fix?.note) ? fix.note : [];
  const ko = String(brief[1] || '').trim() || clampText(firstSentence(notes[1] || notes[0]), 40);
  const en = String(brief[0] || '').trim() || clampText(firstSentence(notes[0]), 60);
  return { ko, en };
}

export function correctionDetailEn(fix) {
  const notes = Array.isArray(fix?.note) ? fix.note : [];
  return String(notes[0] || notes[1] || '').trim();
}

function chatTutor(selectedTutorId, L) {
  const raw = TUTORS.find((item) => item.id === selectedTutorId) || TUTORS[0];
  return {
    ...raw,
    name: L ? raw.ko : raw.en,
    role: raw.role[L],
    pace: raw.pace[L],
    genderLabel: L ? raw.genderKo : (raw.gender === 'female' ? 'Female' : 'Male'),
    genderSymbol: raw.gender === 'female' ? '♀' : '♂',
    genderBg: raw.gender === 'female' ? '#E06B82' : '#4B7BEC'
  };
}

function correctionTag(ruleId, L) {
  const normalized = String(ruleId || '').toUpperCase();
  if (normalized.includes('PARTICLE')) return L ? '조사 오류' : 'Particle';
  if (normalized.includes('TENSE') || normalized.includes('CLAUSE') || normalized.includes('ENDING')) return L ? '시제·어미 오류' : 'Tense & Ending';
  if (normalized.includes('SPELL') || normalized.includes('SPACING')) return L ? '맞춤법·띄어쓰기' : 'Spelling & Spacing';
  if (normalized.includes('VOCAB') || normalized.includes('WORD') || normalized.includes('NATURAL')) return L ? '어휘·자연스러운 표현' : 'Word Choice';
  return L ? '문장 교정' : 'Sentence Correction';
}

// 채팅 상대 튜터 정보 + 튜터 변경 / 영어 번역 토글.
// variant="bar": 채팅창 위 가로 막대 (모바일·사이드바 접힘), variant="sidebar": 사이드바 하단 카드.
export function ChatTutorHeader({ lang = 'ko', selectedTutorId = 'jiwoo', chatState, chat, onNavigate, variant = 'bar' }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = CHAT_TEXT[lang] || CHAT_TEXT.en;
  const s = chatState;
  const tutor = chatTutor(selectedTutorId, L);
  const translationLoading = !!(s.chatTransLoading && s.chatTransTutorId === selectedTutorId);
  const trLabel = translationLoading ? (L ? '번역 중…' : 'Translating…') : s.trAll ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English');
  const isSidebar = variant === 'sidebar';
  const avatarSize = isSidebar ? '44px' : '46px';
  return (
    <div className={isSidebar ? 'chat-tutor-card' : 'chat-tutor-bar'}>
      <div className="chat-tutor-id">
        <div style={{ width: avatarSize, height: avatarSize, borderRadius: '16px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '13.5px', fontWeight: 700, flex: 'none', position: 'relative', overflow: 'hidden' }}>
          {tutor.photo ? <img src={tutor.photo} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : tutor.initial}
          <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '16px', height: '16px', borderRadius: '50%', background: tutor.genderBg, color: '#fff', fontSize: '10px', fontWeight: 700, display: 'grid', placeItems: 'center', border: '1.5px solid var(--card)' }}>{tutor.genderSymbol}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: isSidebar ? '15px' : '16.5px', fontWeight: 700, color: 'var(--ink)' }}>{tutor.name}</span>
            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--chip)', fontWeight: 600, color: 'var(--sub)' }}>{tutor.genderLabel}</span>
            <span style={{ fontSize: '11.5px', color: '#3E9B6A', fontWeight: 600, whiteSpace: 'nowrap' }}>● {t.onlineLabel}</span>
          </div>
          {!isSidebar && <span style={{ fontSize: '12.5px', color: 'var(--sub)' }}>{tutor.role} · {tutor.pace}</span>}
        </div>
      </div>
      {isSidebar && <span className="chat-tutor-role">{tutor.role} · {tutor.pace}</span>}
      <div className="chat-tutor-actions">
        <button type="button" onClick={() => onNavigate?.('tutors')} style={{ border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '999px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <span>{L ? '튜터 변경' : 'Change'}</span> ↺
        </button>
        <button type="button" onClick={chat.toggleAll} style={{ border: '1px solid var(--line3)', background: s.trAll ? 'var(--tbubble)' : 'transparent', color: 'var(--ink)', borderRadius: '999px', padding: '6px 12px', fontSize: '12.5px', cursor: 'pointer' }}>{trLabel}</button>
      </div>
    </div>
  );
}

function ChatPage({ lang = 'ko', selectedTutorId = 'jiwoo', inlineCorrections = true, chatState, chat, onNavigate, tutorInSidebar = false }) {
  // 앱(<860px)에는 오른쪽 '실시간 문장 첨삭' 패널이 없으므로, 고쳐 쓰기 카드에서 자세한 영어 설명을 펼쳐 본다.
  const [openFix, setOpenFix] = useState({});
  const L = lang === 'ko' ? 1 : 0;
  const t = CHAT_TEXT[lang] || CHAT_TEXT.en;
  const s = chatState;
  const tutor = chatTutor(selectedTutorId, L);
  const msgList = useMemo(() => s.msgs[selectedTutorId] || [], [s.msgs, selectedTutorId]);
  const msgRef = useRef(null);

  // Legacy componentDidUpdate: keep the newest message in view.
  useEffect(() => {
    const el = msgRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgList, selectedTutorId, s.typing]);

  const translationLoading = !!(s.chatTransLoading && s.chatTransTutorId === selectedTutorId);
  const hasDraft = !!s.draft.trim();
  const correctionState = useMemo(() => {
    const items = [];
    let latestUserMessage = null;
    for (let index = msgList.length - 1; index >= 0; index -= 1) {
      const message = msgList[index];
      if (message.from !== 'me') continue;
      if (!latestUserMessage) latestUserMessage = message;
      if (message.fix?.wrong && message.fix?.right && items.length < 3) {
        items.push({ message, index });
      }
    }
    return { items, latestUserMessage };
  }, [msgList]);

  return (
    <div className="chat-screen" data-screen-label="04 Chat">
      {/* 좌측: 1:1 대화창 (화면 폭 50%) */}
      <div className="chat-main-pane">
        {!tutorInSidebar && <ChatTutorHeader lang={lang} selectedTutorId={selectedTutorId} chatState={chatState} chat={chat} onNavigate={onNavigate} />}
        {s.chatTranslationError && (
          <div style={{ background: 'var(--hot-soft)', borderBottom: '1px solid var(--hot)', padding: '9px 18px', fontSize: '12.5px', color: 'var(--ink)' }}>{s.chatTranslationError}</div>
        )}
        <div ref={msgRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {msgList.map((m, i) => {
            const prev = msgList[i - 1];
            const first = !prev || prev.from !== m.from || !!m.date;
            const trKey = selectedTutorId + i;
            const trOpen = s.trAll || !!s.trOpen[trKey];
            const wantsTranslation = m.from === 't' && trOpen;
            const fixBrief = correctionBrief(m.fix);
            const fixDetailEn = m.fix ? correctionDetailEn(m.fix) : '';
            const fixKey = m.id || `fix-${i}`;
            const mt = first && i > 0 ? '8px' : '0';
            const rad = m.from === 't' ? (first ? '4px 14px 14px 14px' : '14px') : (first ? '14px 4px 14px 14px' : '14px');
            const timeLabel = formatTime(m.time, L);
            return (
              <div key={m.id || `seed-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!!m.date && <div style={{ alignSelf: 'center', background: 'rgba(0,0,0,.16)', color: '#fff', fontSize: '12px', padding: '4px 12px', borderRadius: '999px', margin: '8px 0' }}>{fmtDate(m.date, L)}</div>}
                {m.from === 't' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: mt }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '11.5px', fontWeight: 700, flex: 'none', opacity: first ? 1 : 0, overflow: 'hidden' }}>
                      {tutor.photo ? <img src={tutor.photo} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : tutor.initial}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: 'min(72%,520px)' }}>
                      {first && <span style={{ fontSize: '12.5px', color: 'var(--chat-ink)' }}>{tutor.name}</span>}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                        <div onClick={() => chat.toggleMessage(trKey, !!m.tr)} title={t.tapTr} style={{ background: 'var(--tbubble)', padding: '9px 12px', borderRadius: rad, fontSize: '15px', lineHeight: 1.5, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span>{m.text}</span>
                          {wantsTranslation && m.tr && <span style={{ fontSize: '13px', color: 'var(--sub)', borderTop: '1px dashed var(--line3)', paddingTop: '6px' }}>{m.tr}</span>}
                          {wantsTranslation && !m.tr && translationLoading && <span style={{ fontSize: '12px', color: 'var(--faint)', borderTop: '1px dashed var(--line3)', paddingTop: '6px' }}>{L ? '영어 번역 중…' : 'Translating…'}</span>}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--chat-ink)', flex: 'none', whiteSpace: 'nowrap' }}>{timeLabel}</span>
                      </div>
                    </div>
                  </div>
                )}
                {m.from === 'me' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginTop: mt }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', justifyContent: 'flex-end', maxWidth: 'min(76%,540px)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 'none' }}>{!!m.pending && <span style={{ fontSize: '11px', fontWeight: 700, color: '#C99A00' }}>1</span>}<span style={{ fontSize: '11px', color: 'var(--chat-ink)', whiteSpace: 'nowrap' }}>{timeLabel}</span></div>
                      <div style={{ background: 'var(--bubble)', color: '#1C1F1E', padding: '9px 12px', borderRadius: rad, fontSize: '15px', lineHeight: 1.5 }}>{m.text}</div>
                    </div>
                    {!!m.correctionPending && <span style={{ fontSize: '11.5px', color: 'var(--chat-ink)', paddingRight: '4px' }}>{L ? '문장 확인 중…' : 'Checking your sentence…'}</span>}
                    {!!m.correctionError && <span style={{ fontSize: '11.5px', color: 'var(--hot)', paddingRight: '4px' }}>{L ? '문장 교정을 불러오지 못했어요.' : 'Could not check this sentence.'}</span>}
                    {!!m.fix && inlineCorrections && (
                      <div style={{ background: 'var(--tbubble)', borderRadius: '12px', padding: '12px 14px', maxWidth: 'min(76%,440px)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', lineHeight: 1.5, border: '1px solid rgba(0,0,0,.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-ink)', letterSpacing: '.06em' }}>{t.correction}</span><span style={{ fontSize: '11.5px', color: 'var(--faint)' }}>{t.savedNotes}</span></div>
                        <span><span style={{ textDecoration: 'line-through', color: 'var(--hot)' }}>{m.fix.wrong}</span> → <b style={{ color: 'var(--accent-ink)' }}>{m.fix.right}</b></span>
                        {!!fixBrief.ko && <span style={{ color: 'var(--sub)', fontSize: '13px' }}>{fixBrief.ko}</span>}
                        {!!(s.trAll && fixBrief.en && fixBrief.en !== fixBrief.ko) && <span style={{ color: 'var(--sub)', fontSize: '12.5px', borderTop: '1px dashed var(--line3)', paddingTop: '6px' }}>{fixBrief.en}</span>}
                        {!!fixDetailEn && (
                          <>
                            <button type="button" className="chat-fix-more" aria-expanded={!!openFix[fixKey]} onClick={() => setOpenFix((prev) => ({ ...prev, [fixKey]: !prev[fixKey] }))}>
                              {openFix[fixKey] ? (L ? '설명 접기' : 'Hide details') : (L ? '자세한 설명 (English)' : 'Show details')} <span aria-hidden="true">{openFix[fixKey] ? '▴' : '▾'}</span>
                            </button>
                            {!!openFix[fixKey] && <span className="chat-fix-detail" lang="en">💡 {fixDetailEn}</span>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {s.typing && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '11.5px', fontWeight: 700, overflow: 'hidden' }}>
                {tutor.photo ? <img src={tutor.photo} alt={tutor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : tutor.initial}
              </div>
              <TypingDots />
            </div>
          )}
        </div>
        <div style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
          <div className="chat-quick-row" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 12px 0' }}>
            {QUICK.map(([q, en]) => (
              <button type="button" key={q} onClick={() => chat.sendText(q)} style={{ flex: 'none', border: '1px solid var(--line)', background: 'var(--bg2)', borderRadius: '999px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', gap: '6px' }}><span>{q}</span><span style={{ color: 'var(--faint)' }}>{L ? '' : en}</span></button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px 12px' }}>
            <button type="button" title="Voice" style={{ width: '38px', height: '38px', borderRadius: '50%', border: 0, background: 'var(--chip)', color: 'var(--ink2)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg></button>
            <input
              value={s.draft}
              onChange={(e) => chat.setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); chat.sendText(s.draft); } }}
              placeholder={t.placeholder}
              style={{ flex: 1, minWidth: 0, border: 0, background: 'var(--bg)', color: 'var(--ink)', borderRadius: '20px', padding: '11px 16px', fontSize: '15px', outline: 'none' }}
            />
            <button type="button" onClick={() => chat.sendText(s.draft)} style={{ border: 0, background: hasDraft ? '#F2C94C' : 'var(--chip)', color: hasDraft ? '#1C1F1E' : 'var(--faint)', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', flex: 'none' }}>{t.send}</button>
          </div>
        </div>
      </div>

      {/* 우측: 실시간 문장 첨삭 및 대화 학습 가이드 패널 (화면 폭 50%) */}
      <aside className="chat-guide-pane" aria-label={L ? '실시간 문장 첨삭 및 학습 가이드' : 'Smart correction and learning guide'}>
        {/* 실시간 문장 첨삭 대형 피처 카드 */}
        <div className="chat-guide-card chat-guide-card--featured">
          <div className="chat-guide-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
              <span>✨</span>
              <span>{L ? '실시간 문장 첨삭' : 'Smart Correction'}</span>
            </span>
            <span className="chat-guide-badge chat-guide-badge--success">{L ? 'AI 자동 분석' : 'Live AI Check'}</span>
          </div>

          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: 'var(--ink2)' }}>
            {L
              ? '틀려도 괜찮아요! 한국어로 편안하게 대화해 보세요. 대화 중 어색한 조사, 시제 불일치, 맞춤법 오류를 AI가 실시간으로 분석하여 즉각적인 교정과 상세한 문법 팁을 제공합니다.'
              : 'Don’t hesitate to type in Korean! If particles, tenses, or phrasing are unnatural, AI immediately flags the mistake, provides natural corrections, and explains the grammar.'}
          </p>

          <div className="chat-correction-box" data-correction-source="live-chat">
            {!!correctionState.latestUserMessage?.correctionPending && (
              <div className="chat-correction-item" role="status">
                <span className="chat-correction-tag">{L ? '분석 중' : 'Analyzing'}</span>
                <span className="chat-correction-desc">
                  {L ? '✨ 방금 보낸 문장을 확인하고 있어요.' : '✨ Checking the sentence you just sent.'}
                </span>
              </div>
            )}

            {!!correctionState.latestUserMessage?.correctionError && (
              <div className="chat-correction-item" role="alert">
                <span className="chat-correction-tag">{L ? '분석 실패' : 'Check Failed'}</span>
                <span className="chat-correction-desc">
                  {L ? '교정 결과를 불러오지 못했어요. 문장을 다시 보내 주세요.' : 'The correction could not be loaded. Please send the sentence again.'}
                </span>
              </div>
            )}

            {!!(correctionState.latestUserMessage?.correctionChecked && !correctionState.latestUserMessage?.fix) && (
              <div className="chat-correction-item" role="status">
                <span className="chat-correction-tag">{L ? '자연스러운 문장' : 'Looks Natural'}</span>
                <span className="chat-correction-desc">
                  {L ? '✓ 방금 보낸 문장에서는 고칠 부분을 찾지 못했어요.' : '✓ No correction was needed for the sentence you just sent.'}
                </span>
              </div>
            )}

            {correctionState.items.map(({ message, index }) => {
              const note = correctionDetailEn(message.fix);
              return (
                <div className="chat-correction-item" key={message.id || `correction-${index}`} data-correction-message-id={message.id || ''}>
                  <span className="chat-correction-tag">{correctionTag(message.fix.ruleId, L)}</span>
                  <div className="chat-correction-diff">
                    <span className="chat-correction-wrong">{message.fix.wrong}</span>
                    <span className="chat-correction-arrow">→</span>
                    <span className="chat-correction-right">{message.fix.right}</span>
                  </div>
                  {!!note && <span className="chat-correction-desc" lang="en">💡 {note}</span>}
                </div>
              );
            })}

            {!correctionState.latestUserMessage && (
              <div className="chat-correction-item">
                <span className="chat-correction-tag">{L ? '대화 대기 중' : 'Ready'}</span>
                <span className="chat-correction-desc">
                  {L ? '왼쪽 채팅에 한국어 문장을 보내면 교정 결과가 여기에 표시돼요.' : 'Send a Korean sentence in the chat to see its correction here.'}
                </span>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--chip)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--accent-ink)' }}>
            <span>📝</span>
            <span style={{ fontWeight: 600 }}>
              {L
                ? '교정된 문장은 상단 메뉴 [오답 노트]에 자동으로 보관되어 언제든 복습할 수 있어요.'
                : 'Corrected sentences are automatically archived in your Mistake Notes for easy review.'}
            </span>
          </div>
        </div>

        {/* QR 코드 2개 (나란히). 이미지는 파일 상단 CHAT_QR_CODES의 src에 넣는다 */}
        <div className="chat-guide-card chat-qr-card">
          <div className="chat-qr-intro">
            <p className="chat-qr-intro-title">💬 Learn Korean. Make Friends. Connect the World.</p>
            <p>Meet Korean learners from around the world.<br />Chat in Korean, share cultures, and make real connections.</p>
            <p className="chat-qr-intro-strong">Turn what you learn into conversations.<br />Turn conversations into friendships.</p>
            <p className="chat-qr-intro-tagline">HangulNow — Where Korean brings the world together. 🌏</p>
          </div>
          <div className="chat-qr-row">
            {CHAT_QR_CODES.map((qr, i) => (
              <figure className="chat-qr-slot" key={qr.id}>
                <div className={`chat-qr-frame ${qr.src ? '' : 'is-empty'}`}>
                  {qr.src
                    ? <img src={qr.src} alt={(L ? qr.label.ko : qr.label.en) || `QR ${i + 1}`} />
                    : <span>QR {i + 1}</span>}
                </div>
                {!!(L ? qr.label.ko : qr.label.en) && <figcaption>{L ? qr.label.ko : qr.label.en}</figcaption>}
                {!!qr.href && <a className="chat-qr-link" href={qr.href} target="_blank" rel="noopener noreferrer">{qr.href}</a>}
              </figure>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default ChatPage;
