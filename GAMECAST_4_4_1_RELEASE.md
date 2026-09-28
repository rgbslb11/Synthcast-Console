# GameCast 4.4.1 — Week 6 Dead-Man restoration

The Chairman authorized this separate patch after confirming that 4.4.0 worked but lacked Dead-Man. Parent: release/gamecast-v4.4.0 at 11622efbdfb5716d87ba124e3157a81961f12e91. Controller source: release/gamecast-v4.3.2.2 at 3f3b27629fd498177f94288aa4369a3d37e948a3, checked against its deployed backend. The 4.3.2.2 Week 5 schedule is not imported.

This adds only the existing Dead-Man controller, Chairman per-game/batch controls, and release-isolated persistence and scheduling. All 56 Week 6 games, supplied metadata, 121 canonical ratings and 336 scheduled TEAM/OFF/DEF values remain unchanged from 4.4.0. Football functions and tuning are inherited verbatim. UTC kickoff values are derived from the approved Eastern dates/times and verified using America/New_York, including Saturday midnight and the 2:10 PM game. TV start remains null until explicitly provided by the Chairman.

## Release identities

- Route: https://rgbslb11.github.io/Synthcast-Console/v4.4.1/
- Branch: release/gamecast-v4.4.1
- Engine: GC-W6-V4.4.1-RC1
- Edge Function: gamecast-week6-v4-4-1
- Week: 2026-W06
- Session prefix: w6v441-
- Browser storage: synthcastGameCast441Operator
- RPC prefix: gamecast_v441_
- Scheduled worker: gamecast-v441-deadman, every 15 seconds

These identities alone do not establish publication. The deployment receipt and actual readback are authoritative.

## Use

Create a fresh operating slate on /v4.4.1/. Save COPY OPERATOR LINK privately and use COPY PUBLIC LINK for its matching read-only scoreboard. A 4.4.0 session is preserved on its original route; it is not migrated or armed by this patch.

Every game begins UNARMED. Open ARM FALLBACK on a game, or select games and use DEAD-MAN: SELECTIVE / BULK ARMING. Choose KICKOFF, KICKOFF PLUS an integer offset from 0 to 180 minutes, or an explicitly entered TV START in UTC. Review the confirmation before arming. The inherited UI initially offers a 15-minute kickoff offset. Arming is required; creating a session alone does not authorize automatic starts.

At the first scheduler tick after the selected time, an eligible unattended game launches into AUTO at 1x. A manually launched but otherwise untouched idle game may enter AUTO without resetting its GL clock. Existing Chairman action, pause, edit, delay, final state, unavailable power or changed run identity prevents an inappropriate start. Arming/disarming is explicit and version checked. A restart clears the arm. The browser countdown is informational; the cloud scheduler performs the actual start with the browser closed. The public view has no Dead-Man controls or private arm configuration.

## Infrastructure and preservation

The three new RPCs are service-role-only, reject foreign release/session identities and atomically commit state with audit events. A new Vault credential is generated inside the database and is never retrieved, logged or committed. The worker can only authenticate with that release credential and only lists 4.4.1 sessions. No earlier RPC, scheduler, backend or session is changed. QA sessions are marked qaOnly; accepting them is rejected.

Apply the additive persistence.sql before deploying the new function. Enable scheduler.sql only after the backend health/readback check passes. Existing functions retain their authentication settings; the new Edge Function uses the inherited operator-token and isolated worker-token checks. There is no browser-side simulator.

Pages publication preserves exact captured bytes from the verified 4.4.0 publication and adds only the four /v4.4.1/ files. Concurrent changes cause the preservation check to fail rather than restore stale content.

## Verification

Build: `node scripts/build-gamecast-v441.mjs`.
Source check: `node scripts/verify-gamecast-v441.mjs`.
Inherited engine/UI regressions: `GAMECAST_QA_MODULES=<jsdom installation> node scripts/test-gamecast-v441.mjs`.
Dead-Man tests: `node release-assets/gamecast-v4.4.1/test.mjs`.
Dead-Man UI: `GAMECAST_QA_MODULES=<jsdom installation> node release-assets/gamecast-v4.4.1/ui-test.mjs`.
Cloud reconciliation: `node release-assets/gamecast-v4.4.1/cloud-verify.mjs --read-only`.
Actual autonomous QA: omit --read-only. It arms two fresh QA games at an explicit near-future TV time, waits without browser/API polling, verifies cloud starts, and stops both at FINAL_PENDING without official acceptance. Credentials remain in memory only.

Thirty controller/integration tests include 168 paired full-game outcomes, 56 complete-game chunk comparisons, 56 speed comparisons, authority/clock protections and version races. Additional inherited checks cover 500-seed distribution, 280 full-board runs and ten edit/polling interactions. Each published release requires source/cloud data reconciliation, actual autonomous firing evidence, and before/after preservation comparison.

Physical Mobile Safari and post-deployment interactive Chairman acceptance are not established by automated DOM tests. No production merge, SEUD publication or official-result acceptance is authorized by this patch.
