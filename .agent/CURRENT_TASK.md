# Current Migration Task

## Task Identity

Milestone ID:

`P2D`

Milestone Name:

`WRITING MIGRATION`

Status:

`IN_PROGRESS`

Baseline migration-code checkpoint:

`1853fa61ea4fe5bad4ba152d88f37a61679525c5`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P2C-FIX `1853fa6` is an ancestor,
- a `docs: audit writing migration` metadata commit follows it,
- remote ahead is zero.

---

## Objective

Migrate the full Writing screen (build syllable, build word, write sentences) with legacy parity. Strategy is in MIGRATION_LOG P2C.

## Expected Files

- `frontend/src/data/writingData.js` (new)
- `frontend/src/data/learnedData.js` (new; helpers moved unchanged from ReadingPage)
- `frontend/src/pages/WritingPage.jsx` (new)
- `frontend/src/styles/writing.css` (new)
- `frontend/src/pages/ReadingPage.jsx` (import shared learned helpers)
- `frontend/src/App.jsx` (writing route + App-owned writing state)
- `frontend/public/assets/` (6 copied assets)

## Required Validation

- build,
- syllable build: jamo panel, virtual keyboard, physical keys, compound vowel/batchim two-stroke, error flash, Backspace/Enter/Escape,
- auto-advance timing, celebration pose, activity payloads (15/25/30 XP), `hn-learned` syllable/word records, review mode, learned progress label,
- word mode syllable progression,
- sentence tab count/feedback/activity,
- hand shadow toggle, setup guide Win/Mac,
- state survives navigation away and back,
- desktop 1440 and mobile 390 parity vs legacy,
- Intro/About/Home/Tutors/Reading regression, no console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Audit complete (P2C)
- [ ] Implementation complete
- [ ] Build PASS
- [ ] Behavior PASS
- [ ] Parity PASS
- [ ] Regression PASS
- [ ] Diff review PASS
- [ ] Commit created
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Create writingData.js and learnedData.js, then WritingPage.jsx and writing.css.
