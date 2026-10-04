// Vitest — 순수 로직 단위 테스트 (빌드 설정 vite.config.js와 분리)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true
  }
});
