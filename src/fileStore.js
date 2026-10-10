// 서버가 쓰는 파일 저장소 인스턴스 — R2 설정이 있으면 R2, 없으면 Firebase Storage, 둘 다 없으면 null
import { storage, isInitialized } from "./firebase.js";
import { createObjectStore } from "./objectStore.js";

export const fileStore = createObjectStore({ env: process.env, firebaseStorage: isInitialized ? storage : null });

console.log(`[File Store] ${fileStore ? fileStore.backend : "미설정 - 로컬 대체 경로로 동작합니다."}`);
