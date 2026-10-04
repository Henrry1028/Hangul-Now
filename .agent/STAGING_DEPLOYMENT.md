# HangulNow — Cloud Run Staging Deployment (P6B / roadmap P8)

Status:

`STAGING READY FOR MANUAL AUTH CHECK`. All automated external acceptance passes. The only remaining gate is a real Google sign-in on the staging URL (section 8). Production is untouched.

History: the first attempt stopped on a HARD BLOCKER (no gcloud SDK/credentials). The user installed and authenticated gcloud, enabled `run.googleapis.com`, and verified billing; this milestone resumed from there.

---

## 1. Deployment Record

| Item | Value |
|---|---|
| Project | `hnageul-copilot-dev-918` (number 313423647793) |
| Region | `asia-northeast3` (= Firestore `(default)` location, = `firebase.json` rewrite region) |
| Service | `hangulnow-staging` (labels `env=staging`, `source-commit=19c1500`). The only Cloud Run service in the project. |
| URLs | https://hangulnow-staging-313423647793.asia-northeast3.run.app and https://hangulnow-staging-onpsj3o5ta-du.a.run.app (same service) |
| Revision | `hangulnow-staging-00001-bmw`, 100% traffic |
| Image | `asia-northeast3-docker.pkg.dev/hnageul-copilot-dev-918/cloud-run-source-deploy/hangulnow-staging:19c1500` |
| Source | `git archive` of `19c150041285e690f8c05ca3adf4cb7681fe3e30` (code identical to cutover `6d94bad`). Cloud Build `32fb473c-3c27-4695-934e-999f7851e873` SUCCESS; frontend bundle `index-BWIOtno1.js` / `index-CAz-CLob.css` is identical to the local P7 build. |
| Runtime SA | `313423647793-compute@developer.gserviceaccount.com` (default) |
| Settings | timeout **900 s**, concurrency 80, 1 vCPU, 512 MiB, min instances 0, default max, HTTP/1, `--allow-unauthenticated` (public web app) |
| Env (names only) | `GEMINI_API_KEY` ← secret `hn-staging-gemini-api-key`; `FIREBASE_SERVICE_ACCOUNT_KEY` ← `hn-staging-firebase-sa-key` (project_id verified); `ADMIN_EMAILS` ← `hn-staging-admin-emails` (1 entry). `PORT` is injected by Cloud Run; `NODE_ENV=production` comes from the image. Optional model/TTS/POS vars are unset (code defaults). |

Secrets were created from the local `.env` through stdin. No value was printed, logged, committed, or put in the image.

### Packaging note (important for every Windows deploy)

`gcloud run deploy --source .` on Windows **corrupted the Korean asset filenames** (e.g. `훈이_book.png`) in the upload, and the Vite build failed with ENOENT (failed build `07ab000d-…`). That was a tooling issue, not an application defect.

The working method is to package the exact commit and build from that:

```bash
git -c core.autocrlf=false archive --format=tar.gz -o hn-<sha>.tgz <sha>   # UTF-8 names, tracked files only (no .env / node_modules / dist)
gcloud builds submit hn-<sha>.tgz --region asia-northeast3 --tag asia-northeast3-docker.pkg.dev/hnageul-copilot-dev-918/cloud-run-source-deploy/<service>:<sha>
gcloud run deploy <service> --image <that tag> --region asia-northeast3 --timeout=900 --set-secrets=... --allow-unauthenticated
```

## 2. Cloud Changes Made (all staging-scoped or additive)

- APIs enabled: `cloudbuild.googleapis.com`, `secretmanager.googleapis.com` (`run` and `artifactregistry` were already enabled).
- Artifact Registry repository `cloud-run-source-deploy` (asia-northeast3), auto-created by the first deploy attempt; Cloud Build source bucket `hnageul-copilot-dev-918_cloudbuild`.
- Secrets `hn-staging-gemini-api-key`, `hn-staging-firebase-sa-key`, `hn-staging-admin-emails`, each with `roles/secretmanager.secretAccessor` for the compute SA (per secret, not project-wide).
- Cloud Run service `hangulnow-staging` (public invoker).
- Firebase Authentication authorized domains: **added** `hangulnow-staging-313423647793.asia-northeast3.run.app` and `hangulnow-staging-onpsj3o5ta-du.a.run.app`.
  - Kept: `localhost`, `hnageul-copilot-dev-918.firebaseapp.com`, `hnageul-copilot-dev-918.web.app`.
  - Updated through the Identity Toolkit config with `updateMask=authorizedDomains` only. The two additions are project-level and additive.

Production changes: **NONE**. No other Cloud Run service exists, Firebase Hosting was not deployed, and DNS was not touched.

## 3. Automated External Acceptance — PASS

- **HTTPS frontend:**
  - `/` returns 200 with valid TLS and is byte-identical to `frontend/dist/index.html` (not preview).
  - Title is `Hangul Now | 행글 나우`, with hashed JS/CSS.
  - Favicon, apple-touch-icon, manifest, logos, hand images, and the Korean-named character assets all return 200.
  - `/tutors`, `/admin`, and `/deep/link` fall back to the SPA. HTTP returns 302 → HTTPS.
- **Screens (real browser, real Firebase SDK):** all 11 (Intro, Home, Tutors, Chat, Listening, Reading, Writing, Speaking, Conversation, Record, About) at 1440 and 390 in en and ko via real nav clicks.
  - No overflow, no failed assets, no 5xx, no console warnings or page errors.
  - The EN/한국어 switch works and persists `hn-lang`.
- **APIs:**
  - `/api/health` ok; `/api/v1/tutors` 200 (3 tutors).
  - Validation POSTs (chat, content/generate, correction, learning/record, session/complete-and-review, session/report, tts) return 400; translate (empty) returns 200; CORS preflight returns 204.
  - `GET /api/does-not-exist`, `/api`, `/api/v1/nope`, and `/api/live` return **404, not index.html**.
- **Auth rejection (proves Firebase Admin is live, not mock, which would give 503):**
  - `/api/admin/dashboard` with no token → 401.
  - `/api/admin/check` with a forged token → 401, both via curl with `Content-Length: 0` and via an in-browser bodiless `fetch` POST, the same shape the Video Class gate uses.
  - `/api/v1/bookings` forged → 401; `/api/v1/my-bookings` no token → 401; `/api/v1/tutors/profile` no token → 401.
  - Note: a raw POST with *no* `Content-Length` header gets 411 from Google's front end. Browsers always send it, so this doesn't affect the app.
- **Video Class / admin isolation (against the real staging server):**
  - **No Video Class for:** guest; `?admin=1` guest; signed-in normal user (with or without `?admin=1`, and no admin-check call); admin-pattern emails with forged tokens (the server returns 401 on `/api/admin/check`).
  - **Direct paths:** `/videoclass`, `/videoclass?admin=1`, and `/#videoclass` all land on Landing.
  - **Legacy behavior kept:** the `?admin=1` 👑 Admin console button is still shown (since P5B). Its data is server-protected.
- **WebSocket:** `wss://hangulnow-staging-313423647793.asia-northeast3.run.app/api/live` opens in about 200 ms (logged as HTTP 101) and closes cleanly with code 1000. No `start` was sent, so no Gemini quota was used.
- **Cloud Run logs:**
  - One instance start (deployment rollout); the startup TCP probe passed on the first attempt.
  - `[Firebase Admin] 프로젝트 hnageul-copilot-dev-918 초기화 성공`; `/api/live` ready.
  - No ERROR-severity entries, no 5xx, no crash/OOM/shutdown.
  - Status mix: 200/304 static, 101 WS, 302 redirect, 400 validation, 401 auth tests, 404 unknown /api.
  - The only warnings are `Token verification failed` from the intentional forged-token tests.

## 4. WebSocket Timeout Rationale

- Tutor sessions hard-stop on the client 600 s after the clock starts (`TUTOR_SESSION_SECONDS`). 900 s covers that plus connect/greeting/wrap-up.
- Role-play mode has **no client time limit** (same as legacy), so a role-play past 15 minutes would be cut by Cloud Run. Decide the production value (900 vs. longer) based on intended role-play length.

## 5. Production Context Discovered (read-only)

- Firebase Hosting site `hnageul-copilot-dev-918.web.app`: the live channel was last released 2026-08-03 and currently returns **404 "Site Not Found"**; `/api/health` there is 404 too.
- `firebase.json` rewrites `/api/**` to Cloud Run `hangul-now-api`, which **does not exist** in this project.
- So no production frontend or backend is currently serving from this project. Production go-live is effectively a first launch, not a migration of live traffic.

## 6. Recommended Production Rollout (separate approval required)

1. **Backend service:** decide the production Cloud Run name. Using `hangul-now-api` makes the existing `firebase.json` rewrite work unchanged.
2. **Build and deploy:** use the git-archive + Cloud Build method above. Create production secrets (separate `hn-prod-*` names, or reuse after review). Set `--timeout` (≥900), `ADMIN_EMAILS`, and the two secrets; start with min-instances 0 or 1 depending on cold-start tolerance.
3. **Smoke test:** run section 3 against the production `run.app` URL, then the manual auth checklist.
4. **Frontend:** either serve users directly from the Cloud Run origin (simplest; same-origin WebSocket works), or `firebase deploy --only hosting` after a fresh Node 20 build. Hosting rewrites can't proxy the `/api/live` WebSocket, so with Hosting the live conversation would need a direct Cloud Run origin, which requires a frontend change.
5. **Custom domain / DNS:** last, after acceptance.
6. **Rollback:** Cloud Run revision traffic rollback. The frontend serving switch rolls back with `git revert 6d94bad` (CUTOVER_READINESS section 7).

## 7. Staging Teardown (when no longer needed)

`gcloud run services delete hangulnow-staging --region asia-northeast3`, delete the three `hn-staging-*` secrets, and remove the two staging hosts from Firebase authorized domains. Not done; staging stays up for the manual check.

## 8. Remaining Manual Check — Real Google Sign-in on Staging

Open **https://hangulnow-staging-313423647793.asia-northeast3.run.app** in a normal browser with DevTools Console and Network open:

1. Click **Log in** and choose the real admin Google account. The popup completes with no `auth/unauthorized-domain` error.
2. The sidebar shows the profile (avatar/initial, name, email, interests), and the header **Log in** button is gone.
3. Reload. You are still signed in.
4. The tutor restores as before (change it in Curriculum, reload, confirm).
5. The header shows **👑 Admin** and **화상수업 Admin**; the sidebar shows **관리자 콘솔** and **LIVE VIDEO CLASS**. Network: `POST /api/admin/check` returns 200.
6. The Admin console loads real users (`/api/admin/dashboard` returns 200).
7. Video Class loads the tutor list.
8. Click ✕ (logout). The 👑/Video Class entries disappear and the guest sidebar returns.
9. Log in again. The profile and tutor restore without onboarding.
10. Optional: open Conversation and start a short session to confirm `wss://` streaming end to end (uses Gemini quota).
11. Throughout: no red console errors other than expected ones. Network shows no 5xx.

Report PASS/FAIL per item. On PASS: `STAGING ACCEPTANCE PASS — READY FOR PRODUCTION APPROVAL`.
