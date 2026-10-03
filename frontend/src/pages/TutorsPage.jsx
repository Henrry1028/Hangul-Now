import React, { useState } from 'react';
import { TUTORS, TAGS, TUTORS_TEXT } from '../data/tutorsData.js';

function TutorsPage({
  lang = 'ko',
  selectedTutorId = 'jiwoo',
  onSelectTutor,
  onNavigate
}) {
  const [filter, setFilter] = useState('all');

  const L = lang === 'ko' ? 1 : 0;
  const t = TUTORS_TEXT[lang] || TUTORS_TEXT.ko;

  const filterKeys = ['all', 'daily', 'business', 'topik', 'pron', 'beginner'];
  const filters = filterKeys.map((key) => {
    const label = key === 'all' ? t.filterAll : (TAGS[key] ? TAGS[key][L] : key);
    const active = filter === key;
    return {
      key,
      label,
      active
    };
  });

  const tutorList = TUTORS.filter((tu) => filter === 'all' || tu.tags.includes(filter)).map((tu) => {
    const isSelected = tu.id === selectedTutorId;
    const name = lang === 'ko' ? tu.ko : tu.en;
    const role = tu.role[L];
    const pace = tu.pace[L];
    const quote = tu.quote[L];
    const genderLabel = lang === 'ko' ? tu.genderKo : (tu.gender === 'female' ? t.female : t.male);
    const genderSymbol = tu.gender === 'female' ? '♀' : '♂';
    const genderBg = tu.gender === 'female' ? '#E06B82' : '#4B7BEC';
    const tagLabels = tu.tags.map((k) => (TAGS[k] ? TAGS[k][L] : k));
    const status = (tu.online ? t.onlinePrefix : t.offlinePrefix) + pace;
    const btnLabel = isSelected ? t.btnSelected : t.btnSelect;
    const btnBg = isSelected ? 'var(--solid)' : 'var(--accent)';
    const cardBd = isSelected ? '2px solid var(--accent)' : '1px solid var(--line)';

    return {
      ...tu,
      name,
      role,
      pace,
      quote,
      genderLabel,
      genderSymbol,
      genderBg,
      tagLabels,
      status,
      isSelected,
      btnLabel,
      btnBg,
      cardBd
    };
  });

  const handleSelectTutor = (id) => () => {
    if (typeof onSelectTutor === 'function') {
      onSelectTutor(id);
    }
    if (typeof onNavigate === 'function') {
      onNavigate('chat');
    }
  };

  return (
    <div
      className="tutors-screen"
      data-screen-label="03 Tutors"
      style={{
        maxWidth: '1120px',
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(20px,4vw,40px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1
          style={{
            margin: 0,
            font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif",
            letterSpacing: '-.02em'
          }}
        >
          {t.tutorsH1}
        </h1>
        <p style={{ margin: 0, color: 'var(--sub)' }}>{t.tutorsP}</p>
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {filters.map((f) => {
          const bg = f.active ? 'var(--solid)' : 'var(--card)';
          const fg = f.active ? 'var(--on-solid)' : 'var(--ink2)';
          const bd = f.active ? 'var(--solid)' : 'var(--line)';

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                border: `1px solid ${bd}`,
                background: bg,
                color: fg,
                padding: '8px 14px',
                borderRadius: '999px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 튜터 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))',
          gap: '18px'
        }}
      >
        {tutorList.map((tu) => (
          <div
            key={tu.id}
            style={{
              background: 'var(--card)',
              border: tu.cardBd,
              borderRadius: '18px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              position: 'relative'
            }}
          >
            {tu.isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}
              >
                {t.myTutorBadge}
              </div>
            )}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 'none' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '22px',
                    background: tu.color,
                    color: '#1C1F1E',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '16px'
                  }}
                >
                  {tu.initial}
                </div>
                <span
                  style={{
                    position: 'absolute',
                    right: '-2px',
                    bottom: '-2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: tu.genderBg,
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                    border: '2px solid var(--card)'
                  }}
                >
                  {tu.genderSymbol}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700 }}>{tu.name}</span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.06)',
                      fontWeight: 600
                    }}
                  >
                    {tu.genderLabel}
                  </span>
                </div>
                <span style={{ fontSize: '13.5px', color: 'var(--sub)' }}>{tu.role}</span>
              </div>
            </div>
            <p
              style={{
                margin: 0,
                font: "400 16px/1.55 'Newsreader','Gowun Batang',serif",
                color: 'var(--ink2)',
                minHeight: '50px'
              }}
            >
              “{tu.quote}”
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tu.tagLabels.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'var(--chip)',
                    color: 'var(--ink2)',
                    fontSize: '12px',
                    padding: '4px 9px',
                    borderRadius: '6px'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--line2)',
                paddingTop: '14px',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '12.5px', color: 'var(--faint)' }}>{tu.status}</span>
              <button
                onClick={handleSelectTutor(tu.id)}
                style={{
                  border: 0,
                  background: tu.btnBg,
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flex: 'none'
                }}
              >
                {tu.btnLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TutorsPage;
