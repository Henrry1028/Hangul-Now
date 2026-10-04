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

---

## P1P — Reading Quiz + Activity Persistence Migration

Status:

`COMPLETE`

Commit:

`fdd5946c29037512e8da860a6376719a6c2cc401`

Agent handoff:

- Codex started P1P (quiz data/labels, answer handler, `activityData.js`, App wiring) and hit its usage limit with a dirty tree.
- Claude Code validated the handoff (HEAD `50f82a6`, checkpoint ancestry OK, divergence `0 0`, dirty files all P1P scope), preserved the work, and finished it.

Implementation:

- Quiz UI rendered inside the passage card after paragraphs, matching legacy markup/styles (`.reading-quiz*` classes).
- Correct pick: `--accent-ink` border + `--accent-soft` bg; wrong pick: `--hot` + `--hot-soft`; only the selected option is styled; no reveal.
- App-owned activity state with legacy keys `hn-activity-logs`, `hn-study-dates`, `hn-user-xp`; minutes session-only.
- Fix during resume: Codex's handler persisted inside a `setState` updater, which React StrictMode double-invokes in dev; replaced with a ref-mirrored synchronous append+persist (matches legacy per-event write).

Validation:

- Node 20.20.2 container standard minified build PASS (host Node 24 silent-exit quirk reproduced, unchanged).
- static two-question rendering PASS,
- generated question replacement PASS (mocked `/api/content/generate`, 3 questions; live endpoint covered by P1N),
- correct/incorrect styling PASS (computed colors match legacy),
- repeat-answer award quirk PASS (+20 each repeat), answer change PASS (+10),
- generation answer reset PASS,
- exact activity payload PASS (type/module/icon/title/detail/xp/tag/time/date/ts),
- legacy seed logs PASS (6 seeds behind first real entry), 150-entry cap PASS,
- XP/date/log persistence across reload PASS; minutes not persisted PASS; answers reset on reload PASS,
- exactly one log per click under StrictMode PASS,
- `READING_TEXT.en.checkHeading` = legacy `CHECK YOUR UNDERSTANDING`; ko = `내용 확인`,
- desktop 1440 / mobile 390 computed-style comparison vs legacy: identical for heading, prompt, English line, option buttons, question blocks,
- Intro/About/Tutors/Reading regression at 1440/390 PASS, no horizontal overflow,
- no console/page errors except known `favicon.ico` 404.

Known differences (pre-existing, out of P1P scope):

- Legacy renders inside a 240px sidebar shell; sandbox has no shell yet (Phase 6).
- Sandbox `frontend/index.html` (added in `0ce8364`) loads IBM Plex Mono + Newsreader webfonts; legacy loads neither, so legacy Mono/Newsreader text uses system fallbacks (e.g. Mono Hangul label 14px tall in legacy vs 16px in sandbox). Scheduled as P1Q.

Next milestone:

`P1Q SANDBOX WEBFONT PARITY FIX`

---

## P1Q — Sandbox Webfont Parity Fix

Status:

`COMPLETE`

Commit:

`946a4ccf08dbbeff53cc18779a1d082715b5d4ac`

Finding:

- Legacy loads only Pretendard and Gowun Batang. Its 52 `'IBM Plex Mono'` and 30 `'Newsreader'` declarations render with system fallbacks.
- The sandbox scaffold (Intro migration `0ce8364`) additionally loaded both families from Google Fonts. This was unrecorded and changed glyph widths and line heights on every migrated page (for example, a Mono Hangul label was 14px tall in legacy vs 16px in the sandbox).

Fix:

- removed the two `<link>` tags from `frontend/index.html`, with no CSS changes.

Validation:

- Node 20 standard minified build PASS,
- every Mono/Newsreader leaf element on Intro/About/Tutors/Reading compared with legacy: identical at 390px. At 1440px heights match, and width/wrap differences come only from legacy's 240px sidebar shell (Phase 6),
- `document.fonts` families: Pretendard, Gowun Batang (same as legacy),
- no console/page errors.

Next milestone:

`P2A HOME AUDIT`

---

## P2A — Home Audit + Migration

Status:

`COMPLETE`

Commit:

`3e125c9741eabda803d5a7c509de5336d82374e8`

Risk:

`LOW`. Audit and migration were done in one milestone per the risk policy.

Audit findings:

- Legacy template: `preview/index.html` 1438-1578 (`02 Today`). Data comes from `renderVals` (plan 6723-6729, week 6730, nav 7378), labels from 3958-3962 (en) and 4026-4030 (ko), and `planMeta` from 7759.
- Content is static except for the tutor-dependent chat plan row (`Reply to {tutor.en}` / `{tutor.ko}에게 답장하기`), the `continueChat` label (`dynamicT`, selected tutor name), `showRomanization` (prop, default true), and `lastJiwooTime` (formatted last time of the Jiwoo chat seed, `오전 9:17`).
- No API calls, no persistence reads or writes, and no auth reads. Tutor entry points call `selectTutor` (state, `hn-tutor`, a Firestore write only for signed-in users, then Chat). This maps to the established sandbox pattern `onSelectTutor(id)` + `onNavigate('chat')`.
- Preserved quirk: the "continue chat" card labels the selected tutor but shows a Jiwoo avatar and always opens Jiwoo.
- Home does not consume activity logs, XP, or study dates. The streak (12), week, and level (64%) are static.

Implementation:

- `HomePage.jsx`, `homeData.js`, `home.css`, and an App `home` route (the Intro "level" CTA now reaches Home).
- Hub character images keep inline transforms with mouseover/mouseout handlers. The global `img[src*="캐릭터_"]` rule (a legacy quirk where the first selector lacks `:hover`) would otherwise force `translateY(-5px) scale(1.03)`.
- Root layout lives in `.home-screen` with the legacy >=860px padding/gap override.
- Max-width stays at 1120 until the shell migration (legacy `max-width:1400px !important` only matters inside its sidebar shell).

Validation:

- Node 20 standard minified build PASS,
- at 390px all 72 leaf elements are identical to legacy (box + computed style),
- at 1440px and 1180px all computed styles match. Position and wrap differences come only from legacy's 240px sidebar shell (content width 1185/925 vs 1120),
- hover transforms PASS,
- navigation targets match legacy for all 11 entry points, and the Reading targets open Reading,
- Intro/About/Tutors/Reading (+ Quiz) regression PASS, no console/page errors.

Dev-only note: once, Vite cached an empty `home.css` after a non-atomic shell rewrite. Touching the file fixed it. Not a code issue.

Discovered (pre-existing, out of P2A scope):

- Tutors lacks the legacy >=860px screen padding/gap override (sandbox 40px/24px vs legacy 14.4px 28.8px / 12.6px at 1440). Scheduled as P2B.
- Legacy `go()` calls `window.scrollTo(0,0)` on navigation; the sandbox `handleNavigate` does not. This is shell/navigation behavior, deferred to Phase 6.

Next milestone:

`P2B TUTORS DESKTOP SCREEN SPACING FIX`

---

## P2B — Tutors Desktop Screen Spacing Fix

Status:

`COMPLETE`

Commit:

`28bd81c5ac1088f5ae3dd8089aff4906071238fe`

Finding:

- Legacy applies a global override to all learning screens at >=860px: padding `clamp(12px,1.6vh,20px) clamp(16px,2vw,32px)`, gap `clamp(10px,1.4vh,18px)`.
- Reading and Home port it. Sandbox Tutors kept an inline 40px/24px.

Fix:

- moved the Tutors root layout into `styles/tutors.css` with the legacy media rule.

Validation:

- Node 20 build PASS,
- 390px: all 49 elements identical to legacy,
- 1440px: padding/gap/root height and every element top/height identical, with x-offsets only from the legacy sidebar shell,
- 860px: legacy reflows inside its 605px sidebar-constrained area (shell, Phase 6),
- Intro/About/Home/Tutors/Reading regression PASS, no errors.

Next milestone:

`P2C WRITING AUDIT`

---

## P2C-FIX — Reading Desktop Screen Gap

Status: `COMPLETE` — commit `1853fa61ea4fe5bad4ba152d88f37a61679525c5`.

- Legacy's >=860px block ends with `.reading-screen { gap: 12px !important }`, which overrides the shared clamp gap.
- Sandbox `reading.css` used the clamp (12.6px at 900px height).
- Fix: `gap: 12px` in the Reading >=860px rule. Root gap/padding/scrollHeight now identical to legacy at 1440x900, 1440x700, and 390.

---

## P2C — Writing Audit

Status:

`COMPLETE`

Risk:

`MEDIUM/HIGH`, because of learned-history and XP mutation, global keyboard listeners, auto-advance timers, and the imperative SVG keyboard.

Source map (`preview/index.html`):

- template 1866-2143 (`07 Writing`): tabs, level bar, target card, word progress, compose canvas + Jeongie celebration, jamo panel, SVG keyboard card + Windows/macOS guide, sentence tab,
- CSS 86-104 (keyboard/hand/celebration), and >=860px no-scroll layout 134-454 (all `!important`),
- data 3549 (`JEONG_POSES`), 3668-3727 (`JL`/`JV`/`JT_EXTRA`/`TARGETS_BY_LEVEL`/`WORDS_BY_LEVEL`/`JT_ALL`/`decompSyl`/`jamoHint`), 3729-3824 (`KB_SVG_ROWS`/`KB_MAP` geometry), 3839-3916 (`JAMO_KEY_MAP`/`JAMO_SEQ`/`HAND_IMAGE`/`buildHandImage`), 4079 (`getHangulPron`),
- logic 5454-5500 (key handlers, backspace, reset), 5620-5645 (`hn-learned` store), 5723-5901 (ordering, target, complete/celebrate, next/advance, input, `nextStroke`, `handleVirtualKeyName`), 5902-6005 (SVG keyboard via `innerHTML` + `window.__hnVirtualKey`), 6006-6014 (auto-advance: 1800ms celebrating / 240ms mid-word),
- render data 6819-6940, bindings 7429-7481, initial state 4158-4183, labels 3969-3973 (en) and 4037-4041 (ko).

Findings:

- No AI/API in Writing. The sentence tab's "Get feedback" shows static corrections and records an activity (`문장 쓰기`, 30 XP).
- Syllable completion records learned `syllable` (`hn-learned`) and activity (`자모 쓰기`, 15 XP). The last syllable of a word records learned `word` and activity (`단어 조립`, 25 XP). The signed-in `/api/learning/record` POST is not applicable in the guest-only sandbox (same as P1N).
- Target order comes from `hn-learned` + a date-seeded shuffle, recomputed every render. Learned items drop out of the fresh list; review mode shows only learned items, oldest first.
- Global keydown/keyup: Shift state, Backspace (stepwise), Enter (next), Escape (reset), and other keys go to `handleVirtualKeyName` (expected key → stage value; wrong key → 500ms error flash). Inputs and textareas are ignored. Ctrl+B is the shell sidebar toggle (Phase 6).
- Jamo panel buttons set L/V/T directly with no ordering; the visible row set depends on level (`j[2] <= jLevel`).
- Dead bindings: `speakTarget`/`speakSentence`, `fingerStyles`, and `keyboardRows` are not used by the template.
- Legacy keeps Writing state at app level, so progress, tab, level, and sentence text survive navigation.

Strategy (P2D, one milestone for layout parity):

- `writingData.js` (verbatim data/helpers), shared `learnedData.js` (move the existing Reading helpers unchanged), `WritingPage.jsx`, `writing.css` (legacy rules copied incl. `!important`), and an App-owned writing state + `writing` route.
- SVG keyboard as JSX with the same geometry, attributes, and classes. `onClick` replaces the `window.__hnVirtualKey` bridge.
- Copy 6 assets byte-identically: `hand_realistic_{left,right}_v2.png`, `정이_{축하,붓글씨,공부,장구}.png`.
- Shell-dependent items stay deferred (legacy `max-width:1400px` / `height:100%` of the main viewport).

Next milestone:

`P2D WRITING MIGRATION`

---

## P2D — Writing Migration

Status:

`COMPLETE`

Commit:

`e562a11c922e2af0d253d844710e3f9846ff22af`

Implementation:

- `WritingPage.jsx` ports the legacy logic 1:1: ordering, target, complete/celebrate, `nextStroke`, `handleVirtualKeyName`, advance, and auto-advance (1800/240ms).
- `writingData.js` holds the legacy data and helpers, extracted verbatim by script. `writing.css` is the legacy CSS copied verbatim, `!important` included.
- The SVG keyboard is JSX with identical geometry, attributes, and classes. `onClick` replaces the `window.__hnVirtualKey` bridge.
- Keyboard listeners attach only while Writing is mounted and are removed on unmount. Auto-advance clears on unmount.
- Writing state is App-owned (`INITIAL_WRITING_STATE`) so it survives navigation like legacy.
- Learned helpers moved unchanged from ReadingPage into the shared `learnedData.js`.
- Six assets were copied byte-identically.

Parity findings preserved:

- Legacy wraps every `{{ }}` interpolation in `<span class="sc-interp">`, and the desktop Writing CSS hits these through descendant selectors. On desktop, the title renders at 11px with .08em letter-spacing, the jamo message/meaning at 11.5px, and word-progress syllables get extra padding. The sandbox reproduces this with `Interp` wrapper spans.
- `.writing-screen` desktop `height:100%` resolves against the legacy shell main viewport. The sandbox emulates it with `height: calc(100vh - 60px) !important` inside the >=860px block. Revisit in Phase 6.
- Dead legacy code is not ported: `inputJamo`, the `speakTarget`/`speakSentence` bindings, `fingerStyles`, `keyboardRows`, `HOME_TIPS`, `jLv`, `TARGETS`.

Validation:

- Node 20 build PASS,
- DOM/style comparison vs legacy: 359/359 elements and 0 computed-style differences at 390x844, 1440x900, and 1920x1080. All boxes identical at 390. On desktop, every vertical position/height is identical, and widths differ only for grid-width-dependent elements (legacy shell content 1200/1400 vs sandbox 1120),
- two scripted behavior scenarios run on both apps were identical at every checkpoint: wrong-key flash and recovery; guided physical typing; virtual key clicks; Enter/Escape/Backspace; celebration and 1800ms auto-advance; level 2 Shift highlights and two-stroke compound batchim (ㄺ); word mode with mid-word advance; activity payloads (15/25/30 XP) and XP totals; `hn-learned` syllable/word records; review mode; order-free jamo panel picks; hand-shadow toggle; Windows/macOS guide; sentence count, typing, and feedback,
- regression PASS: Intro/About/Home (Home writing card → Writing)/Tutors/Reading (mocked generation still records `hn-learned` reading), no console/page errors.

Known cross-cutting item (deferred to Phase 6 shell):

- Legacy keeps Reading state (`genReading`, `rAns`, `wordKey`, `saved`, `rTrAll`) at app level. The sandbox ReadingPage keeps it page-local. It is unobservable until the shell provides navigation away from Reading, at which point it should be lifted to App like Writing.

Next milestone:

`P2E LISTENING AUDIT`

---

## P2E — Listening Audit

Status:

`COMPLETE`

Risk:

`MEDIUM/HIGH`: audio lifecycle, external TTS, translation API, AI generation, XP, and globals shared with other domains.

Source map (`preview/index.html`):

- template 1715-1775 (`05 Listening`),
- CSS 60-68 (player/wave/progress/control + `listeningWaveLive`) and >=860px 468-479,
- data 3591-3605 (`SCRIPT`, `LQ`, `DICTATIONS`), labels 3965-3966 / 4033-4034,
- `toggleTranslation` 5505-5553 (`/api/translate`, shared with Conversation `cvTrans`), `generateMaterial` 5557-5588 (`/api/content/generate`, shared with Reading/Speaking), `setStudyLevel` 5590, `submitDictationAt` 5595-5617,
- audio 6499-6623: `/api/tts` POST `{text, segments, tutorId}` → blob; `X-TTS-Provider` label; AbortController; device `speechSynthesis` fallback with an estimated duration and a 200ms progress timer; pause/resume for both paths; speed via `playbackRate`/`rate`,
- render 6733-6797 (sources, 48-bar wave, questions, dictation cards), bindings 7391-7408 and 7687-7712.

Findings:

- Generated material replaces the script (`who` from whoEn/whoKo), questions, and dictations. Generated dictations are merged with the static ones, deduplicated by sentence, and capped at 3.
- Quiz: every click records activity (20/10 XP, repeat-award like Reading). Once a question is answered, the correct option is revealed (green + `정답`), and a wrong pick shows `다시 해 봐요`.
- Dictation: Enter (not while IME is composing) submits the NFC/whitespace-normalized value. The activity payload is 25/10 XP. Focus moves to the next input.
- Navigating away (`go`) or selecting a tutor stops and resets listening audio.
- Shared legacy globals: `studyLevel` (Reading/Listening/Speaking), `trOn` + `studyTrans` + `translationError` (Listening/Speaking/Conversation), plus single-flight `genLoading` and global `genError`.
- Generation results land in app state even when the user has navigated away.

Strategy (P2F):

- `ListeningPage.jsx`, `listeningData.js`, `listening.css`, and an App `listening` route.
- App-owned `listeningState` (generated material, answers, dictation inputs/answers, script toggle, speed, playback status/progress). Audio objects live in page refs and are released and reset on unmount (legacy `go()` behavior).
- Lift `studyLevel` to App and share it with Reading (ReadingPage receives it as props).
- App-owned translation state (`trOn`, `studyTrans`, `translationError`). The Conversation `cvTrans` branch is added when Conversation migrates.
- Generation writes to App state so results survive navigation.

Next milestone:

`P2F LISTENING MIGRATION`

---

## P2F — Listening Migration

Status:

`COMPLETE`

Commit:

`1b8df9fb47463a66b9e749c780495ddbdd9134e1`

Implementation:

- `ListeningPage.jsx` ports the legacy logic 1:1: `/api/tts` playback with AbortController, object URL, speed, progress, pause/resume, and device speechSynthesis fallback; `toggleTranslation` (Listening branch); `generateMaterial('listening')` with one network retry; `submitDictationAt`; quiz.
- `listeningData.js`: `SCRIPT`/`LQ`/`DICTATIONS` verbatim, plus labels and `INITIAL_LISTENING_STATE`. `listening.css` is legacy 60-68 + 468-479 verbatim, plus the shared >=860px screen override.
- App-owned `listeningState`, `translationState` (`trOn`, `studyTrans`, `translationError`, `cvTrans`, `cvTransLoading`), and `studyLevel` (now shared with Reading through props). The App merge-updaters accept functional patches, so async audio/fetch callbacks merge correctly.
- Playback is released and reset on unmount (legacy `go()`).

Validation:

- Node 20 build PASS (Vite >500kB chunk advisory warning only),
- 390: 111/111 elements identical to legacy (boxes + styles). 1440: styles/heights identical, except the third dictation card wraps differently because the legacy card is 321px vs 295px from the shell width,
- mocked scenario run on both apps was identical (whitespace-insensitive text): quiz wrong→right reveal and marks, dictation wrong/correct/NFC+whitespace normalization, focus advance, activity payloads (10/20/25 XP), script toggle, static translation with 0 `/api/translate` calls, speed buttons, `/api/tts` request body (text + 5 segments + tutorId), multi-speaker provider label, end/replay, TTS 500 → device fallback, level change → generation (`level: intermediate`) with replaced script/questions and merged dictations, translation of generated lines (7 lines, identical order),
- wait-based pause/resume test identical (one TTS request, resume without refetch, replay at 100%),
- live `/api/tts` from the sandbox: 200, `Gemini-gemini-3.8-flash-tts-MultiSpeaker`, multi-speaker, playback + pause PASS,
- regression PASS: Intro/About/Tutors/Home/Writing (physical key)/Reading (shared level → generation intermediate), no console/page errors.

Not observable until the Phase 6 shell exists:

- stop-on-leave, and the shared `studyLevel`/translation across pages (the sandbox has no navigation out of Listening).
- Conversation's `cvTrans` branch of `toggleTranslation` is added when Conversation migrates.

Next milestone:

`P2G RECORD AUDIT`

---

## P2G — Record Audit

Status:

`COMPLETE`

Risk:

`MEDIUM`: consumes App activity state, uses device speech + timers, has a blocking `alert()`. No backend API.

Source map (`preview/index.html`):

- template 2476-2987 (`09 My progress`): header + 3-tab segment (`activity` = weekly audio review [default], `analytics` = calendar + weekly bars + live-conversation card, `ranking` = level/XP, daily quests, badges, leaderboard), plus 5 stat cards,
- CSS 489-~532 (`study-cal-*`, `cal-flame-dot`, `live-pulse`, `rank-row`, `quest-item`, `badge-card`) and the shared >=860px screen override,
- data `COLORS`/`WEEK`/`WD`/`MON` 3929-3933, `WEEKLY_REVIEW_SCRIPT_KO` 4109-4120, labels `recH1`/`weekH` 4001/4069,
- audio review 4847-4966 (speechSynthesis of the script + a 1s/speed timer, pause, seek ±10, click-to-seek, speed cycle 1.0→1.25→1.5→2.0→0.8 with restart, like/dislike toggle, script accordion, fake 1.5s regenerate + `alert`, Blob `.txt` download),
- render 7019-7157 (weekly bars, live-conversation constants, calendar 35/42 cells from `studyDates`, fixed today `2026-09-27`, leaderboards, levels from `userXp` /500, quests, badges), stats 7506-7518, bindings 7718-7791, initial state 4186-4208.

Findings:

- The template does not render the activity log list (`filteredLogs`/`recTabs` are dead bindings). Stats use `activityLogs.length`, `userXp`, `userTotalMins`, and `userStreak` (12).
- The leaderboard "me" row uses the guest name (`게스트`/`Guest`) when signed out. The rank toggle buttons keep static styles regardless of the selected tab (quirk).
- `animation: fadeIn` references an undefined keyframe (no-op quirk).
- Calendar navigation is local. The date-pick briefing is static text; "이날 복습하기" → chat and "회화 시작" → speaking (navigation only).
- Audio review keeps playing (speech + timer) after navigating away, because legacy state and timers are app-level.

Strategy (P2H):

- `recordData.js` (verbatim constants + script + labels), `RecordPage.jsx`, `record.css` (verbatim CSS), and an App `record` route.
- App-owned `recordState` (tab, calendar, rank tab), plus the audio-review state and controller (timer/speech refs in App), so playback survives navigation like legacy.
- Activity values come from the App activity state (`studyDates`, `userXp`, `activityLogs`, `userTotalMins`).

Next milestone:

`P2H RECORD MIGRATION`

---

## P2H — Record Migration

Status:

`COMPLETE`

Commit:

`7e947f0cd4b4c8b03bc81c769cc58b7e5822ba6c`

Implementation:

- `RecordPage.jsx`, `recordData.js` (`COLORS`/`WEEK`/`DAYS`/`WD`/`MON`/`WEEKLY_REVIEW_SCRIPT_KO` verbatim + labels + `INITIAL_RECORD_STATE`), `record.css` (legacy 489-529 verbatim + the shared >=860px override), `hooks/useAudioReview.js`.
- App-owned `recordState` and audio-review controller (timer/speech at App level), so playback continues after leaving Record (legacy).
- Stats/levels read the App activity state (`activityLogs`, `userXp`, `userTotalMins`, `studyDates`).

Legacy quirks reproduced (verified in the legacy DOM):

- The legacy template engine renders `{{ a ? b : c }}` as empty: calendar cells never get `is-other-month`/`is-studied`/`is-today`/`is-selected`, the date-briefing text is empty, and the play button has no title. 🔥 flames (`sc-if`) do render.
- The selected-date weekday indexes the Monday-first `DAYS` with `getDay()` (e.g. 9/27 → 월, 9/9 → 목).
- Rank toggle styles are static. Regenerate keeps any running timer/speech and shows a blocking `alert()`. `fadeIn` keyframe is undefined.

Validation:

- Node 20 build PASS,
- all three tabs: 390 → 43/178/104 elements identical to legacy (boxes + styles). 1440 → styles/heights/vertical positions identical, widths differ only by shell width,
- behavior identical to legacy: calendar select + prev/next month, rank toggle, ±10s seek, speed cycle, like, script accordion, download filename `26-09-27 Hangul Weekly Review_Script.txt`, play/pause timing incl. 1.25× restart (00:00 → 00:02 → pause 00:02 → 00:04),
- regenerate: time reset after 1.5s, alert message identical,
- regression PASS across Intro/About/Tutors/Home/Listening (dictation XP)/Writing/Reading/Record, no console/page errors.

Phase 4 (Home, Writing, Listening, Record): COMPLETE.

Next milestone:

`P3A SPEAKING AUDIT` (Phase 5 high-coupling domains: Speaking, Chat, Conversation)

---

## P3A — Speaking Audit

Status:

`COMPLETE`

Risk:

`MEDIUM` (TTS, AI generation, shared globals). Recording uses no microphone in legacy, only a simulated state machine.

Source map (`preview/index.html`):

- template 2145-2175 (`08 Speaking`), CSS keyframes `pulse` (59), `.speaking-screen` global `max-width:1400px !important` (118), and the >=860px override `max-width:920px !important` (484),
- data `SENTS` (3918+), labels 3974 / 4042 (the label object defines `sEyebrow` twice; the later `SPEAKING · SHADOWING` / `말하기 · 따라 말하기` wins),
- render 6940-6944 (`SENTS_SRC` from `genSpeaking.sentences` with fixed score 88; syllables with weak indices marked red once done),
- bindings 7485-7505: `sIdxLabel` uses static `SENTS.length` even for generated material (quirk); `toggleRec` idle/done → rec → done, and done records activity `발음 코칭` +25 XP; `nextSent`; `speakNative` → `playTutorSpeech(sent.text, 'speaking-native:{tutor}:{text}')`,
- `playTutorSpeech`/`stopTutorSpeech`/`speakWithDeviceVoice` 6416-6497 (`/api/tts` `{text, tutorId}` → device voice with per-tutor rate/pitch on failure; same key toggles stop),
- shared: `studyLevel`, `trOn`/`toggleTranslation` (a single global function that fetches missing Listening/Conversation translations no matter which page triggers it), `generateMaterial('speaking')` → `{genSpeaking, sIdx:0, rec:'idle'}`, `tipFrom` = `{tutor} 튜터의 팁`.

Strategy (P3B):

- `SpeakingPage.jsx`, `speakingData.js` (verbatim `SENTS` + labels + initial state), `speaking.css`, and an App `speaking` route with App-owned `speakingState`.
- Move `toggleTranslation` out of ListeningPage into a shared App hook (`useTranslationToggle`) so Speaking and Listening invoke the same legacy function.
- Tutor TTS in a small `useTutorSpeech` hook, a 1:1 port of the legacy tutor speech used by Speaking. Reading keeps its verified P1 implementation; consolidation is a post-migration cleanup.

Next milestone:

`P3B SPEAKING MIGRATION`

---

## P3B — Speaking Migration

Status:

`COMPLETE`

Commit:

`e250f9a651544d7e5f041b7a7c02580afe8918d8`

Implementation:

- `SpeakingPage.jsx`, `speakingData.js` (`SENTS` verbatim, labels, `INITIAL_SPEAKING_STATE`), `speaking.css` (`pulse` keyframes, shared >=860px override + `max-width: 920px`), App-owned `speakingState`.
- `hooks/useTranslationToggle.js`: the legacy app-wide `toggleTranslation` (Listening branch), now shared by Listening and Speaking. ListeningPage receives it as a prop.
- `hooks/useTutorSpeech.js`: 1:1 legacy `playTutorSpeech`/`stopTutorSpeech`/`speakWithDeviceVoice` (no visual state). Stops on unmount; legacy keeps short tutor speech playing after navigation (minor, accepted).

Validation:

- Node 20 build PASS,
- idle and done states identical to legacy at 390 (25/31 elements) and at 1440 (the Speaking max-width 920 sits inside the legacy shell, so even positions match),
- behavior identical: record → stop activity payload (`발음 코칭`, 25 XP, `발음 86점`), native TTS body `{text, tutorId}`, translation line, next sentence, level → generation (`advanced`) with replaced sentence, weak marks, generated tip, and `{tutor} 튜터의 팁`,
- Listening translation regression via the shared hook: 0 fetches for static content, generated lines fetched in legacy order,
- no console/page errors.

Next milestone:

`P3C CHAT AUDIT`

---

## P3C — Chat Audit

Status:

`COMPLETE`

Risk:

`HIGH`: live AI endpoints, async reply/correction/translation races, cross-page tutor selection.

Source map (`preview/index.html`):

- template 1626-1712 (`04 Chat`): tutor header (avatar, gender badge, online, role/pace, change tutor, all-translation toggle), translation error bar, message list (date chips, tutor/me bubbles, first-of-group avatar/name/radius, per-message tap-to-translate, pending "1", correction loading/error, correction card), typing dots, quick replies, voice button (no handler), Enter-to-send input,
- data `TODAY` 3556, `SEED` 3558-3570, `REPLIES` (mock), `QUICK` 3584, labels 3941/3964/4002 (en) and 4009/4032/4070 (ko),
- handlers: `toggleChatTranslations` 6157, `translateMissingChatMessages` 6163-6230 (batches of 20, per-tutor in-flight guard, strict response validation, chained retry for new replies), `requestInlineCorrection` 6231-6276 (`/api/correction` `{sentence, userId}`, 30s abort, fix card from `has_error`/`wrong_span`/`fixed`/`explanation_*`), `sendText` 6277-6414 (activity 15 XP on send; pending user message; typing; mock mode via `?mock=true`/`hn_mock`; `/api/chat` `{tutorId, message, history(last 8)}` 30s abort; reply → activity 20 XP + tutor message with translation; failure → fallback tutor text),
- render 6678-6701 (grouping/radius/translation flags), bindings 7384-7390 (`chatH` = calc(100vh - 69px) wide / calc(100vh - 122px) narrow; send button colors),
- `selectTutor` 6027-6052: clears unread, resets the chat translation error, translates the new tutor if `trAll`, saves `hn-tutor`, writes Firestore when signed in, and navigates to chat. Auto-scroll to the bottom on msgs/page/tutor/typing change (6015).

Findings:

- Messages are in-memory only (SEED). There is no local or Firestore message persistence.
- Replies, corrections, and translations land in app state even if the user navigates away.

Strategy (P3D):

- `chatData.js` (verbatim `TODAY`/`SEED`/`REPLIES`/`QUICK` + labels + initial chat state), `ChatPage.jsx`, `chat.css` (`dot` keyframes, `chatH` via the >=860px media query), and `hooks/useChat.js` at App level (send/correction/translation logic with functional state merges).
- App `chat` route. `handleSelectTutor` clears unread and triggers translation like legacy.
- Deferred to Phase 6 shell: `hn-tutor` persistence/initial load and the Firestore tutor write (signed-in only).

Next milestone:

`P3D CHAT MIGRATION`

---

## P3D — Chat Migration

Status:

`COMPLETE`

Commit:

`423c3abec2c04881c1ee827a5834e7e446660dcc`

Implementation:

- `ChatPage.jsx`, `chatData.js` (`TODAY`/`SEED`/`REPLIES`/`QUICK` verbatim, labels, `fmtDate`, `nowHM`, `createInitialChatState`), `chat.css` (`dot` keyframes + height), and `hooks/useChat.js` (App-level controller: `sendText` incl. mock mode, `requestInlineCorrection`, `translateMissingChatMessages` with batches/guard/chained retry, `toggleChatTranslations`, per-message toggle, `onTutorSelected`).
- `handleSelectTutor` now applies legacy `selectTutor`'s chat effects (clear unread, reset error, translate if `trAll`).

Legacy quirks preserved:

- Chat activity titles always use "지우" (raw TUTORS entries have no `name`).
- Correction `userId` is null (guest sandbox; signed-in uid arrives with the shell/auth migration).

Parity:

- Legacy `chatH` is nominally calc(100vh-122px/69px), but its `flex:1` inside the legacy shell yields an effective 100vh-127.5px (mobile) / 100vh-60px (>=860px). The sandbox emulates the effective height (revisit in Phase 6).
- Identical boxes + styles for all 46 elements at 390x844, 390x700, 1440x900 (heights/vertical; width from shell), and 1180x700.

Behavior validation (mocked APIs, both apps identical):

- send-button colors, pending "1" + typing, correction card from `/api/correction`, reply + activities (15/20 XP), quick reply, all-translation fetch of untranslated replies only, `/api/chat` failure fallback text, identical request bodies (history of last 8 non-pending).

Live:

- `/api/correction` 200 with real fix card. `/api/chat` reply from 박민호 after tutor switch via Tutors. XP 2840 → 2875.

Regression: all routes at 1440/390, no errors.

Dev note: twice, Vite cached an empty CSS file after a non-atomic shell heredoc rewrite. Write CSS with the editor tools instead.

Next milestone:

`P3E CONVERSATION AUDIT`

---

## P3E — Conversation Audit

Status:

`COMPLETE`

Risk:

`HIGH`: microphone, WebSocket realtime, Web Audio PCM pipeline, AI review jobs, PDF, local history.

Source map (`preview/index.html`):

- template 2177-2472 (`08b Conversation`): header with mode (tutor/roleplay) + level segments, scenario chips (roleplay), level description, status bar (dot, avatar, status, sub, 10-minute timer in tutor mode, mic meter, mute, stop/start), error, `.cv-layout-grid` (transcript with turns/partials/translation; lesson-notes cards, essential expressions, audio-review status/player; roleplay critical-hint cards), and 7-day history (groups, report PDF/transcript download/delete),
- CSS `.cv-layout-grid` 608-618, `pulse` keyframes 59, and the shared screen override,
- labels 3975-4000 (en) and 4043-4068 (ko); initial state 4140-4160; bindings 7519-7681,
- logic 4979-5450: `pickLessonInterest` (profile interests + `hn-learned` topic), `getConversationUserId` (`hn-guest-id`), tutor clock (600s, wrap-up message at <=60s, auto-stop at 0), `completeTutorLesson` → `/api/session/complete-and-review` (+ `pollTutorReview` on the status URL every 1s), `startConversation` (getUserMedia 16k mono → WebSocket `/api/live`, `start` message with tutor/level/mode/scenario/user/review/nickname/nationality/interests/feedbackLanguage/lessonTopic), `startMicCapture` (ScriptProcessor 4096 → Int16 PCM base64 `audio` messages + level meter; respects mute), `onLiveMessage` (ready/error/audio/card/hint/finalize/interrupted/transcript/turnComplete/closed; 2.6s debounce `flushTurn`), `playLiveAudio` (24k PCM queue), `stopConversation` (stop message, teardown, flush partials, save history, tutor-mode review job, `hn-learned` topic records, activity `실시간 회화` XP 50+5/turn), history `hn-conversations` (7-day prune, max 60), `downloadRecord` (.txt), `requestReport` → `/api/session/report` (base64 PDF download).
- `toggleTranslation`'s Conversation branch: when turned on, it translates transcript lines missing from `cvTrans`.

Findings:

- A conversation keeps running when navigating to other screens; only unmount stops it. The controller therefore belongs at App level.
- Guest defaults: nickname `Learner`, no profile interests/nationality (the onboarding/profile shell is Phase 6), `userId` = `hn-guest-id`.
- Test strategy: inject an identical fake `getUserMedia` stream and a scripted fake `WebSocket` into both apps and compare the resulting UI/state/requests. Mock `/api/session/*`.

Strategy (P3F):

- `conversationData.js` (labels, scenario/level maps, initial state, history storage helpers), `ConversationPage.jsx`, `conversation.css`, and `hooks/useConversation.js` (App-level controller ported 1:1).
- Extend `useTranslationToggle` with the `cvTrans` branch. App `conversation` route.

Next milestone:

`P3F CONVERSATION MIGRATION`

---

## P3F — Conversation Migration

Status:

`COMPLETE`

Commit:

`15594c1e56b9295c85f8714d2101760a5ba3bc45`

Implementation:

- `ConversationPage.jsx`, `conversationData.js` (labels, constants, history storage, initial state), `conversation.css` (`.cv-layout-grid`, `pulse`, shared override), and `hooks/useConversation.js` (App-level 1:1 port of the legacy live controller, with a synchronous state ref for message handlers).
- `useTranslationToggle` gains the Conversation `cvTrans` branch (now complete per legacy).
- `vite.config.js`: dev proxy `ws: true` for `/api/live` (sandbox dev only).
- Dev-only `window.__hnSandboxNavigate` (guarded by `import.meta.env.DEV`; verified absent from the production bundle) to open screens that legacy reaches only via its sidebar, until the shell is migrated.
- Legacy app-wide `reviewMode` (Writing's toggle) is passed to Conversation.

Guest-mode notes (deferred to the shell/auth milestone): nickname `Learner`, no nationality/interests (`pickLessonInterest` → null), report `userId` null, history `userName` ''.

Validation:

- true production build PASS (see the correction below),
- idle parity: 390 tutor/roleplay identical (63/70 elements). 1440: 3 paragraphs wrap differently from the shell content width only,
- scripted sessions with identical fake mic + fake `/api/live` WebSocket on both apps, all identical:
  - tutor mode: start payload, mic audio frames, ready/live, transcript partials + 2.6s flush, lesson card, mute, cvTrans translation, stop/close, review job + polling, history record, activity (60 XP), learned topic, PDF report request/download, transcript download name, delete,
  - roleplay: scenario payload, mode lock while connecting, hint card + English rule, no review job, activity 55 XP, scenario topic, mid-session `finalize` → review job, server `error` message state,
- live `/api/live` through the Vite WS proxy: Gemini Live greeted "안녕하세요 Learner 님! …", and stop saved the turn,
- regression across all 11 sandbox screens, no errors.

Correction (validation accuracy):

- Container builds in P1P through P3E ran `vite build` with `NODE_ENV=development` (inherited from the dev-dependency install). Those were minified builds but not true production-mode builds.
- From P3F on, verification runs `npm ci --include=dev` and then `NODE_ENV=production vite build`. The P3F production build covers all migrated code to date and PASSES (389 kB JS, React production, dev hook stripped).

Phase 5 (Speaking, Chat, Conversation): COMPLETE.

Next milestone:

`P4A GLOBAL SHELL AUDIT`

---

## P4A — Global Shell Audit

Status:

`COMPLETE`

Risk:

`HIGH`: wraps every screen, owns the scroll container, auth/Firebase/profile, admin flag.

Source map (`preview/index.html`):

- markup 622-1186: `app-root-shell` (100dvh flex column) → `marketing-header` (logo light/dark → intro; nav How/Tutors/[admin: Video Class]/About; EN|한국어 segment; theme toggle; [admin: Admin console]; login (guest) / CTA → tutors) → onboarding modal (signed-in, profile) → Video Class modals (admin preview) → `app-body-container` → [wide>=860: collapsed floating opener, `aside#app-sidebar` (collapse button, nav groups LEARN/PRACTICE/YOU/[admin: LIVE VIDEO CLASS], unread badge on chat, tutor card → tutors/chat, user card + logout + interests + edit profile (signed-in) or Google login (guest), admin console button, resizer)] + `main.app-main-viewport` (scrolls; [narrow: sticky pill nav `navFlat`]; all screens incl. Intro/About).
- CSS: brand/header 34-57, fit-to-screen 105-131 (html/body overflow hidden, header 60px, body calc(100dvh-60px), main scrolls), sidebar 538-605, plus `.cv-layout-grid`.
- logic: `go` (stop listening audio when leaving listening; `window.scrollTo(0,0)`), nav defs 6665-6676, `toggleSidebar` (`hn-sidebar-collapsed`), `initSidebarResize` (180-460px, dblclick → 240, `hn-sidebar-width`), Ctrl/Cmd+B, resize listener (`wide = innerWidth >= 860`), `setLang`/`setTheme` (`hn-lang`/`hn-theme`, `data-theme` on `<html>`), initial `hn-lang` (default en), `hn-tutor`, `?admin=1`.
- auth 4775-4830 + 6075-6155: Firebase compat 10.8.1 (CDN), `FIREBASE_CONFIG` 3530, `onAuthStateChanged` → currentUser, `isAdmin` (email contains "admin" or starts with "hopep"; or `?admin=1`), Firestore `users/{uid}` read (selectedTutorId, profile) + merge write, onboarding (`applyProfile`, `openOnboarding`, `saveProfile`), `loginWithGoogle` (popup → redirect fallback), `logoutFirebase`.

Findings and decisions:

- Every screen renders inside the shell. Sandbox pages currently use window scroll with no header/sidebar, which explains all earlier "shell width" deltas and the Writing/Chat height emulations.
- The admin flag is a client-side UI flag only. It must stay as-is (server endpoints must enforce admin).
- Video Class (admin-only preview page `10 Video Class Platform` + modals) remains deferred per AGENTS.md section 14 and is NOT migrated in Phase 6. This is recorded as an explicit open product decision for cutover readiness.

Plan:

- P4B Shell layout + navigation: header, sidebar (groups, active state, unread badge, tutor card, collapse/resize/Ctrl+B with persistence), narrow pill nav, main viewport scroll + reset on navigation, EN/KO + theme toggles with persistence (every page receives the live `lang`), `hn-tutor` persistence, legacy CSS verbatim, removal of the shell emulations (Writing/Chat heights), and `max-width:1400px` parity, plus Reading state lifting (generated material, answers, saved words, genError) so navigation away/back matches legacy.
- P4C Auth/profile: Firebase compat SDK via the same CDN tags, `onAuthStateChanged`, user card/logout, onboarding modal, Firestore tutor/profile sync, admin flag, and signed-in propagation (uid to learning record, correction, conversation, report). Validation stubs Firebase identically in both apps (real Google sign-in needs user credentials).
- P5 Admin console audit + migration.

Next milestone:

`P4B SHELL LAYOUT + NAVIGATION MIGRATION`

---

## P4B — Shell Layout + Navigation Migration

Status:

`COMPLETE`

Commit:

`45ac5d2e8fd6cf08e65bf9b0300af4d00cc2eff7`

Implementation:

- `AppShell.jsx` and `shell.css` port the legacy header, desktop sidebar, mobile pill navigation, active states, unread badge, selected-tutor card, logo variants, and shared `max-width:1400px` screen rules.
- App-owned `lang`, `theme`, selected tutor, sidebar collapsed state, and 180–460px sidebar width preserve `hn-lang`, `hn-theme`, `hn-tutor`, `hn-sidebar-collapsed`, and `hn-sidebar-width`.
- Sidebar collapse/open, Ctrl/Cmd+B, drag resize, double-click 240px reset, responsive `wide >= 860`, main-viewport scroll reset, and live language/theme propagation are wired.
- Reading generated content, selected word, translation visibility, saved words, quiz answers, loading, and errors are App-owned so navigation away/back matches legacy. In-flight generation continues after leaving Reading.
- Listening still stops and resets on navigation through its verified unmount cleanup.
- Removed temporary Writing and Chat shell-height emulations and copied the legacy light/dark logos byte-identically.
- Guest login controls intentionally remain non-authenticating until P4C. Video Class stays hidden.

Validation:

- Node 20.20.2 true-production build PASS: 71 modules, 404.22 kB JS; production dependencies report 0 vulnerabilities (`npm audit --omit=dev`).
- Legacy/sandbox full-screen geometry measured for all 11 migrated screens at 1440x900 and 390x844: header, sidebar/main widths, screen positions/heights, scroll extents, responsive breakpoints, and no horizontal overflow PASS. Intro/About root-wrapper height differs by the pre-existing DC interpolation wrapper only; main scroll extents are identical.
- Visual desktop/mobile Intro comparison PASS; Korean dark Home spot check PASS; English light default PASS.
- Sidebar/header/mobile navigation targets, active state, unread badge, tutor card, scroll reset, collapse/open, Ctrl+B, drag persistence, double-click reset, and resize behavior PASS.
- `hn-lang`, `hn-theme`, `hn-tutor`, sidebar collapse/width persistence across reload PASS.
- Reading selection/translation/quiz state survives navigation; in-flight generation completes away from Reading; leave-return-before-complete and subsequent generation race regression PASS.
- Listening playing-audio leave cleanup calls pause/load and restores 0%/play UI PASS.
- All migrated screens render at desktop/mobile; no page errors, Vite overlay, console errors, or horizontal overflow.

Code review:

- 0 critical, 0 major issues remaining. One generation single-flight ref race found during review was fixed and browser-regressed.

Next milestone:

`P4C AUTH + PROFILE SHELL MIGRATION`

---

## P4C — Auth + Profile Shell Audit

Status:

`COMPLETE` (implementation below)

Risk:

`HIGH`: Firebase auth listener, Firestore profile/tutor mutation, onboarding persistence, identity propagation into AI/realtime requests, and admin UI state.

Source map (`preview/index.html`):

- Firebase compat SDK tags 16-18 and public client config 3530-3537.
- auth lifecycle 4775-4830: initialize once, `onAuthStateChanged`, normalized user, legacy admin-email heuristic, Firestore `users/{uid}` restore and last-login merge, signed-out cleanup.
- profile/tutor lifecycle 6030-6155: signed-in tutor merge, local `hn-profile-{uid}` fallback, two-step draft/validation, local-first save, Firestore merge, popup login with blocked-popup redirect fallback, logout.
- onboarding markup 650-732 and bindings 7588-7619; sidebar identity/profile markup 1125-1165.
- profile data 3624-3658: 32 nationalities, 4 gender options, 12 ordered interests, maximum 5.
- identity consumers: generated content `userId`, `/api/learning/record`, Chat correction, Conversation start/complete/report/history, nickname/nationality/interests, and interest-based Tutor lesson selection.

Bounded implementation strategy:

- Add App-level auth/profile state and exact legacy constants/helpers; use the same compat SDK to avoid a new package/dependency.
- Port guest/authenticated shell variants and two-step onboarding. Keep local fallback functional if Firestore read/write fails.
- Wire signed-in identity/profile only into already migrated public domains and persist signed-in tutor selection.
- Preserve the legacy client-side admin flag as state for the P5 Admin handoff. Do not add an unusable Admin page in P4C and do not expose Video Class.
- Validate Firebase behavior through a deterministic browser-injected stub; real Google account interaction is outside autonomous test credentials.

---

## P4C — Auth + Profile Shell Migration

Status:

`COMPLETE`

Commit:

`a5d3d20040169611492f7a8489ade4caced7e5e1`

Agent handoff:

- Implemented and validated by Codex, which reached its usage limit before commit. Claude Code resumed from the dirty tree (handoff validation: branch correct, checkpoint `45ac5d2` ancestor of HEAD, later commits docs-only, remote `0 0`), reviewed the full diff against legacy source, and committed/pushed.

Implementation:

- `frontend/index.html` loads the same Firebase compat 10.8.1 app/auth/firestore CDN tags; `profileData.js` carries the legacy public client config, 32 nationalities, 4 genders, 12 interests, max 5, admin-email heuristic, and `hn-profile-{uid}` key.
- `useAuthProfile` mirrors `onAuthStateChanged`, Firestore `users/{uid}` restore (tutor + profile) and last-login merge write, local-profile fallback, Firestore-failure onboarding fallback, popup→redirect login, logout, tutor persistence, and the `?admin=1`/email `isAdmin` UI flag (state only; Admin page is P5).
- `OnboardingModal` ports the two-step onboarding with exact validation messages, ranked interests, and local-first save; Firestore failure keeps the local profile and sets the legacy (unrendered) `obNotice`.
- `AppShell` renders the signed-in sidebar identity (photo/initial, nickname-first name, email, logout, interests, edit profile) and hides the header login when signed in; guest shell unchanged.
- Signed-in uid propagates to content generation, `/api/learning/record`, Chat correction, and Conversation start/complete/report; nickname/nationality/interests and interest-based lesson selection feed Conversation start.

Handoff review fixes (before commit):

- Conversation history/report `meta.userName` restored to legacy `currentUser?.displayName || ''`.
- Sidebar avatar initial restored to legacy `(displayName || email || 'U')[0]`.

Validation:

- Node 20.20.2 `npm ci --include=dev` + `NODE_ENV=production vite build` PASS: 75 modules, 421.65 kB JS (133.30 kB gzip).
- Codex (pre-handoff): stubbed auth-state, popup→redirect fallback, logout, Firestore restore+merge, onboarding required/edit, admin flag, identity propagation, desktop/mobile/ko/en/light/dark parity and migrated-domain regression PASS.
- Claude Code (post-fix): deterministic Firebase stub injected identically into legacy (3000) and sandbox (5173): signed-in sidebar initial/name/interests, hidden header login, one Firestore merge write — identical; logout → guest shell identical; all 10 navigable screens at 1440x900 and 390x844 with no page errors, console errors, Vite overlay, horizontal overflow, or Video Class text.

Known quirks preserved:

- `obNotice` is set on Firestore save failure but never rendered (legacy).
- Signing out does not reset the admin UI flag (legacy).

Next milestone:

`P5A ADMIN CONSOLE AUDIT`

---

## P5A — Admin Console Audit

Status:

`COMPLETE`

Risk:

`MEDIUM` (downgraded from roadmap HIGH): read-only dashboard; authorization is enforced server-side (`requireAdmin`: verified Firebase ID token, `admin` claim or server email allowlist). No admin mutation exists outside deferred Video Class.

Source map (`preview/index.html`):

- markup 2990-3205: `09 Admin Console` (max-width 1200px): header bar (title, Firebase badge, subtitle, 🔄 새로고침 → reload, ← 학습 홈으로 → home), 4 KPI cards (total users, DAU + ratio, AI calls, AI cost USD), user table (search name/email, filters 전체/오늘 접속/신규 가입 with counts, 7 columns, row hover, Google icon, empty state), tutor distribution (jiwoo/minho/seoyeon counts, static bar widths 100/20/20%), static system/guardrail panel.
- entry points: header 👑 Admin pill (646, admin only, before login), sidebar 👑 관리자 콘솔 (Admin) button (1163, admin only, after identity block), signed-in admin deep link `#admin` or `?page=admin` (4795).
- controller 4638-4664: `loadAdminDashboard` (adminLoading, Bearer ID token when signed in, GET `/api/admin/dashboard`, success → adminData; failure keeps previous data), `goAdmin` (page admin + load + scroll top).
- derivations 6946-7017: fallback single-user row from currentUser when no adminData, search/filter, status badges (online < 1h / today / earlier), relative time, join date, tutor names, level labels, XP, KPI fallbacks (142 calls, $0.048, jiwoo 2).
- state 4211-4215: adminData/adminLoading/adminSearch/adminFilter (app-wide; persist across navigation). `adminTab` and `vcTab:'admin'` are unused/Video Class.

Server (`server.js` 780-870): `requireAdmin` 401/403/503 JSON; `/api/admin/dashboard` merges Auth listUsers (≤500) and Firestore users. Unchanged.

Decisions:

- Port page + entry points + deep link with exact markup/derivations. `adminLoading` is tracked but not rendered (legacy).
- Admin header/sidebar Video Class links, Video Class page, and `/api/v1/tutors/profile` admin tutor form stay hidden/unmigrated (AGENTS.md section 14).
- Navigation reset reuses the verified P4B `handleNavigate` behavior.
- Validate with the same Firebase stub plus a routed `/api/admin/dashboard` response, and verify the real server still returns 401 without a token.

Next milestone:

`P5B ADMIN CONSOLE MIGRATION`

---

## P5B — Admin Console Migration

Status:

`COMPLETE`

Commit:

`6b9b97bd302edbef8ace73a19a440b433a40ab48`

Implementation:

- `AdminPage.jsx` ports the `09 Admin Console` markup verbatim plus `buildAdminView` (legacy derivations 6946-7017: current-user fallback row, search/filter, status badges, relative time, join date, tutor names, levels, XP, KPI fallbacks).
- `App.jsx`: app-wide adminData/adminLoading/adminSearch/adminFilter, `loadAdminDashboard` (Bearer ID token when signed in, success-only update), `handleGoAdmin`, signed-in admin-email `#admin`/`?page=admin` deep link, `admin` route.
- `AppShell.jsx`: header 👑 Admin pill and sidebar 관리자 콘솔 (Admin) button when `auth.isAdmin`.
- Not migrated (deferred Video Class): admin header 화상수업 link, LIVE VIDEO CLASS sidebar group, Video Class page, admin tutor-profile form.

Validation:

- Node 20.20.2 production build PASS: 438.30 kB JS (137.70 kB gzip).
- Legacy vs sandbox with identical Firebase stub: guest has no admin entry; `?admin=1` guest → header/sidebar entry, console fallback (0 users, 142 / $0.048 / 50.0%, jiwoo 2) text identical; real server 401 kept adminData null in both.
- Signed-in admin email + routed dashboard fixture: KPIs, rows, status badges, relative times, tutor names, XP formatting, search (case-insensitive), empty-search state, 오늘 접속 / 신규 가입 / 전체 filters, refresh, 학습 홈으로 — text identical; request carried `Authorization: Bearer <token>`.
- `#admin` deep link opens the console for an admin email in both; non-admin email: no deep link, no entry points in both.
- Admin screen geometry identical at 1440x900 (1185x888) and 390x844 (375x1781); element screenshots pixel-identical in light and dark.
- Server `/api/admin/dashboard` returns 401 without a token and with a forged token (direct and via Vite proxy).
- Regression: all 10 navigable screens at 1440/390 (ko), no page/console errors, no overflow, no admin entry or Video Class text for guests.

Known quirks preserved:

- `adminLoading` is tracked but never rendered (legacy).
- Tutor distribution bar widths are static (100/20/20%) (legacy).

Next milestone:

`P6A FINAL INTEGRATION REGRESSION`

---

## P6A — Final Integration Regression (+ P6A-FIX, P6A-FIX2, P6B)

Status:

`COMPLETE`

Commits:

- `9b8f4c53e9e9fb188b89745d72084239111d3940`: `fix: match legacy reading grid on narrow screens`. Removed the sandbox-only ≤659px override; Reading is identical at 360/390/500/659/700/859/1024/1440 in en and ko.
- `17df31a11612e4c93e3f08908712b292f981cb8f`: `fix: keep Firestore tutor restore out of local storage`. Legacy only sets state on restore.
- `d67e4e8b38e8780db06b57eba9ea9d87a99a367a`: `fix: match legacy document head and root icons`. Title, favicon/apple-touch/manifest links, no `<html lang>`, byte-identical root icons + `site.webmanifest` in `frontend/public`.

Validation:

- Screen inventory: every legacy `data-screen-label` is migrated except the deferred `10 Video Class Platform`.
- Cross-app sweep: 11 screens × en/ko × 1440/390 have identical text and geometry. Known exceptions: Intro/About footer wrapper (main scroll identical) and the Intro rotating demo chat.
- 12 full-viewport screenshots are pixel-identical (Home/Reading/About/Record; ko 1440, ko 390, en 1440).
- Auth: onboarding-required flow, validation errors, interest cap, local + Firestore persistence, sidebar, logout, tutor restore, admin flag and deep link — identical. Signed-in dark sweep has identical geometry.
- No sandbox failed requests, 404s, console errors, or page errors.
- API: 9 endpoints have identical status and body directly and through the Vite proxy. Admin returns 401 with no token or a forged token. `/api/live` WebSocket handshake OPEN in both.
- Final Node 20.20.2 production build PASS (438.28 kB JS).
- Carried forward from domain milestones (not re-run, to avoid AI/TTS quota): AI generation, TTS/audio lifecycle, live Gemini conversation, audio review.

Result:

`READY FOR PRODUCTION CUTOVER`. See `.agent/CUTOVER_READINESS.md`. Cutover is not performed and needs explicit approval.

---

## P6C — Final Pre-Cutover Gate (Admin Video Class Parity + Real Auth Check)

Status:

`COMPLETE`. Result: `READY FOR MANUAL AUTH CHECK`.

Commit:

`6ab4395cad21d1b0a7832a821ea5803d946fdef9`: `fix: preserve admin video class parity before cutover`

Audit:

- Legacy exposes a functional Video Class preview (8 APIs, 5 mutating, backed by an in-memory mock with no Google Calendar call) on the client admin UI flag only. `?admin=1` grants that flag to anyone, and the email heuristic grants it to any matching Google account.
- The legacy template runtime (`dc-runtime.js` `resolve`) supports only paths, literals, `!`, equality, and parentheses. Ternaries, `&&`, and arrow handlers resolve to undefined, and the React port reproduces the rendered result.

Implementation:

- `useVideoClass`: verbatim controller plus the access gate (legacy flag AND signed-in AND `POST /api/admin/check` 200 `isAdmin:true`, only attempted when the flag is set).
- `VideoClassPage` + `VideoClassModals`: legacy markup and styles minus the declarations legacy drops.
- `App`: guarded route, header load, sidebar/pill no-load quirk, redirect to Home on access loss. `AppShell`: header link, sidebar group, pill item.
- Not changed: server, auth middleware, Admin console gating, cutover files.

Validation: see `.agent/CUTOVER_READINESS.md` section 8A.

- Node 20.20.2 build PASS (483.84 kB JS). Host Node 24 `npm run build` hits the known silent exit after transform.
- 88-run cross-app regression: only the known Intro/About wrapper difference.
- No Video Class or Admin leak for guests or normal users; no page/console errors other than expected 401s for stub tokens.

Real Google sign-in: MANUAL TEST REQUIRED. No test account; nothing faked. Checklist in `.agent/CUTOVER_READINESS.md` section 8B.

---

## P7 — Local/Repository Production Cutover (no external deploy)

Status:

`COMPLETE`. Result: `CUTOVER IMPLEMENTATION READY FOR DEPLOYMENT`.

Authorization:

The user reported the real Google admin checklist (CUTOVER_READINESS 8B) 10/10 PASS and approved the local cutover only.

Commit:

`6d94bad8f30ca9d6405d0767c81080e700966081`: `build: switch production frontend to React Vite`. Pre-cutover: `3420082c7ea5294f446a02f52432012940689ed8`.

Changes: `server.js` (static + non-/api SPA fallback → `frontend/dist`), `firebase.json` (`public: frontend/dist`), `Dockerfile` (Node 20 frontend-build stage + `COPY --from`), `.dockerignore` (exclude `frontend/node_modules`, `frontend/dist`). `preview/` is unchanged.

Validation: see `.agent/CUTOVER_READINESS.md` section 9.

- **Build:** Node 20.20.2.
- **localhost:3000:** proven to serve `frontend/dist`. All screens pass at 1440/390 in en and ko. Auth and admin isolation behave as designed. The API, the new 404-for-unknown-/api rule, and the WebSocket work.
- **Docker:** local build and run PASS.
- **Errors:** none other than expected 401s from stub tokens.

Not performed:

- firebase deploy
- Cloud Run deploy
- image push
- DNS changes
- deleting `preview/`

Rollback: `git revert 6d94bad` (details in CUTOVER_READINESS section 7).

---

## P8 — Cloud Run Staging Deployment (user label P6B)

Status:

`BLOCKED` (HARD BLOCKER: gcloud SDK/credentials unavailable). Nothing deployed.

Done without cloud access:

- Discovery from the repository and Firebase CLI.
- Environment/secrets audit (names only).
- WebSocket timeout analysis: 900 s recommended; the 300 s default would cut 10-minute tutor sessions.
- Resume runbook and production rollout recommendation in `.agent/STAGING_DEPLOYMENT.md`.

Production changes: NONE. Firebase Hosting deploy: NOT PERFORMED. DNS: NOT CHANGED.

### P8 resume — staging deployed

- The user resolved the gcloud blocker (SDK installed and authenticated, billing on, `run.googleapis.com` enabled, 0 existing services).
- Enabled `cloudbuild`/`secretmanager`. Created 3 `hn-staging-*` secrets from `.env` via stdin (values never printed) with per-secret accessor for the compute SA.
- `gcloud run deploy --source .` failed: Windows upload mangled the Korean asset filenames, so Vite hit ENOENT. Rebuilt from `git archive 19c1500` via Cloud Build (SUCCESS, same bundle hash) and deployed the image.
- Service `hangulnow-staging`, revision 00001-bmw, https://hangulnow-staging-313423647793.asia-northeast3.run.app, timeout 900.
- Added the two staging hosts to Firebase authorized domains (additive, existing kept).
- Automated external acceptance PASS (details in `.agent/STAGING_DEPLOYMENT.md` section 3); Cloud Run logs clean.
- Found while reading: the project has no serving production frontend/backend (Hosting live returns 404; `hangul-now-api` does not exist).
- Application source changes: none. Production changes: none.

Result: `STAGING READY FOR MANUAL AUTH CHECK`.

### P8 — closed

The user reported the staging real-auth checklist PASS (login, profile, reload, tutor restore, `/api/admin/check` 200, console, Video Class, logout isolation, direct VC blocked when logged out, re-login, no unexpected errors).

---

## P9 — Production First Launch (Cloud Run direct; user label P6C)

Status:

`PRODUCTION CANDIDATE READY FOR MANUAL AUTH CHECK`

- Repo `caff194` clean, 0 0; app code `6d94bad`. Staging healthy.
- Deployed the **exact staging image digest** (`sha256:ecf2229…`) to new service `hangul-now-api` as revision 00001-siy, tag `candidate`.
  - Created private: Cloud Run can't create a service with `--no-traffic`, so private plus invoker-at-launch is the zero-exposure equivalent.
  - Dedicated runtime SA `hangul-now-api-runtime` (secretAccessor on the 3 secrets only; no project roles).
  - Reused the staging-validated secrets.
  - 1 vCPU / 512 MiB / concurrency 80 / timeout 3600 / min 0 / max 1 (in-memory `reviewJobs` + Video Class state).
- Automated acceptance PASS:
  - HTTPS, assets incl. Korean names, SPA, APIs, unknown /api 404, 401s.
  - Public 403 everywhere.
  - WSS open/close; 11 screens × 1440/390 × en/ko through the authenticated localhost proxy.
  - Logs clean.
- The `gcloud run services proxy` component needs an admin install. A temporary scratch proxy (`candidate-proxy.cjs`) was used for the agent's browser sweep, then stopped.
- No Firebase Hosting deploy, no DNS, no authorized-domain change, staging and preview preserved, no application source changes.

Details and the launch/rollback runbook: `.agent/PRODUCTION_LAUNCH.md`.

### P9 — public launch executed

- The user reported the candidate real-auth check 13/13 PASS.
- Launch actions:
  - Added Firebase authorized domains `hangul-now-api-313423647793.asia-northeast3.run.app` and `hangul-now-api-onpsj3o5ta-du.a.run.app` (additive).
  - Pinned traffic `hangul-now-api-00001-siy=100`.
  - Granted `allUsers` `roles/run.invoker` (2026-10-04T07:42:50Z).
- No rebuild, no new revision, no source change.
- Post-launch public acceptance PASS:
  - frontend identical to dist; assets incl. Korean names
  - 11 screens × 1440/390 × en/ko with zero console messages
  - Firebase Google popup opens with no unauthorized-domain error
  - APIs, unknown /api 404, 401s, WSS 252 ms clean close
  - guest/normal/`?admin=1`/forged isolation
  - logs: 0 5xx, 0 ERROR
- Staging, `preview/`, Firebase Hosting (undeployed), and DNS are untouched.

Result: `PRODUCTION PUBLIC LAUNCH READY FOR FINAL USER CHECK` (`.agent/PRODUCTION_LAUNCH.md` section 10).
