# Current Migration Task

## Task Identity

Milestone ID:

`P1M`

Milestone Name:

`READING AI GENERATION AUDIT + MIGRATION PLAN`

Status:

`NOT_STARTED`

Baseline migration-code checkpoint:

`11e18eff4c1897e72f28f26b6b657a4e96456e14`

Bootstrap note:

The repository HEAD may be a descendant of this checkpoint after the orchestration files themselves are committed. Verify ancestry and inspect later commits rather than requiring exact HEAD equality.

Expected branch:

`migration/react-vite-modular`

Expected initial working tree:

`clean`

---

## Objective

Audit the legacy Reading AI-generation behavior and define the safest bounded React migration strategy.

This milestone is initially READ-ONLY.

Do not implement until the audit is complete and a bounded strategy is established.

---

## Required Audit Areas

Inspect the actual legacy source and determine:

- AI-generation UI entry points,
- handlers and methods,
- exact state keys,
- `/api/content/generate` request contract,
- response shape,
- auth behavior,
- backend/provider coupling relevant to frontend,
- generated Korean passage shape,
- generated English translation shape,
- generated glossary shape,
- generated grammar shape,
- static/generated switching,
- generated TTS interaction,
- Quiz coupling,
- XP/history/learning-record coupling,
- saved-vocabulary coupling,
- error behavior,
- repeated-generate concurrency,
- page-leave lifecycle,
- i18n,
- responsive UI behavior,
- React compatibility with current `ReadingPage.jsx`.

---

## Key Questions

The audit must answer:

1. Can generated passage/translation/glossary/grammar be migrated without Quiz/history?
2. Does AI generation itself mutate XP/history/learning records?
3. Does generated glossary match the current React glossary model?
4. Does generated grammar fit the current Reading renderer?
5. Does full-passage TTS intentionally continue using static `PARAS`?
6. Is backend change required?
7. Is any new dependency required?
8. What is the safest exact next implementation scope?

---

## Allowed Strategy Outcomes

Choose exactly one based on source:

### OPTION A
AI controls + generated passage/translation only.

### OPTION B
AI controls + generated passage + translation + generated glossary + generated grammar, excluding Quiz/history.

### OPTION C
AI response is too strongly coupled; AI + Quiz must migrate together.

### OPTION D
Coupling is too high; defer AI and choose another bounded Reading/domain slice.

---

## Progress Checklist

- [ ] Handoff validation
- [ ] Git state verified
- [ ] Legacy AI UI located
- [ ] AI handlers audited
- [ ] state audited
- [ ] `/api/content/generate` frontend contract audited
- [ ] backend route audited
- [ ] generated passage shape audited
- [ ] translation audited
- [ ] glossary audited
- [ ] grammar audited
- [ ] static/generated switching audited
- [ ] TTS coupling audited
- [ ] Quiz coupling audited
- [ ] history/XP mutation audited
- [ ] concurrency audited
- [ ] lifecycle audited
- [ ] i18n audited
- [ ] responsive UI audited
- [ ] React compatibility assessed
- [ ] risk classification complete
- [ ] strategy selected
- [ ] exact next implementation milestone defined
- [ ] final Git state verified

---

## Resume Rule

If another agent takes over while this task is in progress:

1. do not restart the audit,
2. inspect this checklist,
3. inspect Git and actual source,
4. verify already-completed findings if necessary,
5. continue from the first unchecked item,
6. update this file after meaningful checkpoints.

---

## Completion Condition

This task is COMPLETE only when:

- audit findings are recorded,
- migration strategy is chosen,
- exact next implementation scope is defined,
- no source code was unintentionally changed,
- final working tree is clean.

At completion:

- append the audit summary to `MIGRATION_LOG.md`,
- update `MIGRATION_STATE.md`,
- replace this task with the next milestone.
