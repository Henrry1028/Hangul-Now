// ── 천지인 양손 엄지 그림자: 휴대폰을 두 손으로 움켜쥐고 양손 엄지로 치는 모습 ──
// 키패드 좌표계(CJ_ROWS: x 30~486, y 30~302) 기준. 손바닥은 휴대폰 옆면을 감싸 화면 밖에 있고,
// 화면 위로는 (1) 옆 가장자리를 감싼 검지, (2) 엄지와 검지 사이 물갈퀴, (3) 아래쪽 줄 높이에서 들어오는
// 엄지두덩(무지구), (4) 뿌리 → IP 관절 → 지문 패드 → 둥근 끝으로 이어지는 엄지가 보인다.
// - 위쪽 줄을 누를 때는 손 전체가 옆면을 따라 올라오고, 닿지 않으면 손이 목표 쪽으로 미끄러진다.
// - 가까운 키는 엄지가 화면에서 들리며 짧아 보이고(원근 단축) 관절 쪽으로 살짝 말린다.
// 오른손은 왼손 모델을 좌우 반전해 만든다.

export const CJ_PAD_W = 516; // 키패드 좌우 대칭 기준 폭 (CJ_VIEWBOX.w)

// 실제로 두 손으로 쥐면 엄지 뿌리는 옆면 바깥·아래쪽 줄 높이에 있고, 엄지는 안쪽 위로 25~35° 비스듬히 눕는다.
const LEFT_BASE = [-16, 296]; // 엄지 뿌리(MCP 관절): 왼쪽 옆면 바로 바깥, 맨 아래 줄 높이
export const CJ_THUMB_REST = { left: [178, 222], right: [CJ_PAD_W - 178, 222] }; // 쉬고 있는 엄지 끝(키 위에 살짝 떠 있음)
const THUMB_LEN = 226; // 엄지를 편안히 폈을 때 뿌리~끝 길이
const MAX_REACH = 268; // 이보다 멀면 손 전체가 목표 쪽으로 미끄러진다
const EDGE_GRIP = 30; // 손바닥·검지 옆면이 화면 가장자리를 덮는 x (키패드 왼쪽 끝 30)

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]) || 1;
const norm = (a) => mul(a, 1 / len(a));
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// 왼손 기준 엄지 등(손톱) 쪽 법선: 엄지가 오른쪽 위를 향할 때 왼쪽 위
const dorsal = (dir) => [dir[1], -dir[0]];
const mirror = (p) => [CJ_PAD_W - p[0], p[1]];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 왼손 좌표계의 엄지 자세. 엄지는 뿌리에서 거의 곧게 뻗고(관절 쪽이 살짝 볼록),
// 위쪽 줄로 갈수록 손이 따라 올라오며, 가까운 키는 엄지가 들려 짧아 보이고 끝이 살짝 말린다.
function leftPose(tip) {
  const rest = CJ_THUMB_REST.left;
  let base = add(LEFT_BASE, [(tip[0] - rest[0]) * 0.05, (tip[1] - rest[1]) * 0.3]);
  let d = len(sub(tip, base));
  const u = norm(sub(tip, base));
  if (d > MAX_REACH) { base = sub(tip, mul(u, MAX_REACH)); d = MAX_REACH; }
  const curl = clamp((THUMB_LEN - d) / THUMB_LEN, 0, 1); // 0 = 편 엄지, 1 = 많이 굽힘
  const bow = d * (0.02 + 0.09 * curl); // 중심선이 등쪽으로 볼록한 정도
  const ctrl = add(add(base, mul(u, d * 0.46)), mul(dorsal(u), bow * 2));
  return { base, tip, ctrl, curl };
}

const bez = (a, c, b, t) => add(add(mul(a, (1 - t) * (1 - t)), mul(c, 2 * (1 - t) * t)), mul(b, t * t));
const bezTan = (a, c, b, t) => norm(add(mul(sub(c, a), 2 * (1 - t)), mul(sub(b, c), 2 * t)));
// 엄지 반폭(등쪽, 바닥쪽): 뿌리 → IP 관절(t≈0.5, 마디가 살짝 볼록) → 지문 패드(t≈0.8) → 끝
function halfWidth(t) {
  // 실제 엄지는 키 한 칸보다 굵다: 뿌리 ~108, 관절 ~84, 지문 패드 ~90 (키 폭 108)
  const knuckle = Math.exp(-(((t - 0.52) / 0.07) ** 2)) * 3.5;
  const pad = Math.exp(-(((t - 0.8) / 0.1) ** 2)) * 4.5;
  const taper = 54 - 13 * Math.min(t / 0.55, 1);
  return [taper + knuckle, taper + pad - knuckle * 0.6];
}

// 손 외곽점(시계 방향): 검지 → 물갈퀴 → 엄지 등쪽 → 손끝 → 엄지 바닥쪽 → 엄지두덩 → 화면 밖 손바닥.
// 화면 밖 점들도 고르게 두어 곡선이 튀지 않게 한다.
function leftOutline({ base, tip, ctrl }) {
  const N = 8;
  const dorsalSide = [];
  const palmSide = [];
  for (let i = 0; i <= N; i++) {
    const t = 0.1 + (i / N) * 0.8;
    const c = bez(base, ctrl, tip, t);
    const n = dorsal(bezTan(base, ctrl, tip, t));
    const [wd, wp] = halfWidth(t);
    dorsalSide.push(add(c, mul(n, wd)));
    palmSide.push(add(c, mul(n, -wp)));
  }
  // 손끝 돔: 등쪽 → 앞 → 바닥쪽 (앞쪽으로 조금 긴 반타원)
  const e = bezTan(base, ctrl, tip, 0.95);
  const n = dorsal(e);
  const domeC = bez(base, ctrl, tip, 0.93);
  const [rd, rp] = halfWidth(0.93);
  const dome = [];
  for (let i = 1; i < 6; i++) {
    const th = Math.PI / 2 - (i * Math.PI) / 6;
    const r = th > 0 ? rd : rp;
    dome.push(add(domeC, add(mul(e, Math.cos(th) * (len(sub(tip, domeC)) + 24)), mul(n, Math.sin(th) * r))));
  }
  const [, by] = base;
  // 손 바깥선: 휴대폰 옆면을 감싼 손(검지 옆면)이 엄지 뿌리 위쪽까지 가장자리를 얇게 덮고,
  // 엄지와 검지 사이 물갈퀴에서 오목하게 꺾여 엄지 등으로 이어진다.
  const gripTop = [EDGE_GRIP - 34, by - 140];
  const gripMid = [EDGE_GRIP - 18, by - 96];
  const web = lerp(gripMid, dorsalSide[0], 0.5);
  // 엄지두덩: 엄지 바닥쪽 뿌리에서 둥글게 부풀어 휴대폰 아래 모서리를 감싸고 화면 밖으로 빠진다
  const palmRoot = palmSide[0];
  return [
    [-120, by - 150],
    [-6, by - 150],
    gripTop,
    gripMid,
    add(web, mul(norm(sub(base, web)), 12)), // 물갈퀴는 오목
    ...dorsalSide,
    ...dome,
    ...palmSide.slice().reverse(),
    add(palmRoot, [-2, 34]),
    add(palmRoot, [-14, 78]),
    [palmRoot[0] - 36, by + 150],
    [-120, by + 150]
  ];
}

// 닫힌 Catmull-Rom 스플라인 → 부드러운 3차 베지어 경로
export function smoothClosedPath(pts) {
  const n = pts.length;
  const f = (v) => v.toFixed(1);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

// side: 'left' | 'right', tip: 엄지 끝(지문 패드 중심)이 닿을 좌표
export function thumbHand(side, tip) {
  const isLeft = side === 'left';
  const pose = leftPose(isLeft ? tip : mirror(tip));
  let pts = leftOutline(pose);
  let { base } = pose;
  const dir = bezTan(pose.base, pose.ctrl, pose.tip, 1);
  let padDir = dir;
  if (!isLeft) {
    pts = pts.map(mirror);
    base = mirror(base);
    padDir = [-dir[0], dir[1]];
  }
  return {
    d: smoothClosedPath(pts),
    base,
    tip,
    curl: pose.curl,
    padAngle: (Math.atan2(padDir[1], padDir[0]) * 180) / Math.PI
  };
}

// 실제 두 손 천지인 입력의 엄지 분담: 왼쪽 두 열(ㅣ ㆍ / ㄱㅋ ㄴㄹ / ㅂㅍ ㅅㅎ / 한/영 ㅇㅁ)은 왼손,
// 오른쪽 두 열(ㅡ ⌫ / ㄷㅌ ↵ / ㅈㅊ .,?! / 띄어쓰기)은 오른손.
export const cjThumbSide = (key) => (key && key.col <= 1 ? 'left' : 'right');
