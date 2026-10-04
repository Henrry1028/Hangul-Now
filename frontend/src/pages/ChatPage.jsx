import React, { useEffect, useRef } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { CHAT_TEXT, QUICK, fmtDate } from '../data/chatData.js';
import { formatTime } from '../data/homeData.js';
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

function ChatPage({ lang = 'ko', selectedTutorId = 'jiwoo', inlineCorrections = true, chatState, chat, onNavigate }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = CHAT_TEXT[lang] || CHAT_TEXT.en;
  const s = chatState;
  const raw = TUTORS.find((item) => item.id === selectedTutorId) || TUTORS[0];
  const tutor = {
    ...raw,
    name: L ? raw.ko : raw.en,
    role: raw.role[L],
    pace: raw.pace[L],
    genderLabel: L ? raw.genderKo : (raw.gender === 'female' ? 'Female' : 'Male'),
    genderSymbol: raw.gender === 'female' ? '♀' : '♂',
    genderBg: raw.gender === 'female' ? '#E06B82' : '#4B7BEC'
  };
  const msgList = s.msgs[selectedTutorId] || [];
  const msgRef = useRef(null);

  // Legacy componentDidUpdate: keep the newest message in view.
  useEffect(() => {
    const el = msgRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgList, selectedTutorId, s.typing]);

  const translationLoading = !!(s.chatTransLoading && s.chatTransTutorId === selectedTutorId);
  const trLabel = translationLoading ? (L ? '번역 중…' : 'Translating…') : s.trAll ? (L ? '영어 번역 숨기기' : 'Hide English') : (L ? '영어 번역 보기' : 'Show English');
  const hasDraft = !!s.draft.trim();

  return (
    <div className="chat-screen" data-screen-label="04 Chat">
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--chat)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,.08)', background: 'var(--card)', flexWrap: 'wrap' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '15px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '13.5px', fontWeight: 700, flex: 'none', position: 'relative' }}>
            {tutor.initial}
            <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '15px', height: '15px', borderRadius: '50%', background: tutor.genderBg, color: '#fff', fontSize: '9px', fontWeight: 700, display: 'grid', placeItems: 'center', border: '1.5px solid var(--card)' }}>{tutor.genderSymbol}</span>
          </div>
          <div style={{ flex: 1, minWidth: '140px', display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--ink)' }}>{tutor.name}</span>
              <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--chip)', fontWeight: 600, color: 'var(--sub)' }}>{tutor.genderLabel}</span>
              <span style={{ fontSize: '11.5px', color: '#3E9B6A', fontWeight: 600 }}>● {t.onlineLabel}</span>
            </div>
            <span style={{ fontSize: '12.5px', color: 'var(--sub)' }}>{tutor.role} · {tutor.pace}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => onNavigate?.('tutors')} style={{ border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', borderRadius: '999px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{L ? '튜터 변경' : 'Change'}</span> ↺
            </button>
            <button type="button" onClick={chat.toggleAll} style={{ border: '1px solid var(--line3)', background: s.trAll ? 'var(--tbubble)' : 'transparent', borderRadius: '999px', padding: '6px 12px', fontSize: '12.5px', cursor: 'pointer' }}>{trLabel}</button>
          </div>
        </div>
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
            const fixNotes = Array.isArray(m.fix?.note) ? m.fix.note : [];
            const fixNoteKo = fixNotes[1] || fixNotes[0] || '';
            const fixNoteEn = fixNotes[0] || '';
            const mt = first && i > 0 ? '8px' : '0';
            const rad = m.from === 't' ? (first ? '4px 14px 14px 14px' : '14px') : (first ? '14px 4px 14px 14px' : '14px');
            const timeLabel = formatTime(m.time, L);
            return (
              <div key={m.id || `seed-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!!m.date && <div style={{ alignSelf: 'center', background: 'rgba(0,0,0,.16)', color: '#fff', fontSize: '12px', padding: '4px 12px', borderRadius: '999px', margin: '8px 0' }}>{fmtDate(m.date, L)}</div>}
                {m.from === 't' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: mt }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '14px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '11.5px', fontWeight: 700, flex: 'none', opacity: first ? 1 : 0 }}>{tutor.initial}</div>
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
                        <span style={{ color: 'var(--sub)', fontSize: '13px' }}>{fixNoteKo}</span>
                        {!!(s.trAll && fixNoteEn && fixNoteEn !== fixNoteKo) && <span style={{ color: 'var(--sub)', fontSize: '12.5px', borderTop: '1px dashed var(--line3)', paddingTop: '6px' }}>{fixNoteEn}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {s.typing && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '14px', background: tutor.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '11.5px', fontWeight: 700 }}>{tutor.initial}</div>
              <TypingDots />
            </div>
          )}
        </div>
        <div style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 12px 0' }}>
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
    </div>
  );
}

export default ChatPage;
