# HangulNow Autonomous Migration Execution Plan

## Purpose

This file defines how any coding agent continues the React + Vite migration autonomously.

It is agent-neutral and applies to Codex, Claude Code, Gemini, or another compatible coding agent.

---

## 1. Standard Milestone Lifecycle

Every milestone follows:

```text
HANDOFF VALIDATION
↓
LEGACY SOURCE DISCOVERY
↓
DEPENDENCY / RISK AUDIT
↓
BOUNDED SCOPE
↓
MARK CURRENT_TASK = IN_PROGRESS
↓
IMPLEMENT
↓
BUILD
↓
BROWSER / RUNTIME VALIDATION
↓
PARITY CHECK
↓
REGRESSION
↓
SELF-REVIEW
↓
FIX IF REQUIRED
↓
REVALIDATE
↓
DIFF REVIEW
↓
COMMIT
↓
FETCH
↓
DIVERGENCE CHECK
↓
PUSH
↓
POST-PUSH VERIFY
↓
UPDATE MIGRATION_STATE
↓
APPEND MIGRATION_LOG
↓
SELECT NEXT MILESTONE
↓
CONTINUE
```

A successful milestone does not require user confirmation.

---

## 2. New-Agent Resume Lifecycle

Whenever a different agent takes over:

```text
READ AGENTS.md
↓
READ .agent/*
↓
CHECK GIT
↓
VERIFY RECORDED MIGRATION CHECKPOINT IS AN ANCESTOR OF HEAD
↓
INSPECT/EXPLAIN COMMITS AFTER THE CHECKPOINT
↓
CHECK CURRENT_TASK
↓
CHECK DIRTY/CLEAN EXPECTATION
↓
VERIFY REMOTE DIVERGENCE
↓
RESUME EXACT NEXT UNFINISHED ACTION
```

Do not restart a milestone merely because the previous agent was different.

---

## 3. Milestone Status Model

Allowed milestone states:

- `NOT_STARTED`
- `AUDITING`
- `IN_PROGRESS`
- `VALIDATING`
- `READY_TO_COMMIT`
- `COMMITTED_NOT_PUSHED`
- `COMPLETE`
- `BLOCKED`

Use these exact values in `CURRENT_TASK.md`.

---

## 4. Checkpoint Frequency

For failover resilience, update `CURRENT_TASK.md` after each major checkpoint:

1. audit complete,
2. code implementation complete,
3. build result,
4. browser validation result,
5. regression result,
6. diff review result,
7. commit hash,
8. push result.

Do not wait until the entire milestone is complete before recording progress.

---

## 5. Audit Requirements

For each new domain determine:

### Source
- legacy lines/components/methods,
- data sources,
- static vs dynamic behavior.

### State
- local state,
- app/global state,
- refs,
- persistence.

### APIs
- endpoint,
- method,
- request,
- response,
- auth,
- error behavior.

### Coupling
- Firebase,
- AI,
- TTS,
- XP,
- history,
- learning records,
- shared helpers,
- navigation,
- admin/auth.

### Runtime
- desktop,
- mobile,
- cleanup,
- repeated actions,
- error path.

---

## 6. Implementation Rules

Implementation must:

- preserve parity,
- stay within bounded scope,
- avoid unrelated refactors,
- avoid redesign,
- avoid unnecessary dependencies,
- avoid changing backend contracts unless absolutely required,
- leave legacy source unchanged unless the milestone explicitly requires a backend-compatible change.

---

## 7. Validation Matrix

At minimum, consider:

### Build
```bash
cd frontend
npm run build
```

### Git
```bash
git diff --check
git status --short
```

### Browser
When relevant:

- desktop 1440px,
- mobile 390px,
- responsive breakpoint behavior,
- console errors,
- page errors,
- failed requests,
- asset 404s,
- actual API request payload,
- response handling,
- loading/playing/error states,
- cleanup on navigation/unmount.

### Regression
Recheck already migrated domains:

- Intro
- About
- Tutors
- Reading completed slices

Expand this list as more domains are migrated.

---

## 8. Failure Handling

If validation fails:

```text
FAIL
↓
ROOT-CAUSE ANALYSIS
↓
SMALLEST IN-SCOPE FIX
↓
REBUILD
↓
RETEST FAILED CASE
↓
RETEST AFFECTED REGRESSION
```

Do not advance while a blocking regression remains.

---

## 9. Commit Policy

One bounded milestone should normally produce one commit.

Suggested message style:

```text
refactor: migrate <domain> <slice> to React sandbox
```

Use `fix:` when repairing a verified migration defect rather than delivering a new slice.

Never bundle unrelated cleanup.

---

## 10. State Handoff Before Potential Agent Limit

When the agent detects that context/token/tool/runtime limits may stop work soon:

1. stop starting new sub-tasks,
2. update `CURRENT_TASK.md`,
3. record exact next action,
4. preserve working tree,
5. do not create a misleading COMPLETE state,
6. do not discard uncommitted work.

If commit is already valid and tests passed, commit/push before stopping if safe.

---

## 11. Production Boundary

Autonomous execution stops at:

`READY FOR PRODUCTION CUTOVER`

At that point provide:

- final migrated HEAD,
- final build status,
- final regression status,
- known deferred items,
- cutover steps,
- rollback steps.

Wait for explicit approval before cutover.
