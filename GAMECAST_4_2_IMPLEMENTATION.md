# Synthcast GameCast 4.2 — Implementation Scope

Branch: `release/gamecast-v4.2`
Week: `2026-W03`
Status: BUILD / NOT CERTIFIED

## Week 3 board
- 51 games total.
- Thursday 2, Friday 3, Saturday 46.
- All kickoff times are ET.
- `G0090 Oregon at Oklahoma State` retains the 7:30 PM ET FLEX-time flag.
- `G0073 Marshall at Florida International` is SEN+ at 3:30 PM ET.
- Canonical game IDs are inherited from the 2026 Master Game Listing.

## Power intake
GameCast 4.2 is intentionally rating-source agnostic at the interface layer.
The Week 3 power contract supports:
- offense
- defense
- special teams
- overall
- tempo
- source version

AUTO is blocked until the required team ratings are explicitly loaded. No missing ratings are inferred or backfilled by the engine.

## Clock architecture
### Master Zulu
- Internal authoritative application time.
- Never pauses.
- Never accelerates.
- Regional clocks in the UI are derived from Master Zulu.

### Game Length (GL)
- Starts on Launch.
- Continues through plays, dead balls, TV breaks, timeouts, halftime, Chairman Pause, Chairman Edit, Delay, reviews, and other active-game stoppages.
- Stops only when the game becomes Final.
- Postgame score edits do not alter historical GL.

### Scoreboard game clock
- Runs/stops according to football state.
- Does not automatically stop between plays.
- Each play has play duration plus between-play runoff.

### Play clock
- Explicit 40/25-style state carried separately from the game clock.

## Situational engine
GameCast 4.2 must become clock-aware at approximately the final 4:00 of Q2/Q4 and enter mandatory critical-clock handling at 2:00.

Supported strategy modes:
- NORMAL
- END_HALF
- TWO_MINUTE
- FOUR_MINUTE
- FG_MANAGEMENT
- KNEEL
- DESPERATION

Clock awareness changes decisions, not team strength.

## Chairman controls
Chairman may edit any non-governance-locked live game at any time.
Editable checkpoint fields:
- score / period box score
- quarter / period
- game clock
- possession
- down
- distance
- field side / yard line
- timeouts

AUTO freezes while editing and consumes no random events.
On SAVE & RESUME AUTO, a new continuation seed may be created. The prior run remains historical and the corrected checkpoint becomes authoritative.

Routine corrections require no written comment. They are auto-audited.

Mandatory confirmation remains required for destructive/governance actions including:
- purge + new seed
- destructive reset
- reopening a Final to live simulation
- superseding a locked/accepted final
- superseding a ledger/result-of-record final

## Final score editing
- `EDIT BOX SCORE` is available for Final games.
- When period scoring exists, Final = Q1 + Q2 + Q3 + Q4 + OT columns.
- Editing a period value immediately recalculates Final.
- Totals-only imported finals remain totals-only unless a complete period line is explicitly entered; the system does not invent quarter scoring.

## Delay
`DELAY` is a first-class game state.
During Delay:
- football simulation stops
- scoreboard clock stops
- play clock stops
- score and field state are preserved
- GL continues
- Master Zulu continues
- public status shows `DELAY`

`RESUME GAME` returns to the preserved checkpoint.

## Semantic scoreboard states
- End Q1 break -> `END 1ST`
- Q2 complete / halftime -> `HALFTIME`
- End Q3 break -> `END 3RD`
- Regulation tied before OT -> `END REG`
- Delay -> `DELAY`
- OT -> `OT`, `2OT`, `3OT`, ...
- Final -> `FINAL`

The UI must not display `2nd 0:00` during halftime.

## Operations time banner
Top Chairman UI banner derives all displays from Master Zulu:
- MASTER ZULU
- CURRENT TIME (Central; CDT/CST dynamically)
- EASTERN TIME (EDT/EST dynamically)
- MOUNTAIN TIME (MDT/MST dynamically)
- MOUNTAIN STANDARD (MST year-round)
- PACIFIC TIME (PDT/PST dynamically)
- HAWAII TIME (HST year-round)

## Simulation-speed invariant
Approved AUTO speeds remain 1x / 4x / 10x / 50x, with 50x AUTO-only.
Simulation speed changes wall waiting only. Given the same initial state, seed/continuation-seed history, and Chairman interventions, the resulting football history must be invariant across speeds.

## Required regression scenarios
1. Q4 1:45, down 4, own 25, 3 TO -> valid two-minute offense.
2. Q4 1:35, ahead 7, opponent 0 TO, first down -> kneel/end-game recognition.
3. Q4 :38, tie, opponent 28 -> FG/time management.
4. Q2 :52, down 3, no TO, completion in bounds -> correct hurry-up/runoff.
5. Run in bounds -> clock continues between plays.
6. Incomplete pass -> game clock stopped.
7. Chairman changes 24-14 to 24-21 -> AUTO strategy immediately reflects corrected state.
8. No RNG consumption while Chairman Edit is open.
9. Resume after edit -> continuation seed.
10. Delay -> scoreboard frozen, GL continues.
11. Chairman Pause -> scoreboard frozen, GL continues.
12. Halftime -> `HALFTIME` presentation.
13. Final box-score edit -> Final recalculates.
14. Locked result supersede -> confirmation required.
15. 1x vs 50x -> identical football history.

## Release isolation
GameCast 4.1 remains approved and untouched. 4.2 work is isolated on `release/gamecast-v4.2`. No production Supabase merge or 4.2 certification is authorized by this document.
