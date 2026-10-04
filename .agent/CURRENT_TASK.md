# Current Migration Task

## Task Identity

Milestone ID:

`P1Q`

Milestone Name:

`SANDBOX WEBFONT PARITY FIX`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`fdd5946c29037512e8da860a6376719a6c2cc401`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- implementation baseline HEAD `2c01a11` (`docs: record reading quiz activity milestone`),
- P1P code checkpoint `fdd5946` is an ancestor,
- remote ahead is zero.

---

## Objective

Make the sandbox load the same webfonts as legacy. Legacy `preview/index.html` loads only Pretendard and Gowun Batang; its `'IBM Plex Mono'` and `'Newsreader'` declarations fall back to system fonts. Sandbox `frontend/index.html` (since `0ce8364`) additionally loads both from Google Fonts, changing glyphs and line metrics.

## Included Scope

- remove the Newsreader and IBM Plex Mono `<link>` tags from `frontend/index.html`.

## Explicitly Excluded

- any CSS or component font-family changes,
- adding webfonts to legacy,
- the `<html lang>` attribute (verified not to affect metrics).

## Required Validation

- build,
- computed font metrics of Mono/Newsreader text vs legacy on Intro/About/Tutors/Reading (desktop 1440, mobile 390),
- no console/page errors,
- Intro/About/Tutors/Reading regression.

## Progress Checklist

- [x] Git state reverified
- [x] Status set to IN_PROGRESS
- [x] Implementation complete
- [x] Build PASS (Node 20 container, standard minified)
- [x] Metric parity PASS (390: all Mono/Newsreader elements identical to legacy on 4 pages; 1440 width diffs only from legacy sidebar shell)
- [x] Regression PASS (Intro/About/Tutors/Reading 1440/390, no errors)
- [x] Diff review PASS
- [ ] Commit created
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Remove the two font links from `frontend/index.html`, then build and compare metrics with legacy.
