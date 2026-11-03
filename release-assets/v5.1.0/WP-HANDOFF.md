# WP integration handoff — first assignment

Baseline: development/gamecast-v5.1.0 at f0eb2a56df7fe8d10e1f7739a261a1d5084b6699. Shared contract GC-STATS-1 remains unchanged. This review adds a proposed WP supplement, tests/evidence and a local workload script only. No runtime integration or deployment.

Read WP-INTEGRATION-CONTRACT-DRAFT.md and wp-integration-contract.draft.json together. D1 is pending Chairman model/contract approval; do not treat it as an approved replacement for GC-STATS-1.

The corrected prototype is cd26ed23, whose parent b433942 contains the earlier history implementation, built on 69904c9 and common ancestor 9d13c58. Selectively reuse tested behavior. Do not merge that older candidate backend or replace 5.1.0's tests/v506. The prototype model is already present in 5.1.0; durable history and HTTP integration are not.

Decisions requested before implementation:

1. Keep current mean-margin → logistic formula for the first test version (recommended), or explicitly commission a versioned direct-ensemble-probability bridge. These values are not equivalent. Actual matchup prior manifest is still missing.
2. Agree on authoritative capture/outbox integration and kickoff policy: missing/mismatched WP prior blocks WP, while football launch keeps its existing semantics. No late prior fabrication.

Boundary for the broader owner:

- Supply immutable, allowlisted committed-state captures and complete session/game correction audit, anchored to stateVersion and source event cursor. Do not supply live RNG, pending outcomes or full engine objects.
- Atomic launch capture binds the prior/model; special captures cover first observed gameplay, final, edit begin/cancel and saved correction.
- Sampling runs centrally every five Master-Zulu seconds, without browser reads or engine advancement by WP.
- Store append-only history separately; board gets a compact current summary. Distinguish source revision, WP cursor and projection revision.
- Maintain session/game-wide sticky blocks across restart/continuation. A clean edit cancel restores only when no older committed correction exists.
- Chairman-only WP routes; public scoreboard compatibility/isolation must be tested. Existing prototype public WP route is unsuitable.

WP owner: estimator/prior validation, append semantics, projection contract, chart rules, preservation/regression tests. Broader owner: authoritative commit adapter/outbox, authorization/audit, infrastructure/delivery and final UI integration. Reconcile the moving base SHA before implementation.

Evidence:

- 62/62 unchanged corrected prototype tests pass locally; test and fixture hashes in evidence/wp-prototype-preservation.json.
- 24/24 5.1.0 foundation tests pass locally.
- New local workload: 56 simultaneous game slots at 1x/4x/10x/20x/50x; 280 total runs, 122,652 sampled calculations, 9,172 detailed reads; identical final football states/histories across speeds and no read mutations.
- Local virtual-clock measurements are not cloud/database/network/browser certification. All 12 realistic isolated load/recovery scenarios are specified in the contract and remain NOT TESTED.
- Read-only cloud inspection: active protected 5.0.6 functions; no gamecast_v510 schema or 5.1.0 functions in the configured project.

No production authorization. No 5.0.6 file, function, schema, cron, session, rating or accepted result was changed. Rollback is to leave this review unmerged.
