import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialConversationState } from '../data/conversationData.js';
import ConversationPage from './ConversationPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function mount(overrides = {}) {
  const setDuration = vi.fn();
  const state = { ...createInitialConversationState(), cvHistory: [], ...overrides };
  const conversation = {
    state,
    setDuration,
    setMode: vi.fn(),
    setLevel: vi.fn(),
    setScenario: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    toggleMute: vi.fn(),
    requestReport: vi.fn(),
    downloadRecord: vi.fn(),
    deleteConversation: vi.fn()
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(
    <ConversationPage
      lang="ko"
      selectedTutorId="jiwoo"
      conversation={conversation}
      translationState={{ trOn: false, cvTrans: {}, cvTransLoading: false }}
      onToggleTranslation={vi.fn()}
    />
  ));
  return { conversation };
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ConversationPage tutor lesson duration', () => {
  it('offers 10 through 50 minute lessons and explains the selected duration', () => {
    const { conversation } = mount({ cvDurationMinutes: 30, cvRemainingSeconds: 1800 });
    const group = container.querySelector('[aria-label="수업 시간 선택"]');
    const buttons = [...group.querySelectorAll('button')];

    expect(buttons.map((button) => button.textContent)).toEqual(['10분', '20분', '30분', '40분', '50분']);
    expect(group.querySelector('[aria-pressed="true"]').textContent).toBe('30분');
    expect(container.textContent).toContain('선택한 30분 동안 튜터와 대화');

    act(() => buttons[3].click());
    expect(conversation.setDuration).toHaveBeenCalledWith(40);
  });

  it('locks the duration while live and hides it for roleplay', () => {
    mount({ cvDurationMinutes: 20, cvRemainingSeconds: 1200, cvStatus: 'live' });
    expect([...container.querySelectorAll('[aria-label="수업 시간 선택"] button')].every((button) => button.disabled)).toBe(true);

    act(() => root.render(
      <ConversationPage
        lang="ko"
        selectedTutorId="jiwoo"
        conversation={{
          state: { ...createInitialConversationState(), cvMode: 'roleplay', cvHistory: [] },
          setDuration: vi.fn(), setMode: vi.fn(), setLevel: vi.fn(), setScenario: vi.fn(), start: vi.fn(), stop: vi.fn(), toggleMute: vi.fn(), requestReport: vi.fn(), downloadRecord: vi.fn(), deleteConversation: vi.fn()
        }}
        translationState={{ trOn: false, cvTrans: {}, cvTransLoading: false }}
        onToggleTranslation={vi.fn()}
      />
    ));
    expect(container.querySelector('[aria-label="수업 시간 선택"]')).toBeNull();
  });
});
