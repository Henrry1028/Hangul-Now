# Current Migration Task

## Task Identity

Milestone ID:

`P4C`

Milestone Name:

`AUTH + PROFILE SHELL MIGRATION`

Status:

`READY_TO_COMMIT`

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
- [x] P4C source/coupling audit complete
- [x] Implementation complete
- [x] Build PASS
- [x] Auth/profile behavior PASS
- [x] Parity PASS
- [x] Regression PASS
- [x] Handoff diff review (Claude Code takeover after Codex limit): 2 parity fixes applied and revalidated
- [ ] Commit/push

## Handoff Review Fixes (Claude Code)

- Conversation history/report `meta.userName` restored to legacy `currentUser?.displayName || ''` (was nickname-first `getNickname()`, which also turned guest `''` into `'Learner'`).
- Sidebar avatar initial restored to legacy `(displayName || email || 'U')[0].toUpperCase()` (was nickname-first).
- Revalidated: Node 20.20.2 `NODE_ENV=production` build PASS (75 modules, 421.65 kB JS); stubbed signed-in sidebar identical in legacy/sandbox (initial, nickname, interests, hidden header login, one Firestore merge write); logout → guest shell identical; all 10 nav screens at 1440/390 with no page/console errors, no overflow, no Video Class text.

## Exact Next Action

Commit the verified P4C implementation, fetch and verify remote-ahead is zero, push, then record the completed milestone (STATE/LOG/ROADMAP) and begin the P5 Admin audit.

## Audit Result / Bounded Strategy

- Load the same Firebase compat 10.8.1 app/auth/firestore SDKs and initialize with the existing public client configuration.
- Add an App-level auth/profile controller that mirrors `onAuthStateChanged`, Firestore `users/{uid}` restore+merge, local `hn-profile-{uid}` fallback, popup-to-redirect login fallback, logout, profile editing, and the legacy email-based `isAdmin` UI flag.
- Port the two-step onboarding UI and exact validation/persistence behavior. Firestore failure must retain the local profile and show the legacy warning.
- Render the authenticated lower-sidebar identity, interest summary, logout, and profile editor; hide the header login when authenticated. Preserve the guest shell exactly.
- Persist tutor changes to Firestore for signed-in users and propagate signed-in uid/profile to generated content, correction, learning records, Conversation start/review/report/history metadata, and lesson-interest selection.
- Keep the Admin console page and API UI in P5. P4C owns only the admin flag/auth handoff; it must not add a dead Admin route or expose any Video Class control.
- Validate with an injected Firebase/Firestore stub because real Google credentials are unavailable; also regression-test the unchanged guest shell.
