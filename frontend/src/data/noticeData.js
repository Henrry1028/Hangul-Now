// 공지사항 목록. 새 공지는 맨 앞에 추가한다: { id, date: 'YYYY-MM-DD', title: { ko, en }, body: { ko, en } }
export const NOTICES = [];

export const NOTICE_TEXT = {
  en: { eyebrow: 'NOTICES', title: 'Notices', empty: 'No notices yet.', emptyHint: 'Service updates and announcements will appear here.' },
  ko: { eyebrow: 'NOTICES', title: '공지사항', empty: '아직 등록된 공지사항이 없어요.', emptyHint: '서비스 업데이트와 안내 소식이 이곳에 올라와요.' }
};
