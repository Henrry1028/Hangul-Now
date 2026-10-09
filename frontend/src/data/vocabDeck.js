// 단어 학습 기본 덱: 입문~초급(TOPIK 1) 필수 어휘. 주제별로 묶어 하루에 몇 개씩 새로 소개한다.
// w 단어 · rom 로마자 · en 뜻 · pos 품사 · ex 예문 · exEn 예문 번역
const T = (topic, rows) => rows.map(([w, rom, en, pos, ex, exEn]) => ({ w, rom, en, pos, ex, exEn, topic }));

export const VOCAB_TOPICS = {
  greet: { ko: '인사·기본', en: 'Greetings & basics' },
  people: { ko: '사람·가족', en: 'People & family' },
  food: { ko: '음식·카페', en: 'Food & café' },
  place: { ko: '장소·교통', en: 'Places & transport' },
  time: { ko: '시간·날짜', en: 'Time & dates' },
  verb: { ko: '자주 쓰는 동사', en: 'Everyday verbs' },
  adj: { ko: '자주 쓰는 형용사', en: 'Everyday adjectives' },
  daily: { ko: '일상·쇼핑', en: 'Daily life & shopping' }
};

export const VOCAB_DECK = [
  ...T('greet', [
    ['안녕하세요', 'annyeonghaseyo', 'hello', 'expression', '안녕하세요, 저는 민지예요.', "Hello, I'm Minji."],
    ['감사합니다', 'gamsahamnida', 'thank you', 'expression', '도와주셔서 감사합니다.', 'Thank you for helping me.'],
    ['죄송합니다', 'joesonghamnida', "I'm sorry", 'expression', '늦어서 죄송합니다.', "I'm sorry I'm late."],
    ['괜찮아요', 'gwaenchanayo', "it's okay", 'expression', '저는 괜찮아요.', "I'm okay."],
    ['네', 'ne', 'yes', 'interjection', '네, 알겠어요.', 'Yes, I understand.'],
    ['아니요', 'aniyo', 'no', 'interjection', '아니요, 괜찮아요.', "No, it's fine."],
    ['이름', 'ireum', 'name', 'noun', '이름이 뭐예요?', "What's your name?"],
    ['나라', 'nara', 'country', 'noun', '어느 나라 사람이에요?', 'Which country are you from?'],
    ['말', 'mal', 'language; words', 'noun', '한국말을 배워요.', "I'm learning Korean."],
    ['질문', 'jilmun', 'question', 'noun', '질문이 있어요.', 'I have a question.'],
    ['대답', 'daedap', 'answer', 'noun', '대답해 주세요.', 'Please answer.'],
    ['처음', 'cheoeum', 'first time', 'noun', '처음 뵙겠습니다.', 'Nice to meet you (first time).']
  ]),
  ...T('people', [
    ['사람', 'saram', 'person', 'noun', '저 사람은 선생님이에요.', 'That person is a teacher.'],
    ['친구', 'chingu', 'friend', 'noun', '친구하고 영화를 봤어요.', 'I watched a movie with a friend.'],
    ['가족', 'gajok', 'family', 'noun', '우리 가족은 네 명이에요.', 'There are four people in my family.'],
    ['엄마', 'eomma', 'mom', 'noun', '엄마가 요리를 해요.', 'Mom is cooking.'],
    ['아빠', 'appa', 'dad', 'noun', '아빠는 회사에 가요.', 'Dad goes to work.'],
    ['형', 'hyeong', "older brother (of a male)", 'noun', '형은 대학생이에요.', 'My older brother is a college student.'],
    ['언니', 'eonni', "older sister (of a female)", 'noun', '언니하고 쇼핑했어요.', 'I went shopping with my older sister.'],
    ['동생', 'dongsaeng', 'younger sibling', 'noun', '동생이 한 명 있어요.', 'I have one younger sibling.'],
    ['선생님', 'seonsaengnim', 'teacher', 'noun', '선생님, 질문 있어요.', 'Teacher, I have a question.'],
    ['학생', 'haksaeng', 'student', 'noun', '저는 학생이에요.', "I'm a student."],
    ['아이', 'ai', 'child', 'noun', '아이가 웃어요.', 'The child is laughing.'],
    ['남자', 'namja', 'man', 'noun', '저 남자는 키가 커요.', 'That man is tall.']
  ]),
  ...T('food', [
    ['밥', 'bap', 'rice; meal', 'noun', '밥 먹었어요?', 'Did you eat?'],
    ['물', 'mul', 'water', 'noun', '물 좀 주세요.', 'Some water, please.'],
    ['커피', 'keopi', 'coffee', 'noun', '아이스 커피 한 잔 주세요.', 'One iced coffee, please.'],
    ['차', 'cha', 'tea', 'noun', '따뜻한 차를 마셔요.', 'I drink warm tea.'],
    ['빵', 'ppang', 'bread', 'noun', '아침에 빵을 먹어요.', 'I eat bread in the morning.'],
    ['고기', 'gogi', 'meat', 'noun', '고기를 좋아해요.', 'I like meat.'],
    ['과일', 'gwail', 'fruit', 'noun', '과일이 신선해요.', 'The fruit is fresh.'],
    ['김치', 'gimchi', 'kimchi', 'noun', '김치가 조금 매워요.', 'The kimchi is a little spicy.'],
    ['라면', 'ramyeon', 'instant noodles', 'noun', '밤에 라면을 끓였어요.', 'I made ramyeon at night.'],
    ['메뉴', 'menyu', 'menu', 'noun', '메뉴 좀 보여 주세요.', 'Please show me the menu.'],
    ['포장', 'pojang', 'takeout; packing', 'noun', '포장해 주세요.', 'To go, please.'],
    ['계산', 'gyesan', 'paying the bill', 'noun', '계산은 어디서 해요?', 'Where do I pay?']
  ]),
  ...T('place', [
    ['집', 'jip', 'home; house', 'noun', '지금 집에 있어요.', "I'm at home now."],
    ['학교', 'hakgyo', 'school', 'noun', '학교에 걸어가요.', 'I walk to school.'],
    ['회사', 'hoesa', 'company; office', 'noun', '회사가 가까워요.', 'My office is close.'],
    ['식당', 'sikdang', 'restaurant', 'noun', '이 식당이 유명해요.', 'This restaurant is famous.'],
    ['편의점', 'pyeonuijeom', 'convenience store', 'noun', '편의점에서 우유를 샀어요.', 'I bought milk at the convenience store.'],
    ['병원', 'byeongwon', 'hospital', 'noun', '병원에 가야 해요.', 'I have to go to the hospital.'],
    ['역', 'yeok', 'station', 'noun', '역 앞에서 만나요.', "Let's meet in front of the station."],
    ['지하철', 'jihacheol', 'subway', 'noun', '지하철을 타요.', 'I take the subway.'],
    ['버스', 'beoseu', 'bus', 'noun', '버스가 안 와요.', "The bus isn't coming."],
    ['화장실', 'hwajangsil', 'restroom', 'noun', '화장실이 어디예요?', 'Where is the restroom?'],
    ['오른쪽', 'oreunjjok', 'right side', 'noun', '오른쪽으로 가세요.', 'Go to the right.'],
    ['왼쪽', 'oenjjok', 'left side', 'noun', '왼쪽에 있어요.', "It's on the left."]
  ]),
  ...T('time', [
    ['오늘', 'oneul', 'today', 'noun', '오늘 날씨가 좋아요.', 'The weather is nice today.'],
    ['내일', 'naeil', 'tomorrow', 'noun', '내일 만나요.', 'See you tomorrow.'],
    ['어제', 'eoje', 'yesterday', 'noun', '어제 바빴어요.', 'I was busy yesterday.'],
    ['지금', 'jigeum', 'now', 'noun', '지금 몇 시예요?', 'What time is it now?'],
    ['아침', 'achim', 'morning; breakfast', 'noun', '아침을 먹었어요.', 'I had breakfast.'],
    ['점심', 'jeomsim', 'lunch; noon', 'noun', '점심 같이 먹어요.', "Let's have lunch together."],
    ['저녁', 'jeonyeok', 'evening; dinner', 'noun', '저녁에 운동해요.', 'I work out in the evening.'],
    ['주말', 'jumal', 'weekend', 'noun', '주말에 뭐 해요?', 'What do you do on weekends?'],
    ['시간', 'sigan', 'time; hour', 'noun', '시간이 있어요?', 'Do you have time?'],
    ['요일', 'yoil', 'day of the week', 'noun', '오늘 무슨 요일이에요?', 'What day is it today?'],
    ['생일', 'saengil', 'birthday', 'noun', '생일 축하해요!', 'Happy birthday!'],
    ['매일', 'maeil', 'every day', 'adverb', '매일 한국어를 공부해요.', 'I study Korean every day.']
  ]),
  ...T('verb', [
    ['가다', 'gada', 'to go', 'verb', '학교에 가요.', 'I go to school.'],
    ['오다', 'oda', 'to come', 'verb', '친구가 집에 와요.', 'A friend comes to my house.'],
    ['먹다', 'meokda', 'to eat', 'verb', '같이 먹어요.', "Let's eat together."],
    ['마시다', 'masida', 'to drink', 'verb', '물을 마셔요.', 'I drink water.'],
    ['보다', 'boda', 'to see; to watch', 'verb', '드라마를 봐요.', 'I watch a drama.'],
    ['하다', 'hada', 'to do', 'verb', '숙제를 해요.', 'I do my homework.'],
    ['공부하다', 'gongbuhada', 'to study', 'verb', '도서관에서 공부해요.', 'I study at the library.'],
    ['만나다', 'mannada', 'to meet', 'verb', '친구를 만나요.', 'I meet a friend.'],
    ['사다', 'sada', 'to buy', 'verb', '옷을 샀어요.', 'I bought clothes.'],
    ['알다', 'alda', 'to know', 'verb', '그 사람을 알아요.', 'I know that person.'],
    ['모르다', 'moreuda', 'not to know', 'verb', '잘 모르겠어요.', "I'm not sure."],
    ['좋아하다', 'joahada', 'to like', 'verb', '음악을 좋아해요.', 'I like music.']
  ]),
  ...T('adj', [
    ['좋다', 'jota', 'to be good', 'adjective', '기분이 좋아요.', 'I feel good.'],
    ['나쁘다', 'nappeuda', 'to be bad', 'adjective', '날씨가 나빠요.', 'The weather is bad.'],
    ['크다', 'keuda', 'to be big', 'adjective', '이 가방은 커요.', 'This bag is big.'],
    ['작다', 'jakda', 'to be small', 'adjective', '방이 작아요.', 'The room is small.'],
    ['많다', 'manta', 'to be many', 'adjective', '사람이 많아요.', 'There are many people.'],
    ['적다', 'jeokda', 'to be few', 'adjective', '시간이 적어요.', 'There is little time.'],
    ['맛있다', 'masitda', 'to be delicious', 'adjective', '이 떡볶이 정말 맛있어요.', 'This tteokbokki is really delicious.'],
    ['비싸다', 'bissada', 'to be expensive', 'adjective', '이거 너무 비싸요.', 'This is too expensive.'],
    ['싸다', 'ssada', 'to be cheap', 'adjective', '시장이 더 싸요.', 'The market is cheaper.'],
    ['바쁘다', 'bappeuda', 'to be busy', 'adjective', '요즘 바빠요.', "I'm busy these days."],
    ['재미있다', 'jaemiitda', 'to be fun', 'adjective', '한국어 공부가 재미있어요.', 'Studying Korean is fun.'],
    ['어렵다', 'eoryeopda', 'to be difficult', 'adjective', '문법이 어려워요.', 'Grammar is difficult.']
  ]),
  ...T('daily', [
    ['돈', 'don', 'money', 'noun', '돈이 없어요.', "I don't have money."],
    ['가격', 'gagyeok', 'price', 'noun', '가격이 얼마예요?', 'How much is the price?'],
    ['카드', 'kadeu', 'card', 'noun', '카드로 계산할게요.', "I'll pay by card."],
    ['옷', 'ot', 'clothes', 'noun', '새 옷을 입었어요.', 'I wore new clothes.'],
    ['신발', 'sinbal', 'shoes', 'noun', '신발을 벗어 주세요.', 'Please take off your shoes.'],
    ['전화', 'jeonhwa', 'phone call', 'noun', '나중에 전화할게요.', "I'll call you later."],
    ['날씨', 'nalssi', 'weather', 'noun', '날씨가 따뜻해요.', 'The weather is warm.'],
    ['비', 'bi', 'rain', 'noun', '비가 와요.', "It's raining."],
    ['사진', 'sajin', 'photo', 'noun', '사진 찍어 주세요.', 'Please take a photo.'],
    ['영화', 'yeonghwa', 'movie', 'noun', '영화 보러 가요.', "Let's go see a movie."],
    ['음악', 'eumak', 'music', 'noun', '음악을 들어요.', 'I listen to music.'],
    ['운동', 'undong', 'exercise', 'noun', '운동을 시작했어요.', 'I started exercising.']
  ])
];
