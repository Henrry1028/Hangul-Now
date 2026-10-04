# Current Migration Task

## Task Identity

Milestone ID:

`P3B`

Milestone Name:

`SPEAKING MIGRATION`

Status:

`IN_PROGRESS`

Baseline migration-code checkpoint:

`7e947f0cd4b4c8b03bc81c769cc58b7e5822ba6c`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Migrate Speaking with parity, plus the shared translation toggle hook. Strategy is in MIGRATION_LOG P3A.

## Expected Files

- `frontend/src/data/speakingData.js`, `frontend/src/pages/SpeakingPage.jsx`, `frontend/src/styles/speaking.css` (new)
- `frontend/src/hooks/useTranslationToggle.js`, `frontend/src/hooks/useTutorSpeech.js` (new)
- `frontend/src/pages/ListeningPage.jsx` (uses the shared toggle)
- `frontend/src/App.jsx`

## Required Validation

- build, 390/1440 parity vs legacy (idle and done states),
- record toggle/next/activity XP, native TTS request + fallback, generation (mocked), translation toggle from Speaking (incl. Listening-need fetch), Listening regression,
- regression, no console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Audit complete (P3A)
- [ ] Implementation complete
- [ ] Build PASS
- [ ] Behavior PASS
- [ ] Parity PASS
- [ ] Regression PASS
- [ ] Commit/push

## Exact Next Action

Generate speakingData.js, then hooks, SpeakingPage.jsx, and App wiring.
