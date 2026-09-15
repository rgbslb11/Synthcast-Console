# GameCast 4.3.1 — Post-Week-3 power and UI reset preview

Status: CORRECTIVE RELEASE CANDIDATE / STAGING.

## Chairman-authorized scope

1. Correct the operator experience where a browser can automatically resume a Week 4 session created before the 4.3 Week 4 power package was loaded, leaving persisted `powerReady=false` state visible as POWER PENDING even though the currently deployed 4.3 power package is complete.
2. Add a Chairman control to purge the browser's current UI session binding and start from a brand-new Week 4 cloud session.
3. Preserve all prior cloud sessions for audit; the UI purge control does not delete authoritative cloud history.
4. Preserve the 55-game Schedule v5 slate, 4.2.2 football/play/timing mechanics, and 4.2.3 edit/focus hardening.
5. Do not alter accepted results, publish SEUD, retune football, or overwrite GameCast 4.3.
6. Load the complete 121-team post-Week-3 TEAM/OFF/DEF package for Week 4 into the isolated 4.3.1 preview.

## Root cause

GameCast persists TEAM/OFF/DEF snapshots and `powerReady` inside each cloud session at creation. The UI also automatically resumes the last saved session from browser `localStorage`. Therefore a session created before a power-package update retains its old rating snapshots indefinitely. Fresh 4.3.1 sessions are required to receive the post-Week-3 package.

## Post-Week-3 power package

The preview source is `POWERCRUNCH_W4_TEAM_STRENGTH_60_99_CANDIDATE`, promoted for the isolated 4.3.1 preview by the Chairman's request to update all 121 teams for the Week 4 schedule and matchups. This promotion does not authorize a production merge, accepted-result change, or SEUD publication.

- Canonical population: exactly 121 unique teams.
- Fields loaded: offense, defense, and overall for every canonical team (363 governed fields).
- Overall basis: current Week 3 Elo.
- Offense basis: `PSCORE_PostW3_Offense`.
- Defense basis: inverted `PSCORE_PostW3_Defense` so higher is better.
- Display mapping: each dimension independently maps the current 121-team surface to integer 60–99.
- Source JSON SHA-256: `0eb9913a3a5806c90dc7dafd662892d5ef8590d318fe5f5a07bc1601173277eb`.
- Source CSV SHA-256: `5d7924b1977087b5ddf200461f7f747a3fba9e87efb9e98092f6edfea5e299bb`.
- Runtime source identity: `SYNTHCAST-v4.3.1-W4-POST-W3-2026-09-14-POWERCRUNCH-121-60_99+FCS_0.10X`.

The 121-team canonical population excludes four Schedule-v5 FCS-path opponents. Those four remain schedule-only sidecars under the previously authorized rule:

`FCS rating = 60 + 0.10 × (FBS opponent rating − 60)`

The rule is applied independently to OFF, DEF, and TEAM and rounded to the deployment integer after the 121-team update. The runtime table therefore contains 125 rows: 121 canonical ratings plus four governed FCS sidecars. All 110 Week 4 participants remain covered and all 55 games remain POWER READY.

## Corrective design

GameCast 4.3.1 uses a new isolated identity and namespace:

- Branch: `release/gamecast-v4.3.1`
- UI route: `/v4.3.1/`
- Edge Function: `gamecast-week4-v4-3-1`
- Engine identity: `GC-W4-V4.3.1-RC1`
- Session namespace: `w4v431-`
- Browser storage namespace: `synthcastGameCast431Operator`

This guarantees that opening 4.3.1 cannot silently resume an older 4.3 session.

The new **PURGE UI + NEW SESSION** control:

- requires Chairman confirmation;
- creates a new cloud session with new seeds for all 55 games;
- switches the browser to the new operator session;
- replaces the browser's saved 4.3.1 session binding;
- leaves the prior cloud session intact for audit and reproducibility.

It is intentionally not a destructive cloud-session delete.

## Release gates

4.3.1 must not be released for use until CI demonstrates:

- 55/55 Week 4 games and Schedule-v5 identity;
- exactly 121 canonical post-Week-3 rows with 363 integer rating fields in the 60–99 range;
- exactly four opponent-derived FCS sidecars and 125 total runtime rows;
- 110/110 Week 4 participant coverage and 55/55 POWER READY on a fresh session;
- distinct `w4v431-` session namespace and `synthcastGameCast431Operator` browser namespace;
- PURGE UI + NEW SESSION control present and wired;
- inherited fixed-seed engine regression passes unchanged;
- 4.2.3 interaction regression remains green;
- Edge Function deploy and fresh-session smoke pass;
- Pages route `/v4.3.1/` builds and deploys.
