# Week 14 overtime candidate

Development identity `GC-W14-OT-DEV`, based on GameCast 5.0.8.5 at `3fe3224f5b68796e426b95a2b1743e80a73638ac`. Carriage, hosted routes, the W14 database/session, and deployment are pending. The tests use Week 13 matchups as fixtures.

## Ratings

`approved-ratings.csv` records the 121 teams in the Chairman's supplied order. SHA-256 is `0cd0462e64c2d9654b6d9d9744d4c5d8413b87f94c293ab32f50d2fe5dccd8da`. The names and canonical IDs reconcile one to one with the Week 13 approved 121-team roster. The runtime maps TEAM to overall, OFF to offense, and DEF to defense. It contains 363 values and uses no fallback ratings. Matchup coverage can be checked when the Week 14 carriage is supplied.

## Overtime

- A seeded toss determines first choice. The captain with first choice elects to defend first. First choice changes sides every round.
- OT and 2OT start each series at the opponent's 25 unless a Chairman correction changes the starting spot. OT permits a kick or a two-point try after a touchdown when the try is needed. The engine takes the kick by default and goes for two when the second offense needs two to tie. In 2OT it uses a two-point try when needed. Beginning with 3OT each offense gets one try from the opponent's 3.
- Regulation timeouts are discarded. Each team gets one in OT, one in 2OT, and one shared across 3OT and later rounds. The candidate command requires the team and expected round, rejects calls during a snap, and records the timeout in the football ledger.
- The scoreboard clock stays at zero. Plays, dead-ball time, timeouts, and intermissions advance Game Length. The existing 180-second pre-OT setup and 60-second OT-to-2OT intermission are retained. A 120-second intermission follows a tied 2OT with no media timeout. Later rounds have ordinary between-snap dead-ball time.
- The engine persists the toss, current round, current series, try type, pending snap, and the RNG checkpoint. OT uses normal scrimmage and weather logic. The extra-point kick uses the existing kick-accuracy model at the actual spot. The first offense uses inherited fourth-down short-yardage logic, and the second attempts a field goal on fourth down when it can tie or win within modeled range. There are no OT punts.
- A new OT-only defensive return distance uses a seeded exponential draw with a 12-yard scale, capped at the goal line. This is a provisional simulation parameter without an empirical fit. A scored defensive return on a regular series ends the game. A scored return on a try awards two to the defense and retains the required response series. Routine field-goal misses use the inherited dead-ball model. The baseline has no generated blocked kicks or fouls. The candidate supports Chairman spot edits and can adjudicate a supplied return outcome. Automatic foul enforcement, kick blocks, and rare compound events have no production validation.
- Regulation still uses the inherited touchdown-plus-PAT abstraction, including at the end of Q4. This build changes the overtime engine after a tied regulation checkpoint.

## Verification

Run `node --test tests/week14/*.test.mjs tests/v5085/*.test.mjs`. Tests cover rules, timed setup/untimed snaps, clock and timeout control, serialized recovery, replay at 1x/4x/20x/50x, public payload, and 59-game regulation matching against the baseline with identical inputs.

For the candidate, the in-process checks do not certify hosted persistence, the Chairman console or public scoreboard in a browser, Mobile Safari, or Week 14 slate/session compatibility. The production rollback reference is the existing Week 13 release, with Week 14 activation and rollback controls to be verified during deployment preparation.
