# HangulNow React + Vite — Production Cutover Readiness

Status:

`COMPLETE`. The cutover is done and production is **LIVE** on Cloud Run direct since 2026-10-04T07:42:50Z (https://hangul-now-api-313423647793.asia-northeast3.run.app); final user verification PASS. Details: `.agent/STAGING_DEPLOYMENT.md` and `.agent/PRODUCTION_LAUNCH.md`. Section 6 steps 5–6 were executed as staging (P8) and the Cloud Run production launch (P9). Firebase Hosting was not used.

Branch: `migration/react-vite-modular`

Cutover commit: `6d94bad8f30ca9d6405d0767c81080e700966081` (`build: switch production frontend to React Vite`). Pre-cutover commit (rollback target): `3420082c7ea5294f446a02f52432012940689ed8`. Last frontend code commit: `6ab4395`.

Remote divergence at report time: `0 0`. Working tree: clean.

---

## 1. Migration Coverage

Every legacy screen in `preview/index.html` is migrated to `frontend/`, except the intentionally deferred Video Class.

| Legacy screen | Sandbox | Milestone |
|---|---|---|
| 01 Landing (Intro) | IntroPage | Intro |
| 02 Today (Home) | HomePage | P2A |
| 03 Tutors | TutorsPage | Tutors |
| 04 Chat | ChatPage + useChat | P3D |
| 05 Listening | ListeningPage | P2F |
| 06 Reading | ReadingPage | P1J–P1P, P6A-FIX |
| 07 Writing | WritingPage | P2D |
| 08 Speaking | SpeakingPage | P3B |
| 08b Conversation | ConversationPage + useConversation | P3F |
| 09 My progress (Record) | RecordPage | P2H |
| 09 Admin Console | AdminPage | P5B |
| 10 About us | AboutPage | About |
| Global shell (header, sidebar, pill nav) | AppShell | P4B |
| Auth / profile / onboarding / identity propagation | useAuthProfile + OnboardingModal | P4C |
| Document head + root icons/manifest | index.html + public/ | P6B |
| 10 Video Class Platform (admin-only preview) | VideoClassPage + useVideoClass | P6C |

## 2. Final Validation (P6A)

- Build: Node 20.20.2 `npm ci --include=dev` + `NODE_ENV=production vite build` PASS (438.28 kB JS / 137.69 kB gzip, 31.80 kB CSS). Host Node 24 has a known silent-exit quirk with this Vite version; build with Node 20 or 22.
- Cross-app parity sweep: 11 screens × en/ko × 1440x900/390x844 (44 runs), legacy vs sandbox text and geometry identical. Exceptions are the known Intro/About wrapper difference (main scroll extents identical) and Intro's rotating demo-chat timer.
- Pixel parity: 12 full-viewport screenshots (Home/Reading/About/Record; ko 1440, ko 390, en 1440) identical. Admin console identical in light and dark.
- Auth: guest, signed-in, onboarding-required (every step, validation, 5-interest cap, local + Firestore persistence), logout, Firestore tutor restore, admin flag (`?admin=1`, email heuristic), `#admin` deep link, and non-admin denial all identical under a deterministic Firebase stub. Real Google sign-in was not exercised because no test credentials are available.
- Signed-in dark sweep: 11 screens with identical geometry.
- Network: no sandbox failed requests, 404s, console errors, or page errors.
- API: 9 HTTP endpoints return identical status and body directly and through the Vite proxy. `/api/admin/dashboard` returns 401 with no token or a forged token. The `/api/live` WebSocket handshake opens directly and through the proxy.
- Carried forward from domain milestones and not re-run live in P6A, to avoid AI/TTS quota: AI generation (Reading/Listening/Speaking), TTS playback and audio lifecycle cleanup, live Gemini conversation, and weekly audio review. The P4C–P6B changes do not touch these paths.
- Video Class: not exposed for guests, signed-in users, or admins.

Defects found and fixed during final integration:

- `9b8f4c5`: Reading ≤659px grid had a sandbox-only single-column override. Now identical from 360 to 1440 px.
- `17df31a`: Firestore tutor restore wrote `hn-tutor` to local storage; legacy only sets state.
- `d67e4e8`: Document title, favicons, apple-touch-icon, manifest, and root icon files were missing from the React build.
- `a5d3d20` (handoff review): Conversation `meta.userName` and sidebar avatar initial deviated from legacy.

## 3. Known Deferred Items

- Video Class public release (AGENTS.md section 14) stays deferred. The admin-only preview is preserved (P6C): page, header `화상수업 Admin`, sidebar `LIVE VIDEO CLASS`, mobile pill, and the booking/Meet/feedback/tutor-profile modals and forms.
  - Visibility: legacy admin UI flag AND a signed-in user AND server-verified admin (`POST /api/admin/check`: verified ID token plus the `admin` claim or `ADMIN_EMAILS`).
  - This is stricter than legacy: `?admin=1` and the client email heuristic (`includes('admin')` / `startsWith('hopep')`) no longer expose it to general users.
  - Consequence: production must keep `ADMIN_EMAILS` (or the custom claim) set for every real admin, or they lose the preview.
- The unreachable legacy PRD modal (`vcModalOpen` is never set true) was not ported.
- `preview/test_keyboard.html`: a developer test page, not migrated.
- `preview/js/dc-runtime.js`: legacy template runtime, not needed by React.

## 4. Known Accepted Legacy Quirks (preserved)

- Onboarding `obNotice` (Firestore save failure) is set but never rendered.
- Signing out does not reset the admin UI flag.
- Admin `adminLoading` is never rendered; tutor distribution bar widths are static (100/20/20%).
- Video Class preview, as the legacy template runtime renders it:
  - Tab, duration and slot buttons have no active/selected highlight (ternary styles resolve to empty).
  - The slot KST/"예약 완료" sub-label is empty.
  - The bio counter has no colour.
  - The locked "Meet 입장 (10분 전 오픈)" button is always shown.
  - Review stars are not clickable (rating stays at its prefill).
  - Prices are unformatted (`₩29000`).
  - Sidebar/pill navigation opens the page without loading data; the header entry loads it.
- Reading on narrow screens keeps legacy's implicit 0px second grid track (cards are 28px narrower than the viewport).
- The client admin flag is UI-only; authorization stays on the server (`requireAdmin`).

## 5. Post-Cutover Cleanup Candidates (Phase 11, not parity work)

- Remove the `console.info('[migration:navigate]' / '[migration:selectTutor]')` instrumentation. It logs at info level in production and is invisible to users.
- Remove the dev-only `window.__hnSandboxNavigate` hook (already stripped from production builds).
- Retire `preview/` and the CDN UMD React/runtime only after the cutover is stable.

## 6. Cutover Steps

Steps 1–4 are DONE in the repository (`6d94bad`, local validation in section 9). Steps 5–6 (external deployment) are NOT performed and need a separate approved milestone.

1. Freeze: confirm `migration/react-vite-modular` is clean, `0 0` with origin, and production is healthy on the legacy frontend.
2. Build the frontend in the deploy pipeline. `frontend/dist` is gitignored, so it must be built:
   - Dockerfile: add a build step (or a multi-stage build) that runs `cd frontend && npm ci --include=dev && npm run build` before the runtime stage. Copy `frontend/dist` into the image. The root `npm ci --omit=dev` stays as is.
   - Firebase Hosting: run the same frontend build before `firebase deploy`.
3. Express (`server.js`): point `express.static` (line 244) and the `app.get("*")` fallback (lines 1021–1022) at `frontend/dist` instead of `preview`. Keep every `/api/*` route and `/api/live` unchanged.
4. Firebase Hosting (`firebase.json`): set `"public"` to `frontend/dist`. Keep the `/api/**` Cloud Run rewrite and the `**` → `/index.html` SPA rewrite.
5. Deploy to a staging/preview channel first. Run the section 8 real-auth checklist on staging. Smoke test guest browsing; real Google sign-in and onboarding; admin Video Class preview (admin only); admin console with a real admin token; one AI generation per domain; TTS playback; a live conversation start/stop; favicon and manifest; no console errors.
6. Promote to production and watch logs for `/api/*` error rates and client errors.

## 7. Rollback

Pre-cutover commit: `3420082c7ea5294f446a02f52432012940689ed8`. The cutover is the single commit `6d94bad8f30ca9d6405d0767c81080e700966081`, which touches only `server.js`, `firebase.json`, `Dockerfile`, `.dockerignore`, and `.agent/CURRENT_TASK.md`. `preview/` was never modified.

Fastest, deterministic rollback (no history rewrite):

```bash
git revert --no-edit 6d94bad
# restart the server (npm start), or rebuild/redeploy the image or hosting
```

Equivalent manual edits, if a revert is not possible:

- `server.js`:
  - `const FRONTEND_DIST = path.join(__dirname, "frontend", "dist"); app.use(express.static(FRONTEND_DIST));` → `app.use(express.static(path.join(__dirname, "preview")));`
  - The fallback `app.get(/^(?!\/api(?:\/|$)).*/, … FRONTEND_DIST, "index.html")` → `app.get("*", (req, res) => { res.sendFile(path.join(__dirname, "preview", "index.html")); });`
  - The restored `"*"` fallback again answers unknown `GET /api/*` with `index.html` (legacy behavior).
- `firebase.json`: `"public": "frontend/dist"` → `"public": "preview"`. Rewrites are unchanged.
- `Dockerfile`: delete the `frontend-build` stage and the `COPY --from=frontend-build …` line. The runtime stage is otherwise identical to `3420082`.
- `.dockerignore`: the two added lines (`frontend/node_modules`, `frontend/dist`) are harmless and may stay.

Verify the rollback: `curl -s http://localhost:3000/ | grep dc-runtime` matches (legacy markup) and `/api/health` returns ok.
- Firestore user documents written by either frontend use the same schema (`users/{uid}`: profile, `selectedTutorId`, `lastLoginAt`), and local storage keys are identical (`hn-*`), so users move between the frontends without data loss.

## 8. Final Pre-Cutover Gate (P6C)

### A. Admin Video Class parity: PASS (`6ab4395`)

- Legacy vs React with an identical Firebase stub and fixtures: every tab, all five modals, selected-slot state, the request payloads (booking, status, tutor report, student review, tutor profile, all with `Authorization: Bearer`), and every alert are text-identical.
- Element-level geometry and computed styles match on 150 of 151 elements. The one difference is the LIVE badge's `pulse` animation frame.
- Tutors tab is pixel-identical in light, dark, and 390px. Header/sidebar/pill entry points are identical at 1440/390 in en and ko.
- Access matrix (sandbox):
  - No entry point, no page, and a blocked direct route for: guest, `?admin=1` guest, signed-in normal user, normal user with `?admin=1` (sign-in resets the flag), and an email-heuristic user (`badminton...`) that the server rejects.
  - The server-verified admin gets header + sidebar (desktop) and pill (mobile) entries and the page.
  - Signing out while on the page returns to Home and removes the entries.
- The real server rejects forged tokens on `/api/admin/check`, `/api/admin/dashboard`, and `/api/v1/bookings` (401). Backend authorization is unchanged.
- The real-token admin path (an actual 200 from `/api/admin/check`) needs a real admin sign-in → covered by checklist B.

### B. Real Google sign-in: PASS (manual, user-reported)

The user ran the 10-item checklist below with a real Google admin account on the React sandbox and reported ALL 10 PASS with no unexpected errors (sign-in, profile, reload persistence, tutor restore, admin + Video Class access, logout, re-login, console/network). The agent did not perform a real Google sign-in itself.

Setup verified from source:

- Firebase compat 10.8.1, project `hnageul-copilot-dev-918`, `signInWithPopup`, falling back to `signInWithRedirect` when the popup is blocked.
- Default LOCAL persistence; neither app calls `setPersistence` or `getRedirectResult`.
- Server `ADMIN_EMAILS` is set (one entry).

Run it on `http://localhost:5173` (and again on the staging URL before promotion) with DevTools Console and Network open:

1. Click **Log in** in the header and pick a Google account. The popup closes and the sidebar shows your avatar or initial, name, email, and ✕. The header **Log in** button disappears.
2. New account only: onboarding appears. Complete both steps; the sidebar shows **My interests**. For an existing account, the saved profile loads with no onboarding.
3. Reload the page. You are still signed in, with the same profile.
4. Pick a tutor in Curriculum, then reload. The tutor card shows that tutor and Firestore `users/{uid}.selectedTutorId` matches.
5. Admin account (in `ADMIN_EMAILS`): the header shows **👑 Admin** and **화상수업 Admin**, and the sidebar shows **관리자 콘솔** and **LIVE VIDEO CLASS**. `POST /api/admin/check` returns 200. The Admin console loads real users (`/api/admin/dashboard` returns 200). Video Class shows the tutor list.
6. Non-admin account (optional, a second Google account): no 👑 or Video Class entries anywhere, and no request to `/api/admin/check`.
7. Click ✕ (logout). The guest sidebar returns, along with the **Log in** button.
8. Log in again with the same account. The profile and tutor restore without onboarding.
9. During all of this the Console shows no red errors (Firebase popup COOP warnings are acceptable). Network shows no failed `/api/*` calls other than expected 401/403s.
10. Optional: block popups for the site, then click **Log in**. The page redirects to Google and comes back signed in.

Result: ALL PASS → local cutover approved and implemented (section 9). Re-run this checklist on the staging URL during the external deployment milestone.

## 9. Local Cutover Implementation (P7) — `6d94bad`

Changes:

- `server.js`: `express.static(preview)` → `express.static(frontend/dist)` at the same position. The fallback `app.get("*")` → `preview/index.html` became a regex route serving `frontend/dist/index.html` for non-`/api` GETs only. API routes, middleware order, and the `/api/live` WebSocket attachment are unchanged.
- `firebase.json`: hosting `public` `preview` → `frontend/dist`; `ignore` and both rewrites are unchanged. There is no predeploy hook. **Before any `firebase deploy`, build the frontend with Node 20** (`npm run build` in `frontend/`). Firebase Hosting uploads whatever is in `frontend/dist`. Host Node 24 can't build it.
- `Dockerfile`: new `node:20-slim` `frontend-build` stage (`npm ci --include=dev`, `npm run build`). The runtime stage (`node:22-slim`, root `npm ci --omit=dev`, `COPY . .`, `npm start`, `PORT=8080`) is unchanged, plus `COPY --from=frontend-build /app/frontend/dist ./frontend/dist`.
- `.dockerignore`: `+ frontend/node_modules`, `+ frontend/dist`. Host artifacts no longer enter the build context.

Validation (localhost:3000 = `npm start` / `tsx server.js` with the new `server.js`; Node 20.20.2 build in `frontend/dist`):

- **The React build is served (independent proofs):**
  - `GET /` is byte-identical to `frontend/dist/index.html` and differs from `preview/index.html`.
  - The title is `Hangul Now | 행글 나우`, with `<div id="root">`.
  - The page references the hashed `/assets/index-BWIOtno1.js` and `/assets/index-CAz-CLob.css` (both 200).
  - There's no `dc-runtime.js` or unpkg React UMD.
  - Legacy-only URLs (`/js/dc-runtime.js`, `/test_keyboard.html`) now return the React `index.html`.
  - In the browser, the real Firebase compat SDK loads and the React shell renders.
- **SPA fallback:** `/tutors`, `/admin`, `/some/route`, `/index.html`, and `/?admin=1` all return the dist `index.html`.
- **Screens:** all 11 render via real nav clicks (Intro, Home, Tutors, Chat, Listening, Reading, Writing, Speaking, Conversation, Record, About) at 1440 and 390 in en and ko. No horizontal overflow, no console/page errors, no failed requests or 404s.
- **Assets requested:** characters, hand images, logos, manifest, bundles. Favicon, apple-touch-icon, and manifest return 200 with the correct types.
- **Reading at 390:** grid `307px 0px`, height 1568, scroll 1589 (equal to the legacy values verified in P6A). The onboarding dialog fits at 390 (card x=16, w=358).
- **Auth (Firebase stub; the real sign-in was verified manually):** guest login entry points; sign-in → profile UI (email, interests), header login hidden; logout → guest shell.
- **Admin / Video Class:**
  - None for: guest, normal user, `?admin=1` guest, or an email-pattern account the real server rejects.
  - The verified admin gets the Video Class page and the Admin console; Admin console has no overflow at 390.
  - `?admin=1` and email-pattern users still see the 👑 Admin console button (legacy client flag, unchanged since P5B). Its data stays server-protected (401).
- **API through :3000:**
  - `/api/health` ok; `/api/v1/tutors` 200.
  - 8 POST endpoints answer with their own validation responses (400s/200).
  - Admin dashboard/check and v1 bookings return 401 with no token or a forged one.
  - Unknown `GET /api/does-not-exist`, `/api`, `/api/v1/nope`, and `/api/live` return **404, not index.html**.
- **WebSocket:** the `ws://localhost:3000/api/live` handshake opens.
- **Docker (local, not pushed):**
  - `docker build` PASS: the Node 20 stage builds `index-BWIOtno1.js`.
  - The image (runtime Node 22.23.3) contains `frontend/dist` with all files. It has no `frontend/node_modules` and no `.env`, and `preview/` is kept.
  - The container on :8091→8080 starts. `/api/health` ok, `/` byte-identical to the local dist index, assets/manifest/favicon 200, `/tutors` falls back, `/api/nope` 404, WebSocket OPEN. The test container was removed; the local image `hangul-now-cutover:local` remains and was not pushed.
- **Legacy:** `git diff -- preview/` is empty, so `preview/` remains intact as the rollback source.

Pre-existing notes for the deployment milestone (not changed here):

- Firebase Hosting rewrites can't proxy the `/api/live` WebSocket. Live conversation needs the Cloud Run origin, as before the cutover.
- Production needs `ADMIN_EMAILS` (or the `admin` claim) for admins (section 3).
