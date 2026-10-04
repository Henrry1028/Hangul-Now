export const DEFAULT_READING_TITLE = '벚꽃이 피면, 서울은 분홍색이 돼요';

export const DEFAULT_READING_PARAGRAPHS = [
  ['매년 4월이 되면 서울 곳곳에 ', ['벚꽃'], '이 ', ['활짝'], ' 펴요. 특히 여의도와 석촌호수는 벚꽃 ', ['구경'], '을 하러 온 사람들로 ', ['붐벼요'], '.'],
  ['사람들은 꽃 아래에서 사진을 찍고, 돗자리를 펴고 앉아서 ', ['도시락'], '을 먹어요. 밤에는 조명이 켜져서 낮과는 다른 ', ['분위기'], '를 느낄 수 있어요.'],
  ['하지만 벚꽃은 일주일 정도만 피기 때문에 구경하고 싶으면 ', ['서둘러야'], ' 해요.']
];

export const DEFAULT_READING_TRANSLATIONS = [
  'Every April, cherry blossoms burst into bloom all over Seoul. Yeouido and Seokchon Lake in particular are packed with people who have come to see the blossoms.',
  'People take photos under the flowers, spread out mats and sit down to eat their packed lunches. At night the lights come on, so you can feel an atmosphere quite different from the daytime.',
  'But cherry blossoms only stay in bloom for about a week, so if you want to see them you have to hurry.'
];

export const DEFAULT_READING_GLOSSARY = {
  벚꽃: {
    base: '벚꽃',
    pos: ['noun', '명사'],
    en: 'cherry blossom',
    ex: '벚꽃이 정말 예뻐요. — The cherry blossoms are really pretty.'
  },
  활짝: {
    base: '활짝',
    pos: ['adverb', '부사'],
    en: 'wide open; in full bloom',
    ex: '꽃이 활짝 폈어요. — The flowers are in full bloom.'
  },
  구경: {
    base: '구경',
    pos: ['noun', '명사'],
    en: 'looking around, sightseeing',
    ex: '시장 구경을 가요. — Let’s go look around the market.'
  },
  붐벼요: {
    base: '붐비다',
    pos: ['verb', '동사'],
    en: 'to be crowded',
    ex: '주말에는 지하철이 붐벼요. — The subway is crowded on weekends.'
  },
  도시락: {
    base: '도시락',
    pos: ['noun', '명사'],
    en: 'packed lunch, lunch box',
    ex: '엄마가 도시락을 싸 줬어요. — Mom packed me a lunch.'
  },
  분위기: {
    base: '분위기',
    pos: ['noun', '명사'],
    en: 'atmosphere, mood',
    ex: '이 카페는 분위기가 좋아요. — This café has a nice vibe.'
  },
  서둘러야: {
    base: '서두르다',
    pos: ['verb', '동사'],
    en: 'to hurry',
    ex: '늦었어요. 서둘러요! — We’re late. Hurry!'
  }
};

export const DEFAULT_READING_QUESTIONS = [
  {
    q: '벚꽃은 언제 펴요?',
    en: 'When do the blossoms bloom?',
    opts: ['4월', '7월', '10월'],
    a: 0
  },
  {
    q: '밤에는 왜 분위기가 달라요?',
    en: 'Why is the mood different at night?',
    opts: ['조명이 켜져서', '사람이 없어서', '비가 와서'],
    a: 0
  }
];

export const DEFAULT_READING_GRAMMAR = [
  {
    form: '-(으)러 오다/가다',
    explanation: ['to come/go in order to…', '목적 (~하려고 오다/가다)'],
    example: '구경을 하러 온 사람들'
  },
  {
    form: '-기 때문에',
    explanation: ['because…', '이유 (~때문에)'],
    example: '일주일만 피기 때문에'
  }
];

export const READING_TEXT = {
  en: {
    eyebrow: 'READING · BEGINNER 3 · 3 MIN',
    subtitle: 'When the cherry blossoms bloom, Seoul turns pink · Tap an underlined word to see its meaning.',
    translationShow: 'Show English',
    translationHide: 'Hide English',
    empty: 'Tap any underlined word — Hunie will show its meaning and an example here.',
    checkHeading: 'CHECK YOUR UNDERSTANDING',
    grammarHeading: 'Grammar in this story',
    save: '+ Save to word bank',
    saved: 'Saved to word bank ✓'
  },
  ko: {
    eyebrow: '읽기 · 초급 3 · 3분',
    subtitle: '밑줄 친 단어를 누르면 뜻을 볼 수 있어요.',
    translationShow: '영어 번역 보기',
    translationHide: '영어 번역 숨기기',
    empty: '밑줄 친 단어를 눌러 보세요. 훈이가 뜻과 예문을 보여 줄게요.',
    checkHeading: '내용 확인',
    grammarHeading: '이 글의 문법',
    save: '+ 단어장에 저장',
    saved: '단어장에 저장됨 ✓'
  }
};
