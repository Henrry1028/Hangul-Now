// ============================================================
// Hangul Now API 요청 제한 (AI·TTS 비용 보호)
// ============================================================
// 프로세스 메모리 고정 윈도 카운터. 운영 Cloud Run은 max-instances=1이라
// 인스턴스 하나가 모든 요청을 세므로 정확하다. 인스턴스를 늘리면 공유 저장소로 옮겨야 한다.
// 키: 검증된 Firebase uid가 있으면 uid, 없으면 클라이언트 IP(req.ip — server.js의 trust proxy 설정 기준).

const buckets = new Map(); // `${name}:${key}` -> { count, resetAt }

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 60_000).unref();

/**
 * @param {object} options
 * @param {string} options.name   버킷 이름 (엔드포인트 묶음)
 * @param {number} options.limit  윈도당 허용 요청 수
 * @param {number} options.windowMs 윈도 길이(ms)
 */
export function rateLimit({ name, limit, windowMs }) {
  const scale = Number(process.env.RATE_LIMIT_SCALE || 1);
  const max = Math.max(1, Math.floor(limit * (Number.isFinite(scale) && scale > 0 ? scale : 1)));
  return (req, res, next) => {
    if (process.env.RATE_LIMIT_DISABLED === "1") return next();
    const who = req.user?.uid ? `u:${req.user.uid}` : `ip:${req.ip || "unknown"}`;
    const key = `${name}:${who}`;
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", retryAfterSeconds: retryAfter });
    }
    return next();
  };
}
