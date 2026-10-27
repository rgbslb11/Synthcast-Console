# GameCast 5.0.4 — Week 10 candidate

Chairman direction: use v5.0.3 behavior for Week 10, issuing this week's release as v5.0.4. The full repository router and `01_WEEKLY_DATA_DEPLOYMENT.md` were read at v5.0.3 commit `17e3809730351301ae71cce5f127deb78c08bfec`.

## Scope and source

56 games, October 27–31, 2026; 112 distinct participants; 47 conference and 9 nonconference games. Dates, kickoff times (Eastern), networks, ranks, displayed records and notes come from the Chairman's supplied carriage. The weekday counts are 1 Tuesday, 2 Wednesday, 2 Thursday, 3 Friday and 48 Saturday. All 56 pairings, canonical IDs, team codes, conference flags and neutral flags reconcile to the current synthetic_CFB `seud.games` / `seud.teams` records, queried read-only. Chairman carriage overrides the canonical schedule's placeholder Saturday dates for the eight weekday games; no canonical database records were changed.

Georgia–Florida (G0455) and Notre Dame–Navy (G0473) remain neutral. Tulsa–Hawaii (G0461) is October 31 at 11:59 PM Eastern, November 1 at 03:59Z. Tight network sequences, premiere holds and streaming notes are retained exactly; no automatic rescheduling is introduced.

The final 121 Week 10 rating triples are now loaded into this candidate from the Chairman-approved `GAMECAST_W10_OPTION2_121_R1.csv`, Library version 2. CSV SHA-256 `f615022104fe545af1585c4a1b76d5dc0802ceb36ca4afe5b98756d760f1bc2a`. The approved input is frozen as `approved-ratings.csv`; `ratings.csv` matches it byte for byte, and compiled `power.mjs` preserves every one of its 363 numeric values. Source version: `W10-OPTION2-CHAIRMAN-R2`.

The file uses the Week 10 Option 2 base with 18 cumulative Chairman overrides. The other 103 base-team triples remain unchanged. The latest five are NDSU 82/80/89; Georgia State 72/73/74; Florida 95/96/95; UTSA 85/86/84; Nevada 77/72/74. Nine non-centered triples are intentionally preserved exactly as instructed; no OFF/DEF symmetry correction, rescaling, rounding or real-world blending is applied. Frozen team identities, original Option 2 base inputs and the cumulative override ledger are included for reconciliation.

The deployed v5.0.3 public function was retrieved and all 14 source files matched the pinned repository source exactly. The existing Week 9 session had 52 READY games at inspection. This is baseline evidence, not evidence of a deployed Week 10 release.

## Implementation

Prepared branch: `release/gamecast-v5.0.4`; route source: `public/v5.0.4/w10/`; backend source and frozen inputs: `release-assets/v5.0.4-week10/`. The candidate uses `gamecast_v504_w10`, `w10v504-`, `GC-W10-V5.0.4-RC1` and separate Chairman/public/scheduler function names.

Football code differs only in the slate import and four release/data identity constants. Only the approved 363 rating values and their data identity change in this loading step. HFA, clocks, football decisions, weather and Deadman mechanics are retained. UI changes are limited to release bindings, version labels, 56-game counts, 48-game Saturday filtering, date validation and accurate approved-rating labels. OT editor/status functions and styling match v5.0.3 exactly.

New SQL create/commit guards use all 56 ordered canonical IDs. Writes and cron control default OFF; the cron job is created inactive. Existing API schema exposure is appended at deployment rather than replaced from an old list. The schema script is a one-time transactional provisioning input, not an automatic import or idempotent schema migration. Session creation retains the existing idempotency controls. No backend provisioning, scheduling, operating-session creation, game launch, result acceptance or publication was performed during preparation.

`scripts/prepare-v504.mjs` reproduces these isolated source files offline. The new verification workflow has read-only repository permissions and runs local fixture tests; it contains no deployment job.

## Verification and unresolved evidence

28 local tests PASS: frozen inputs and ordering; exact approved rating bytes, all 18 overrides, 103 untouched base triples and all scheduled-team coverage; canonical identities; timezone rollover; neutral flags; safe defaults; public/private boundaries; Chairman authorization; acceptance controls; concurrency preconditions; Deadman batch controls; OT editor/status regressions; SQL identity guards; exact football source parity; 56 full-game baseline/candidate comparisons; and fixed-seed 1x/50x comparison across all 56 games.

The local browser download failed, so browser verification ran in GitHub Actions. Workflow [40434385718](https://github.com/rgbslb11/Synthcast-Console/actions/runs/40434385718) PASSED on the earlier schedule-only candidate commit `979558cef6932231732f656a5304f92b4f6ce5f2`: all 27 logic tests, exact reproducible preparation, prior-source preservation, Chromium and WebKit mobile-viewport checks for the Chairman, public and condensed views, all 56 ordered games, all supplied teams/networks/kickoffs, 48 Saturday games, search, Upcoming, Start/Stop Auto, live polling, finished OT editing and final OT labels. Browser checks used local API fixtures with actual release handlers; they did not exercise the live database or real-user sign-in. Physical iOS Safari remains NOT TESTED. Hosted v5.0.3 index.html, app.js, release-config.js and condensed scoreboard.js were also fetched and matched source exactly.

Four canonical venue IDs remain `venue-undetermined`: G0476 Washington–Nebraska; G0455 Georgia–Florida; G0465 Minnesota–Indiana; G0473 Notre Dame–Navy. Specific stadium identity is BLOCKED. Existing weather mechanics use Chairman-entered categories, not a stadium lookup; no venue is inferred or canonical record altered.

Three supplied display notes say Week 9 results are outstanding: G0451 Utah–Cincinnati, G0475 UTEP–North Dakota State, G0485 New Mexico–San Jose State. All supplied records and notes are preserved. Week 9 now has 52 READY games, so record/notes reconciliation remains an operator data decision; preparation does not infer corrected records.

| Release gate | Status |
|---|---|
| Engine/state integrity | PASS — local structural and full-game comparison checks |
| Fixed-seed regression | PASS — 56 baseline/candidate full-game comparisons |
| Multi-seed distribution | NOT TESTED — no mechanics or rating changes |
| Full-board load | PASS — local 56-game board and identity checks |
| Poll/chunk invariance | NOT TESTED for this candidate |
| 1x vs 50x | PASS — 56-game equal-synthetic-time checks |
| Backend persistence/versioning | NOT TESTED — SQL prepared, not applied |
| Chairman console | PASS — logic and Chromium/WebKit fixture checks |
| Public scoreboard | PASS — logic and Chromium/WebKit fixture checks |
| Mobile Safari | NOT TESTED — physical device; WebKit mobile-viewport fixtures PASS |
| Existing-session compatibility | Separate namespace; prior source unchanged; no live migration tested |
| Chairman production approval | PENDING — preparation authorized; publication not authorized |

## Publication and rollback

NOT DEPLOYED. Before publication: resolve or explicitly accept display/venue exceptions; transaction-test and provision the new schema with both writes and scheduling OFF; deploy and verify three new functions; preserve and hash all existing hosted files before adding the 15 new UI files; obtain Chairman production approval; then create and verify exactly one unlaunched operating session before enabling scheduling. Retain v5.0.3 and every earlier release throughout.

`release-assets/v5.0.4-week10/rollback.sql` disables only the new release's writes and cron while preserving state. Before activation, withdrawing this source-only branch requires no production rollback. Do not publish a whole checkout over the existing Pages site: historical routes require preservation as in the v5.0.3 publisher.


## Final ratings loaded into release source — October 27, 2026

Chairman instruction: “Please load into 5.0.4.” The final Week 10 file supersedes the temporary retained Week 9 ratings in the candidate. The offline generator now requires the pinned final CSV hash and compiles all 121 rows, rather than restoring Week 9 power. The UI's weekly-data text, engine data version and database create-session data-version guard identify this final input. The 56-game slate and engine mathematics are unchanged.

Local checks PASS: all 28 tests, every rating triple against the approved CSV, all 112 scheduled participants, all 18 explicit overrides, all 103 unaffected Option 2 base triples, safe launch defaults, football source parity, 56 full-game baseline/candidate engine comparisons with identical supplied inputs, 56 equal-synthetic-time speed comparisons, and OT regression checks. Browser checks for this ratings-loaded commit must be recorded after the verification-only workflow completes. Prior schedule-only browser evidence above does not certify the new input.

Loading into the release source does not publish or activate the release. No production schema or session was modified, no game launched, and no accepted result changed. For rollback before publication, restore this branch's earlier candidate commit `9cee7c3389ac942bd7ea4c30461d77a3c2afd68a`; the approved CSV and prior Library file versions retain the rating evidence.
