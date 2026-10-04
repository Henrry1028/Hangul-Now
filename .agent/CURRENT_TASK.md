# Current Migration Task

## Task Identity

Milestone ID:

`P6C`

Milestone Name:

`FINAL PRE-CUTOVER GATE — ADMIN VIDEO CLASS PARITY + REAL AUTH CHECK`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`d67e4e8b38e8780db06b57eba9ea9d87a99a367a` (HEAD `44a7c8e`, docs only after it; clean; 0 0)

Expected branch:

`migration/react-vite-modular`

---

## Objective

A. Preserve legacy's admin-only Video Class preview after cutover, without exposing it to general users.
B. Establish a real Google sign-in readiness check. Do not fabricate a PASS.

Cutover infrastructure (server.js static, firebase.json, Dockerfile) must NOT be modified.

## Audit Result (source-first)

Legacy (`preview/index.html`):

- Entry points (all gated by the client UI flag `isAdmin`): header `{{ t.navVideoClass }}` + gold `Admin` badge button (632-638, `goVideoClass`: page + loadVideoClassData + scrollTo); sidebar 4th group `화상 수업 매칭 / LIVE VIDEO CLASS` → `1:1 화상수업 / 1:1 Live Class` glyph 화 and matching narrow pill item (navDef 6669; `go('videoclass')` does NOT load data, a legacy quirk).
- Client `isAdmin` = `?admin=1|true` (any visitor, even unauthenticated) OR email contains "admin" / starts with "hopep" (any Google account matching). Both leak to general users under the current policy.
- Page `10 Video Class Platform` (3222-3525): banner (👑 Admin Preview), refresh, 3 tabs (Find Tutors / My Sessions with count / Tutor Admin), tutor cards, session cards (status, Meet link copy/enter, countdown, feedback actions, status simulation), tutor profile form.
- Modals (732-972): intro video iframe, booking (duration/date/slots/note → POST /bookings), tutor feedback, student review, feedback viewer. PRD modal (975+) is unreachable (`vcModalOpen` never set true) → not ported.
- Controller 4263-4636 and derivations 7209-7362.
- Functional, not read-only: GET /api/v1/tutors, /tutors/:id/slots, /my-bookings, /bookings (requireEffectiveAdmin, 403 → my-bookings fallback); POST /bookings (authenticateOptionalUser), /bookings/:id/status, /feedback/tutor, /feedback/student (authenticateUser), /tutors/profile (requireAdmin).
- Backend (`src/videoClassService.js`) is an in-memory mock (arrays; Meet URL generated locally, no Google Calendar call). No external side effects; resets on restart.
- Server admin rule: `requireAdmin` = verified ID token + `admin` claim or `ADMIN_EMAILS` allowlist; `POST /api/admin/check` already exists.

React (before this task): Video Class intentionally omitted (P4A/P5A decision under AGENTS.md section 14); header/sidebar/pill entries absent.

Decision (bounded):

- Port page + 5 reachable modals + controller verbatim as an isolated `VideoClassPage` + `useVideoClass`.
- Visibility gate = legacy flag `auth.isAdmin` AND signed-in AND server-verified admin (`POST /api/admin/check` with ID token → 200 `isAdmin:true`). This is a strict subset of legacy visibility: it never shows more than legacy and removes the `?admin=1` / email-heuristic leaks to general users. Admin console gating is unchanged (P5B).
- Route guard: `videoclass` navigation and rendering require the verified flag; otherwise nothing renders.
- No server/auth change; no cutover file change.

## Progress Checklist

- [x] Git state verified (44a7c8e, clean, 0 0)
- [x] Admin Video Class source audit
- [x] Legacy runtime behavior capture (dc-runtime resolve: no ternary/&&/arrow → dropped styles/texts/handlers reproduced)
- [x] Implementation (useVideoClass, VideoClassPage + VideoClassModals, App route/guard, AppShell header/sidebar/pill)
- [x] Build: Node 20.20.2 production PASS (483.84 kB JS); host Node 24 `npm run build` silent-exit quirk (known)
- [x] Access validation PASS
- [x] Regression PASS (88 cross-app runs; known Intro/About wrapper only)
- [x] Real Google sign-in gate: MANUAL TEST REQUIRED (no test account; not faked)
- [ ] Commit/push + state files + CUTOVER_READINESS

## Exact Next Action

Commit/push the parity fix, then update MIGRATION_STATE/LOG/CUTOVER_READINESS with the manual auth checklist.
