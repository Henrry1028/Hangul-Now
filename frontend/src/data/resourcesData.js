// 자료실 목록. 파일은 frontend/public/assets/resources/ 에 영문 파일명으로 넣고(한글 파일명은 배포 시 깨짐) 아래에 항목을 추가한다.
// { id, type: 'doc' | 'audio', file: '/assets/resources/xxx.pdf', title: { ko, en }, desc: { ko, en },
//   level?: { ko, en }, size?: '1.2 MB', duration?: '03:20', updated?: 'YYYY-MM-DD' }
// 새 자료는 맨 앞에 추가한다 (최신순 표시).
export const RESOURCES = [];

export const RESOURCE_TEXT = {
  en: {
    eyebrow: 'RESOURCES',
    title: 'Resource Library',
    desc: 'Download study documents and listen to MP3 audio for practice anytime.',
    all: 'All', doc: 'Documents', audio: 'MP3 audio',
    open: 'Open', download: 'Download',
    empty: 'No resources yet.', emptyHint: 'Study documents and MP3 files will be posted here.',
    emptyFilter: 'Nothing in this category yet.',
    updated: 'Updated'
  },
  ko: {
    eyebrow: 'RESOURCES',
    title: '자료실',
    desc: '학습 문서를 내려받고, MP3 음성 자료를 언제든 들으며 연습하세요.',
    all: '전체', doc: '문서', audio: 'MP3',
    open: '열기', download: '다운로드',
    empty: '아직 등록된 자료가 없어요.', emptyHint: '학습 문서와 MP3 파일이 이곳에 올라와요.',
    emptyFilter: '이 분류에는 아직 자료가 없어요.',
    updated: '업데이트'
  }
};

// 파일 확장자 → 표시용 형식 (PDF, DOCX, MP3 …)
export function resourceFormat(file) {
  const m = String(file || '').toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/);
  return m ? m[1].toUpperCase() : '';
}

// 다운로드 시 저장될 파일 이름 (경로의 마지막 부분)
export function resourceFileName(file) {
  const clean = String(file || '').split('?')[0];
  return clean.slice(clean.lastIndexOf('/') + 1);
}
