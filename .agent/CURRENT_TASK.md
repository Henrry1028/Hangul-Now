# Current Migration Task

## Task Identity

Milestone ID:

`P1O`

Milestone Name:

`READING QUIZ + ACTIVITY/HISTORY AUDIT`

Status:

`NOT_STARTED`

Baseline migration-code checkpoint:

`01e84258129f7c614cc3ecf065ebab210c6b414f`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- clean after the P1N completion metadata checkpoint,
- P1N code checkpoint is an ancestor of HEAD,
- remote ahead is zero.

---

## Objective

Audit the legacy Reading Quiz and its shared activity, XP, study-date, duration, and learning-history coupling. Define the smallest parity-safe React migration scope.

This milestone is initially READ-ONLY.

## Required Audit Areas

- static Reading question model,
- generated Reading question model,
- exact Quiz UI and feedback states,
- answer state and repeated-answer behavior,
- Korean/English question and option behavior,
- `recordActivity` payloads,
- `hn-activity-logs`, `hn-study-dates`, and `hn-user-xp`,
- `userTotalMins` mutation,
- Home/Record/shared-state coupling,
- signed-in versus guest behavior,
- backend/Firebase coupling,
- generated-material reset behavior,
- responsive behavior,
- current React compatibility,
- whether activity persistence can be migrated before Home/Record consumers.

## Key Questions

1. Can Reading Quiz UI and local persistence migrate independently of Home/Record UI?
2. Must shared activity helpers move to `App.jsx` now, or can a bounded storage-compatible helper preserve future integration?
3. Does answering again intentionally award/log activity again?
4. Does Quiz affect learned-topic history beyond generation?
5. Is backend or auth work required?
6. What is the exact next implementation scope?

## Progress Checklist

- [ ] Handoff/Git state verified
- [ ] Static Quiz source audited
- [ ] Generated Quiz source audited
- [ ] Answer/feedback behavior audited
- [ ] Activity payload audited
- [ ] XP/date/time persistence audited
- [ ] Home/Record coupling audited
- [ ] Auth/backend coupling audited
- [ ] Reset/lifecycle audited
- [ ] i18n audited
- [ ] responsive behavior audited
- [ ] React compatibility assessed
- [ ] risk classification complete
- [ ] strategy selected
- [ ] exact next implementation milestone defined
- [ ] final Git state verified

## Exact Next Action

Commit and push the P1N completion metadata, then reverify Git and begin the P1O source-first audit from the legacy Quiz renderer and `recordActivity` implementation.
