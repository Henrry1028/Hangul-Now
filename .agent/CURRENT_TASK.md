# Current Migration Task

## Task Identity

Milestone ID:

`P9`

Milestone Name:

`PRODUCTION FIRST LAUNCH — CLOUD RUN DIRECT` (user prompt label: P6C)

Status:

`PRODUCTION PUBLIC LAUNCH READY FOR FINAL USER CHECK`

---

## Done

- Manual candidate auth: 13/13 PASS (user).
- Firebase authorized domains: added the 2 production hosts.
- Traffic pinned to `hangul-now-api-00001-siy=100`; `allUsers` invoker granted (2026-10-04T07:42:50Z).
- Post-launch public acceptance PASS (`.agent/PRODUCTION_LAUNCH.md` section 9).

## Exact Next Action

User runs the 4-step final check on https://hangul-now-api-313423647793.asia-northeast3.run.app (`.agent/PRODUCTION_LAUNCH.md` section 10).

- PASS → mark `PRODUCTION FIRST LAUNCH PASS`.
- FAIL → emergency stop per section 11 if critical; otherwise debug the failing step only.

Do not configure a custom domain, deploy Firebase Hosting, raise scaling, or delete staging/preview.
