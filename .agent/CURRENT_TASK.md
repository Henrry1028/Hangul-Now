# Current Migration Task

## Task Identity

Milestone ID:

`P8`

Milestone Name:

`CLOUD RUN STAGING DEPLOYMENT + EXTERNAL ACCEPTANCE` (user prompt label: P6B)

Status:

`BLOCKED` on user action. STAGING READY FOR MANUAL AUTH CHECK.

Baseline:

`19c150041285e690f8c05ca3adf4cb7681fe3e30` deployed to `hangulnow-staging` (revision 00001-bmw) at https://hangulnow-staging-313423647793.asia-northeast3.run.app.

---

## Completed

- gcloud blocker resolved by the user; APIs (cloudbuild, secretmanager) enabled; secrets created and bound; Firebase authorized domains extended with the two staging hosts.
- Build via git archive + Cloud Build (the `--source` Windows filename bug is documented); deployed with timeout 900.
- Automated external acceptance PASS: HTTPS frontend, assets, SPA, APIs, unknown /api 404, auth rejections (Firebase Admin live), Video Class isolation, 11 screens × 1440/390 × en/ko, WSS handshake, clean Cloud Run logs.

## Exact Next Action

User runs `.agent/STAGING_DEPLOYMENT.md` section 8 on the staging URL and reports the result.

- PASS → mark `STAGING ACCEPTANCE PASS — READY FOR PRODUCTION APPROVAL`.
- FAIL → debug only the failing step.

Production deployment, Firebase Hosting deploy, and DNS remain unauthorized.
