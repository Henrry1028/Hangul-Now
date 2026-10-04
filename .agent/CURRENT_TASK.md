# Current Migration Task

## Task Identity

Milestone ID:

`P7`

Milestone Name:

`LOCAL/REPOSITORY PRODUCTION CUTOVER (no external deploy)`

Status:

`IN_PROGRESS`

Baseline (pre-cutover) commit:

`3420082c7ea5294f446a02f52432012940689ed8`

Authorization:

User reported the real Google admin auth checklist (CUTOVER_READINESS 8B) as 10/10 PASS and approved the local/repository cutover. NOT authorized: firebase deploy, Cloud Run deploy, image push, DNS, deleting preview/.

## Bounded Plan

- `server.js`: static `preview` → `frontend/dist`; SPA fallback serves `frontend/dist/index.html` for non-`/api` GETs only (unknown `/api/*` no longer returns index.html). Route/middleware order otherwise unchanged; `/api/live` WS is attached to the HTTP server upgrade path and is unaffected.
- `firebase.json`: hosting `public` `preview` → `frontend/dist`; rewrites/ignore unchanged.
- `Dockerfile`: Node 20 frontend build stage; runtime stage unchanged plus `COPY --from` of `frontend/dist`.
- `.dockerignore`: exclude `frontend/node_modules` and `frontend/dist` (host artifacts must not enter the image).
- `preview/` untouched (rollback source).

## Progress Checklist

- [x] Git safety check (3420082, clean, 0 0)
- [x] Edits (server.js, firebase.json, Dockerfile, .dockerignore)
- [x] Node 20.20.2 build → frontend/dist (index-BWIOtno1.js)
- [x] localhost:3000 cutover validation PASS
- [x] Docker build/run validation PASS (local image, not pushed)
- [ ] Rollback documented
- [ ] Commit/push

## Exact Next Action

Commit the cutover source change, push, then document rollback + evidence in CUTOVER_READINESS.
