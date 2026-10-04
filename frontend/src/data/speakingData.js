// Verbatim legacy Speaking data (preview/index.html 3918-3922).
export const SENTS = [
  {text:'주말에 뭐 했어요?', roman:'ju-ma-re mwo hae-sseo-yo?', en:'What did you do on the weekend?', pron:'[주마레 뭐 해써요]', score:86, weak:[6,7], tip:['Great rhythm. “했어요” should link into [해써요] — hold the ㅆ a touch longer, and let your pitch rise at the end because it’s a question.','리듬이 좋아요. “했어요”는 [해써요]로 이어 읽어요. ㅆ을 조금 더 길게, 질문이니까 끝을 올려 주세요.']},
  {text:'밥 먹었어요?', roman:'bap meo-geo-sseo-yo?', en:'Have you eaten?', pron:'[밤머거써요]', score:79, weak:[0,3], tip:['“밥” before ㅁ becomes [밤] — the ㅂ turns nasal. Try saying 밤머거써요 in one breath.','“밥” 뒤에 ㅁ이 오면 [밤]으로 소리 나요. 밤머거써요를 한 번에 말해 보세요.']},
  {text:'다시 한번 말해 주세요.', roman:'da-si han-beon mal-hae ju-se-yo', en:'Could you say that again?', pron:'[다시 한번 마래 주세요]', score:91, weak:[7], tip:['Very clear! In 말해, natives soften the ㅎ so it sounds close to [마래].','아주 또렷해요! 말해의 ㅎ은 약하게 [마래]처럼 발음해요.']}
];

export const SPEAKING_TEXT = {
  en: {
    sEyebrow: 'SPEAKING · SHADOWING',
    sTitle: 'Say it like a native',
    soundsLike: 'sounds like',
    native: 'Native',
    next: 'Next',
    pronLabel: 'Pronunciation',
    pronHint: 'Practice the syllables marked in red.'
  },
  ko: {
    sEyebrow: '말하기 · 따라 말하기',
    sTitle: '원어민처럼 말해 보기',
    soundsLike: '실제 발음',
    native: '원어민',
    next: '다음',
    pronLabel: '발음 정확도',
    pronHint: '빨간 글자만 다시 연습해 보세요.'
  }
};

export const INITIAL_SPEAKING_STATE = Object.freeze({
  genSpeaking: null,
  genLoading: false,
  genError: '',
  sIdx: 0,
  rec: 'idle'
});
