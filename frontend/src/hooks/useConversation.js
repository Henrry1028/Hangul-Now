import { useMemo, useRef, useState } from 'react';
import { TUTORS } from '../data/tutorsData.js';
import { loadLearnedTopics, recordLearnedTopic } from '../data/learnedData.js';
import { INTERESTS } from '../data/profileData.js';
import {
  SCENARIO_NAMES,
  createInitialConversationState,
  loadConversations,
  normalizeTutorSessionMinutes,
  storeConversations
} from '../data/conversationData.js';
import { authHeaders } from '../data/authHeaders.js';

// Legacy Gemini Live conversation controller (preview/index.html 4979-5450). It lives at
// App level because a legacy session keeps running while the learner visits other screens.
export default function useConversation({ tutorId, lang, reviewMode, recordActivity, currentUser, profile }) {
  const [state, setState] = useState(createInitialConversationState);
  const stateRef = useRef(state);
  const propsRef = useRef({});
  propsRef.current = { tutorId, lang, reviewMode, recordActivity, currentUser, profile };
  const r = useRef({}).current; // ws, stream, contexts, timers and flags

  const controller = useMemo(() => {
    const update = (patch) => {
      const current = stateRef.current;
      const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
      stateRef.current = next;
      setState(next);
    };
    const L = () => propsRef.current.lang === 'ko';
    const getNickname = () => propsRef.current.profile?.nickname
      || propsRef.current.currentUser?.displayName
      || propsRef.current.currentUser?.email?.split('@')[0]
      || 'Learner';
    const pickLessonInterest = () => {
      const list = (propsRef.current.profile?.interests || [])
        .map((id) => INTERESTS.find((item) => item.id === id))
        .filter(Boolean);
      if (!list.length) return null;
      const learned = loadLearnedTopics('topic');
      const key = (item) => `interest:${item.id}`;
      const oldest = (items) => items.slice().sort((a, b) => (learned[key(a)]?.lastAt || 0) - (learned[key(b)]?.lastAt || 0))[0];
      const seen = list.filter((item) => learned[key(item)]);
      if (propsRef.current.reviewMode) return seen.length ? oldest(seen) : list[0];
      return list.find((item) => !learned[key(item)]) || oldest(list);
    };

    const getConversationUserId = () => {
      if (propsRef.current.currentUser?.uid) return propsRef.current.currentUser.uid;
      try {
        let id = localStorage.getItem('hn-guest-id');
        if (!id) {
          id = `guest-${window.crypto?.randomUUID?.() || (`${Date.now()}-${Math.random().toString(16).slice(2)}`)}`;
          localStorage.setItem('hn-guest-id', id);
        }
        return id;
      } catch {
        return 'guest-local';
      }
    };

    const clearTutorClock = () => {
      clearInterval(r.timerIv);
      r.timerIv = null;
      r.endsAt = null;
    };

    const sendTutorWrapUp = () => {
      if (r.wrapUpTriggered || stateRef.current.cvMode === 'roleplay') return;
      if (!r.ws || r.ws.readyState !== WebSocket.OPEN) return;
      r.wrapUpTriggered = true;
      r.ws.send(JSON.stringify({
        type: 'text',
        text: '[SYSTEM: WRAP_UP_NOW] 수업 종료 1분 전입니다. 오늘 수업을 요약하고 핵심 표현 1개를 마지막으로 따라 말하게 한 뒤 finalize_session_data 도구를 호출하세요.'
      }));
      update({ cvWrapUpSent: true });
    };

    const startTutorClock = (rawMinutes) => {
      clearTutorClock();
      r.wrapUpTriggered = false;
      const minutes = normalizeTutorSessionMinutes(rawMinutes ?? stateRef.current.cvDurationMinutes);
      const durationSeconds = minutes * 60;
      r.endsAt = Date.now() + durationSeconds * 1000;
      update({ cvDurationMinutes: minutes, cvRemainingSeconds: durationSeconds, cvWrapUpSent: false });
      r.timerIv = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000));
        update({ cvRemainingSeconds: remaining });
        if (remaining <= 60) sendTutorWrapUp();
        if (remaining === 0) {
          clearTutorClock();
          stop(true);
        }
      }, 500);
    };

    const buildFinalizeFallback = (turns) => {
      const cards = stateRef.current.cvCards || [];
      return {
        session_summary: turns.slice(-6).map((t) => `${t.role}: ${t.text}`).join(' ').slice(0, 500),
        strengths: [],
        key_expression: cards.find((c) => c.corrected_to)?.corrected_to || '',
        new_episodes: [],
        new_mistakes: cards.filter((c) => c.corrected_from && c.corrected_to).slice(0, 5).map((c, index) => ({
          id: `lesson-${Date.now()}-${index + 1}`,
          topic: c.title || '튜터 수업', wrong: c.corrected_from, correct: c.corrected_to,
          category: String(c.category || 'EXPRESSION').toUpperCase()
        })),
        mastered_mistake_ids: []
      };
    };

    const collectTutorReviewTurns = () => {
      const turns = [...(stateRef.current.cvTurns || [])];
      const partial = stateRef.current.cvPartial || {};
      const at = new Date();
      if ((partial.user || '').trim()) turns.push({ role: 'user', text: partial.user.trim(), at });
      if ((partial.tutor || '').trim()) turns.push({ role: 'tutor', text: partial.tutor.trim(), at });
      return turns;
    };

    const reviewErrorPrefix = () => (L() ? '오디오 복습을 만들지 못했어요: ' : 'Could not create the audio review: ');

    const pollTutorReview = async (statusUrl) => {
      clearTimeout(r.reviewPollTt);
      try {
        const res = await fetch(statusUrl, { cache: 'no-store' });
        const job = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(job.error || `서버 응답 ${res.status}`);
        if (job.status === 'complete') {
          r.reviewStarted = false;
          update({ cvReviewStatus: 'ready', cvReviewStage: 'complete', cvReviewUrl: job.result?.audioReviewUrl || '', cvReviewError: '' });
          return;
        }
        if (job.status === 'error') throw new Error(job.error || '오디오 리뷰 생성 실패');
        update({ cvReviewStatus: 'generating', cvReviewStage: job.stage || 'running' });
        r.reviewPollTt = setTimeout(() => pollTutorReview(statusUrl), 1000);
      } catch (err) {
        r.reviewStarted = false;
        update({ cvReviewStatus: 'error', cvReviewStage: 'error', cvReviewError: reviewErrorPrefix() + (err?.message || err) });
      }
    };

    const completeTutorLesson = async (record, turns, finalizePayload) => {
      if (!record || !turns.length || r.reviewStarted || stateRef.current.cvReviewStatus === 'ready') return;
      r.reviewStarted = true;
      update({ cvReviewStatus: 'generating', cvReviewStage: 'queued', cvReviewUrl: '', cvReviewError: '' });
      try {
        const res = await fetch('/api/session/complete-and-review', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            userId: getConversationUserId(), sessionId: record.id,
            userNickname: getNickname(),
            feedbackLanguage: L() ? 'Korean' : 'English', tutorId: propsRef.current.tutorId,
            transcriptLogs: turns.map((t) => ({ role: t.role, text: t.text, at: (t.at instanceof Date ? t.at : new Date(t.at || Date.now())).getTime() })),
            finalizePayload: finalizePayload || buildFinalizeFallback(turns)
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `서버 응답 ${res.status}`);
        if (data.status === 'complete') {
          r.reviewStarted = false;
          update({ cvReviewStatus: 'ready', cvReviewStage: 'complete', cvReviewUrl: data.result?.audioReviewUrl || '', cvReviewError: '' });
        } else if (data.statusUrl) {
          pollTutorReview(data.statusUrl);
        } else {
          throw new Error('오디오 리뷰 작업 상태 URL이 없습니다.');
        }
      } catch (err) {
        r.reviewStarted = false;
        update({ cvReviewStatus: 'error', cvReviewError: reviewErrorPrefix() + (err?.message || err) });
      }
    };

    const clearAudioQueue = () => {
      (r.queue || []).forEach((n) => { try { n.stop(); } catch { /* ignore */ } });
      r.queue = [];
      r.playHead = 0;
    };

    const teardownAudio = () => {
      clearAudioQueue();
      try { if (r.node) { r.node.onaudioprocess = null; r.node.disconnect(); } } catch { /* ignore */ }
      try { if (r.stream) r.stream.getTracks().forEach((tr) => tr.stop()); } catch { /* ignore */ }
      try { if (r.inCtx) r.inCtx.close(); } catch { /* ignore */ }
      r.node = null; r.stream = null; r.inCtx = null;
    };

    const playLiveAudio = (b64) => {
      const ctx = r.outCtx || (r.outCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 }));
      const raw = atob(b64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const pcm = new Int16Array(bytes.buffer);
      const buf = ctx.createBuffer(1, pcm.length, 24000);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
      const node = ctx.createBufferSource();
      node.buffer = buf;
      node.connect(ctx.destination);
      r.queue = r.queue || [];
      const startAt = Math.max(ctx.currentTime, r.playHead || 0);
      node.start(startAt);
      r.playHead = startAt + buf.duration;
      r.queue.push(node);
      node.onended = () => { r.queue = (r.queue || []).filter((n) => n !== node); };
    };

    const startMicCapture = (stream, ws) => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      r.inCtx = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      r.node = node;
      node.onaudioprocess = (ev) => {
        if (ws.readyState !== WebSocket.OPEN || stateRef.current.cvMuted) return;
        const input = ev.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        let peak = 0;
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          if (Math.abs(s) > peak) peak = Math.abs(s);
        }
        let bin = '';
        const bytes = new Uint8Array(pcm.buffer);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        ws.send(JSON.stringify({ type: 'audio', data: btoa(bin) }));
        const lvl = Math.min(1, peak * 2.2);
        if (Math.abs(lvl - (stateRef.current.cvLevelMeter || 0)) > 0.06) update({ cvLevelMeter: lvl });
      };
      src.connect(node);
      node.connect(ctx.destination);
    };

    // Close one turn into the transcript (after tool calls and their explanations arrived).
    const flushTurn = () => {
      clearTimeout(r.flushTt); r.flushTt = null;
      const p = stateRef.current.cvPartial || {};
      if (!(p.user || '').trim() && !(p.tutor || '').trim()) { update({ cvSpeaking: false }); return; }
      const turns = [...(stateRef.current.cvTurns || [])];
      const at = new Date();
      if ((p.user || '').trim()) turns.push({ role: 'user', text: p.user.trim(), at });
      if ((p.tutor || '').trim()) turns.push({ role: 'tutor', text: p.tutor.trim(), at });
      update({ cvTurns: turns, cvPartial: { user: '', tutor: '' }, cvSpeaking: false });
    };

    const onLiveMessage = (msg) => {
      if (msg.type === 'ready') {
        const durationMinutes = normalizeTutorSessionMinutes(msg.lessonDurationMinutes ?? stateRef.current.cvDurationMinutes);
        update({ cvStatus: 'live', cvTutorName: msg.tutor, cvModel: msg.model, cvDurationMinutes: durationMinutes });
        if (stateRef.current.cvMode !== 'roleplay') startTutorClock(durationMinutes);
        return;
      }
      if (msg.type === 'error') { update({ cvError: msg.message, cvStatus: 'idle' }); return; }
      if (msg.type === 'audio') { playLiveAudio(msg.data); return; }
      if (msg.type === 'card') {
        update((st) => ({ cvCards: [{ ...msg.card, id: `c${Date.now()}${Math.random()}` }, ...(st.cvCards || [])].slice(0, 12) }));
        return;
      }
      if (msg.type === 'hint') {
        update((st) => ({ cvHints: [{ ...msg.hint, id: `h${Date.now()}${Math.random()}` }, ...(st.cvHints || [])].slice(0, 12) }));
        return;
      }
      if (msg.type === 'finalize') {
        const payload = msg.payload || {};
        update({ cvFinalizePayload: payload });
        const turns = collectTutorReviewTurns();
        if (turns.length) completeTutorLesson({ id: r.sessionId }, turns, payload);
        return;
      }
      if (msg.type === 'interrupted') { clearAudioQueue(); return; }
      if (msg.type === 'transcript') {
        clearTimeout(r.flushTt);
        r.flushTt = setTimeout(flushTurn, 2600);
        const prev = stateRef.current.cvPartial || {};
        update({ cvPartial: { ...prev, [msg.role]: (prev[msg.role] || '') + msg.text }, cvSpeaking: msg.role === 'tutor' });
        return;
      }
      if (msg.type === 'turnComplete') {
        clearTimeout(r.flushTt);
        r.flushTt = setTimeout(flushTurn, 2600);
        return;
      }
      if (msg.type === 'closed') { clearTutorClock(); update({ cvStatus: 'ended' }); }
    };

    const saveConversation = (turns) => {
      if (!turns || !turns.length) return null;
      const st = stateRef.current;
      const rec = {
        id: r.sessionId || `cv${Date.now()}`,
        savedAt: Date.now(),
        tutor: st.cvTutorName || '',
        level: st.cvLevel || 'beginner',
        mode: st.cvMode || 'tutor',
        turns: turns.map((t) => ({ role: t.role, text: t.text, at: (t.at instanceof Date ? t.at : new Date(t.at || Date.now())).getTime() })),
        hints: (st.cvHints || []).map((h) => ({
          error_phrase: h.error_phrase, corrected_phrase: h.corrected_phrase,
          situation_rule: h.situation_rule, romanization: h.romanization || '', at: h.at
        })),
        meta: {
          scenarioId: st.cvScenario || 'market',
          scenarioTitle: st.cvMode === 'roleplay' ? (SCENARIO_NAMES[st.cvScenario] || '롤플레잉') : (st.cvTutorName || '튜터 수업'),
          partnerName: st.cvTutorName || '상대',
          userName: propsRef.current.currentUser?.displayName || '',
          lessonDurationMinutes: st.cvMode === 'roleplay' ? undefined : normalizeTutorSessionMinutes(st.cvDurationMinutes),
          startedAt: r.startedAt || Date.now(),
          endedAt: Date.now()
        }
      };
      const list = [rec, ...loadConversations()].slice(0, 60);
      storeConversations(list);
      update({ cvHistory: list });
      return rec;
    };

    const stop = (flush = true) => {
      clearTutorClock();
      clearTimeout(r.flushTt); r.flushTt = null;
      try { if (r.ws && r.ws.readyState === WebSocket.OPEN) r.ws.send(JSON.stringify({ type: 'stop' })); } catch { /* ignore */ }
      try { if (r.ws) r.ws.close(); } catch { /* ignore */ }
      r.ws = null;
      teardownAudio();
      if (!flush) return;
      const st = stateRef.current;
      const p = st.cvPartial || {};
      const turns = [...(st.cvTurns || [])];
      const at = new Date();
      if ((p.user || '').trim()) turns.push({ role: 'user', text: p.user.trim(), at });
      if ((p.tutor || '').trim()) turns.push({ role: 'tutor', text: p.tutor.trim(), at });
      update({ cvStatus: 'ended', cvTurns: turns, cvPartial: { user: '', tutor: '' }, cvSpeaking: false, cvLevelMeter: 0 });
      const record = saveConversation(turns); // transcript kept in this browser for 7 days
      if (st.cvMode !== 'roleplay') completeTutorLesson(record, turns, st.cvFinalizePayload);
      if (!propsRef.current.reviewMode) {
        const topicKey = st.cvMode === 'roleplay' ? `scenario:${st.cvScenario}` : `lesson:${st.cvTutorName || ''}`;
        const topicLabel = st.cvMode === 'roleplay' ? (SCENARIO_NAMES[st.cvScenario] || '상황극')
          : ((turns.find((t) => t.role === 'tutor')?.text || '').slice(0, 40));
        const userId = propsRef.current.currentUser?.uid || null;
        if (topicLabel) recordLearnedTopic('topic', `${topicKey}:${topicLabel.slice(0, 20)}`, topicLabel, userId);
        if (st.cvMode !== 'roleplay' && r.interest) recordLearnedTopic('topic', `interest:${r.interest.id}`, r.interest.ko, userId);
      }
      const scenTitle = st.cvMode === 'roleplay' ? (SCENARIO_NAMES[st.cvScenario] || '상황극') : (st.cvTutorName || '수업');
      propsRef.current.recordActivity?.({
        type: 'conversation',
        module: '실시간 회화',
        icon: '🗣️',
        title: `Gemini Live 실시간 회화 (${scenTitle})`,
        detail: `총 ${turns.length}개 턴 완주 · 튜터: ${st.cvTutorName || '지우'} (교정 힌트 ${st.cvHints?.length || 0}건)`,
        xp: 50 + turns.length * 5,
        tag: '실시간 음성'
      });
    };

    const start = async () => {
      const st0 = stateRef.current;
      if (st0.cvStatus === 'connecting' || st0.cvStatus === 'live') return;
      const durationMinutes = normalizeTutorSessionMinutes(st0.cvDurationMinutes);
      const durationSeconds = durationMinutes * 60;
      clearTutorClock();
      clearTimeout(r.reviewPollTt); r.reviewPollTt = null;
      r.reviewStarted = false;
      r.wrapUpTriggered = false;
      r.sessionId = `cv${Date.now()}`;
      update({
        cvStatus: 'connecting', cvError: '', cvTurns: [], cvPartial: { user: '', tutor: '' },
        cvHints: [], cvCards: [], cvReport: null, cvReportError: '', cvDurationMinutes: durationMinutes, cvRemainingSeconds: durationSeconds,
        cvWrapUpSent: false, cvFinalizePayload: null, cvReviewStatus: 'idle', cvReviewStage: '', cvReviewUrl: '', cvReviewError: ''
      });
      r.startedAt = Date.now();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const isLocal = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.endsWith('.local')
        );
        const wsHost = isLocal
          ? window.location.host
          : (import.meta.env.VITE_LIVE_WS_HOST || 'hangul-now-api-313423647793.asia-northeast3.run.app');
        const ws = new WebSocket(`${proto}://${wsHost}/api/live`);
        r.ws = ws;
        ws.onopen = () => {
          const st = stateRef.current;
          const { tutorId: id, reviewMode: review } = propsRef.current;
          const tutor = TUTORS.find((tu) => tu.id === id) || TUTORS[0];
          const isKo = L();
          const interest = st.cvMode === 'roleplay' ? null : pickLessonInterest();
          const activeProfile = propsRef.current.profile || {};
          r.interest = interest;
          ws.send(JSON.stringify({
            type: 'start', tutorId: id, level: st.cvLevel || 'beginner',
            mode: st.cvMode || 'tutor', scenarioId: st.cvScenario || 'market',
            userId: getConversationUserId(), review: !!review,
            userNickname: getNickname(),
            nationality: activeProfile.nationality || '', interests: activeProfile.interests || [],
            lessonInterest: interest ? interest.id : '',
            feedbackLanguage: isKo ? 'Korean' : 'English',
            lessonTopic: interest ? interest.ko : (tutor.role[isKo ? 1 : 0] || (isKo ? '자유 회화' : 'Free conversation')),
            lessonDurationMinutes: durationMinutes
          }));
          startMicCapture(stream, ws);
        };
        ws.onmessage = (e) => onLiveMessage(JSON.parse(e.data));
        ws.onerror = () => update({ cvError: '서버에 연결하지 못했습니다. npm start로 서버가 켜져 있는지 확인해 주세요.', cvStatus: 'idle' });
        ws.onclose = () => {
          clearTutorClock();
          if (stateRef.current.cvStatus !== 'idle') update({ cvStatus: 'ended' });
          teardownAudio();
        };
      } catch (err) {
        update({ cvStatus: 'idle', cvError: err && err.name === 'NotAllowedError' ? '마이크 사용을 허용해 주세요.' : `마이크를 열 수 없습니다: ${err?.message || err}` });
      }
    };

    const deleteConversation = (id) => {
      const list = loadConversations().filter((c) => c.id !== id);
      storeConversations(list);
      update({ cvHistory: list });
    };

    const downloadRecord = (rec) => {
      const isKo = L();
      const pad = (n) => String(n).padStart(2, '0');
      const d = new Date(rec.savedAt);
      const stamp = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
      const levelName = { beginner: isKo ? '초급' : 'Beginner', intermediate: isKo ? '중급' : 'Intermediate', advanced: isKo ? '고급' : 'Advanced' }[rec.level] || rec.level;
      const head = [
        `Hangul Now — ${isKo ? '실시간 회화 전사본' : 'Conversation transcript'}`,
        `${isKo ? '튜터' : 'Tutor'}: ${rec.tutor}`,
        `${isKo ? '난이도' : 'Level'}: ${levelName}`,
        `${isKo ? '일시' : 'Date'}: ${stamp(d)}`,
        '='.repeat(52), ''
      ].join('\n');
      const body = rec.turns.map((t) => {
        const who = t.role === 'tutor' ? (rec.tutor || (isKo ? '선생님' : 'Tutor')) : (isKo ? '나' : 'Me');
        const tm = new Date(t.at);
        return `[${pad(tm.getHours())}:${pad(tm.getMinutes())}:${pad(tm.getSeconds())}] ${who}: ${t.text}`;
      }).join('\n\n');
      const blob = new Blob([`${head}${body}\n`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hangulnow-conversation-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const requestReport = async (record = null) => {
      const st = stateRef.current;
      const turns = record?.turns || st.cvTurns || [];
      if (!turns.length || st.cvReportLoading) return;
      const reportId = record?.id || 'current';
      update({ cvReportLoading: reportId, cvReport: null, cvReportError: '' });
      const levelKo = { beginner: '초급', intermediate: '중급', advanced: '고급' };
      const meta = record?.meta || {};
      try {
        const res = await fetch('/api/session/report', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            userId: propsRef.current.currentUser?.uid || null,
            turns: turns.map((t) => ({ role: t.role, text: t.text, at: (t.at instanceof Date ? t.at : new Date(t.at || Date.now())).getTime() })),
            hints: (record?.hints || st.cvHints || []).map((h) => ({
              error_phrase: h.error_phrase, corrected_phrase: h.corrected_phrase,
              situation_rule: h.situation_rule, romanization: h.romanization || '', at: h.at
            })),
            meta: {
              scenarioId: meta.scenarioId || st.cvScenario || 'market',
              scenarioTitle: meta.scenarioTitle || (st.cvMode === 'roleplay' ? (SCENARIO_NAMES[st.cvScenario] || '롤플레잉') : (record?.tutor || st.cvTutorName || '튜터 수업')),
              level: levelKo[record?.level || st.cvLevel] || '초급',
              partnerName: meta.partnerName || record?.tutor || st.cvTutorName || '상대',
              userName: meta.userName || propsRef.current.currentUser?.displayName || '',
              startedAt: meta.startedAt || record?.savedAt || r.startedAt || Date.now(),
              endedAt: meta.endedAt || record?.savedAt || Date.now()
            }
          })
        });
        if (!res.ok) throw new Error(`서버 응답 ${res.status}`);
        const data = await res.json();
        const bin = atob(data.pdfBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url; a.download = `survival-korean-${data.sessionId}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        update({ cvReport: { ...data, recordId: reportId }, cvReportLoading: false });
      } catch (err) {
        update({ cvReportLoading: false, cvReportError: `PDF를 만들지 못했어요: ${err.message}` });
      }
    };

    const pick = (key) => (value) => {
      if (['connecting', 'live'].includes(stateRef.current.cvStatus)) return;
      update({ [key]: value });
    };

    const setDuration = (value) => {
      if (['connecting', 'live'].includes(stateRef.current.cvStatus)) return;
      const minutes = normalizeTutorSessionMinutes(value);
      update({ cvDurationMinutes: minutes, cvRemainingSeconds: minutes * 60 });
    };

    return {
      start,
      stop,
      toggleMute: () => update((st) => ({ cvMuted: !st.cvMuted })),
      setMode: pick('cvMode'),
      setLevel: pick('cvLevel'),
      setDuration,
      setScenario: pick('cvScenario'),
      deleteConversation,
      downloadRecord,
      requestReport,
      getState: () => stateRef.current
    };
  }, [r]);

  return { state, ...controller };
}
