# WP hosted UI acceptance handoff — 2026-11-05

Ready for Chairman read-only UI review, not production certification.

## Verified review URL and authorization
https://rgbslb11.github.io/Synthcast-Console/v5.1.0/review/

Open Review connection. Session: qa-v510-wp-load-r3. Game IDs: G0502.
Use the existing GameCast email/password for gbaxter@shalerockmgmt.com and Connect to QA.
Open LIVE STATS, then Overview. At verified source revision 10 the illustrative current WP is 73.7%. This is a stationary QA snapshot, not an actively advancing game.
Credentials are memory-only; reload requires sign-in again. Normal Supabase password authentication issues the user JWT; the server requires an active session grant. No service key or worker token is supplied to the browser.

Verified WP endpoint:
https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-wp
GET parameters session, game, after=0, limit=100. Authorization: Bearer user JWT.
Browser Origin: https://rgbslb11.github.io.
The endpoint is authenticated; opening it without authorization is not a valid functional test.

## Contract and source identity
Shared revisions: GC-STATS-1 and GC-DELIVERY-1.
WP capture: GC-WP-CAPTURE-1; model: GC-WP-ILLUSTRATIVE-0.1.0.
WP handoff/API contract source: 4a4deb783a1632d78f0341e9fcb75071e567c177, release-assets/v5.1.0/WP-UI-HANDOFF.md and backend/probability/http.mjs/store.mjs. No additional WP wire-version field was introduced.
WP API deployment v3. Published UI source is unchanged from 7aba63b36e23816623b39b6c75ceea64c605df1c.
Publication/test commit: f3369a7702d7c11108fd5bd04afb274f25938d83 on ui/gamecast-v5.1.0-wp-connected, PR23.

## Evidence
- GitHub run 41980513018, attempt 2: PASS. Hosted hash audit preserved all 234 previous files and verified 13 new review files.
- Hosted Chromium and WebKit: actual normal-user sign-in, authoritative QA WP 73.7%, widths 390/1920 without horizontal overflow, disconnect clearing and reconnect recovery PASS. No application JavaScript errors.
- Regression run 41980512906: PASS, 124 tests and existing Chromium/WebKit fixture checks.
- Bounded 56-game external polling run 41979305620: PASS, 336 scheduled reads plus initial check; separate six commits through revision 10. See WP-EXTERNAL-LOAD-PASS.md for timings and limits.
- No production source/UI/engine/official results changed. No PR merged.

## Diagnosed during hosted testing
Initial hosted attempt correctly withheld numeric WP: source and reporting heads were revision 10, but latest observation was revision 2 because the temporary sampler was off.
Existing private worker was repointed from completed r2 to r3 (only session constant changed), deployed v3, bundle fe53fe485efd3a96ba7b62e0a5a3bd244280f844b74bcaf89bdce4b5f88a83d5.
Server-side Vault-authenticated pg_net request 377451 returned HTTP200 {sourceVersion:10,records:56}.
All 56 WP heads now reference revision 10. Source head stayed revision 10; no football advanced.
Historical observations were not rewritten. The new periodic observation records the missing interval gap.
The accompanying qa-wp-worker-index.ts is the deployed entrypoint snapshot; all bundled dependencies remain those of worker v2, unchanged. It is not a standalone build.
No recurring WP cron remains active. The retired gamecast-v5-1-0-qa-wp-load function remains retired; it was not reactivated.

## Chairman checks
1. Sign in and open G0502 Overview. Confirm current WP, frozen prior, and illustrative wording are understandable.
2. Inspect observation history; missing intervals must remain visible.
3. Check game navigation and readability on desktop and an actual iPhone/Safari.
4. Sign out/reload and confirm another sign-in is required.
5. To review final/override QA snapshots, connect session qa-v510-wp-hosted-r2 with games G0503,G0502. G0503 is a natural final; G0502 is blocked by committed correction. The approved stats UI hides corrected detail rather than exposing stale values.

## Remaining gates and limits
This preview is read-only. Chairman command controls and prior editing are not wired here.
Independent continuous five-second sampling is not active; enabling a supervised sampler and a full-game 56-game soak remain release work. Browser five-second refresh does not create observations.
Actual Mobile Safari and Chairman acceptance: NOT TESTED.
Current hosted checks do not re-exercise edit/cancel/final command writes; earlier backend evidence and fixture tests remain separate.
Real-game ensemble manifests and calibration are not supplied; QA priors only. Unsupported overtime remains blocked.
Production deployment/merge: NOT AUTHORIZED.

## Rollback
The publication artifact gamecast-v510-preserved-pages-backup from run 41980513018 contains 234 preserved files plus 13 QA files. To remove this QA route, prepare an artifact omitting only v5.1.0/review, verify all 234 baseline hashes, and publish through the shared Pages concurrency group. Do not use the old 5.0.6 restore script (it intentionally rejects an existing 5.0.6 route).
Worker rollback is the original r2 session constant from v2; no journal deletion is required.
