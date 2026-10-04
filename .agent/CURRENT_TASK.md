# Current Migration Task

## Task Identity

Milestone ID:

`P6A`

Milestone Name:

`FINAL INTEGRATION REGRESSION`

Status:

`IN_PROGRESS`

Baseline migration-code checkpoint:

`6b9b97bd302edbef8ace73a19a440b433a40ab48`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Roadmap Phase 8: verify that every migrated public/admin screen matches legacy, with no regressions, before the Phase 9 cutover-readiness report. No code changes expected; any defect found is fixed as a bounded `fix:` commit.

## Required Validation

- Node 20 production build (done at P5B: PASS),
- per-screen legacy vs sandbox text + geometry at 1440x900 and 390x844, en and ko, light and dark spot checks,
- failed requests / asset 404s, console and page errors on every screen,
- auth regression (guest, signed-in, admin) with the shared Firebase stub,
- API smoke: proxy reachability of migrated endpoints without spending AI quota where avoidable,
- Video Class not exposed.

## Progress Checklist

- [x] Git state verified (HEAD 6b9b97b pushed, 0 0)
- [x] Screen inventory: all legacy screens migrated except deferred `10 Video Class Platform`
- [ ] Cross-app screen parity sweep
- [ ] Network/asset/console sweep
- [ ] Auth regression
- [ ] API smoke
- [ ] Cutover readiness report

## Exact Next Action

Run the cross-app parity sweep (legacy `window.app.go`/setState vs sandbox `window.__hnSandboxNavigate`).
