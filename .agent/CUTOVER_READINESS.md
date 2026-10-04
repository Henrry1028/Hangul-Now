# HangulNow React + Vite — Production Cutover Readiness

Status:

`READY FOR PRODUCTION CUTOVER` — awaiting explicit user approval. Nothing below has been executed.

Branch: `migration/react-vite-modular`

Final migrated code HEAD: `d67e4e8b38e8780db06b57eba9ea9d87a99a367a` (`fix: match legacy document head and root icons`). Later commits on the branch are `.agent/*` docs only.

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
| 10 Video Class Platform | **not migrated (deferred)** | — |

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

- Video Class: page `10 Video Class Platform`, admin header link `화상수업 Admin`, sidebar group `LIVE VIDEO CLASS`, booking/Meet/availability modals, admin tutor-profile form (`POST /api/v1/tutors/profile`). After cutover these are **no longer reachable even for admins** (legacy shows them to admins as a preview). Needs a product decision; see AGENTS.md section 14.
- `preview/test_keyboard.html`: a developer test page, not migrated.
- `preview/js/dc-runtime.js`: legacy template runtime, not needed by React.

## 4. Known Accepted Legacy Quirks (preserved)

- Onboarding `obNotice` (Firestore save failure) is set but never rendered.
- Signing out does not reset the admin UI flag.
- Admin `adminLoading` is never rendered; tutor distribution bar widths are static (100/20/20%).
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
5. Deploy to a staging/preview channel first. Smoke test guest browsing; real Google sign-in and onboarding; admin console with a real admin token; one AI generation per domain; TTS playback; a live conversation start/stop; favicon and manifest; no console errors.
6. Promote to production and watch logs for `/api/*` error rates and client errors.

## 7. Rollback

- Revert the `server.js` static/fallback path and `firebase.json` `"public"` back to `preview` (single commit), then redeploy. `preview/index.html` stays untouched throughout, and the backend/API contracts don't change, so rollback has no data or migration implications.
- Firestore user documents written by either frontend use the same schema (`users/{uid}`: profile, `selectedTutorId`, `lastLoginAt`), and local storage keys are identical (`hn-*`), so users move between the frontends without data loss.
