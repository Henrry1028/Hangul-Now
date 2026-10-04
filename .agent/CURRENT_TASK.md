# Current Migration Task

## Task Identity

Milestone ID:

`P5B`

Milestone Name:

`ADMIN CONSOLE MIGRATION`

Status:

`IN_PROGRESS`

Baseline migration-code checkpoint:

`a5d3d20040169611492f7a8489ade4caced7e5e1`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Migrate the legacy read-only Admin console (`09 Admin Console`) and its admin-only entry points without exposing Video Class or changing server authorization.

## Expected Files

- `frontend/src/pages/AdminPage.jsx` (new)
- `frontend/src/App.jsx` (admin state, loader with Bearer ID token, goAdmin, deep link, route)
- `frontend/src/components/AppShell.jsx` (header 👑 Admin pill, sidebar 관리자 콘솔 button)
- `frontend/src/hooks/useAuthProfile.js` (only if needed for deep-link/token hooks)
- `.agent/*` state files

## Required Validation

- Node 20 production build,
- guest/non-admin: no admin entry points, no Video Class,
- admin flag (`?admin=1` and stubbed admin email): header + sidebar entry points, page renders,
- routed dashboard response: KPIs, table rows, search, filters, empty state, tutor counts, refresh, home button,
- fallback (no adminData / 401): single current-user row and legacy KPI fallbacks, identical to legacy,
- deep link `#admin` / `?page=admin` for signed-in admin,
- real server `/api/admin/dashboard` without token still 401,
- legacy vs sandbox desktop/mobile, light/dark comparison; full migrated-domain regression; no console/page errors.

## Progress Checklist

- [x] Git state verified (HEAD a5d3d20 pushed, 0 0)
- [x] P5A source/coupling audit complete (MIGRATION_LOG P5A)
- [ ] Implementation complete
- [ ] Build PASS
- [ ] Admin behavior PASS
- [ ] Parity PASS
- [ ] Regression PASS
- [ ] Commit/push

## Exact Next Action

Commit the P4C/P5A docs, then implement AdminPage + App/AppShell admin wiring per MIGRATION_LOG P5A.
