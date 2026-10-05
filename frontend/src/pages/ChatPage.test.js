import { describe, expect, it } from 'vitest';
import { correctionBrief, correctionDetailEn } from './ChatPage.jsx';

// 지침: 채팅 말풍선 = 짧은 요점, '실시간 문장 첨삭' 패널 = 자세한 영어 설명 (같은 내용 반복 금지)
describe('correction feedback split', () => {
  const fix = {
    wrong: '오떠게', right: '어떻게',
    brief: ['Spelling: 어떻게', "맞춤법: '어떻게'"],
    note: [
      "'오떠게' is a misspelling. The question adverb meaning \"how\" is spelled 어떻게. For cooked food, 배달 (delivery) is more natural than 배송.",
      "'오떠게'는 잘못된 표기입니다. '어떤 모양이나 형편으로'를 뜻하는 의문 부사는 '어떻게'가 올바른 맞춤법입니다."
    ]
  };

  it('chat bubble gets the one-line point, not the full explanation', () => {
    expect(correctionBrief(fix)).toEqual({ en: 'Spelling: 어떻게', ko: "맞춤법: '어떻게'" });
  });

  it('panel always gets the detailed English explanation', () => {
    expect(correctionDetailEn(fix)).toBe(fix.note[0]);
    expect(correctionDetailEn(fix)).not.toBe(correctionBrief(fix).en);
  });

  it('older corrections without brief fall back to a short first sentence', () => {
    const legacy = { note: [fix.note[0], fix.note[1]] };
    const b = correctionBrief(legacy);
    expect(b.ko).toBe("'오떠게'는 잘못된 표기입니다.");
    expect(b.ko.length).toBeLessThanOrEqual(40);
    expect(b.en).toBe("'오떠게' is a misspelling.");
    expect(correctionDetailEn({ note: ['', '한국어만 있음'] })).toBe('한국어만 있음');
    expect(correctionBrief(undefined)).toEqual({ ko: '', en: '' });
  });
});
