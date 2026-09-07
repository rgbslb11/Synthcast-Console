# Synthcast GameCast 4.2.1 — Week 3 Power Release Candidate

Status: REVIEW CANDIDATE

Branch: `release/gamecast-v4.2.1`

## Scope

GameCast 4.2.1 inherits the frozen GameCast 4.2 RC3 mechanics without additional simulation, GL, timing, uncertainty, or clock-model changes.

The only promoted functional input layer in this release candidate is the Chairman-authorized Week 3 TEAM/OFF/DEF rating package on the 60–99 scale.

Power source: `SYNTHCAST-v4.2-BLEND-2026-09-07-60_99-SIDECAR`

Week 3 board: 51 games / 102 participating teams.

All 102 Week 3 teams have TEAM/OFF/DEF values.

Chairman overrides retained:

- Southern Utah vs Colorado State: TEAM 62 / OFF 62 / DEF 62, marked `CHAIRMAN 0.10x OPPONENT`.
- Cal Poly vs San Jose State: TEAM 62 / OFF 63 / DEF 61, marked `CHAIRMAN 0.10x OPPONENT`.

Alias normalization:

- Schedule name `Florida International` uses the source `FIU` rating card: TEAM 74 / OFF 68 / DEF 80.

## Frozen mechanics

No change is authorized in 4.2.1 to:

- clock-aware strategy;
- play/runoff/dead-ball timing;
- GL architecture;
- Master Zulu behavior;
- Delay/Pause/Edit behavior;
- seed / continuation-seed governance;
- 1x / 4x / 10x / 50x acceleration rules;
- 2,500-game RC3 play-volume calibration mechanics;
- uncertainty/randomness behavior.

The rating layer changes matchup inputs only. It does not force results or remove stochastic game variance.

## Review gates

- [x] Branch isolated from `release/gamecast-v4.2`.
- [x] 51-game Week 3 schedule inherited unchanged.
- [x] 102/102 Week 3 teams resolve to TEAM/OFF/DEF ratings.
- [x] Ratings constrained to 60–99 scale.
- [x] Southern Utah and Cal Poly Chairman overrides preserved.
- [x] Florida International/FIU alias resolved.
- [ ] Cloud runtime publish / session-create test.
- [ ] 1x vs 50x seed-invariance regression after runtime publish.
- [ ] Chairman control / Delay / Edit / Final correction regression after runtime publish.
- [ ] Mobile Safari certification.

This release candidate is ready for source and ratings review. Cloud certification remains separate from Chairman review approval.
