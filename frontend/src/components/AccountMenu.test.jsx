import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AccountMenu from './AccountMenu.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
function mount(auth, onNavigate = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<AccountMenu lang="ko" auth={auth} userName="훈민" userInitial="H" onNavigate={onNavigate} />));
  return onNavigate;
}
const q = (sel) => container.querySelector(sel);
const labels = () => [...container.querySelectorAll('.account-menu__item')].map((el) => el.textContent);
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('AccountMenu', () => {
  it('signed in: shows profile, the four menu items and logout', () => {
    const auth = { currentUser: { email: 'hm@x.com' }, login: vi.fn(), logout: vi.fn() };
    const onNavigate = mount(auth);
    expect(q('.account-menu__panel')).toBeNull();
    click(q('.account-menu__trigger'));
    expect(q('.account-menu__email').textContent).toBe('hm@x.com');
    expect(labels()).toEqual(['튜터 변경', '이용 매뉴얼', '공지사항', '1:1 문의', '로그아웃']);
    expect(q('a.account-menu__item').getAttribute('href')).toMatch(/^mailto:hello@hangulnow\.com/);

    click(container.querySelectorAll('.account-menu__item')[0]);
    expect(onNavigate).toHaveBeenCalledWith('tutors');
    expect(q('.account-menu__panel')).toBeNull();

    click(q('.account-menu__trigger'));
    click(q('.account-menu__item--danger'));
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('signed out: login replaces the profile card and there is no logout', () => {
    const auth = { currentUser: null, login: vi.fn(), logout: vi.fn() };
    mount(auth);
    click(q('.account-menu__trigger'));
    expect(labels()).toEqual(['튜터 변경', '이용 매뉴얼', '공지사항', '1:1 문의']);
    click(q('.account-menu__login'));
    expect(auth.login).toHaveBeenCalledTimes(1);
  });

  it('signed in with openOnboarding: includes profileEdit item', () => {
    const auth = { currentUser: { email: 'hm@x.com' }, login: vi.fn(), logout: vi.fn(), openOnboarding: vi.fn() };
    mount(auth);
    click(q('.account-menu__trigger'));
    expect(labels()).toEqual(['프로필·관심사 수정', '튜터 변경', '이용 매뉴얼', '공지사항', '1:1 문의', '로그아웃']);
    click(container.querySelectorAll('.account-menu__item')[0]);
    expect(auth.openOnboarding).toHaveBeenCalledTimes(1);
    expect(q('.account-menu__panel')).toBeNull();
  });

  it('closes on Escape and outside click', () => {
    mount({ currentUser: null, login: vi.fn(), logout: vi.fn() });
    click(q('.account-menu__trigger'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(q('.account-menu__panel')).toBeNull();
    click(q('.account-menu__trigger'));
    act(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(q('.account-menu__panel')).toBeNull();
  });
});
