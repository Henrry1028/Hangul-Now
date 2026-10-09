import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_GREETING_TEXT,
  DEFAULT_GREETING_TR,
  RETENTION_MS,
  CHAT_STORAGE_KEY,
  createDefaultGreetingMessage,
  pruneOldMessages,
  loadStoredChatMessages,
  saveStoredChatMessages,
  getTodayIso
} from './chatData.js';

describe('chatData 7-day retention and default greeting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates the default greeting message for tutor', () => {
    const msg = createDefaultGreetingMessage('jiwoo');
    expect(msg.from).toBe('t');
    expect(msg.text).toBe(DEFAULT_GREETING_TEXT);
    expect(msg.text).toBe('안녕하세요! 오늘은 어떤 얘기를 해볼까요?');
    expect(msg.tr).toBe(DEFAULT_GREETING_TR);
    expect(msg.date).toBe(getTodayIso());
    expect(typeof msg.timestamp).toBe('number');
  });

  it('retains messages within 7 days and discards older ones', () => {
    const now = Date.now();
    const sixDaysAgo = now - (6 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000);

    const messages = [
      { id: '1', text: '6일 전 대화', timestamp: sixDaysAgo },
      { id: '2', text: '8일 전 대화', timestamp: eightDaysAgo },
      { id: '3', text: '오늘 대화', timestamp: now }
    ];

    const result = pruneOldMessages(messages, now);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(['1', '3']);
  });

  it('discards legacy mock messages such as Emma weekend prompt', () => {
    const now = Date.now();
    const messages = [
      { id: 'legacy-1', text: '에마 씨, 좋은 아침이에요! 주말에 뭐 할 거예요?', timestamp: now },
      { id: 'legacy-2', text: '어제는 비가 많이 왔어서 못 갔어요.', timestamp: now },
      { id: 'normal-1', text: '안녕하세요! 좋은 아침이에요.', timestamp: now }
    ];

    const result = pruneOldMessages(messages, now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('normal-1');
  });

  it('persists and loads messages from localStorage with automatic greeting fallback', () => {
    const initial = loadStoredChatMessages();
    expect(initial.jiwoo).toBeDefined();
    expect(initial.jiwoo[0].text).toBe(DEFAULT_GREETING_TEXT);

    // Save a custom conversation
    const customMsgs = {
      jiwoo: [
        initial.jiwoo[0],
        { id: 'user-1', from: 'me', text: '한국어 공부하고 싶어요', timestamp: Date.now() }
      ]
    };
    saveStoredChatMessages(customMsgs);

    const reloaded = loadStoredChatMessages();
    expect(reloaded.jiwoo).toHaveLength(2);
    expect(reloaded.jiwoo[1].text).toBe('한국어 공부하고 싶어요');

    // Other tutors should have the fallback greeting
    expect(reloaded.minho).toBeDefined();
    expect(reloaded.minho[0].text).toBe(DEFAULT_GREETING_TEXT);
  });
});
