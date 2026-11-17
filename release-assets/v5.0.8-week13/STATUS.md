# GameCast 5.0.8 — Week 13 deployment record

**DEPLOYED.** Approved post-W12 ratings and Eastern kickoffs are active. No game was armed, launched, accepted or published to SEUD by this deployment. This record does not certify physical Mobile Safari or an actual human Chairman password/control session.

| Surface | Live link |
| --- | --- |
| Chairman | https://rgbslb11.github.io/Synthcast-Console/v5.0.8/w13/?session=w13v508-6ecefa636ecf706e |
| Public scoreboard | https://rgbslb11.github.io/Synthcast-Console/v5.0.8/w13/?session=w13v508-6ecefa636ecf706e&view=public |
| Condensed scoreboard | https://rgbslb11.github.io/Synthcast-Console/v5.0.8/w13/ui1.3/?session=w13v508-6ecefa636ecf706e |

Engine `GC-W13-V5.0.8-RC1`; week `2026-W13`; private schema `gamecast_v508_w13`; three Edge Functions ACTIVE at version 1. Tested product source `05fb29ff5a7fa978d6b45cabda6afacf8c1ffd0f`; published source `2bdf2e3c115cac0f131288166b5f0cf6cf6c6ee4`. Follow-up commits change verification only; product bytes remain identical to publication.

## Exact reconciliation and live state

| Item | Expected | Observed | Result |
| --- | ---: | ---: | --- |
| Schedule entries / canonical game IDs | 59 / 59 | 59 / 59 | PASS |
| Distinct scheduled teams | 118 | 118 | PASS |
| Tue / Wed / Thu / Fri / Sat games | 1 / 1 / 3 / 6 / 48 | 1 / 1 / 3 / 6 / 48 | PASS |
| Ranked teams | 25 | 25 | PASS |
| Approved source rating rows / values | 121 / 363 | 121 / 363 | PASS |
| Persisted scheduled participant ratings / values | 118 / 354 | 118 / 354 | PASS |
| Operating boards / creation receipts | 1 / 1 | 1 / 1 | PASS |
| UNLAUNCHED / UNARMED games | 59 / 59 | 59 / 59 | PASS |
| Imported historical finals | 0 | 0 | PASS |
| Initial events | 1 creation event | 1 `V508_SESSION_CREATE` | PASS |
| Preserved / added hosted assets | 277 / 15 | 277 / 15 | PASS |

Attachment and deployed rating source SHA-256: `d69662d7ac62554f770ddea65cee3646830ae4e3f28e5c72c9984b211f345ac4`. All 121 individual comparisons are retained in `ratings-review.json`; 85 teams changed from 5.0.7. Exact canonical schedule rows are retained separately in `RECONCILIATION.md`. No rating was recomputed or blended.

Stored participant-rating MD5: `4718513140833e4949c29a3054715390`, independently matched to the 118 scheduled rows from the attachment. State version 1 / MD5 `46d01294102c6a933533ebd39fc6f463` remained unchanged through public and browser reads. Database footprint at verification: 286,720 bytes.

The public API passed 1,003 schedule-field comparisons and 118 team-name comparisons, reported 59/59 power ready and excluded private seeds/RNG/history/ratings/deadman fields. An unauthenticated Chairman request returned 401. All retrieved deployed dependency files matched the tested source (14 public, 14 Chairman, 16 scheduler).

## Twelve release gates

| # | Gate | Result | Evidence and limit |
| --- | --- | --- | --- |
| 1 | Engine/state integrity | PASS | 17 scoped tests; legal score periods, field, TOP and final states in 1,180 games. Football bytes match 5.0.7 after four metadata declarations and the schedule import. |
| 2 | Fixed-seed regression | PASS | 59 repeatability cases; 1,180 exact full-history pairs using identical approved new ratings in both engines. |
| 3 | Multi-seed distribution | PASS | 20 seeds × 59 games. Mean combined points 43.6136, plays 139.0822, GL 7,700.8636 seconds. No engine retuning. |
| 4 | Full-board checks | PASS | All 59 games projected together offline; 1x/50x parity. Shared-cloud live-game load was not forced. |
| 5 | Poll/chunk invariance | PASS | 59 full-history comparisons with 37-second chunks; actual cloud/browser public reads preserve version and state. |
| 6 | Speed invariance | PASS | 295 comparisons at 1x/4x/10x/20x/50x. |
| 7 | Persistence/versioning | PASS | Exact PostgreSQL schema/permissions, CAS and creation retry; actual new cloud schema, one frozen board and verified deployed-source versions. Existing roster retained. |
| 8 | Chairman console integration | PASS | Isolated Launch/Start Auto/Stop and recovery; Chromium/mobile WebKit rendering; actual hosted sign-in form; actual unauthorized API denial. Actual human password/controls NOT TESTED. |
| 9 | Public scoreboard integration | PASS | Actual full and condensed views in Chromium/mobile WebKit: all 59 IDs/order and every matchup/time/network, search, viewport fit and zero control writes. |
| 10 | Mobile Safari | NOT TESTED | Mobile WebKit passed; physical iPhone Safari not exercised. |
| 11 | Existing-session compatibility | PASS | Prior source and 277 hosted assets preserved. Week 11 and Week 12 state hashes/versions unchanged; no historical result writes or duplicated historical boards. |
| 12 | Chairman approval | PASS | Week 13 deployment request, exact attached ratings and explicit Eastern confirmation. No automatic launch authorization inferred. |

## Scheduler rollover and history

Job 18 `gamecast_v508_week13` is the **only active weekly scheduler**, every five seconds. It returned repeated real HTTP 200 responses with zero eligible sessions while the board remains unarmed. Week 12 job 17 and all prior-week jobs are disabled. No control polling generates football events.

Week 12 remains 60/60 READY, version 82118 / MD5 `7936bfe9297c3af6328a3d68c81b51e4`. Week 11 remains version 62958 / MD5 `f685b33edc6101a9ed6d9a3b14eb3f4d`. Only the completed Week 12 scheduler was switched off; results and history were retained.

## Evidence and verification exception

- Approved-input isolated preflight: https://github.com/rgbslb11/Synthcast-Console/actions/runs/44018086851
- Publication jobs and all 292 hosted asset hashes: https://github.com/rgbslb11/Synthcast-Console/actions/runs/44019096550
- Corrected actual hosted Chromium/mobile WebKit verification: https://github.com/rgbslb11/Synthcast-Console/actions/runs/44019730928
- Source, cloud and deployment receipts: `evidence/approved-input-ci.json`, `deployed-source.json`, `cloud-public.json`, `hosted.json`, `deployment.json`.

The original publication run's hosted assertion failed on `Fox` versus the inherited CSS display `FOX`. The API and DOM retained the exact approved network. Verification now compares canonical DOM text for network/kickoff/team values, independent of CSS capitalization; the follow-up passed. No product bytes, schedule or engine changed to resolve the test failure. Initial workspace HTTP timeouts were not reproduced by database-origin or subsequent workspace checks; no code repair was applied.

The security advisor reports INFO-only [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) for seven intentionally private service-role tables. Browser roles have no schema or dispatcher access; no public policy was added. Health advisors returned no notices. Existing out-of-scope schemas were not changed.

G0649 canonical venue ID remains BLOCKED/undetermined, with home designation verified. No stadium/address was inferred; the retained football engine does not consume venue addresses.

Rollback: `rollback.sql` disables only Week 13 writes and scheduler while retaining every session, event and receipt. Retain all existing routes; do not restore an old full board, replay accepted games or purge history. The games await explicit Chairman Launch or deadman arming.
