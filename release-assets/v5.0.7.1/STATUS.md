# GameCast 5.0.7.1 — deployed SILENT FALL revision

Branch `release/gamecast-v5.0.7.1`; unchanged gameplay engine
`GC-W12-V5.0.7-RC1`. Existing live session `w12v507-506ff58ba0cfb7a5`.
No backend functions, football runtime, approved ratings, prior release source,
or historical results were redeployed or replaced.

## Links

- Chairman: https://rgbslb11.github.io/Synthcast-Console/v5.0.7.1/w12/?session=w12v507-506ff58ba0cfb7a5
- Public: https://rgbslb11.github.io/Synthcast-Console/v5.0.7.1/w12/?session=w12v507-506ff58ba0cfb7a5&view=public
- Condensed: https://rgbslb11.github.io/Synthcast-Console/v5.0.7.1/w12/ui1.3/?session=w12v507-506ff58ba0cfb7a5

## Reconciliation and live application

49 Chairman-supplied Saturday operational entries plus 11 protected earlier
games = 60 unique games. All 49 were verified individually by canonical game ID
and team identity; see RECONCILIATION.md for every old/new time and network.
15 kickoff UTC changes and 12 substantive network changes were identified;
display formatting/capitalization is standardized separately.

The source is the Chairman's supplied carriage text. The referenced workbook
and November 13 XML were not separately supplied/read. No external FAA claim
or actual broadcast confirmation was inferred.

The live amendment committed one existing-session audit receipt at state version
54646, `2026-11-14T06:00:20.919503Z`, key `w12-silent-fall-5071-r1`.
The transaction locked the latest board, required every target to remain
UNLAUNCHED, verified a schedule-only allowlist, and preserved all non-schedule
fields and the live progression checkpoint. It used the existing CAS/receipt
function. No scheduler pause, launch, new session, or new arm was issued.
The subsequent public API matched every amended field for all 49 games.

G0601 Kansas State at TCU and G0591 Ole Miss at Oklahoma display noon operational
PLACEHOLDER and network TBD. Actual kickoff remains null/PENDING. G0591's actual
game date remains UNCONFIRMED; its operational Saturday grouping is not a
confirmed actual game date. Both remain UNARMED. G0570 North Dakota State at
Hawaii retains 11:59 PM ET and its original kickoff+2 arm due
`2026-11-15T05:01:00.000Z`, revision 1. No arm configuration was changed.

Final observation at `2026-11-14T06:03:59.238227Z`: scheduler and cron enabled,
state version 54689, 49 UNLAUNCHED / 1 ACTIVE / 1 FINAL_PENDING / 9 READY.
The state version continued advancing after the amendment. Week 11 remained
version 62958 / MD5 `f685b33edc6101a9ed6d9a3b14eb3f4d`.

## Tests and gates

164 automated tests PASS (111 existing + 53 amendment cases). Real disposable
PostgreSQL applied the exact SQL, preserved an active earlier game and all 11
protected games, preserved the advancement timestamp and non-schedule fields,
and verified idempotent reapplication. Isolated UI and actual hosted Chromium
and mobile WebKit checks PASS for all 60 games, all 49 individual time/network
assignments, approved chronological order, and both placeholder warnings.
Hosted browser checks issued zero create/command requests.

| Gate | Status | Scope |
| --- | --- | --- |
| Engine/state integrity | PASS | Schedule-only assertions and 164 tests; no football-runtime changes |
| Fixed-seed regression | PASS | Existing regression suite rerun; unchanged runtime and preserved seeds |
| Multi-seed distributions | NOT TESTED | No new population run for this schedule/UI revision; no tuning or engine deployment |
| Full-board checks | PASS | 60 unique IDs, 49 amended + 11 protected; both hosted views render all 60 |
| Poll/chunk invariance | PASS | Existing regression retained; zero browser control writes; progression checkpoint preserved |
| 1x–50x invariance | PASS | Existing regression retained; simulation speed/clock code unchanged |
| Backend persistence/versioning | PASS | Real SQL/CAS/idempotence checks plus actual cloud amendment and API verification |
| Chairman console integration | NOT TESTED | Login/API binding retained; actual authenticated control clicks not exercised in the live game |
| Public scoreboard integration | PASS | Actual hosted full/condensed views, Chromium and mobile WebKit |
| Mobile Safari | NOT TESTED | WebKit emulation only; no physical iPhone Safari test |
| Existing-session compatibility | PASS | Existing board retained; 262 prior hosted files preserved byte-for-byte; protected state assertions |
| Chairman approval | PASS | Approved carriage supplied explicitly for the requested 5.0.7.1 deployment |

This is a deployed, tested schedule/UI revision, not blanket certification of
the untested gates above. Prior 5.0.7 links remain available. Canonical
kickoffOrder is retained for database identity; the new route sorts by UTC and
carriageOrder. It reuses the current Chairman login and rejects creating a new
board through this revision's route.

## Evidence and rollback

- Preflight source: `e2fa104d6397f3388645eeba5670defff74775cf`.
- Publication source: `8be721ea1b7818fbdff129d13c3755185de250cc`.
- Preflight: https://github.com/rgbslb11/Synthcast-Console/actions/runs/43564042397
- Publication/hosted: https://github.com/rgbslb11/Synthcast-Console/actions/runs/43564281093
- `evidence/hosted.json` records actual hosted results: 262 preserved + 15 added.
- Source carriage SHA-256: `6d6e46532f8fdc11fa48a500fe7eff1a19ededa3a7c56b7b029d8dae8bf87e6b`.

Rollback preserves all state/events. Use the prior UI route for presentation
rollback. A schedule reversal must lock the latest board and restore only the
affected schedule fields from each recorded before-value, only while that game
is still UNLAUNCHED. Never restore an old full-board snapshot over live action,
purge/restart a game, or rewind an accepted result.
