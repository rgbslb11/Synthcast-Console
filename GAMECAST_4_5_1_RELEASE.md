# GameCast 4.5.1 Week 7 candidate

Status: **BLOCKED for deployment pending authoritative Week 7 carriage**. The latest source is the 2026-10-03 working draft. G0331 (Kansas at Utah) retains `NEEDS-RULING-NM-O23`; the draft states that this unresolved ruling prevents FINAL designation. No 4.5.1 runtime, scheduler, operating session, or live route has been published.

Parent: `release/gamecast-v4.4.1`, commit `bf1d67a7c174b46ccf9d98cb6dcded5a8fc18616`, tree `21904885443c5ffafeb10c6e682c0f26693afbcd`. The inspected deployed function is ACTIVE version 1 with bundle SHA256 `88be0e9eee348c7d86c32417895d66f3d6b1bde3bc35d874412e0c1764862c10`.

## Changes

1. Short-gain first-down bonus multiplier: `5.0` to `0.5`. Its eligibility conditions and 0.75 cap stay identical. The release retains rating amplification 4.0 and raw home-field adjustment ±0.035. These parameters are tested separately in memory, without runtime changes. Equal ratings on a home field now produce a 7% short-gain rescue probability for the home offense, compared with 70% before. Maximum rescue probability reachable with the existing performance-edge clamp is 30%.
2. Chairman button: **FINAL — NOT ACCEPTED**. It includes `FINAL_PENDING` and `LOCKED`, excludes `READY` and `FINAL`, and uses the existing refresh/render path. The public view retains its existing operator-control hiding behavior.
3. Required Week 7 release binding: staged 54-game source, isolated identity/namespace/storage/function/route, and matching additive persistence templates. No Week 6 sessions or accepted results are migrated or altered.

The 121 canonical TEAM/OFF/DEF records remain byte-identical to 4.4.1's approved post-Week-5 v1.3 ratings. This is not a post-Week-6 ratings update. No Week 7 records, poll ranks, or weather were supplied, so those display metadata fields remain blank/null rather than carrying Week 6 facts forward.

## Week 7 source

Canonical ledger: 54 games G0284–G0337, 108 distinct participants, no FCS sidecars. Working carriage places two games on Friday October 9 and 52 on Saturday October 10. All 324 scheduled TEAM/OFF/DEF fields resolve through the unchanged 121-team map. Provenance and original source hashes are recorded in `release-assets/gamecast-v4.5.1/input-provenance.json`.

## Calibration evidence

Selection: 5 bonus values × 6 scenarios × 300 seeds = 9,000 games. Separate-seed evaluation: 4 parameter settings × 6 scenarios × 1,000 seeds = 24,000 games. Total: 33,000 completed simulations. The six scenarios are equal neutral, equal home-field, away +5 neutral, home +5 neutral, away +10 neutral, and home +5 with home-field.

Scores, margin means and percentiles, wins/upsets, shutouts, 28-point blowouts, play counts and GL are recorded separately for every scenario and parameter setting. Modifier diagnostics are local only. No approved numeric scoring/margin/upset target was found; the results establish reduced excessive amplification, not certification against an invented target. The standing 10-minute GL tendency (2:00–2:15) and play-volume tendency (about 124–125 plays) are used as descriptive checks, not per-game constraints.

Equal-rating home games in the independent evaluation: mean home advantage 19.315 → 5.318 points; home wins 945/1000 → 700/1000; margins ≥28 points 275/1000 → 32/1000. Neutral away +5: mean advantage 24.802 → 10.063 points; underdog wins 19/1000 → 173/1000. The short-gain-only candidate keeps legitimate large-gap blowouts possible.

## Verification

`node scripts/build-gamecast-v451.mjs`

`node scripts/verify-gamecast-v451.mjs`

`GAMECAST_QA_MODULES=/path/to/jsdom/dependencies node release-assets/gamecast-v4.5.1/ui-test.mjs`

The operational suite has 30 checks, including 162 paired full games, 54 cadence comparisons and 54 speed comparisons. Console checks cover 54 Chairman cards, 54 public cards, selective arm/disarm, preserved focus and open drawers, and mixed-state acceptance filtering (18 unaccepted finals, falling to 17 after one accepted result). Reverse-source comparison proves that only the requested short-gain constant and new filter behavior changed beyond Week 7 identities and source rollover.

CI verifies this candidate only. It does not deploy Supabase or Pages. The additive SQL files are unexecuted templates. Before publishing, replace the draft with authoritative Week 7 carriage, resolve G0331, update source hashes/metadata, rerun the affected source and UI checks, then provision only the new 4.5.1 infrastructure and route while preserving all existing releases and sessions.
