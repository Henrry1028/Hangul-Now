// 관리자 표를 Google Drive에 Google 스프레드시트로 저장한다.
// 로그인한 Google 계정에 drive.file 권한(이 앱이 만든 파일만 접근)을 팝업으로 요청하고,
// 받은 OAuth 액세스 토큰으로 Drive REST API에 CSV를 올리며 시트로 변환한다.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
let cached = { token: '', uid: '', expiresAt: 0 };

async function getDriveToken() {
  const firebase = window.firebase;
  const user = firebase?.auth?.().currentUser;
  if (!user) throw new Error('NOT_SIGNED_IN');
  if (cached.token && cached.uid === user.uid && Date.now() < cached.expiresAt) return cached.token;
  if (!user.providerData?.some((p) => p?.providerId === 'google.com')) throw new Error('NOT_GOOGLE_ACCOUNT');
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope(DRIVE_SCOPE);
  provider.setCustomParameters({ login_hint: user.email || '' });
  const result = await user.reauthenticateWithPopup(provider);
  const token = result?.credential?.accessToken;
  if (!token) throw new Error('NO_ACCESS_TOKEN');
  // Google 액세스 토큰은 1시간 유효 — 여유를 두고 50분만 재사용
  cached = { token, uid: user.uid, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

/** CSV 문자열을 Google 스프레드시트로 업로드하고 { id, url } 을 돌려준다. */
export async function saveCsvAsGoogleSheet({ csv, name }) {
  const token = await getDriveToken();
  const boundary = `hn-${Math.random().toString(36).slice(2)}`;
  const metadata = { name, mimeType: 'application/vnd.google-apps.spreadsheet' };
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
    + `--${boundary}\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n${csv.charCodeAt(0) === 0xFEFF ? csv.slice(1) : csv}\r\n--${boundary}--`;
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) cached = { token: '', uid: '', expiresAt: 0 };
    const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || `HTTP_${res.status}`;
    throw new Error(reason);
  }
  return { id: data.id, url: data.webViewLink || `https://docs.google.com/spreadsheets/d/${data.id}/edit` };
}

// 오류 코드 → 관리자에게 보여 줄 문장
export function driveErrorMessage(err) {
  const code = String(err?.code || err?.message || '');
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return 'Google 권한 창이 닫혀 저장을 취소했어요.';
  if (code.includes('popup-blocked')) return '브라우저가 팝업을 막았어요. 팝업을 허용한 뒤 다시 시도해 주세요.';
  if (code.includes('user-mismatch')) return '지금 로그인한 계정과 같은 Google 계정을 선택해 주세요.';
  if (code === 'NOT_SIGNED_IN') return '로그인 후 이용할 수 있어요.';
  if (code === 'NOT_GOOGLE_ACCOUNT') return 'Google 계정으로 로그인한 경우에만 Drive에 저장할 수 있어요.';
  if (code.includes('accessNotConfigured') || code.includes('SERVICE_DISABLED')) return 'Google Drive API가 이 프로젝트에서 켜져 있지 않아요. (Google Cloud 콘솔에서 Drive API 사용 설정 필요)';
  if (code.includes('insufficient') || code === 'PERMISSION_DENIED' || code.includes('forbidden')) return 'Drive 저장 권한이 허용되지 않았어요. 권한 창에서 Drive 접근을 허용해 주세요.';
  return `Google Drive 저장에 실패했어요. (${code || '알 수 없는 오류'})`;
}
