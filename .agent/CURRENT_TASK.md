# Current Migration Task

## Task Identity

Milestone ID:

`P7`

Milestone Name:

`PRODUCTION CUTOVER`

Status:

`BLOCKED`

Blockers:

1. Real Google sign-in has not been exercised. The user must run `.agent/CUTOVER_READINESS.md` section 8B (MANUAL TEST REQUIRED).
2. Production cutover requires explicit user approval (AGENTS.md sections 2, 10, 18).

Baseline migration-code checkpoint:

`6ab4395cad21d1b0a7832a821ea5803d946fdef9`

Expected branch:

`migration/react-vite-modular`

---

## Completed Before This Point

- P6C final pre-cutover gate: admin-only Video Class preview preserved with server-verified gating (`6ab4395`); access matrix, legacy parity, build, and 88-run regression PASS.
- Earlier: P4C `a5d3d20`, P5B `6b9b97b`, P6A fixes `9b8f4c5`, `17df31a`, P6B `d67e4e8`.

## Exact Next Action

None autonomous. When the user reports the 8B checklist result:

- PASS → mark READY FOR PRODUCTION CUTOVER and wait for approval, then follow section 6.
- FAIL → debug only the failing auth step (bounded `fix:`), revalidate, and re-run the checklist.

Do not modify server.js static serving, firebase.json, or the Dockerfile before approval.
