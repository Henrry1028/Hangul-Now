import { describe, expect, it } from 'vitest';
import { CJ_MAP } from './writingData.js';
import { CJ_PAD_W, CJ_THUMB_REST, cjThumbSide, smoothClosedPath, thumbHand } from './cjHandModel.js';

describe('천지인 엄지 손 그림자 모델', () => {
  it('splits keys between thumbs like real two-handed Cheonjiin typing', () => {
    for (const k of ['CJ_I', 'CJ_DOT', 'CJ_GK', 'CJ_NR', 'CJ_BP', 'CJ_SH', 'CJ_LANG', 'CJ_OM']) expect(cjThumbSide(CJ_MAP[k])).toBe('left');
    for (const k of ['CJ_EU', 'Backspace', 'CJ_DT', 'Enter', 'CJ_JC', 'CJ_PUNCT', 'Space']) expect(cjThumbSide(CJ_MAP[k])).toBe('right');
  });

  it('puts the thumb tip on the target and the root at the lower outside corner', () => {
    const k = CJ_MAP.CJ_NR;
    const h = thumbHand('left', [k.cx, k.cy]);
    expect(h.tip).toEqual([k.cx, k.cy]);
    expect(h.base[0]).toBeLessThan(30);
    expect(h.base[1]).toBeGreaterThan(k.cy);
    expect(h.d.startsWith('M ')).toBe(true);
    expect(h.d.endsWith('Z')).toBe(true);
    expect(h.d).not.toMatch(/NaN|Infinity/);
  });

  it('slides the hand up for top-row keys and curls the thumb for near keys', () => {
    const top = thumbHand('left', [CJ_MAP.CJ_I.cx, CJ_MAP.CJ_I.cy]);
    const near = thumbHand('left', [CJ_MAP.CJ_LANG.cx, CJ_MAP.CJ_LANG.cy]);
    expect(top.base[1]).toBeLessThan(near.base[1]);
    expect(near.curl).toBeGreaterThan(top.curl);
  });

  it('mirrors the right hand exactly', () => {
    const l = thumbHand('left', CJ_THUMB_REST.left);
    const r = thumbHand('right', CJ_THUMB_REST.right);
    expect(r.base[0]).toBeCloseTo(CJ_PAD_W - l.base[0], 6);
    expect(r.base[1]).toBeCloseTo(l.base[1], 6);
    const rad = (deg) => (deg * Math.PI) / 180;
    expect(Math.cos(rad(r.padAngle))).toBeCloseTo(-Math.cos(rad(l.padAngle)), 6);
    expect(Math.sin(rad(r.padAngle))).toBeCloseTo(Math.sin(rad(l.padAngle)), 6);
  });

  it('builds a closed smooth path through every point', () => {
    const d = smoothClosedPath([[0, 0], [10, 0], [10, 10], [0, 10]]);
    expect(d.match(/ C /g)).toHaveLength(4);
  });
});
