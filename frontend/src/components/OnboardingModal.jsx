import React from 'react';
import { GENDERS, INTERESTS, INTEREST_MAX, NATIONALITIES } from '../data/profileData.js';
import '../styles/onboarding.css';

const TEXT = {
  en: {
    title1: '반가워요! 먼저 알려 주세요 (Welcome! Tell us about you)',
    sub1: '선생님이 이 닉네임으로 불러 드리고, 모국어를 고려해서 교정해 드려요. (Your tutor will call you by this nickname and tailor feedback to your native language.)',
    nickLabel: '닉네임 (Nickname)', nickPlaceholder: '예: 에마 (e.g. Emma)',
    nickHint: '선생님이 “(닉네임) 님”이라고 불러요. (Your tutor will address you as "(nickname)-nim".)',
    natLabel: '국적 (Nationality)',
    natHint: '모국어 화자가 자주 하는 발음·문법 실수를 미리 짚어 주는 데 써요. (Used to anticipate the pronunciation and grammar slips common for your first language.)',
    genderLabel: '성별 (Gender)', next: '다음 (Next)', back: '이전 (Back)',
    title2: '어떤 이야기가 좋으세요? (What topics do you like?)',
    sub2: '튜터 수업을 이 관심사 중심으로 먼저 구성해요. 5개까지 고를 수 있고, 누른 순서가 우선순위가 돼요. (Your tutor builds each lesson around these first. Pick up to 5 — the order you tap them sets their priority.)',
    interestHint: '관심사는 사이드바의 내 프로필에서 언제든 바꿀 수 있어요. (You can change these any time from your profile in the sidebar.)'
  },
  ko: {
    title1: '반가워요! 먼저 알려 주세요 (Welcome! Tell us about you)',
    sub1: '선생님이 이 닉네임으로 불러 드리고, 모국어를 고려해서 교정해 드려요. (Your tutor will call you by this nickname and tailor feedback to your native language.)',
    nickLabel: '닉네임 (Nickname)', nickPlaceholder: '예: 에마 (e.g. Emma)',
    nickHint: '선생님이 “(닉네임) 님”이라고 불러요. (Your tutor will address you as "(nickname)-nim".)',
    natLabel: '국적 (Nationality)',
    natHint: '모국어 화자가 자주 하는 발음·문법 실수를 미리 짚어 주는 데 써요. (Used to anticipate common pronunciation and grammar patterns for your native language.)',
    genderLabel: '성별 (Gender)', next: '다음 (Next)', back: '이전 (Back)',
    title2: '어떤 이야기가 좋으세요? (What topics do you like?)',
    sub2: '튜터 수업을 이 관심사 중심으로 먼저 구성해요. 5개까지 고를 수 있고, 누른 순서가 우선순위가 돼요. (Lessons will focus on these topics first. Pick up to 5 in order of priority.)',
    interestHint: '관심사는 사이드바의 내 프로필에서 언제든 바꿀 수 있어요. (You can change these anytime in your profile.)'
  }
};

export default function OnboardingModal({ lang, auth }) {
  if (!auth.obOpen || !auth.currentUser) return null;
  const t = TEXT[lang] || TEXT.en;
  const draft = auth.obDraft;
  const selected = draft.interests || [];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-card">
        <div className="onboarding-topline">
          <span className="onboarding-step">{auth.obStep} / 2 단계 (Step {auth.obStep}/2)</span>
          {auth.profile?.onboarded && <button type="button" onClick={auth.closeOnboarding} aria-label="Close" className="onboarding-close">✕</button>}
        </div>

        {auth.obStep === 1 ? (
          <>
            <div className="onboarding-heading"><h2>{t.title1}</h2><span>{t.sub1}</span></div>
            <label className="onboarding-field">
              <span className="onboarding-label">{t.nickLabel}<small>{(draft.nickname || '').length} / 20</small></span>
              <input value={draft.nickname || ''} onChange={(event) => auth.setDraftField('nickname', event.target.value.slice(0, 20))} placeholder={t.nickPlaceholder} maxLength={20} />
              <small>{t.nickHint}</small>
            </label>
            <div className="onboarding-field">
              <span className="onboarding-label">{t.natLabel}</span>
              <select value={draft.nationality || ''} onChange={(event) => auth.setDraftField('nationality', event.target.value)} aria-label="국적 (Nationality)">
                <option value="" disabled>국적을 선택하세요 (Choose your nationality)</option>
                {NATIONALITIES.map((item) => <option key={item.code} value={item.code}>{item.ko} ({item.en})</option>)}
              </select>
              <small>{t.natHint}</small>
            </div>
            <div className="onboarding-field">
              <span className="onboarding-label">{t.genderLabel}</span>
              <div className="onboarding-genders">
                {GENDERS.map((item) => <button type="button" key={item.id} className={draft.gender === item.id ? 'is-selected' : ''} onClick={() => auth.setDraftField('gender', item.id)}>{item.ko} ({item.en})</button>)}
              </div>
            </div>
            {auth.obError && <span className="onboarding-error">{auth.obError}</span>}
            <button type="button" className="onboarding-primary" onClick={() => auth.nextOnboarding(lang)}>{t.next} →</button>
          </>
        ) : (
          <>
            <div className="onboarding-heading"><h2>{t.title2}</h2><span>{t.sub2}</span></div>
            <div className="onboarding-count">선택 (Selected) {selected.length} / {INTEREST_MAX}</div>
            <div className="onboarding-interests">
              {INTERESTS.map((item) => {
                const rank = selected.indexOf(item.id) + 1;
                return <button type="button" key={item.id} className={rank ? 'is-selected' : ''} onClick={() => auth.toggleInterest(item.id, lang)}><span className="onboarding-interest-icon">{item.icon}</span><strong>{item.ko}</strong><small>{item.en}</small>{rank > 0 && <span className="onboarding-rank">{rank}</span>}</button>;
              })}
            </div>
            <span className="onboarding-interest-hint">{t.interestHint}</span>
            {auth.obError && <span className="onboarding-error">{auth.obError}</span>}
            <div className="onboarding-actions">
              <button type="button" className="onboarding-secondary" onClick={auth.previousOnboarding}>← {t.back}</button>
              <button type="button" className="onboarding-primary" disabled={auth.obSaving} onClick={() => auth.saveProfile(lang)}>{auth.obSaving ? '저장하는 중… (Saving…)' : '시작하기 (Get started)'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
