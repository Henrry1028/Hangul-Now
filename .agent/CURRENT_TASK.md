# Current Task

## Task Identity

Milestone ID:

`H1`

Milestone Name:

`POST-LAUNCH HARDENING` (user's "권장 후속 작업" list, risk-reviewed)

Status:

`IN_PROGRESS`

Branch:

`hardening/post-launch` (created from `main` after `main` was fast-forwarded to `9f594f2`)

Baseline:

Production = `hangul-now-api-00001-siy` (tag `v1.0.0-react` → `19c1500`), traffic pinned 100%.

## Risk Review Decisions

| # | Item | Decision |
|---|---|---|
| 1 | main fast-forward + tag | DONE: `main` = `9f594f2`; tag `v1.0.0-react` → `19c1500` (production image source) |
| 2 | AGENTS.md / README rewrite | do now (docs) |
| 3 | rate limit + CORS + budget alert | CORS + rate limit now (staging-verified IP handling); budget alert needs a user amount and billing account |
| 4 | server-verified identity on learning/session APIs | do now (live IDOR); ships after staging + user login check |
| 5 | Firestore owner rules | DONE + DEPLOYED (the live DB was in test mode = world-readable/writable, expiring 2026-10-28 → total client outage) |
| 6 | key rotation | NEEDS USER: `Desktop\마이그레이션\훈민정음_마이그레이션.zip` and `훈민정음.zip` contain the real `.env` (Gemini key + Firebase SA key). The Downloads handoff zips are clean. |
| 7 | engines + .nvmrc | do now |
| 8 | unify admin auth + remove client heuristic | do now (ships after user login check) |
| 9 | remove `[migration:*]` logs | do now |
| 10 | preview/ and duplicate cleanup | DEFERRED by its own condition (after 2–4 weeks of stability) |
| 11 | tooling / refactors | tooling now; react-router, modular SDK, and Context split deferred (broad regression risk) |
| 12 | Firestore state + scaling | DEFERRED (feature-sized design) |

## Progress

- [x] 1 main FF + tag
- [x] 5 Firestore rules: 20/20 Rules-API tests, deployed, anonymous read → 403
- [ ] 4 / 8 / 3 / 9 / 7 code changes
- [ ] 2 docs
- [ ] 11 tooling
- [ ] build + local validation → staging → production candidate (`--no-traffic`) → user login check → traffic
