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
