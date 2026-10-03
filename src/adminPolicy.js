// ============================================================
// Hangul Now 관리자 판정 정책 모듈 (Single Source of Truth)
// ============================================================

/**
 * 환경변수 process.env.ADMIN_EMAILS 목록 파싱
 * - comma separated email list
 * - whitespace trim & lowercase normalization
 * - 빈 항목 필터링
 */
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * 이메일이 관리자 allowlist(process.env.ADMIN_EMAILS)에 포함되어 있는지 검사
 * - null/undefined/비문자열 안전 처리
 * - 대소문자 무시 (lowercase 비교)
 */
export function isEmailAdmin(email) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.toLowerCase().trim();
  if (!normalized) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(normalized);
}

/**
 * 최종 관리자(Effective Admin) 여부 판정
 * - Firebase ID Token 검증 결과의 custom claim: user.adminClaim === true
 * - OR 관리자 이메일 allowlist: isEmailAdmin(user.email) === true
 *
 * [Trust Boundary 원칙]
 * - 본 함수는 authenticateUser 미들웨어에서 이미 검증 완료된 user 컨텍스트({ email, adminClaim })만 소비합니다.
 * - 클라이언트가 임의로 전송한 body, query, 비검증 파라미터는 절대 참조하지 않습니다.
 *
 * @param {Object} user - authenticateUser 미들웨어에서 검증된 req.user 객체 { uid, email, adminClaim }
 * @returns {boolean}
 */
export function isEffectiveAdmin(user) {
  if (!user || typeof user !== "object") return false;
  if (user.adminClaim === true) return true;
  if (user.email && isEmailAdmin(user.email)) return true;
  return false;
}
