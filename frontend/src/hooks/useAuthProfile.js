import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INTEREST_MAX, NATIONALITIES,
  emptyProfileDraft, profileStorageKey, sanitizeProfile
} from '../data/profileData.js';
import { authClient } from '../data/authClient.js';

// 관리자 표시 여부는 서버 판정(GET /api/admin/status)으로만 정한다.
// 클라이언트 휴리스틱(?admin=1, 이메일 패턴)은 쓰지 않는다. 데이터 보호는 항상 서버가 맡는다.
async function fetchAdminStatus() {
  try {
    const token = await authClient.getToken();
    if (!token) return false;
    const res = await fetch('/api/admin/status', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.isAdmin === true);
  } catch {
    return false;
  }
}

const readLocalProfile = (uid) => {
  try { return JSON.parse(localStorage.getItem(profileStorageKey(uid)) || '{}'); } catch { return {}; }
};

export default function useAuthProfile({ selectedTutorId, onRestoreTutor }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [obOpen, setObOpen] = useState(false);
  const [obStep, setObStep] = useState(1);
  const [obDraft, setObDraft] = useState(emptyProfileDraft);
  const [obSaving, setObSaving] = useState(false);
  const [obError, setObError] = useState('');
  const [obNotice, setObNotice] = useState('');
  const tutorRef = useRef(selectedTutorId);
  const restoreTutorRef = useRef(onRestoreTutor);
  tutorRef.current = selectedTutorId;
  restoreTutorRef.current = onRestoreTutor;

  const applyProfile = useCallback((user, userData = {}) => {
    const local = readLocalProfile(user.uid);
    const source = userData.onboarded ? userData : (local.onboarded ? local : userData);
    const nextProfile = sanitizeProfile(source);
    const fallbackNick = (user.displayName || (user.email ? user.email.split('@')[0] : '')).slice(0, 20);
    setProfile(nextProfile);
    setObOpen(!nextProfile.onboarded);
    setObStep(1);
    setObError('');
    setObDraft({
      nickname: nextProfile.nickname || fallbackNick,
      nationality: nextProfile.nationality,
      gender: nextProfile.gender,
      interests: nextProfile.interests
    });
  }, []);

  useEffect(() => {
    let alive = true;
    let authGeneration = 0;
    try {
      const unsubscribe = authClient.subscribe(async (user) => {
        const generation = ++authGeneration;
        if (!alive) return;
        if (!user) {
          setCurrentUser(null);
          setProfile(null);
          setObOpen(false);
          setIsAdmin(false);
          return;
        }
        const userObject = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Learner'),
          photoURL: user.photoURL || ''
        };
        setCurrentUser(userObject);
        setIsAdmin(false);
        fetchAdminStatus().then((admin) => {
          if (alive && generation === authGeneration) setIsAdmin(admin);
        });
        let profileApplied = false;
        try {
          const userData = await authClient.loadProfile(user.uid);
          if (!alive || generation !== authGeneration) return;
          let tutorId = tutorRef.current;
          if (userData.selectedTutorId) {
            const restored = restoreTutorRef.current?.(userData.selectedTutorId);
            if (restored) tutorId = userData.selectedTutorId;
          }
          applyProfile(userObject, userData);
          profileApplied = true;
          await authClient.recordLogin({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || ''
          }, tutorId);
        } catch (error) {
          console.warn('[Profile] Sync Warning:', error);
          if (!profileApplied && alive && generation === authGeneration) applyProfile(userObject, {});
        }
      });
      return () => {
        alive = false;
        authGeneration += 1;
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (error) {
      console.warn('[Auth] Listener Warning:', error);
      return undefined;
    }
  }, [applyProfile]);

  const openOnboarding = useCallback(() => {
    const fallback = (currentUser?.displayName || '').slice(0, 20);
    setObOpen(true);
    setObStep(1);
    setObError('');
    setObDraft({
      nickname: profile?.nickname || fallback,
      nationality: profile?.nationality || '',
      gender: profile?.gender || '',
      interests: profile?.interests || []
    });
  }, [currentUser, profile]);

  const setDraftField = useCallback((field, value) => {
    setObDraft((previous) => ({ ...previous, [field]: value }));
    setObError('');
  }, []);

  const toggleInterest = useCallback((id, lang) => {
    const current = obDraft.interests || [];
    if (current.includes(id)) {
      setObDraft((previous) => ({ ...previous, interests: (previous.interests || []).filter((item) => item !== id) }));
      setObError('');
      return;
    }
    if (current.length >= INTEREST_MAX) {
      setObError(lang === 'ko' ? `관심사는 ${INTEREST_MAX}개까지 고를 수 있어요.` : `You can pick up to ${INTEREST_MAX}.`);
      return;
    }
    setObDraft((previous) => ({ ...previous, interests: [...(previous.interests || []), id] }));
    setObError('');
  }, [obDraft.interests]);

  const nextOnboarding = useCallback((lang) => {
    const ko = lang === 'ko';
    const nickname = (obDraft.nickname || '').trim();
    if (!nickname) return setObError(ko ? '닉네임을 입력해 주세요.' : 'Please enter a nickname.');
    if (nickname.length > 20) return setObError(ko ? '닉네임은 20자까지예요.' : 'Nickname must be 20 characters or fewer.');
    if (!obDraft.nationality) return setObError(ko ? '국적을 선택해 주세요.' : 'Please choose your nationality.');
    if (!obDraft.gender) return setObError(ko ? '성별을 선택해 주세요.' : 'Please choose an option for gender.');
    setObDraft((previous) => ({ ...previous, nickname }));
    setObStep(2);
    setObError('');
  }, [obDraft]);

  const saveProfile = useCallback(async (lang) => {
    const ko = lang === 'ko';
    if (!(obDraft.interests || []).length) {
      setObError(ko ? '관심사를 하나 이상 골라 주세요.' : 'Pick at least one interest.');
      return;
    }
    if (!currentUser) return;
    const nationality = NATIONALITIES.find((item) => item.code === obDraft.nationality);
    const nextProfile = {
      nickname: obDraft.nickname.trim(),
      nationality: obDraft.nationality,
      nationalityName: nationality?.en || '',
      nativeLanguage: nationality?.nativeLanguage || '',
      gender: obDraft.gender,
      interests: obDraft.interests,
      onboarded: true
    };
    setObSaving(true);
    setObError('');
    try { localStorage.setItem(profileStorageKey(currentUser.uid), JSON.stringify(nextProfile)); } catch { /* ignore */ }
    let warning = '';
    try {
      await authClient.saveProfile(currentUser.uid, nextProfile);
    } catch (error) {
      console.warn('[Profile] Save error:', error);
      warning = ko ? '서버 저장에 실패해 이 브라우저에만 저장했어요.' : 'Saved in this browser only — the server save failed.';
    }
    setProfile(nextProfile);
    setObSaving(false);
    setObOpen(false);
    setObError('');
    setObNotice(warning);
  }, [currentUser, obDraft]);

  const login = useCallback(async () => {
    if (!authClient.available()) {
      window.alert('인증 모듈을 로드하는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    try {
      await authClient.signInWithGoogle();
    } catch (error) {
      console.error('[Google Login Error]', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        window.alert(`Google 로그인 실패: ${error.message || error.code}`);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    if (!authClient.available()) return;
    try {
      await authClient.signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error('[Logout Error]', error);
    }
  }, []);

  const persistTutor = useCallback(async (id) => {
    if (!currentUser) return;
    try {
      await authClient.saveTutor(currentUser.uid, id);
    } catch (error) {
      console.warn('[Profile] Tutor update error:', error);
    }
  }, [currentUser]);

  return {
    currentUser, profile, isAdmin, obOpen, obStep, obDraft, obSaving, obError, obNotice,
    login, logout, openOnboarding, closeOnboarding: () => setObOpen(false), setDraftField,
    toggleInterest, nextOnboarding, previousOnboarding: () => { setObStep(1); setObError(''); },
    saveProfile, persistTutor
  };
}
