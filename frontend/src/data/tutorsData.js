export const TUTORS = [
  {
    id: 'jiwoo',
    gender: 'female',
    genderKo: '여성',
    en: 'Jiwoo Kim',
    ko: '김지우',
    initial: '지우',
    photo: '/assets/tutors/jiwoo.jpg',
    color: '#E9C2A6',
    online: true,
    tags: ['daily', 'beginner'],
    role: ['Everyday conversation', '일상 회화'],
    pace: ['Speaks slowly', '천천히 말해요'],
    quote: [
      'Text me like you’d text a friend. I’ll show you when to use casual vs polite speech.',
      '친구한테 문자 보내듯 편하게 써요. 반말과 존댓말을 언제 쓰는지도 알려 줄게요.'
    ],
    greeting: [
      'Hello! I am Jiwoo. Feel free to talk in Korean just like texting a friend!',
      '안녕하세요! 지우예요. 친구한테 편하게 문자하듯 한국어로 대화해 봐요!'
    ],
    audio: '/assets/tutors/audio/jiwoo.wav',
    voicePitch: 1.1,
    voiceRate: 0.95
  },
  {
    id: 'minho',
    gender: 'male',
    genderKo: '남성',
    en: 'Minho Park',
    ko: '박민호',
    initial: '민호',
    photo: '/assets/tutors/minho.jpg',
    color: '#B9C7A5',
    online: true,
    tags: ['business', 'intermediate'],
    role: ['Business Korean', '비즈니스 한국어'],
    pace: ['Normal pace', '보통 속도'],
    quote: [
      'Meetings, emails, team dinners — phrases you can use at a Korean office tomorrow.',
      '회의, 이메일, 회식까지. 내일 회사에서 바로 쓰는 표현으로 연습해요.'
    ],
    greeting: [
      'Hello, I am Minho Park. Let’s practice business Korean you can use at work right away.',
      '안녕하십니까, 박민호입니다. 내일 회사에서 바로 쓸 수 있는 실무 한국어를 함께 연습해요.'
    ],
    audio: '/assets/tutors/audio/minho.wav',
    voicePitch: 0.85,
    voiceRate: 1.0
  },
  {
    id: 'seoyeon',
    gender: 'female',
    genderKo: '여성',
    en: 'Seoyeon Lee',
    ko: '이서연',
    initial: '서연',
    photo: '/assets/tutors/seoyeon.jpg',
    color: '#C9BEDD',
    online: true,
    tags: ['topik', 'intermediate'],
    role: ['TOPIK & grammar', 'TOPIK · 정밀 문법'],
    pace: ['Detailed feedback', '꼼꼼한 첨삭'],
    quote: [
      'I always explain why something is wrong, so you don’t make the same mistake twice.',
      '틀린 이유를 꼭 설명해 드려요. 같은 실수를 두 번 하지 않게요.'
    ],
    greeting: [
      'Hello, I am Seoyeon. I will explain grammar clearly so you won’t make the same mistake twice.',
      '안녕하세요, 이서연 튜터입니다. 기초 문법부터 토픽 시험까지 꼼꼼하고 알기 쉽게 알려드릴게요.'
    ],
    audio: '/assets/tutors/audio/seoyeon.wav',
    voicePitch: 1.05,
    voiceRate: 0.95
  },
  {
    id: 'haneul',
    gender: 'male',
    genderKo: '남성',
    en: 'Haneul Choi',
    ko: '최하늘',
    initial: '하늘',
    photo: '/assets/tutors/haneul.jpg',
    color: '#A9CBD6',
    online: true,
    tags: ['pron', 'beginner'],
    role: ['Pronunciation & intonation', '발음 · 억양 교정'],
    pace: ['Voice coaching', '발음 팁 위주'],
    quote: [
      'Fix your final consonants and rhythm, and you’ll sound far more natural. Send me a recording.',
      '받침과 리듬만 잡아도 훨씬 자연스러워져요. 언제든 연습해 봐요.'
    ],
    greeting: [
      'Hi! I am Haneul. Fix your pronunciation and rhythm, and your Korean will sound so natural.',
      '반가워요, 최하늘입니다! 받침과 리듬만 잡아도 한국어가 훨씬 자연스러워집니다.'
    ],
    audio: '/assets/tutors/audio/haneul.wav',
    voicePitch: 0.9,
    voiceRate: 1.0
  }
];

export const TAGS = {
  daily: ['Daily talk', '일상 회화'],
  business: ['Business', '비즈니스'],
  topik: ['TOPIK', 'TOPIK'],
  pron: ['Pronunciation', '발음'],
  beginner: ['Beginner', '초급'],
  intermediate: ['Intermediate', '중급']
};

export const TUTORS_TEXT = {
  ko: {
    tutorsH1: '어떤 튜터와 이야기할까요?',
    tutorsP: '튜터를 고르면 바로 채팅방이 열려요. 언제든 바꿀 수 있어요.',
    filterAll: '전체',
    myTutorBadge: '내 전담 튜터 ✓',
    onlinePrefix: '지금 접속 중 · ',
    offlinePrefix: '몇 시간 내 답장 · ',
    btnSelected: '현재 전담 튜터 ✓',
    btnSelect: '전담 튜터로 선택',
    female: '여성',
    male: '남성'
  },
  en: {
    tutorsH1: 'Who would you like to talk to?',
    tutorsP: 'Pick a tutor and a chat room opens right away. You can switch any time.',
    filterAll: 'All',
    // Legacy 템플릿(L1596)은 언어와 무관하게 한국어 문구를 하드코딩하므로 그대로 보존
    myTutorBadge: '내 전담 튜터 ✓',
    onlinePrefix: 'Online now · ',
    offlinePrefix: 'Replies within hours · ',
    btnSelected: 'Selected ✓',
    btnSelect: 'Select as Tutor',
    female: 'Female',
    male: 'Male'
  }
};
