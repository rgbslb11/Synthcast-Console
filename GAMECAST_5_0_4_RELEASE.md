# GameCast 5.0.4 — Week 10 candidate

Chairman direction: use v5.0.3 behavior for Week 10, issuing this week's release as v5.0.4. The full repository router and `01_WEEKLY_DATA_DEPLOYMENT.md` were read at v5.0.3 commit `17e3809730351301ae71cce5f127deb78c08bfec`.

## Scope and source

56 games, October 27–31, 2026; 112 distinct participants; 47 conference and 9 nonconference games. Dates, kickoff times (Eastern), networks, ranks, displayed records and notes come from the Chairman's supplied carriage. The weekday counts are 1 Tuesday, 2 Wednesday, 2 Thursday, 3 Friday and 48 Saturday. All 56 pairings, canonical IDs, team codes, conference flags and neutral flags reconcile to the current synthetic_CFB `seud.games` / `seud.teams` records, queried read-only. Chairman carriage overrides the canonical schedule's placeholder Saturday dates for the eight weekday games; no canonical database records were changed.

Georgia–Florida (G0455) and Notre Dame–Navy (G0473) remain neutral. Tulsa–Hawaii (G0461) is October 31 at 11:59 PM Eastern, November 1 at 03:59Z. Tight network sequences, premiere holds and streaming notes are retained exactly; no automatic rescheduling is introduced.

The 121 v5.0.3 rating rows are retained without recalculation. Both ratings.csv and compiled power.mjs match v5.0.3 byte for byte; CSV SHA-256 `dc8160bcfcb2429a14a900de3f3aa5a0c5804a70698733f5722e9b5ff9601939`. These are retained Week 9 release ratings, not newly calculated post-Week-9 ratings. Poll ranks have no simulation weight.

The deployed v5.0.3 public function was retrieved and all 14 source files matched the pinned repository source exactly. The existing Week 9 session had 52 READY games at inspection. This is baseline evidence, not evidence of a deployed Week 10 release.

## Implementation

Prepared branch: `release/gamecast-v5.0.4`; route source: `public/v5.0.4/w10/`; backend source and frozen inputs: `release-assets/v5.0.4-week10/`. The candidate uses `gamecast_v504_w10`, `w10v504-`, `GC-W10-V5.0.4-RC1` and separate Chairman/public/scheduler function names.

Football code differs only in the slate import and four release/data identity constants. All 363 rating values, HFA, clocks, football decisions, weather and Deadman mechanics are retained. UI changes are limited to release bindings, version labels, 56-game counts, 48-game Saturday filtering, date validation and accurate retained-rating labels. OT editor/status functions and styling match v5.0.3 exactly.

New SQL create/commit guards use all 56 ordered canonical IDs. Writes and cron control default OFF; the cron job is created inactive. Existing API schema exposure is appended at deployment rather than replaced from an old list. The schema script is a one-time transactional provisioning input, not an automatic import or idempotent schema migration. Session creation retains the existing idempotency controls. No backend provisioning, scheduling, operating-session creation, game launch, result acceptance or publication was performed during preparation.

`scripts/prepare-v504.mjs` reproduces these isolated source files offline. The new verification workflow has read-only repository permissions and runs local fixture tests; it contains no deployment job.

## Verification and unresolved evidence

27 local tests PASS: frozen inputs and ordering; retained rating bytes and all scheduled-team coverage; canonical identities; timezone rollover; neutral flags; safe defaults; public/private boundaries; Chairman authorization; acceptance controls; concurrency preconditions; Deadman batch controls; OT editor/status regressions; SQL identity guards; exact football source parity; 56 full-game baseline/candidate comparisons; and fixed-seed 1x/50x comparison across all 56 games.

Local browser execution is BLOCKED: browser binaries were unavailable and their download failed. The read-only verification workflow runs Chromium and WebKit mobile-viewport checks for all three views, search, Upcoming, Start/Stop Auto, polling and OT. Workflow results must be inspected separately; workflow presence is not a PASS. Physical iOS Safari remains NOT TESTED.

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
| Chairman console | Logic checks PASS; browser execution pending workflow |
| Public scoreboard | Logic checks PASS; browser execution pending workflow |
| Mobile Safari | NOT TESTED — physical device; WebKit workflow pending |
| Existing-session compatibility | Separate namespace; prior source unchanged; no live migration tested |
| Chairman production approval | PENDING — preparation authorized; publication not authorized |

## Publication and rollback

NOT DEPLOYED. Before publication: inspect browser workflow results; resolve or explicitly accept display/venue exceptions; transaction-test and provision the new schema with both writes and scheduling OFF; deploy and verify three new functions; preserve and hash all existing hosted files before adding the 15 new UI files; obtain Chairman production approval; then create and verify exactly one unlaunched operating session before enabling scheduling. Retain v5.0.3 and every earlier release throughout.

`release-assets/v5.0.4-week10/rollback.sql` disables only the new release's writes and cron while preserving state. Before activation, withdrawing this source-only branch requires no production rollback. Do not publish a whole checkout over the existing Pages site: historical routes require preservation as in the v5.0.3 publisher.
