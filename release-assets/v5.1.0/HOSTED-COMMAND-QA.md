# Hosted command path and 56-game database QA — 2026-11-03

Procedure 05 and master router loaded in full. Baseline development head:
01f88c98721c1667e9f5177fe8265b1ec2212b91. Dedicated work branch:
`development/gamecast-v5.1.0-hosted`. Launch remains the WP freeze boundary;
WP implementation and UI integration remain owned by their separate threads.

## Implementation

- delivery/controller.mjs calls the retained 5.0.6 engine operations without
  changing football math or source files. Commands load an immutable revision,
  mutate a private draft, CAS-commit source and then recover reporting projections.
- Actor-bound request IDs and command fingerprints provide duplicate replay,
  including retry after source commit succeeds but projection delivery fails.
  Conflicting commands cannot reuse the same request ID.
- delivery/command-http.mjs and command-edge.ts require an authenticated Auth
  user, active server-side Chairman session grant, approved origin and POST.
  Caller-supplied actor identity is ignored. Responses contain commit receipts,
  never private raw game state. Body limit 64 KiB; 1–112 actions per batch.
- Explicit QA denial of accept, power and purge_new_seed. Source SQL also rejects
  READY/official results and non-QA namespaces. No cron or automatic scheduler.
- controller-schema.sql adds service-only request lookup and QA-grant helper,
  and extends only the existing isolated QA gateway. Browser roles cannot call it.
- Transport returns only allowlisted version/idempotency conflicts; other database
  failures remain generic. No keys or database error details reach clients.

POST `/functions/v1/gamecast-v5-1-0-qa-commands?session=qa-v510-...`
requires Authorization Bearer, Origin https://rgbslb11.github.io and
Idempotency-Key (16–128 characters). JSON: expectedVersion and actions array.
Game action: `{id,command,payload}`; session advancement: `{command:"advance",seconds}`.
A successful retry returns the original stateVersion and replayed=true.
Clients must refresh after a version conflict and retain request IDs after network
failure. No successful hosted signed-in command has yet been verified.

## Local verification

101 tests PASS: 94 reporting/HTTP/retained regression tests plus seven PostgreSQL
integration tests. Command integration runs under service_role and verifies
Launch/AUTO, advancing, duplicate/conflicting request IDs, pause with GL advancing,
edit/cancel, durable source after interrupted projection, recovery on retry,
sticky correction blocking, official acceptance denial, and browser-role denial.
HTTP tests verify trusted actor, session grant, origin, missing token and method.
Retained 5.0.6 source/publication-workflow diff is empty.

## Hosted evidence

Migration: gamecast_v510_qa_commands, restricted to isolated QA objects.
Function: gamecast-v5-1-0-qa-commands version 2, ACTIVE, verify_jwt=true.
Bundle SHA256: 00bc2fe2fdf253e7dbb3d79f4650a26a92e836d6b4daf618b6b4159b149d46e9.
Unauthenticated POST returned HTTP 401; this alone does not prove successful
execution after authentication. Existing QA details function remains version 1.

Session qa-v510-board-20261103 holds 56 QA-only games at source revision 2.
Retained engine locally generated genesis, Launch/AUTO, and 200-second advancement.
Hosted PostgreSQL accepted three source commits and 168 reporting receipts.
Each revision used seven concurrent database requests of eight projections each.
Verification: 56 reporting heads at version 2, all AVAILABLE, 434 normalized plays,
pending_source=null. This is bounded hosted database delivery/load evidence,
not hosted engine execution, authenticated HTTP load, or sustained-load certification.
Active reporting grants: zero. No test Auth identity was created.

## Remaining gate and approval block

Positive signed-in HTTP, hosted full-game command lifecycle/restart/reconnect and
56-client HTTP load are NOT TESTED. Automatic approval review rejected deployment
of a temporary QA harness with custom bearer authentication and verify_jwt=false
that could use service role to create/delete a test Auth user and manage QA grants.
The review identified a privileged public endpoint/security-boundary risk requiring
explicit authorization. The harness was not deployed; its temporary source/token
were removed. No workaround was attempted. Use an approved authenticated QA test
path before claiming these gates pass.

WP/UI integration, Mobile Safari and production acceptance remain separate open
gates. No production activation, official results, 5.0.6/Week 11 code/data changes,
shared exposed-schema settings or production cron changes were made.

Rollback: leave QA endpoints unused with zero grants; disable only the new QA
command function if needed. Preserve immutable QA journals. No live rollback needed.
