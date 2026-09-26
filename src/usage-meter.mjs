// ============================================================
// 사용량 계측 — 사용자 한 명이 하루에 얼마를 쓰는지
// ============================================================
//
// 무료 사용자가 늘면 비용이 선형으로 증가하는데, 그 기울기를 재는 장치가
// 없었다. 무료 한도를 정하려면 먼저 "한 사람이 하루에 몇 번 부르는가"를
// 알아야 한다.
//
// 메모리에 집계하고 주기적으로 Firestore에 넘긴다. 프로세스가 죽으면 그
// 구간의 집계는 잃지만, 요금 추세를 보는 용도라 그 정도 손실은 감수한다 —
// 계측 때문에 요청 경로가 느려지는 편이 더 나쁘다.

/** 3.6-flash · 3.7-flash가 공유하는 인트로 프로모션 단가.
 *  2026-12-31 만료, 2027-01-01부터 양 모델 모두 2배 인상. */
const FLASH_INTRO_PRICING = [
  { until: '2026-12-31', input: 0.75, output: 3.75 },
  { from: '2027-01-01', input: 1.50, output: 7.50 },
];

/** 모델별 100만 토큰당 단가(USD). 요금이 바뀌면 여기만 고친다.
 *  값이 배열이면 날짜 구간별 단가다. */
const PRICING = {
  'gemini-3.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-3.1-flash-tts-preview': { input: 0.50, output: 10.00 },
  'gemini-3.6-flash': FLASH_INTRO_PRICING,
  'gemini-3.7-flash': FLASH_INTRO_PRICING,
  'gemini-3.8-flash': FLASH_INTRO_PRICING,
};

// 미등록 모델의 폴백. 비용 가드레일에서는 과소 집계가 과대 집계보다 위험하므로
// 현행 flash 단가에 맞춘다. (예전 값 0.30/2.50은 틀린 3.6-flash 단가에서 온 것이었다.)
const DEFAULT_PRICE = { input: 0.75, output: 3.75 };

/** 그 날짜에 유효한 단가를 고른다. day는 'YYYY-MM-DD'. */
export function resolvePrice(model, day) {
  const entry = PRICING[model];
  if (!entry) return DEFAULT_PRICE;
  if (!Array.isArray(entry)) return entry;
  for (const band of entry) {
    if (band.until && day <= band.until) return { input: band.input, output: band.output };
    if (band.from && day >= band.from) return { input: band.input, output: band.output };
  }
  return DEFAULT_PRICE;
}

/** 문자 수로 토큰을 어림한다. 한국어는 대략 2자에 1토큰. */
function estimateTokens(text) {
  const length = String(text ?? '').length;
  return Math.ceil(length / 2.5);
}

function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

class UsageMeter {
  constructor() {
    /** Map<`${day}:${userId}`, record> */
    this.buckets = new Map();
    this.flushHandler = null;
  }

  /**
   * 호출 한 번을 기록한다.
   * userId가 없으면 'anonymous'로 묶인다 — 게스트 트래픽의 총량도 알아야 한다.
   */
  record({ userId, endpoint, model, promptText = '', responseText = '', ok = true }) {
    const day = dayKey();
    const key = `${day}:${userId || 'anonymous'}`;

    let record = this.buckets.get(key);
    if (!record) {
      record = {
        day,
        userId: userId || 'anonymous',
        calls: 0,
        failures: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        byEndpoint: {},
      };
      this.buckets.set(key, record);
    }

    const price = resolvePrice(model, day);
    const inputTokens = estimateTokens(promptText);
    const outputTokens = estimateTokens(responseText);
    const cost = (inputTokens / 1e6) * price.input + (outputTokens / 1e6) * price.output;

    record.calls += 1;
    if (!ok) record.failures += 1;
    record.inputTokens += inputTokens;
    record.outputTokens += outputTokens;
    record.costUsd += cost;
    record.byEndpoint[endpoint] = (record.byEndpoint[endpoint] || 0) + 1;

    return record;
  }

  /** 오늘 이 사용자가 쓴 양. 무료 한도 판단에 쓴다. */
  today(userId) {
    return this.buckets.get(`${dayKey()}:${userId || 'anonymous'}`) || null;
  }

  /** 관리자 화면용 요약 — 비용이 큰 순서 */
  summary(limit = 50) {
    const rows = [...this.buckets.values()]
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, limit)
      .map(r => ({ ...r, costUsd: Number(r.costUsd.toFixed(5)) }));

    const totals = rows.reduce((acc, r) => ({
      calls: acc.calls + r.calls,
      failures: acc.failures + r.failures,
      costUsd: acc.costUsd + r.costUsd,
    }), { calls: 0, failures: 0, costUsd: 0 });

    return {
      generatedAt: new Date().toISOString(),
      activeLearners: new Set(rows.map(r => r.userId)).size,
      totals: { ...totals, costUsd: Number(totals.costUsd.toFixed(4)) },
      rows,
    };
  }

  /** 오래된 날짜를 버린다 — 메모리에 무한히 쌓이면 안 된다 */
  prune(keepDays = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);
    const oldest = dayKey(cutoff);
    for (const key of this.buckets.keys()) {
      if (key.slice(0, 10) < oldest) this.buckets.delete(key);
    }
  }
}

export const usageMeter = new UsageMeter();
export { estimateTokens, PRICING };
