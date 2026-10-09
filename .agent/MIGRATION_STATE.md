# HangulNow React + Vite Migration State

## H6 — Listening Speed Steps + A-B Repeat

Status:

`READY_TO_COMMIT`

- Baseline: `4b9037e` on `feat/listening-playback-loop`.
- Scope: Listening-only speed choices, seekable progress, and A-B repeat for server-backed audio.
- Device speech fallback remains playable but cannot offer arbitrary seeking or section repeat.
- Validation: Node 20 build PASS; Vitest 42/42; latest real-WAV Listening and navigation Playwright desktop/mobile 4/4 PASS; Korean 390 x 844 visual check PASS.
- Concurrent remote baseline now includes unrelated PWA/Speaking commits through `6234954`; H6 does not modify those product files.

---

## H5 — Writing App Target + Cheonjiin Focus

Status:

`COMPLETE` (commit `1514de7`; not deployed)

- Baseline: `b8761e5` on `feat/writing-app-keyboard-focus`.
- Scope: app-only Writing layout; remove the jamo picker from the app flow and keep the target/composition card adjacent to the Cheonjiin keypad.
- Desktop Writing behavior, data contracts, and production traffic are out of scope.
- Validation: Node 20 build PASS; Vitest 39/39; Playwright 13 passed / 1 expected skip; Korean 390 x 844 first-viewport visual check PASS.
- Production traffic: unchanged. Deployment requires separate explicit approval.
- Concurrent Git note: remote `feat/writing-app-keyboard-focus` gained unrelated deployment-script commit `c06bc54` during validation. It is preserved; H5 begins after that commit and does not modify the deployment script.

---

## State Metadata

State status:

`CONFIRMED`

Final status:

**HANGULNOW REACT + VITE MIGRATION — COMPLETE**. Production first launch COMPLETE. Final real Google auth, admin, and Video Class admin checks PASS. Production LIVE.

Branch:

`migration/react-vite-modular`

Last verified migration-code checkpoint:

`6d94bad8f30ca9d6405d0767c81080e700966081`

Checkpoint commit:

`build: switch production frontend to React Vite`

Repository HEAD rule:

- HEAD may equal this checkpoint, or
- HEAD may be a descendant containing explainable orchestration metadata commits and/or later logged migration milestones.
- Do **not** require this file to contain its own commit hash.
- At handoff, verify the checkpoint is an ancestor of HEAD and inspect every later commit.

Remote divergence at the checkpoint:

`0 0`

Working tree at the checkpoint:

`clean`

Production cutover:

`COMPLETE — LIVE (Cloud Run direct) since 2026-10-04T07:42:50Z: https://hangul-now-api-313423647793.asia-northeast3.run.app`. Earlier record: `LOCAL CUTOVER DONE (6d94bad)` — Express/Firebase Hosting/Docker serve `frontend/dist`; external deployment NOT performed (separate milestone)

Current production revision:

`hangul-now-api-00008-bek` (commit `b441773`: Tutor cards, Chat correction sync, H3 Reading latency) at 100% since 2026-10-05; rollback target `hangul-now-api-00006-cud`.

Current production scaling:

`min instances = 1`, `max instances = 1` since 2026-10-05. This removes scale-to-zero cold starts while preserving the single-instance requirement for in-memory state.

Current post-launch product task:

`H3-CONTENT-GENERATION-LATENCY` is COMPLETE and committed in `b441773`. Cloud Build `9e1760e2-1417-4735-86f9-75b1a7fd79ab` produced image `sha256:97d3cb9e...`; candidate `00008-bek` passed Tutor asset, Chat correction, Reading, browser, and log acceptance before production traffic moved to it. ERROR logs 0; HTTP 5xx 0.

Legacy source of truth:

`preview/index.html` (no longer served; kept unchanged as rollback source)

React/Vite sandbox:

`frontend/`

---

## 1. Completed Milestones

### Foundation

- P0 Booking security work — COMPLETE
- P0 Role-scoped booking flow — COMPLETE
- P0 Video Class backend readiness — COMPLETE
- Public tutor privacy contract — COMPLETE
- React/Vite isolated scaffold — COMPLETE

### React/Vite frontend

- Intro migration — COMPLETE
- About migration — COMPLETE
- Tutors migration — COMPLETE
- Tutor selection parity — COMPLETE

### Reading

- Reading static passage viewer — COMPLETE
- Translation toggle — COMPLETE
- Vocabulary selection/highlight — COMPLETE
- Glossary detail — COMPLETE
- Session-local saved toggle — COMPLETE
- Static grammar — COMPLETE
- Reading responsive parity — COMPLETE
- Reading TTS — COMPLETE
- Reading AI generation audit and migration strategy — COMPLETE
- Reading AI controls and generated passage/translation/glossary/grammar — COMPLETE
- Reading Quiz and activity/history audit — COMPLETE
- Reading Quiz + App-owned activity persistence — COMPLETE

### Home

- Home ("02 Today") static screen + navigation (P2A, `3e125c9`) — COMPLETE

### Cross-domain fixes

- Sandbox webfont parity (P1Q, `946a4cc`) — COMPLETE
- Tutors desktop screen spacing parity (P2B, `28bd81c`) — COMPLETE
- Reading desktop screen gap parity (P2C-FIX, `1853fa6`) — COMPLETE

### Writing

- Writing audit (P2C) — COMPLETE
- Writing migration: syllable/word build, SVG keyboard, guide, sentence tab (P2D, `e562a11`) — COMPLETE

### Listening

- Listening audit (P2E) — COMPLETE
- Listening migration: player/TTS/fallback, script, translation, generation, quiz, dictation (P2F, `1b8df9f`) — COMPLETE

### Record

- Record audit (P2G) — COMPLETE
- Record migration: stats, weekly audio review, calendar/analytics, ranking (P2H, `7e947f0`) — COMPLETE

### Speaking

- Speaking audit (P3A) and migration incl. shared translation toggle (P3B, `e250f9a`) — COMPLETE

### Chat

- Chat audit (P3C) and migration (P3D, `423c3ab`) — COMPLETE

### Conversation

- Conversation audit (P3E) and migration (P3F, `15594c1`) — COMPLETE

Phase 5 (Speaking, Chat, Conversation): COMPLETE

### Global shell

- Shell layout + navigation (P4A audit, P4B `45ac5d2`) — COMPLETE
- Auth + profile/onboarding + identity propagation (P4C `a5d3d20`) — COMPLETE

Phase 6 (Global shell): COMPLETE

### Admin

- Admin console audit (P5A) and migration (P5B `6b9b97b`) — COMPLETE

### Final integration

- P6A final regression with fixes `9b8f4c5` (Reading narrow grid), `17df31a` (tutor restore storage), P6B `d67e4e8` (document head/icons) — COMPLETE
- P6C admin-only Video Class preview parity (`6ab4395`) — COMPLETE; real Google sign-in — PASS (manual, user-reported 10/10)

### Cutover

- P7 local/repository production cutover (`6d94bad`) — COMPLETE; external deploy NOT performed

---

## 2. Latest Completed Milestone

Milestone:

`P7 LOCAL/REPOSITORY PRODUCTION CUTOVER`

Status:

`COMPLETE`

Commit:

`6d94bad8f30ca9d6405d0767c81080e700966081`

Commit message:

`build: switch production frontend to React Vite`

Runtime acceptance:

`PASS` (see MIGRATION_LOG P7 and CUTOVER_READINESS section 9)

---

## 3. Current Milestone

None active. **The migration is COMPLETE.**

Latest post-launch product task:

`H2-CHAT-CORRECTION-SYNC` — `COMPLETE` in commit `b441773` and production revision `00008-bek`. The Chat Smart Correction panel consumes the same per-message correction state as the left conversation. Focused desktop/mobile Playwright, staged Vitest, ESLint, and Node 20 production build passed.

Last milestone:

`P9 PRODUCTION FIRST LAUNCH — CLOUD RUN DIRECT`: `COMPLETE`.

- LIVE since 2026-10-04T07:42:50Z at https://hangul-now-api-313423647793.asia-northeast3.run.app.
- Revision `hangul-now-api-00001-siy` at 100%.
- Final user verification on the production origin PASS: real Google login, no unauthorized-domain error, `POST /api/admin/check` 200, Admin console, Video Class, logout isolation, re-login restoration, no unexpected browser/network errors.

Recommended next phase:

`P7 POST-LAUNCH STABILITY MONITORING`: **NOT STARTED** (requires its own instruction).

---

## 4. Remaining Reading Work

- AI generation — COMPLETE
- generated passage integration — COMPLETE
- generated translation integration — COMPLETE
- generated glossary integration — COMPLETE
- generated grammar integration — COMPLETE
- Quiz interaction — COMPLETE
- XP/activity/history mutation — COMPLETE (App-owned, legacy storage keys)
- learned-topic history — COMPLETE (P1N `hn-learned`)
- history consumption UI — belongs to Home/Record migrations

Reading domain: COMPLETE

---

## 5. Remaining Major Domains

Current expected high-level sequence:

1. ~~Finish Reading~~ — COMPLETE
2. ~~Home~~ — COMPLETE
3. ~~Writing~~ — COMPLETE
4. ~~Listening~~ — COMPLETE
5. ~~Record~~ — COMPLETE
6. ~~Speaking~~ — COMPLETE
7. ~~Chat~~ — COMPLETE
8. ~~Conversation~~ — COMPLETE
9. ~~Global Header / navigation shell~~ — COMPLETE (layout/navigation + auth/profile)
10. ~~Admin~~ — COMPLETE
11. ~~Final parity and regression~~ — COMPLETE
12. ~~Cutover readiness~~ — COMPLETE (manual real-auth PASS)
13. ~~Production cutover~~ — COMPLETE: local `6d94bad`; Cloud Run direct LIVE 2026-10-04T07:42:50Z (https://hangul-now-api-313423647793.asia-northeast3.run.app)
14. Legacy retirement — NOT STARTED (only after post-launch stability is proven)

Actual sequence may change after audits.

---

## 6. Deferred Product Scope

Do not expose or migrate for public release unless explicitly approved:

- Video Class public navigation
- booking CTA
- booking UI
- Meet UI
- availability UI
- Persistent Tutor Storage
- Tutor Browser UI
- Student Video Class E2E
- Video Class Public Release

---

## 7. Current Progress Estimate

Estimated total migration progress:

`100% — migration COMPLETE; production LIVE`

This is a workload estimate, not a completion guarantee.

The remaining work contains several higher-coupling domains, so milestone count and effort percentage are not equivalent.

---

## 8. State Update Rule

After every verified milestone, update:

- last verified migration-code checkpoint when a new code milestone is verified
- remote divergence
- working-tree expectation
- latest completed milestone
- current milestone
- completed domain list
- remaining domain list
- progress estimate if materially changed

Never mark a milestone COMPLETE until required validation passes.
