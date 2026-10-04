# Current Migration Task

## Task Identity

Milestone ID:

`P4C`

Milestone Name:

`AUTH + PROFILE SHELL MIGRATION`

Status:

`IN_PROGRESS`

Baseline migration-code checkpoint:

`45ac5d2e8fd6cf08e65bf9b0300af4d00cc2eff7`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Migrate the legacy Firebase auth/profile portion of the global shell without exposing deferred Video Class functionality or weakening server-side authorization.

## Expected Files

- `frontend/index.html` (legacy Firebase compat SDK tags if still required)
- `frontend/src/App.jsx`
- `frontend/src/components/AppShell.jsx`
- auth/profile hook and onboarding component/data/style files under `frontend/src/`
- signed-in identity propagation updates in Reading learning records, Chat correction, Conversation, and report/session calls where legacy uses the verified current user
- `.agent/*` state files

## Required Validation

- true-production Node 20 build,
- identical guest shell behavior,
- stubbed Firebase auth-state, popup→redirect fallback, logout, Firestore profile/tutor restore+merge, onboarding required/edit flows,
- admin UI flag parity (`?admin=1` and legacy email heuristic) without exposing Video Class,
- signed-in uid/profile propagation to all migrated consumers,
- desktop/mobile, ko/en, light/dark parity and full migrated-domain regression,
- no console/page errors and no auth/privacy contract regression.

## Progress Checklist

- [x] Git state reverified
- [ ] P4C source/coupling audit complete
- [ ] Implementation complete
- [ ] Build PASS
- [ ] Auth/profile behavior PASS
- [ ] Parity PASS
- [ ] Regression PASS
- [ ] Commit/push

## Exact Next Action

Inspect the full legacy Firebase/auth/profile lifecycle and every migrated userId/profile consumer, then record the bounded P4C implementation strategy before editing source.
