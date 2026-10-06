# GameCast 4.4.2 W7 execution plan

Status: DEPLOYED — isolated QA candidate. Backend v1 and all three versioned UI surfaces verified. No official results accepted or canonical promotion.

## Foundation and boundaries

- OBSERVED FACT: repository rgbslb11/Synthcast-Console; parent release/gamecast-v4.4.1 at bf1d67a7c174b46ccf9d98cb6dcded5a8fc18616.
- OBSERVED FACT: reconstructed index.ts SHA-256 04eaca91b7cb8e842ebe2bde828ea3bf5d0872a34cd8ba070378e891626acd80 matches deployed gamecast-week6-v4-4-1 version 1. Direct imports and deployed UI assets also matched.
- OBSERVED FACT: local release/gamecast-v4.4.2 worktree created from that exact parent. No 4.5.1 source imported.
- User requires all prior database entries, schemas, designs, assets, sessions, and routes to remain unchanged. Only authorized additive 4.4.2 database objects and its isolated backend have been installed; no existing table or earlier record was modified.
- Polling must not write authoritative data or affect football outcomes. Existing deterministic projection is tested on a copy; changing display time is not a committed state mutation.
- User authorized correcting the confirmed halftime and kneel defects. User subsequently approved the HFA holdout: ±0.006 normalized venue edge, neutral zero; nominal target 2.66 points, measured independent holdout mean 2.929 points (95% interval 2.505–3.353).

## Seven functional requirements

| # | Requirement | Work status |
|---|---|---|
| 1 | Coin toss and reciprocal Q3 possession | Assembled local backend passes 10,102 checks; 4 mutations caught; authoritative manual and Dead-Man launch tested |
| 2 | FINAL — NEEDS ACTION filter | Implemented; local DOM and Chromium lifecycle/filter checks pass |
| 3 | Team-name search | Implemented on all three surfaces; local DOM and Chromium checks pass |
| 4 | Three deployed UI surfaces | Exactly three surfaces built from verified Public/Chairman and UI 1.3 lineage; cloud deployment and post-deployment checks passed |
| 5 | HFA 2.66 and neutral zero | Implemented approved ±0.006 coefficient; neutral zero; prior ±0.035 remains unchanged in 4.4.1 |
| 6 | Kneel guard | Local fix, boundary tests, negative tests, and local integrity comparisons pass; deployed and verified |
| 7 | Conditional halftime timeout reset | Defect confirmed (15/16 baseline combinations fail); local fix passes all 16 plus reload/retry |

Expected requirements: 7. Actual rows: 7.

## W7 inputs

Two logical inputs previously validated from W7_APPROVED_RATINGS_AND_SLATE_ONLY.zip:

- Ratings: W7_APPROVED_ENGINE_121.json; SHA-256 17d9e89e108e2528232a6f6ef18cddb8739653b38e87db67ad01165bb13911e0; 121 expected/parsed/accepted records, 0 rejected, 363 values.
- Games: W7_RECONCILED_SLATE_54.csv; SHA-256 481ed077d734dce9fd9aa25517fb5b5ea073ababdf77f55fdca650034dabbd4a; 54 expected/parsed/accepted games, 0 rejected; 108 participating teams. Texas–Oklahoma G0315 is neutral.

Activation: loaded into the isolated QA-only 4.4.2 backend; no accepted or official results. No earlier-week dataset will be substituted.

## Earlier component-stage tests and decisions

- `node scripts/build-gamecast-v441.mjs`: PASS; baseline reconstructed in isolated checkout.
- `node scripts/test-gamecast-v442-football-fixes.mjs --baseline`: 497 executed, 370 passed, 127 failed, 0 skipped. Expected red regressions retained as evidence.
- `node scripts/test-gamecast-v442-football-fixes.mjs`: 497 executed, 497 passed, 0 failed, 0 skipped.
- Candidate suite includes 16 halftime combinations, 16 reload/retry combinations, 224 kneel boundary cases, 32 forced fourth-down cases, 6 additional guards, 1 restart, 100 overtime comparisons, 100 read-only polling seeds, and 2 invalid halftime transition checks.
- Both fixes are hash-guarded generator transforms now incorporated in the assembled W7 backend. Generated artifacts are restricted to new 4.4.2 paths. The browser endpoint is pinned to the isolated 4.4.2 function in the established project.
- `node scripts/test-gamecast-v442-fix-mutations.mjs`: 5/5 isolated mutations killed, 0 survived; 497 cases per mutation.
- `node scripts/test-gamecast-v442-fix-integrity.mjs`: 350/350 pass; 100 protected first-1,000-second comparisons; 50 simultaneous local games match 50 isolated references; 200 acceleration comparisons at 1/4/10/50x. This historical component run preceded assembled 20x support; the assembled suite below covers 20x.
- `node scripts/test-gamecast-v442-coin-toss.mjs`: 10,102/10,102 pass. GC442-TOSS-00000 through GC442-TOSS-09999: home 4,948 (49.48%), away 5,052 (50.52%), KICK 7,493 (74.93%), RECEIVE 2,507 (25.07%). The local transform uses GC-W7-V4.4.2-RC1 for this test. Both predeclared probability bands pass.
- `node scripts/test-gamecast-v442-toss-mutations.mjs`: 4/4 isolated mutations killed, 0 survived.
- HFA exploratory study: 1,000 paired seeds per coefficient at .003/.004/.005/.006/.035; 10,000 full games. The .006 venue coefficient produced a 2.695-point average effect.
- Independent HFA442-HOLDOUT-00000 through HFA442-HOLDOUT-04999: .006 coefficient, 5,000 pairs/10,000 full games, 2.929-point average venue effect, empirical 95% interval 2.505–3.353. The user approved this holdout. Candidate code now uses .006, while recording 2.66 as the target and 2.929 as the observed holdout result; no claim of an exact per-game score effect is made.
- Only the new read-only QA workflow triggers on release/gamecast-v4.4.2; it has no deployment job or production credentials. Earlier release branches, generated assets, and database objects remain outside this change set.

## Assembled build evidence

- `python scripts/validate-gamecast-v442-inputs.py`: PASS, 121 ratings / 54 games / 108 participating teams; 0 rejected.
- `node scripts/build-gamecast-v442.mjs`: PASS; repeated builds match all 16 generated artifact hashes.
- `node scripts/test-gamecast-v442-football-fixes.mjs --assembled`: 497/497 pass, including all 16 halftime balances and retries.
- `node scripts/test-gamecast-v442-coin-toss.mjs --assembled`: 10,102/10,102 pass; same 10,000-seed distribution counts recorded above.
- `node scripts/test-gamecast-v442-release.mjs`: 870/870 pass; all 54 W7 games; 648 acceleration comparisons at 1/4/20/50x; 54 simultaneous games match isolated histories.
- `node scripts/test-gamecast-v442-api.mjs`: 14/14 pass using the actual handler with an in-memory RPC double, including 100 GET polls with no commits or stored-state changes. Not cloud persistence evidence.
- `GAMECAST_QA_MODULES=<installed QA dependencies> node scripts/test-gamecast-v442-ui.mjs`: 52/52 DOM integration checks pass across exactly three surfaces.
- `GAMECAST_QA_MODULES=<installed QA dependencies> node scripts/test-gamecast-v442-browser.mjs --chromium-only`: 21/21 actual local Chromium route/asset/refresh/search/filter checks pass.
- All 12 required mutations are caught; one additional repeated-timeout-reset mutation is also caught (13/13).
- Local WebKit installation downloaded successfully through the official mirror, but required system libraries could not be installed because this executor rejects apt privilege changes. GitHub QA run 37537992050 at implementation commit e9de5f4e4f10fa906bade8d50425a1586722c51f passed all steps, including 42/42 Chromium and iPhone WebKit browser checks. The display-only correction shows Kickoff pending until the toss; workflow 37538372748 at b4c54b7d5f030bdd043a1736dd326ce8ec2a0e12 also passed all steps. Physical iOS Safari remains untested.
- Previously deployed 4.4.1 HTML and six linked assets still match all seven prior hashes, and health remains HTTP 200 / GC-W6-V4.4.1-RC1.

## Completed release steps

1. OBSERVED FACT: the user superseded the separate-project proposal and authorized the established additive database process in the existing project. No project provisioning or cost decision is needed.
2. Pre-install collision checks found no 4.4.2 backend, RPC, Vault credential, or cron job. Preserve shared tables and create/read RPCs; add only 4.4.2 commit/auth/scheduler functions and its fresh credential.
3. Applied reviewed `persistence.sql`; service-only grants, previous-function fingerprints, and real cloud persistence/authorization checks passed.
4. Preserved all 74 prior published files while adding `/v4.4.2/`. Deployed route, browser, isolation, scheduler, and rollback checks passed. No result acceptance or canonical promotion.
5. The final report records all 12 gates and three prerequisites, with physical-device mobile coverage explicitly excluded. Status: DEPLOYED isolated QA candidate.

## Cloud validation progress

- OBSERVED FACT: additive persistence and scheduler migrations succeeded. Three new service-only RPCs and a fresh Vault credential were installed in the established project. Shared create/read functions and all 4.4.1 RPC fingerprints are unchanged; RLS remains enabled.
- OBSERVED FACT: backend `gamecast-week7-v4-4-2` v1 is active. All four deployed source files exactly match commit 5ff805ef7f54d7dbcfebbf23630088cf41bc3af6's generated output.
- TEST RESULT: real cloud API 16/16; SQL persistence guards 7/7; 100 read polls left the state/version/event fingerprints unchanged, as did all 52 prior-release session rows over the same interval.
- TEST RESULT: non-destructive scheduler rollback rehearsal passed; earlier job fingerprints unchanged. A 74-file hosting snapshot and restore passed; only 12 files under the new route are added.
- BLOCKED locally: direct Chromium cloud requests receive ERR_EMPTY_RESPONSE in this executor. The release workflow runs this integration in GitHub's browser environment before UI publication. Physical iOS hardware is unavailable; mobile coverage uses actual WebKit with iPhone emulation and is labeled accordingly.
- Completed: staged real-cloud browser checks, isolated Pages publication, deployed browser checks, scheduler execution evidence, final diff and report.

## Final outcome

- OBSERVED FACT: backend v1 source matches generated commit 5ff805ef7f54d7dbcfebbf23630088cf41bc3af6. UI deployment commit 200757b9663fe033adda9190790b5947ae3146fc; workflow 37540806064 passed verification, publication, and post-deployment jobs.
- TEST RESULT: 11,577 core checks; 48 staged and 48 deployed real-cloud browser checks; 16 cloud API checks in each phase; all pass. Mobile coverage is real WebKit with iPhone emulation, not physical iOS hardware.
- TEST RESULT: 112 cloud scheduler/load checks pass for 54 simultaneous games and 108 seeded replay comparisons. Two preliminary comparator-only failures (JSON object ordering and wall-time audit stamps) were corrected using the established football-history normalization. No runtime change resulted.
- TEST RESULT: final assembled HFA paired comparison: 1,000 identical seeds per version, 4,000 full games. Baseline venue effect 18.490; complete candidate 2.826 points (95% interval 1.885–3.767). Approved normalized coefficient remains .006; neutral zero. Approved independent holdout remains 2.929 points across 5,000 pairs.
- OBSERVED FACT: six QA sessions, zero active games, zero accepted/published results. All 52 earlier sessions, 25 earlier backend versions/hashes, and 74 published-file hashes remain unchanged.
- Complete matrices, limitations, commands, and changed-file explanations are in GAMECAST_4_4_2_RELEASE_REPORT.md. No pending implementation or deployment action remains for the isolated candidate.
