# GameCast 4.3 — Week 4 operating slate

Status: RELEASE CANDIDATE / STAGING. Chairman authorized GameCast 4.3 for Week 4 using the 4.2.3 UI and existing football-engine behavior, and subsequently authorized creation of the Week 4 power package. This release does not merge production, publish SEUD, accept results, or modify prior releases.

## Authorized scope

1. Preserve `release/gamecast-v4.3` as the Week 4 release line and stage the power update separately on `release/gamecast-v4.3-power` until validation completes.
2. Operate canonical Week 4 (`2026-W04`) with 55 games.
3. Preserve the 4.2.3 Chairman/UI interaction hardening.
4. Preserve the existing 4.2.2 football/play/timing mechanics without retuning.
5. Keep the isolated backend `gamecast-week4-v4-3`, engine identity `GC-W4-V4.3-RC1`, and session namespace `w4v43-`.
6. Replace the temporary 4.2.2 power carry-forward with the authorized Week 4 60–99 power package after validation.

## Schedule and TV evidence

Schedule authority is `2026_FBS_Schedule_LOCKED_v5.xlsx`: Week 4 contains 55 unique games, G0115 through G0169. Neutral-site flags are G0119 Kansas at Arizona State and G0164 West Virginia at Virginia.

**G0142 matchup identity is resolved by Schedule v5:** Colorado at Northwestern, Northwestern home, Colorado away, non-neutral. The remaining issue is only the quarantined TV/carriage source. `2026_TV_W04_IMMUTABLE_MASTER_v1_QUARANTINE.xlsx` contains a conflicting row W4-CAR-018 saying Colorado at Nebraska. GameCast therefore keeps the authoritative Schedule-v5 matchup Colorado at Northwestern and leaves kickoff/network as `TBD` / `TV TBD` until carriage authority is corrected. The bad carriage row does not create a schedule ambiguity.

## Week 4 power package

Source basis is the frozen 2026 60–99 TEAM/OFF/DEF framework used for the Week 3 package. The locked scale remains 60–99 with the established native extrema. No football probabilities, HFA, clock/timing constants, uncertainty mechanics, or engine behavior are changed by this ratings load.

The Week 4 package covers all 110 unique participants across all 55 games. Existing accepted values are retained where already present. Missing FBS participants are populated from the frozen source using the same independent TEAM/OFF/DEF 60–99 mappings. Four Schedule-v5 FCS-path opponents use the Chairman rule:

`FCS rating = 60 + 0.10 × (FBS opponent rating − 60)`

applied independently to OFF, DEF, and TEAM, then rounded to the deployment integer.

The four Week 4 FCS-path mappings are:

| Team | Opponent basis | OFF | DEF | TEAM |
|---|---|---:|---:|---:|
| Idaho | Boise State | 61 | 61 | 61 |
| Charlotte | San Diego State | 62 | 63 | 62 |
| Duquesne | Washington State | 61 | 61 | 61 |
| Western Kentucky | Oregon State | 61 | 61 | 61 |

Power source identity: `SYNTHCAST-v4.3-W4-FROZEN-2026-09-07-60_99+FCS_0.10X`.

Expected fresh-session coverage after deployment: **110/110 participants rated; 55/55 games POWER READY; 0 power-pending.**

## Mechanics preservation

The 4.3 backend is generated deterministically by copying the accepted `gamecast-week3-v4-2-2` engine and replacing only weekly schedule/identity/governance bindings plus the separately authorized Week 4 power sidecar. Football functions including RNG, edge, strategy, play generation, timing, TV-break handling, Delay, Edit, continuation seed, acceleration, and result lifecycle are not retuned.

The 4.3 UI is generated from `public/v4.2.3`; only API binding, local-storage namespace, visible Week 4/release copy, release identity, and power-readiness copy are changed. Edit/focus preservation and background-sync semantics remain the 4.2.3 implementation.

## Release gates

| # | Gate | Current disposition | Note |
|---|---|---|---|
| 1 | Engine/state integrity | PASS on base 4.3; power-branch rerun required | No mechanics change. |
| 2 | Fixed-seed regression | PASS on base 4.3; power-branch rerun required | Expected inherited fixture: GL 7,541 sec and 126 plays. |
| 3 | Multi-seed distribution | NOT TESTED | No tuning change; still required for final certification if requested. |
| 4 | Full-board checks | POWER-BRANCH TEST IN PROGRESS | Must validate 55 games / 110 teams. |
| 5 | Poll/chunk invariance | NOT RE-RUN | Inherited mechanics. |
| 6 | 1x vs 50x invariance | NOT RE-RUN | Inherited mechanics. |
| 7 | Backend persistence/versioning | POWER-BRANCH STAGING TEST IN PROGRESS | Fresh session must show 55/55 POWER READY. |
| 8 | Chairman console integration | POWER-BRANCH TEST IN PROGRESS | 4.2.3 behavior preserved. |
| 9 | Public scoreboard integration | POWER-BRANCH TEST IN PROGRESS | Week 4 route/binding unchanged except power state. |
| 10 | Mobile Safari | NOT TESTED | No device/browser test in this change. |
| 11 | Existing-session compatibility | NOT APPLICABLE | New Week 4 sessions are isolated from Week 3. Existing pre-power Week 4 sessions do not automatically rewrite ratings. |
| 12 | Chairman approval | PASS | Chairman explicitly requested the Week 4 power package for 4.3. |

Do not call 4.3 certified final while relevant gates remain untested. The G0142 matchup itself is resolved; only its TV carriage/kickoff presentation remains quarantined pending upstream correction.
