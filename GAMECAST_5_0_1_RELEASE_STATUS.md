# GameCast 5.0.1 current release status — 2026-10-14 21:19 UTC

Production activation remains BLOCKED. This status supersedes the earlier four-blocker reports.
15 gates: **12 PASS; 3 BLOCKED**. Engineering checks, not independent certification.

Candidate branch inspected: release/gamecast-v5.0.1 at 34029a28936ddf470fb342b537a6d8e9d9f747e7.
Latest regression CI: run 38637545955, SUCCESS on that commit.
Operating application source remains 6fcaac2ca0214ba4283d7f9d2c876eeb0f68271f. No operating UI or engine source changed in this follow-up.

## Gates
| # | Gate | Status | Evidence and scope |
|---|---|---|---|
| 1 | Baseline protection | PASS | Retained sources and authorized 5.0.0 retirement |
| 2 | Separate branch | PASS | Candidate remains release/gamecast-v5.0.1; no main merge |
| 3 | Live UI | PASS | Retained hosted evidence; remaining control actions separately tracked |
| 4 | Chairman controls | BLOCKED | Hosted Final, Unlock and QA Accept rejection await operable confirmation UI |
| 5 | Hosted Deadman sequence | BLOCKED | Complete arm/trigger/visible-feedback sequence awaits operable confirmation UI |
| 6 | Concurrency | PASS | Retained regression evidence; recovery replay/conflict checks also passed |
| 7 | Storage architecture | PASS | Retained compact scheduler receipt evidence |
| 8 | 5.0.0 retirement | PASS | Authorized runtime retirement completed |
| 9 | Fourth-down logic | PASS | Retained boundary and negative-control tests |
| 10 | Safety scoring | PASS | Retained possession, points and clock tests |
| 11 | Kneel logic | PASS | Retained regression matrix |
| 12 | Simulation preservation | PASS | Retained paired-history evidence; engine code unchanged |
| 13 | Complete performance | BLOCKED | Full hosted control measurements remain incomplete |
| 14 | Candidate runtime recovery | PASS | Saved archive, restored identities/constraints/trigger, actual separate Edge application commit/replay/conflict/readback; existing project Auth/roles reused |
| 15 | Release evidence | PASS | Current disposition and reproducible recovery source recorded |

## Recovery gate completed
The saved R2 archive was previously restored with exact equality across five runtime tables: 6 sessions, 13,636 events, 1,186 requests, 6 creation receipts and 13 final references. All six sessions reopened. The event identity sequence defect found by an actual application write was corrected and its procedure committed.

This run restored all five relevant foreign-key constraints, validated them, and restored the immutable-final trigger. Three operator references continue to depend on the existing project operator registry; Auth/roles/project configuration are outside this runtime archive. RLS is enabled on the five restored runtime tables, with no anonymous/authenticated schema access.

The separately deployed function gamecast-v501-recovery-verify version 1 used unchanged deployed engine and DatabaseStore modules against the private restored Postgres schema. Actual HTTP response 200:
- restored version 552 -> 553;
- application commit persisted;
- exact engine continuation matched;
- identical-request replay did not execute mutation again;
- changed-request replay rejected;
- all 54 display games reopened;
- all 13 reference finals preserved.
The complete probe measured 1,059 ms inside the Edge verifier. This is not a Chairman click-to-render measurement and does not close performance gate 13.
All 10 returned deployed files matched their prepared source.

Negative controls: missing platform JWT -> 401; valid platform JWT without private authorization token -> 403; previously authorized request after probe shutdown -> 403. A direct final mutation raised the expected immutable-final exception. An orphan event insert failed its foreign-key constraint.

The first deployment proposal with verify_jwt=false was rejected by automatic approval review. No such verifier deployed. The safer deployed version retained platform JWT verification and an additional private, expiring token check. Credentials were read only server-side from existing secure settings and were not included in reports/source.

The verifier has now been replaced by version 2, a JWT-protected closed handler with no imports, RPC calls, or service-role credential use. Private probe enabled=false; private writes=false; service-role execution of the temporary bridge revoked. The closed verifier returned HTTP 410 on an authenticated request. Original candidate writes/scheduler/cron remain false; candidate main session remains version 551.

This closes the **candidate runtime recovery** gate within the existing Supabase project. It does not assert whole-project disaster recovery, Auth restoration, or a complete database backup.

## Security advisor disposition
The advisor reported 21 informational RLS-enabled/no-policy notices for intentionally closed tables, and one project Auth leaked-password-protection warning. No Auth configuration change was made; the project warning is outside this maintenance/recovery change. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Remaining decision
The current cloud browser's native confirmation interface remains restricted after secure authentication. Supported recovery was exhausted in earlier runs; this run did not retry the blocked operation. No additional browser-control integration was found in the available plugin search.

A narrow in-page confirmation proposal is recorded in GAMECAST_5_0_1_CONFIRMATION_UI_PROPOSAL.md. It preserves explicit confirmation and server authorization, and requires owner approval under the project's instruction to ask before material UI behavior changes. No proposed UI change has been implemented.

Week 8 remains separately staged (56 games; 112 scheduled-team ratings); no operating import or SEUD publication occurred.
