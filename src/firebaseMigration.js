// ============================================================
// Firebase → Supabase 데이터 이전용 변환 규칙 (입출력 없는 순수 함수)
// 실제 읽기·쓰기는 scripts/migrate-firebase-data.mjs가 한다.
// ============================================================

const isTimestamp = (value) => value && typeof value === "object" && typeof value.toDate === "function";

const toIso = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = isTimestamp(value) ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Firestore 문서 값을 JSON으로 담을 수 있는 형태로 바꾼다 (Timestamp·Date → ISO 문자열) */
export function plainValue(value) {
  if (isTimestamp(value) || value instanceof Date) return toIso(value);
  if (Array.isArray(value)) return value.map(plainValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainValue(item)]));
  }
  return value;
}

/** 회원은 새 Supabase ID로, 게스트 ID처럼 대응표에 없는 것은 그대로 */
export function targetUserId(sourceId, idMap) {
  return idMap.get(sourceId) || sourceId;
}

/** conversations 문서 ID "<uid>_<tutorId>" 분해. 형식이 아니면 null */
export function splitConversationId(id) {
  const cut = String(id).lastIndexOf("_");
  if (cut <= 0 || cut === id.length - 1) return null;
  return { userId: id.slice(0, cut), tutorId: id.slice(cut + 1) };
}

/** Supabase 관리자 API(POST /auth/v1/admin/users) 요청 본문 — 이 방식은 사용자에게 메일을 보내지 않는다 */
export function supabaseUserPayload(authUser) {
  const userMetadata = {};
  if (authUser.displayName) Object.assign(userMetadata, { full_name: authUser.displayName, name: authUser.displayName });
  if (authUser.photoURL) Object.assign(userMetadata, { avatar_url: authUser.photoURL, picture: authUser.photoURL });
  const appMetadata = { firebase_uid: authUser.uid };
  if (authUser.customClaims?.admin === true) appMetadata.admin = true;
  return {
    email: String(authUser.email).trim().toLowerCase(),
    email_confirm: authUser.emailVerified === true,
    user_metadata: userMetadata,
    app_metadata: appMetadata
  };
}

/** Firestore users/{uid} 문서(없을 수 있음)와 계정 정보를 합친 profiles 행 */
export function profileRow({ userId, authUser, profile }) {
  const doc = profile || {};
  const createdAt = toIso(authUser?.metadata?.creationTime);
  return {
    user_id: userId,
    email: (authUser?.email || doc.email || "").trim().toLowerCase() || null,
    display_name: doc.displayName || authUser?.displayName || null,
    photo_url: doc.photoURL || authUser?.photoURL || null,
    nickname: doc.nickname || null,
    nationality: doc.nationality || null,
    nationality_name: doc.nationalityName || null,
    native_language: doc.nativeLanguage || null,
    gender: doc.gender || null,
    interests: Array.isArray(doc.interests) ? doc.interests : [],
    onboarded: doc.onboarded === true,
    selected_tutor_id: doc.selectedTutorId || null,
    level: doc.level ?? null,
    xp: doc.xp ?? null,
    onboarded_at: toIso(doc.onboardedAt),
    last_login_at: toIso(doc.lastLoginAt) || toIso(authUser?.metadata?.lastSignInTime),
    created_at: createdAt,
    updated_at: toIso(doc.updatedAt) || createdAt
  };
}
