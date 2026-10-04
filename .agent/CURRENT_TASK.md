# Current Migration Task

## Status

`COMPLETE` — **HANGULNOW REACT + VITE MIGRATION — COMPLETE**

There is no active migration implementation task.

## Final State

- Production: **LIVE** on Cloud Run direct since 2026-10-04T07:42:50Z, https://hangul-now-api-313423647793.asia-northeast3.run.app.
- Service `hangul-now-api` (project `hnageul-copilot-dev-918`, region `asia-northeast3`), revision `hangul-now-api-00001-siy` at 100%.
- Image `…/hangulnow-staging@sha256:ecf22296054974fb08c4209302ddaa6048eac009783d261324630d6e3be6ace2` (app code `6d94bad`).
- Runtime: 1 vCPU, 512 MiB, concurrency 80, timeout 3600 s, min 0, max 1, SA `hangul-now-api-runtime`, secrets `GEMINI_API_KEY` / `FIREBASE_SERVICE_ACCOUNT_KEY` / `ADMIN_EMAILS`.
- Final manual production verification: real Google login, authorized domain, `/api/admin/check` 200, Admin console, Video Class, logout isolation, re-login: **PASS**, with no unexpected errors.
- Preserved:
  - staging `hangulnow-staging`
  - `preview/`
  - candidate tag
  - rollback path (`.agent/PRODUCTION_LAUNCH.md` section 11)
- Firebase Hosting: not deployed. Custom domain/DNS: not configured.

## Known Post-Launch Limitations (not fixed; future work)

1. Video Class (admin preview) data is in-memory and **not durable**.
2. Post-conversation review jobs (`reviewJobs`) live in process memory and are polled by the client.
3. Production `max-instances=1` is intentional and temporary until mutable state is externalized.
4. `min-instances=0`: cold starts can occur.
5. In-memory state disappears after idle shutdown, restart, or redeploy.
6. Cloud Run request/WebSocket timeout is 3600 s.
7. Sessions beyond 60 minutes would need reconnect support (not implemented).
8. Firebase Hosting is not the production frontend (not deployed).
9. Production uses the Cloud Run URL directly.
10. No custom domain is configured.
11. Legacy `preview/` remains as a rollback/reference source.
12. Staging `hangulnow-staging` remains available.

## Recommended Next Phase

`P7 POST-LAUNCH STABILITY MONITORING`: **NOT STARTED**. Do not begin without an explicit instruction.

Later candidates, each a separate milestone:

- externalize review jobs and Video Class state (then raise max instances)
- custom domain
- legacy retirement (`preview/`)
- Phase 11 cleanup (migration console instrumentation)
