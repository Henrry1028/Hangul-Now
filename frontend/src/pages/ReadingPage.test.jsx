import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReadingPage, { normalizeSelectedKorean } from './ReadingPage.jsx';

vi.mock('../data/authHeaders.js', () => ({ authHeaders: vi.fn(async () => ({})) }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const response = (data) => ({ ok: true, status: 200, json: async () => data });
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ReadingPage lang="en" />));
}

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe('ReadingPage staged material generation', () => {
  it('normalizes Korean text selected with a mouse or touch gesture', () => {
    expect(normalizeSelectedKorean('  “분위기”  ')).toBe('분위기');
    expect(normalizeSelectedKorean('한국 사회')).toBe('한국 사회');
    expect(normalizeSelectedKorean('English only')).toBe('');
    expect(normalizeSelectedKorean('가'.repeat(41))).toBe('');
  });

  it('shows the passage before enrichment finishes and then merges practice content', async () => {
    let resolveEnrichment;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        topic: '시장 방문',
        title: '주말 시장',
        subtitle: 'A weekend market visit',
        paragraphs: [
          { text: '주말에 시장에 갔어요.', en: 'I went to the market on the weekend.' },
          { text: '과일을 사고 친구를 만났어요.', en: 'I bought fruit and met a friend.' }
        ],
        level: 'beginner',
        phase: 'core'
      }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveEnrichment = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    mount();

    expect(container.textContent).toContain('BUILD YOUR WORD BANK');
    expect(container.textContent).toContain('Vocabulary → My words');

    const generateButton = [...container.querySelectorAll('button')].find((button) => button.textContent === 'New material');
    act(() => generateButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();
    await flush();

    expect(container.textContent).toContain('주말 시장');
    expect(container.textContent).toContain('Passage ready · adding practice…');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).phase).toBe('core');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).phase).toBe('enrichment');

    await act(async () => {
      resolveEnrichment(response({
        paragraphWords: [['시장'], ['과일']],
        glossary: [{ word: '시장', pos: 'noun', en: 'market', ex: '시장에 가요 — I go to the market.' }],
        questions: [{ q: '어디에 갔어요?', en: 'Where did they go?', opts: ['시장', '학교', '회사'], a: 0 }],
        grammar: [{ form: '-에 가다', ko: '목적지를 나타내요.', example: '시장에 갔어요.' }]
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('Where did they go?');
    expect(container.textContent).toContain('-에 가다');
    expect(container.textContent).not.toContain('Passage ready · adding practice…');
  });
});
