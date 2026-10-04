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
- [x] Cross-app screen parity sweep: 11 screens x en/ko x 1440/390 — all identical except (a) Intro/About footer inside vs outside the labelled wrapper (known P4B DC-wrapper difference; main scroll extents identical), (b) Intro rotating demo-chat timer text, (c) Reading <=659px grid defect → fixed (P6A-FIX, drop non-legacy mobile override; identical at 360/390/500/659/700/859/1024/1440 en+ko)
- [x] Network/asset/console sweep: no sandbox failed requests, 404s, console or page errors across 44 screen runs (legacy-only aborted `{{ }}` placeholder images noted). Cutover gap found and fixed (P6B): document head (title, favicons, apple-touch-icon, manifest; no <html lang>) + byte-identical root icon/manifest files in frontend/public; 12 full-viewport screenshots pixel-identical legacy vs sandbox
- [x] Auth regression: onboarding required flow (all steps, 4 validation errors, 5-interest cap, local profile, 2 Firestore merge writes, sidebar) identical; signed-in dark sweep of 11 screens identical geometry; tutor restore defect fixed (P6A-FIX2: Firestore restore no longer writes hn-tutor, matching legacy)
- [x] API smoke: 9 HTTP endpoints identical status+body direct vs Vite proxy (validation paths, no AI quota), admin 401 both, /api/live WebSocket handshake OPEN both
- [ ] Cutover readiness report

## Exact Next Action

Commit/push P6B head parity, then write the cutover readiness report (Phase 9) and stop at READY FOR PRODUCTION CUTOVER.
