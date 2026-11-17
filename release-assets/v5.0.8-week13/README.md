# GameCast 5.0.8 — Week 13

Chairman-authorized weekly deployment on `release/gamecast-v5.0.8`. Source lineage is 5.0.7.1 commit `538ea025efec5c4d517b7449c8b4d66169060b17`; the authoritative football baseline remains deployed `GC-W12-V5.0.7-RC1`. The complete repository router and `01_WEEKLY_DATA_DEPLOYMENT.md` were loaded. The attached 4.3.1 registry is historical relative to this verified baseline.

The Chairman supplied 59 games and the exact approved `Week12_GAMECAST_Ratings_POST_W12_121_R1(1).csv`, then explicitly confirmed Eastern Time. All 59 canonical game IDs, 118 distinct participants, 25 ranks, supplied overall/conference records, carriage dates and networks reconcile. The daily counts are 1 Tuesday, 1 Wednesday, 3 Thursday, 6 Friday and 48 Saturday. Each of the 59 named entries is recorded separately in `RECONCILIATION.md` and `slate.json`.

`approved-ratings.csv` and generated `ratings.csv` retain the attachment's exact bytes: SHA-256 `d69662d7ac62554f770ddea65cee3646830ae4e3f28e5c72c9984b211f345ac4`. There are 121 unique rating rows, 363 values and complete coverage of the 118 scheduled teams. TEAM/OFF/DEF map directly to overall/offense/defense without recomputation. The file changes 85 of 121 teams relative to the approved 5.0.7 source; the prior extra ULL row is absent from the approved attachment and is not scheduled this week. All 121 separate comparisons are in `ratings-review.json`. The earlier extracted review file is retained as historical evidence, not a deployment input.

Football engine bytes match 5.0.7 after four release metadata declarations and schedule-import normalization. Timing, RNG, HFA, safety adjudication, the punt touchback correction, controls, weather and lifecycle are preserved. No 5.1 probability implementation is imported.

Canonical locked-v5 dates are generic Saturday dates; the Chairman's supplied dates supersede them for 11 earlier-week games. The home designation and canonical conference classification remain intact. G0649 Ohio State at Nebraska still has an undetermined canonical venue ID; no stadium/address was inferred. The inherited engine does not use venue addresses for gameplay.

## Operating bindings

| Surface | Value |
| --- | --- |
| Engine / week | `GC-W13-V5.0.8-RC1` / `2026-W13` |
| Session | See `operating-session.json`; one new unlaunched weekly board |
| Private schema / session prefix | `gamecast_v508_w13` / `w13v508-` |
| Public / Chairman / scheduler APIs | `gamecast-week13-v5-0-8-public`, `-chairman`, `-scheduler` |
| UI | `/v5.0.8/w13/` and `/v5.0.8/w13/ui1.3/` |
| Auth | Existing Chairman password and roster; no new users or copied credentials |
| Initial games | UNLAUNCHED / UNARMED / AUTO false / ON AIR false |

`week13-schema.sql` installs only the new private schema in a transaction, with service-only RPC, RLS, CAS, immutable event receipts, exact game identities/order and idempotent session creation. Default writes and scheduler switches are off. `rollback.sql` disables only Week 13 writes and scheduler; it retains every session, event and receipt.

The publisher preserves all 277 currently hosted assets byte-for-byte and adds 15 new Week 13 assets. It requires a successful isolated preflight for the exact source and rejects intervening code changes. Existing release routes and accepted results are retained. New root and condensed routes bind to the single provisioned operating session.

## Validation and activation

The approved ratings passed 17 targeted checks, 1,180 paired full games, 59 repeatability tests, 59 poll/chunk comparisons, 295 speed comparisons and a 59-game full board locally. The baseline engine receives the identical new rating inputs in paired comparisons; the unchanged football history demonstrates code parity, not unchanged outcomes versus old ratings.

The earlier CI run 43998121499 validated the superseded carry-forward candidate only. Approved-input CI run 44018086851 passed isolated PostgreSQL, Launch/Start Auto/Stop, Chromium and mobile WebKit checks. The new private cloud schema and three functions are deployed and verified against source. Publication jobs completed in run 44019096550, preserving 277 existing hosted assets and adding 15. An initial test assertion incorrectly compared CSS-capitalized text case-sensitively; the corrected read-only hosted verification passed in run 44019730928, with zero product changes or game controls. Physical Mobile Safari and actual human Chairman login/controls are not certified by emulation.

The live Week 12 board was observed at version 82118, 60/60 READY. The rollover disables its completed scheduler and leaves history intact; Week 13 becomes the only active weekly scheduler. No games are armed or launched by deployment. Week 13 is deployed, and the new scheduler returned repeated 200 idle responses while all 59 games remained unlaunched/unarmed. See `STATUS.md` and deployment evidence for the observed final state.
