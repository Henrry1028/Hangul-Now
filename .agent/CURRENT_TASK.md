# Current Migration Task

## Task Identity

Milestone ID:

`P1P`

Milestone Name:

`READING QUIZ + ACTIVITY PERSISTENCE MIGRATION`

Status:

`NOT_STARTED`

Baseline migration-code checkpoint:

`01e84258129f7c614cc3ecf065ebab210c6b414f`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

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

- [ ] Git state reverified
- [ ] Status set to IN_PROGRESS
- [ ] Implementation complete
- [ ] Build PASS
- [ ] Browser/runtime behavior PASS
- [ ] Persistence/reload PASS
- [ ] Responsive parity PASS
- [ ] Regression PASS
- [ ] Diff review PASS
- [ ] Commit created
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Commit and push the P1O audit metadata, then reverify Git and implement P1P in the smallest shared-state-compatible set of React files.
