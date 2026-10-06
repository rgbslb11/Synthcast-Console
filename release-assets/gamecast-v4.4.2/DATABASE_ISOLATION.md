# GameCast 4.4.2 new-database proposal

Classification: CODE-DERIVED CONCLUSION and proposed implementation. Status: BLOCKED before provisioning; nothing applied.

A fresh Supabase project gives 4.4.2 a separate PostgreSQL database, API endpoint, service credentials, Edge Function, and scheduler configuration. No existing GameCast database needs an ALTER, migration, table copy, data rewrite, or deletion.

## Concrete intended setup

- Project name: gamecast-v4-4-2-w7, subject to collision checks.
- Organization: not selected. The connector currently lists synth-CFB (mnvsqnhcdlfbwxdcbrec). Its tool contract requires the user's choice before a cost quote; quoted cost must then be confirmed before project creation.
- Region: not selected; do not infer the existing project's region from an unrelated visible project.
- Only new schema gamecast_v442, with empty sessions and events tables. Recreate the inspected 4.4.1 persistence contract using new objects. Install no old sessions, operator hashes, accepted results, ratings history, or event records.
- New service-only RPCs: gamecast_v442_create_session, gamecast_v442_read_session, gamecast_v442_commit, gamecast_v442_scheduler_auth, gamecast_v442_scheduler_sessions. Preserve optimistic state-version checks, atomic state/event commits, QA promotion rejection, RLS, and service-only grants.
- Bind only gamecast-week7-v4-4-2 / GC-W7-V4.4.2-RC1 / 2026-W07 / w7v442- to this new project. Generate fresh operator and scheduler credentials; do not reuse live secrets.
- Browser storage: synthcastGameCast442Operator. Exactly three UI surfaces beneath /v4.4.2/: Public, Chairman, and existing Condensed UI 1.3 rebound to the new endpoint.
- New database installation still uses DDL to define its own empty tables and RPCs. That is initial setup of a new database, not migration of previous data. The original request requires specific approval before applying database DDL; present the final script and destination before execution.

## Verified source contract

Read-only catalog inspection confirmed the 4.4.1 backend uses gamecast_v12.sessions and gamecast_v12.events. Both have RLS enabled. Sessions have UUID identity, unique public slug, operator-token hash, versioned JSON state, week/engine/data identity, and timestamp fields. Events reference the session and retain state version, event type, game ID, payload, and creation time. Release-specific commit/scheduler RPC definitions were inspected directly.

This is not a complete approved DDL package. Identity/sequence details, indexes, grants, policies, and scheduler/Vault setup must be captured and validated before creating the new project's objects. Do not infer deployed DDL from client code.

## Preservation and readiness checks

1. Verify the selected project is newly created and empty before installing new objects. Reject a target equal to percrnamjzetzjjuxuuw or any existing release target.
2. Check versioned namespaces and all identifiers for collisions. Do not overwrite unrelated resources.
3. Test all create/read/commit operations against the new project only; cross-release slugs, engine IDs, game IDs, and operator credentials must be rejected.
4. Test GET polling with an RPC spy and cloud persistence readback: no commit/update calls, state-version changes, or audit-event additions from reads.
5. Deploy only after all mandatory gates and rollback prerequisites pass. Preserve earlier UI bytes and routes during hosting publication; no CSS, layout, or assets in earlier releases may be edited.
6. Rollback means stop using the isolated 4.4.2 endpoint/session and return to unchanged 4.4.1. Do not migrate candidate entries into the earlier database or delete either environment as a rollback step.

No cost, new project ID, new URL, credentials, deployment version, or successful database test is claimed.
