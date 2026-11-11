# Week 12 operating status — updated November 10, 2026 Central

Engine `GC-W12-V5.0.7-RC1`; branch `release/gamecast-v5.0.7`.
Backend source passed operating preflight at `2a7466366884b7f8491a1253fc19bb24d78eb4d9`.
Initial Pages publication source `7ca25b7a21ed299d09e9ed285ee956ba51b0a4a6`; operating-binding correction publication source `66a7edf791712492ad59978926cfa43c6a5fbe62`.

## Published setup

**Current activation:** Chairman approved deployment and scheduler activation.
Chairman function version 2 and scheduler version 3 are deployed. Scheduler
control and cron job 17 are enabled. G0568 launched at 7:40:39 PM Central on
November 10 (`2026-11-11T01:40:39.720Z`), from GL zero at 1x. The seven other
configured arms are retained. Read `DEADMAN-INCIDENT-2026-11-10.md` for the
control/Refresh fixes and the operating scheduler endpoint correction.

The following version-1 board checkpoint describes the original November 9 setup.

- Chairman: https://rgbslb11.github.io/Synthcast-Console/v5.0.7/w12/?session=w12v507-506ff58ba0cfb7a5
- Public: https://rgbslb11.github.io/Synthcast-Console/v5.0.7/w12/?session=w12v507-506ff58ba0cfb7a5&view=public
- Condensed: https://rgbslb11.github.io/Synthcast-Console/v5.0.7/w12/ui1.3/?session=w12v507-506ff58ba0cfb7a5

60 games, 120 participants, 122 approved rating records / 366 whole-number
values. Rating CSV SHA-256:
`6d04e960a60d00301e8158d336482831e9e509e2b2394d572d96aee340613427`.
All 60 operating games are UNLAUNCHED / UNARMED / AUTO false / ON AIR false.
Public API reads real persistence through the new service-only dispatcher.
Session state version 1, state MD5 `6b975b2ae04a4e3a6b3d37b23d2f4a7b`.
Week 11 remains version 62958, state MD5 `f685b33edc6101a9ed6d9a3b14eb3f4d`.
No historical games were replayed into operational storage or accepted.

## Targeted regressions

| Case | Result | Status |
| --- | --- | --- |
| G0541: punt from SC 41, 41 yards | SC own 20 | PASS |
| G0555: punt from UTSA 40, 45 yards | UTSA own 20 | PASS |
| Midfield, punt 42 yards | Receiver own 8 | PASS |
| Opponent 47, punt 40 yards | Receiver own 7 | PASS |
| Own 8, sack -8 | Defense +2, safety | PASS |
| Own 9, sack -9 | Defense +2, safety | PASS |
| Own 9, loss -8 | Own 1, no safety | PASS |
| Safety continuation | Correct team, quarter points, free-kick metadata, next possession | PASS |

Both affected historical sequences were replayed as isolated resolved-play
fixtures. Legitimate pinned-deep safety sequences also passed. This does not
claim a complete recreation of the historical RNG run.

## Release gate evidence

| Gate | Status | Evidence / scope |
| --- | --- | --- |
| Engine/state integrity | PASS | 99 automated checks; eight requested cases, boundaries and unaffected mechanics |
| Fixed-seed regression | PASS | 60 operating-engine repeatability cases |
| Multi-seed distributions | PASS | 3,000 baseline + 3,000 corrected games, paired checkpoints; observed changes only |
| Full-board checks | PASS | All 60 games complete offline; earlier QA SQL run persisted all 60 in disposable PostgreSQL |
| Poll/chunk invariance | PASS | 60 operating-engine cases; actual public reads preserve stored state |
| 1x–50x invariance | PASS | 300 comparisons at 1x/4x/10x/20x/50x |
| Backend persistence/versioning | PASS | Real authenticated cron progression persists SCHEDULER receipts and football; SQL/CAS/retry tests pass. Live restart recovery was not forced on an operating game |
| Chairman console integration | NOT TESTED | Existing sign-in retained; actual authenticated operating controls remain for Chairman verification |
| Public scoreboard integration | PASS | Actual Chromium + mobile WebKit render all 60 games on both public views; source/persistence unchanged |
| Mobile Safari | NOT TESTED | WebKit emulation is not physical iPhone Safari |
| Existing-session compatibility | PASS | Prior source and all 247 hosted assets preserved; Week 11 state hash/version unchanged |
| Chairman approval | PASS | Explicit approval granted for the tested repair, scheduler activation and late G0568 start |

Operating paired population: baseline 434 safeties; corrected 272 safeties and
1,236 punt touchbacks. Mean combined points 42.5833 -> 42.5970; mean plays
139.0397 -> 139.0297. 1,968 unaffected full games match exactly; 1,032 pairs
match until the first corrected punt. No target safety rate was imposed.

## Activation and recovery

The previous automatic-review block was resolved by explicit Chairman approval.
The scheduler was enabled at `2026-11-11T01:39:02.206625Z`. The first live check
exposed a remaining QA endpoint name in the scheduler URL guard, returning 500
before discovery. The operating binding was corrected and regression-tested.
Scheduler version 3 launched G0568 and generated repeated real 200/201 responses,
new persisted checkpoints and football records. No launch time was backdated.

111 automated tests PASS, including 10 overdue-control/Refresh cases and two
operating scheduler URL/discovery/dispatch cases. The UI scripts use new cache
query versions. Confirmed Refresh reads the authoritative board before clearing
only the local pending request; it never replays that request. An existing tab
must be reloaded once to acquire the changed scripts. Actual human control clicks
and physical Mobile Safari are still NOT TESTED for the patch.

The live full and condensed public views and Chairman sign-in/recovery script
passed actual Chromium and mobile WebKit checks. Browser verification issued zero
create/command requests while independent background progression continued.
Week 11 state remains version 62958 / MD5 `f685b33edc6101a9ed6d9a3b14eb3f4d`.

## Evidence links

- Operating preflight: https://github.com/rgbslb11/Synthcast-Console/actions/runs/42644560696
- Preserved Pages publication: https://github.com/rgbslb11/Synthcast-Console/actions/runs/42644783197
- Hosted read-only browser check: https://github.com/rgbslb11/Synthcast-Console/actions/runs/42644783371
- Disposable PostgreSQL replay/recovery: https://github.com/rgbslb11/Synthcast-Console/actions/runs/42638488305

Rollback: `rollback.sql` disables only Week 12 writes/progression and retains
all sessions, events and receipts. Keep prior release routes intact.

## Early-week monitored rollout

| Game | Matchup | Date | Kickoff |
| --- | --- | --- | --- |
| G0568 | Florida International at Delaware | 2026-11-10 | 7:00 PM |
| G0596 | Troy at Rice | 2026-11-10 | 9:00 PM |
| G0579 | Buffalo at Marshall | 2026-11-11 | 7:00 PM |
| G0617 | Lehigh at Yale | 2026-11-11 | 8:00 PM |
| G0586 | UTSA at New Mexico State | 2026-11-11 | 10:00 PM |
| G0592 | Holy Cross at Penn | 2026-11-12 | 7:00 PM |
| G0577 | East Carolina at Memphis | 2026-11-12 | 7:30 PM |

For each of these seven games, inspect any punt reaching the goal line, any receiving start at own 1–9, and any safety. Reconcile the resolved play, field spot, quarter points, free-kick metadata, persisted history and both displays. An unusual but coherent result is retained. Game outcomes are not forced to meet a safety rate. Use a new scoped engine identity for future behavior changes and retain completed events.

The first hosted check exposed retained QA engine/session bindings in the generated operating UI. The generation step now binds both engine identity and session namespace; regression assertions cover the app and condensed scoreboard engine identities. The four affected UI scripts were corrected without changing backend gameplay or stored board state.

Cloud schedule verification reconciled 12 fields for each of 60 games (720 checks). The private persisted TEAM/OFF/DEF values for all 120 participants match the approved source; canonical sorted participant-rating SHA-256 `96e18a1b6255033f06a8aaf9586ec412da1ac0132d325a861148228515885985`. Ratings are intentionally excluded from the public API payload. The deployed Edge Function runtime engine bytes match the tested operating source, including the punt ruling and unchanged safety adjudication.

Historical November 9 hosted verification PASS: Chromium and mobile WebKit each render all 60 games in the full public view and condensed view, and show the Chairman password sign-in form. No credentials were submitted, no games launched, and public polls left cloud state at version 1. All 247 prior hosted assets plus the 15 Week 12 assets passed byte verification after the binding correction. Actual Chairman sign-in/commands and physical Mobile Safari remain NOT TESTED. That historical activation block is superseded by the approved November 10 recovery above.

## Recovery release evidence

- Backend/UI recovery source: `8907a8b7b375e3ed670ed8ae582de751a229a1c4`.
- Operating scheduler guard and cache setup: `92d79ff75a71d0c4bd9d4770fe4b67487a6184c7`.
- Final preflight source: `4464f9f7326aa6fcf04a809b1cd98f257c7d4ec0`.
- Published UI request source: `54d6c1e9a5c1f4d99c2cb0feda284940d1c089d8`.
- Preflight: https://github.com/rgbslb11/Synthcast-Console/actions/runs/42940897364
- Preserved Pages publication: https://github.com/rgbslb11/Synthcast-Console/actions/runs/42941046129
- Hosted browser check: https://github.com/rgbslb11/Synthcast-Console/actions/runs/42941046149
- Browser results: `evidence/deadman-recovery-hosted.json`.

Football runtime files, ratings, schedule and historical releases are unchanged.
Rollback retains every session and event: disable only Week 12 progression if
needed, then restore the controller/UI files from the baseline. Never purge or
restart an operating game to roll back this repair.
