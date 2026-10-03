# Current Migration Task

## Task Identity

Milestone ID:

`P1N`

Milestone Name:

`READING AI GENERATION MIGRATION`

Status:

`NOT_STARTED`

Baseline migration-code checkpoint:

`11e18eff4c1897e72f28f26b6b657a4e96456e14`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- clean after the P1M audit metadata checkpoint,
- checkpoint `11e18eff4c1897e72f28f26b6b657a4e96456e14` remains an ancestor,
- remote ahead remains zero.

---

## Objective

Implement the bounded P1M `OPTION B` strategy in the React/Vite Reading page while preserving legacy behavior and visual parity.

## Included Scope

- shared beginner/intermediate/advanced Reading level state,
- `새로 생성` / `New material` action,
- `POST /api/content/generate`,
- one retry after a network failure,
- loading and error UI,
- guest `hn-learned` topic history and `seenTopics`,
- generated title and subtitle,
- generated paragraphs and English translations,
- generated glossary selection, save toggle, and word/example TTS,
- generated grammar,
- reset selected word and translation visibility on successful generation,
- preserve static full-passage TTS quirk.

## Explicitly Excluded

- generated Quiz rendering,
- Reading Quiz answer state,
- XP/activity log mutation,
- Firebase/auth shell integration,
- backend changes,
- dependency additions.

## Required Validation

- build,
- successful generated response rendering,
- request payload for all three levels,
- same-level selection behavior,
- level-change auto-generation,
- repeated-action blocking,
- one network retry,
- HTTP/API error UI,
- generated glossary and grammar rendering,
- translation reset and toggle,
- selected-word reset,
- guest seen-topic persistence,
- static full-passage TTS quirk,
- desktop 1440px,
- mobile 390px,
- Intro/About/Tutors/Reading regression,
- legacy source isolation,
- clean console except documented favicon 404.

## Progress Checklist

- [ ] Git state reverified
- [ ] Status set to IN_PROGRESS
- [ ] Implementation complete
- [ ] Build PASS
- [ ] Browser/runtime success path PASS
- [ ] Browser/runtime error and retry paths PASS
- [ ] Responsive parity PASS
- [ ] Regression PASS
- [ ] Diff review PASS
- [ ] Commit created
- [ ] Remote divergence checked
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Reverify Git after committing the P1M audit checkpoint, then mark P1N `IN_PROGRESS` and implement the bounded Reading AI generation scope in `frontend/src/pages/ReadingPage.jsx` and `frontend/src/styles/reading.css`.
