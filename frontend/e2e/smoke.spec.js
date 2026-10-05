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
    try {
      localStorage.setItem('hn-lang', 'en');
      localStorage.setItem('hn-site-access', 'granted_20261028');
    } catch { /* ignore */ }
  });
});

test('serves the React build with metadata', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Hangul Now');
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

test('chat shows only the correction point; smart correction explains it in English', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });

  await page.route('**/api/correction', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      has_error: true,
      original: '어똥에 배달 해요?',
      wrong_span: '어똥에',
      fixed: '어떻게',
      rule_id: 'SPELLING_ERROR',
      brief_ko: "맞춤법: '어떻게'",
      brief_en: 'Spelling: 어떻게',
      explanation_ko: '방법을 묻는 말은 어떻게라고 써요.',
      explanation_en: 'Use 어떻게 for “how”.'
    })
  }));
  await page.route('**/api/chat', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ reply: '배달 앱으로 주문할 수 있어요.' })
  }));

  await page.goto('/');
  await page.locator('button:visible', { hasText: 'Chat' }).filter({ hasNot: page.locator('header') }).last().evaluate((button) => button.click());
  await expect.poll(() => screenLabel(page)).toBe('04 Chat');

  const chatScreen = page.locator('[data-screen-label="04 Chat"]');
  await chatScreen.locator('input').fill('어똥에 배달 해요?');
  await chatScreen.getByRole('button', { name: 'Send' }).click();

  const smartCorrection = chatScreen.locator('[data-correction-source="live-chat"]');
  await expect(smartCorrection).toContainText('어똥에');
  await expect(smartCorrection).toContainText('어떻게');
  await expect(smartCorrection).toContainText('Use 어떻게 for “how”.');
  await expect(smartCorrection).not.toContainText('친구하고 한강을 가요');

  // 채팅 말풍선 아래에는 짧은 요점만: 자세한 설명은 패널에만 있다.
  const chatPane = chatScreen.locator('.chat-main-pane');
  await expect(chatPane).toContainText("맞춤법: '어떻게'");
  await expect(chatPane).not.toContainText('Use 어떻게 for “how”.');
  await expect(chatPane).not.toContainText('방법을 묻는 말은 어떻게라고 써요.');
  expect(problems).toEqual([]);
});

test('reading shows the passage before practice enrichment finishes', async ({ page }) => {
  await page.route('**/api/content/generate', async (route) => {
    const payload = route.request().postDataJSON();
    if (payload.phase === 'core') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          topic: '시장 방문',
          title: '주말 시장',
          subtitle: 'A weekend market visit',
          paragraphs: [
            { text: '주말에 시장에 갔어요.', en: 'I went to the market on the weekend.' },
            { text: '과일을 사고 친구를 만났어요.', en: 'I bought fruit and met a friend.' }
          ],
          level: 'beginner',
          phase: 'core'
        })
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        paragraphWords: [['시장'], ['과일']],
        glossary: [{ word: '시장', pos: 'noun', en: 'market', ex: '시장에 가요 — I go to the market.' }],
        questions: [{ q: '어디에 갔어요?', en: 'Where did they go?', opts: ['시장', '학교', '회사'], a: 0 }],
        grammar: [{ form: '-에 가다', ko: '목적지를 나타내요.', example: '시장에 갔어요.' }]
      })
    });
  });

  await page.goto('/');
  await page.locator('button:visible', { hasText: 'Reading' }).filter({ hasNot: page.locator('header') }).last().evaluate((button) => button.click());
  await expect.poll(() => screenLabel(page)).toBe('06 Reading');

  const readingScreen = page.locator('[data-screen-label="06 Reading"]');
  await readingScreen.getByRole('button', { name: 'New material' }).click();
  await expect(readingScreen).toContainText('주말 시장');
  await expect(readingScreen).toContainText('Passage ready · adding practice…');
  await expect(readingScreen).toContainText('Where did they go?');
  await expect(readingScreen).toContainText('-에 가다');
  await expect(readingScreen).not.toContainText('Passage ready · adding practice…');
});
