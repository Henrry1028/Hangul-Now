# Current Migration Task

## Task Identity

Milestone ID:

`P9`

Milestone Name:

`PRODUCTION FIRST LAUNCH — CLOUD RUN DIRECT` (user prompt label: P6C)

Status:

`BLOCKED` on user action: PRODUCTION CANDIDATE READY FOR MANUAL AUTH CHECK

Authorization:

The user approved the production first launch after staging real-auth PASS. Cloud Run direct only. No Firebase Hosting deploy, no DNS/custom domain. Keep staging and preview/.

Baseline:

HEAD `caff194` (clean, 0 0). Application code = `6d94bad` (no non-.agent changes since). Image = staging digest `sha256:ecf22296054974fb08c4209302ddaa6048eac009783d261324630d6e3be6ace2` (built from git archive of 19c1500), reused without a rebuild.

## Decisions

- Cloud Run rejects `--no-traffic` when *creating* a service, because the first revision always takes 100%. To keep zero public exposure, `hangul-now-api` is created **private** (no allUsers invoker) with tag `candidate`. Automated tests use an identity token in `X-Serverless-Authorization`. Real-auth manual check runs through `gcloud run services proxy --tag candidate` on localhost, which is already a Firebase authorized domain. "Traffic migration" = granting the public invoker after auth PASS.
- Dedicated runtime SA `hangul-now-api-runtime` (no project roles; secretAccessor on the 3 hn-staging-* secrets only). The default compute SA has project Editor.
- max-instances=1: in-memory `reviewJobs` (polled), Video Class tutors/bookings, and the local fallback stores are per-process. min=0, cpu 1, 512Mi, concurrency 80, timeout 3600.

## Progress

- [x] Repo + staging health verified
- [x] Runtime SA created and secret access granted
- [x] Deploy private candidate: `hangul-now-api-00001-siy`, tag `candidate`, staging digest, runtime SA, 3600 s, max 1
- [x] Automated candidate acceptance PASS (identity-token curl/WSS + browser sweep via the authenticated localhost proxy; logs clean)
- [ ] Manual real-auth (user): `.agent/PRODUCTION_LAUNCH.md` section 5
- [ ] Launch (authorized domains, pin traffic, public invoker) + post-launch acceptance: section 6, only after manual PASS

## Exact Next Action

User runs `.agent/PRODUCTION_LAUNCH.md` section 5 and reports PASS/FAIL. On PASS the agent executes section 6. Do not grant `allUsers` before that.
