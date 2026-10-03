# Current Migration Task

## Task Identity

Milestone ID:

`P1N`

Milestone Name:

`READING AI GENERATION MIGRATION`

Status:

`IN_PROGRESS`

Baseline migration-code checkpoint:

`11e18eff4c1897e72f28f26b6b657a4e96456e14`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- baseline HEAD `f32395a4c891d0644e30e3cc33a0c410b6805040`,
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

- [x] Git state reverified
- [x] Status set to IN_PROGRESS
- [x] Implementation complete
- [x] Build PASS
- [x] Browser/runtime success path PASS
- [x] Browser/runtime error and retry paths PASS
- [x] Responsive parity PASS
- [x] Regression PASS
- [x] Diff review PASS
- [ ] Commit created
- [ ] Remote divergence checked
- [ ] Push complete
- [ ] Post-push divergence `0 0`

## Exact Next Action

Commit the bounded P1N files, fetch and verify divergence, push, then record the completed code checkpoint and select P1O.

## Validation Checkpoint

- Standard `npm run build` PASS under the repository's existing Node 20 verification image (`vite v5.4.21`, 40 modules).
- Host Node `v24.11.1` transforms all modules but exits silently during Vite 5 minification; unminified host build and direct esbuild JS/CSS minification PASS, so this is recorded as a host-toolchain issue rather than a source failure.
- Live `/api/content/generate` through the Vite proxy PASS in 4.6 seconds with real generated title, paragraphs, translations, glossary, and grammar.
- Mocked beginner/intermediate/advanced payloads PASS with `userId: null` and expected `seenTopics`.
- Same-level no-op, repeated-action blocking, one network retry, HTTP 503 error, and API error response PASS.
- Generated selection and translation reset PASS.
- Guest `hn-learned` topic persistence PASS.
- Generated glossary, save model compatibility, word/example model, and grammar rendering PASS.
- Static full-passage TTS quirk PASS after generation.
- Desktop 1440x900 and mobile 390x844 PASS with no horizontal overflow.
- 520/521 speech-label breakpoint PASS.
- Intro, About, Tutors, and Reading smoke regression PASS.
- No Vite error overlay or runtime exception; only the known `favicon.ico` 404 remains.
