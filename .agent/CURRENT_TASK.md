# Current Migration Task

## Task Identity

Milestone ID:

`P2E`

Milestone Name:

`LISTENING AUDIT`

Status:

`AUDITING`

Baseline migration-code checkpoint:

`e562a11c922e2af0d253d844710e3f9846ff22af`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P2D checkpoint `e562a11` is an ancestor,
- only `.agent/*` metadata after it,
- remote ahead is zero.

---

## Objective

Source-first audit of legacy Listening before any implementation.

## Audit Questions

- template (`05 Listening`, preview/index.html ~1716-1777) and listening CSS,
- render data, state fields, handlers,
- audio lifecycle (`listeningAudio`, `stopListeningAudio`, playback speed), TTS endpoints,
- AI generation (`genListening`), dictation, questions, translation toggle,
- activity/XP and learned-topic coupling,
- smallest safe implementation slices.

## Progress Checklist

- [x] Git state reverified
- [ ] Legacy Listening source located
- [ ] State/persistence/API/audio coupling mapped
- [ ] Bounded slices defined
- [ ] Audit recorded in MIGRATION_LOG
- [ ] Audit metadata committed and pushed

## Exact Next Action

Read the Listening template and its render data, then map audio and API handlers.
