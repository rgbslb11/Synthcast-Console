# WP hosted worker checkpoint
QA worker gamecast-v5-1-0-qa-wp-worker v1 deployed with a private Vault token; no token stored in Git. The worker authenticates its own requests, so platform JWT verification is disabled for this internal worker only. Public WP API retains JWT verification.
Worker is restricted to qa-v510-wp-hosted-20261104 and uses a database advisory lock against overlap. It reads committed source only.
Hosted request 368855 returned HTTP 200 WAITING_FOR_QA_SOURCE, proving database connectivity and worker token authentication.
Created a separate 56-game QA genesis using the existing immutable board genesis, after verifying all games were UNLAUNCHED, QA-only and had empty history. Changed only session/run identity for the copy. Original sessions untouched.
Hosted request 368931 returned HTTP 200 with sourceVersion 0 and records 56. SQL confirmed 56 observations across 56 games. No prior supplied: these observations must remain blocked.
A bounded 60-second five-second cron smoke test was started (job 9); final results are recorded separately. This does not establish sustained live-game load or football progression.
Chairman account verified and granted only this QA session; database authorization true for target and false for unrelated session. Positive browser JWT request remains NOT TESTED.
Remaining: QA prior provisioning, capture-enabled command source wiring, active gameplay/correction/recovery tests, positive user HTTP authorization, sustained load. No UI change, no model change, no production deployment.
