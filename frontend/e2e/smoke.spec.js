// 주요 화면 스모크 테스트 — 게스트로 모든 메뉴를 열고 렌더링·오류·가로 넘침을 확인한다.
// AI·TTS 호출은 하지 않는다 (비용 없음).
import { expect, test } from '@playwright/test';

const SCREENS = [
  ['Today', '02 Today'],
  ['Curriculum', '03 Tutors'],
  ['Chat', '04 Chat'],
  ['Listening', '05 Listening'],
  ['Reading', '06 Reading'],
  ['Writing', '07 Writing'],
  ['Speaking', '08 Speaking'],
  ['Conversation', '08b Conversation'],
  ['My progress', '09 My progress'],
  ['About us', '10 About us']
];

const screenLabel = (page) => page.locator('.app-main-viewport [data-screen-label]').first().getAttribute('data-screen-label');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('hn-lang', 'en'); } catch { /* ignore */ }
  });
});

test('serves the React build with metadata', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Hangul Now | 행글 나우');
  await expect(page.locator('#root')).not.toBeEmpty();
  expect((await request.get('/site.webmanifest')).ok()).toBeTruthy();
  expect((await request.get('/favicon.ico')).ok()).toBeTruthy();
  const unknownApi = await request.get('/api/does-not-exist');
  expect(unknownApi.status()).toBe(404);
  expect((await request.get('/api/health')).ok()).toBeTruthy();
});

test('every navigation target renders without errors or overflow', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/api/')) problems.push(`${r.status()} ${r.url()}`); });

  await page.goto('/');
  await expect.poll(() => screenLabel(page)).toBe('01 Landing');
  for (const [label, screen] of SCREENS) {
    await page.locator('button:visible', { hasText: label }).filter({ hasNot: page.locator('header') }).last().click();
    await expect.poll(() => screenLabel(page), { message: `${label} → ${screen}` }).toBe(screen);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `${screen} horizontal overflow`).toBe(false);
  }
  expect(problems).toEqual([]);
});

test('guests never see admin or Video Class entry points, even with ?admin=1', async ({ page }) => {
  await page.goto('/?admin=1');
  await expect.poll(() => screenLabel(page)).toBe('01 Landing');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/👑|LIVE VIDEO CLASS|1:1 Live Class|1:1 Video/);
  await page.goto('/videoclass');
  await expect.poll(() => screenLabel(page)).toBe('01 Landing');
});
