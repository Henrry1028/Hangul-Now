import { authHeaders } from './authHeaders.js';
// Legacy "already learned" store (hn-learned), shared by Reading and Writing.
const LEARNED_STORAGE_KEY = 'hn-learned';

export function loadLearnedTopics(type) {
  try {
    return JSON.parse(window.localStorage.getItem(LEARNED_STORAGE_KEY) || '{}')[type] || {};
  } catch {
    return {};
  }
}

export function recordLearnedTopic(type, key, label, userId = null) {
  if (!key) return;
  try {
    const all = JSON.parse(window.localStorage.getItem(LEARNED_STORAGE_KEY) || '{}');
    const learned = all[type] || {};
    const previous = learned[key];
    learned[key] = {
      label: label || previous?.label || key,
      firstAt: previous?.firstAt || Date.now(),
      lastAt: Date.now(),
      count: (previous?.count || 0) + 1
    };
    all[type] = learned;
    window.localStorage.setItem(LEARNED_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Match the legacy client: storage failures do not block the learning action.
  }
  if (userId) {
    authHeaders()
      .then((headers) => fetch('/api/learning/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId, type, items: [{ key, label: label || key }] })
      }))
      .catch(() => {});
  }
}
