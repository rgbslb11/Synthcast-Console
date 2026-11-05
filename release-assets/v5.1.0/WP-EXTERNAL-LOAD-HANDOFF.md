# External WP load runner

Baseline: d841ff8eb02e6ac56e1e73871b0c973642fce174. AGENTS, router and
procedures 02/05 loaded. Protected 5.0.6 remains 754d959; approved UI candidate
remains 7aba63b. This change touches only QA tooling and evidence.

## Investigation

The failed run trace 01a1aa3271fe72bcabc88dc4b9bb218f appears in 128 edge-log
entries in the 2026-11-05 05:32–05:34 UTC window: 94 gateway RPC HTTP 200,
30 user-auth HTTP 200, one login HTTP 200, one account creation HTTP 200,
one logout HTTP 204 and one account deletion HTTP 200. The runner separately
reported 29 successful WP reads and three fetch exceptions.

Supabase's official recursive-functions documentation describes rate limiting
of nested Edge Function calls and a RateLimitError with retryAfterMs:
https://supabase.com/docs/guides/functions/recursive-functions
It distinguishes normal inbound client requests from nested calls. This supports
testing through an external client. It does not prove the precise quota causing
our observed exception; the published budget cannot be inferred from 128 logs.
No quota, security gate or API limit is disabled by this test tooling.

## Prepared test

scripts/qa/wp-external-load.mjs uses a normal nonanonymous QA account through
Supabase Auth, then the existing JWT-protected WP and command endpoints.
Session is fixed to qa-v510-wp-load-r3. Exactly 56 game IDs G0502–G0557 were
verified against wp_heads. Six rounds attempt all 56 reads in batches of eight,
alongside one 60-second QA advance per round, at five-second scheduled starts.
The test fails on throttling, malformed identity/revision, missed cadence or
logout failure. There are no automatic retries or official-result commands.
An in-flight command is awaited even when reads fail. This tests short bounded
client/API load, not a game-length soak, scheduler independence or all release gates.

Three mocked runner tests PASS locally: exact workload/cadence; no network when
credentials missing; stop on throttling, settle command, logout, omit secrets.
These are harness checks only. Hosted success must come from the workflow report.

## Required secure access

The workflow requires repository Actions secrets GAMECAST_QA_EMAIL and
GAMECAST_QA_PASSWORD for an existing dedicated, nonanonymous QA account with
an active reporting grant for qa-v510-wp-load-r3. Do not use a service-role key,
send a password in chat, or commit credentials. The connector cannot configure
GitHub Actions secrets. Missing credentials produce BLOCKED/QA_CREDENTIALS_REQUIRED.

Repository secret settings:
https://github.com/rgbslb11/Synthcast-Console/settings/secrets/actions

The current Chairman account has the QA session grant, but no password is held
by this agent. Dedicated QA credentials are preferable for automation. Once secure
access is available, a new wp-load-request.json commit triggers the bounded run.
The retired Edge load runner remains v4/410 with verify_jwt=true throughout.

No production or UI deployment is included. A hosted UI review route remains a
separate unfinished item. Rollback: remove the external QA workflow/tooling;
preserve all committed football and WP history.
