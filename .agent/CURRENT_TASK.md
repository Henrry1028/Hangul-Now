# Current Migration Task

## Task Identity

Milestone ID:

`P2G`

Milestone Name:

`RECORD AUDIT`

Status:

`AUDITING`

Baseline migration-code checkpoint:

`1b8df9fb47463a66b9e749c780495ddbdd9134e1`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P2F `1b8df9f` is an ancestor,
- only `.agent/*` metadata after it,
- remote ahead is zero.

---

## Objective

Source-first audit of legacy Record ("09 My progress") before any implementation.

## Audit Questions

- template (preview/index.html ~2476-2991), CSS (study-cal/rank/etc. ~489+),
- render data (activity tabs, filters, calendar, analytics, ranking, weekly review),
- consumption of App-owned activity logs / XP / study dates / minutes,
- APIs (weekly review, PDF/TTS?), auth/Firebase coupling,
- smallest safe implementation slices.

## Progress Checklist

- [x] Git state reverified
- [ ] Legacy Record source located
- [ ] State/persistence/API coupling mapped
- [ ] Bounded slices defined
- [ ] Audit recorded in MIGRATION_LOG
- [ ] Audit metadata committed and pushed

## Exact Next Action

Read the Record template and its renderVals data.
