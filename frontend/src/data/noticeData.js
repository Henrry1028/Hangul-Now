export const NOTICES = [
  {
    id: 'notice-mobile-pwa-update-20261009',
    date: '2026-10-09',
    title: {
      ko: '[안내] 모바일 홈 화면 앱(PWA) 최신 업데이트 반영 방법 (Android / iOS)',
      en: '[Notice] How to Apply Latest Mobile App Updates (Android / iOS)'
    },
    body: {
      ko: `스마트폰의 홈 화면 앱(PWA)은 빠른 실행을 위해 이전 화면 데이터를 기기 내부에 보관(캐시)합니다. 최신 기능이 화면에 보이지 않거나 이전 화면이 유지될 경우 아래의 기기별 방법을 진행해 주시면 즉시 최신 화면이 적용됩니다.

[🤖 안드로이드 폰 (Galaxy / Chrome / 삼성인터넷)]
1. 홈 화면의 [Hangul Now] 아이콘을 1~2초간 길게 터치 → [설치 삭제] 또는 [삭제]
2. Chrome 또는 삼성인터넷으로 접속 → 브라우저 메뉴(⋮)에서 [홈 화면에 추가] 또는 [앱 설치] 선택
(또는 브라우저 주소창 왼쪽 자물쇠 🔒 터치 → [사이트 설정] → [데이터 삭제 및 재설정])

[🍎 애플 폰 (iPhone / iPad / Safari)]
1. 홈 화면의 [Hangul Now] 아이콘을 1~2초간 길게 터치 → [책갈피 삭제] 또는 [홈 화면에서 제거]
2. Safari로 접속 → 하단 공유 버튼(↑) 터치 → [+ 홈 화면에 추가] 선택
(또는 아이폰 [설정] → [Safari] → 맨 아래 [고급] → [웹사이트 데이터] → hangul 검색 후 삭제)

자세한 내용은 [이용 매뉴얼] 상단 공지 안내를 참고해 주세요.`,
      en: `Mobile Home Screen web apps (PWA) cache app data locally for instant loading. If new features do not appear or the previous screen remains, please follow the steps below for your device.

[🤖 Android (Galaxy / Chrome / Samsung Internet)]
1. Press and hold the [Hangul Now] app icon on home screen → Tap [Uninstall] or [Remove].
2. Open Chrome or Samsung Internet, visit the site, tap menu (⋮) → [Add to Home screen] or [Install app].
(Alternatively, tap lock 🔒 in address bar → [Site settings] → [Clear & reset data])

[🍎 Apple (iPhone / iPad / Safari)]
1. Press and hold the [Hangul Now] icon on home screen → Tap [Delete Bookmark] or [Remove from Home Screen].
2. Open Safari, visit the site, tap Share (↑) → [+ Add to Home Screen].
(Alternatively, go to iPhone [Settings] → [Safari] → [Advanced] → [Website Data] → search hangul & delete)

For more details, check the notice at the top of the User Guide.`
    }
  }
];

export const NOTICE_TEXT = {
  en: { eyebrow: 'NOTICES', title: 'Notices', empty: 'No notices yet.', emptyHint: 'Service updates and announcements will appear here.' },
  ko: { eyebrow: 'NOTICES', title: '공지사항', empty: '아직 등록된 공지사항이 없어요.', emptyHint: '서비스 업데이트와 안내 소식이 이곳에 올라와요.' }
};
