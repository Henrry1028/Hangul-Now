# Current Migration Task

## Task Identity

Milestone ID:

`P2F`

Milestone Name:

`LISTENING MIGRATION`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`e562a11c922e2af0d253d844710e3f9846ff22af`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P2D `e562a11` is an ancestor,
- metadata commits `docs: ... listening audit` follow it,
- remote ahead is zero.

---

## Objective

Migrate Listening with legacy parity. Strategy is in MIGRATION_LOG P2E.

## Expected Files

- `frontend/src/data/listeningData.js` (new)
- `frontend/src/pages/ListeningPage.jsx` (new)
- `frontend/src/styles/listening.css` (new)
- `frontend/src/App.jsx` (route + listening/translation/studyLevel state)
- `frontend/src/pages/ReadingPage.jsx` (studyLevel via props)

## Required Validation

- build,
- static render parity at 390/1440 vs legacy,
- play (live `/api/tts` once), pause/resume, speed, progress, provider label, device fallback (forced TTS failure), unmount stop,
- script toggle, translation toggle (+ `/api/translate` for missing lines),
- quiz reveal/marks/XP, dictation Enter/normalize/focus/XP,
- generation (mocked) replaces script/questions/dictations and resets state; level change triggers generation; shared studyLevel with Reading,
- regression, no console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Audit complete (P2E)
- [x] Implementation complete
- [x] Build PASS (Node 20; Vite >500kB chunk advisory only)
- [x] Behavior PASS (mocked scenarios identical to legacy; live /api/tts Gemini multi-speaker PASS)
- [x] Parity PASS (390: 111/111 identical; 1440: styles/heights identical, 3rd dictation wraps from shell width)
- [x] Regression PASS
- [x] Diff review PASS
- [ ] Commit created
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Create listeningData.js (verbatim SCRIPT/LQ/DICTATIONS + labels), listening.css (legacy 60-68 + 468-479), then ListeningPage.jsx and App wiring.
