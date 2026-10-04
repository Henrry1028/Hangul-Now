import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FIREBASE_CONFIG, INTERESTS, INTEREST_MAX, NATIONALITIES,
  emptyProfileDraft, profileStorageKey, sanitizeProfile
} from '../data/profileData.js';

// 관리자 표시 여부는 서버 판정(GET /api/admin/status)으로만 정한다.
// 클라이언트 휴리스틱(?admin=1, 이메일 패턴)은 쓰지 않는다. 데이터 보호는 항상 서버가 맡는다.
async function fetchAdminStatus(user) {
  try {
    const token = await user.getIdToken();
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
    const firebase = window.firebase;
    if (!firebase) return undefined;
    if (!firebase.apps.length) {
      try { firebase.initializeApp(FIREBASE_CONFIG); } catch (error) { console.warn('[Firebase] Init:', error); }
    }
    let alive = true;
    let authGeneration = 0;
    try {
      const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
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
        fetchAdminStatus(user).then((admin) => {
          if (alive && generation === authGeneration) setIsAdmin(admin);
        });
        let profileApplied = false;
        try {
          const userRef = firebase.firestore().collection('users').doc(user.uid);
          const snapshot = await userRef.get();
          if (!alive || generation !== authGeneration) return;
          const userData = snapshot.exists ? (snapshot.data() || {}) : {};
          let tutorId = tutorRef.current;
          if (userData.selectedTutorId) {
            const restored = restoreTutorRef.current?.(userData.selectedTutorId);
            if (restored) tutorId = userData.selectedTutorId;
          }
          applyProfile(userObject, userData);
          profileApplied = true;
          await userRef.set({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            selectedTutorId: tutorId,
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.warn('[Firestore] Sync Warning:', error);
          if (!profileApplied && alive && generation === authGeneration) applyProfile(userObject, {});
        }
      });
      return () => {
        alive = false;
        authGeneration += 1;
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (error) {
      console.warn('[Firebase Auth] Listener Warning:', error);
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
      const firebase = window.firebase;
      if (firebase?.firestore) {
        await firebase.firestore().collection('users').doc(currentUser.uid).set({
          ...nextProfile,
          onboardedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.warn('[Firestore] Profile save error:', error);
      warning = ko ? '서버 저장에 실패해 이 브라우저에만 저장했어요.' : 'Saved in this browser only — the server save failed.';
    }
    setProfile(nextProfile);
    setObSaving(false);
    setObOpen(false);
    setObError('');
    setObNotice(warning);
  }, [currentUser, obDraft]);

  const login = useCallback(async () => {
    const firebase = window.firebase;
    if (!firebase?.auth) {
      window.alert('Firebase 인증 모듈을 로드하는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await firebase.auth().signInWithPopup(provider);
    } catch (error) {
      console.error('[Google Login Error]', error);
      if (error.code === 'auth/popup-blocked') {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithRedirect(provider);
      } else if (error.code !== 'auth/popup-closed-by-user') {
        window.alert(`Google 로그인 실패: ${error.message || error.code}`);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    const firebase = window.firebase;
    if (!firebase?.auth) return;
    try {
      await firebase.auth().signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error('[Logout Error]', error);
    }
  }, []);

  const persistTutor = useCallback(async (id) => {
    if (!currentUser) return;
    try {
      const firebase = window.firebase;
      if (firebase?.firestore) {
        await firebase.firestore().collection('users').doc(currentUser.uid).set({
          selectedTutorId: id,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.warn('[Firestore] Tutor update error:', error);
    }
  }, [currentUser]);

  return {
    currentUser, profile, isAdmin, obOpen, obStep, obDraft, obSaving, obError, obNotice,
    login, logout, openOnboarding, closeOnboarding: () => setObOpen(false), setDraftField,
    toggleInterest, nextOnboarding, previousOnboarding: () => { setObStep(1); setObError(''); },
    saveProfile, persistTutor
  };
}
