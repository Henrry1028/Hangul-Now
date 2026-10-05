import { describe, expect, it } from 'vitest';
import { buildAdminView } from './AdminPage.jsx';

const now = Date.now();
const users = [
  { uid: 'a', displayName: 'Kim', email: 'kim@x.com', selectedTutorId: 'minho', level: 'intermediate', xp: 1520, createdAt: now - 2 * 86400000, lastLoginAt: now - 10 * 60000, isActiveToday: true, provider: 'google.com' },
  { uid: 'b', displayName: 'Lee', email: 'lee@x.com', selectedTutorId: 'seoyeon', level: 'advanced', xp: 120, createdAt: now - 40 * 86400000, lastLoginAt: now - 3 * 86400000, isActiveToday: false, provider: 'password' }
];
const summary = { totalUsers: 2, todayDau: 1, dauRatio: '50.0', aiUsage: { totalCalls: 7, totalCostUsd: 0.12345 }, tutorDistribution: { jiwoo: 0, minho: 1, seoyeon: 1 } };

describe('buildAdminView (legacy admin console derivations)', () => {
  it('derives rows, KPIs and labels from dashboard data', () => {
    const v = buildAdminView({ adminData: { users, summary }, adminSearch: '', adminFilter: 'all', currentUser: null, selectedTutorId: 'jiwoo', userXp: 0 });
    expect(v.users.map((u) => u.name)).toEqual(['Kim', 'Lee']);
    expect(v.users[0]).toMatchObject({ tutorName: '박민호', level: '중급', xp: '1,520 XP', isGoogle: true, lastLoginRel: '10분 전', statusLabel: '🟢 온라인' });
    expect(v.users[1]).toMatchObject({ level: '고급', statusLabel: '⚪ 이전 접속', isGoogle: false });
    expect(v.aiCost).toBe('0.123');
    expect([v.totalUsers, v.todayDau, v.jiwoo, v.minho, v.seoyeon]).toEqual([2, 1, 0, 1, 1]);
  });

  it('applies search (case-insensitive) and filters', () => {
    const base = { adminData: { users, summary }, currentUser: null, selectedTutorId: 'jiwoo', userXp: 0 };
    expect(buildAdminView({ ...base, adminSearch: 'LEE', adminFilter: 'all' }).users.map((u) => u.uid)).toEqual(['b']);
    expect(buildAdminView({ ...base, adminSearch: '', adminFilter: 'today' }).users.map((u) => u.uid)).toEqual(['a']);
    expect(buildAdminView({ ...base, adminSearch: '', adminFilter: 'new' }).users.map((u) => u.uid)).toEqual(['a']);
  });

  it('falls back to the signed-in user row and legacy KPI defaults without dashboard data', () => {
    const v = buildAdminView({
      adminData: null,
      adminSearch: '',
      adminFilter: 'all',
      currentUser: { uid: 'me', displayName: 'Me', email: 'me@x.com' },
      userProfile: { nickname: 'henry', nationality: 'US', gender: 'male', interests: ['kdrama', 'food'] },
      selectedTutorId: 'jiwoo',
      userXp: 2840
    });
    expect(v.users).toHaveLength(1);
    expect(v.users[0]).toMatchObject({
      nickname: 'henry',
      gender: '남성',
      nationalityCode: 'US'
    });
    expect(v.users[0].nationality).toContain('미국');
    expect(v.users[0].interests).toHaveLength(2);
    expect([v.aiCalls, v.aiCost, v.jiwoo]).toEqual([142, '0.048', 2]);
  });

  it('searches by nickname, nationality, and interests', () => {
    const profileUsers = [
      { uid: 'u1', displayName: 'User One', nickname: 'henry', nationality: 'US', gender: 'male', interests: ['kdrama', 'kpop'], email: 'u1@x.com', selectedTutorId: 'jiwoo', level: 'beginner', xp: 500, createdAt: now, lastLoginAt: now, isActiveToday: true },
      { uid: 'u2', displayName: 'User Two', nickname: 'sarah', nationality: 'GB', gender: 'female', interests: ['food', 'travel'], email: 'u2@x.com', selectedTutorId: 'minho', level: 'intermediate', xp: 800, createdAt: now, lastLoginAt: now, isActiveToday: true }
    ];
    const base = { adminData: { users: profileUsers, summary }, currentUser: null, selectedTutorId: 'jiwoo', userXp: 0 };
    expect(buildAdminView({ ...base, adminSearch: 'henry', adminFilter: 'all' }).users.map((u) => u.uid)).toEqual(['u1']);
    expect(buildAdminView({ ...base, adminSearch: '미국', adminFilter: 'all' }).users.map((u) => u.uid)).toEqual(['u1']);
    expect(buildAdminView({ ...base, adminSearch: 'kpop', adminFilter: 'all' }).users.map((u) => u.uid)).toEqual(['u1']);
    expect(buildAdminView({ ...base, adminSearch: 'travel', adminFilter: 'all' }).users.map((u) => u.uid)).toEqual(['u2']);
  });
});
