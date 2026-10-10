// ============================================================
// Hangul Now 로그인 토큰 인증 미들웨어 (Authentication Foundation)
// 토큰 검증은 authProvider.js가 맡는다 (Supabase Auth 또는 Firebase Auth).
// ============================================================

import { authAvailable, verifyAccessToken } from "./authProvider.js";
import { isEffectiveAdmin } from "./adminPolicy.js";

/**
 * Authorization 헤더 검증 공통 로직
 *
 * [Trust Boundary 원칙]
 * - Authorization: Bearer <token> 헤더에서 추출된 토큰만 검증 대상으로 인정합니다.
 * - 토큰의 서명과 유효 기간을 검증합니다 (Firebase는 폐기 여부까지, Supabase는 만료까지 유효).
 * - 검증 성공 시 오직 검증된 토큰에서만 추출된 정보로 { uid, email, adminClaim }을 만듭니다.
 * - 임의의 body, query, param 등의 비검증 값은 절대 uid로 수용하지 않습니다.
 *
 * @returns {Promise<{ kind: "absent" | "malformed" | "unavailable" | "invalid" | "ok", user?: object, error?: Error }>}
 */
async function verifyBearer(req) {
  const authHeader = req.headers?.authorization;
  if (authHeader === undefined || authHeader === null) return { kind: "absent" };
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) return { kind: "malformed" };
  const token = authHeader.slice(7).trim();
  if (!token) return { kind: "malformed" };
  if (!authAvailable) return { kind: "unavailable" };
  try {
    return { kind: "ok", user: await verifyAccessToken(token) };
  } catch (error) {
    return { kind: "invalid", error };
  }
}

const TOKEN_REQUIRED = "인증 토큰이 필요합니다. (Authorization: Bearer <token>)";

/**
 * 로그인 토큰 인증 미들웨어
 * - 본 미들웨어는 오직 'Authentication(신원 확인)'만 수행하며, 역할/권한 인가(Authorization)는 수행하지 않습니다.
 */
export const authenticateUser = async (req, res, next) => {
  const result = await verifyBearer(req);
  if (result.kind === "absent" || result.kind === "malformed") {
    return res.status(401).json({ success: false, error: TOKEN_REQUIRED });
  }
  if (result.kind === "unavailable") {
    return res.status(503).json({ success: false, error: "인증 서비스를 사용할 수 없습니다." });
  }
  if (result.kind === "invalid") {
    console.warn("[Auth] Token verification failed:", result.error.message);
    return res.status(401).json({ success: false, error: "유효하지 않거나 만료된 인증 토큰입니다." });
  }
  req.user = result.user;
  return next();
};

/**
 * 로그인 토큰 선택적 인증 미들웨어 (Optional Authentication)
 * - Authorization 헤더가 아예 없는 경우: Guest 요청으로 인정하여 req.user = null 설정 후 통과.
 * - 헤더가 존재하나 형식이 잘못되었거나 토큰이 유효하지 않은 경우: Guest로 downgrade하지 않고 401.
 */
export const authenticateOptionalUser = async (req, res, next) => {
  const result = await verifyBearer(req);
  if (result.kind === "absent") {
    req.user = null;
    return next();
  }
  if (result.kind === "malformed") {
    return res.status(401).json({ success: false, error: TOKEN_REQUIRED });
  }
  if (result.kind === "unavailable") {
    return res.status(503).json({ success: false, error: "인증 서비스를 사용할 수 없습니다." });
  }
  if (result.kind === "invalid") {
    console.warn("[Auth] Optional token verification failed:", result.error.message);
    return res.status(401).json({ success: false, error: "유효하지 않거나 만료된 인증 토큰입니다." });
  }
  req.user = result.user;
  return next();
};

/**
 * 신원 식별 미들웨어 (Identity only — 거부하지 않음)
 * - 유효한 토큰이면 req.user를 설정하고, 그 외(헤더 없음·형식 오류·검증 실패·인증 서비스 불가)는
 *   모두 게스트(req.user = null)로 처리한다.
 * - 학습 기록·대화·콘텐츠 생성처럼 "누구의 데이터인지"만 필요하고 게스트도 쓰는 API용이다.
 *   게스트는 아무 사용자 데이터에도 접근하지 못하므로, 검증 실패를 게스트로 낮춰도 권한이 늘지 않는다.
 * - body/query의 userId는 절대 신원으로 쓰지 않는다. 라우트는 req.user?.uid만 사용한다.
 */
export const identifyUser = async (req, res, next) => {
  const result = await verifyBearer(req);
  if (result.kind === "invalid") {
    console.warn("[Auth] Identity token rejected, treating as guest:", result.error.message);
  }
  req.user = result.kind === "ok" ? result.user : null;
  return next();
};

/**
 * 관리자 인가 미들웨어 (인증 + adminPolicy.isEffectiveAdmin)
 * - 관리자 판정은 adminPolicy.js 한 곳에서만 한다 (custom claim admin 또는 ADMIN_EMAILS).
 * - 응답 형식({ isAdmin: false, error })과 상태 코드는 기존 관리자 API와 동일하다.
 */
export const requireAdmin = async (req, res, next) => {
  const result = await verifyBearer(req);
  if (result.kind === "absent" || result.kind === "malformed") {
    return res.status(401).json({ isAdmin: false, error: "관리자 인증 토큰이 필요합니다." });
  }
  if (result.kind === "unavailable") {
    return res.status(503).json({ isAdmin: false, error: "관리자 인증 서비스를 사용할 수 없습니다." });
  }
  if (result.kind === "invalid") {
    console.warn("[Admin Auth] Token verification failed:", result.error.message);
    return res.status(401).json({ isAdmin: false, error: "유효한 관리자 인증 토큰이 필요합니다." });
  }
  if (!isEffectiveAdmin(result.user)) {
    return res.status(403).json({ isAdmin: false, error: "관리자 권한이 없는 계정입니다." });
  }
  req.user = result.user;
  req.adminUser = { uid: result.user.uid, email: result.user.email ?? null };
  return next();
};
