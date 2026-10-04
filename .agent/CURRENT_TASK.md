# Current Migration Task

## Task Identity

Milestone ID:

`P2A`

Milestone Name:

`HOME AUDIT + MIGRATION`

Status:

`READY_TO_COMMIT`

Baseline migration-code checkpoint:

`946a4ccf08dbbeff53cc18779a1d082715b5d4ac`

Expected branch:

`migration/react-vite-modular`

Expected repository state:

- P1Q code checkpoint `946a4cc` is an ancestor,
- only `.agent/*` metadata may be dirty or committed after it,
- remote ahead is zero.

---

## Objective

Source-first audit of the legacy Home screen in `preview/index.html` before any implementation.

## Audit Questions

- template lines and render-method sections for Home,
- static vs dynamic content,
- local/App state used (activity logs, XP, study dates, minutes, learned topics, tutor, level),
- persistence keys,
- APIs, auth/Firebase coupling,
- navigation targets (including deferred Video Class entries that must stay hidden),
- responsive behavior,
- smallest bounded P2B implementation scope.

## Progress Checklist

- [x] Git state reverified
- [x] Legacy Home source located (template 1438-1578, renderVals 6624-6730, labels 3958-3962/4026-4030)
- [x] State/persistence/API/auth coupling mapped (no API/persistence reads; selectTutor → onSelectTutor+onNavigate('chat'); risk LOW → audit+migration in one milestone)
- [x] Bounded scope defined (HomePage.jsx + homeData.js + home.css + App route)
- [x] Implementation complete
- [x] Build PASS (Node 20 container)
- [x] Parity PASS (390: all 72 elements identical in box+style; 1440/1180: all styles identical, offsets/wrap differ only by legacy sidebar shell)
- [x] Navigation/regression PASS
- [ ] Commit/push + MIGRATION_LOG record
- [ ] Audit metadata committed and pushed

## Exact Next Action

Build (Node 20 container), then compare Home with legacy at 1440/390 and run regression.
