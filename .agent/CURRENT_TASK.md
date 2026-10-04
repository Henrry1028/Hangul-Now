# Current Migration Task

## Task Identity

Milestone ID:

`P8`

Milestone Name:

`EXTERNAL DEPLOYMENT`

Status:

`BLOCKED`

Blocker:

External deployment (firebase deploy, Cloud Run deploy, image push, DNS) is not authorized. It needs a separate explicit approval.

Baseline:

`6d94bad8f30ca9d6405d0767c81080e700966081` (`build: switch production frontend to React Vite`). Pre-cutover rollback target: `3420082c7ea5294f446a02f52432012940689ed8`.

Expected branch:

`migration/react-vite-modular`

---

## Completed Before This Point

- P7 local/repository cutover: Express, Firebase Hosting config, and the Docker image now serve `frontend/dist`. localhost:3000 and Docker were validated (CUTOVER_READINESS section 9). `preview/` is unchanged.

## Exact Next Action

None autonomous. On deployment approval:

1. Build the frontend with Node 20.
2. Deploy to staging.
3. Re-run the 8B checklist and section 6 step 5 smoke tests.
4. Promote.

Keep `ADMIN_EMAILS` configured. Rollback is in CUTOVER_READINESS section 7. Do not delete `preview/`; legacy retirement is a later milestone, after stabilization.
