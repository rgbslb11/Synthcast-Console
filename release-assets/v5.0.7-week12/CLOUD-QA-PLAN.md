# 5.0.7 cloud QA — approval boundary and disposable test alternative

Candidate source baseline: `6a01360b5738b0036b07e26e9339726a6c5fd340`.
Repository procedures 01, 02, 04 and 05 were read for this continuation.
The 5.0.7 football engine and approved rating inputs are unchanged in this work.

## Shared Supabase setup: NOT APPLIED

The automatic approval reviewer rejected the attempted additive QA migration.
Its stated reason was that isolated QA authorization did not explicitly cover
copying operator records, service-role grants and the global PostgREST schema
allowlist change within the shared project. No retry or alternate execution of
that shared-project mutation has been attempted.

Read-only verification after rejection confirmed:

- `gamecast_v507_qa_w12` does not exist.
- Week 11 session version is still 62958.
- Week 11 state MD5 remains `f685b33edc6101a9ed6d9a3b14eb3f4d`.
- No 5.0.7 function or QA Auth identity was created.

The exact proposed SQL is `cloud-qa-schema.sql`. It is generated from the
preserved 5.0.6 schema into a new QA namespace, with the following concrete scope:

1. Create only `gamecast_v507_qa_w12` tables, functions, indexes and constraints.
2. Read the current Week 11 Chairman roster into the new QA operator table;
   do not modify existing operators or their Auth records.
3. Enable RLS, deny anonymous/authenticated direct access, and grant the server
   service role access to the new schema. Functions use SECURITY INVOKER.
4. Add the QA schema to the existing PostgREST allowlist, preserving every
   existing entry, then reload API configuration/schema. This is a shared API
   configuration change, even though the added data is QA only.
5. Enforce `qaOnly=true`, a QA-only slug/engine/week identity and no READY
   lifecycle at database level. Official final import is prohibited.
6. Enable writes only in this new QA namespace; install no cron.

After that SQL is approved, the prepared code would add exactly three new QA
functions, with no replacement of existing functions:

- `gamecast-week12-v5-0-7-qa-public`
- `gamecast-week12-v5-0-7-qa-chairman`
- `gamecast-v507-qa-harness`

The first two use actual candidate handlers and Supabase Auth verification.
The harness is a bounded test controller, not a general SQL/code endpoint. It
validates GitHub OIDC signatures, repository/owner IDs, branch, workflow, audience,
time bounds and subject. Its actions are limited to its own recorded QA run.
It expires on November 11, 2026 at 00:00 UTC. A future test workflow would create
one confirmed disposable QA Auth login, with no email delivery, then disable its
QA operator permission at completion. No real-user account would be altered.
Three local OIDC tests cover valid signatures and rejection conditions. The
Supabase integration of these prepared functions remains NOT TESTED.

These shared-project actions remain BLOCKED pending explicit Chairman approval.
Production 5.0.7 activation remains separately HELD regardless of QA approval.

## Materially safer alternative: disposable GitHub cloud PostgreSQL

The independent workflow `qa-v507-postgres.yml` uses a new PostgreSQL 17 service
container on a disposable GitHub runner. It receives no Supabase credentials
and cannot target the shared project. The test executable rejects any target
other than localhost port 55432 and database `gc507qa`, and requires GitHub
Actions context. Its data disappears with the job.

Within that separate container, the test creates an explicit synthetic identity
and a synthetic operator-roster fixture; it never copies actual operators.
It installs the candidate SQL, then runs actual HTTP handlers and the candidate
engine against real PostgreSQL functions, transactions, audit rows and receipts.
Both browser engines read the same database-backed API. Server processes are
terminated and reconstructed to test recovery.

Coverage includes all 60 canonical Week 12 games, exact request replay without
duplicate commits, namespace rejection, direct-role access denial, both affected
punt sequences, both reviewed legitimate pinned-deep sequences, safety
continuation metadata, Chairman/public/condensed displays, mobile WebKit,
complete-board persisted finals and prohibition of official acceptance.

Authentication in this alternative uses a test identity fixture. It does not
establish Supabase Auth, PostgREST exposure, physical iPhone Safari or the target
Supabase deployment gates. Those remain separate and must not be marked PASS
based on this workflow.

Observed result: GitHub run 42638488305 succeeded on source commit `06f1a9b`.
PostgreSQL 17.11 passed 60 database/browser checks, including 24 server-process
restarts, exact retry receipts and all 60 persisted finals. The full automated
suite passed 81 tests. Evidence is in `evidence/postgres-cloud-ci.json`.

## Rollback for the proposed shared installation

If later approved and installed, disable only the new QA namespace's release
writes, disable its disposable test operator and retain QA evidence. Remove only
the QA schema name from the current API allowlist if its exposure is rolled back;
preserve any entries added by other release work. Existing releases, Auth users,
accepted records and cron jobs must remain unchanged. No destructive cleanup or
production activation is included in this proposal.

## Documentation checked

- Supabase changelog, retrieved 2026-11-09. CLI v3 changes do not affect this
  connector-based setup; no CLI upgrade was performed.
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/api/using-custom-schemas
- https://docs.github.com/en/actions/reference/security/oidc
