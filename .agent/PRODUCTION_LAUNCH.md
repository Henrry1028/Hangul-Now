# HangulNow — Production First Launch (Cloud Run Direct)

Status:

`PRODUCTION CANDIDATE READY FOR MANUAL AUTH CHECK`

- The production service `hangul-now-api` exists and its candidate passes all automated acceptance.
- The service is **private**: no public invoker, so every public request gets 403. Nobody outside the project can reach it yet.
- Public exposure ("traffic migration") happens only after the real-Google-auth check in section 5 passes.

Approval: the user approved the production first launch (Cloud Run direct; no Firebase Hosting deploy, no DNS/custom domain; keep staging and `preview/`).

---

## 1. Production Record

| Item | Value |
|---|---|
| Project | `hnageul-copilot-dev-918` (313423647793) |
| Region | `asia-northeast3` |
| Service | `hangul-now-api` (labels `env=production`, `app-commit=6d94bad`, `image-source=19c1500`) |
| Revision | `hangul-now-api-00001-siy`, tag `candidate` |
| Primary URLs (private until launch) | https://hangul-now-api-313423647793.asia-northeast3.run.app, https://hangul-now-api-onpsj3o5ta-du.a.run.app |
| Candidate URL (private) | https://candidate---hangul-now-api-onpsj3o5ta-du.a.run.app |
| Image | `asia-northeast3-docker.pkg.dev/hnageul-copilot-dev-918/cloud-run-source-deploy/hangulnow-staging@sha256:ecf22296054974fb08c4209302ddaa6048eac009783d261324630d6e3be6ace2`. This is the **same digest staging accepted**, with no rebuild. It was built by Cloud Build from `git archive 19c1500` (Korean filenames intact). |
| Application code | `6d94bad` (no non-`.agent` changes through repository HEAD at deploy time, `caff194`) |
| Runtime SA | `hangul-now-api-runtime@hnageul-copilot-dev-918.iam.gserviceaccount.com`: **no project roles**; `roles/secretmanager.secretAccessor` on the 3 secrets only. The default compute SA, which has project Editor, is not used. |
| Secrets (names only) | `GEMINI_API_KEY` ← `hn-staging-gemini-api-key`; `FIREBASE_SERVICE_ACCOUNT_KEY` ← `hn-staging-firebase-sa-key`; `ADMIN_EMAILS` ← `hn-staging-admin-emails`, all `:latest`. These are the staging-validated values, reused rather than duplicated (the `staging` prefix is historical). Firebase key project_id = `hnageul-copilot-dev-918`; ADMIN_EMAILS is the admin proven by the staging manual check. |
| Settings | 1 vCPU, 512 MiB, concurrency 80, **timeout 3600 s**, **min 0, max 1** instances, HTTP/1, ingress all, invoker = none (private) |

### Why max instances = 1 (intentional first-launch limit)

Mutable state lives in process memory:

- `src/tutorSession.js` `reviewJobs`, which the client polls after a conversation, so a second instance would return "not found".
- `src/videoClassService.js` tutors/bookings.
- The fallback `localMemories` / `localAudioReviews` / learning-history `memoryStore`.

Multiple instances would split this state. Raise max instances only after it is externalized.

Effective capacity: one instance, up to 80 concurrent requests. Each open live-conversation WebSocket holds one slot.

### Timeout 3600 s

- Tutor sessions stop on the client at 600 s.
- Role-play has no app-level limit.
- Any WebSocket is cut when it reaches 3600 s. Sessions longer than 60 minutes would need client reconnect support, which doesn't exist today.

### Known limitations (not durable)

- **Video Class (admin-only preview):** tutors, bookings, Meet links, and feedback are **in-memory mock data**. They reset on every restart, redeploy, or scale-to-zero. Not durable; internal preview only until persistent storage is built.
- **Scale to zero:** min instances 0 means an idle service cold-starts (~seconds) and loses in-memory state, including any pending review job and Video Class data.

## 2. Platform Constraint and the Chosen Equivalent

Cloud Run rejects `--no-traffic` when **creating** a service: the first revision always serves 100% of the service. A literal "zero-traffic candidate behind a live primary URL" is impossible for a first launch.

The equivalent used:

1. Create the service **without a public invoker** (`--no-allow-unauthenticated`). The primary and candidate URLs both return 403 to the public.
2. Tag the revision `candidate`.
3. Run all automated tests with an identity token in `X-Serverless-Authorization` (consumed by Cloud Run IAM, so the app's own `Authorization` header stays free).
4. The manual real-auth check runs through an authenticated localhost proxy (section 5).
5. "Traffic migration" = pinning 100% to the accepted revision and granting the public invoker (section 6).

## 3. Automated Candidate Acceptance — PASS

Over HTTPS with the identity token:

- **Frontend:** `/` is 200, TLS valid, byte-identical to `frontend/dist/index.html`. Title `Hangul Now | 행글 나우`; `index-BWIOtno1.js` / `index-CAz-CLob.css`.
- **Assets:** favicon, apple-touch-icon, manifest, logo, and the Korean-named `훈이_book.png` / `캐릭터_훈이.png` all return 200.
- **SPA:** `/tutors`, `/admin`, and `/deep/link` return the SPA page.
- **APIs:** `/api/health` ok; `/api/v1/tutors` 200; `POST /api/chat {}` 400. `GET /api/does-not-exist`, `/api`, `/api/v1/nope`, and `/api/live` return **404, not index.html**.
- **Security:**
  - `/api/admin/dashboard` with no token → 401.
  - `/api/admin/check` with a forged token (curl and in-browser bodiless `fetch`) → 401.
  - `/api/v1/bookings` forged → 401.
  - Without the identity token, everything (HTTPS and WSS) → 403.
- **WebSocket:** `wss://candidate---…/api/live` opens in 156 ms and closes cleanly (1000). No `start` was sent, so no Gemini quota was used.
- **Browser (through the authenticated localhost proxy, real Firebase SDK):** all 11 screens at 1440 and 390 in en and ko. No overflow, failed assets, 5xx, or warnings.
  - Guests: no Video Class or 👑.
  - `?admin=1` alone: no Video Class (the 👑 console button stays, legacy, data server-protected).
  - `/videoclass` and `/#videoclass` land on Landing.
- **Logs:** Firebase Admin initialized (runtime SA reads the secrets); `/api/live` ready; startup probe passed on the first attempt. ERROR-severity 0, 5xx 0. Status mix: 101 WS, 200/304, 400 validation, 401 auth tests, 403 public IAM denials (by design), 404 unknown /api.

## 4. Firebase Auth

- No authorized-domain change was needed for the candidate: the manual check runs on `localhost`, which is already authorized.
- The two production hostnames are added at launch time (section 6, step 1). Nothing was removed.
- Current list: `localhost`, `hnageul-copilot-dev-918.firebaseapp.com`, `hnageul-copilot-dev-918.web.app`, and the two staging hosts.

## 5. Manual Real-Google-Auth Check on the Private Candidate (user)

Open the private candidate on localhost with your own gcloud identity. Use **one** of these:

- **A (official):** in an **Administrator** terminal, run once: `gcloud components install cloud-run-proxy`. Then in any terminal:
  `gcloud run services proxy hangul-now-api --tag candidate --region asia-northeast3 --project hnageul-copilot-dev-918 --port 8099`
- **B (fallback, no admin rights):** the agent's tested helper (HTTP + WebSocket):
  `node "C:\Users\hopep\AppData\Local\Temp\claude\c--Users-hopep-Desktop-----\9fbc5a06-d23f-4792-8985-57d1b97dfa78\scratchpad\candidate-proxy.cjs"`
  This file is a session temp file. If it's gone, use A.

Then open **http://localhost:8099** in a normal browser with DevTools Console/Network open:

1. **Log in** with the real admin Google account; the popup completes.
2. The profile (avatar/initial, name, email, interests) is visible; the header **Log in** button is gone.
3. Reload: still signed in.
4. Tutor restores (change it in Curriculum, reload, confirm).
5. The 👑 **Admin**, **화상수업 Admin**, **관리자 콘솔**, and **LIVE VIDEO CLASS** entries are visible.
6. Network: `POST /api/admin/check` → **200**.
7. The Admin console loads real users (`/api/admin/dashboard` 200).
8. Video Class loads the tutor list.
9. Logout ✕.
10. The Admin and Video Class entries disappear.
11. Log in again.
12. Admin is restored.
13. No unexpected console/network errors.

Report PASS/FAIL per item. **Do not open public access before every item passes.**

## 6. Launch Steps (agent, only after the section 5 PASS)

1. **Firebase authorized domains:** add `hangul-now-api-313423647793.asia-northeast3.run.app` and `hangul-now-api-onpsj3o5ta-du.a.run.app` (additive, `updateMask=authorizedDomains`).
2. **Pin traffic** to the accepted revision, so a later deploy can't auto-shift:
   `gcloud run services update-traffic hangul-now-api --to-revisions=hangul-now-api-00001-siy=100 --region asia-northeast3`
3. **Open public access:**
   `gcloud run services add-iam-policy-binding hangul-now-api --member=allUsers --role=roles/run.invoker --region asia-northeast3`
4. **Post-launch acceptance on the primary URL:** frontend, assets, APIs, unknown /api 404, WSS, logs. The user then confirms a real admin login on https://hangul-now-api-313423647793.asia-northeast3.run.app (`/api/admin/check` 200, console, Video Class).

## 7. Emergency Rollback (first launch, no prior production revision)

- **Stop public exposure immediately** (keeps the service, revisions, logs, and secrets for diagnosis):
  `gcloud run services remove-iam-policy-binding hangul-now-api --member=allUsers --role=roles/run.invoker --region asia-northeast3`
- **Redeploy the last validated image** (if a later revision is bad), by digest:
  `gcloud run deploy hangul-now-api --image <validated digest above> --region asia-northeast3` (same flags as section 1), or route back with `gcloud run services update-traffic hangul-now-api --to-revisions=<good revision>=100`.
- **Staging** `hangulnow-staging` stays up as the known-good comparison: https://hangulnow-staging-313423647793.asia-northeast3.run.app.
- **Preserve evidence:** don't delete revisions, images, logs, or secrets during an incident.
- **Frontend serving switch:** `git revert 6d94bad` (CUTOVER_READINESS section 7) only if the React frontend itself must be withdrawn.

## 8. Not Done in This Milestone (by design)

- No Firebase Hosting deploy (`firebase.json` unchanged).
- No DNS or custom domain.
- Staging is preserved, including its authorized domains.
- `preview/` is preserved.
- No application source changes.
