# GameCast isolated sandbox — branch 4.3.2.SB

**Current update:** Item 5 is authorized and implemented as the local `RECEIVER1` sandbox candidate. See [RECEIVER1.md](RECEIVER1.md) for current behavior, commands and all 12 gate statuses. The server now starts this candidate with separate session/storage identities. Sections below describe the original unchanged-engine setup and its historical checks, not the current candidate's implementation status. Items 1–4 remain drafts; 6 and 7 are authorized for later sandbox work and are not implemented here.

Sandbox setup only. No candidate enhancement or football-mechanics change is implemented. The Chairman authorized branch name `4.3.2.SB`; this does not assign a new product release. No production merge, cloud deployment, live session write, official result acceptance or SEUD publication was performed.

## Verified baseline

- Repository: `rgbslb11/Synthcast-Console`.
- Pinned commit: `8163e9d1a2b22789f0579a761d1e4ae926eaa430`; remote `release/gamecast-v4.3.1` resolved to this commit during inspection.
- Product 4.3.1; UI lineage 4.2.3; football-mechanics lineage 4.2.2.
- Deployed engine `GC-W4-V4.3.1-RC1`; function `gamecast-week4-v4-3-1`, ACTIVE version 3.
- Supabase project `percrnamjzetzjjuxuuw`; read-only deployed-source inspection.
- Week 4: 55 unique games, 110 participants, 121 canonical rating rows plus 4 synthetic FCS rows at 60/60/60. All 330 scheduled rating fields checked unchanged.
- Chairman theme remains dark. G0142 kickoff/network remain TBD/BLOCKED in the baseline; no schedule correction is authorized here.

All three generated runtime files match freshly retrieved deployed source byte-for-byte. Generated index.html, app.js and shared CSS match the current live route byte-for-byte. See `evidence/provenance.json`. Runtime authority is index.ts plus its direct week4.ts and power.ts imports; retained engine-core.ts is not substituted.

The four attachments in this turn were the old September 7 registry. The updated 2026-09-18-R1 four-file registry was recovered from the prior task workspace, read in full, and preserved in `registry/`. Its current claims were checked against GitHub and deployed evidence. The copied registry records pre-setup status; this README records the subsequent sandbox setup.

## Run locally

Node 24.19.0 was used. These commands do not require npm installation, cloud credentials or a Supabase project:

```sh
node scripts/build-gamecast-v431.mjs
node scripts/verify-gamecast-v431-power.mjs --source-only
node sandbox/test.mjs
node sandbox/test-http.mjs
node sandbox/server.mjs
```

Open `http://127.0.0.1:4311/sandbox/` on the machine running the server. This is a local runtime, not a publicly hosted preview. The HTTP test starts and stops its own loopback server on port 4312. A server was started successfully during verification; no persistent hosted service is claimed. Do not run the retained power-verification script without `--source-only`: its other modes write cloud QA sessions.

## Isolation contract

| Boundary | Implementation and evidence |
|---|---|
| Source | Separate checkout/branch; all existing tracked source and workflow files unchanged |
| Engine identity | `GC-W4-V4.3.1-RC1-SANDBOX`; original engine version retained as baseline |
| Session/run identity | `qa-w4v431-` session prefix; `QA-` run prefix |
| Persistence | Local `sandbox/data/qa-sessions.json`, ignored by Git; fresh QA data only; tokens generated locally; atomic file replacement and optimistic version checks |
| Runtime adapter | Executes hash-pinned engine with observed RPC interface mocked locally; no supplied fetch, WebSocket, process, require, Supabase client or cloud credentials |
| Console | `/sandbox/`, storage `synthcastGameCast431SandboxOperator`, API `/sandbox/api` only; original dark CSS; explicit QA-only banner on both views |
| HTTP | Loopback bind; asset allowlist; foreign Host/Origin and cross-site requests rejected; CSP limits connections to same origin |
| Results | Every stored game/API envelope is QA_ONLY/nonofficial; acceptance, publication, SEUD, standings/ratings feeds and power updates rejected server-side; forbidden promoted lifecycle values rejected in persistence |
| Three clocks | Source unchanged; targeted tests confirm Master Zulu and GL continue while Pause/Delay/Edit freeze football state and RNG; speed comparison uses equal synthetic elapsed |
| Existing sessions | No active session IDs, credentials or state loaded; foreign namespace/token negative tests use fabricated inputs against local adapter only |

The RPC mock is not evidence of actual database DDL, transactions, RLS or cloud persistence parity. VM execution is for trusted hash-pinned source and is not claimed as a security boundary for hostile code. Cross-environment tests establish local rejection and absence of a cloud write path; no live writes were attempted to test rejection. A future cloud sandbox is BLOCKED on its own schema/credential/isolation inspection. Local setup does not require it.

Only imports/host integration, environment labels, console/storage bindings and QA output controls differ. Football functions, timing constants, RNG mechanics, ratings and schedule are unchanged. Source hash checks fail closed if the pinned engine or either input file changes; a future authorized candidate will require an explicit separate candidate loader and comparison design.

## Test evidence and release gates

See `evidence/test-results.json` and `evidence/http-results.json`. All generated test outcomes are QA_ONLY.

| Gate | Status | Scope/limit |
|---|---|---|
| 1. Engine/state integrity | PASS | Targeted clocks, valid periods and 55 local full-game structural smoke checks; not exhaustive |
| 2. Fixed-seed regression | PASS | 5 baseline-versus-adapter full-history comparisons; same-seed restart replay |
| 3. Multi-seed distributions | NOT TESTED | Different smoke seeds are not distribution/calibration certification |
| 4. Full-board checks | PASS | 55/55 games, one fixed seed each; all scheduled ratings verified |
| 5. Poll/chunk invariance | PASS | 5 full games, 1-second vs 13-second chunks |
| 6. 1x vs 50x invariance | PASS | 5 equal-synthetic-time, 150-second state comparisons; full-game speed matrix not tested |
| 7. Backend persistence/versioning | PASS | Local mock reload and optimistic-conflict tests only; cloud parity BLOCKED |
| 8. Chairman console integration | NOT TESTED | HTTP/static binding checks pass; interactive browser rendering not tested |
| 9. Public scoreboard integration | NOT TESTED | Public API redaction passes; rendered browser surface not tested |
| 10. Mobile Safari | NOT TESTED | No device/browser test performed |
| 11. Existing-session compatibility | NOT TESTED | Deliberately isolated; no import/migration of live sessions |
| 12. Chairman approval | NOT TESTED | Setup and branch name authorized; no football candidate selected or approved |

No release certification is claimed. Scope of completed verification is sandbox setup and limited unchanged-engine regression.

## Seven candidate enhancements — independently retained

| ID | Candidate | Source evidence / next approval decision |
|---|---|---|
| 1 | Two-minute awareness and endgame decision trees | Existing strategy(g) already has late-game branches. Approve situation matrix, clock/timeout decisions and any tuning before replacing it. |
| 2 | Variable Game Length driven by actual football and broadcast events | advanceGame charges event time; thresholds and breaks include fixed constants. Approve causal event model and calibration scope; preserve all three clock meanings and natural variance. |
| 3 | Chairman scoring-probability influence scoped to a drive or quarter | No such control established by inspection. Approve probability bounds, target, expiry, intervention/continuation identity and audit trail; never guarantee a score. |
| 4 | Exportable play-by-play, drive identity and derived team statistics | applyPlay stores limited history and counters; full drive identity/stat schema not established. Approve schemas and derivation rules; logging must consume zero RNG draws. |
| 5 | Seeded randomized opening receiver, opposite halftime receiver | initialGame/reset set possession=0; advancePeriod assigns possession=1 for Q3. Recommended first bounded football package below; not implemented. |
| 6 | Weekly schedule upload, validation, board generation and immutable week locking | Runtime imports compiled week4.ts. Approve upload schema, exact game-set validation, revision/lock semantics and handling of blocked carriage. |
| 7 | Off-white/grey Chairman console theme | Current live CSS remains dark (#090b0e). Approve Chairman-only scope and palette; public theme should be an explicit separate decision. |

Count check: 7 requested / 7 separate entries / 0 implemented candidate enhancements.

## Recommended first work package: candidate 5

Observed behavior: the away side always receives at opening and the home side receives after halftime. Evidence: `initialGame`, `reset` and `advancePeriod` in the verified deployed index.ts. Root cause: hard-coded possession 0/1, not a failed random draw. Impact: deterministic receiving-side bias. Classification P2 realism opportunity.

Proposed bounded correction, pending Chairman approval:

1. Derive one uniform 50/50 opening-receiver decision from a domain-separated seeded stream (game seed + game ID + a fixed receiving-decision label). This avoids consuming an extra draw in the existing play RNG stream. Reproducible does not mean old outcomes remain identical after possession changes.
2. Store openingReceiver and secondHalfReceiver = 1 - openingReceiver. Never derive second-half receipt from possession at the end of Q2.
3. Same-seed restart preserves receipt; new-seed restart recomputes it and may legitimately produce the same side. A live continuation preserves established half receipts.
4. Test both opening sides, Q3 reciprocity despite intervening turnovers, repeat/restart, poll/chunk/speed invariance, and broad seed balance. No HFA, ratings, schedule, scoring, timing or probability retune.

Material design decisions needing approval: (a) unbiased 50/50 receipt directly, with no separate coin-toss/defer strategy model; (b) the independent seeded stream instead of inserting a draw into the play RNG; (c) future candidate engine/release identity and explicit exclusion of existing sessions. Branch 4.3.2.SB is already approved, but no release number is assigned by this recommendation.

Authorization required? Yes: implement candidate 5 only after selection. The seven candidates remain proposals. No permission is needed to retain this completed sandbox setup on the already-authorized branch.
