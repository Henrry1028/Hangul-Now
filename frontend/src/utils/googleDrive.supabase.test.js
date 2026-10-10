import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Supabase 로그인 상태를 흉내 낸다 (실제 authClient는 페이지가 뜰 때 서버 설정으로 한 번 정해진다)
const signedIn = { user: { uid: 'u1', email: 'admin@example.com' } };
vi.mock('../data/authClient.js', () => ({
  authClient: { provider: 'supabase', currentUser: () => signedIn.user }
}));

const CLIENT_ID = '1234567890-abc.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Google Identity Services 대역 — 권한 팝업 대신 준비해 둔 응답을 돌려준다
function installGoogle(respond) {
  const requests = [];
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => {
          requests.push(config);
          return { requestAccessToken: () => respond(config) };
        },
        hasGrantedAllScopes: (response, scope) => String(response.scope || '').split(' ').includes(scope)
      }
    }
  };
  return requests;
}
const grant = (token = 'drive-token') => (config) => config.callback({ access_token: token, expires_in: 3599, scope: `email ${DRIVE_SCOPE}` });

const uploadOk = () => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'sheet1', webViewLink: 'https://docs.google.com/spreadsheets/d/sheet1/edit' }) });

// 토큰 캐시가 모듈 안에 있어 테스트마다 모듈을 새로 불러온다
const loadDrive = async () => { vi.resetModules(); return import('./googleDrive.js'); };

describe('Google Drive save with Supabase sign-in', () => {
  beforeEach(() => {
    signedIn.user = { uid: 'u1', email: 'admin@example.com' };
    window.__HN_AUTH__ = { provider: 'supabase', googleClientId: CLIENT_ID };
  });
  afterEach(() => {
    delete window.google;
    delete window.__HN_AUTH__;
    vi.unstubAllGlobals();
  });

  it('asks Google for the drive.file scope for the signed-in account and uploads with that token', async () => {
    const requests = installGoogle(grant('drive-token'));
    const fetchMock = uploadOk();
    vi.stubGlobal('fetch', fetchMock);
    const { saveCsvAsGoogleSheet } = await loadDrive();

    const result = await saveCsvAsGoogleSheet({ csv: 'a,b\r\n1,2', name: 'HangulNow_회원목록' });

    expect(result.url).toBe('https://docs.google.com/spreadsheets/d/sheet1/edit');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ client_id: CLIENT_ID, scope: DRIVE_SCOPE, hint: 'admin@example.com' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/upload/drive/v3/files?uploadType=multipart');
    expect(init.headers.Authorization).toBe('Bearer drive-token');
  });

  it('reuses the token for the next save instead of opening the consent popup again', async () => {
    const requests = installGoogle(grant());
    vi.stubGlobal('fetch', uploadOk());
    const { saveCsvAsGoogleSheet } = await loadDrive();

    await saveCsvAsGoogleSheet({ csv: 'a', name: 'one' });
    await saveCsvAsGoogleSheet({ csv: 'b', name: 'two' });

    expect(requests).toHaveLength(1);
  });

  it('asks again when a different user signs in', async () => {
    const requests = installGoogle(grant());
    vi.stubGlobal('fetch', uploadOk());
    const { saveCsvAsGoogleSheet } = await loadDrive();

    await saveCsvAsGoogleSheet({ csv: 'a', name: 'one' });
    signedIn.user = { uid: 'u2', email: 'other@example.com' };
    await saveCsvAsGoogleSheet({ csv: 'b', name: 'two' });

    expect(requests.map((request) => request.hint)).toEqual(['admin@example.com', 'other@example.com']);
  });

  it('explains that sign-in is required for guests', async () => {
    signedIn.user = null;
    installGoogle(grant());
    const { saveCsvAsGoogleSheet, driveErrorMessage } = await loadDrive();

    const error = await saveCsvAsGoogleSheet({ csv: 'a', name: 'one' }).catch((e) => e);

    expect(error.message).toBe('NOT_SIGNED_IN');
    expect(driveErrorMessage(error)).toBe('로그인 후 이용할 수 있어요.');
  });

  it('says the feature is not set up when the server has no Google client ID', async () => {
    window.__HN_AUTH__ = { provider: 'supabase' };
    const requests = installGoogle(grant());
    const { saveCsvAsGoogleSheet, driveErrorMessage } = await loadDrive();

    const error = await saveCsvAsGoogleSheet({ csv: 'a', name: 'one' }).catch((e) => e);

    expect(error.message).toBe('DRIVE_UNSUPPORTED');
    expect(driveErrorMessage(error)).toContain('엑셀');
    expect(requests).toHaveLength(0);
  });

  it('reports a cancelled or blocked popup and a refused permission in plain words', async () => {
    vi.stubGlobal('fetch', uploadOk());
    const messageFor = async (respond) => {
      installGoogle(respond);
      const { saveCsvAsGoogleSheet, driveErrorMessage } = await loadDrive();
      return driveErrorMessage(await saveCsvAsGoogleSheet({ csv: 'a', name: 'one' }).catch((e) => e));
    };

    expect(await messageFor((config) => config.error_callback({ type: 'popup_closed' }))).toContain('취소');
    expect(await messageFor((config) => config.error_callback({ type: 'popup_failed_to_open' }))).toContain('팝업');
    expect(await messageFor((config) => config.callback({ error: 'access_denied' }))).toContain('권한');
  });

  it('treats a token without the Drive permission as a refused permission', async () => {
    installGoogle((config) => config.callback({ access_token: 'no-drive', expires_in: 3599, scope: 'email profile' }));
    const fetchMock = uploadOk();
    vi.stubGlobal('fetch', fetchMock);
    const { saveCsvAsGoogleSheet, driveErrorMessage } = await loadDrive();

    const error = await saveCsvAsGoogleSheet({ csv: 'a', name: 'one' }).catch((e) => e);

    expect(driveErrorMessage(error)).toContain('권한');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
