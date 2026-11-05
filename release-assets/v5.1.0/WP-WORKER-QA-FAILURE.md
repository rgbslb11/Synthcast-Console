# WP hosted QA failure — supersedes worker checkpoint
Hosted five-second smoke test FAILED data representation validation.
616 observations across the isolated session qa-v510-wp-hosted-20261104 were stored as JSONB strings rather than objects. SQL jsonb_typeof(record) returned string for all 616 rows.
Root-cause hypothesis: JSON.stringify values passed through postgres-js JSONB serialization are encoded twice; the PGlite local adapter did not expose this difference.
Cron job 9 was unscheduled successfully. Preserve all test history; do not rewrite/delete it.
No valid probability history, cadence acceptance or hosted-readiness claim follows from successful HTTP 200 or row counts. Earlier commentary claiming correct PREGAME_INPUTS_MISSING representation was premature.
Required correction: typed JSON parameter adapter, driver-specific regression test, then fresh isolated QA session. Also verify heads, receipts and priors representations. Approved UI, football model and original sessions unchanged.
