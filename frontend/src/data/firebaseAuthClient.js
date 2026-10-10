import { FIREBASE_CONFIG } from './profileData.js';

// Firebase Auth + Firestore users/{uid} 를 쓰는 로그인 클라이언트 (index.html이 불러온 compat SDK 사용).
// supabaseAuthClient.js와 같은 인터페이스를 제공한다. SDK는 호출 시점마다 window에서 읽는다.

const sdk = () => window.firebase;
const authSdk = () => { const firebase = sdk(); return firebase && firebase.auth ? firebase : null; };
const firestoreSdk = () => { const firebase = sdk(); return firebase && firebase.firestore ? firebase : null; };

const userDoc = (firebase, uid) => firebase.firestore().collection('users').doc(uid);

export function createFirebaseAuthClient() {
  const currentUser = () => { const firebase = authSdk(); return firebase ? firebase.auth().currentUser : null; };

  return {
    provider: 'firebase',
    available: () => Boolean(authSdk()),

    subscribe(callback) {
      const firebase = sdk();
      if (!firebase) return undefined;
      if (!firebase.apps.length) {
        try { firebase.initializeApp(FIREBASE_CONFIG); } catch (error) { console.warn('[Firebase] Init:', error); }
      }
      return firebase.auth().onAuthStateChanged((user) => callback(user ? {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      } : null));
    },

    currentUser,

    async getToken() {
      const user = currentUser();
      if (!user) return null;
      return (await user.getIdToken()) || null;
    },

    // 팝업이 막히면 리디렉트로 전환한다. 그 외 실패는 호출부가 안내하도록 그대로 던진다.
    async signInWithGoogle() {
      const firebase = authSdk();
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await firebase.auth().signInWithPopup(provider);
      } catch (error) {
        if (error.code !== 'auth/popup-blocked') throw error;
        firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
      }
    },

    async signOut() {
      const firebase = authSdk();
      if (firebase) await firebase.auth().signOut();
    },

    async loadProfile(uid) {
      const firebase = firestoreSdk();
      if (!firebase) return {};
      const snapshot = await userDoc(firebase, uid).get();
      return snapshot.exists ? (snapshot.data() || {}) : {};
    },

    async recordLogin(user, selectedTutorId) {
      const firebase = firestoreSdk();
      if (!firebase) return;
      await userDoc(firebase, user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        selectedTutorId,
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    },

    async saveProfile(uid, profile) {
      const firebase = firestoreSdk();
      if (!firebase) return;
      await userDoc(firebase, uid).set({
        ...profile,
        onboardedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    },

    async saveTutor(uid, tutorId) {
      const firebase = firestoreSdk();
      if (!firebase) return;
      await userDoc(firebase, uid).set({
        selectedTutorId: tutorId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  };
}
