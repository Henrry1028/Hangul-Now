# HangulNow React + Vite Migration State

## State Metadata

State status:

`CONFIRMED`

Branch:

`migration/react-vite-modular`

Last verified migration-code checkpoint:

`01e84258129f7c614cc3ecf065ebab210c6b414f`

Checkpoint commit:

`refactor: migrate reading ai generation slice to React sandbox`

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

---

## 2. Latest Completed Milestone

Milestone:

`P1N READING AI GENERATION MIGRATION`

Status:

`COMPLETE`

Commit:

`01e84258129f7c614cc3ecf065ebab210c6b414f`

Commit message:

`refactor: migrate reading ai generation slice to React sandbox`

Runtime acceptance:

`PASS`

Verified:

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

`P1O`

Name:

`READING QUIZ + ACTIVITY/HISTORY AUDIT`

Status:

`NOT_STARTED`

Risk expectation:

`MEDIUM/HIGH`

Reason:

Reading Quiz selection mutates shared activity logs, XP, study dates, and time totals that later Home/Record migration will consume.

Next required action:

Perform source-first audit of static/generated Reading Quiz behavior and shared activity/history persistence before implementation.

---

## 4. Remaining Reading Work

- AI generation — COMPLETE
- generated passage integration — COMPLETE
- generated translation integration — COMPLETE
- generated glossary integration — COMPLETE
- generated grammar integration — COMPLETE
- Quiz interaction — NOT_STARTED
- XP/activity/history mutation — NOT_STARTED
- learning history integration — NOT_STARTED

---

## 5. Remaining Major Domains

Current expected high-level sequence:

1. Finish Reading
2. Home
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

`25–30%`

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
