const HANGUL_PATTERN = /[\u3131-\u318e\uac00-\ud7a3]/u;
const HANGUL_GLOBAL_PATTERN = /[\u3131-\u318e\uac00-\ud7a3]/gu;

export const TTS_PIPELINE_VERSION = 'ko-verbatim-v2';

export function normalizeKoreanSpeechText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsHangul(value) {
  return HANGUL_PATTERN.test(normalizeKoreanSpeechText(value));
}

export function comparableSpeechText(value) {
  return normalizeKoreanSpeechText(value)
    .toLocaleLowerCase('ko-KR')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function comparableHangul(value) {
  return (normalizeKoreanSpeechText(value).match(HANGUL_GLOBAL_PATTERN) || []).join('');
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1),
      ));
    }
    previous = current;
  }
  return previous[right.length];
}

export function speechSimilarity(target, transcript) {
  const expected = comparableSpeechText(target);
  const actual = comparableSpeechText(transcript);
  if (!expected.length && !actual.length) return 1;
  if (!expected.length || !actual.length) return 0;
  return 1 - (editDistance(expected, actual) / Math.max(expected.length, actual.length));
}

export function phoneticizeChatSlang(text) {
  if (!text) return '';
  return String(text)
    .replace(/ㅋ+/g, match => '크'.repeat(Math.min(match.length, 3)))
    .replace(/ㅎ+/g, match => '흐'.repeat(Math.min(match.length, 3)))
    .replace(/ㅠ+/g, match => '유'.repeat(Math.min(match.length, 2)))
    .replace(/ㅜ+/g, match => '우'.repeat(Math.min(match.length, 2)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function assessKoreanSpeech(target, transcript, language) {
  const phoneticTarget = phoneticizeChatSlang(target);
  const expected = comparableSpeechText(target);
  const phoneticExpected = comparableSpeechText(phoneticTarget);
  const actual = comparableSpeechText(transcript);
  const expectedHangul = comparableHangul(target);
  const phoneticExpectedHangul = comparableHangul(phoneticTarget);
  const actualHangul = comparableHangul(transcript);
  const normalizedLanguage = String(language || '').trim().toLocaleLowerCase('en-US');
  const isKoreanLanguage = normalizedLanguage.startsWith('ko')
    || normalizedLanguage.includes('korean')
    || normalizedLanguage.includes('한국');
  const containsLatinTarget = /[a-z]/i.test(expected);
  const exact = (expected.length > 0 && expected === actual)
    || (phoneticExpected.length > 0 && phoneticExpected === actual);
  const hangulExact = (expectedHangul.length > 0 && expectedHangul === actualHangul)
    || (phoneticExpectedHangul.length > 0 && phoneticExpectedHangul === actualHangul);
  const hangulPreserved = containsLatinTarget
    && expectedHangul.length > 0
    && actualHangul.includes(expectedHangul);
  const expectedSyllables = (phoneticExpected.match(/[\uac00-\ud7a3]/gu) || []).join('');
  const actualSyllables = (actual.match(/[\uac00-\ud7a3]/gu) || []).join('');
  const syllablesExact = expectedSyllables.length > 0 && expectedSyllables === actualSyllables;
  const passed = isKoreanLanguage && containsHangul(transcript) && (exact || hangulExact || hangulPreserved || syllablesExact);

  return {
    passed,
    exact,
    isKoreanLanguage,
    similarity: Number(Math.max(speechSimilarity(target, transcript), speechSimilarity(phoneticTarget, transcript)).toFixed(4)),
    expected,
    actual,
  };
}

export function buildKoreanVerbatimPrompt(text) {
  const speechText = normalizeKoreanSpeechText(text);
  if (!speechText || !containsHangul(speechText)) {
    throw new Error('선택한 튜터 음성은 한글 문장이 필요합니다.');
  }
  return [
    '다음 한글 문장을 번역하거나 바꾸거나 설명하지 말고, 적힌 문장만 한국어 원어민 발음으로 또박또박 한 번 읽으세요.',
    '',
    speechText,
  ].join('\n');
}
