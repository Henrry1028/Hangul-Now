# HangulNow React + Vite Migration State

## State Metadata

State status:

`CONFIRMED`

Branch:

`migration/react-vite-modular`

Last verified migration-code checkpoint:

`11e18eff4c1897e72f28f26b6b657a4e96456e14`

Checkpoint commit:

`refactor: migrate reading tts slice to React sandbox`

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

---

## 2. Latest Completed Milestone

Milestone:

`P1L READING TTS SLICE MIGRATION`

Status:

`COMPLETE`

Commit:

`11e18eff4c1897e72f28f26b6b657a4e96456e14`

Commit message:

`refactor: migrate reading tts slice to React sandbox`

Runtime acceptance:

`PASS`

Verified:

- build PASS,
- full passage TTS PASS,
- word base-form TTS PASS,
- example Korean-only TTS PASS,
- all tutor IDs propagated,
- same-target cancellation PASS,
- different-target cancellation PASS,
- loading-target switch PASS,
- speechSynthesis fallback path PASS,
- unmount cleanup PASS,
- tutor-change cleanup PASS,
- desktop PASS,
- mobile PASS,
- i18n behavior PASS,
- Intro/About/Tutors/Reading regression PASS,
- legacy isolation PASS.

Known out-of-scope issue:

- `favicon.ico` 404

Known legacy quirk preserved:

- generated Reading full-passage TTS may continue to read static `PARAS`.

---

## 3. Current Milestone

Milestone ID:

`P1N`

Name:

`READING AI GENERATION MIGRATION`

Status:

`NOT_STARTED`

Selected strategy:

`OPTION B`

Bounded scope:

- add Reading generation and shared level controls,
- preserve `/api/content/generate` request/response behavior,
- render generated title, subtitle, paragraphs, translations, glossary, and grammar,
- preserve guest learned-topic tracking through `hn-learned`,
- reset Reading selection/translation state after successful generation,
- preserve the legacy quirk that full-passage TTS continues to read the static passage,
- exclude generated Quiz rendering and all Quiz XP/activity mutation from this milestone.

Next required action:

Implement the bounded P1N scope in the React/Vite sandbox and validate success, failure, repeat-action, responsive, and regression paths.

---

## 4. Remaining Reading Work

- AI generation — AUDIT_COMPLETE
- generated passage integration — NOT_STARTED (P1N)
- generated translation integration — NOT_STARTED (P1N)
- generated glossary integration — NOT_STARTED (P1N)
- generated grammar integration — NOT_STARTED (P1N)
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
