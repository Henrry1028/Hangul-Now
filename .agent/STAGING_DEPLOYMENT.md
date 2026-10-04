# HangulNow — Cloud Run Staging Deployment (P6B / roadmap P8)

Status:

`HARD BLOCKER — GOOGLE CLOUD CLI/CREDENTIALS UNAVAILABLE`. Nothing was deployed and no cloud configuration was changed.

Source to deploy: `ff96dced4083646d9a8ae431892f20693511b889` (`docs: record local production cutover and rollback plan`; code identical to cutover commit `6d94bad`). Commits after it are `.agent/*` docs only.

---

## 1. Blocker

- The Google Cloud SDK (`gcloud`) is **not installed** on this machine: not on PATH, not in the standard install locations, and there's no `%APPDATA%\gcloud` config or credentials.
- Without it, the agent can't:
  - discover Cloud Run services and regions or the production service name,
  - inspect Artifact Registry,
  - create secrets,
  - deploy,
  - read Cloud Run logs.
- The Firebase CLI **is** logged in. It lists `hnageul-copilot-dev-918` ("Hnageul Copilot") among the account's projects. It can't deploy Cloud Run services, though, and reusing its token for Cloud Run/Build/Identity Toolkit REST calls would be an unsanctioned credential workaround, so it was not done.
- Installing the SDK also requires an interactive `gcloud auth login` by the account owner.

## 2. Discovered Context (read-only, from the repository and Firebase CLI)

| Item | Value | Evidence / confidence |
|---|---|---|
| Firebase / GCP project | `hnageul-copilot-dev-918` | client config in `frontend/src/data/profileData.js`, `firebase projects:list` |
| Existing (production) backend service | `hangul-now-api` | `firebase.json` hosting rewrite `/api/**` → Cloud Run `serviceId: hangul-now-api` |
| Region | `asia-northeast3` | same rewrite |
| Proposed staging service | `hangulnow-staging` | distinct from `hangul-now-api`; **must be confirmed absent/unused via `gcloud run services list` before deploying** |
| Deploy config in repo | none | no `cloudbuild.yaml`, `.firebaserc`, `.gcloudignore`, CI workflows, or deploy scripts |
| Image build | `Dockerfile` (Node 20 frontend stage → Node 22 runtime, `npm start`, `PORT=8080`) | validated locally in P7 |

The production service name and region come from `firebase.json` only and have not been verified against the live project. Confirm both before deploying.

## 3. Environment / Secrets Audit (names only)

| Variable | Class | Notes |
|---|---|---|
| `GEMINI_API_KEY` | **required secret** | all AI features (chat, correction, content, live, review) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **required secret** | base64 or raw JSON. Without it `src/firebase.js` runs in mock mode, so `auth` is null and admin endpoints return 503: no admin console or Video Class gate, and no Firestore server writes. There is no ADC fallback. |
| `ADMIN_EMAILS` | **required config** | comma list. Must include the real admin's email (set locally with 1 entry) or the admin gets no console data and no Video Class. Alternative: the `admin` custom claim. |
| `FIREBASE_STORAGE_BUCKET` | optional | defaults to `<project_id>.firebasestorage.app` |
| `PORT` | platform | Cloud Run injects it; the Dockerfile default is 8080. Do not set it manually. |
| `NODE_ENV` | image | `production` (Dockerfile) |
| `GEMINI_DIALOGUE_MODEL`, `GEMINI_PREMIUM_MODEL`, `GEMINI_LIVE_MODEL`, `GEMINI_TUTOR_LIVE_MODEL`, `GEMINI_REVIEW_MODEL`, `GEMINI_REVIEW_TTS_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_CONTENT_MODEL`, `GEMINI_ANALYSIS_MODEL`, `GEMINI_THINKING_LEVEL` | optional | code defaults exist; `apphosting.yaml` sets `GEMINI_DIALOGUE_MODEL`/`GEMINI_PREMIUM_MODEL` |
| `GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` | optional | Cloud TTS; on Cloud Run (`K_SERVICE`) the service account's ADC is used |
| `POS_ANALYZER`, `POS_REQUIRE_KIWI`, `KIWI_MODEL_PATH` | optional | POS analysis |
| `LOCAL_AUDIO_REVIEW_DIR`, `HOST` | dev-only / optional | local audio review dir is ephemeral on Cloud Run |
| `K_SERVICE`, `GAE_SERVICE` | platform | set by Cloud Run / App Engine |

`.env` holds `GEMINI_API_KEY`, `PORT`, `FIREBASE_STORAGE_BUCKET`, `ADMIN_EMAILS`, and `FIREBASE_SERVICE_ACCOUNT_KEY`. It is excluded from the image (`.dockerignore`) and must be supplied through Secret Manager or env vars, never baked in.

## 4. WebSocket / Timeout

- `/api/live` is a WebSocket on the same origin. Cloud Run supports it directly, and each connection is bounded by the service **request timeout** (default 300 s).
- A tutor session is 10 minutes (`TUTOR_SESSION_SECONDS = 600`). **The default 300 s would cut tutor sessions in half.**
- Recommended staging timeout: `--timeout=900` (15 min: 10 min session + connect/review margin). Raise to 3600 only if role-play sessions are confirmed to run longer.
- Keep the default HTTP/1 (WebSockets work); don't enable anything that terminates upgrades. Don't route `wss://` through Firebase Hosting.

## 5. Resume Steps (after the user installs and authenticates gcloud)

1. Install the Google Cloud SDK, then run `gcloud auth login` as the project owner (interactive).
2. Read-only discovery:

   ```bash
   gcloud config set project hnageul-copilot-dev-918
   gcloud run services list --region asia-northeast3 --format="table(name,region,url)"
   gcloud artifacts repositories list --location asia-northeast3
   ```

   Confirm `hangul-now-api` is production and `hangulnow-staging` does not exist (or is already the documented staging service).
3. Secrets (values from `.env`, never echoed):

   ```bash
   gcloud secrets create hn-staging-gemini-api-key --data-file=-        # paste/pipe value
   gcloud secrets create hn-staging-firebase-sa-key --data-file=<sa.json>
   ```

   Grant the runtime service account `roles/secretmanager.secretAccessor` on both.
4. Deploy staging only. Cloud Build uses the repo `Dockerfile`. With no `.gcloudignore`, gcloud derives one from `.gitignore`, so `.env`, `node_modules/`, and `dist/` are excluded:

   ```bash
   gcloud run deploy hangulnow-staging --source . --region asia-northeast3 \
     --allow-unauthenticated --timeout=900 \
     --set-secrets=GEMINI_API_KEY=hn-staging-gemini-api-key:latest,FIREBASE_SERVICE_ACCOUNT_KEY=hn-staging-firebase-sa-key:latest \
     --set-env-vars=ADMIN_EMAILS=<admin email list>
   ```

   Never pass `hangul-now-api` and never pass `--no-traffic`/traffic flags for production.
5. Firebase Authentication: add the staging host (`hangulnow-staging-<hash>-du.a.run.app`) under Authentication → Settings → Authorized domains. Add only; remove nothing.
6. Agent re-runs the automated external acceptance against the HTTPS URL:
   - HTTPS, title, hashed assets, favicon/manifest, SPA fallback, `/api/health`, `/api/v1/tutors`, validation POSTs, admin 401/forged 401, unknown `/api` 404
   - 11 screens × 1440/390 × en/ko
   - guest/normal-user/`?admin=1` Video Class isolation
   - `wss://…/api/live` handshake and timeout
   - `gcloud run services logs read hangulnow-staging --region asia-northeast3`
7. User runs the 13-item manual staging auth checklist (P6B prompt section 15) on the staging URL.

## 6. Production Rollout Recommendation (for a later, separately approved milestone)

- **Go-live:** deploy the same image to `hangul-now-api` with `--no-traffic`, smoke test the tagged revision URL, then shift traffic gradually (`gcloud run services update-traffic`), keeping the previous revision for instant rollback.
- **Settings:** set `--timeout=900` (or longer if role-play needs it) on production, and confirm `ADMIN_EMAILS` and both secrets are present before shifting traffic.
- **Firebase Hosting:** build `frontend/dist` with Node 20 right before `firebase deploy --only hosting`. The live conversation WebSocket must reach the Cloud Run origin, because Hosting rewrites don't proxy WebSockets.
- **Rollback:** use Cloud Run revision traffic rollback, and `git revert 6d94bad` for the serving switch (CUTOVER_READINESS section 7).

## 7. Production Changes

NONE. No Cloud Run, Firebase Hosting, DNS, Secret Manager, or Firebase Auth configuration was touched.
