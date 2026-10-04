# Current Migration Task

## Task Identity

Milestone ID:

`P1P`

Milestone Name:

`READING QUIZ + ACTIVITY PERSISTENCE MIGRATION`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`01e84258129f7c614cc3ecf065ebab210c6b414f`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- implementation baseline HEAD `50f82a69b5714004bac40f729486d7b270667284`,
- clean after the P1O audit metadata checkpoint,
- P1N code checkpoint remains an ancestor,
- remote ahead is zero.

---

## Objective

Migrate static/generated Reading Quiz parity and the exact local activity persistence it triggers, while leaving Home/Record presentation and backend/auth out of scope.

## Included Scope

- static Reading questions,
- generated Reading questions,
- session answer state,
- correct/incorrect selected-option styling,
- generation reset,
- repeat-answer award quirk,
- App-owned activity logs, XP, study dates, and session minutes,
- legacy seed logs and 150-entry cap,
- `hn-activity-logs`, `hn-study-dates`, and `hn-user-xp`.

## Explicitly Excluded

- Home UI,
- Record UI,
- weekly chart recalculation,
- backend activity endpoint,
- Firebase/auth sync,
- learned-topic changes,
- Quiz redesign or new feedback.

## Required Validation

- build,
- static two-question rendering,
- generated-question replacement,
- correct and incorrect styling,
- repeat-answer activity/XP behavior,
- answer change behavior,
- generation answer reset,
- exact activity payload,
- legacy seed log behavior,
- 150-entry cap,
- XP/date/log persistence across reload,
- session-only minutes behavior,
- Korean/English label behavior,
- desktop 1440px,
- mobile 390px,
- Intro/About/Tutors/Reading regression,
- no unexpected console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Status set to IN_PROGRESS
- [x] Implementation complete (resumed by Claude Code after Codex limit: quiz JSX + CSS added on top of Codex's data/handler/activityData work)
- [x] Build PASS (Node 20.20.2 container, clean npm ci, standard minified vite build; host Node 24 silent-exit quirk reproduced)
- [x] Browser/runtime behavior PASS (static 2Q, mocked generated 3Q replacement, correct/wrong styling, repeat-award quirk, answer change, generation reset, exact payload, StrictMode single-award)
- [x] Persistence/reload PASS (seed logs, 150 cap, XP/dates/logs survive reload, minutes session-only, answers reset on reload)
- [x] Responsive parity PASS (1440/390 computed styles identical to legacy except pre-existing scaffold IBM Plex Mono webfont diff, see log)
- [x] Regression PASS (Intro/About/Tutors/Reading at 1440/390, no console/page errors except known favicon 404)
- [x] Diff review PASS
- [ ] Commit created
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Commit the P1P code, fetch/verify divergence, push, then record the milestone in MIGRATION_STATE/LOG.
