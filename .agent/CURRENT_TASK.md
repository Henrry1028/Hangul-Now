# Current Migration Task

## Task Identity

Milestone ID:

`P3C`

Milestone Name:

`CHAT AUDIT`

Status:

`AUDITING`

Baseline migration-code checkpoint:

`e250f9a651544d7e5f041b7a7c02580afe8918d8`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Source-first audit of legacy Chat before implementation.

## Audit Questions

- template (`04 Chat`, preview/index.html ~1626-1713) and chat CSS,
- per-tutor `msgs` (SEED), unread, typing dots, scroll-to-bottom,
- `/api/chat`, `/api/correction`, chat `/api/translate` (`translateMissingChatMessages`), `trAll`/`trOpen`,
- tutor session timer (`TUTOR_SESSION_SECONDS`), session end/report (`/api/session/complete-and-review`?),
- selectTutor Firestore write, auth/user profile coupling, persistence (`hn-msgs`?),
- slices.

## Progress Checklist

- [x] Git state reverified
- [ ] Legacy Chat source located
- [ ] Coupling mapped
- [ ] Bounded slices defined
- [ ] Audit recorded in MIGRATION_LOG
- [ ] Audit metadata committed and pushed

## Exact Next Action

Read the Chat template and its handlers (sendMessage, corrections, translation, session timer).
