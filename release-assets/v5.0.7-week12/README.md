# GameCast 5.0.7 — targeted punt correction, QA candidate

Production deployment is HELD. No Supabase functions, SQL, cron, official result,
Pages deployment or existing session was changed. This branch contains no
deployment entrypoint or publication workflow. Its UI configuration points only
to a same-origin QA fixture; it has no production endpoint or key.

## Verified baseline and approved scope

- Baseline: `release/gamecast-v5.0.6`, commit
  `754d959def7a67f2ada99a13f4e3a4c3254be4b8`.
- Deployed `gamecast-week11-v5-0-6-chairman`, function version 5, was inspected.
  Its `runtime/engine.mjs` matches the pinned repository source byte for byte.
- Complete repository instructions loaded: AGENTS.md, GAMECAST_MASTER_ROUTER.md,
  01_WEEKLY_DATA_DEPLOYMENT.md, 02_FORENSIC_DEFECT_REPAIR.md and
  04_MATH_PROBABILITY_ENGINE.md.
- Only football change: resolve a punt reaching/passing the receiving goal line
  as a touchback before field-position clamping. Preserve safety adjudication,
  sacks, rushing, passing, RNG consumption, timing, HFA and calibration.
- Candidate engine: `GC-W12-V5.0.7-QA1`; namespace `qa-w12v507-`.
  QA flags are true at creation and official acceptance is prohibited.
- Schema binding is `gamecast_v507_qa_w12`, which was not installed. Old
  5.0.6 namespaces are rejected. Cloud verification remains NOT TESTED.

## Punt rule and calculation order

Inputs: `old` is the pre-punt ball coordinate in the kicking team's direction
(own goal line 0, receiving goal line 100); `yards` is the existing simplified
net punt result in yards, including the unchanged weather model.

1. Calculate the uncapped endpoint `endpoint = old + yards`.
2. If `endpoint >= 100`, record `PUNT_TOUCHBACK` and flip possession to OWN 20.
3. Otherwise retain the existing receiving spot: `100 - clamp(1, endpoint, 99)`.
4. Existing `flip` initializes possession, first down, distance and stopped clock.
5. Existing history records carry the ruling, original description, pre-snap
   state and adjudicated result. Both API views carry the same resulting spot,
   possession and `PUNT TOUCHBACK` last-play description. Private history/RNG
   remain excluded from API views as in the existing contract.

No new random draw, probability distribution or yardage tuning is introduced.
Endpoint 99 remains a legitimate receiving spot at OWN 1. Endpoint 100 or greater
is OWN 20. Losses ending at/beyond the offense's own goal line remain safeties.
The pre-existing safety free-kick abstraction (conceding side kicks from OWN 20,
next possession starts at OWN 25) is preserved; no new kick model was introduced.

## Input provenance

`ratings.csv` is byte-identical to the Chairman-approved whole-number file from
this thread: 122 entries, including schedule-only ULL, 366 rating values,
120/120 Week 12 participants covered. The 60 canonical game IDs were matched by
away/home codes to sheet W12 of
`2026_TV_Carriage_W10-W16_CANONICAL.xlsx`. Kickoffs and networks use the later
`Week_12_Carriage_Records_BW_Landscape.pdf` supplied in this thread.

One source conflict is explicit: the older workbook says midnight for NDSU at
Hawaii; the later PDF records the Chairman's 11:59 PM ET override. The candidate
retains 11:59 PM ET. Hashes and source identity are in `input-manifest.json`.
Venue addresses and real-user sign-in were not verified by this task.

## Required regression cases

| Case | Result | Status |
| --- | --- | --- |
| G0541 punt from SC 41, 41 yards | SC OWN 20 | PASS |
| G0555 punt from UTSA 40, 45 yards | UTSA OWN 20 | PASS |
| Midfield punt, 42 yards | Receiving OWN 8 | PASS |
| Opponent 47 punt, 40 yards | Receiving OWN 7 | PASS |
| OWN 8, sack -8 | Defense +2 | PASS |
| OWN 9, sack -9 | Defense +2 | PASS |
| OWN 9, loss -8 | OWN 1, no safety | PASS |
| Safety continuation | Correct team, quarter, free-kick metadata and possession | PASS |

All spot/safety cases cover both possession orientations; safety continuation
covers all four regulation quarters. Boundary sweep: 1,830 punt inputs. Stored
history replays cover the two affected sequences and three coherent sequences,
including the two specifically reviewed legitimate safeties. These are forced
resolved-play replays, not a claim to regenerate historical RNG runs.

Actual candidate HTTP handlers were exercised with disk-backed RPC fixtures:
engine advancement, atomic persisted state/event, exact retry receipt, process
restart, Chairman read, public read and read-only polling. This is not cloud
Postgres integration evidence.

## Offline release gates

78 automated tests pass: 54 unchanged 5.0.6 tests and 24 candidate tests.
The canonical 60-game board completed simultaneously, with 1x/50x equality.
60 fixed-seed repeats, 60 chunked comparisons and 300 speed comparisons
(1x/4x/10x/20x/50x) passed.

The paired population used 50 seeds for each of 60 matchups: 3,000 baseline and
3,000 candidate games with identical approved inputs and starting checkpoints.
Opening-toss checkpoints were shared so the comparison isolates the punt fix.
1,974 complete games without a goal-line punt matched exactly; all other 1,026
pairs matched until the first corrected punt. The comparison did not enforce
a target safety rate. Full counts and Wilson intervals are in
`evidence/offline-gates.json`.

| Measure | 5.0.6 mechanics | Candidate mechanics |
| --- | ---: | ---: |
| Safeties | 450 | 285 |
| Games with a safety | 419 / 3,000 | 269 / 3,000 |
| Recorded punt touchbacks | 0 | 1,238 |
| Average combined points | 42.3273 | 42.3420 |
| Average plays | 139.0353 | 139.0363 |
| Average GL seconds | 7,703.3893 | 7,703.0453 |
| Average absolute margin | 12.1580 | 12.1260 |

These are observations from this test population, not production forecasts or
calibration targets. There is no statistical proof that every future safety
rate or score distribution is appropriate.

| Release gate | Current evidence |
| --- | --- |
| Engine/state integrity | PASS — offline regression and boundary cases |
| Fixed-seed regression | PASS — 60 repeats and paired unaffected histories |
| Multi-seed distribution | PASS — 3,000 paired games, observation only |
| Full board | PASS — all 60 canonical Week 12 games, offline |
| Poll/chunk invariance | PASS — 60 full-game comparisons plus read-only API polls |
| 1x–50x invariance | PASS — 300 comparisons, all supported speeds |
| Backend persistence/versioning | PASS for disk RPC fixtures; cloud NOT TESTED |
| Chairman console integration | Browser test prepared; NOT TESTED pending CI |
| Public scoreboard integration | Browser test prepared; NOT TESTED pending CI |
| Mobile Safari | NOT TESTED; mobile WebKit test prepared, not a physical device |
| Existing sessions | 5.0.6 untouched and namespace rejection tested; live 5.0.7 migration NOT TESTED and not implemented |
| Chairman release approval | NOT GRANTED — deployment explicitly held |

The local browser download failed with an invalid/truncated archive. A test-only
GitHub workflow runs Chromium and mobile WebKit without deploying anything.
Its eventual results must be inspected before either UI gate can be marked PASS.
The first CI run passed Chairman and public punt display checks, then exposed
retained Week 11 date/count bindings in the condensed UI. Only the candidate's
date validator, Saturday selector and labels were rebound to the verified Week
12 slate; the 5.0.6 UI is unchanged. A regression test covers those bindings.

## History preservation and rollback

The Week 11 session `w11v506-43c2306679a19d1e` remained at state version 62958
and MD5 state witness `f685b33edc6101a9ed6d9a3b14eb3f4d` before and after local QA.
The existing Week 11 final_snapshots table had zero rows; accepted games are in
the unchanged session state. Only read-only SQL was used against that release.
No 5.0.6 file changed. No QA result can be accepted as an official result.

Rollback now means discard this undeployed candidate branch. The preserved
5.0.6 release and all existing routes remain the operating baseline. A future
deployment requires an isolated cloud QA installation, live recovery/integration
checks and separate Chairman release approval.

Reproduce from repository root:

```sh
node scripts/build-v507-qa.mjs
node --test tests/v506/*.test.mjs tests/v507/*.test.mjs
node tests/v507/gates.mjs
```

Recommendation: DO NOT APPROVE production deployment until the remaining gates
and Chairman release approval are complete.
