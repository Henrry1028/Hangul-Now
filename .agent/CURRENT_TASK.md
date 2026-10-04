# Current Migration Task

## Task Identity

Milestone ID:

`P4B`

Milestone Name:

`SHELL LAYOUT + NAVIGATION MIGRATION`

Status:

`IN_PROGRESS`

Baseline migration-code checkpoint:

`15594c1e56b9295c85f8714d2101760a5ba3bc45`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Migrate the legacy shell layout and navigation (no Firebase yet). Plan is in MIGRATION_LOG P4A.

## Expected Files

- `frontend/src/components/AppShell.jsx`, `frontend/src/styles/shell.css`, `frontend/src/data/shellData.js` (new)
- `frontend/src/App.jsx` (shell, lang/theme/tutor/sidebar persistence, lifted Reading state)
- page/CSS adjustments to remove shell emulations (`writing.css`, `chat.css`) and apply the legacy `max-width:1400px` screen rule
- `frontend/src/pages/ReadingPage.jsx` (lifted state)
- `frontend/public/assets/logo-new*.png` if missing

## Required Validation

- production build,
- full-page parity vs legacy (including header/sidebar) for every migrated screen at 1440x900 and 390x844 (ko), plus spot checks in en and dark theme,
- nav: sidebar/pill/header targets, active state, unread badge, tutor card, collapse/resize/dblclick/Ctrl+B + persistence, lang/theme persistence, `hn-tutor`, scroll reset, listening audio stop on leave,
- regression of all behavior scenarios (spot), no console/page errors.

## Progress Checklist

- [x] Git state reverified
- [x] Audit complete (P4A)
- [x] Implementation complete
- [x] Build PASS
- [x] Parity PASS
- [x] Behavior PASS
- [x] Regression PASS
- [ ] Commit/push

## Exact Next Action

Review the complete P4B diff, repair any scoped issues, then commit/fetch/divergence-check/push and record the verified milestone.
