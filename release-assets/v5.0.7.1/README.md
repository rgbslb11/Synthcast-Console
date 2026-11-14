# GameCast 5.0.7.1 — OPERATION SILENT FALL

Chairman-authorized Week 12 carriage/UI revision. Gameplay remains GC-W12-V5.0.7-RC1. Existing live session and backend functions are retained. The new route is /v5.0.7.1/w12/. Every prior hosted asset is preserved byte-for-byte.

Input: Chairman-provided November 13 Saturday operational carriage (49 rows); all 60 game IDs reconciled. The separately referenced workbook and amendment XML were not attached and are not claimed independently verified. See RECONCILIATION.md for all 49 named entries.

Two operational noon placeholders: G0591 Ole Miss at Oklahoma; G0601 Kansas State at TCU. Actual kickoff remains pending; G0591 actual game date is unconfirmed. Both display PLACEHOLDER with TBD network. No new deadman arms are created. The existing G0570 kickoff+2 arm remains unchanged.

apply-schedule.sql locks the latest existing board, verifies all target games are still UNLAUNCHED, changes only explicit schedule fields, preserves the engine progression timestamp and every football/seed/history field, and writes one audit event through the existing CAS commit function. A prior matching receipt makes reapplication a no-op. It does not pause the live scheduler or create a duplicate session. canonical kickoffOrder remains fixed; the new UI uses UTC and carriageOrder for presentation.

New route uses the existing Chairman login and rejects creation of another board, keeping this revision bound to the ongoing Week 12 operation. Existing operating controls and old routes are retained.

Rollback: retain the prior route, inputs and audit receipt. A metadata reversal must lock the latest board, verify each target remains UNLAUNCHED, and restore only its earlier schedule fields. Never restore an old full board over live action, purge, or rewind a completed result. Do not reapply old kickoff data to a launched game. No automatic rollback or result acceptance is performed.

Testing: targeted field/identity/preservation tests, unchanged football regression, disposable PostgreSQL applying/reapplying the exact SQL, and isolated full/condensed UI checks in Chromium/mobile WebKit. Actual cloud/hosted and physical Mobile Safari remain NOT TESTED until separately recorded. No blanket certification is claimed.
