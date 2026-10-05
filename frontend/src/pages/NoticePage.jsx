import React from 'react';
import { NOTICES, NOTICE_TEXT } from '../data/noticeData.js';

function NoticePage({ lang = 'ko' }) {
  const t = NOTICE_TEXT[lang] || NOTICE_TEXT.ko;
  const pick = (field) => field[lang] || field.ko;

  return (
    <div data-screen-label="11 Notices" style={{ maxWidth: '860px', width: '100%', margin: '0 auto', padding: '48px clamp(20px,5vw,48px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.12em' }}>{t.eyebrow}</span>
        <h1 style={{ margin: 0, font: "500 clamp(30px,4vw,44px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>{t.title}</h1>
      </div>
      {NOTICES.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{t.empty}</span>
          <span style={{ fontSize: '13px', color: 'var(--faint)' }}>{t.emptyHint}</span>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
          {NOTICES.map((n, i) => (
            <details key={n.id} style={{ borderTop: i ? '1px solid var(--line2)' : 0, padding: '16px 20px' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
                <span>{pick(n.title)}</span>
                <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)', flex: 'none' }}>{n.date}</span>
              </summary>
              <p style={{ margin: '12px 0 0', fontSize: '14px', lineHeight: 1.7, color: 'var(--ink2)', whiteSpace: 'pre-line' }}>{pick(n.body)}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default NoticePage;
