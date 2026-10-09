export const INTRO_TEXT = {
  ko: {
    heroEyebrow: 'Learn Korean by chatting',
    heroH1: '실제 튜터와 메시지를 주고받으며 한국어를 배워요.',
    heroP: '튜터를 고르고, 한국 사람들이 실제로 메시지를 주고받는 방식 그대로 대화해요. 실수는 대화 안에서 바로 부드럽게 고쳐 주고, 짧은 듣기·읽기·쓰기·말하기 연습으로 쓴 표현을 다시 익혀요.',
    ctaTutor: '튜터 고르기',
    ctaLevel: '5분 레벨 테스트',
    heroNote: '첫 자음 ㄱ부터 TOPIK 6급까지 · 영어 해설 제공',
    mockName: '김지우',
    correction: '고쳐 쓰기',
    howH2: '대화로 시작하고, 네 가지 기술로 굳혀요.',
    howP: '어제 대화에서 나온 단어와 문법이 다음 날 듣기·읽기·쓰기·말하기 연습으로 다시 돌아와요.',
    guidesEyebrow: '학습 도우미',
    guidesH2: '훈이와 정이가 한 걸음씩 함께해요.',
    guidesP: '한글의 원래 이름인 훈민정음에서 이름을 따온 두 친구가, 힌트가 필요할 때나 칭찬받을 때 나타나요.',
    hunName: '훈이 Hunie',
    hunRole: '문법 · 쓰기 친구',
    hunDesc: '연필을 늘 들고 다니는 훈이는 오답 노트를 정리하고, 문장이 왜 틀렸는지 알려 주고, 첫 글자를 완성하면 함께 기뻐해요.',
    jeongName: '정이 Jeongie',
    jeongRole: '표현 · 문화 안내자',
    jeongDesc: '“Learn Korean” 책을 품에 안은 정이는 오늘의 표현을 전해 주고, 한국 사람들이 실제로 쓰는 말투를 보여 주고, 말하기 성공을 축하해요.',
    tutorsH2: '오늘은 누구와 이야기할까요?',
    seeAll: '튜터 전체 보기',
    finalH2: '첫 메시지는 “안녕하세요”면 충분해요.',
    startFree2: '무료로 시작하기',
    navAbout: '회사 소개',
    footerLinks: '이용약관 · 개인정보처리방침 · 고객센터'
  },
  en: {
    heroEyebrow: '한국어, 대화로 배워요',
    heroH1: 'Learn Korean by texting a real tutor.',
    heroP: 'Pick a tutor and chat the way Koreans actually message each other. Mistakes are corrected gently, right inside the conversation — then short listening, reading, writing and speaking drills lock in what you used.',
    ctaTutor: 'Choose a tutor',
    ctaLevel: 'Take the 5-min level check',
    heroNote: 'From your very first ㄱ to TOPIK 6 · Explanations in English',
    mockName: 'Jiwoo Kim',
    correction: 'CORRECTION',
    howH2: 'Start with conversation. Lock it in with four skills.',
    howP: 'Words and grammar from yesterday’s chat come back the next day as listening, reading, writing and speaking practice.',
    guidesEyebrow: 'MEET YOUR GUIDES',
    guidesH2: 'Hunie and Jeongie walk with you, every step.',
    guidesP: 'Named after 훈민정음 — the original name of Hangul — our two guides show up when you need a nudge, a hint or a small celebration.',
    hunName: '훈이 Hunie',
    hunRole: 'Grammar & writing buddy',
    hunDesc: 'Never without his pencil. Hunie keeps your mistake notes tidy, explains why a sentence went wrong, and cheers when you build your first syllable block.',
    jeongName: '정이 Jeongie',
    jeongRole: 'Expressions & culture guide',
    jeongDesc: 'Always carrying her “Learn Korean” book. Jeongie brings you the expression of the day, shows how Koreans really say things, and celebrates your speaking wins.',
    tutorsH2: 'Who will you talk to today?',
    seeAll: 'See all tutors',
    finalH2: 'Your first message can just be “안녕하세요.”',
    startFree2: 'Start for free',
    navAbout: 'About us',
    footerLinks: 'Terms · Privacy · Help'
  }
};

export const MOCKS = [
  {
    role: ['Everyday talk', '일상 회화'],
    q: '주말에 뭐 했어요?',
    pre: '비가 많이 ',
    wrong: '왔어서',
    right: '와서',
    post: ' 집에 있었어요.',
    rule: ['-아서/어서 never takes the past tense.', '-아서/어서 앞에는 과거형을 쓰지 않아요.'],
    reply: '잘했어요! 집에서 뭐 했어요?'
  },
  {
    role: ['Particles', '조사'],
    q: '어제 어디에서 저녁 먹었어요?',
    pre: '친구하고 홍대',
    wrong: '에',
    right: '에서',
    post: ' 떡볶이를 먹었어요.',
    rule: ['Use 에서 for the place where an action happens.', '행동이 일어나는 장소에는 ‘에서’를 써요.'],
    reply: '와, 맛있었겠어요! 많이 매웠어요?'
  },
  {
    role: ['Object marker', '목적격 조사'],
    q: '요즘 뭘 배우고 있어요?',
    pre: '요즘 한국어',
    wrong: '을',
    right: '를',
    post: ' 배우고 있어요.',
    rule: ['After a vowel, use 를 instead of 을.', '받침이 없으면 ‘을’ 대신 ‘를’을 써요.'],
    reply: '멋져요! 얼마나 배웠어요?'
  },
  {
    role: ['Spelling', '맞춤법'],
    q: '내일 뭐 할 거예요?',
    pre: '내일 친구를 ',
    wrong: '만날 거에요',
    right: '만날 거예요',
    post: '.',
    rule: ['It’s 거예요, never 거에요.', '‘거에요’가 아니라 ‘거예요’가 맞아요.'],
    reply: '좋네요! 어디에서 만나요?'
  }
];

export const SKILLS = [
  {
    glyph: '듣',
    no: '01',
    name: ['Listening', '듣기'],
    ko: ['듣기', 'Listening'],
    desc: [
      'Short real-life dialogues — cafés, subways, phone calls — at adjustable speed, with dictation.',
      '카페, 지하철, 전화 등 실제 상황 대화를 속도 조절과 받아쓰기로 연습해요.'
    ]
  },
  {
    glyph: '읽',
    no: '02',
    name: ['Reading', '읽기'],
    ko: ['읽기', 'Reading'],
    desc: [
      'Graded stories where every word is one tap from its meaning and can be saved to your word bank.',
      '수준별 글에서 모르는 단어를 누르면 바로 뜻을 보고 단어장에 저장해요.'
    ]
  },
  {
    glyph: '쓰',
    no: '03',
    name: ['Writing', '쓰기'],
    ko: ['쓰기', 'Writing'],
    desc: [
      'Build syllable blocks from scratch, then write short answers and get line-by-line corrections.',
      '자모로 글자를 직접 조합하고, 짧은 글을 써서 문장별 첨삭을 받아요.'
    ]
  },
  {
    glyph: '말',
    no: '04',
    name: ['Speaking', '말하기'],
    ko: ['말하기', 'Speaking'],
    desc: [
      'Shadow native audio and see which syllables need work, with tips on linking and final consonants.',
      '원어민 음성을 따라 말하고, 연음과 받침 팁으로 약한 음절을 고쳐요.'
    ]
  }
];

export const STEPS = {
  ko: [
    {
      n: 1,
      t: '5분 레벨 테스트',
      p: '듣기 문제 몇 개와 짧은 자기소개로 지금 수준을 확인해요. 결과에 맞춰 첫 주 계획이 만들어져요.'
    },
    {
      n: 2,
      t: '나와 맞는 튜터 선택',
      p: '일상 회화, 비즈니스, TOPIK, 발음 교정까지. 속도와 말투가 다른 튜터 중에서 골라요.'
    },
    {
      n: 3,
      t: '하루 15분',
      p: '대화 한 번, 짧은 연습 두 개. 새 단어와 교정 문장은 잊을 즈음 다시 나타나요.'
    }
  ],
  en: [
    {
      n: 1,
      t: 'A 5-minute level check',
      p: 'A few listening questions and a short self-introduction. Your first week is planned from the result.'
    },
    {
      n: 2,
      t: 'Pick a tutor who fits',
      p: 'Everyday talk, business Korean, TOPIK prep or pronunciation — each tutor has their own pace and style.'
    },
    {
      n: 3,
      t: 'Fifteen minutes a day',
      p: 'One chat, two short drills. New words and corrected sentences resurface right when you’re about to forget them.'
    }
  ]
};

export const TUTORS_INTRO = [
  {
    id: 'jiwoo',
    initial: '지우',
    color: '#E9C2A6',
    name: { ko: '김지우', en: 'Jiwoo Kim' },
    role: { ko: '일상 회화', en: 'Everyday conversation' },
    quote: {
      ko: '친구한테 문자 보내듯 편하게 써요. 반말과 존댓말을 언제 쓰는지도 알려 줄게요.',
      en: 'Text me like you’d text a friend. I’ll show you when to use casual vs polite speech.'
    }
  },
  {
    id: 'minho',
    initial: '민호',
    color: '#B9C7A5',
    name: { ko: '박민호', en: 'Minho Park' },
    role: { ko: '비즈니스 한국어', en: 'Business Korean' },
    quote: {
      ko: '회의, 이메일, 회식까지. 내일 회사에서 바로 쓰는 표현으로 연습해요.',
      en: 'Meetings, emails, team dinners — phrases you can use at a Korean office tomorrow.'
    }
  },
  {
    id: 'seoyeon',
    initial: '서연',
    color: '#C9BEDD',
    name: { ko: '이서연', en: 'Seoyeon Lee' },
    role: { ko: 'TOPIK · 정밀 문법', en: 'TOPIK & grammar' },
    quote: {
      ko: '틀린 이유를 꼭 설명해 드려요. 같은 실수를 두 번 하지 않게요.',
      en: 'I always explain why something is wrong, so you don’t make the same mistake twice.'
    }
  },
  {
    id: 'haneul',
    initial: '하늘',
    color: '#A9CBD6',
    name: { ko: '최하늘', en: 'Haneul Choi' },
    role: { ko: '발음 · 억양 교정', en: 'Pronunciation & intonation' },
    quote: {
      ko: '받침과 리듬만 잡아도 훨씬 자연스러워져요. 언제든 연습해 봐요.',
      en: 'Fix your final consonants and rhythm, and you’ll sound far more natural. Send me a recording.'
    }
  }
];

export const MOBILE_UPDATE_NOTICE = {
  ko: {
    badge: '공지 NOTICE',
    title: '모바일 홈 화면 앱(PWA) 최신 업데이트 반영 안내',
    subtitle: '새로운 기능이 보이지 않거나 이전 화면이 유지될 때 스마트폰 기기별 조치 방법',
    whyNotice: '💡 왜 필요한가요? 스마트폰의 홈 화면 앱(PWA)은 빠른 실행을 위해 이전 화면 데이터를 기기 내부에 보관(캐시)합니다. 최신 기능이 배포되었을 때 아래의 안내에 따라 1회 갱신해 주시면 즉시 최신 화면이 적용됩니다.',
    tabs: {
      all: '전체 보기',
      android: '🤖 안드로이드 폰 (Galaxy / Chrome)',
      ios: '🍎 애플 폰 (iPhone / iPad / Safari)'
    },
    android: {
      name: '안드로이드 (Galaxy / Chrome / 삼성인터넷)',
      method1: {
        title: '방법 1. 가장 빠르고 확실한 방법 (홈 화면 재추가)',
        steps: [
          '스마트폰 바탕화면의 [Hangul Now] 아이콘을 1~2초간 길게 터치합니다.',
          '나타나는 팝업 메뉴에서 [설치 삭제] 또는 [삭제]를 선택합니다.',
          'Chrome 또는 삼성인터넷 브라우저를 열고 서비스 주소로 접속합니다.',
          '브라우저 메뉴(우측 상단 ⋮ 또는 하단 ≡)에서 [홈 화면에 추가] 또는 [앱 설치]를 터치합니다.'
        ]
      },
      method2: {
        title: '방법 2. 브라우저 캐시 삭제 (아이콘 유지 시)',
        steps: [
          '브라우저 상단 주소창 왼쪽의 [자물쇠 🔒] 또는 사이트 설정 아이콘을 터치합니다.',
          '[사이트 설정] → [데이터 삭제 및 재설정]을 터치합니다.',
          '페이지를 새로고침(아래로 당겨서 새로고침)합니다.'
        ]
      }
    },
    ios: {
      name: '애플 (iPhone / iPad / Safari)',
      method1: {
        title: '방법 1. 가장 빠르고 확실한 방법 (홈 화면 재추가)',
        steps: [
          '아이폰 홈 화면의 [Hangul Now] 아이콘을 1~2초간 길게 터치합니다.',
          '나타나는 팝업 메뉴에서 [책갈피 삭제] 또는 [홈 화면에서 제거]를 터치합니다.',
          'Safari(사파리) 브라우저를 열고 서비스 주소로 접속합니다.',
          '하단 중앙의 [공유 버튼 (네모 상자 위로 화살표 ↑)]을 터치합니다.',
          '메뉴를 아래로 스크롤하여 [+ 홈 화면에 추가]를 터치합니다.'
        ]
      },
      method2: {
        title: '방법 2. Safari 웹사이트 데이터 갱신',
        steps: [
          '아이폰 [설정] 앱 실행 → [Safari] 메뉴로 이동합니다.',
          '맨 아래 [고급] → [웹사이트 데이터]를 터치합니다.',
          '검색창에 "hangul"을 입력하고 나온 항목을 왼쪽으로 밀어 [삭제]합니다.',
          'Safari를 다시 열고 새로고침합니다.'
        ]
      }
    },
    copyUrl: '접속 주소 복사',
    copied: '주소가 클립보드에 복사되었습니다!',
    toggleHide: '공지 접기',
    toggleShow: '공지 펼치기'
  },
  en: {
    badge: 'NOTICE',
    title: 'How to Get the Latest App Updates on Mobile (PWA)',
    subtitle: 'Step-by-step guide for Android & iOS when new features don’t show up immediately',
    whyNotice: '💡 Why is this needed? Mobile Home Screen web apps (PWA) cache app data locally for instant loading. When a new version is released, following the quick steps below ensures you receive the latest updates immediately.',
    tabs: {
      all: 'Show All',
      android: '🤖 Android (Galaxy / Chrome)',
      ios: '🍎 Apple (iPhone / iPad / Safari)'
    },
    android: {
      name: 'Android (Galaxy / Chrome / Samsung Internet)',
      method1: {
        title: 'Option 1. Recommended: Re-add to Home Screen',
        steps: [
          'Press and hold the [Hangul Now] app icon on your home screen.',
          'Tap [Uninstall] or [Remove] from the popup menu.',
          'Open Chrome or Samsung Internet and visit the app URL.',
          'Tap the browser menu (⋮ at top-right or ≡ at bottom) and choose [Add to Home screen] or [Install app].'
        ]
      },
      method2: {
        title: 'Option 2. Clear Browser Cache',
        steps: [
          'Tap the [Lock 🔒] or settings icon on the left side of the address bar.',
          'Go to [Site settings] → Tap [Clear & reset data].',
          'Refresh the page.'
        ]
      }
    },
    ios: {
      name: 'Apple (iPhone / iPad / Safari)',
      method1: {
        title: 'Option 1. Recommended: Re-add to Home Screen',
        steps: [
          'Press and hold the [Hangul Now] icon on your iPhone home screen.',
          'Tap [Delete Bookmark] or [Remove from Home Screen].',
          'Open Safari and navigate to the app URL.',
          'Tap the [Share button (square with arrow pointing up ↑)] at the bottom.',
          'Scroll down and tap [+ Add to Home Screen].'
        ]
      },
      method2: {
        title: 'Option 2. Reset Safari Website Data',
        steps: [
          'Open iPhone [Settings] app → Tap [Safari].',
          'Scroll to the bottom, tap [Advanced] → [Website Data].',
          'Search for "hangul" and swipe left to delete it.',
          'Reopen Safari and refresh the web page.'
        ]
      }
    },
    copyUrl: 'Copy App URL',
    copied: 'URL copied to clipboard!',
    toggleHide: 'Collapse Notice',
    toggleShow: 'Expand Notice'
  }
};

