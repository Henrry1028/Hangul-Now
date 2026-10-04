# Current Migration Task

## Task Identity

Milestone ID:

`P3D`

Milestone Name:

`CHAT MIGRATION`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`e250f9a651544d7e5f041b7a7c02580afe8918d8`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Migrate Chat with parity. Strategy is in MIGRATION_LOG P3C.

## Expected Files

- `frontend/src/data/chatData.js`, `frontend/src/pages/ChatPage.jsx`, `frontend/src/styles/chat.css`, `frontend/src/hooks/useChat.js` (new)
- `frontend/src/App.jsx`

## Required Validation

- build, 390/1440 parity of the seeded chat vs legacy,
- send (mocked /api/chat + /api/correction), pending/typing, reply, correction card, failure fallback, activity XP,
- all/per-message translation (mocked /api/translate), quick replies, Enter send, tutor switch + unread,
- one live /api/chat + /api/correction call,
- regression, no console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Audit complete (P3C)
- [x] Implementation complete
- [x] Build PASS
- [x] Behavior PASS (mocked scenario identical to legacy; live /api/chat + /api/correction PASS)
- [x] Parity PASS (390x844/390x700/1440x900/1180x700 identical with shell-height emulation)
- [x] Regression PASS
- [ ] Commit/push

## Exact Next Action

Generate chatData.js from legacy, then useChat.js, ChatPage.jsx, chat.css, and App wiring.
