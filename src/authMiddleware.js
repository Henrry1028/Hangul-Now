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
