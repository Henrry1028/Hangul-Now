# Current Migration Task

## Task Identity

Milestone ID:

`P3E`

Milestone Name:

`CONVERSATION AUDIT`

Status:

`AUDITING`

Baseline migration-code checkpoint:

`423c3abec2c04881c1ee827a5834e7e446660dcc`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Source-first audit of legacy Conversation (Gemini Live) before implementation.

## Audit Questions

- template (`08b Conversation`, preview/index.html ~2177-2475), CSS,
- live pipeline: mic capture, 16kHz PCM, `/api/live` websocket protocol, 24kHz playback, transcripts, hints/cards,
- session timer (`TUTOR_SESSION_SECONDS`), wrap-up, `/api/session/complete-and-review`, `/api/session/report`, PDF/transcript download, history,
- `cvTrans` translation branch, auth gating, Firestore,
- testability without a microphone (fake media / mocked socket),
- slices.

## Progress Checklist

- [x] Git state reverified
- [ ] Legacy Conversation source located
- [ ] Coupling mapped
- [ ] Bounded slices defined
- [ ] Audit recorded
- [ ] Audit metadata committed and pushed

## Exact Next Action

Read the Conversation template and the live-session handlers (~4975-5450).
