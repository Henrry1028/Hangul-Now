# HangulNow React + Vite Migration — Multi-Agent Operating Rules

> **Status: the React + Vite migration is COMPLETE and production is LIVE on Cloud Run.**
> Sections 1 and 4–19 describe how the migration was run and still apply as working discipline
> (Git safety, state files, parity mindset). Sections 2–3 describe the **current** architecture.
> Product rules for new development are in `README.md`.

## 1. Mission

Migrate the existing HangulNow legacy SPA from:

- `preview/index.html`

to the isolated React + Vite frontend:

- `frontend/`

The goal is **behavioral and visual parity first**.

> PARITY FIRST.

This is not a redesign project and not a product-improvement project.

During migration:

- preserve existing behavior,
- preserve existing labels,
- preserve layout and responsive behavior,
- preserve current API contracts,
- preserve legacy quirks unless they block safe migration,
- do not opportunistically refactor unrelated domains.

Post-migration cleanup and UX improvement are separate tasks.

---

## 2. Runtime Architecture (post-migration — current)

The migration is **COMPLETE** and production is **LIVE** (see `.agent/MIGRATION_STATE.md`).

### Product source of truth

- **Frontend: `frontend/src` (React 18 + Vite 5) is the only product frontend.**
- Build output `frontend/dist` (not committed) is served by Express (`server.js`) together with `/api/*` and the WebSocket `/api/live`.
- `preview/` (legacy CDN UMD SPA) is a **rollback-only archive**. Do not edit it; edits never reach users.

### Runtimes

| Purpose | Address | How |
|---|---|---|
| Development (hot reload) | `http://localhost:5173` | `npm start` (API on 3000) + `cd frontend && npm run dev` (Vite proxies `/api` and `/api/live` to 3000) |
| Production-like local | `http://localhost:3000` | `cd frontend && npm run build` (Node 20/22), then `npm start` |
| Staging | `https://hangulnow-staging-313423647793.asia-northeast3.run.app` | Cloud Run `hangulnow-staging` |
| Production | `https://hangul-now-api-313423647793.asia-northeast3.run.app` | Cloud Run `hangul-now-api`; traffic pinned to a verified revision |

### Critical rules

- Build the frontend with **Node 20 or 22** (`.nvmrc`). Node 24 silently stops Vite builds.
- Deploy only via `git archive` → Cloud Build → `gcloud run deploy --image … --no-traffic --tag …` → verify the tag URL → `update-traffic`. Never use `gcloud run deploy --source .` on Windows (it corrupts Korean asset filenames).
- Keep Cloud Run **max instances = 1** until in-memory state (`reviewJobs`, Video Class data, rate-limit counters) is externalized.
- Do not deploy Firebase Hosting for the app (it cannot proxy the `/api/live` WebSocket). Never run a bare `firebase deploy`; rules only: `firebase deploy --only firestore:rules`.
- Production deployment, traffic shifts, custom domains, and key rotation need explicit user approval.
- The full developer rule set lives in `README.md` ("개발 규칙").

---

## 3. Current Checkpoint

- Production release: tag **`v1.0.0-react`** → `19c1500` (application code `6d94bad`), Cloud Run revision `hangul-now-api-00001-siy`.
- `main` contains the full migration history (fast-forwarded to `9f594f2`). New work branches from `main`.
- Post-launch hardening (milestone `H1`) is on branch `hardening/post-launch`; status and decisions are in `.agent/CURRENT_TASK.md`.

Historical migration checkpoints (`11e18ef…` etc.) and the per-domain status are kept in `.agent/MIGRATION_LOG.md`. The live status is:

`.agent/MIGRATION_STATE.md`

---

## 4. Multi-Agent Source of Truth

Agents must not rely on chat-session memory.

Authoritative information is, in order:

1. Git repository state
2. `.agent/MIGRATION_STATE.md`
3. `.agent/CURRENT_TASK.md`
4. `.agent/MIGRATION_LOG.md`
5. `.agent/REACT_VITE_MIGRATION.md`
6. actual source code
7. this `AGENTS.md`

If state files and Git disagree:

**Git wins, but do not immediately modify anything.**

Stop and produce a discrepancy report.

Never guess which agent was correct.

---

## 5. Mandatory Handoff Validation

Whenever a new agent takes over — Codex, Claude Code, Gemini, or another coding agent — the first action is always handoff validation.

Run:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -10 --oneline --decorate
git fetch origin
git rev-list --left-right --count origin/migration/react-vite-modular...migration/react-vite-modular
```

Then read:

```text
AGENTS.md
.agent/PLANS.md
.agent/MIGRATION_STATE.md
.agent/CURRENT_TASK.md
.agent/MIGRATION_LOG.md
.agent/REACT_VITE_MIGRATION.md
```

A new agent must answer internally:

- Is the branch correct?
- Is the recorded last verified migration checkpoint an ancestor of current HEAD?
- Are all commits after that checkpoint explainable as orchestration metadata and/or logged migration milestones?
- Is the working tree expected to be clean or intentionally dirty?
- Is there an active `IN_PROGRESS` milestone?
- Which validations are already complete?
- What is the exact next required action?
- Is remote ahead of local?
- Are there unexpected files or commits?

Only after this validation may work continue.

---

## 6. Git Safety Protocol

### Forbidden commands

Never use:

```bash
git pull
git merge
git rebase
git reset --hard
git push --force
git push --force-with-lease
```

Do not rewrite published history.

### Before starting a new milestone

Verify:

- correct branch,
- the recorded migration checkpoint is an ancestor of current HEAD,
- every later commit is explainable by the migration log/state,
- expected working tree state,
- remote ahead = `0`.

Useful commands include:

```bash
git merge-base --is-ancestor <recorded-checkpoint> HEAD
git log --oneline <recorded-checkpoint>..HEAD
git diff --name-status <recorded-checkpoint>..HEAD
```

If the previous agent stopped mid-milestone with an intentionally dirty tree, resume that milestone. Do not discard the changes.

### Before commit

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff
```

Commit only the bounded milestone.

### Before push

Run:

```bash
git fetch origin
git rev-list --left-right --count origin/migration/react-vite-modular...migration/react-vite-modular
```

Push only if:

- remote ahead = `0`,
- local commits are exactly the intended milestone commits,
- no unrelated changes exist.

### After push

Fetch again and verify final divergence is:

`0 0`

---

## 7. Migration Method

For each domain or slice:

1. Verify Git and handoff state.
2. Inspect legacy source.
3. Determine actual behavior.
4. Identify state, APIs, persistence, auth, audio, realtime, and cross-domain coupling.
5. Classify risk.
6. Define the smallest useful bounded scope.
7. Implement parity.
8. Build.
9. Run browser/runtime validation where applicable.
10. Compare with legacy behavior.
11. Run regression on already migrated domains.
12. Inspect the diff.
13. Repair issues inside the bounded scope.
14. Re-run validation until passing.
15. Commit.
16. Fetch and verify divergence.
17. Push.
18. Update migration state and log.
19. Select the next milestone.
20. Continue automatically unless a hard blocker exists.

---

## 8. Risk Policy

### LOW risk

Audit + implementation + validation + commit/push may be done in one milestone.

Typical examples:

- static presentation,
- local-only interaction,
- no auth,
- no persistence,
- no audio/realtime,
- no mutation.

### MEDIUM / HIGH risk

Perform a source-first audit before implementation.

Typical risk signals:

- authentication,
- authorization,
- Firebase,
- backend mutation,
- learning-history mutation,
- XP/activity state,
- audio lifecycle,
- speech synthesis,
- realtime behavior,
- complex shared state,
- AI generation with multiple generated submodels,
- cross-domain shared helpers.

If the audit produces a clear bounded strategy, continue into implementation unless the current plan explicitly requires a separate verification checkpoint.

---

## 9. Automatic Continuation Rule

Do not stop after every successful milestone.

A milestone report is an internal checkpoint, not a reason to wait for the user.

Continue automatically when all of the following are true:

- Git state is safe,
- scope is clear,
- no product decision is required,
- no destructive action is required,
- tests pass or can be repaired safely,
- the next milestone is defined in the roadmap.

Stop only for a hard blocker.

---

## 10. Hard Blockers

Stop and produce a `BLOCKER REPORT` only when safe autonomous continuation is impossible.

Examples:

- required credentials are unavailable,
- remote contains unexpected commits,
- working tree contains unexplained user changes,
- destructive data migration would be necessary,
- an irreversible production action is required,
- requirements conflict materially,
- source-of-truth cannot be established,
- authorization/security behavior is ambiguous,
- a required external service cannot be accessed,
- production cutover approval is required.

A blocker report must include:

- current branch,
- current HEAD,
- expected HEAD,
- working tree,
- remote divergence,
- active milestone,
- what has already been completed,
- exact blocker,
- safest recovery options.

---

## 11. Self-Repair Rule

If build, parity, browser validation, or regression fails:

1. diagnose,
2. fix only the active bounded scope,
3. re-run the failed validation,
4. re-run affected regression,
5. continue when passing.

Do not ask the user to do routine debugging.

Do not expand scope merely because an adjacent issue was noticed.

---

## 12. UI Preservation Rules

Preserve:

- layout,
- navigation behavior,
- labels,
- colors,
- spacing,
- fonts,
- font sizes,
- weights,
- line heights,
- border radius,
- shadows,
- responsive breakpoints,
- animations,
- hover behavior,
- keyboard behavior,
- API behavior,
- Firebase behavior.

Migration is not the phase to “clean up” odd legacy wording.

---

## 13. Backend and Security Boundaries

Already-completed security work should not be reopened unless a real regression is found.

Established principles include:

- verified Firebase ID token as authoritative identity where auth applies,
- no email fallback for booking ownership,
- public tutor API must not expose `email` or `tutorUid`,
- booking state-machine constraints remain intact.

Do not loosen auth or privacy contracts to simplify frontend migration.

---

## 14. Video Class Product Policy

Video Class / 화상 수업 is intentionally hidden from general users.

Do not expose:

- Video Class navigation,
- booking CTA,
- booking UI,
- Meet buttons,
- availability UI,
- public Video Class routes.

Backend readiness may exist.

The following remain deferred:

- Persistent Tutor Storage
- Tutor Browser UI
- Student Video Class E2E
- Video Class Public Release

---

## 15. Dependency Policy

Do not add dependencies unless existing platform APIs or project dependencies are insufficient.

Prefer:

- React built-ins,
- native `fetch`,
- `AbortController`,
- browser APIs,
- existing project utilities.

Do not introduce a new global state-management library during migration.

---

## 16. State-File Discipline

The agent performing work must maintain:

- `.agent/MIGRATION_STATE.md`
- `.agent/CURRENT_TASK.md`
- `.agent/MIGRATION_LOG.md`

### Before implementation

Set current milestone to:

`IN_PROGRESS`

Record:

- baseline HEAD,
- expected files,
- intended scope,
- first required action.

### During long work

Update `CURRENT_TASK.md` after meaningful checkpoints such as:

- audit complete,
- implementation complete,
- build complete,
- browser test complete,
- regression complete,
- commit complete,
- push complete.

This is essential for agent failover.

### After milestone completion

Set:

`COMPLETE`

Record:

- final commit hash,
- validation results,
- known quirks,
- next milestone.

Then reset `CURRENT_TASK.md` for the next task.

---

## 17. Agent Failover Rule

If the current agent hits a limit, crashes, or is replaced:

Do not attempt to transfer hidden reasoning.

Instead ensure, whenever possible, that:

- working tree reflects actual progress,
- `CURRENT_TASK.md` records the exact resume point,
- completed validations are recorded,
- incomplete validations are clearly marked.

The next agent must resume from repository state, not restart the task.

---

## 18. Completion Definition

Code migration is considered complete only when:

- all intended public frontend domains are migrated,
- Reading is fully migrated,
- Home is migrated,
- Writing is migrated,
- Listening is migrated,
- Record is migrated,
- Speaking is migrated,
- Chat is migrated,
- Conversation is migrated,
- Global Header/navigation shell is migrated,
- Admin is migrated,
- build passes,
- desktop/mobile parity passes,
- API integrations pass,
- auth behavior passes,
- audio lifecycle tests pass where applicable,
- no unexpected console/page errors remain,
- final regression passes,
- cutover plan is validated.

At that point stop at:

`READY FOR PRODUCTION CUTOVER`

Do not perform production cutover without explicit user approval.

---

## 19. Final Safety Principle

When uncertain:

- inspect source,
- inspect Git,
- inspect state files,
- preserve parity,
- prefer the smaller safe change,
- never guess destructive actions.
