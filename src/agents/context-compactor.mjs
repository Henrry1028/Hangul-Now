// ============================================================
// Context Compactor (컨텍스트 압축 및 메모리 훅)
// 긴 대화 기록 중 핵심 학습 취약점 및 화제 요약본만 보존하여 토큰 절감
// ============================================================

/**
 * 대화 기록 압축 및 취약점 추출
 * @param {Array<{role: string, content?: string, text?: string, errors?: any}>} history
 * @param {number} maxRecentTurns 보존할 최근 턴 수 (기본값: 4)
 */
export function compactConversationContext(history = [], maxRecentTurns = 4) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      compactHistory: [],
      learnerWeaknesses: [],
      summaryContext: ''
    };
  }

  const normalized = history.map(item => ({
    role: item.role === 'user' ? 'user' : 'assistant',
    text: (item.content || item.text || '').trim(),
    phoneticsError: item.phoneticsError || null,
    grammarError: item.grammarError || null
  })).filter(item => item.text.length > 0);

  // 취약점 추출 (발음 및 문법 누적 기록)
  const learnerWeaknesses = [];
  normalized.forEach(item => {
    if (item.phoneticsError) learnerWeaknesses.push(item.phoneticsError);
    if (item.grammarError) learnerWeaknesses.push(item.grammarError);
  });

  if (normalized.length <= maxRecentTurns) {
    return {
      compactHistory: normalized,
      learnerWeaknesses,
      summaryContext: ''
    };
  }

  // 이전 대화 턴들을 요약 형태로 압축
  const olderTurns = normalized.slice(0, normalized.length - maxRecentTurns);
  const recentTurns = normalized.slice(normalized.length - maxRecentTurns);

  const olderTopics = olderTurns
    .filter(t => t.role === 'user')
    .map(t => t.text.slice(0, 30))
    .join(' / ');

  const summaryContext = `[Previous Context Summary (${olderTurns.length} turns)]: User spoke about "${olderTopics}".`;

  return {
    compactHistory: recentTurns,
    learnerWeaknesses,
    summaryContext
  };
}

/**
 * 압축된 프롬프트 컨텍스트 생성
 */
export function formatCompactedPrompt(compactResult, newPrompt) {
  const parts = [];
  if (compactResult.summaryContext) {
    parts.push(compactResult.summaryContext);
  }
  if (compactResult.learnerWeaknesses && compactResult.learnerWeaknesses.length > 0) {
    const uniqueWeaknesses = Array.from(new Set(compactResult.learnerWeaknesses.map(w => typeof w === 'string' ? w : JSON.stringify(w))));
    parts.push(`[Known Learner Weaknesses to Coach]:\n${uniqueWeaknesses.slice(-3).join('\n')}`);
  }
  if (Array.isArray(compactResult.compactHistory) && compactResult.compactHistory.length > 0) {
    parts.push(`[Recent Conversation]:\n` + compactResult.compactHistory.map(h => `${h.role === 'user' ? 'User' : 'Tutor'}: ${h.text}`).join('\n'));
  }
  parts.push(newPrompt);
  return parts.join('\n\n');
}
