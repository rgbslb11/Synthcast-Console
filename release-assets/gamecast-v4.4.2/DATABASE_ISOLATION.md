# GameCast 4.4.2 additive database release

OBSERVED FACT: the user directed this release to follow the established database work used when starting a new engine and gameplay. This supersedes the separate-project proposal. Target: existing project `percrnamjzetzjjuxuuw`.

## Authorized installation

- Keep `gamecast_v12.sessions` and `gamecast_v12.events`, their designs, RLS, grants, and earlier records unchanged.
- Reuse the inspected, existing service-only `gamecast_v12_create_session` and `gamecast_v12_read_session` functions without editing them.
- Add only `gamecast_v442_commit`, `gamecast_v442_scheduler_auth`, and `gamecast_v442_scheduler_sessions`, with service-role-only execution. The SQL is in `persistence.sql`.
- Generate a fresh Vault credential named `gamecast_v442_deadman` inside the database. Never return or log its value.
- Bind the new function `gamecast-week7-v4-4-2` to engine `GC-W7-V4.4.2-RC1`, week `2026-W07`, and session prefix `w7v442-`. The commit function rejects foreign-release rows, stale versions, mismatched game identities, and QA acceptance/publishing.
- Add only `gamecast-v442-deadman` after the new backend has passed cloud checks. `scheduler.sql` calls only the new endpoint and checks for eligible 4.4.2 sessions.
- Browser storage is `synthcastGameCast442Operator`. Exactly three surfaces live beneath `/v4.4.2/`.

## Verification

OBSERVED FACT: pre-install collision inspection found none of the proposed 4.4.2 functions, Vault name, scheduler job, or backend function. The existing 4.4.1 and shared create/read definitions were fingerprinted for comparison after installation.

Required cloud checks: atomic persistence/readback; stale-version rejection; GET polling leaves stored state/version/events unchanged; incorrect operator/scheduler credentials rejected; all candidate sessions remain QA-only; earlier function definitions remain identical. Installation alone is not release certification.

## Non-destructive rollback

Disable only the new cron job, stop using 4.4.2, and return to the unchanged 4.4.1 backend and routes. Retain 4.4.2 QA rows and events for audit; do not copy them into earlier sessions or delete previous data. No existing table alteration, data conversion, schema redesign, or previous-release credential change is part of this release.
