# HangulNow React + Vite Migration State

## State Metadata

State status:

`CONFIRMED`

Branch:

`migration/react-vite-modular`

Last verified migration-code checkpoint:

`28bd81c5ac1088f5ae3dd8089aff4906071238fe`

Checkpoint commit:

`fix: align tutors desktop screen spacing with legacy`

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

`DEFERRED`

Legacy source of truth:

`preview/index.html`

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

---

## 2. Latest Completed Milestone

Milestone:

`P1P READING QUIZ + ACTIVITY PERSISTENCE MIGRATION`

Status:

`COMPLETE`

Commit:

`fdd5946c29037512e8da860a6376719a6c2cc401`

Commit message:

`refactor: migrate reading quiz activity slice to React sandbox`

Agent:

Started by Codex (data/handler/activity helper), resumed and completed by Claude Code after the Codex usage limit.

Runtime acceptance:

`PASS` (see MIGRATION_LOG P1P)

Known issue discovered (pre-existing, not P1P): sandbox `frontend/index.html` loads IBM Plex Mono and Newsreader webfonts that legacy never loads → scheduled as P1Q.

### Previous milestone — P1N READING AI GENERATION MIGRATION

Commit `01e84258129f7c614cc3ecf065ebab210c6b414f`. Verified:

- Node 20 standard production build PASS,
- live `/api/content/generate` through Vite proxy PASS,
- generated title, subtitle, paragraphs, translations, glossary, and grammar PASS,
- beginner/intermediate/advanced request payloads PASS,
- same-level no-op and repeated-action blocking PASS,
- one network retry PASS,
- HTTP/API error UI PASS,
- guest `hn-learned` persistence PASS,
- selection/translation reset PASS,
- static full-passage TTS legacy quirk PASS,
- desktop PASS,
- mobile PASS,
- 520/521 TTS regression PASS,
- Intro/About/Tutors/Reading regression PASS,
- legacy isolation PASS.

Known out-of-scope issue:

- `favicon.ico` 404

Host toolchain note:

- Host Node `v24.11.1` exits silently during Vite 5 minification after transforming all modules.
- Unminified host build and direct esbuild JS/CSS minification pass.
- The repository's existing Node 20 verification image completes the standard minified build.

Known legacy quirk preserved:

- generated Reading full-passage TTS continues to read static `PARAS`.

---

## 3. Current Milestone

Milestone ID:

`P2D`

Name:

`WRITING MIGRATION`

Status:

`IN_PROGRESS`

Scope: see MIGRATION_LOG P2C (strategy) and CURRENT_TASK.

### Previous: P2B TUTORS DESKTOP SCREEN SPACING FIX (COMPLETE, `28bd81c`)

Bounded scope:

- legacy global screen override (preview/index.html lines 118-131) sets `.tutors-screen` padding `clamp(12px,1.6vh,20px) clamp(16px,2vw,32px)` and gap `clamp(10px,1.4vh,18px)` at >=860px; sandbox Tutors root uses inline 40px/24px,
- move Tutors root layout into `styles/tutors.css` with the >=860px rule (same pattern as Home/Reading).

Next required action:

Implement, build, compare Tutors with legacy at 1440/390, commit, push. Then `P2C WRITING AUDIT`.

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
3. Writing
4. Listening
5. Record
6. Speaking
7. Chat
8. Conversation
9. Global Header / navigation shell
10. Admin
11. Final parity and regression
12. Cutover readiness
13. Production cutover — requires explicit approval
14. Legacy retirement — only after successful cutover

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

`30–35%`

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
