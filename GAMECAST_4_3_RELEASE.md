# GameCast 4.3 — Week 4 operating release

Status: **RELEASED FOR OPERATIONAL WEEK 4 USE**. Chairman authorized GameCast 4.3 for use on 2026-09-14 after the Week 4 schedule and 110-team power package were merged and the post-merge deployment workflow completed successfully. This authorization does **not** publish results to SEUD, accept/certify game results, alter prior releases, or change the underlying football mechanics.

## Operational identity

- Release branch: `release/gamecast-v4.3`
- Authorized merge commit: `c0e52498271044a9aafeac5d5ad7aaa1d2e550a9`
- Week key: `2026-W04`
- Edge Function: `gamecast-week4-v4-3`
- Engine identity: `GC-W4-V4.3-RC1`
- Session namespace: `w4v43-`
- Chairman UI: `https://rgbslb11.github.io/Synthcast-Console/v4.3/`
- Operating slate: 55 games, G0115 through G0169
- Week 4 power coverage: 110/110 participants; 55/55 games POWER READY
- Power source identity: `SYNTHCAST-v4.3-W4-FROZEN-2026-09-07-60_99+FCS_0.10X`

## Authorized scope

1. Operate GameCast 4.3 for Week 4 using the canonical Schedule v5 slate.
2. Preserve the 4.2.3 Chairman/UI interaction hardening.
3. Preserve the existing 4.2.2 football/play/timing mechanics without retuning.
4. Use the isolated Week 4 backend and namespace listed above.
5. Use the merged Week 4 60–99 TEAM/OFF/DEF power package.
6. Preserve Chairman human authorization requirements for result acceptance and SEUD publication.

## Schedule and TV evidence

Schedule authority is `2026_FBS_Schedule_LOCKED_v5.xlsx`: Week 4 contains 55 unique games, G0115 through G0169. Neutral-site flags are G0119 Kansas at Arizona State and G0164 West Virginia at Virginia.

**G0142 matchup identity is resolved by Schedule v5:** Colorado at Northwestern, Northwestern home, Colorado away, non-neutral. The remaining issue is only the quarantined TV/carriage source. `2026_TV_W04_IMMUTABLE_MASTER_v1_QUARANTINE.xlsx` contains a conflicting row W4-CAR-018 saying Colorado at Nebraska. GameCast therefore keeps the authoritative Schedule-v5 matchup Colorado at Northwestern and leaves kickoff/network as `TBD` / `TV TBD` until carriage authority is corrected. The bad carriage row does not create a schedule ambiguity.

## Week 4 power package

The Week 4 package covers all 110 unique participants across all 55 games on the frozen 60–99 TEAM/OFF/DEF framework. No football probabilities, HFA, clock/timing constants, uncertainty mechanics, or engine behavior are changed by this ratings load.

Four Schedule-v5 FCS-path opponents use the Chairman rule:

`FCS rating = 60 + 0.10 × (FBS opponent rating − 60)`

applied independently to OFF, DEF, and TEAM, then rounded to the deployment integer.

| Team | Opponent basis | OFF | DEF | TEAM |
|---|---|---:|---:|---:|
| Idaho | Boise State | 61 | 61 | 61 |
| Charlotte | San Diego State | 62 | 63 | 62 |
| Duquesne | Washington State | 61 | 61 | 61 |
| Western Kentucky | Oregon State | 61 | 61 | 61 |

## Mechanics preservation

The 4.3 backend is generated from the accepted `gamecast-week3-v4-2-2` engine with only weekly schedule/identity/governance bindings and the separately authorized Week 4 power sidecar changed. Football functions including RNG, edge, strategy, play generation, timing, TV-break handling, Delay, Edit, continuation seed, acceleration, and result lifecycle are not retuned.

The 4.3 UI is generated from `public/v4.2.3`; API binding, local-storage namespace, visible Week 4/release copy, release identity, and power-readiness copy are the intended changes. Edit/focus preservation and background-sync semantics remain the 4.2.3 implementation.

## Post-merge release validation

The deployment workflow for merge commit `c0e52498271044a9aafeac5d5ad7aaa1d2e550a9` completed successfully. It passed the Week 4 Schedule-v5/G0142 identity check, 110-team power coverage, FCS doctrine validation, inherited fixed-seed regression, 4.2.3 UI regression, Edge Function deployment, fresh-session 55-game/110-team smoke verification, static-site build, and Pages deployment. Supabase reports `gamecast-week4-v4-3` ACTIVE.

## Release gates

| # | Gate | Status | Note |
|---|---|---|---|
| 1 | Engine/state integrity | PASS | Post-merge build/deploy validation passed; football mechanics unchanged. |
| 2 | Fixed-seed regression | PASS | Inherited fixture reproduced. |
| 3 | Multi-seed distribution | NOT RE-RUN | No tuning change; remains untested for this release event. |
| 4 | Full-board checks | PASS | 55 games / 110 participants / 55 POWER READY. |
| 5 | Poll/chunk invariance | NOT RE-RUN | Inherited mechanics; not re-run in this release event. |
| 6 | 1x vs 50x invariance | NOT RE-RUN | Inherited mechanics; not re-run in this release event. |
| 7 | Backend persistence/versioning | PASS | Isolated Week 4 backend deployed and fresh-session smoke passed. |
| 8 | Chairman console integration | PASS | 4.2.3 UI regression passed on 4.3. |
| 9 | Public scoreboard / static route integration | PASS | 4.3 Pages route built and deployed successfully. |
| 10 | Mobile Safari | NOT TESTED | No device/browser test in this release event. |
| 11 | Existing-session compatibility | NOT APPLICABLE | New Week 4 namespace intentionally isolates Week 4 from Week 3. |
| 12 | Chairman approval | PASS | Chairman explicitly authorized 4.3 for operational use. |

GameCast 4.3 is **approved for operational Week 4 use**, but is not described as a fully certified final release while the explicitly noted non-regression gates above remain untested. G0142 is operationally Colorado at Northwestern; only its kickoff/network carriage remains quarantined pending upstream correction.
