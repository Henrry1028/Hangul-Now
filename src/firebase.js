import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import dotenv from "dotenv";

dotenv.config();

let firebaseApp = null;
let db = null;
let auth = null;
let storage = null;
let isInitialized = false;

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (serviceAccountRaw) {
  try {
    let serviceAccount;
    const trimmed = serviceAccountRaw.trim();
    try {
      serviceAccount = JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
    } catch {
      serviceAccount = JSON.parse(trimmed);
    }

    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
      });
    } else {
      firebaseApp = getApps()[0];
    }

    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    storage = getStorage(firebaseApp);
    isInitialized = true;
    console.log(`[Firebase Admin] 프로젝트 ${serviceAccount.project_id} 초기화 성공`);
  } catch (error) {
    console.warn("[Firebase Admin] 초기화 실패 (로컬 Mock 모드로 동작):", error.message);
  }
} else {
  console.log("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY 미설정 - 로컬 인메모리 / Mock 모드로 작동합니다.");
}

export { firebaseApp, db, auth, storage, isInitialized };
