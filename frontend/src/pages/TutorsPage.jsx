import React, { useState, useEffect } from 'react';
import { TUTORS, TAGS, TUTORS_TEXT } from '../data/tutorsData.js';
import '../styles/tutors.css';

function TutorsPage({
  lang = 'ko',
  selectedTutorId = 'jiwoo',
  onSelectTutor,
  onNavigate
}) {
  const [filter, setFilter] = useState('all');
  const [playingTutorId, setPlayingTutorId] = useState(null);
  const currentAudioRef = React.useRef(null);

  const L = lang === 'ko' ? 1 : 0;
  const t = TUTORS_TEXT[lang] || TUTORS_TEXT.ko;

  // 컴포넌트 unmount 시 재생 중인 오디오 중단
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // 튜터 고품질 원어민 음성 인사말 재생 핸들러
  const handlePlayGreeting = async (e, tu) => {
    e.stopPropagation();

    // 현재 재생 중인 튜터를 다시 누르면 멈춤
    if (playingTutorId === tu.id) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setPlayingTutorId(null);
      return;
    }

    // 기존 재생 중인 다른 튜터 오디오 중단
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setPlayingTutorId(tu.id);

    try {
      const audioPath = tu.audio || `/assets/tutors/audio/${tu.id}.wav`;
      const audio = new Audio(audioPath);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingTutorId((prev) => (prev === tu.id ? null : prev));
        currentAudioRef.current = null;
      };

      audio.onerror = (err) => {
        console.error('Audio playback error:', err);
        setPlayingTutorId((prev) => (prev === tu.id ? null : prev));
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('Audio play failed:', err);
      setPlayingTutorId(null);
    }
  };

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
    <div className="tutors-screen" data-screen-label="03 Tutors">
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

      {/* 2x2 튜터 카드 그리드 */}
      <div className="tutors-grid">
        {tutorList.map((tu) => (
          <div
            key={tu.id}
            style={{
              background: 'var(--card)',
              border: tu.cardBd,
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
              position: 'relative'
            }}
          >
            {tu.isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  boxShadow: '0 2px 8px rgba(35,73,63,0.2)'
                }}
              >
                {t.myTutorBadge}
              </div>
            )}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 'none' }}>
                <div
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '26px',
                    background: tu.color,
                    color: '#1C1F1E',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '22px',
                    overflow: 'hidden',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                    border: '2px solid var(--line)'
                  }}
                >
                  {tu.photo ? (
                    <img
                      src={tu.photo}
                      alt={tu.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    tu.initial
                  )}
                </div>
                <span
                  style={{
                    position: 'absolute',
                    right: '-3px',
                    bottom: '-3px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: tu.genderBg,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                    border: '2.5px solid var(--card)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                  }}
                >
                  {tu.genderSymbol}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em' }}>{tu.name}</span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: 'var(--chip)',
                      color: 'var(--sub)',
                      fontWeight: 600
                    }}
                  >
                    {tu.genderLabel}
                  </span>
                  {/* 튜터 인사말 목소리 재생 버튼 */}
                  <button
                    type="button"
                    className={`tutor-voice-btn ${playingTutorId === tu.id ? 'is-playing' : ''}`}
                    onClick={(e) => handlePlayGreeting(e, tu)}
                    title={playingTutorId === tu.id ? (L ? '음성 멈추기' : 'Stop voice') : (L ? '튜터 인사말 듣기' : 'Listen to greeting voice')}
                    aria-label={L ? `${tu.name} 튜터 인사말 듣기` : `Listen to ${tu.name}'s greeting voice`}
                  >
                    {playingTutorId === tu.id ? (
                      <span style={{ fontSize: '13px' }}>⏹</span>
                    ) : (
                      <span style={{ fontSize: '16px' }} role="img" aria-label="speaker">🔊</span>
                    )}
                  </button>
                </div>
                <span style={{ fontSize: '14px', color: 'var(--sub)', fontWeight: 500 }}>{tu.role}</span>
                {playingTutorId === tu.id && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-ink)', fontWeight: 600, marginTop: '2px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                    <span>{L ? '인사말 들려주는 중...' : 'Playing greeting...'}</span>
                  </div>
                )}
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
