// Google Identity Services(GIS) — 로그인과 별개로, 특정 권한의 Google 액세스 토큰을 팝업으로 받는다.
// Supabase 로그인에서 관리자 표를 Google Drive에 저장할 때 쓴다 (Firebase 로그인은 자체 재인증 팝업을 쓴다).
const GIS_SRC = 'https://accounts.google.com/gsi/client';
let loading = null;

const ready = () => (window.google && window.google.accounts && window.google.accounts.oauth2 ? window.google : null);

/** GIS 스크립트를 한 번만 불러온다 */
export function loadGoogleIdentity() {
  if (ready()) return Promise.resolve(ready());
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => (ready() ? resolve(ready()) : reject(new Error('GIS_LOAD_FAILED')));
      script.onerror = () => { loading = null; reject(new Error('GIS_LOAD_FAILED')); };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/**
 * 권한 팝업을 띄워 액세스 토큰을 받는다. { token, expiresIn(초) }
 * 실패하면 Google이 준 사유(popup_closed, popup_failed_to_open, access_denied …)를 메시지로 던진다.
 */
export function requestGoogleAccessToken(google, { clientId, scope, email }) {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      hint: email || undefined,
      callback: (response) => {
        if (!response || response.error) return reject(new Error((response && response.error) || 'NO_ACCESS_TOKEN'));
        if (!response.access_token) return reject(new Error('NO_ACCESS_TOKEN'));
        // 권한 화면에서 해당 권한의 체크를 풀면 토큰은 오지만 권한은 빠져 있다
        if (!google.accounts.oauth2.hasGrantedAllScopes(response, scope)) return reject(new Error('insufficient_scope'));
        return resolve({ token: response.access_token, expiresIn: Number(response.expires_in) || 3600 });
      },
      error_callback: (error) => reject(new Error((error && error.type) || 'popup_failed'))
    });
    client.requestAccessToken();
  });
}
