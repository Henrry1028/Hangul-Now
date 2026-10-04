export const FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyAwz_68lr0jM1T1pdiS7IZ-N-QT90frj8Q',
  authDomain: 'hnageul-copilot-dev-918.firebaseapp.com',
  projectId: 'hnageul-copilot-dev-918',
  storageBucket: 'hnageul-copilot-dev-918.firebasestorage.app',
  messagingSenderId: '313423647793',
  appId: '1:313423647793:web:48323f7d3a0809274f3110'
});

export const NATIONALITIES = [
  ['US', '미국', 'United States', 'English'], ['GB', '영국', 'United Kingdom', 'English'], ['CA', '캐나다', 'Canada', 'English'],
  ['AU', '호주', 'Australia', 'English'], ['JP', '일본', 'Japan', 'Japanese'], ['CN', '중국', 'China', 'Chinese (Mandarin)'],
  ['TW', '대만', 'Taiwan', 'Chinese (Mandarin)'], ['HK', '홍콩', 'Hong Kong', 'Cantonese'], ['VN', '베트남', 'Vietnam', 'Vietnamese'],
  ['TH', '태국', 'Thailand', 'Thai'], ['ID', '인도네시아', 'Indonesia', 'Indonesian'], ['PH', '필리핀', 'Philippines', 'Filipino'],
  ['MY', '말레이시아', 'Malaysia', 'Malay'], ['SG', '싱가포르', 'Singapore', 'English'], ['IN', '인도', 'India', 'Hindi'],
  ['MN', '몽골', 'Mongolia', 'Mongolian'], ['UZ', '우즈베키스탄', 'Uzbekistan', 'Uzbek'], ['KZ', '카자흐스탄', 'Kazakhstan', 'Kazakh'],
  ['RU', '러시아', 'Russia', 'Russian'], ['FR', '프랑스', 'France', 'French'], ['DE', '독일', 'Germany', 'German'],
  ['ES', '스페인', 'Spain', 'Spanish'], ['IT', '이탈리아', 'Italy', 'Italian'], ['BR', '브라질', 'Brazil', 'Portuguese'],
  ['MX', '멕시코', 'Mexico', 'Spanish'], ['TR', '튀르키예', 'Türkiye', 'Turkish'], ['SA', '사우디아라비아', 'Saudi Arabia', 'Arabic'],
  ['EG', '이집트', 'Egypt', 'Arabic'], ['NP', '네팔', 'Nepal', 'Nepali'], ['MM', '미얀마', 'Myanmar', 'Burmese'],
  ['KH', '캄보디아', 'Cambodia', 'Khmer'], ['OTHER', '기타', 'Other', '']
].map(([code, ko, en, nativeLanguage]) => ({ code, ko, en, nativeLanguage }));

export const GENDERS = [
  ['female', '여성', 'Female'], ['male', '남성', 'Male'], ['other', '기타', 'Other'], ['none', '밝히지 않음', 'Prefer not to say']
].map(([id, ko, en]) => ({ id, ko, en }));

export const INTERESTS = [
  { id: 'kdrama', ko: 'K-드라마·영화', en: 'K-dramas & films', icon: '🎬', seed: '좋아하는 드라마, 인상 깊은 장면과 명대사, 배우' },
  { id: 'kpop', ko: 'K-POP·음악', en: 'K-pop & music', icon: '🎤', seed: '좋아하는 가수, 노래 가사, 콘서트 경험' },
  { id: 'food', ko: '음식·요리', en: 'Food & cooking', icon: '🍜', seed: '좋아하는 한국 음식, 맛집, 직접 해 본 요리' },
  { id: 'travel', ko: '여행', en: 'Travel', icon: '✈️', seed: '가 보고 싶은 도시, 여행 계획, 길 묻기' },
  { id: 'daily', ko: '일상·쇼핑', en: 'Daily life & shopping', icon: '🛍️', seed: '하루 일과, 주말, 장보기와 쇼핑' },
  { id: 'work', ko: '비즈니스·직장', en: 'Business & work', icon: '💼', seed: '회사 생활, 회의, 동료와의 대화' },
  { id: 'study', ko: '유학·학교생활', en: 'Study abroad & school', icon: '🎓', seed: '수업, 시험, 친구, 동아리' },
  { id: 'culture', ko: '역사·전통문화', en: 'History & tradition', icon: '🏯', seed: '명절, 한복, 궁궐, 전통 예절' },
  { id: 'beauty', ko: '뷰티·패션', en: 'Beauty & fashion', icon: '💄', seed: '화장품, 옷 스타일, 쇼핑 추천' },
  { id: 'sports', ko: '스포츠·게임', en: 'Sports & games', icon: '⚽', seed: '좋아하는 운동, 경기 관람, 게임' },
  { id: 'tech', ko: 'IT·기술', en: 'Tech & IT', icon: '💻', seed: '앱, 스마트폰, 요즘 기술 이야기' },
  { id: 'relation', ko: '연애·인간관계', en: 'Dating & relationships', icon: '💬', seed: '친구 사귀기, 고민 상담, 소개팅' }
];

export const INTEREST_MAX = 5;

export const emptyProfileDraft = Object.freeze({ nickname: '', nationality: '', gender: '', interests: [] });

export const isAdminEmail = (email = '') => {
  const normalized = email.toLowerCase();
  return normalized.includes('admin') || normalized.startsWith('hopep');
};

export const profileStorageKey = (uid) => `hn-profile-${uid}`;

export function sanitizeProfile(source = {}) {
  return {
    nickname: source.nickname || '',
    nationality: source.nationality || '',
    gender: source.gender || '',
    interests: Array.isArray(source.interests) ? source.interests.filter((id) => INTERESTS.some((item) => item.id === id)) : [],
    onboarded: !!source.onboarded
  };
}

export const profileInterests = (profile) => (profile?.interests || [])
  .map((id) => INTERESTS.find((item) => item.id === id))
  .filter(Boolean);
