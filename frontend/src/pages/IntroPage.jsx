import React, { useState, useEffect } from 'react';
import { INTRO_TEXT, MOCKS, SKILLS, STEPS, TUTORS_INTRO } from '../data/introContent.js';

function IntroPage({ lang = 'ko', onNavigate }) {
  const [mockIdx, setMockIdx] = useState(0);
  const [mockOn, setMockOn] = useState(true);

  useEffect(() => {
    let mockTt = null;
    const mockIv = setInterval(() => {
      setMockOn(false);
      mockTt = setTimeout(() => {
        setMockIdx((prev) => prev + 1);
        setMockOn(true);
      }, 380);
    }, 4200);

    return () => {
      clearInterval(mockIv);
      if (mockTt) clearTimeout(mockTt);
    };
  }, []);

  const L = lang === 'ko' ? 1 : 0;
  const t = INTRO_TEXT[lang] || INTRO_TEXT.ko;
  const curMock = MOCKS[mockIdx % MOCKS.length];
  const mock = {
    ...curMock,
    role: curMock.role[L],
    rule: curMock.rule[L]
  };

  const skillList = SKILLS.map((k) => ({
    glyph: k.glyph,
    no: k.no,
    name: k.name[L],
    ko: k.ko[L],
    desc: k.desc[L]
  }));

  const stepList = STEPS[lang] || STEPS.ko;

  const tutorList = TUTORS_INTRO.map((tu) => ({
    initial: tu.initial,
    color: tu.color,
    name: tu.name[lang] || tu.name.ko,
    role: tu.role[lang] || tu.role.ko,
    quote: tu.quote[lang] || tu.quote.ko
  }));

  const handleNav = (target) => () => {
    if (typeof onNavigate === 'function') {
      onNavigate(target);
    }
  };

  return (
    <div data-screen-label="01 Landing">
      {/* 🌟 Hero Section */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: '56px', alignItems: 'center', padding: '72px clamp(20px,5vw,64px) 88px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <span style={{ font: "400 17px 'Gowun Batang',serif", color: 'var(--hot)' }}>{t.heroEyebrow}</span>
          <h1 style={{ margin: 0, font: "500 clamp(44px,5.8vw,76px)/1.06 'Newsreader','Gowun Batang',serif", letterSpacing: '-.025em', textWrap: 'balance' }}>{t.heroH1}</h1>
          <p style={{ margin: 0, maxWidth: '520px', fontSize: '18px', lineHeight: 1.65, color: 'var(--ink2)', textWrap: 'pretty' }}>{t.heroP}</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleNav('tutors')} style={{ border: 0, background: 'var(--accent)', color: '#fff', padding: '16px 26px', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>{t.ctaTutor}</button>
            <button onClick={handleNav('home')} style={{ border: '1px solid var(--ink)', background: 'transparent', color: 'var(--ink)', padding: '16px 22px', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>{t.ctaLevel}</button>
          </div>
          <span style={{ fontSize: '13.5px', color: 'var(--faint)' }}>{t.heroNote}</span>
        </div>
        <div style={{ position: 'relative', justifySelf: 'center', width: 'min(100%,380px)', marginTop: '40px' }}>
          <div style={{ background: 'var(--chat)', borderRadius: '30px', padding: '18px 14px 20px', boxShadow: '0 30px 60px -30px rgba(0,0,0,.35)', border: '8px solid #1C1F1E', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>{t.mockName}</span>
              <span style={{ fontSize: '11px', color: 'var(--chat-ink)' }}>{mock.role}</span>
            </div>
            <div className="mock-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', lineHeight: 1.5, minHeight: '250px', opacity: mockOn ? 1 : 0, transform: `translateY(${mockOn ? '0' : '8px'})` }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '13px', background: '#E9C2A6', color: '#1C1F1E', flex: 'none', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>지우</div>
                <div style={{ background: 'var(--tbubble)', padding: '9px 12px', borderRadius: '4px 14px 14px 14px', maxWidth: '78%' }}>{mock.q}</div>
              </div>
              <div style={{ alignSelf: 'flex-end', background: 'var(--bubble)', color: '#1C1F1E', padding: '9px 12px', borderRadius: '14px 4px 14px 14px', maxWidth: '80%' }}>
                {mock.pre}<span style={{ textDecoration: 'line-through', color: '#8a6d00' }}>{mock.wrong}</span>{mock.post}
              </div>
              <div style={{ alignSelf: 'flex-end', background: 'var(--tbubble)', borderRadius: '12px', padding: '10px 12px', maxWidth: '86%', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(0,0,0,.06)' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-ink)', fontSize: '11px', letterSpacing: '.06em' }}>{t.correction}</span>
                <span>{mock.pre}<b style={{ color: 'var(--accent-ink)' }}>{mock.right}</b>{mock.post}</span>
                <span style={{ color: 'var(--sub)' }}>{mock.rule}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', flex: 'none' }}></div>
                <div style={{ background: 'var(--tbubble)', padding: '9px 12px', borderRadius: '14px', maxWidth: '78%' }}>{mock.reply}</div>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: '100px' }}>
            <div className="hun-walk" role="img" aria-label="Hunie">
              <img className="hun-pose tea" src="/assets/훈이_tea.png" alt="" />
              <img className="hun-pose pencil" src="/assets/훈이_pencil.png" alt="" />
              <img className="hun-pose sway" src="/assets/훈이_book.png" alt="" />
              <img className="hun-pose scroll" src="/assets/훈이_scroll.png" alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 처음 접속한 사용자를 위한 4대 핵심 AI 기능 쇼케이스 허브 */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '10px clamp(20px,5vw,64px) 50px', width: '100%' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(35,73,63,0.06) 0%, rgba(200,80,42,0.06) 100%)', border: '1px solid var(--line)', borderRadius: '24px', padding: 'clamp(24px,3.5vw,36px)', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.04)' }}>
          {/* 상단 헤더 & 배지 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '760px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: '#F5F2EB', padding: '4px 12px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 600, width: 'fit-content' }}>
                <span>✨</span>
                <span>처음 오셨나요? 지금 바로 Hangul Now의 4대 핵심 AI 기능을 무료로 체험해 보세요</span>
              </div>
              <h2 style={{ margin: 0, font: "600 clamp(22px,2.6vw,32px)/1.25 'Newsreader','Gowun Batang',serif", color: 'var(--ink)' }}>
                실시간 AI 대화부터 자모 조합 쓰기, 발음 코칭, 형태소 독해까지
              </h2>
              <p style={{ margin: 0, color: 'var(--sub)', fontSize: '15px', lineHeight: 1.6 }}>
                원어민 수준의 자연스러운 대화와 훈민정음 창제 원리 블록, 음절별 AI 발음 분석 및 Kiwi 형태소 엔진을 즉시 경험하세요.
              </p>
            </div>
          </div>

          {/* 4대 기능 인터랙티브 카드 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,245px),1fr))', gap: '16px' }}>
            {/* 카드 1: AI 튜터 실시간 대화 & 교정 */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', transition: 'transform .2s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>💬</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, background: 'rgba(35,73,63,0.12)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '6px' }}>실시간 메신저</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>AI 튜터 대화 & 교정</h3>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--sub)', lineHeight: 1.55 }}>원어민 AI 튜터와 일상 대화를 나누며 틀린 문장을 메신저 안에서 실시간으로 다정하게 교정받아요.</p>
              </div>
              <button onClick={handleNav('chat')} style={{ border: 0, background: 'var(--accent)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                <span>지우와 대화하기</span>
                <span>→</span>
              </button>
            </div>

            {/* 카드 2: 훈민정음 자모 조합 쓰기 */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', transition: 'transform .2s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>🧩</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, background: 'rgba(200,80,42,0.12)', color: 'var(--hot)', padding: '2px 8px', borderRadius: '6px' }}>초·중·종성 조합</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>한글 글자 조합 쓰기</h3>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--sub)', lineHeight: 1.55 }}>훈민정음 원리 그대로 자모 블록을 결합해 글자를 만들고, 짧은 문장을 써서 AI 문법 첨삭을 받아요.</p>
              </div>
              <button onClick={handleNav('writing')} style={{ border: 0, background: 'var(--hot)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                <span>자모 쓰기 체험</span>
                <span>→</span>
              </button>
            </div>

            {/* 카드 3: 음절별 AI 발음 코칭 */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', transition: 'transform .2s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>🎙️</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, background: 'rgba(155,139,191,0.18)', color: '#6B539A', padding: '2px 8px', borderRadius: '6px' }}>정밀 음절 분석</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>음절별 발음 코칭</h3>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--sub)', lineHeight: 1.55 }}>원어민 발음을 듣고 따라 말하면, 음절 단위 정확도 점수와 연음·받침 맞춤 교정 팁을 제공합니다.</p>
              </div>
              <button onClick={handleNav('speaking')} style={{ border: 0, background: '#6B539A', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                <span>발음 평가 체험</span>
                <span>→</span>
              </button>
            </div>

            {/* 카드 4: Kiwi 스마트 형태소 독해 */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', transition: 'transform .2s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>📖</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, background: 'rgba(201,162,74,0.18)', color: '#8F6C1A', padding: '2px 8px', borderRadius: '6px' }}>Kiwi NLP 품사분석</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>스마트 형태소 독해</h3>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--sub)', lineHeight: 1.55 }}>문장 속 모르는 단어를 누르면 품사 태그, 기본형, 영문 사전 뜻풀이가 팝업으로 즉각 나타납니다.</p>
              </div>
              <button onClick={handleNav('reading')} style={{ border: 0, background: '#8F6C1A', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                <span>독해 연습 시작</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 4대 스킬 섹션 */}
      <section id="how" style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px clamp(20px,5vw,64px)', display: 'flex', flexDirection: 'column', gap: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, font: "500 clamp(32px,3.8vw,48px)/1.12 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em', maxWidth: '640px' }}>{t.howH2}</h2>
            <p style={{ margin: 0, maxWidth: '400px', color: 'var(--sub)', lineHeight: 1.6 }}>{t.howP}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', borderTop: '1px solid var(--ink)' }}>
            {skillList.map((s) => (
              <div key={s.no} style={{ padding: '28px 24px 32px 0', display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ font: "700 56px/1 'Gowun Batang',serif", color: 'var(--accent-ink)' }}>{s.glyph}</span>
                  <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)' }}>{s.no}</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {s.name} <span style={{ fontWeight: 400, color: 'var(--faint)', fontSize: '14px', fontFamily: "'Gowun Batang',serif" }}>{s.ko}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--ink2)', lineHeight: 1.6, fontSize: '15px', textWrap: 'pretty' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌟 3단계 학습 프로세스 */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '40px' }}>
        {stepList.map((st) => (
          <div key={st.n} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)' }}>STEP {st.n}</span>
            <h3 style={{ margin: 0, font: "500 26px 'Newsreader','Gowun Batang',serif" }}>{st.t}</h3>
            <p style={{ margin: 0, color: 'var(--sub)', lineHeight: 1.6 }}>{st.p}</p>
          </div>
        ))}
      </section>

      {/* 🌟 훈이와 정이 소개 */}
      <section style={{ background: 'var(--bg2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px clamp(20px,5vw,64px)', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
            <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.1em' }}>{t.guidesEyebrow}</span>
            <h2 style={{ margin: 0, font: "500 clamp(32px,3.8vw,48px)/1.12 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>{t.guidesH2}</h2>
            <p style={{ margin: 0, color: 'var(--sub)', lineHeight: 1.6 }}>{t.guidesP}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: '24px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '24px', padding: '28px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <img src="/assets/캐릭터_훈이.png" alt="Hunie" style={{ width: '170px', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ font: "700 26px 'Gowun Batang',serif" }}>{t.hunName}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-ink)' }}>{t.hunRole}</span>
                <p style={{ margin: 0, color: 'var(--ink2)', lineHeight: 1.6, fontSize: '15px' }}>{t.hunDesc}</p>
              </div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '24px', padding: '28px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <img src="/assets/캐릭터-정이.png" alt="Jeongie" style={{ width: '170px', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ font: "700 26px 'Gowun Batang',serif" }}>{t.jeongName}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hot)' }}>{t.jeongRole}</span>
                <p style={{ margin: 0, color: 'var(--ink2)', lineHeight: 1.6, fontSize: '15px' }}>{t.jeongDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 튜터 프리뷰 */}
      <section id="tutors" style={{ background: '#23493F', color: '#F5F2EB' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px clamp(20px,5vw,64px)', display: 'flex', flexDirection: 'column', gap: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, font: "500 clamp(32px,3.8vw,48px)/1.12 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em' }}>{t.tutorsH2}</h2>
            <button onClick={handleNav('tutors')} style={{ border: '1px solid #F5F2EB', background: 'transparent', color: '#F5F2EB', padding: '12px 20px', borderRadius: '999px', fontSize: '14px', cursor: 'pointer' }}>{t.seeAll}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: '16px' }}>
            {tutorList.map((tu) => (
              <div key={tu.initial} style={{ background: 'rgba(245,242,235,.07)', border: '1px solid rgba(245,242,235,.16)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: tu.color, color: '#1C1F1E', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{tu.initial}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700 }}>{tu.name}</span>
                  <span style={{ fontSize: '13px', color: '#C9D5CF' }}>{tu.role}</span>
                </div>
                <p style={{ margin: 0, font: "400 16px/1.5 'Newsreader','Gowun Batang',serif", color: '#E9E4D8' }}>“{tu.quote}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌟 Final CTA */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '88px clamp(20px,5vw,64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
          <img src="/assets/캐릭터_훈이.png" alt="" style={{ width: '110px' }} />
          <img src="/assets/캐릭터-정이.png" alt="" style={{ width: '110px' }} />
        </div>
        <h2 style={{ margin: 0, font: "500 clamp(34px,4.4vw,56px)/1.14 'Newsreader','Gowun Batang',serif", letterSpacing: '-.02em', textWrap: 'balance' }}>{t.finalH2}</h2>
        <button onClick={handleNav('tutors')} style={{ border: 0, background: 'var(--hot)', color: '#fff', padding: '18px 32px', borderRadius: '12px', fontSize: '17px', fontWeight: 600, cursor: 'pointer' }}>{t.startFree2}</button>
      </section>

      {/* 🌟 Intro Dedicated Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '24px clamp(20px,5vw,64px)', fontSize: '13px', color: 'var(--faint)', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <span>© 2026 Hangul Now</span>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={handleNav('about')} style={{ border: 0, background: 'none', color: 'var(--faint)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>{t.navAbout}</button>
          <span>{t.footerLinks}</span>
        </div>
      </footer>
    </div>
  );
}

export default IntroPage;
