# Source/outbox and hosted detail endpoint — November 3, 2026

Baseline 223ddd4; procedure 05 and router loaded in full. Work branch:
`development/gamecast-v5.1.0-source`. Launch remains the WP freeze boundary.

## Implemented

- Private QA source_heads and immutable source_commits in gamecast_v510.
- Version CAS, exact request retries, command/game validation, frozen game set,
  QA-only genesis and rejection of READY/official states.
- Source commits serve as a durable outbox. pending_source identifies the first
  revision not projected for every game. Bounded recovery replays exact revisions;
  already completed game projections return their immutable retry receipt.
- Atomic revision loader provides game state and complete command history.
  Source-store supplies manifest hashes for the existing committed-source consumer.
- New service-role-only public.gamecast_v510_gateway bridges to the private schema
  without altering PostgREST's shared exposed-schema configuration. It is invoker
  security and denies EXECUTE to PUBLIC, anon and authenticated.
- Read-only `gamecast-v5-1-0-qa-details` Edge Function version 1, JWT verification
  enabled. It verifies Auth user and session grants, reads authoritative source
  version and serves revision-bound detail. No HTTP mutation route or cron exists.

Endpoint: https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-details
Function bundle SHA256: 891916470d4ab831738b0b15741d963114003f3cb3849b7a239a8ee77035bbe6

## Evidence

92 reporting/retained tests and 6 local PostgreSQL tests PASS: 98 total.
Source tests cover interrupted two-game delivery, exact retries, conflicts,
immutable source, QA official-result rejection and browser-role gateway denial.
An initial conflict-test fixture assigned down=4 even when already 4; it was
corrected to always change the down. The SQL implementation did not change for
that test-fixture issue. Final rerun passed.

Hosted migrations: gamecast_v510_source_outbox_gateway, following existing
reporting schema inspection. Two QA source revisions persist for two games in
qa-v510-outbox-20261103. These were generated locally with the retained engine;
no hosted simulation scheduler or operator command endpoint has been activated.

Hosted recovery: project only the first genesis game, observe pending revision 0,
then repeat the genesis and project revision 1. Result: recovered_games=2 and
pending_revision=null. Work spans separate database requests. This is process/
delivery interruption evidence, not database-crash or backup-restore evidence.

Hosted endpoint: unauthenticated GET returns HTTP 401. Both anon and authenticated
lack gateway EXECUTE. Positive signed-in operator/Auth/HTTP flow remains NOT TESTED;
no operator session grant was installed. HTTP gateway denial does not establish
successful function execution after authentication.

## Boundaries and remaining gates

Storage is private-schema isolated on the project that also hosts Week 11. No
existing-release tables/functions/cron or live sessions were changed. The new public
schema function is explicitly service-only; no existing public function was replaced.
No WP model or UI implementation was modified, and no production release activated.

Source persistence and reporting consumption are connected in code and cloud SQL.
The engine caller can use createSourceStore.commit followed by recover, retaining
request IDs and expected versions. However, a hosted engine command/scheduler caller
is not yet connected. Do not describe the QA endpoint as a complete live GameCast.

Remaining: hosted engine caller; positive signed-in operator test; HTTP reconnect
and concurrent load; separate WP/UI integration and Mobile Safari. Release gates
remain as documented in BACKEND-VERIFICATION.md except the additional bounded
source/outbox and negative HTTP checks above. No production certification.

Rollback: leave QA source/endpoint unused with no grants and no scheduler. Disable
or remove only the new QA function if needed; retain journals. No live rollback.
