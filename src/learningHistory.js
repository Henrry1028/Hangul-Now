// ============================================================
// 전역 규칙: 이미 학습한 내용은 다시 내주지 않는다
// 사용자가 직접 요청하거나 '복습'을 요청했을 때만 학습한 내용을 다시 낸다.
//
// 저장 위치
//  - 로그인: Firestore  users/{userId}/learned/{type}  (키 → {firstAt, lastAt, count})
//  - 비로그인: 브라우저 localStorage (클라이언트가 보내 준 seenKeys로 대체)
// ============================================================

import { db, isInitialized } from "./firebase.js";

// 학습 이력을 남기는 콘텐츠 종류
export const LEARN_TYPES = ["syllable", "word", "topic", "reading", "listening", "speaking"];

const memoryStore = new Map(); // Firebase가 없을 때 쓰는 프로세스 내 임시 저장소
const memKey = (userId, type) => `${userId}::${type}`;

/** 해당 사용자가 이미 학습한 항목 { key: {firstAt, lastAt, count} } */
export async function getLearned(userId, type) {
  if (!userId) return {};
  if (!isInitialized) return memoryStore.get(memKey(userId, type)) || {};
  try {
    const snap = await db.collection("users").doc(userId).collection("learned").doc(type).get();
    return snap.exists ? (snap.data().items || {}) : {};
  } catch (err) {
    console.warn("[learningHistory] 조회 실패:", err.message);
    return {};
  }
}

/** 학습을 마친 항목을 기록한다. items: [{key, label}] */
export async function recordLearned(userId, type, items = []) {
  if (!userId || !items.length) return { recorded: 0 };
  const now = Date.now();
  const prev = await getLearned(userId, type);
  const next = { ...prev };
  for (const it of items) {
    const key = typeof it === "string" ? it : it.key;
    if (!key) continue;
    const before = next[key];
    next[key] = {
      label: (typeof it === "object" && it.label) || before?.label || key,
      firstAt: before?.firstAt || now,
      lastAt: now,
      count: (before?.count || 0) + 1
    };
  }
  if (!isInitialized) {
    memoryStore.set(memKey(userId, type), next);
    return { recorded: items.length, store: "memory" };
  }
  try {
    await db.collection("users").doc(userId).collection("learned").doc(type)
      .set({ items: next, updatedAt: now }, { merge: true });
    return { recorded: items.length, store: "firestore" };
  } catch (err) {
    console.warn("[learningHistory] 기록 실패:", err.message);
    memoryStore.set(memKey(userId, type), next);
    return { recorded: items.length, store: "memory", error: err.message };
  }
}

/**
 * 아직 학습하지 않은 것을 우선해서 고른다 — 이 규칙의 핵심.
 * @param {object}   p
 * @param {Array}    p.candidates 후보 목록
 * @param {Function} p.keyOf      후보에서 키를 뽑는 함수
 * @param {object}   p.learned    getLearned 결과
 * @param {number}   p.count      고를 개수 (0 이하면 전부)
 * @param {boolean}  p.review     true면 반대로 '학습한 것만' 고른다 (복습 모드)
 * @param {number}   p.seed       같은 날은 같은 순서가 되도록 하는 시드
 */
export function pickFresh({ candidates = [], keyOf = (x) => x, learned = {}, count = 0, review = false, seed = 0 }) {
  const fresh = [], seen = [];
  for (const c of candidates) (learned[keyOf(c)] ? seen : fresh).push(c);

  let pool;
  if (review) {
    // 복습: 학습한 것만, 오래전에 본 것부터
    pool = seen.slice().sort((a, b) => (learned[keyOf(a)]?.lastAt || 0) - (learned[keyOf(b)]?.lastAt || 0));
  } else if (fresh.length) {
    // 기본: 아직 안 배운 것만. 날짜 시드로 섞어 매일 다른 순서가 되게 한다
    pool = shuffleSeeded(fresh, seed);
  } else {
    // 후보를 모두 배웠으면 가장 오래전에 배운 것부터 다시 낸다
    pool = seen.slice().sort((a, b) => (learned[keyOf(a)]?.lastAt || 0) - (learned[keyOf(b)]?.lastAt || 0));
  }
  const out = count > 0 ? pool.slice(0, count) : pool;
  return { items: out, exhausted: !review && fresh.length === 0, freshLeft: fresh.length };
}

/** 날짜 등으로 시드를 고정한 셔플 — 같은 날엔 같은 순서, 날이 바뀌면 다른 순서 */
export function shuffleSeeded(arr, seed = 0) {
  const a = arr.slice();
  let s = (seed || 0) >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 오늘 날짜 기반 시드 (YYYYMMDD) — 날이 바뀌면 자동으로 다른 내용이 나온다 */
export function todaySeed(d = new Date()) {
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

/** 회화 프롬프트에 넘길 '이미 다룬 주제' 목록 */
export async function getCoveredTopics(userId, limit = 25) {
  const learned = await getLearned(userId, "topic");
  return Object.entries(learned)
    .sort((a, b) => (b[1].lastAt || 0) - (a[1].lastAt || 0))
    .slice(0, limit)
    .map(([, v]) => v.label);
}
