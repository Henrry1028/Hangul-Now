# Current Migration Task

## Task Identity

Milestone ID:

`P7`

Milestone Name:

`PRODUCTION CUTOVER`

Status:

`BLOCKED`

Blocker:

Production cutover requires explicit user approval (AGENTS.md sections 2, 10, 18). The autonomous migration stopped at `READY FOR PRODUCTION CUTOVER`.

Baseline migration-code checkpoint:

`d67e4e8b38e8780db06b57eba9ea9d87a99a367a`

Expected branch:

`migration/react-vite-modular`

---

## Completed Before This Point

- P4C auth/profile (`a5d3d20`), P5A/P5B admin (`6b9b97b`), P6A final integration with fixes `9b8f4c5`, `17df31a`, P6B `d67e4e8`.
- Full report: `.agent/CUTOVER_READINESS.md`.

## Open Decisions For The User

1. Approve (or not) production cutover per `.agent/CUTOVER_READINESS.md` section 6.
2. Video Class admin preview: legacy shows it to admins; React does not. Confirm it stays hidden after cutover.

## Exact Next Action

None autonomous. On approval: follow `.agent/CUTOVER_READINESS.md` section 6 (Dockerfile frontend build step, `server.js` static/fallback → `frontend/dist`, `firebase.json` public → `frontend/dist`, staging smoke test, promote). Do not start without approval.
