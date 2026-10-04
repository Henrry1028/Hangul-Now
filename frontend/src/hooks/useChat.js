import { useMemo, useRef } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { REPLIES, nowHM } from '../data/chatData.js';

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

// Legacy chat controller (sendText, requestInlineCorrection, translateMissingChatMessages,
// toggleChatTranslations). It lives at App level so replies, corrections and translations
// still land after leaving the Chat screen, like the legacy app-wide state.
export default function useChat(chatState, updateChatState, tutorId, recordActivity) {
  const stateRef = useRef(chatState);
  stateRef.current = chatState;
  const tutorRef = useRef(tutorId);
  tutorRef.current = tutorId;
  const recordRef = useRef(recordActivity);
  recordRef.current = recordActivity;
  const requestsRef = useRef(new Set());
  const mockTimerRef = useRef(null);

  return useMemo(() => {
    const translateMissing = async (tid = tutorRef.current) => {
      if (!tid) return;
      if (requestsRef.current.has(tid)) return;
      const source = stateRef.current.msgs[tid] || [];
      const missing = source
        .map((message, index) => ({ index, id: message.id || '', text: String(message.text || '').trim(), tr: message.tr, from: message.from }))
        .filter((message) => message.from === 't' && message.text && !message.tr);
      if (!missing.length) {
        if (stateRef.current.chatTransTutorId === tid) updateChatState({ chatTransLoading: false, chatTransTutorId: '' });
        return;
      }
      requestsRef.current.add(tid);
      updateChatState({ chatTransLoading: true, chatTransTutorId: tid, chatTranslationError: '' });
      let completed = false;
      try {
        for (let start = 0; start < missing.length; start += 20) {
          const batch = missing.slice(start, start + 20);
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lines: batch.map((message) => message.text) })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`);
          if (!Array.isArray(data.translations) || data.translations.length !== batch.length || data.translations.some((text) => !String(text || '').trim())) {
            throw new Error('번역 응답이 일부 누락되었습니다.');
          }
          updateChatState((prev) => {
            const list = [...(prev.msgs[tid] || [])];
            batch.forEach((requested, offset) => {
              let index = requested.index;
              if (requested.id) index = list.findIndex((message) => message.id === requested.id);
              const current = list[index];
              if (current?.from === 't' && current.text === requested.text && !current.tr) {
                list[index] = { ...current, tr: String(data.translations[offset]).trim() };
              }
            });
            return { msgs: { ...prev.msgs, [tid]: list } };
          });
          await nextTick();
        }
        completed = true;
      } catch (err) {
        updateChatState({ chatTranslationError: `영어 번역을 불러오지 못했습니다: ${err?.message || err}` });
      } finally {
        requestsRef.current.delete(tid);
        updateChatState((prev) => (prev.chatTransTutorId === tid ? { chatTransLoading: false, chatTransTutorId: '' } : {}));
        await nextTick();
        // A reply that arrived during the request is translated next.
        const st = stateRef.current;
        if (completed && st.trAll && tutorRef.current === tid) {
          const hasMore = (st.msgs[tid] || []).some((message) => message.from === 't' && message.text && !message.tr);
          if (hasMore) translateMissing(tid);
        }
      }
    };

    const requestInlineCorrection = async (tid, messageId, sentence) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch('/api/correction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sentence, userId: null }),
          signal: controller.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`);
        if (data.error) throw new Error(data.error);
        updateChatState((prev) => ({
          msgs: {
            ...prev.msgs,
            [tid]: (prev.msgs[tid] || []).map((message) => {
              if (message.id !== messageId) return message;
              const next = { ...message, correctionPending: false, correctionError: '' };
              if (data.has_error && data.wrong_span && data.fixed) {
                next.fix = {
                  wrong: String(data.wrong_span).trim(),
                  right: String(data.fixed).trim(),
                  note: [
                    String(data.explanation_en || data.explanation_ko || '').trim(),
                    String(data.explanation_ko || data.explanation_en || '').trim()
                  ]
                };
              }
              return next;
            })
          }
        }));
      } catch (err) {
        console.warn('[Correction API Error]', err);
        updateChatState((prev) => ({
          msgs: {
            ...prev.msgs,
            [tid]: (prev.msgs[tid] || []).map((message) => (message.id === messageId
              ? { ...message, correctionPending: false, correctionError: err?.name === 'AbortError' ? 'TIMEOUT' : (err?.message || 'ERROR') }
              : message))
          }
        }));
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const translateAfterReply = async (tid) => {
      await nextTick();
      if (stateRef.current.trAll && tutorRef.current === tid) translateMissing(tid);
    };

    const sendText = (rawText) => {
      const text = (rawText || '').trim();
      if (!text) return;
      const targetTutorId = tutorRef.current;
      const targetTutor = TUTORS.find((tu) => tu.id === targetTutorId);
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const userMsg = { id: msgId, from: 'me', text, time: nowHM(), pending: true, correctionPending: true, correctionError: '' };
      // Legacy quirk: raw TUTORS entries have no `name`, so activity titles always say 지우.
      const tutorName = targetTutor?.name || '지우';

      recordRef.current?.({ type: 'chat', module: '튜터 대화', icon: '💬', title: `${tutorName} 튜터에게 메시지 전송`, detail: `"${text}"`, xp: 15, tag: '채팅 발송' });
      updateChatState((prev) => ({
        msgs: { ...prev.msgs, [targetTutorId]: [...(prev.msgs[targetTutorId] || []), userMsg] },
        draft: '',
        typing: tutorRef.current === targetTutorId ? true : prev.typing
      }));
      nextTick().then(() => requestInlineCorrection(targetTutorId, msgId, text));

      const isMock = typeof window !== 'undefined' && (
        new URLSearchParams(window.location.search).get('mock') === 'true'
        || (() => { try { return localStorage.getItem('hn_mock') === 'true'; } catch { return false; } })()
      );
      if (isMock) {
        clearTimeout(mockTimerRef.current);
        mockTimerRef.current = setTimeout(() => {
          const r = REPLIES[stateRef.current.ri % REPLIES.length];
          recordRef.current?.({ type: 'chat', module: '튜터 대화', icon: '💬', title: `${tutorName} 튜터 피드백 수신`, detail: r.text.slice(0, 80), xp: 20, tag: '답변 및 교정' });
          updateChatState((prev) => {
            const list = (prev.msgs[targetTutorId] || []).map((m) => (m.id === msgId ? { ...m, pending: false } : m));
            list.push({ id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, from: 't', text: r.text, tr: r.tr, time: nowHM() });
            const stillPending = list.some((m) => m.pending);
            return { msgs: { ...prev.msgs, [targetTutorId]: list }, typing: tutorRef.current === targetTutorId ? stillPending : prev.typing, ri: prev.ri + 1 };
          });
          translateAfterReply(targetTutorId);
        }, 1600);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const rawHistory = (stateRef.current.msgs[targetTutorId] || []).filter((m) => !m.pending && m.text);
      const history = rawHistory.slice(-8).map((m) => ({ role: m.from === 'me' ? 'user' : 'model', content: m.text }));

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: targetTutorId, message: text, history }),
        signal: controller.signal
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP_${res.status}`);
          const data = await res.json();
          if (!data || typeof data.reply !== 'string' || data.reply.trim().length === 0) throw new Error('INVALID_REPLY');
          return data;
        })
        .then((data) => {
          recordRef.current?.({ type: 'chat', module: '튜터 대화', icon: '💬', title: `${tutorName} 튜터 피드백 수신`, detail: data.reply.trim().slice(0, 80), xp: 20, tag: '답변 및 교정' });
          updateChatState((prev) => {
            const updated = (prev.msgs[targetTutorId] || []).map((m) => (m.id === msgId ? { ...m, pending: false } : m));
            updated.push({
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              from: 't',
              text: data.reply.trim(),
              tr: typeof data.translation === 'string' ? data.translation : '',
              time: nowHM()
            });
            const stillPending = updated.some((m) => m.pending);
            return { msgs: { ...prev.msgs, [targetTutorId]: updated }, typing: tutorRef.current === targetTutorId ? stillPending : prev.typing };
          });
          translateAfterReply(targetTutorId);
        })
        .catch((err) => {
          console.error('[Chat API Error]', err);
          updateChatState((prev) => {
            const updated = (prev.msgs[targetTutorId] || []).map((m) => (m.id === msgId ? { ...m, pending: false } : m));
            updated.push({ from: 't', text: '지금 답변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', time: nowHM() });
            const stillPending = updated.some((m) => m.pending);
            return { msgs: { ...prev.msgs, [targetTutorId]: updated }, typing: tutorRef.current === targetTutorId ? stillPending : prev.typing };
          });
        })
        .finally(() => clearTimeout(timeoutId));
    };

    const toggleAll = async () => {
      const next = !stateRef.current.trAll;
      updateChatState({ trAll: next, chatTranslationError: '' });
      await nextTick();
      if (next) translateMissing(tutorRef.current);
    };

    const toggleMessage = async (trKey, hasTr) => {
      const next = !stateRef.current.trOpen[trKey];
      updateChatState((prev) => ({ trOpen: { ...prev.trOpen, [trKey]: next }, chatTranslationError: '' }));
      await nextTick();
      if (next && !hasTr) translateMissing(tutorRef.current);
    };

    // Legacy selectTutor side effects on chat state.
    const onTutorSelected = async (id) => {
      updateChatState((prev) => {
        const unread = { ...prev.unread };
        delete unread[id];
        return { unread, chatTranslationError: '' };
      });
      await nextTick();
      if (stateRef.current.trAll) translateMissing(id);
    };

    return { sendText, toggleAll, toggleMessage, onTutorSelected, setDraft: (draft) => updateChatState({ draft }) };
  }, [updateChatState]);
}
