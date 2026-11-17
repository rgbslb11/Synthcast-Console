# Week 13 approved-input release status

The Chairman supplied the approved 121-team post-W12 ratings and explicitly confirmed Eastern Time. Deployment is authorized. Fresh isolated CI and cloud/hosted verification are in progress; no production activation is claimed in this source checkpoint.

Input reconciliation: 59/59 games, 118/118 distinct participants covered, 25/25 ranks, 121/121 unique rating rows, 363/363 values. CSV SHA-256: `d69662d7ac62554f770ddea65cee3646830ae4e3f28e5c72c9984b211f345ac4`.

| # | Gate | Status at source checkpoint | Evidence / limit |
| --- | --- | --- | --- |
| 1 | Engine/state integrity | PASS | 17 scoped tests and legal state checks in 1,180 games; football bytes unchanged after release metadata normalization |
| 2 | Fixed-seed regression | PASS | 59 repeated runs; all 1,180 pairs match the 5.0.7 engine under identical new rating inputs |
| 3 | Multi-seed distribution | PASS | 20 seeds × 59 games; observed mean points 43.6136, plays 139.0822, GL 7,700.8636 seconds; no retuning |
| 4 | Full board | PASS | 59 concurrent offline games; cloud load not yet exercised |
| 5 | Poll/chunk invariance | PASS | 59 complete-history comparisons using 37-second chunks |
| 6 | Speed invariance | PASS | 295 comparisons at 1x/4x/10x/20x/50x |
| 7 | Persistence/versioning | NOT TESTED | Fresh approved-input PostgreSQL/cloud check pending; prior carry-forward receipt is historical |
| 8 | Chairman console | NOT TESTED | Fresh approved-input browser check pending; actual human login remains separate |
| 9 | Public scoreboard | NOT TESTED | Fresh browser/hosted check pending |
| 10 | Mobile Safari | NOT TESTED | Physical iPhone Safari not exercised |
| 11 | Existing-session compatibility | PASS | Prior source/assets preserved; private schema/session isolation; live preservation rechecked during deployment |
| 12 | Chairman approval | PASS | Week 13 deployment request, attached exact ratings file and explicit Eastern confirmation |

Rollback disables only Week 13 writes and scheduler while preserving all sessions/events/receipts. Every scheduled game remains unlaunched and unarmed at initialization. The 60 accepted Week 12 results and prior releases are protected. G0649 canonical venue remains BLOCKED/undetermined; its home designation is verified and the football engine does not require an address.
