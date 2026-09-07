# GameCast 4.2 — 2,500-Game Play-Volume Calibration

Status: RC3 calibration candidate

## Objective

Hold the 4.2 Game Length (GL) / broadcast-break architecture essentially unchanged while tuning the football generator toward:

- more sustained possessions for stronger/successful teams without hard-coding the eventual winner;
- better possession-time accounting at the snap/team level;
- the supplied empirical play-volume distribution: 62.2 team plays on average, winner about 69.8, loser about 54.7;
- the supplied TOP-vs-play relationship after normalizing a 10-minute-quarter game to a 15-minute-quarter equivalent.

## Important normalization

The empirical source games use 60 minutes of regulation. GameCast 4.2 10-minute quarters use 40 minutes. Therefore raw TOP minutes are not directly comparable. For relationship testing, GameCast TOP is multiplied by 1.5 to obtain a 15-minute-quarter-equivalent TOP. The empirical slope of 0.48 minutes/play is 28.9 seconds/play; this is equivalent to about 19.3 actual scoreboard seconds/play in a 40-minute GameCast regulation game.

## Calibration mechanics

The candidate tune does not use eventual winner identity. It uses only matchup strength at the snap plus live football state.

- Preserve existing TV timeout, quarter-break, halftime, Delay/Pause/Edit GL rules.
- Track `teamPlayCount[away,home]` and `teamTopSeconds[away,home]` explicitly.
- Credit play duration and running-clock post-play runoff to the team that snapped the ball, even if possession changes on the play.
- Stronger matchup edge improves drive sustainability by occasionally converting a positive short gain into the needed chain-moving gain; it does not create an explosive gain and never references final winner status.
- Split out-of-bounds timing from incompletion timing. Outside the final two minutes, an out-of-bounds play receives a short reset followed by a ready-for-play running-clock interval.
- Normal runoff is mildly matchup-edge aware so stronger offenses can sustain additional snaps without automatically receiving disproportionate TOP per snap.
- Four-minute runoff is reduced from 36 seconds to 30 seconds; two-minute and end-half behavior remain aggressive.
- Normal stopped dead-ball interval is increased modestly to preserve overall GL while football-clock runoff is redistributed.

Calibration constants used for the 2,500-game pass:

```text
performance edge multiplier   4.0
chain sustain multiplier      5.0
normal runoff base           22 sec
positive-edge tempo           5 sec × edge
negative-edge slowdown        4 sec × |edge|
four-minute runoff           30 sec
two-minute runoff            10 sec
end-half / FG runoff         14 sec
normal stopped dead time     25 sec
fast stopped dead time       12 sec
OOB reset outside 2:00        6 sec
OOB running runoff           15 sec
```

For this pre-Week-3-power calibration only, matchup strength was generated from a synthetic mismatch distribution. This is a mechanics calibration, not a Week 3 forecast. The real Week 3 OFF/DEF/overall ratings remain a required subsequent calibration layer.

## 2,500 simulation results

Fixed seed range for calibration harness: 420000–422499.

| Metric | Empirical target | 4.2 RC3 candidate |
|---|---:|---:|
| Games | — | 2,500 |
| Total plays/game | 124.4 | **124.58** |
| Team plays mean | 62.2 | **62.29** |
| Team plays median | 64 | **62** |
| Team-play SD | 9.7 | **9.59** |
| Winner plays mean | 69.8 | **69.42** |
| Winner plays median | 70 | **69** |
| Winner plays SD | 4.8 | **6.57** |
| Loser plays mean | 54.7 | **55.16** |
| Loser plays median | 54 | **55** |
| Loser plays SD | 7.2 | **6.24** |
| Mean GL | target ~2:05–2:10 | **2:06:19** |
| Median GL | — | **2:06:15** |
| GL P10 | — | **2:03:28** |
| GL P90 | — | **2:09:17** |
| Winner TOP, 10-min regulation | scaled target ~22.4 min | **22.54 min** |
| Loser TOP, 10-min regulation | scaled target ~17.5 min | **17.46 min** |
| Winner TOP share | ~56.1% | **56.35%** |
| Winner sec/play | ~19.3 scaled reference | **19.50** |
| Loser sec/play | ~19.3 scaled reference | **19.01** |

## TOP relationship

Using 15-minute-quarter-equivalent TOP:

```text
Team TOP(eq) = -0.827 + 0.4949 × team plays
```

- slope = **29.69 seconds per play**
- empirical slope = **28.9 seconds per play**
- R² = **0.869**
- empirical R² = **0.832**

This is close enough to treat possession-time accounting as materially corrected for RC3 calibration purposes.

## Margin vs TOP

The pre-power calibration produced:

```text
Margin = 25.72 + 0.95 × TOP advantage(eq)
R² = 0.220
```

The supplied empirical sample is:

```text
Margin = 21.27 + 1.49 × TOP advantage
R² = 0.324
```

This relationship is not promoted as calibrated yet because the 2,500-game mechanics test does not use the forthcoming Week 3 offense/defense/overall power package. Margin/TOP should be re-tested after real differentiated Week 3 power is loaded.

## Disposition

The tune is accepted as the RC3 **mechanics calibration candidate** because it simultaneously holds GL near 2:06, matches total/team play volume closely, reproduces the winner/loser volume split without conditioning on final winner, and brings normalized TOP/play accounting close to the empirical relationship.

Remaining calibration work after Week 3 power intake:

1. Re-run 2,500–5,000 simulations with actual Week 3 OFF/DEF/overall inputs.
2. Re-test margin-vs-TOP slope/R².
3. Tighten winner play-count dispersion (current SD 6.57 vs target 4.8) while allowing a slightly wider loser tail (current SD 6.24 vs target 7.2), if this remains after real power is loaded.
4. Re-run 1× vs 50× seed invariance and late-game clock regression tests before certification.
