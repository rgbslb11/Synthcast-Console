# Week 12 operating setup — November 9, 2026

Engine `GC-W12-V5.0.7-RC1`; branch `release/gamecast-v5.0.7`.
Backend source passed operating preflight at `2a7466366884b7f8491a1253fc19bb24d78eb4d9`.
Initial Pages publication source `7ca25b7a21ed299d09e9ed285ee956ba51b0a4a6`; operating-binding correction publication source `66a7edf791712492ad59978926cfa43c6a5fbe62`.

## Published setup

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
| Backend persistence/versioning | NOT TESTED | Operating create/read and disposable SQL/retry tests pass; live authenticated command/restart progression remains untested |
| Chairman console integration | NOT TESTED | Existing sign-in retained; actual authenticated operating controls remain for Chairman verification |
| Public scoreboard integration | PASS | Actual Chromium + mobile WebKit render all 60 games on both public views; source/persistence unchanged |
| Mobile Safari | NOT TESTED | WebKit emulation is not physical iPhone Safari |
| Existing-session compatibility | PASS | Prior source and all 247 hosted assets preserved; Week 11 state hash/version unchanged |
| Chairman approval | NOT TESTED | Setup and monitored rollout directed; background scheduler activation still requires explicit approval |

Operating paired population: baseline 434 safeties; corrected 272 safeties and
1,236 punt touchbacks. Mean combined points 42.5833 -> 42.5970; mean plays
139.0397 -> 139.0297. 1,968 unaffected full games match exactly; 1,032 pairs
match until the first corrected punt. No target safety rate was imposed.

## Activation block

The new write switch is enabled for authenticated Chairman setup commands.
The Week 12 scheduler control and cron job remain **disabled**. Automatic
approval review rejected enabling the persistent background scheduler because
it enables future unattended progression. A guarded follow-up documenting all
60 games as unlaunched/unarmed and zero eligible sessions was also rejected.
No workaround or alternative trigger was installed.

The board must not be described as ready for AUTO/deadman game progression
until the Chairman explicitly authorizes enabling this scheduler and its
actual target-cloud behavior is checked. Further live QA may be conducted
during the Tuesday–Thursday games, as directed. Fixes must remain bounded,
versioned, and tested before use; resolved history and accepted results stay
immutable. No unattended monitoring automation was created.

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

Final hosted verification PASS: Chromium and mobile WebKit each render all 60 games in the full public view and condensed view, and show the Chairman password sign-in form. No credentials were submitted, no games launched, and public polls left cloud state at version 1. All 247 prior hosted assets plus the 15 Week 12 assets passed byte verification after the binding correction. Actual Chairman sign-in/commands and physical Mobile Safari remain NOT TESTED. Background cron remains disabled following automatic approval review.
