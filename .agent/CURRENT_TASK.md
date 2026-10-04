# Current Migration Task

## Task Identity

Milestone ID:

`P3F`

Milestone Name:

`CONVERSATION MIGRATION`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`423c3abec2c04881c1ee827a5834e7e446660dcc`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Migrate Conversation (Gemini Live) with parity. Strategy is in MIGRATION_LOG P3E.

## Expected Files

- `frontend/src/data/conversationData.js`, `frontend/src/pages/ConversationPage.jsx`, `frontend/src/styles/conversation.css`, `frontend/src/hooks/useConversation.js` (new)
- `frontend/src/hooks/useTranslationToggle.js` (cvTrans branch), `frontend/src/App.jsx`

## Required Validation

- build, idle parity 390/1440 (tutor + roleplay modes),
- scripted fake mic + fake WebSocket session identical to legacy: start message, ready/live, transcript partials + flush, cards, hints, mute, stop → turns, history, activity, review job (mocked), report PDF (mocked), transcript download, delete,
- translation toggle with cvTrans,
- one live `/api/live` smoke if feasible,
- regression, no console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Audit complete (P3E)
- [x] Implementation complete
- [x] Build PASS (true production build: NODE_ENV=production, dev hook stripped)
- [x] Behavior PASS (fake mic + fake WS scripted sessions identical to legacy; live /api/live PASS)
- [x] Parity PASS (idle 390 identical tutor/roleplay; 1440 shell-width wraps only)
- [x] Regression PASS
- [ ] Commit/push

## Exact Next Action

Write conversationData.js, useConversation.js, ConversationPage.jsx, conversation.css; extend useTranslationToggle; wire App.
