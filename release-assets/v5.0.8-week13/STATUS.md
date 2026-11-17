# GameCast 5.0.8 Week 13 — candidate status

**Prepared and tested; NOT DEPLOYED. Production activation is HELD.**

Source candidate: `5e219ed1d4447326c0b005f17051822511ff9336`, branch `release/gamecast-v5.0.8`. Isolated CI run [43998121499](https://github.com/rgbslb11/Synthcast-Console/actions/runs/43998121499) completed successfully. The subsequent status/evidence commit changes documentation only.

## Exact input reconciliation

| Item | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| Chairman carriage entries | 59 | 59 | PASS |
| Unique canonical Week 13 game IDs | 59 | 59 | PASS |
| Distinct participants | 118 | 118 | PASS |
| Tuesday / Wednesday / Thursday / Friday / Saturday | 1 / 1 / 3 / 6 / 48 | 1 / 1 / 3 / 6 / 48 | PASS |
| Supplied ranked teams | 25 | 25 | PASS |
| Carried approved rating rows / values | 122 / 366 | 122 / 366 | PASS |
| Scheduled participants with all three ratings | 118 | 118 | PASS |
| Newer post-W12 rating comparison entries | 121 | 121 | PASS — 85 changed; not selected |

All 59 individual matchups, canonical IDs, date/time and network mappings are preserved in `RECONCILIATION.md`, `chairman-carriage.tsv` and `slate.json`. The inherited Eastern convention was used; the supplied table has no explicit timezone heading. G0649's canonical stadium ID remains BLOCKED/undetermined; home designation is confirmed, and no address was inferred.

## Twelve release gates

These are candidate test results, not a production certification. Any replacement ratings invalidate the carry-forward distribution evidence until it is rerun.

| # | Gate | Status | Evidence and limit |
| --- | --- | --- | --- |
| 1 | Engine/state integrity | PASS | 17 scoped tests and 1,180 full games; legal periods, field, score, TOP and final state. Every football source byte matches 5.0.7 after four metadata declarations and schedule-import normalization. |
| 2 | Fixed-seed regression | PASS | 59 repeated runs; exact 5.0.7 parity across all 1,180 paired histories. |
| 3 | Multi-seed distribution checks | PASS | 20 seeds × 59 games = 1,180; inherited approved ratings. Mean points 43.2076, mean plays 138.9322, mean GL 7,702.5729 seconds. No distribution tuning. |
| 4 | Full-board checks | PASS | All 59 games projected together, including 1x/50x parity. This is an offline full-board check, not a shared-cloud load test. |
| 5 | Poll/chunk invariance | PASS | 59 complete-history comparisons using 37-second chunks; actual fixture API reads leave persistence and football unchanged. |
| 6 | 1x vs 50x invariance | PASS | 295 comparisons covering 1x/4x/10x/20x/50x; identical equal-synthetic-time football. |
| 7 | Backend persistence/versioning | PASS | Disposable PostgreSQL 17 applied the exact schema; service-only dispatch, write gate, roster revocation, idempotent creation/retry, exact 59-game state, read-only polling, cron disabled, foreign release isolation. Production installation NOT TESTED. |
| 8 | Chairman console integration | PASS | Generated UI + actual HTTP handlers in Chromium and mobile WebKit: exact IDs/order, 59/59 power, 59 Launch controls, search, viewport fit and read-only behavior. Launch/retry/disarm paths tested in isolated HTTP fixtures. Actual production Auth/Chairman controls NOT TESTED. |
| 9 | Public scoreboard integration | PASS | Full and condensed views pass in both browsers, including exact identities/order, search, fit, no read-triggered progression and foreign-session rejection. Hosted Week 13 route NOT TESTED/not published. |
| 10 | Mobile Safari | NOT TESTED | Mobile WebKit passed; no physical iPhone Safari session was exercised. |
| 11 | Existing-session compatibility | PASS | Prior-release tracked source/assets are unchanged; `w13v508-` rejects Week 12 session IDs; no live database writes were issued. No operating historical board was restored, replayed or migrated. |
| 12 | Chairman approval | NOT TESTED | Weekly rating selection and final activation review remain pending. No launch, acceptance, SEUD publication or production activation occurred. |

The test workflow rebuilt the package without a tracked diff. PostgreSQL and both browsers passed in CI. Local browser execution was unavailable because host socket creation is denied. Source-preserving copies retain baseline whitespace; TSV trailing empty cells are intentional. The newly authored generator/tests/workflow pass a scoped Git whitespace check.

## Remaining activation decision

Select either the exact approved 5.0.7 ratings or `Week12_GAMECAST_Ratings_POST_W12_121_R1.csv` (85 of 121 teams changed), and confirm Eastern kickoffs. The newer ratings are documented and compared individually but have not modified the candidate. Activation must use the selected frozen input and its actual hash; no production rating changes are inferred.

Once selected, regenerate and rerun affected checks, then install only the new Week 13 schema/functions, create one idempotent unlaunched board, verify hashes and cloud API responses, and publish the new route with all current hosted assets preserved. Do not arm or launch games automatically. The existing Week 12 board was observed with 60/60 READY; only its cron is currently active, with prior-week jobs disabled. Scheduler handoff should disable the completed Week 12 job when the new operating week is activated.

Rollback: `rollback.sql` disables only Week 13 writes and cron while retaining all sessions/events/receipts. Earlier releases and accepted results are preserved.
