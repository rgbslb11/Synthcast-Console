# GameCast 4.3.2 - Week 5 schedule and post-Week 4 power deployment

Status: PREVIEW / RELEASE CANDIDATE. No production merge, SEUD publication, accepted-result change, or prior-release overwrite authorized.

## Chairman authorization and scope

The Chairman authorized a Week 5 GameCast update under version 4.3.2: replace the operating slate with the 58 locked Week 5 matchups and load updated post-Week-4 TEAM, OFF and DEF values. The backend and Chairman/public frontend must move together.

This release is branched from accepted GameCast 4.3.1. The separate `4.3.2.SB` sandbox branch is preserved and is not merged into this release. No sandbox mechanics, probability changes, timing changes, rating-model recomputation, HFA changes, lifecycle changes, or accepted Week 4 results are included.

## Ratings source

Source workbook: `SYNTHCAST_GAMECAST_W5_POST_W4_TEAM_OFF_DEF_POWER_121_v1.2(2).xlsx`, worksheet `GameCast Power`.

Source workbook SHA-256: `f5977bf7b1cd694cb8a3218f78054f123edfb08053b205c0ca015dae73eed410`.

Load the integer TEAM/OFF/DEF columns exactly; do not recompute the blend. TEAM maps to runtime `overall`, OFF to `offense`, DEF to `defense`.

- 121 canonical teams x 3 ratings = 363 canonical fields.
- Canonical split: 44 offense-leaning / 45 defense-leaning / 32 balanced.
- Every canonical TEAM equals (OFF + DEF) / 2.
- All canonical TEAM/OFF/DEF values are integers from 60 through 99.
- Tempo remains 1.0; specialTeams remains null; opponentBasis remains null.

Four Week 5 participants are Schedule-v5 `SCHEDULE_ONLY_FCS` entities rather than members of the governed 121-team population: Arkansas State, Louisiana-Monroe, Toledo and Western Michigan. Under the Chairman's standing GameCast FCS rule, each receives TEAM=OFF=DEF=60 for this release.

Approved runtime source: `release-assets/gamecast-v4.3.2/power.ts`.
Git blob identity: `0461c9d74c4d2f1f0679baf5b6e2f54fd31cd7fb`.
Power source identity: `SYNTHCAST-v4.3.2-W5-POST-W4-2026-09-20-GAMECAST-TEAM-OFF-DEF-v1.2-121+FCS_60`.

## Week 5 slate

The operating slate contains 58 games and 116 unique participants. Game IDs, dates, kickoff times and networks are taken from the locked Week 5 carriage board and match the Chairman-provided Week 5 table.

Approved schedule source: `release-assets/gamecast-v4.3.2/week5.ts`.
Git blob identity: `48545a9b1db6b2adedc3626d2f9fc8c6bec5b529`.

All 58 games are home-site games in the governing Week 5 carriage board; no neutral-site flag is set. All 116 participants resolve to a runtime power row, producing 348 scheduled TEAM/OFF/DEF fields and 58/58 POWER READY at fresh-session creation.

## Release identity

- Branch: `release/gamecast-v4.3.2`
- Engine: `GC-W5-V4.3.2-RC1`
- Week key: `2026-W05`
- Supabase function: `gamecast-week5-v4-3-2`
- Chairman/public route: `https://rgbslb11.github.io/Synthcast-Console/v4.3.2/`
- Session namespace: `w5v432-`
- Browser storage namespace: `synthcastGameCast432Operator`
- Data identity: `W5-58+TV_CARRIAGE_V4_LOCKED+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V432_UI_RESET`

The 4.2.2 football mechanics inherited through 4.3.1 remain unchanged. Version 4.3.2 is a Week 5 schedule/rating/UI-binding release only.

## Session and result safety

Fresh 4.3.2 sessions receive the Week 5 slate and new ratings. Existing 4.3.1 sessions remain in the `w4v431-` namespace and are not migrated, edited or deleted. QA deployment checks may create fresh unlaunched `w5v432-` sessions; they must not launch, accept, publish or alter official results.

The frontend provides separate Chairman and public views for the same authoritative cloud session. Operator credentials remain session-scoped. `PURGE UI + NEW SESSION` in 4.3.2 creates a new Week 5 session without overwriting prior cloud history.

## Verification requirements

`verify-gamecast-v432-power.mjs` must prove source cardinality and cloud readback: 121 canonical rows, four fixed-60 FCS rows, 125 runtime rows, 58 games, 116 participants, 348 scheduled rating fields, exact schedule identity, 58/58 POWER READY, authenticated operator readback, sanitized public readback, and unchanged state/version on repeated unlaunched reads.

CI reruns the inherited fixed-seed engine regression and the existing 4.2.3 UI interaction regression. A passing deployment pipeline is evidence for this scoped Week 5 deployment; it is not blanket certification of multi-seed distribution, active poll/chunk invariance, 1x/50x invariance, full-board simulated outcomes, Mobile Safari, or Chairman approval of future production/SEUD promotion.
