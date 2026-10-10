import test from "node:test";
import assert from "node:assert/strict";
import { plainValue, profileRow, splitConversationId, supabaseUserPayload, targetUserId } from "./firebaseMigration.js";

// Firestore Timestamp 대역 — 실제 객체처럼 toDate()만 제공한다
const timestamp = (iso) => ({ toDate: () => new Date(iso) });

test("plainValue: Firestore Timestamp와 Date를 ISO 문자열로 바꾸고 중첩 구조는 그대로 따라간다", () => {
  const source = {
    type: "tutor-lesson",
    createdAt: timestamp("2026-10-09T05:00:00.000Z"),
    finalizePayload: { newMistakes: [{ id: "m1", at: new Date("2026-10-08T00:00:00.000Z") }], strengths: [] },
    count: 3,
    note: null
  };

  assert.deepEqual(plainValue(source), {
    type: "tutor-lesson",
    createdAt: "2026-10-09T05:00:00.000Z",
    finalizePayload: { newMistakes: [{ id: "m1", at: "2026-10-08T00:00:00.000Z" }], strengths: [] },
    count: 3,
    note: null
  });
});

test("targetUserId: 회원은 새 ID로, 게스트 등 대응표에 없는 ID는 그대로 둔다", () => {
  const idMap = new Map([["fbUid123", "11111111-2222-3333-4444-555555555555"]]);
  assert.equal(targetUserId("fbUid123", idMap), "11111111-2222-3333-4444-555555555555");
  assert.equal(targetUserId("guest-abc", idMap), "guest-abc");
});

test("splitConversationId: 마지막 밑줄을 기준으로 사용자와 튜터를 나눈다", () => {
  assert.deepEqual(splitConversationId("fbUid123_jiwoo"), { userId: "fbUid123", tutorId: "jiwoo" });
  assert.deepEqual(splitConversationId("guest_abc_minho"), { userId: "guest_abc", tutorId: "minho" });
  assert.equal(splitConversationId("no-separator"), null);
  assert.equal(splitConversationId("_jiwoo"), null);
  assert.equal(splitConversationId("fbUid123_"), null);
});

test("supabaseUserPayload: 이메일 인증 여부와 Firebase uid·관리자 표시를 옮기고, 메일은 보내지 않는 생성 요청을 만든다", () => {
  const google = { uid: "fbUid123", email: "Learner@Example.com", emailVerified: true, displayName: "Learner Kim", photoURL: "https://img.example/p.png", customClaims: { admin: true } };
  assert.deepEqual(supabaseUserPayload(google), {
    email: "learner@example.com",
    email_confirm: true,
    user_metadata: { full_name: "Learner Kim", name: "Learner Kim", avatar_url: "https://img.example/p.png", picture: "https://img.example/p.png" },
    app_metadata: { firebase_uid: "fbUid123", admin: true }
  });

  const password = { uid: "fbUid456", email: "test@example.com", emailVerified: false };
  assert.deepEqual(supabaseUserPayload(password), {
    email: "test@example.com",
    email_confirm: false,
    user_metadata: {},
    app_metadata: { firebase_uid: "fbUid456" }
  });
});

test("profileRow: 프로필 문서와 계정 정보를 합쳐 profiles 행을 만든다", () => {
  const authUser = {
    email: "learner@example.com", displayName: "Learner Kim", photoURL: "https://img.example/auth.png",
    metadata: { creationTime: "Sun, 04 Oct 2026 08:00:00 GMT", lastSignInTime: "Fri, 09 Oct 2026 01:00:00 GMT" }
  };
  const profile = {
    uid: "fbUid123", email: "learner@example.com", displayName: "", photoURL: "https://img.example/doc.png",
    nickname: "Kim", nationality: "US", nationalityName: "United States", nativeLanguage: "English", gender: "female",
    interests: ["kdrama", "food"], onboarded: true, selectedTutorId: "minho",
    onboardedAt: timestamp("2026-10-04T08:05:00.000Z"), lastLoginAt: timestamp("2026-10-09T02:00:00.000Z"), updatedAt: timestamp("2026-10-09T02:00:00.000Z")
  };

  assert.deepEqual(profileRow({ userId: "new-uuid", authUser, profile }), {
    user_id: "new-uuid",
    email: "learner@example.com",
    display_name: "Learner Kim",
    photo_url: "https://img.example/doc.png",
    nickname: "Kim",
    nationality: "US",
    nationality_name: "United States",
    native_language: "English",
    gender: "female",
    interests: ["kdrama", "food"],
    onboarded: true,
    selected_tutor_id: "minho",
    level: null,
    xp: null,
    onboarded_at: "2026-10-04T08:05:00.000Z",
    last_login_at: "2026-10-09T02:00:00.000Z",
    created_at: "2026-10-04T08:00:00.000Z",
    updated_at: "2026-10-09T02:00:00.000Z"
  });
});

test("profileRow: 프로필 문서가 없는 회원은 계정 정보만으로 온보딩 전 상태의 행을 만든다", () => {
  const authUser = { email: "test@example.com", metadata: { creationTime: "Sun, 04 Oct 2026 08:00:00 GMT", lastSignInTime: "Mon, 05 Oct 2026 09:30:00 GMT" } };

  const row = profileRow({ userId: "new-uuid-2", authUser, profile: null });

  assert.equal(row.onboarded, false);
  assert.deepEqual(row.interests, []);
  assert.equal(row.email, "test@example.com");
  assert.equal(row.display_name, null);
  assert.equal(row.last_login_at, "2026-10-05T09:30:00.000Z");
  assert.equal(row.created_at, "2026-10-04T08:00:00.000Z");
  assert.equal(row.updated_at, "2026-10-04T08:00:00.000Z");
});
