# HangulNow React + Vite Migration Log

This is an append-only historical record of verified migration milestones.

Do not rewrite prior milestone facts unless correcting an objective error.
If correcting an entry, add a dated correction note rather than silently replacing history.

---

## Foundation / Security

### Booking Security

Status:

`COMPLETE`

Summary:

Booking authentication/authorization and role-scoped ownership rules were established before the React/Vite frontend migration.

Important preserved contracts include:

- verified Firebase identity where auth applies,
- no email fallback for student/tutor ownership,
- public tutor API privacy,
- booking state-machine restrictions.

---

## React/Vite Scaffold

Status:

`COMPLETE`

Summary:

Isolated React 18 + Vite sandbox created under `frontend/`.

Runtime:

`http://localhost:5173`

API proxy:

`/api -> http://localhost:3000`

Legacy runtime remained:

`http://localhost:3000`

---

## Intro Migration

Status:

`COMPLETE`

Result:

- Korean parity PASS
- English parity PASS
- desktop parity PASS
- mobile parity PASS
- animation parity PASS

No auth/API dependency.

---

## About Migration

Status:

`COMPLETE`

Result:

- Korean parity PASS
- English parity PASS
- desktop parity PASS
- mobile parity PASS

No auth/API dependency.

---

## Tutors Migration

Status:

`COMPLETE`

Architecture:

Static tutor data preserved.

Important behavior:

- 4 tutors: `jiwoo`, `minho`, `seoyeon`, `haneul`
- static filters preserved
- general Tutors page does not use public tutor API
- Video Class/booking functionality remains hidden
- selected tutor continues to target future Chat flow

Tutor-selection parity was separately aligned.

---

## P1J — Reading Safe Slice

Status:

`COMPLETE`

Commit:

`487744cf6965fab1bd4923005cec90247a92be06`

Commit message:

`refactor: migrate reading safe slice to React sandbox`

Included:

- static Korean passage,
- static English translation,
- translation toggle,
- glossary selection,
- selected-word highlight,
- glossary detail,
- base form,
- POS,
- English meaning,
- example,
- session-local saved toggle,
- static grammar,
- helper UI,
- responsive behavior.

Validation:

- Desktop 1440 PASS
- Mobile 390 PASS
- Browser PASS
- Build PASS
- Intro/About/Tutors regression PASS

Known behavior:

- saved vocabulary in React safe slice is session-local.
- no new persistence was added.

---

## P1L — Reading TTS

Status:

`COMPLETE`

Commit:

`11e18eff4c1897e72f28f26b6b657a4e96456e14`

Commit message:

`refactor: migrate reading tts slice to React sandbox`

Files changed:

- `frontend/src/App.jsx`
- `frontend/src/pages/ReadingPage.jsx`
- `frontend/src/styles/reading.css`

Included:

- full static passage TTS,
- word base-form TTS,
- Korean example TTS,
- `/api/tts`,
- `selectedTutorId`,
- loading/playing/stop UI,
- same-target cancellation,
- different-target cancellation,
- AbortController,
- Audio/object URL lifecycle,
- speechSynthesis Korean fallback,
- unmount cleanup,
- tutor-change cleanup,
- 520px responsive label behavior.

Runtime acceptance:

`PASS`

Verified:

- `POST /api/tts` HTTP 200
- actual audio response `audio/wav`
- full static passage text correct
- word surface `붐벼요` -> request `붐비다`
- example English translation excluded
- `jiwoo`, `minho`, `seoyeon`, `haneul` propagation PASS
- same-target cancel PASS
- different-target switch PASS
- loading request abort PASS
- abort did not incorrectly trigger fallback
- HTTP 503 fallback path to speechSynthesis PASS
- `ko-KR` PASS
- unmount cleanup PASS
- tutor-change cleanup PASS
- Desktop 1440 PASS
- Mobile 390 PASS
- 520/521 breakpoint PASS
- i18n label behavior PASS
- Intro/About/Tutors/Reading regression PASS
- legacy isolation PASS

Known out-of-scope:

- favicon 404

Known preserved legacy quirk:

- generated Reading full passage TTS may still use static `PARAS`.

---

## Next Planned Milestone

`P1M READING AI GENERATION AUDIT + MIGRATION PLAN`

Initial state:

`NOT_STARTED`

Purpose:

Source-first audit before migrating AI-generated Reading content.
