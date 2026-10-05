import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatPage from './ChatPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const chat = {
  sendText: vi.fn(),
  setDraft: vi.fn(),
  toggleAll: vi.fn(),
  toggleMessage: vi.fn()
};

function stateWith(messages) {
  return {
    msgs: { jiwoo: messages },
    chatTransLoading: false,
    chatTransTutorId: '',
    chatTranslationError: '',
    trAll: false,
    trOpen: {},
    typing: false,
    draft: ''
  };
}

function mount(messages, lang = 'en') {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(
    <ChatPage
      lang={lang}
      selectedTutorId="jiwoo"
      chatState={stateWith(messages)}
      chat={chat}
      onNavigate={vi.fn()}
    />
  ));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ChatPage smart correction sync', () => {
  it('renders the real correction attached to the left chat message', () => {
    mount([{
      id: 'message-1',
      from: 'me',
      text: '어똥에 배달 해요?',
      time: '16:46',
      correctionChecked: true,
      fix: {
        wrong: '어똥에',
        right: '어떻게',
        ruleId: 'SPELLING_ERROR',
        note: ['Use 어떻게 for “how”.', '방법을 묻는 말은 어떻게라고 써요.']
      }
    }]);

    const panel = container.querySelector('[data-correction-source="live-chat"]');
    expect(panel.textContent).toContain('어똥에');
    expect(panel.textContent).toContain('어떻게');
    expect(panel.textContent).toContain('Use 어떻게 for “how”.');
    expect(panel.textContent).not.toContain('친구하고 한강을 가요');
  });

  it('shows pending and clean results for the latest chat message', () => {
    mount([{ id: 'message-2', from: 'me', text: '확인 중인 문장', time: '16:47', correctionPending: true }], 'ko');
    expect(container.querySelector('[data-correction-source="live-chat"]').textContent).toContain('분석 중');

    act(() => root.render(
      <ChatPage
        lang="ko"
        selectedTutorId="jiwoo"
        chatState={stateWith([{ id: 'message-2', from: 'me', text: '오늘 날씨가 좋아요.', time: '16:47', correctionChecked: true }])}
        chat={chat}
        onNavigate={vi.fn()}
      />
    ));

    expect(container.querySelector('[data-correction-source="live-chat"]').textContent).toContain('자연스러운 문장');
  });
});
