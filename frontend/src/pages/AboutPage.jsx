import React from 'react';
import { ABOUT_TEXT, PRINCIPLES } from '../data/aboutContent.js';

function AboutPage({ lang = 'ko', onNavigate }) {
  const t = ABOUT_TEXT[lang] || ABOUT_TEXT.ko;
  const principleList = PRINCIPLES[lang] || PRINCIPLES.ko;

  const handleNav = (target) => () => {
    if (typeof onNavigate === 'function') {
      onNavigate(target);
    }
  };

  return (
    <div data-screen-label="10 About us">
      {/* 🌟 1. 비전 & 소개 섹션 */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px clamp(20px,5vw,64px) 64px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: '48px', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)', letterSpacing: '.12em' }}>{t.aboutEyebrow}</span>
          <h1 style={{ margin: 0, font: "500 clamp(40px,5vw,66px)/1.08 'Newsreader','Gowun Batang',serif", letterSpacing: '-.025em', textWrap: 'balance' }}>{t.aboutH1}</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '17px', lineHeight: 1.7, color: 'var(--ink2)' }}>
          <p style={{ margin: 0, textWrap: 'pretty' }}>{t.aboutP1}</p>
          <p style={{ margin: 0, textWrap: 'pretty' }}>{t.aboutP2}</p>
        </div>
      </section>

      {/* 🌟 2. 도우미 이름의 유래 (훈민정음) 섹션 */}
      <section style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '72px clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: '48px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 0, position: 'relative' }}>
            <span style={{ position: 'absolute', inset: 'auto 0 12% 0', textAlign: 'center', font: "700 clamp(90px,12vw,150px)/1 'Gowun Batang',serif", color: 'var(--line2)', letterSpacing: '.02em', zIndex: 0 }}>훈민정음</span>
            <img src="/assets/캐릭터_훈이.png" alt="Hunie" style={{ width: 'min(46%,220px)', position: 'relative', zIndex: 1 }} />
            <img src="/assets/캐릭터-정이.png" alt="Jeongie" style={{ width: 'min(46%,220px)', position: 'relative', zIndex: 1 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--faint)', letterSpacing: '.12em' }}>{t.originLabel}</span>
            <h2 style={{ margin: 0, font: "500 clamp(28px,3.2vw,40px)/1.2 'Newsreader','Gowun Batang',serif" }}>{t.originH}</h2>
            <p style={{ margin: 0, color: 'var(--ink2)', lineHeight: 1.7, fontSize: '16px', textWrap: 'pretty' }}>{t.originP}</p>
          </div>
        </div>
      </section>

      {/* 🌟 3. 우리가 믿는 것 (3가지 학습 원칙) 섹션 */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px clamp(20px,5vw,64px)', display: 'flex', flexDirection: 'column', gap: '36px' }}>
        <h2 style={{ margin: 0, font: "500 clamp(28px,3.2vw,40px)/1.2 'Newsreader','Gowun Batang',serif" }}>{t.princH}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', borderTop: '1px solid var(--ink)' }}>
          {principleList.map((pr) => (
            <div key={pr.n} style={{ padding: '26px 28px 30px 0', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ font: "500 12px 'IBM Plex Mono',monospace", color: 'var(--hot)' }}>0{pr.n}</span>
              <span style={{ fontSize: '19px', fontWeight: 700 }}>{pr.t}</span>
              <p style={{ margin: 0, color: 'var(--sub)', lineHeight: 1.65, fontSize: '15px' }}>{pr.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 4. 문의처 (Contact) 섹션 */}
      <section style={{ background: '#23493F', color: '#F5F2EB' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '72px clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ margin: 0, font: "500 clamp(28px,3.2vw,40px)/1.2 'Newsreader','Gowun Batang',serif" }}>{t.contactH}</h2>
            <p style={{ margin: 0, color: '#DCE5E0', lineHeight: 1.65 }}>{t.contactP}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(245,242,235,.25)', paddingTop: '16px' }}>
            <span style={{ fontSize: '13px', color: '#A9C1B6' }}>{t.cLearners}</span>
            <span style={{ fontSize: '17px' }}>hello@hangulnow.com</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(245,242,235,.25)', paddingTop: '16px' }}>
            <span style={{ fontSize: '13px', color: '#A9C1B6' }}>{t.cPartners}</span>
            <span style={{ fontSize: '17px' }}>partners@hangulnow.com</span>
            <span style={{ fontSize: '13.5px', color: '#C9D5CF', marginTop: '6px' }}>{t.cOffice}</span>
          </div>
        </div>
      </section>

      {/* 🌟 5. About 전용 Footer */}
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

export default AboutPage;
