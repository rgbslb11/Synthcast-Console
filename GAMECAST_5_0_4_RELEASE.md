# GameCast 5.0.4 — Week 10 released

Published and activated October 27, 2026, under the Chairman's explicit instruction: “Continue publish and release provide UI links.” The complete repository router and `01_WEEKLY_DATA_DEPLOYMENT.md` were loaded. Verified baseline: v5.0.3 commit `17e3809730351301ae71cce5f127deb78c08bfec`. Publication source: `8099e2516d59761b2d79ac5378e53ee29785e0af`, branch `release/gamecast-v5.0.4`.

## Operating links

- [Chairman Console](https://rgbslb11.github.io/Synthcast-Console/v5.0.4/w10/?session=w10v504-9995310e7622fcbf)
- [Public Live Scoreboard](https://rgbslb11.github.io/Synthcast-Console/v5.0.4/w10/?session=w10v504-9995310e7622fcbf&view=public)
- [Condensed Scoreboard](https://rgbslb11.github.io/Synthcast-Console/v5.0.4/w10/ui1.3/?session=w10v504-9995310e7622fcbf)

All three returned HTTP 200 with the v5.0.4 label. Chairman access retains existing sign-in and role requirements.

## Data and protected scope

56 games, October 27–31, 2026; 112 distinct participants; 47 conference and nine nonconference games. Counts: one Tuesday, two Wednesday, two Thursday, three Friday and 48 Saturday. Supplied carriage determines dates, Eastern kickoff times, networks, ranks, records and notes. Pairings, canonical IDs, codes, conference and neutral flags reconcile to read-only synthetic_CFB data. No canonical records were changed. Georgia–Florida and Notre Dame–Navy remain neutral. Tulsa–Hawaii is October 31 at 11:59 PM Eastern / November 1 at 03:59Z.

All 121 approved rating triples are frozen in `release-assets/v5.0.4-week10/approved-ratings.csv` and byte-identical `ratings.csv`, from `GAMECAST_W10_OPTION2_121_R1.csv` version 2. SHA-256: `f615022104fe545af1585c4a1b76d5dc0802ceb36ca4afe5b98756d760f1bc2a`. Compiled `backend/runtime/power.mjs` preserves all 363 values; source `W10-OPTION2-CHAIRMAN-R2`.

The 18 cumulative Chairman overrides remain; the other 103 Option 2 base triples are unchanged. Latest: NDSU 82/80/89; Georgia State 72/73/74; Florida 95/96/95; UTSA 85/86/84; Nevada 77/72/74. Nine non-centered triples remain exactly as approved, without normalization or real-world blending.

Football code changes are limited to slate imports and release/data identity. HFA, probabilities, decisions, clocks, weather, lifecycle and OT mechanics retain v5.0.3 behavior. UI bindings, labels, counts, Saturday filtering and date validation identify Week 10. Frozen inputs, backend and SQL are under `release-assets/v5.0.4-week10/`; UI under `public/v5.0.4/w10/`; preparation, publication and activation scripts under `scripts/`; tests under `tests/v504/`.

## Deployment and live verification

Project `xsvdmcipviejxynkdbhq`; isolated schema `gamecast_v504_w10`; engine `GC-W10-V5.0.4-RC1`; data `W10-SLATE56+RATINGS121_CHAIRMAN_R2+CSV_f615022104fe545a+V504`. The existing exposed API schemas were preserved and appended. Three version-1 functions are ACTIVE: `gamecast-week10-v5-0-4-public`, `gamecast-week10-v5-0-4-chairman`, `gamecast-week10-v5-0-4-scheduler`. Public function readback matched all 14 reachable source files. See backend and activation receipts in release assets.

Exactly one operating session was created with idempotency key `v504-w10-approved-release-20261027`: `w10v504-9995310e7622fcbf`. Writes and cron are enabled. At acceptance, state version is 1; all 56 games UNLAUNCHED, Auto off, off-air and Deadman UNARMED. No game launched and no result accepted. The scheduler excludes this idle board until operator action.

Live database reconciliation: 112 unique participants, zero power-object mismatches against approved compiled ratings. Public API read: exact 56 ordered games, teams, dates, kickoff/network, timezone, venue and neutral fields; all power-ready and unlaunched. Private power objects, seeds, RNG, command tokens and Deadman configuration are absent from public game state. Public health returned 200, anonymous Chairman access 401, and public write attempt 405.

[Publication workflow 40514592417](https://github.com/rgbslb11/Synthcast-Console/actions/runs/40514592417) passed verification, Pages deployment and hosted verification. All 204 hosted files matched expected hashes: 189 existing files preserved and 15 Week 10 files added. Prior v5.0.3 session `w9v503-38631f64661af135` remained version 89718 with state MD5 `b3965ef12c8ee1aa38e5d4e1e391b0b8`, unchanged from preflight.

## Acceptance and limits

| Gate | Result |
|---|---|
| Frozen inputs and ratings | PASS — exact CSV bytes, 363 values, 18 overrides, 103 unchanged teams |
| Engine/state integrity and fixed-seed regression | PASS — 28 tests, including 56 full-game baseline/candidate comparisons |
| Speed invariance | PASS — 56 equal-synthetic-time 1x/50x comparisons |
| Persistence/versioning | PASS — commit, replay, conflict rejection, recovery, RLS and anonymous denial; all probe writes rolled back |
| Full board, search, Upcoming, Auto controls and polling | PASS — Chromium/WebKit fixtures using actual release handlers |
| OT editor and final OT status | PASS — Chromium/WebKit regression fixtures |
| Live backend, approved powers and public read | PASS — exact operating-board reconciliation |
| Prior release/session preservation | PASS — hosted hashes, prior state/version, separate namespace |
| Chairman production authorization | PASS — explicit publish/release instruction |
| Real-user sign-in this session | NOT TESTED — authenticated controls exercised with fixtures |
| Physical iOS Safari | NOT TESTED — WebKit mobile-viewport fixtures passed |
| Multi-seed distribution and poll/chunk invariance | NOT TESTED for this release; engine mechanics unchanged |

Four canonical venue IDs remain `venue-undetermined`: G0476 Washington–Nebraska, G0455 Georgia–Florida, G0465 Minnesota–Indiana and G0473 Notre Dame–Navy. Stadium identity remains unresolved; existing weather uses Chairman-entered categories. Supplied outstanding-Week-9-result notes for Utah, NDSU and New Mexico remain unchanged; record/note reconciliation remains an operator decision.

## Rollback

`release-assets/v5.0.4-week10/rollback.sql` disables only new-release writes and cron while retaining state and audit history. Existing releases, routes and sessions remain available. Do not overwrite the whole Pages site or delete operating state. Documentation-only receipt commits after publication do not change deployed UI or trigger publication.
