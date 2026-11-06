# Authorized bounded WP load test — 2026-11-04 Central / 2026-11-05 UTC

Outcome: INCOMPLETE / load gate NOT PASSED. Exactly one authorized invocation.

Source: 6e342293d73c58c3174e3088ed55004fb375b179; router and procedure 05 read.
Function gamecast-v5-1-0-qa-wp-load temporarily activated v3 with verify_jwt=false,
retaining the Vault-backed worker-token check and fixed qa-v510-wp-load-r3 scope.
Bundle SHA256 cedfb97f37d3d86f52c384f72db02979b734f0f455c840553b2f04f363215db0.

Invocation: pg_net request 373101. Outer HTTP 200 is the runner's report, not a
passing test. Intended workload: six rounds of 56 reads (batches of eight),
concurrent QA advance per round, five seconds between rounds.

Observed:
- Temporary account creation and password login: HTTP 200.
- First three batches: 24/24 successful WP GETs.
- Fourth batch: 5 successful GETs and 3 transport exceptions.
- Total: 29 successful WP GETs, 3 exceptions, 24 games not attempted in round 1.
- Successful read latency: 300–754 ms; not an SLA or sustained-capacity estimate.
- Exceptions had no HTTP status and zero recorded elapsed milliseconds:
  "Rate limit exceeded for trace 01a1aa3271fe72bcabc88dc4b9bb218f. Retry after 58222ms."
- Runner stopped at reads 0/24; no complete 56-game round or six-round pass.
- QA source head observed at revision 3 after the run (previously 2).
  The concurrent command's final HTTP response was not captured before early exit;
  do not infer its HTTP status from the source-head observation.

Root cause boundary: rate limiting is observed in the fetch transport. Exact
infrastructure owner is NOT VERIFIED. This does not demonstrate a GameCast
capacity failure or success. No limit bypass or second invocation was attempted.

Cleanup:
- Logout HTTP 204; temporary identity deletion HTTP 200.
- Independent database check: zero wp-qa temporary users and zero grants for
  the run's temporary identity.
- Immediately redeployed retired response as v4 with verify_jwt=true.
- Read-back verified v4 source only returns QA_LOAD_RUNNER_RETIRED / HTTP 410
  after the platform gateway. Bundle SHA256
  465a5356e30cc92b74a937832942810236ea98609bf21c28445d603231cb47ae.
- No production deployment, accepted result, engine tuning or 5.0.6 change.

Next engineering requirement: identify the supported test-runner request quota
and use an approved environment capable of the intended workload. Reducing the
load and calling it a 56-game five-second capacity pass is not acceptable.
Another runner activation/test requires new authorization; this one-run grant
has been consumed. Existing UI CI evidence remains distinct from hosted load.
