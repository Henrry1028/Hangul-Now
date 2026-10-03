// ============================================================
// Hangul Now Firebase ID Token 인증 미들웨어 (Authentication Foundation)
// ============================================================

import { auth } from "./firebase.js";

/**
 * Firebase ID Token 인증 미들웨어
 *
 * [Trust Boundary 원칙]
 * - Authorization: Bearer <token> 헤더에서 추출된 토큰만 검증 대상으로 인정합니다.
 * - Firebase Admin auth.verifyIdToken(token, true)로 토큰의 서명 및 revocation 상태를 검증합니다.
 * - 검증 성공 시 오직 decodedToken에서만 추출된 정보를 req.user = { uid, email, adminClaim }으로 설정합니다.
 * - 임의의 body, query, param 등의 비검증 값은 절대 uid로 수용하지 않습니다.
 * - 본 미들웨어는 오직 'Authentication(신원 확인)'만 수행하며, 역할/권한 인가(Authorization)는 수행하지 않습니다.
 */
export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "인증 토큰이 필요합니다. (Authorization: Bearer <token>)"
    });
  }

  if (!auth) {
    return res.status(503).json({
      success: false,
      error: "인증 서비스를 사용할 수 없습니다."
    });
  }

  try {
    const decoded = await auth.verifyIdToken(token, true);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      adminClaim: decoded.admin === true
    };
    return next();
  } catch (err) {
    console.warn("[Auth] Token verification failed:", err.message);
    return res.status(401).json({
      success: false,
      error: "유효하지 않거나 만료된 인증 토큰입니다."
    });
  }
};

/**
 * Firebase ID Token 선택적 인증 미들웨어 (Optional Authentication)
 *
 * [Trust Boundary 원칙]
 * - Authorization 헤더가 아예 없는 경우: Guest 요청으로 인정하여 req.user = null 설정 후 통과(next()).
 * - Authorization 헤더가 존재하는 경우: 반드시 Bearer 형식이어야 하며 Firebase 토큰 검증 수행.
 * - 헤더가 존재하나 형식이 잘못되었거나(Malformed/Empty), 토큰이 유효하지 않은 경우:
 *   절대 Guest로 downgrade하지 않고 반드시 HTTP 401 반환.
 * - 검증 성공 시 req.user = { uid, email, adminClaim } 설정 후 next().
 */
export const authenticateOptionalUser = async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  // Case A: Authorization 헤더 자체가 없음 -> Guest 통과
  if (authHeader === undefined || authHeader === null) {
    req.user = null;
    return next();
  }

  // Case B & C: Authorization 헤더가 존재하지만 Bearer 형식이 아니거나 토큰이 비어 있음
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "인증 토큰이 필요합니다. (Authorization: Bearer <token>)"
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "인증 토큰이 필요합니다. (Authorization: Bearer <token>)"
    });
  }

  // Case D: Firebase auth 인스턴스 사용 불가
  if (!auth) {
    return res.status(503).json({
      success: false,
      error: "인증 서비스를 사용할 수 없습니다."
    });
  }

  // Case E & F: Firebase ID Token 검증 수행 (revocation 검사 포함)
  try {
    const decoded = await auth.verifyIdToken(token, true);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      adminClaim: decoded.admin === true
    };
    return next();
  } catch (err) {
    console.warn("[Auth] Optional token verification failed:", err.message);
    return res.status(401).json({
      success: false,
      error: "유효하지 않거나 만료된 인증 토큰입니다."
    });
  }
};
