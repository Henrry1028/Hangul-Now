# Current Migration Task

## Task Identity

Milestone ID:

`P3A`

Milestone Name:

`SPEAKING AUDIT`

Status:

`AUDITING`

Baseline migration-code checkpoint:

`7e947f0cd4b4c8b03bc81c769cc58b7e5822ba6c`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P2H `7e947f0` is an ancestor,
- only `.agent/*` metadata after it,
- remote ahead is zero.

---

## Objective

Source-first audit of legacy Speaking before implementation.

## Audit Questions

- template (`08 Speaking`, preview/index.html ~2145-2176) and CSS,
- recording lifecycle (getUserMedia/MediaRecorder?), scoring (simulated vs API),
- TTS (native sentence), generation (`kind: speaking`), shared `studyLevel`/`trOn`,
- activity/XP coupling,
- slices.

## Progress Checklist

- [x] Git state reverified
- [ ] Legacy Speaking source located
- [ ] Coupling mapped
- [ ] Bounded slices defined
- [ ] Audit recorded in MIGRATION_LOG
- [ ] Audit metadata committed and pushed

## Exact Next Action

Read the Speaking template and its handlers.
