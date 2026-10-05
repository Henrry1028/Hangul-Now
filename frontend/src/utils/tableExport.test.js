import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildXlsx, toCsv } from './tableExport.js';
import { driveErrorMessage, saveCsvAsGoogleSheet } from './googleDrive.js';
import { memberExportRows } from '../pages/AdminPage.jsx';

const users = [
  { name: 'HHR HHR', nickname: 'henry', nationality: '🇺🇸 미국 (United States)', gender: '남성', interestsText: '🎬 K-드라마·영화, 🎤 K-POP·음악', email: 'hopeproof@gmail.com', isGoogle: true, joinDate: '2026.08.03', lastLoginRel: '방금 전', statusLabel: '🟢 온라인', tutorName: '이서연', level: '초급', xp: '1,520 XP' },
  { name: 'Test, "User"', nickname: 'tester', nationality: '🇯🇵 일본 (Japan)', gender: '여성', interestsText: '🍜 음식·요리', email: 'test@example.com', isGoogle: false, joinDate: '2026.08.16', lastLoginRel: '49일 전', statusLabel: '⚪ 이전 접속', tutorName: '김지우', level: '초급', xp: '120 XP' }
];

describe('member list export', () => {
  it('turns the visible admin rows into a clean sheet (no emoji, numeric XP)', () => {
    const rows = memberExportRows(users);
    expect(rows[0]).toEqual(['회원 이름', '닉네임', '국적', '성별', '관심사', '계정 이메일', '로그인 방식', '가입일', '최근 로그인', '접속 상태', '담당 튜터', '학습 레벨', 'XP']);
    expect(rows[1]).toEqual(['HHR HHR', 'henry', '🇺🇸 미국 (United States)', '남성', '🎬 K-드라마·영화, 🎤 K-POP·음악', 'hopeproof@gmail.com', 'Google', '2026.08.03', '방금 전', '온라인', '이서연', '초급', 1520]);
    expect(rows[2][9]).toBe('이전 접속');
  });

  it('CSV has a BOM for Excel and escapes commas and quotes', () => {
    const csv = toCsv(memberExportRows(users));
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('"Test, ""User"""');
  });

  it('xlsx is a zip containing the workbook parts', () => {
    const bytes = buildXlsx(memberExportRows(users), '회원 목록');
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4B, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    for (const part of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']) expect(text).toContain(part);
    expect(text).toContain('<sheet name="회원 목록"');
    expect(text).toContain('Test, &quot;User&quot;');
    expect(text).toContain('<v>1520</v>');
  });
});

describe('Google Drive save', () => {
  afterEach(() => {
    delete window.firebase;
    vi.unstubAllGlobals();
  });

  it('asks for the drive.file scope and uploads the CSV as a Google Sheet', async () => {
    const addScope = vi.fn();
    const user = { uid: 'u1', email: 'admin@x.com', providerData: [{ providerId: 'google.com' }], reauthenticateWithPopup: vi.fn().mockResolvedValue({ credential: { accessToken: 'tok-123' } }) };
    function GoogleAuthProvider() { this.addScope = addScope; this.setCustomParameters = vi.fn(); }
    const auth = () => ({ currentUser: user });
    auth.GoogleAuthProvider = GoogleAuthProvider;
    window.firebase = { auth };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'sheet1', webViewLink: 'https://docs.google.com/spreadsheets/d/sheet1/edit' }) });
    vi.stubGlobal('fetch', fetchMock);

    const res = await saveCsvAsGoogleSheet({ csv: toCsv([['a', 'b'], ['1', '2']]), name: 'HangulNow_회원목록' });
    expect(res.url).toBe('https://docs.google.com/spreadsheets/d/sheet1/edit');
    expect(addScope).toHaveBeenCalledWith('https://www.googleapis.com/auth/drive.file');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/upload/drive/v3/files?uploadType=multipart');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    expect(init.body).toContain('"mimeType":"application/vnd.google-apps.spreadsheet"');
    expect(init.body).toContain('"name":"HangulNow_회원목록"');
    expect(init.body).not.toContain('﻿');
  });

  it('explains common failures', () => {
    expect(driveErrorMessage({ code: 'auth/popup-closed-by-user' })).toContain('취소');
    expect(driveErrorMessage(new Error('accessNotConfigured'))).toContain('Drive API');
    expect(driveErrorMessage(new Error('NOT_GOOGLE_ACCOUNT'))).toContain('Google 계정');
  });
});
