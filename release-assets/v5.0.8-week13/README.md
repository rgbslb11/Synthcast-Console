# GameCast 5.0.8 — Week 13 candidate

Prepared on `release/gamecast-v5.0.8` from verified 5.0.7.1 source `538ea025efec5c4d517b7449c8b4d66169060b17`. The 5.0.7 authoritative Chairman bundle matches 14 checked-in backend files, including the actual engine. The repository master router and `01_WEEKLY_DATA_DEPLOYMENT.md` were read completely. The attached 4.3.1 registry is historical relative to this baseline.

## Scope and inputs

This is a weekly data and release-binding update. Football engine bytes are identical to deployed 5.0.7 after removing the four release metadata declarations and renaming the schedule import. The punt touchback correction, safety adjudication, ratings, timing, weather, controls and deterministic RNG remain unchanged. No 5.1 probability or UI implementation is imported.

The Chairman's supplied carriage has **59 games / 118 distinct participants**: Tuesday 1, Wednesday 1, Thursday 3, Friday 6, Saturday 48. Every game matches one canonical Week 13 ID, G0618–G0676. All 25 ranks, overall records and supplied conference records are retained as schedule metadata. Existing UI functionality is retained. All 59 named entries, dates, networks and UTC conversions appear in `RECONCILIATION.md`.

Kickoffs use **America/New_York (Eastern)**, inherited from the Week 12 convention. UTC conversion round-trips through the actual timezone implementation, including next-day UTC timestamps. Explicit confirmation remains pending because the supplied table has no timezone heading.

Canonical locked-v5 dates use generic Saturday dates; the Chairman's 11 earlier-week carriage dates take precedence. Home designation and canonical conference classifications are retained. G0649 Ohio State at Nebraska has `venue-undetermined` in the canonical source; its home designation is known, but no stadium ID/address is inferred. This does not affect gameplay because the inherited engine does not use venue addresses.

## Ratings decision

The candidate currently carries the **exact 122 approved 5.0.7 records / 366 values**, SHA-256 `6d04e960a60d00301e8158d336482831e9e509e2b2394d572d96aee340613427`. Its power values and original provenance match 5.0.7 exactly; only exported scheduled-participant metadata changes from 120 to 118. All 118 participants are covered.

A newer `Week12_GAMECAST_Ratings_POST_W12_121_R1.csv` was found and read in full (Library `libfile_96e300a21b0c8191be4077587da8a050`). It changes 85 of its 121 rows relative to the approved 5.0.7 file. It has not been selected or deployed. Its extracted table and all 121 separate comparisons are retained in `post-week12-ratings-review.csv` and `ratings-review.json`. The extraction's `index` column is parser metadata, not a verified source-file column. Choose carry-forward or the newer ratings before activation; test results only certify the carry-forward candidate.

## Isolation and deployment

- Engine: `GC-W13-V5.0.8-RC1`; week `2026-W13`.
- Sessions: `w13v508-`; private schema: `gamecast_v508_w13`.
- API names: `gamecast-week13-v5-0-8-public`, `-chairman`, `-scheduler`.
- UI source: `public/v5.0.8/w13/` and `ui1.3/`; new browser storage keys; no hardcoded Week 12 session.
- Existing Chairman roster is referenced, never copied; public RPC is service-role only.
- `week13-schema.sql` is transaction-wrapped; constraints freeze game IDs, order, release, data version and board size. Session creation uses the inherited idempotency/CAS architecture. Migration is a one-time install, not a schema replacement.
- Default writes, cron dispatch and cron job are disabled. Every game starts UNLAUNCHED/UNARMED, AUTO false and ON AIR false.
- `verify-v508.yml` runs isolated tests only. It has no cloud credentials, deployment or publication steps.
- Production schema, functions, session, scheduler and hosted route have **not been created or activated**. No games were launched and no official results accepted.

Before activation, select ratings, confirm Eastern, pass disposable storage and browser tests, then install only the new release and verify actual deployed hashes/API bindings. Publish the new route by preserving the latest published assets, using the existing preserved-publication workflow pattern; never publish an incomplete branch-wide static export. Retain Week 12 and all historical routes. Do not enable Week 13's scheduler or arm games merely by creating the new board. Scheduler handoff must account for any unfinished Week 12 games; do not disable Week 12 while it is still needed.

## Validation and rollback

`evidence/offline-gates.json` records 1,180 paired simulations with exact 5.0.7 parity, 59 repeatability cases, 59 poll/chunk comparisons, 295 speed comparisons, and a 59-game full board. `evidence/unit.tap` records 17 passing input, isolation, source, controls, retry/recovery and scheduler tests. QA fixtures never write to shared storage or accept official results.

Local browser execution is unavailable because this execution host denies browser sockets. Browser and PostgreSQL checks are configured in isolated GitHub CI; their status must be inspected before claiming a pass. Physical Mobile Safari and actual production Chairman login remain NOT TESTED.

Rollback before activation is simply to retain the existing operating route. After an approved install, `rollback.sql` disables only the new release's writes and scheduler; every session, event, audit receipt and historical result remains intact. Never roll back by restoring an old full board, replaying accepted games or purging storage.
