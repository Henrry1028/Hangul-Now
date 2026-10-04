# Current Migration Task

## Task Identity

Milestone ID:

`P2C`

Milestone Name:

`WRITING AUDIT`

Status:

`AUDITING`

Baseline migration-code checkpoint:

`28bd81c5ac1088f5ae3dd8089aff4906071238fe`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P2B checkpoint `28bd81c` is an ancestor,
- only `.agent/*` metadata after it,
- remote ahead is zero.

---

## Objective

Source-first audit of legacy Writing before any implementation.

## Audit Questions

- template (`data-screen-label="07 Writing"`, preview/index.html ~1866-2145) and writing-specific CSS (~134+ and media rules),
- render data in `renderVals`, state fields, handlers,
- jamo/syllable composer logic, levels, word mode, targets,
- AI feedback / correction / generation APIs, auth/Firebase coupling,
- activity/XP (`recordActivity`) and learned-topic coupling,
- TTS/audio, keyboard/virtual keyboard SVG, resize/viewport behavior,
- smallest safe implementation slices.

## Progress Checklist

- [x] Git state reverified
- [ ] Legacy Writing source located
- [ ] State/persistence/API/auth/audio coupling mapped
- [ ] Bounded slices defined
- [ ] Audit recorded in MIGRATION_LOG
- [ ] Audit metadata committed and pushed

## Exact Next Action

Read the Writing template and its renderVals data, then map handlers and APIs.
