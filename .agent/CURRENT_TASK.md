# Current Migration Task

## Task Identity

Milestone ID:

`P2B`

Milestone Name:

`TUTORS DESKTOP SCREEN SPACING FIX`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`3e125c9741eabda803d5a7c509de5336d82374e8`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- implementation baseline HEAD `e16325a` (`docs: record home milestone`),
- P2A Home checkpoint `3e125c9` is an ancestor,
- remote ahead is zero.

---

## Objective

Port the legacy global >=860px screen spacing override to sandbox Tutors.

## Included Scope

- `frontend/src/styles/tutors.css` (new): `.tutors-screen` base layout + `@media (min-width: 860px)` padding/gap,
- `TutorsPage.jsx`: replace the root inline layout style with the CSS import.

## Explicitly Excluded

- max-width 1400 (shell-dependent, Phase 6),
- any other Tutors change.

## Required Validation

- build,
- Tutors leaf-element comparison vs legacy at 390 (identical) and 1440 (padding/gap equal, offsets only from the sidebar shell),
- Intro/About/Home/Tutors/Reading regression,
- no console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Status set to IN_PROGRESS
- [x] Implementation complete
- [x] Build PASS
- [x] Parity PASS (390 identical; 1440 padding/gap/height/tops identical, x-offsets only from sidebar shell)
- [x] Regression PASS
- [x] Diff review PASS
- [ ] Commit created
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Create `tutors.css`, remove the inline root layout in `TutorsPage.jsx`, then build and compare.
