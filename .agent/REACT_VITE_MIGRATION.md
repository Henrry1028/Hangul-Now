# HangulNow React + Vite Migration Roadmap

## 1. Goal

Move HangulNow from the legacy monolithic frontend:

`preview/index.html`

to a modular React + Vite frontend:

`frontend/`

without changing the product unnecessarily during migration.

---

## 2. Core Principles

1. PARITY FIRST.
2. Source-first investigation.
3. Bounded migrations.
4. High-risk domains receive deeper audits.
5. No unnecessary dependencies.
6. No opportunistic redesign.
7. Preserve security/privacy contracts.
8. Preserve intentional product deferrals.
9. Validate every milestone.
10. Commit/push safe checkpoints.
11. Maintain repository-based handoff state.
12. Stop before production cutover unless explicitly approved.

---

## 3. Completed Roadmap

### Phase 0 — Backend / Security Readiness

Status:

`COMPLETE`

Includes:

- booking security,
- role-scoped booking flow,
- Video Class backend readiness,
- public tutor privacy.

---

### Phase 1 — React/Vite Foundation

Status:

`COMPLETE`

Includes:

- isolated `frontend/`,
- Vite,
- React,
- asset migration pattern,
- API proxy,
- dual-source runtime.

---

### Phase 2 — Low-Risk Public Pages

#### Intro
`COMPLETE`

#### About
`COMPLETE`

#### Tutors
`COMPLETE`

#### Tutor selection parity
`COMPLETE`

---

### Phase 3 — Reading

#### Reading safe viewer/vocabulary
`COMPLETE`

Commit:

`487744cf6965fab1bd4923005cec90247a92be06`

#### Reading TTS
`COMPLETE`

Commit:

`11e18eff4c1897e72f28f26b6b657a4e96456e14`

#### Reading AI generation
`COMPLETE`

Commit:

`01e84258129f7c614cc3ecf065ebab210c6b414f`

#### Reading Quiz + XP/activity persistence
`COMPLETE`

Commit:

`fdd5946c29037512e8da860a6376719a6c2cc401`

#### Reading learning history
`COMPLETE` (learned topics in P1N; history display belongs to Home/Record)

---

## 4. Remaining Domain Roadmap

The expected order is based on current knowledge and may be adjusted after audits.

### Phase 4 — Medium-Risk Domains

Likely domains:

- Home — `COMPLETE` (`3e125c9`)
- Writing — `COMPLETE` (`e562a11`)
- Listening — `COMPLETE` (`1b8df9f`)
- Record — `COMPLETE` (`7e947f0`)

Phase 4 status: `COMPLETE`

For each:

- audit,
- bounded implementation,
- build,
- browser validation,
- regression,
- safe checkpoint.

---

### Phase 5 — High-Coupling Domains

Likely domains:

- Speaking
- Chat
- Conversation

Reasons for higher risk may include:

- Gemini/AI,
- tutor selection,
- message history,
- dictionary/translation,
- Firebase,
- audio/TTS,
- shared/global state,
- realtime behavior.

These require source-first audits.

---

### Phase 6 — Global Shell

#### Global Header / Navigation

Deferred until more body domains are migrated because it is coupled to:

- auth,
- theme,
- language,
- admin,
- navigation.

Expected work:

- header parity,
- language parity,
- theme parity,
- auth state,
- navigation shell,
- unsupported/deferred route handling.

---

### Phase 7 — Admin

Status:

`PENDING`

Expected risk:

`HIGH`

Reasons:

- auth,
- role checks,
- backend mutation,
- possible realtime data,
- operational tooling.

Do not expose deferred Video Class public functionality while migrating Admin.

---

### Phase 8 — Final Integration

Required:

- final React build,
- all migrated routes/pages smoke-tested,
- desktop parity,
- mobile parity,
- auth regression,
- API regression,
- Firebase regression,
- TTS/audio regression,
- AI-generation regression,
- history/persistence regression,
- console/page-error review,
- asset review,
- navigation review.

---

### Phase 9 — Cutover Readiness

Before actual cutover, produce:

- final migration status,
- final confirmed HEAD,
- clean working tree,
- remote divergence `0 0`,
- production build result,
- full regression summary,
- known deferred features,
- known acceptable legacy quirks,
- deployment plan,
- rollback plan.

Final autonomous state:

`READY FOR PRODUCTION CUTOVER`

Stop there.

---

### Phase 10 — Production Cutover

Requires explicit user approval.

Possible actions after approval may include:

- production build,
- Express static source switch,
- smoke test,
- production monitoring,
- rollback if required.

Do not perform this phase automatically unless the user explicitly authorizes it.

---

### Phase 11 — Legacy Retirement

Only after successful production cutover and stabilization.

Possible work:

- remove unused legacy frontend path,
- remove dead UMD-only dependencies,
- remove obsolete duplicated assets,
- clean compatibility code,
- post-migration UX/i18n improvements.

This is not part of parity migration until cutover is proven stable.

---

## 5. Video Class Boundary

The following are intentionally not part of current public migration:

- Video Class general-user navigation
- booking UI
- booking CTA
- Meet UI
- public availability flow
- public Video Class route

Backend readiness can remain.

Do not interpret backend capability as permission to expose the feature.

---

## 6. Progress Model

Current estimated migration workload completion:

`60–65%`

This estimate may change after audits.

Do not mechanically compute progress from milestone count because later domains have higher coupling.

A more useful progress model is:

- Foundation: complete
- low-risk public pages: largely complete
- Reading: complete
- medium-risk domains: pending
- high-risk domains: pending
- global shell/admin: pending
- integration/cutover: pending

---

## 7. Milestone Naming Convention

Use sequential IDs when practical.

Examples:

- `P1M READING AI GENERATION AUDIT`
- `P1N READING AI GENERATION MIGRATION`
- `P1O READING QUIZ AUDIT`
- `P2A HOME AUDIT + MIGRATION`
- `P2B WRITING AUDIT`
- `P2C WRITING MIGRATION`

Do not force naming sequence if repository history establishes a different safe sequence.

---

## 8. Completion Standard

Do not declare migration 100% because every source file has been touched.

Migration reaches code-complete status only when:

- all intended domains are migrated,
- required runtime behavior works,
- regression passes,
- build passes,
- security/privacy contracts remain intact,
- no required production behavior depends on an unmigrated legacy frontend path.

Then declare:

`READY FOR PRODUCTION CUTOVER`

and wait for explicit approval.
