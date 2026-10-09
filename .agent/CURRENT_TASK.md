# Current Task

## Active Product Task — H6

Milestone ID:

`H6-LISTENING-PLAYBACK-LOOP`

Milestone Name:

`LISTENING SPEED STEPS + A-B REPEAT`

Status:

`COMPLETE` (commit `79356ec`)

Baseline HEAD:

`4b9037e9de5417cf12d965975680a7f0724d1b70`

Branch:

`feat/listening-playback-loop`

Expected files:

- `frontend/src/pages/ListeningPage.jsx`
- `frontend/src/data/listeningData.js`
- `frontend/src/styles/listening.css`
- `frontend/e2e/smoke.spec.js`
- `.agent/CURRENT_TASK.md`
- `.agent/MIGRATION_STATE.md`
- `.agent/MIGRATION_LOG.md`

Intended scope:

- Replace Listening playback speeds with `0.8 / 0.9 / 1.0 / 1.1 / 1.2`.
- Make the progress track seekable for server-backed audio.
- Add A and B markers plus an explicit section-repeat toggle and clear action.
- Preserve TTS prefetch, pause/resume, transcript, quiz, and device-speech fallback behavior.

First required action:

- Extend Listening state and the bound `HTMLAudioElement` time-update/end handlers, then add responsive controls and browser coverage.

Result so far:

- Handoff validation PASS: clean tree; `hardening/post-launch` and origin `0 0` at `4b9037e`.
- Source audit complete: server TTS uses a seekable `Audio` object; device `speechSynthesis` fallback cannot seek and will keep repeat controls disabled.
- Implementation complete: five speed choices, pointer/keyboard seek, A/B markers, repeat toggle, clear action, and loop enforcement on both `timeupdate` and `ended`.
- New material, screen exit, and device-speech fallback reset repeat state safely.
- Latest Node 20 production build PASS. The build reports an unrelated pre-existing malformed PWA keyframe warning in `updateBanner.css` and the existing chunk-size advisory.
- Latest full Vitest PASS: 42/42.
- Scoped ESLint: 0 errors; one baseline `ListeningPage` exhaustive-deps warning remains from the existing TTS prefetch effect.
- Real-WAV Playwright on latest HEAD: Listening desktop/mobile 2/2 PASS, including B-to-A playback looping; navigation desktop/mobile 2/2 PASS.
- Korean 390 x 844 visual check PASS: all five speed buttons and the A/B controls fit inside the player without horizontal overflow.
- `git diff --check` PASS.
- Concurrent Git note: PWA/Speaking commits `6a22524`, `f67da12`, and `6234954` were committed and pushed by another process while H6 validation ran. They do not overlap H6 files and are preserved as the remote baseline.
- Feature commit complete: `79356ec` (`feat: add Listening speed steps and section repeat`).

Next action:

- None for this bounded task. Production deployment/traffic remains unchanged and requires separate explicit approval.

---

## Active Product Task — H5

Milestone ID:

`H5-WRITING-APP-KEYBOARD-FOCUS`

Milestone Name:

`WRITING APP TARGET + CHEONJIIN FOCUS`

Status:

`COMPLETE` (commit `1514de7`)

Baseline HEAD:

`b8761e5af234ea3e6ade70243c42082e7b792cfb`

Branch:

`feat/writing-app-keyboard-focus` (branched from the current production follow-up line because `main` does not contain the live post-launch Writing/mobile changes)

Expected files:

- `frontend/src/pages/WritingPage.jsx`
- `frontend/src/styles/writing.css`
- `frontend/e2e/smoke.spec.js`
- `.agent/CURRENT_TASK.md`
- `.agent/MIGRATION_STATE.md`
- `.agent/MIGRATION_LOG.md`

Intended scope:

- In the app layout (`<860px`), remove the separate initial/vowel/final-jamo picker from the learning flow.
- Place the target/composition card immediately next to the Cheonjiin keypad and fit both into the initial mobile viewport as far as the shared app shell permits.
- Remove secondary keyboard configuration/statistics chrome from the app layout while preserving desktop Writing behavior and all existing Cheonjiin input logic.

First required action:

- Implement the app-only render/layout change, then validate at the 390 x 844 Playwright viewport and a taller phone viewport.

Result so far:

- Handoff validation PASS: baseline clean; current source branch and origin were `0 0`; migration branch was `0 0`.
- Source audit complete: the scroll delay is caused by the mobile stack `target card -> jamo card -> keyboard card`, with additional keyboard header/statistics chrome.
- Implementation complete: app-only jamo picker removal and compact target-to-Cheonjiin flow; desktop render path preserved.
- Node 20 Vite production build PASS.
- Full Vitest PASS: 39/39.
- Focused Playwright Writing PASS: desktop + mobile 2/2, including keypad-driven composition without the jamo picker.
- Full Playwright regression PASS: 13 passed, 1 desktop-only skip.
- Korean 390 x 844 visual check PASS: target card y=205..440; keyboard card y=448..714; both fully visible without scrolling.
- Scoped ESLint PASS with 0 errors (4 pre-existing unused-variable warnings in `WritingPage.jsx`). Full ESLint remains blocked by 27 pre-existing `SpeakingPage.jsx` `no-useless-escape` errors.
- `git diff --check` PASS.
- Feature commit complete: `1514de7` (`feat: focus app writing on Cheonjiin practice`).
- Concurrent Git note: while validation was running, `c06bc54` (deployment-script-only) was committed and pushed to the same feature branch by another process. It is preserved as the remote baseline; the H5 product diff after it remains exactly the six expected files above.

Next action:

- None for this bounded task. Production deployment/traffic remains unchanged and requires separate explicit approval.

---

## Active Product Task — H3

Milestone ID:

`H3-CONTENT-GENERATION-LATENCY`

Milestone Name:

`READING CONTENT GENERATION LATENCY REDUCTION`

Status:

`COMPLETE` (commit `b441773`; production `hangul-now-api-00008-bek`)

Baseline HEAD:

`6479d229501b631f82ed40a746f4d14556d09506`

Expected files:

- `src/contentGenerator.js`
- `src/learningHistory.js`
- `server.js`
- `frontend/src/data/readingData.js`
- `frontend/src/pages/ReadingPage.jsx`
- `frontend/src/pages/ReadingPage.test.jsx`
- `frontend/e2e/smoke.spec.js`

Intended scope:

- Keep one production Cloud Run instance warm.
- Return the Reading passage before glossary, quiz, and grammar enrichment finishes.
- Reduce generated payload size while preserving level behavior.
- Add request timeouts and stage timing logs.
- Remove one redundant Firestore read for signed-in generation.

First required action:

- Set production `hangul-now-api` minimum instances to 1 while preserving maximum instances at 1.

Result so far:

- Production `hangul-now-api` minimum instances changed from 0 to 1 while maximum remained 1; that scaling-only step did not change traffic.
- Reading generation now returns the passage first, then enriches glossary, quiz, and grammar in a second request.
- Reading token budgets were reduced by level, Gemini/API timeouts and stage timing logs were added, and the redundant signed-in Firestore read was removed.
- Local updated API timing: core 2.49 s, enrichment 2.57 s. The useful passage is visible after the core phase instead of waiting for the entire payload.
- Isolated production image built successfully from production source `b2274a4` plus only the five runtime Reading changes: `asia-northeast3-docker.pkg.dev/hnageul-copilot-dev-918/cloud-run-source-deploy/hangul-now@sha256:9939ff17c348868cdaec351aa2f4d36d884da9ff8d9f993b5f1e86cbcc6afb1f`.
- Initial candidate revision `hangul-now-api-00006-cud` passed tag-URL acceptance and served the first H3 rollout.
- Commit `b441773` combined the Reading work with the approved Tutor and Chat changes; Cloud Build image digest `sha256:97d3cb9ec43f61e40a6f43e9870eb884401457ee99bdd8bdfe8f5eed87aefbb1` deployed as `hangul-now-api-00008-bek`.
- `hangul-now-api-00008-bek` now serves 100% of production traffic; `00006-cud` remains at 0% for rollback.

Validation:

- Backend syntax checks: PASS.
- Modified frontend ESLint: PASS.
- Full Vitest: 29/29 PASS.
- Node 20 production build: PASS locally and in Cloud Build `142dd773-a4ee-46c2-8aaa-d091785a3524`.
- Focused Playwright Reading flow: desktop + mobile 2/2 PASS.
- Isolated deployment artifact: exactly five runtime files changed; `git diff --check` PASS; archive hashes 5/5 match.
- Candidate and post-traffic production acceptance: health 200, React frontend 200, real core/enrichment generation PASS, ERROR logs 0, HTTP 5xx 0.
- Production timing after traffic migration: intermediate core 3.95 s, enrichment 4.08 s.
- Commit release candidate: 9 Tutor/QR assets 200; real correction 4.62 s; Reading core 2.02 s and enrichment 3.07 s; scoped browser checks 5/5; ERROR 0; HTTP 5xx 0.

## Active Product Task

Milestone ID:

`H2-CHAT-CORRECTION-SYNC`

Milestone Name:

`CHAT SMART CORRECTION LIVE SYNC`

Status:

`COMPLETE` (commit `b441773`; production `hangul-now-api-00008-bek`)

Baseline HEAD:

`6479d229501b631f82ed40a746f4d14556d09506`

Expected files:

- `frontend/src/hooks/useChat.js`
- `frontend/src/pages/ChatPage.jsx`
- `frontend/src/pages/ChatPage.test.jsx`
- `frontend/e2e/smoke.spec.js`

Intended scope:

- Replace the right-side static correction examples with the selected tutor chat's actual `/api/correction` results.
- Keep pending, clean, error, and recent correction states synchronized with the left conversation.

First required action:

- Reuse the existing per-message correction state instead of issuing a second API request.

Result:

- The right Smart Correction panel now renders the selected tutor chat's actual per-message `/api/correction` result.
- Pending, failed, no-correction-needed, and latest three correction states stay synchronized with the left conversation.
- The frontend preserves `rule_id` so the live correction can show an appropriate category.

Validation:

- Focused Vitest: 2/2 PASS.
- Full Vitest: 25/25 PASS.
- ESLint on `useChat.js`, `ChatPage.jsx`, and `ChatPage.test.jsx`: PASS.
- Node 20 Vite production build: PASS.
- Playwright correction sync: desktop + mobile 2/2 PASS with mocked `/api/chat` and `/api/correction` responses.

Known unrelated validation issue:

- The pre-existing full navigation smoke test does not match the current uncommitted header/mobile drawer changes and times out locating or clicking some navigation buttons. The correction sync scenarios pass independently.

Next action:

- None for this bounded task.

## Task Identity

Milestone ID:

`H1`

Milestone Name:

`POST-LAUNCH HARDENING`

Status:

`COMPLETE` (10–12 deferred by design)

Production:

Revision `hangul-now-api-00003-cis` at 100% since 2026-10-04T10:47:03Z (release `v1.1.0` → `b2274a4`). The previous revision `hangul-now-api-00001-siy` stays deployed at 0% for instant rollback.

## Results

| # | Item | Result |
|---|---|---|
| 1 | main fast-forward + release tag | DONE: `main` fast-forwarded (no merge commit); tags `v1.0.0-react` → `19c1500`, `v1.1.0` → `b2274a4` |
| 2 | AGENTS.md §2–3 + README | DONE: README rewritten (the old deploy section used `--source .` and a bare `firebase deploy`) |
| 3 | rate limit + CORS + budget alert | DONE: CORS allowlist + per-uid/IP rate limits (verified on Cloud Run: forged XFF can't bypass, buckets per client). Budget alert DONE: `HangulNow monthly (Cloud Run + Gemini)` (budget `b6835b68-b314-481f-978e-39adfe0274ae`) on billing account `01CF5F-1AAF28-0B00D3` (KRW): **₩140,000/month** (≈ $100). Covers both `hnageul-copilot-dev-918` (Cloud Run/Build/Firestore) and `gen-lang-client-0898376857` (the project that owns and bills the Gemini API key). Alerts at 50/90/100% of actual spend plus 100% of forecasted spend, emailed to the billing account admins. |
| 4 | server-verified identity | DONE: learning/*, session/list, session/report, content/generate, chat, correction, coaching, complete-and-review (IDOR closed; guests unaffected) |
| 5 | Firestore owner rules | DONE + DEPLOYED: the live DB was test mode (world-readable/writable) and would have shut out all clients on 2026-10-28 |
| 6 | key rotation | The user deleted both zips that contained the real `.env` (verified gone, not in the Recycle Bin). Keys were not rotated. Rotate only if those zips were ever shared or uploaded elsewhere. |
| 7 | engines + .nvmrc | DONE |
| 8 | unify admin auth, remove client heuristic | DONE: `requireAdmin` in authMiddleware via adminPolicy; `GET /api/admin/status`; `?admin=1`/email heuristic removed |
| 9 | remove `[migration:*]` logs | DONE |
| 10 | preview/ and duplicate cleanup | DEFERRED by its own condition (2–4 weeks of stability) |
| 11 | tooling / refactors | Tooling DONE (ESLint, Vitest 11 tests, Playwright smoke 6 tests; lint found + fixed a stale userId bug). Router, modular SDK, and Context split DEFERRED (broad regression risk). |
| 12 | Firestore state + scaling | DEFERRED (feature-sized design) |

## Verification Summary

- Local, staging, and the production tag URL were each checked with a throwaway Firebase test user holding **real ID tokens** (normal + admin claim), then deleted:
  - own-data writes and reads OK; cross-user access closed
  - `admin/status` and `check` correct; dashboard 200
- Real Firebase SDK browser run (`signInWithCustomToken`):
  - tokens attached to generate and chat
  - admin UI only from the server answer
  - Video Class and console work for the admin claim
  - clean sign-out
- Playwright smoke 6/6 on local, staging, and production. Vitest 11/11. ESLint 0 errors.
- Production after the shift: new bundle, health/tutors 200, IDOR closed, WSS open, Google popup with no domain error, 0 5xx, 0 ERROR.

## User Confirmations

- Production (revision `00003-cis`) checked with the real admin account: admin menu and Video Class visible. PASS.
- Secret-bearing zips deleted.

## Exact Next Action

None. Remaining candidates (each its own milestone):

- Verify the WebSocket `/api/live` start-message `userId` (currently unverified, so another user's tutor memory could be read).
- Gate `/api/session/review-status/:id` and `/api/session/audio-review/:id` by owner.
- Items 10–12.

Rollback (if ever needed):

`gcloud run services update-traffic hangul-now-api --to-revisions hangul-now-api-00001-siy=100 --region asia-northeast3 --project hnageul-copilot-dev-918`

## New Observation (2026-10-04, after H1 close) — needs a user decision

Someone other than this agent made changes that are outside H1:

1. **Firebase Hosting was deployed** (live channel released 2026-10-04 22:01:48 KST; `.firebase/` cache present). `https://hnageul-copilot-dev-918.web.app` now serves the v1.1.0 build (`index-B4GqU40J.js`), and its `/api/**` rewrite reaches Cloud Run `hangul-now-api`. Effects measured:
   - The `/api/live` WebSocket **fails** through web.app, so live conversation is broken for web.app visitors (Hosting can't proxy WebSockets).
   - The **rate limit is bypassed** through web.app: Cloud Run sees rotating Firebase Hosting proxy IPs (`66.249.82.x`), so `trust proxy 1` keys on the proxy. 42/42 `translate` requests returned 200 (direct Cloud Run caps at 40/min per client).
2. **Uncommitted work in progress:** `frontend/src/components/SitePasswordGate.jsx` (new) wraps `App.jsx` in a client-side password screen. The password is hard-coded in the JS bundle, so anyone can read it; it hides the UI only and does not protect any API. It is not in any commit or deployment (web.app/Cloud Run bundles don't contain it).

Not touched by this agent. Options:

- If web.app is not intended, disable Hosting (`firebase hosting:disable --project hnageul-copilot-dev-918`, reversible).
- If it is intended:
  - make the rate-limit key read the real client IP for Hosting-proxied requests (needs a non-spoofable Hosting signal);
  - point the frontend WebSocket at the Cloud Run origin.
- For real access restriction, use server-side checks (Cloud Run IAM/IAP or auth on the API), not a client-side password.
