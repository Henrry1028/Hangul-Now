import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VideoClassPage from './VideoClassPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const tutor = {
  id: 't1', name: '김지우 (Jiwoo Kim)', photoURL: '', languages: ['한국어 (Native)', 'English (Fluent)'],
  specialties: ['일상 회화'], shortIntro: '따뜻한 튜터', bio: '안녕하세요!', availableDays: ['월', '수'],
  pricePerSession: { min50: 29000, min30: 19000 }, rating: 4.96, reviewCount: 142, lessonsCompleted: 380
};
const vc = { state: { vcTab: 'tutors', vcTutors: [tutor], vcBookings: [] }, update: vi.fn(), setTab: vi.fn(), loadVideoClassData: vi.fn(), openArrangeModal: vi.fn() };

let container;
let root;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  globalThis.fetch = vi.fn(async (_url, opts) => {
    const { lines } = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ translations: lines.map((l) => `EN:${l}`) }) };
  });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const toggle = () => [...container.querySelectorAll('button')].find((b) => /영어 번역/.test(b.textContent));

describe('VideoClassPage 영어 번역 보기 + 한국 시간', () => {
  it('shows a live KST clock that ticks every second', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
    vi.setSystemTime(new Date('2026-10-09T15:04:05Z'));
    act(() => root.render(<VideoClassPage vc={vc} />));
    const clock = () => container.querySelector('[data-testid="vc-kst-clock"] time').textContent;
    expect(clock()).toContain('2026년 10월 10일 (토)');
    expect(clock()).toMatch(/12:04:05/);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(clock()).toMatch(/12:04:06/);
  });

  it('toggles English for fixed labels and fetches English for tutor content', async () => {
    act(() => root.render(<VideoClassPage vc={vc} />));
    expect(container.querySelector('.vc-en')).toBeNull();
    expect(toggle().textContent).toBe('영어 번역 보기');

    await act(async () => toggle().click());
    await flush();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/translate');
    const text = container.textContent;
    expect(text).toContain('1:1 Online Korean Lesson Matching Platform');
    expect(text).toContain('Book a lesson');
    expect(text).toContain('Available Mon · Wed');
    expect(text).toContain('EN:따뜻한 튜터 — EN:안녕하세요!');
    expect(text).toContain('EN:일상 회화');
    expect(toggle().textContent).toBe('영어 번역 숨기기');

    await act(async () => toggle().click());
    expect(container.querySelector('.vc-en')).toBeNull();
    // 다시 켜면 캐시를 써서 재요청하지 않는다
    await act(async () => toggle().click());
    await flush();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('EN:일상 회화');
  });
});
