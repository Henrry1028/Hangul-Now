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
- [x] P4C source/coupling audit complete
- [ ] Implementation complete
- [ ] Build PASS
- [ ] Auth/profile behavior PASS
- [ ] Parity PASS
- [ ] Regression PASS
- [ ] Commit/push

## Exact Next Action

Implement the recorded bounded strategy: Firebase compat auth/profile hook + onboarding, signed-in shell identity, Firestore tutor sync, and identity/profile propagation to migrated API consumers. Admin page rendering remains P5 and Video Class remains hidden.

## Audit Result / Bounded Strategy

- Load the same Firebase compat 10.8.1 app/auth/firestore SDKs and initialize with the existing public client configuration.
- Add an App-level auth/profile controller that mirrors `onAuthStateChanged`, Firestore `users/{uid}` restore+merge, local `hn-profile-{uid}` fallback, popup-to-redirect login fallback, logout, profile editing, and the legacy email-based `isAdmin` UI flag.
- Port the two-step onboarding UI and exact validation/persistence behavior. Firestore failure must retain the local profile and show the legacy warning.
- Render the authenticated lower-sidebar identity, interest summary, logout, and profile editor; hide the header login when authenticated. Preserve the guest shell exactly.
- Persist tutor changes to Firestore for signed-in users and propagate signed-in uid/profile to generated content, correction, learning records, Conversation start/review/report/history metadata, and lesson-interest selection.
- Keep the Admin console page and API UI in P5. P4C owns only the admin flag/auth handoff; it must not add a dead Admin route or expose any Video Class control.
- Validate with an injected Firebase/Firestore stub because real Google credentials are unavailable; also regression-test the unchanged guest shell.
