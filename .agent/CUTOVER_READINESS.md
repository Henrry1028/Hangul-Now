# HangulNow React + Vite — Production Cutover Readiness

Status:

`READY FOR MANUAL AUTH CHECK`. Code is cutover-ready. Before approving the cutover, the user must run one real Google sign-in pass (section 8). Nothing in section 6 has been executed.

Branch: `migration/react-vite-modular`

Final migrated code HEAD: `6ab4395cad21d1b0a7832a821ea5803d946fdef9` (`fix: preserve admin video class parity before cutover`). Later commits on the branch are `.agent/*` docs only.

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

## 6. Cutover Steps (require explicit approval)

Two serving paths currently point at `preview/`; both must switch.

1. Freeze: confirm `migration/react-vite-modular` is clean, `0 0` with origin, and production is healthy on the legacy frontend.
2. Build the frontend in the deploy pipeline. `frontend/dist` is gitignored, so it must be built:
   - Dockerfile: add a build step (or a multi-stage build) that runs `cd frontend && npm ci --include=dev && npm run build` before the runtime stage. Copy `frontend/dist` into the image. The root `npm ci --omit=dev` stays as is.
   - Firebase Hosting: run the same frontend build before `firebase deploy`.
3. Express (`server.js`): point `express.static` (line 244) and the `app.get("*")` fallback (lines 1021–1022) at `frontend/dist` instead of `preview`. Keep every `/api/*` route and `/api/live` unchanged.
4. Firebase Hosting (`firebase.json`): set `"public"` to `frontend/dist`. Keep the `/api/**` Cloud Run rewrite and the `**` → `/index.html` SPA rewrite.
5. Deploy to a staging/preview channel first. Run the section 8 real-auth checklist on staging. Smoke test guest browsing; real Google sign-in and onboarding; admin Video Class preview (admin only); admin console with a real admin token; one AI generation per domain; TTS playback; a live conversation start/stop; favicon and manifest; no console errors.
6. Promote to production and watch logs for `/api/*` error rates and client errors.

## 7. Rollback

- Revert the `server.js` static/fallback path and `firebase.json` `"public"` back to `preview` (single commit), then redeploy. `preview/index.html` stays untouched throughout, and the backend/API contracts don't change, so rollback has no data or migration implications.
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

### B. Real Google sign-in: MANUAL TEST REQUIRED

No dedicated Google test account is available to the agent, so a real sign-in was **not** performed and is **not** claimed.

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

If every step passes, the status becomes `READY FOR PRODUCTION CUTOVER`, pending explicit approval.
