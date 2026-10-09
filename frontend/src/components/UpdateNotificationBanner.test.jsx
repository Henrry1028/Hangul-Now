import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UpdateNotificationBanner from './UpdateNotificationBanner.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function mount(props = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <UpdateNotificationBanner
        lang={props.lang || 'ko'}
        versionInfo={props.versionInfo || null}
        isApplying={props.isApplying || false}
        onApply={props.onApply || vi.fn()}
        onDismiss={props.onDismiss || vi.fn()}
      />
    );
  });
  return container;
}

const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

afterEach(() => {
  if (root) act(() => root.unmount());
  if (container) container.remove();
});

describe('UpdateNotificationBanner', () => {
  it('renders Korean update banner with title and handles update click', () => {
    const onApply = vi.fn();
    const onDismiss = vi.fn();

    mount({
      lang: 'ko',
      versionInfo: {
        title: { ko: '새로운 기능 추가', en: 'New feature added' },
        description: { ko: '업데이트 설명', en: 'Update desc' }
      },
      onApply,
      onDismiss
    });

    expect(container.querySelector('.hn-update-title').textContent).toBe('새로운 기능 추가');
    expect(container.querySelector('.hn-update-desc').textContent).toBe('업데이트 설명');

    const refreshBtn = container.querySelector('.hn-update-btn-refresh');
    click(refreshBtn);
    expect(onApply).toHaveBeenCalledTimes(1);

    const closeBtn = container.querySelector('.hn-update-btn-close');
    click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders English update banner when lang is en', () => {
    mount({
      lang: 'en',
      versionInfo: {
        title: { ko: '새로운 기능', en: 'New update available' },
        description: { ko: '설명', en: 'Performance optimizations' }
      }
    });

    expect(container.querySelector('.hn-update-title').textContent).toBe('New update available');
    expect(container.querySelector('.hn-update-desc').textContent).toBe('Performance optimizations');
    expect(container.querySelector('.hn-update-badge').textContent).toBe('UPDATE');
  });

  it('shows applying state when isApplying is true', () => {
    mount({
      lang: 'ko',
      isApplying: true
    });

    const refreshBtn = container.querySelector('.hn-update-btn-refresh');
    expect(refreshBtn.disabled).toBe(true);
    expect(refreshBtn.textContent).toContain('적용 중…');
    expect(container.querySelector('.hn-update-spinner')).not.toBeNull();
    // 닫기 버튼은 적용 중에 숨겨짐
    expect(container.querySelector('.hn-update-btn-close')).toBeNull();
  });
});
