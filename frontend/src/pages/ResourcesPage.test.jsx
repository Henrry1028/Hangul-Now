import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import ResourcesPage from './ResourcesPage.jsx';
import { resourceFileName, resourceFormat } from '../data/resourcesData.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ITEMS = [
  { id: 'a1', type: 'audio', file: '/assets/resources/cafe-dialogue.mp3', title: { ko: '카페 대화 듣기', en: 'Café dialogue' }, duration: '02:10', size: '2.1 MB' },
  { id: 'd1', type: 'doc', file: '/assets/resources/hangul-chart.pdf', title: { ko: '한글 자모표', en: 'Hangul chart' }, desc: { ko: '자음·모음 정리', en: 'Consonants & vowels' }, size: '480 KB' }
];

let container;
let root;
const mount = (props) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ResourcesPage lang="ko" {...props} />));
};
const q = (s) => container.querySelector(s);
const qa = (s) => [...container.querySelectorAll(s)];
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ResourcesPage (자료실)', () => {
  it('lists documents with open + download and MP3 with a player + download', () => {
    mount({ items: ITEMS });
    expect(qa('.res-card')).toHaveLength(2);
    const doc = q('.res-card.is-doc');
    expect(doc.textContent).toContain('한글 자모표');
    expect([...doc.querySelectorAll('a')].map((a) => a.textContent.trim())).toEqual(['열기', '다운로드']);
    expect(doc.querySelector('a[download]').getAttribute('download')).toBe('hangul-chart.pdf');
    const audio = q('.res-card.is-audio');
    expect(audio.querySelector('audio').getAttribute('src')).toBe('/assets/resources/cafe-dialogue.mp3');
    expect(audio.querySelector('audio').getAttribute('preload')).toBe('none');
    expect(audio.textContent).toContain('MP3');
  });

  it('filters by documents / MP3 and shows counts', () => {
    mount({ items: ITEMS });
    const tabs = qa('.res-filters button');
    expect(tabs.map((b) => b.textContent)).toEqual(['전체 2', '문서 1', 'MP3 1']);
    click(tabs[2]);
    expect(qa('.res-card')).toHaveLength(1);
    expect(q('.res-card').classList.contains('is-audio')).toBe(true);
    click(tabs[1]);
    expect(q('.res-card').classList.contains('is-doc')).toBe(true);
  });

  it('shows an empty state when nothing is registered', () => {
    mount({ items: [] });
    expect(q('.res-empty').textContent).toContain('아직 등록된 자료가 없어요.');
  });

  it('derives format and download name from the file path', () => {
    expect(resourceFormat('/assets/resources/a.docx?v=2')).toBe('DOCX');
    expect(resourceFileName('/assets/resources/lesson-01.mp3?v=2')).toBe('lesson-01.mp3');
  });
});
