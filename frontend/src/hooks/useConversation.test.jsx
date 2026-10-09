import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useConversation from './useConversation.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let current;
let container;
let root;

class MockWebSocket {
  static OPEN = 1;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.OPEN;
    this.sent = [];
    MockWebSocket.instances.push(this);
  }

  send(value) { this.sent.push(JSON.parse(value)); }
  close() { this.readyState = 3; }
}

class MockAudioContext {
  constructor() { this.destination = {}; }
  createMediaStreamSource() { return { connect: vi.fn() }; }
  createScriptProcessor() { return { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null }; }
  close() {}
}

function Harness() {
  current = useConversation({
    tutorId: 'jiwoo',
    lang: 'ko',
    reviewMode: false,
    recordActivity: vi.fn(),
    currentUser: null,
    profile: { nickname: '테스터', nationality: '', interests: [] }
  });
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-09T08:00:00Z'));
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubGlobal('AudioContext', MockAudioContext);
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: MockAudioContext });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) }
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => current.stop(false));
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useConversation lesson duration contract', () => {
  it('sends the selected duration and wraps up one minute before that timer ends', async () => {
    act(() => current.setDuration(30));
    expect(current.state.cvRemainingSeconds).toBe(1800);

    await act(async () => current.start());
    const socket = MockWebSocket.instances[0];
    act(() => socket.onopen());

    const startMessage = socket.sent.find((message) => message.type === 'start');
    expect(startMessage.lessonDurationMinutes).toBe(30);

    act(() => socket.onmessage({ data: JSON.stringify({
      type: 'ready', tutor: '김지우', model: 'gemini-live', lessonDurationMinutes: 30
    }) }));
    expect(current.state.cvStatus).toBe('live');
    expect(current.state.cvRemainingSeconds).toBe(1800);

    vi.setSystemTime(new Date('2026-10-09T08:29:00Z'));
    act(() => vi.advanceTimersByTime(500));

    expect(current.state.cvRemainingSeconds).toBe(60);
    expect(socket.sent.some((message) => message.type === 'text' && message.text.includes('WRAP_UP_NOW'))).toBe(true);
    expect(current.state.cvWrapUpSent).toBe(true);
  });
});
