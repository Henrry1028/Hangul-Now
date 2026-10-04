# Current Migration Task

## Task Identity

Milestone ID:

`P8`

Milestone Name:

`CLOUD RUN STAGING DEPLOYMENT + EXTERNAL ACCEPTANCE` (user prompt label: P6B)

Status:

`BLOCKED`

Blocker:

HARD BLOCKER: the Google Cloud SDK (`gcloud`) is not installed and no gcloud credentials exist on this machine. The agent can't discover Cloud Run services, create secrets, deploy `hangulnow-staging`, or read logs. Reusing the Firebase CLI token for Cloud APIs was deliberately not done.

Baseline:

`ff96dced4083646d9a8ae431892f20693511b889` (clean, 0 0). Nothing deployed; no cloud config changed.

---

## Completed (no cloud access needed)

- Repository/Firebase discovery: project `hnageul-copilot-dev-918`; production backend `hangul-now-api` in `asia-northeast3` (from `firebase.json`, unverified live).
- Environment/secrets audit: required `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY` (no ADC fallback), `ADMIN_EMAILS`.
- WebSocket timeout analysis: use 900 s; the 300 s default cuts 10-minute tutor sessions.
- Full resume runbook in `.agent/STAGING_DEPLOYMENT.md`.

## Exact Next Action

User: install the Google Cloud SDK and run `gcloud auth login` as the project owner. Then the agent resumes at `.agent/STAGING_DEPLOYMENT.md` section 5 step 2 (read-only discovery) before any deploy.
