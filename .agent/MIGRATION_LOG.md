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

---

## P1M — Reading AI Generation Audit

Status:

`COMPLETE`

Risk:

`MEDIUM/HIGH`

Selected strategy:

`OPTION B`

Findings:

- Legacy entry points are the `새로 생성` / `New material` button and the shared beginner/intermediate/advanced segmented control.
- The client sends `POST /api/content/generate` with `{ kind: "reading", level, userId, seenTopics }` and JSON content headers.
- The Reading response contains `topic`, `title`, `subtitle`, `paragraphs`, `glossary`, `questions`, `grammar`, and the server adds `level`.
- Generated paragraphs contain `{ text, en, words }`; the legacy client splits `text` by the listed words to create selectable glossary spans.
- Generated glossary items contain `{ word, pos, en, ex }` and map directly to the existing glossary card with the generated word as its base form.
- Generated grammar items contain `{ form, ko, example }` and fit the existing grammar card independently of Quiz.
- Generated Quiz questions are only consumed by the Quiz renderer and `recordActivity`; passage, translation, glossary, and grammar do not depend on Quiz state.
- AI generation itself does not mutate XP/activity logs. Successful Reading Quiz answers do.
- AI generation does mutate learned-topic history: signed-in requests are recorded server-side, and the legacy client also records the topic locally and posts `/api/learning/record`; guest mode records only `hn-learned` localStorage.
- The current React sandbox has no auth state, so P1N can preserve its actual guest contract with `userId: null` and local `seenTopics`; authenticated parity remains coupled to the later global auth shell.
- The legacy generator blocks repeated requests with shared `genLoading`, retries one network failure after 250 ms, and exposes `새 자료를 만들지 못했어요: <message>` on failure.
- It has no generation AbortController and does not cancel generation on page leave; P1N should not introduce new behavior beyond preventing stale React state updates.
- Successful Reading generation resets answers, selected word, and translation visibility. P1N needs only the selected-word and translation resets because Quiz is excluded.
- Level changes immediately trigger a new Reading generation except when the selected level is unchanged.
- The legacy full-passage TTS deliberately constructs text from static `PARAS`, even after generation. Preserve this quirk.
- The existing Vite `/api` proxy and platform APIs are sufficient; no backend change or new dependency is required.
- Existing responsive layout can accept the controls in the header with the same wrapping behavior used by the legacy page.

Excluded from P1N:

- generated Quiz UI,
- Reading Quiz answers,
- XP/activity log mutation,
- authenticated Firebase identity integration,
- backend contract or security changes.

Next exact milestone:

`P1N READING AI GENERATION MIGRATION`

---

## P1N — Reading AI Generation Migration

Status:

`COMPLETE`

Commit:

`01e84258129f7c614cc3ecf065ebab210c6b414f`

Commit message:

`refactor: migrate reading ai generation slice to React sandbox`

Included:

- Reading `새로 생성` / `New material` action,
- beginner/intermediate/advanced controls,
- `/api/content/generate` Reading contract,
- one network retry,
- loading and error UI,
- guest `hn-learned` topic persistence,
- generated title, subtitle, paragraphs, translations, glossary, and grammar,
- generated word selection/save/TTS compatibility,
- selection and translation reset after generation,
- static full-passage TTS legacy quirk preservation.

Validation:

- Node 20 standard `npm run build` PASS with Vite 5.4.21 and 40 modules,
- live Gemini Reading generation through Vite proxy PASS in 4.6 seconds,
- generated response rendering PASS,
- all three level payloads PASS,
- same-level no-op PASS,
- repeated-action blocking PASS,
- one network retry PASS,
- HTTP 503 and API error UI PASS,
- guest learned-topic persistence PASS,
- static full-passage TTS payload PASS,
- desktop 1440x900 PASS,
- mobile 390x844 PASS,
- 520/521 TTS breakpoint PASS,
- Intro/About/Tutors/Reading regression PASS,
- no runtime exceptions or Vite overlay,
- known `favicon.ico` 404 only.

Host toolchain note:

- Host Node 24 transforms all modules but exits silently during Vite 5 minification.
- Host unminified build and direct esbuild JS/CSS minification pass.
- Existing Node 20 verification image completes the standard minified build.

Excluded:

- generated Quiz UI,
- Reading Quiz answer state,
- XP/activity mutation,
- Firebase/auth shell integration.

Next planned milestone:

`P1O READING QUIZ + ACTIVITY/HISTORY AUDIT`

---

## P1O — Reading Quiz + Activity/History Audit

Status:

`COMPLETE`

Risk:

`MEDIUM/HIGH`

Selected strategy:

`QUIZ UI + APP-OWNED LEGACY ACTIVITY STATE`

Findings:

- Static and generated Reading questions share `{ q, en, opts, a }`; generated questions replace the two static defaults when present.
- The Quiz appears inside the passage card after all paragraphs and always renders the Korean question, its English line, and Korean options.
- Answer state is session-local in `rAns`; a successful new generation resets all Reading answers.
- Only the selected option changes border/background: green for correct, red for incorrect. Reading Quiz has no separate mark or feedback text and does not reveal the correct option after a wrong choice.
- Every option click records activity, including repeated clicks and changing an answer. Correct awards 20 XP; incorrect awards 10 XP. This repeat-award behavior is a preserved legacy quirk.
- Activity entries use type `reading`, module `독해 퀴즈`, icon `📖`, a Korean title/detail, and tag `정답 +20XP` or `독해` regardless of interface language.
- `recordActivity` prepends a log, caps the list at 150, adds the current local date, increments XP, and adds two session minutes.
- Logs, dates, and XP persist in `hn-activity-logs`, `hn-study-dates`, and `hn-user-xp`.
- `userTotalMins` is intentionally not persisted by the legacy app; it resets to the seeded 2538 minutes on reload.
- When stored logs are absent or empty, six legacy seed activity rows are loaded and the first real event is prepended to them.
- Activity state is local for signed-in and guest users alike. Reading Quiz does not call Firebase, `/api/learning/record`, or any backend endpoint.
- Reading Quiz does not mutate learned-topic history; only Reading generation does.
- Record consumes activity logs, XP, study dates, and session minutes. Its weekly bar dataset remains static and is not recomputed from Quiz logs.
- The current React `App.jsx` is the correct owner for cross-page session state. A bounded legacy-compatible activity helper can initialize and persist data without migrating Home/Record UI yet.
- The existing passage card and responsive flex wrapping can host the Quiz with no new dependency.

Next exact milestone:

`P1P READING QUIZ + ACTIVITY PERSISTENCE MIGRATION`
