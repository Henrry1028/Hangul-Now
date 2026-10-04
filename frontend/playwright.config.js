// Playwright 스모크 테스트 — 실행 중인 서버를 대상으로 한다.
// 로컬 운영형: 프로젝트 루트에서 `npm start` 후 `cd frontend && npm run test:e2e`
// 다른 대상:   BASE_URL=https://<host> npm run test:e2e
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }
  ]
});
