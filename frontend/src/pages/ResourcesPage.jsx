import React, { useState } from 'react';
import { RESOURCES, RESOURCE_TEXT, resourceFileName, resourceFormat } from '../data/resourcesData.js';
import '../styles/resources.css';

const DocIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></svg>
);
const AudioIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
);
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
);

function ResourceCard({ item, L, t }) {
  const pick = (v) => (v && typeof v === 'object' ? (L ? v.ko : v.en) || v.ko || v.en : v || '');
  const isAudio = item.type === 'audio';
  const format = resourceFormat(item.file);
  const meta = [pick(item.level), format, item.size, isAudio ? item.duration : null].filter(Boolean);
  return (
    <article className={`res-card ${isAudio ? 'is-audio' : 'is-doc'}`}>
      <div className="res-card-icon">{isAudio ? <AudioIcon /> : <DocIcon />}</div>
      <div className="res-card-body">
        <h3 className="res-card-title">{pick(item.title)}</h3>
        {!!pick(item.desc) && <p className="res-card-desc">{pick(item.desc)}</p>}
        {meta.length > 0 && (
          <div className="res-card-meta">
            {meta.map((m) => <span key={m}>{m}</span>)}
            {!!item.updated && <span className="res-card-date">{t.updated} {item.updated}</span>}
          </div>
        )}
        {isAudio && <audio className="res-card-audio" src={item.file} controls preload="none" />}
      </div>
      <div className="res-card-actions">
        {!isAudio && <a className="res-btn" href={item.file} target="_blank" rel="noopener noreferrer">{t.open}</a>}
        <a className="res-btn res-btn--primary" href={item.file} download={resourceFileName(item.file)}><DownloadIcon /> {t.download}</a>
      </div>
    </article>
  );
}

// 자료실: 학습 문서(열기·다운로드)와 MP3(바로 듣기·다운로드). 항목은 data/resourcesData.js 의 RESOURCES.
function ResourcesPage({ lang = 'ko', items = RESOURCES }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = RESOURCE_TEXT[lang] || RESOURCE_TEXT.ko;
  const [filter, setFilter] = useState('all');
  const counts = { all: items.length, doc: items.filter((i) => i.type !== 'audio').length, audio: items.filter((i) => i.type === 'audio').length };
  const shown = filter === 'all' ? items : items.filter((i) => (filter === 'audio' ? i.type === 'audio' : i.type !== 'audio'));

  return (
    <div className="res-screen" data-screen-label="12 Resources">
      <header className="res-head">
        <span className="res-eyebrow">{t.eyebrow}</span>
        <h1 className="res-title">{t.title}</h1>
        <p className="res-desc">{t.desc}</p>
      </header>

      <div className="res-filters" role="tablist" aria-label={t.title}>
        {['all', 'doc', 'audio'].map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
            {t[f]} <span className="res-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <div className="res-list">
          {shown.map((item) => <ResourceCard key={item.id} item={item} L={L} t={t} />)}
        </div>
      ) : (
        <div className="res-empty">
          <span className="res-empty-title">{items.length ? t.emptyFilter : t.empty}</span>
          {!items.length && <span className="res-empty-hint">{t.emptyHint}</span>}
        </div>
      )}
    </div>
  );
}

export default ResourcesPage;
