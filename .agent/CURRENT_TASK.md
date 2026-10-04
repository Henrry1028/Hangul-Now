# Current Migration Task

## Task Identity

Milestone ID:

`P2H`

Milestone Name:

`RECORD MIGRATION`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`1b8df9fb47463a66b9e749c780495ddbdd9134e1`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P2F `1b8df9f` is an ancestor,
- metadata commits (`docs: ... record audit`) follow it,
- remote ahead is zero.

---

## Objective

Migrate Record ("09 My progress") with legacy parity. Strategy is in MIGRATION_LOG P2G.

## Expected Files

- `frontend/src/data/recordData.js` (new)
- `frontend/src/pages/RecordPage.jsx` (new)
- `frontend/src/styles/record.css` (new)
- `frontend/src/App.jsx` (record route, recordState, audio-review controller)

## Required Validation

- build,
- 390/1440 parity for all 3 tabs vs legacy (same activity storage),
- calendar month nav / today / select + studied/flame cells from `hn-study-dates`,
- stats/levels from `hn-user-xp`, log count,
- audio review play/pause/seek/click-seek/speed/like/script/download/regenerate (alert),
- rank toggle,
- regression, no unexpected console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Audit complete (P2G)
- [x] Implementation complete
- [x] Build PASS (Node 20)
- [x] Behavior PASS (calendar/rank/seek/speed/like/script/download identical; play/pause timing identical; regenerate + alert)
- [x] Parity PASS (3 tabs: 390 identical; 1440 vertical identical, widths shell-only)
- [x] Regression PASS
- [x] Diff review PASS
- [ ] Commit created
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Generate recordData.js and record.css from legacy, then RecordPage.jsx and App wiring.
