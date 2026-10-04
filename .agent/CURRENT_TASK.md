# Current Migration Task

## Task Identity

Milestone ID:

`P4A`

Milestone Name:

`GLOBAL SHELL AUDIT`

Status:

`AUDITING`

Baseline migration-code checkpoint:

`15594c1e56b9295c85f8714d2101760a5ba3bc45`

Expected branch:

`migration/react-vite-modular`

---

## Objective

Source-first audit of the legacy global shell before implementation.

## Audit Questions

- shell markup (`app-root-shell`, `marketing-header`, sidebar, mobile nav, main viewport) and CSS (fit-to-screen rules 105-131, sidebar),
- which screens render inside vs outside the shell (Intro/About full-page?),
- navigation (`go`, nav groups, active state, unread badge, scroll reset), Ctrl+B sidebar toggle, resizable sidebar (`hn-sidebar-*`),
- language/theme toggles (`hn-lang`, `hn-theme`, `data-theme`),
- Google auth (Firebase), user card, logout, onboarding/profile (nickname/nationality/gender/interests), Firestore sync, `hn-tutor`,
- Video Class nav (admin-only) — must stay hidden for general users,
- shell-dependent emulations to retire: Writing/Chat heights, `max-width:1400px`, Reading/genError state lifting, studyLevel/translation sharing (already App-level),
- build config: production Express static switch is out of scope (cutover).

## Progress Checklist

- [x] Git state reverified
- [ ] Legacy shell source located
- [ ] Coupling mapped (auth/Firebase/profile/persistence)
- [ ] Bounded slices defined
- [ ] Audit recorded
- [ ] Audit metadata committed and pushed

## Exact Next Action

Read the shell markup after the `<helmet>` block (~620-1190) and the auth/profile handlers.
