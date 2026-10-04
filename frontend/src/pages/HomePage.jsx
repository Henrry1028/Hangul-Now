import React from 'react';
import { TUTORS } from '../data/tutorsData.js';
import {
  HOME_DAYS,
  HOME_FEATURES,
  HOME_PLAN,
  HOME_TEXT,
  JIWOO_LAST_MESSAGE_TIME,
  formatTime
} from '../data/homeData.js';
import '../styles/home.css';

const cardStyle = { background: 'var(--card)', border: '1px solid var(--line)' };
const hubCharStyle = { width: '82px', filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.22))', transition: 'transform .3s ease' };

// Legacy hub images set their transform inline on mouseover/mouseout, which also overrides
// the global character-image transform rule.
const setTransform = (transform) => (event) => {
  event.currentTarget.style.transform = transform;
};

function HomePage({ lang = 'ko', selectedTutorId = 'jiwoo', showRomanization = true, onNavigate, onSelectTutor }) {
  const L = lang === 'ko' ? 1 : 0;
  const t = HOME_TEXT[lang] || HOME_TEXT.en;
  const tutor = TUTORS.find((item) => item.id === selectedTutorId) || TUTORS[0];
  const tutorName = L ? tutor.ko : tutor.en;
  const continueChat = L ? `${tutorName} 튜터와 이어서 대화하기` : `Continue chat with ${tutorName}`;

  const navigate = (target) => () => {
    if (typeof onNavigate === 'function') onNavigate(target);
  };
  // Legacy selectTutor: select the tutor, then open Chat.
  const openTutor = (id) => () => {
    if (typeof onSelectTutor === 'function') onSelectTutor(id);
    if (typeof onNavigate === 'function') onNavigate('chat');
  };

  const plan = HOME_PLAN.map(([target, glyph, title, sub, min, done]) => ({
    target,
    glyph,
    title: target === 'chat'
      ? [tutor.en ? `Reply to ${tutor.en}` : 'Reply to Tutor', `${tutorName}에게 답장하기`][L]
      : title[L],
    sub: sub[L],
    min: min + (L ? '분' : ' min'),
    go: target === 'chat' ? openTutor(selectedTutorId) : navigate(target),
    done
  }));

  return (
    <div className="home-screen" data-screen-label="02 Today">
      <div style={{ background: 'linear-gradient(135deg, rgba(35,73,63,0.08) 0%, rgba(200,94,62,0.09) 100%)', border: '1.5px solid var(--accent)', borderRadius: '20px', padding: '24px clamp(16px,3vw,28px)', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(35,73,63,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '660px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: '#F5F2EB', padding: '4px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, marginBottom: '10px' }}>
              <span>✨ 처음 오셨나요? (Welcome to Hangul Now!)</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(19px,2.2vw,25px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Hangul Now의 4대 핵심 AI 기능을 바로 체험해 보세요</h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink2)', lineHeight: 1.5 }}>카카오톡 스타일의 AI 메신저 대화, 실시간 문법 교정 카드, 한글 자모 블록 글자 조합, 음절별 발음 코칭을 원클릭으로 시작할 수 있습니다.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/캐릭터-정이.png"
              alt="Jeongie"
              style={{ ...hubCharStyle, transform: 'rotate(5deg)' }}
              onMouseOver={setTransform('rotate(8deg) scale(1.06)')}
              onMouseOut={setTransform('rotate(5deg)')}
            />
            <img
              src="/assets/캐릭터_훈이.png"
              alt="Hunie"
              style={{ ...hubCharStyle, transform: 'rotate(-5deg)' }}
              onMouseOver={setTransform('rotate(-8deg) scale(1.06)')}
              onMouseOut={setTransform('rotate(-5deg)')}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '12px', marginTop: '20px', position: 'relative', zIndex: 2 }}>
          {HOME_FEATURES.map((feature) => (
            <div
              key={feature.target}
              className="home-feature-card"
              onClick={feature.target === 'jiwoo' ? openTutor('jiwoo') : navigate(feature.target)}
              style={{ ...cardStyle, borderRadius: '14px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '22px' }}>{feature.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, background: feature.badgeBg, color: feature.badgeFg, padding: '2px 7px', borderRadius: '5px' }}>{feature.badge}</span>
                </div>
                <h3 style={{ margin: '0 0 5px', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>{feature.title}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink2)', lineHeight: 1.45 }}>{feature.desc}</p>
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{feature.cta}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '14px', color: 'var(--faint)' }}>{t.homeDate}</span>
          <h1 style={{ margin: 0, font: "500 clamp(30px,3.4vw,40px)/1.15 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>
            {t.homeHello} <span style={{ font: "400 .6em 'Gowun Batang',serif", color: 'var(--faint)' }}>{t.homeHelloSub}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span style={{ fontWeight: 600 }}>{t.levelFrom}</span><span style={{ color: 'var(--faint)' }}>64%</span></div>
          <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: '64%', height: '100%', background: 'var(--accent)' }} /></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '20px' }}>
        <div style={{ ...cardStyle, borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}><h2 style={{ margin: 0, fontSize: '18px' }}>{t.planH}</h2><span style={{ fontSize: '13px', color: 'var(--faint)' }}>{t.planMeta}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {plan.map((item) => (
              <button key={item.target} type="button" onClick={item.go} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 4px', border: 0, borderTop: '1px solid var(--line2)', background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', border: `1.5px solid ${item.done ? 'var(--accent)' : 'var(--line3)'}`, background: item.done ? 'var(--accent)' : 'transparent', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '12px', flex: 'none' }}>{item.done ? '✓' : ''}</span>
                <span style={{ font: "700 18px 'Gowun Batang',serif", color: 'var(--accent-ink)', width: '24px' }}>{item.glyph}</span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: item.done ? 'var(--faint)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.title}</span>
                  <span style={{ fontSize: '13px', color: 'var(--faint)' }}>{item.sub}</span>
                </span>
                <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{item.min}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#23493F', color: '#F5F2EB', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
            <img src="/assets/캐릭터-정이.png" alt="" style={{ position: 'absolute', right: '-10px', bottom: '-12px', width: '120px', pointerEvents: 'none' }} />
            <span style={{ font: "500 11px 'IBM Plex Mono',monospace", letterSpacing: '.12em', color: '#A9C1B6' }}>{t.exprLabel}</span>
            <span style={{ font: "700 34px/1.3 'Gowun Batang',serif" }}>밥 먹었어요?</span>
            {showRomanization && <span style={{ font: "400 13px 'IBM Plex Mono',monospace", color: '#A9C1B6' }}>bap meo-geo-sseo-yo?</span>}
            <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: '#DCE5E0', maxWidth: 'calc(100% - 100px)' }}>{t.exprDesc}</p>
            <button type="button" onClick={navigate('speaking')} style={{ alignSelf: 'flex-start', border: 0, background: '#F5F2EB', color: '#23493F', padding: '9px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t.exprBtn}</button>
          </div>
          <div style={{ ...cardStyle, borderRadius: '18px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>{t.streakT}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {HOME_DAYS.map((day, index) => (
                  <div key={day[0]} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '7px', background: index < 6 ? 'var(--accent)' : 'transparent', border: `1px solid ${index < 6 ? 'var(--accent)' : 'var(--line3)'}` }} />
                    <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{L ? day[1] : day[0][0]}</span>
                  </div>
                ))}
              </div>
            </div>
            <span style={{ font: "500 52px 'Newsreader',serif", color: 'var(--hot)' }}>12</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '20px' }}>
        <button type="button" onClick={openTutor('jiwoo')} style={{ background: 'var(--chat)', border: 0, borderRadius: '18px', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--chat-ink)' }}>{continueChat}</span><span style={{ fontSize: '12px', color: 'var(--chat-ink)' }}>{formatTime(JIWOO_LAST_MESSAGE_TIME, L)}</span></div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '15px', background: '#E9C2A6', color: '#1C1F1E', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 700, flex: 'none' }}>지우</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '13px', fontWeight: 600 }}>{t.mockName}</span><span style={{ background: 'var(--tbubble)', padding: '9px 12px', borderRadius: '4px 14px 14px 14px', fontSize: '14.5px', lineHeight: 1.5, color: 'var(--ink)' }}>참, 한강에서 치킨 먹는 걸 “치맥”이라고 해요.</span></div>
          </div>
        </button>
        <button type="button" onClick={navigate('record')} style={{ ...cardStyle, borderRadius: '18px', padding: '22px 24px', display: 'flex', gap: '14px', cursor: 'pointer', textAlign: 'left', alignItems: 'center', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hot)' }}>{t.reviewLabel}</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{t.reviewT}</span>
            <span style={{ fontSize: '14px', color: 'var(--sub)', lineHeight: 1.5 }}>{t.reviewP}</span>
          </div>
          <img src="/assets/캐릭터_훈이.png" alt="" style={{ width: '120px', flex: 'none', margin: '-10px -8px -24px 0' }} />
        </button>
      </div>
    </div>
  );
}

export default HomePage;
