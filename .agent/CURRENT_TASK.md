# Current Task

## Task Identity

Milestone ID:

`H1`

Milestone Name:

`POST-LAUNCH HARDENING`

Status:

`COMPLETE` (items 6 and the budget alert need user decisions; 10–12 deferred)

Production:

Revision `hangul-now-api-00003-cis` at 100% since 2026-10-04T10:47:03Z (release `v1.1.0` → `b2274a4`). The previous revision `hangul-now-api-00001-siy` stays deployed at 0% for instant rollback.

## Results

| # | Item | Result |
|---|---|---|
| 1 | main fast-forward + release tag | DONE: `main` fast-forwarded (no merge commit); tags `v1.0.0-react` → `19c1500`, `v1.1.0` → `b2274a4` |
| 2 | AGENTS.md §2–3 + README | DONE: README rewritten (the old deploy section used `--source .` and a bare `firebase deploy`) |
| 3 | rate limit + CORS + budget alert | DONE: CORS allowlist + per-uid/IP rate limits (verified on Cloud Run: forged XFF can't bypass, buckets per client). **Budget alert NOT done** (needs billing account + amount from the user). |
| 4 | server-verified identity | DONE: learning/*, session/list, session/report, content/generate, chat, correction, coaching, complete-and-review (IDOR closed; guests unaffected) |
| 5 | Firestore owner rules | DONE + DEPLOYED: the live DB was test mode (world-readable/writable) and would have shut out all clients on 2026-10-28 |
| 6 | key rotation | **NEEDS USER**: `Desktop\마이그레이션\훈민정음_마이그레이션.zip` and `훈민정음.zip` contain the real `.env` (Gemini key + Firebase SA key) |
| 7 | engines + .nvmrc | DONE |
| 8 | unify admin auth, remove client heuristic | DONE: `requireAdmin` in authMiddleware via adminPolicy; `GET /api/admin/status`; `?admin=1`/email heuristic removed |
| 9 | remove `[migration:*]` logs | DONE |
| 10 | preview/ and duplicate cleanup | DEFERRED by its own condition (2–4 weeks of stability) |
| 11 | tooling / refactors | Tooling DONE (ESLint, Vitest 11 tests, Playwright smoke 6 tests; lint found + fixed a stale userId bug). Router, modular SDK, and Context split DEFERRED (broad regression risk). |
| 12 | Firestore state + scaling | DEFERRED (feature-sized design) |

## Verification Summary

- Local, staging, and the production tag URL were each checked with a throwaway Firebase test user holding **real ID tokens** (normal + admin claim), then deleted:
  - own-data writes and reads OK; cross-user access closed
  - `admin/status` and `check` correct; dashboard 200
- Real Firebase SDK browser run (`signInWithCustomToken`):
  - tokens attached to generate and chat
  - admin UI only from the server answer
  - Video Class and console work for the admin claim
  - clean sign-out
- Playwright smoke 6/6 on local, staging, and production. Vitest 11/11. ESLint 0 errors.
- Production after the shift: new bundle, health/tutors 200, IDOR closed, WSS open, Google popup with no domain error, 0 5xx, 0 ERROR.

## Exact Next Action

User decisions:

1. Key rotation (item 6).
2. Budget alert amount (item 3).
3. A quick real-admin login on production for confirmation (rollback below if anything is off).

Rollback:

`gcloud run services update-traffic hangul-now-api --to-revisions hangul-now-api-00001-siy=100 --region asia-northeast3 --project hnageul-copilot-dev-918`
