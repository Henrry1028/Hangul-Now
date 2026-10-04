// ESLint (flat config) — frontend/src 품질 기준선
// - React Hooks 규칙: StrictMode에서 effect가 두 번 실행되므로 의존성·cleanup 실수를 잡는다.
// - 기존 코드는 경고(warn) 중심으로 시작한다. 새 코드에서 경고를 늘리지 않는 것을 기준으로 한다.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // JSX에서만 쓰이는 import(React, 컴포넌트)는 no-unused-vars가 인식하지 못하므로 대문자 시작 이름은 제외
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'e2e/**/*.{js,mjs}', '*.config.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
];
