# GameCast 4.3.1 - Week 4 GameCast-ready v1.1 power deployment

Status: PREVIEW / CORRECTIVE RELEASE CANDIDATE. No production merge or SEUD publication authorized.

## Chairman authorization and scope

The Chairman authorized deployment of Week 4 GameCast-ready TEAM, OFF and DEF values for all 121 canonical teams into v4.3.1, with all four existing synthetic Schedule-v5 FCS-path opponents fixed at 60/60/60. This supersedes the previous POWERCRUNCH candidate and opponent-derived 0.10x rule for this preview only. It does not authorize retuning football, changing schedule/carriage, altering accepted results, or migrating existing sessions.

## Exact ratings source

Source workbook: `SYNTHCAST_GAMECAST_W4_TEAM_OFF_DEF_POWER_121_v1.1.xlsx`, worksheet `GameCast Power`, uploaded 2026-09-15T01:17:18Z, source reference `file_00000000b68c822f86a4be90030b22a5`.

Load the integer TEAM/OFF/DEF columns exactly; do not recompute the blend. TEAM maps to runtime `overall`, OFF to `offense`, DEF to `defense`.

- 121 canonical teams x 3 ratings = 363 fields.
- 4 schedule-only FCS opponents x 3 ratings = 12 fields.
- 125 runtime team rows and 375 rating fields total.
- 55 Week 4 games, 110 participants and 330 scheduled rating fields.
- Canonical split: 42 offense-leaning, 41 defense-leaning, 38 balanced.
- Each canonical TEAM equals (OFF + DEF) / 2; all fields are integers in 60-99.
- Charlotte, Duquesne, Idaho and Western Kentucky: TEAM=OFF=DEF=60.
- Synthetic canonical membership is preserved, including ECL teams and North Dakota State. Real-world subdivision labels are not substituted.
- Tempo remains 1.0 and specialTeams remains null.

Approved deployment file: `release-assets/gamecast-v4.3.1/power.ts`.
Git blob identity: `6eb58cdc1bce4f5a63b8c62e23f72a397c2f8f55`.
Power source: `SYNTHCAST-v4.3.1-W4-POST-W3-2026-09-14-GAMECAST-TEAM-OFF-DEF-v1.1-121+FCS_60`.

## Preserved engine and schedule

Engine: `GC-W4-V4.3.1-RC1`; function: `gamecast-week4-v4-3-1`; project: `percrnamjzetzjjuxuuw`; branch: `release/gamecast-v4.3.1`; route: `/v4.3.1/`; namespace: `w4v431-`.

Data identity: `W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_POST_W3_121_60_99+GAMECAST_V1_1_FCS60+V431_UI_RESET`.

The prior generator is preserved byte-for-byte in `scripts/build-gamecast-v431-base.mjs`. The wrapper overlays only the approved power table and its data/UI provenance. Existing football probabilities, timing constants, RNG, HFA, lifecycle, edit/pause/delay behavior and controls remain unchanged.

The Week 4 schedule file must retain Git blob `9a4095335fd1b440017641c9cc514b2a01510739`. G0165 remains NC State at Vanderbilt. G0142 remains Colorado at Northwestern with kickoff/network TBD; the upstream carriage issue is not changed.

## Deployment and session safety

The earlier CI deployment attempt returned Supabase 401 Unauthorized. The authorized connected Supabase tool can deploy without exposing or changing the GitHub secret. CI now verifies whether the exact requested data is already present before attempting a redundant CLI deployment. A mismatch requires deployment; a failed CLI deployment still fails the job. All releases require a mandatory fresh-session authenticated readback of every scheduled power snapshot and a matching sanitized public readback before Pages publication.

Only fresh QA sessions are created for verification. No QA game is launched, accepted or published by these deployment checks. Existing sessions retain their original snapshots and are not edited or deleted. The Chairman should use PURGE UI + NEW SESSION to bind the console to a fresh Week 4 board; the previous cloud session remains intact.

## Evidence and release gates

`verify-gamecast-v431-power.mjs` produces row-level all-team and 110-participant CSVs plus a cloud verification JSON artifact. CI also reruns the inherited fixed-seed regression and the ten existing UI interaction tests. A passing pipeline is deployment evidence, not blanket certification. Multi-seed distribution, full-board simulated outcomes, current-release poll/chunk and 1x/50x invariance, and physical Mobile Safari remain NOT TESTED unless separately recorded. Chairman authorization covers this scoped deployment, not official game results or production promotion.
