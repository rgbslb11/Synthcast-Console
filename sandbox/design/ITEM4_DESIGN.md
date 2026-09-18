# Item 4: team statistics and Chairman reconstruction — approval draft

**Successor:** [CONSOLIDATED_SMOKE_SPEC.md](CONSOLIDATED_SMOKE_SPEC.md) combines the later full-OT, OPP3, defensive-return, timeout/penalty, Unavailable-first and Chairman countdown rulings. Its explicit overrides take precedence over this D2 draft. This file remains architectural lineage and the S01–S20 test-plan reference.

Design revision D2, 2026-09-18. Engineering baseline: branch `4.3.2.SB`, commit `b7e88fade09a41b1616a3f27fb9ff8cce61d4abd`, RECEIVER1 sandbox. No new product release. This change contains design documentation only. No #4 implementation, migration, smoke test, deployment or active session change was performed.

Owner and approval authority: Chairman Gary Baxter. Users: Chairman/operator and read-only public viewers. Mode: Design. Criticality: experimental now, intended public-facing output later. Maturity: architected draft, not build-ready or certified. Reversibility: append-only revisions and explicit supersession. Modules: authority/data lineage, transactions/async processing, UI permissions, reliability and test planning. No LLM is required for the reconstruction algorithm.

## Hard boundary added by Chairman

Item 4 MUST NOT modify football-engine code or behavior to obtain team statistics. Freeze the pinned engine, RECEIVER1 transformation, RNG, timing, scoring, possession decisions, command semantics and existing persistence interface. No new hooks inside football functions, typed-event instrumentation, outbox writes, per-play storage writes, engine counters or schema changes required by the engine. Stats code is an external sidecar using existing outputs and available durable records. No added read cadence that changes game execution; reuse existing output capture where possible.

The stats service can adjust its own synthetic reconstruction only. It cannot change the live score, field position, possession, clocks or seeds. A Chairman football correction uses an already-supported explicit engine command. Any requested capability not currently supported (including new signed score commands) requires a separately authorized change; it is not bundled into #4. Complete observed statistics are BLOCKED wherever existing output is insufficient. Do not claim reconstructed detail was actually simulated.

## 1. How committed and final statistics become authoritative

The engine must not decide finality from the visible score alone. Store an explicit revision relationship and a Chairman approval record.

Every game run has a committed football-state version and ordered event sequence. Every stats snapshot names the exact run, last event, correction revision, rules profile and stats-algorithm version from which it was built. An immutable snapshot means those saved bytes never change; an in-progress game's next play can create a newer snapshot.

For full reconstruction: prepare a versioned proposal with before/after score, per-period totals, team stats, affected drives, effective play sequence and next football checkpoint. Show resulting possession, field position, down/distance and time. Include input hash, separate reconstruction seed, solver version, rule-profile hash and validation report. Chairman authorization applies to this exact proposal hash, not to a later regeneration. Save checks expected game version and an idempotency key; reject stale previews rather than silently approving new numbers.

On Save, the sidecar records the approved proposal and expected engine version. The existing Chairman correction command commits through the unchanged engine. Only after its acknowledged resulting version is verified does the sidecar bind the exact approved statistics checkpoint to that version. These are separate commits, not a new cross-system atomic transaction. While the binding is pending, statistics display Updating; the score stays authoritative. An uncertain response requires readback/reconciliation, never blind resubmission. If the engine rejects or differs from the approved checkpoint, the proposal cannot be shown as committed. The solver never runs on the live scoring path. Sidecar indexing/export may materialize the approved data but cannot invent a different reconstruction. Existing score-only corrections remain available, with affected detailed stats PENDING/BLOCKED until reconciled.

AUTO then runs from the committed football checkpoint. Later plays are counted after that checkpoint exactly once. Earlier raw events remain unchanged. A future correction creates a successor revision with explicit replacement links; it never edits an old snapshot or re-adds replaced contributions.

Final sealing: game is FINAL_PENDING; worker has caught up to the final event; score, line score, stats and effective-event manifest match; all required validation checks pass. The sidecar seal binds the observed locked engine version to a final stats ID and digest. Approval of this stats seal is recorded separately from the unchanged engine acceptance command; it does not add an acceptance parameter or modify engine governance. Editing or reopening invalidates the current lock/acceptance pointer and requires a successor and reapproval. Prior accepted versions remain auditable. In sandbox, official acceptance/publication stays disabled; tests may validate a QA seal model only.

State machine: stats PENDING -> READY -> LOCKED_QA (or later authorized official lock); PENDING -> BLOCKED on infeasibility; older immutable revisions become SUPERSEDED by pointer, not modified. This stats state does not replace the established game lifecycle.

## 2. Removing points and allowing bounded statistical flexibility

Chairman score edits are hard targets. Unlocked derived details within the selected affected drive/period can change to create a coherent explanation. Penalties, turnovers, TOP and conversion outcomes are eligible variables, but are never arbitrary balancing numbers. Reconstruct events first, then derive every statistic from those events.

Hard constraints: exact approved period/team scores, legal scoring composition, game/run identity, selected edit time and explicit checkpoint fields, established halftime receipts, rules profile, immutable raw evidence, and nonnegative counts. Soft goals: change as few effective events as possible, stay near prior yards/play counts and team tendencies, avoid excessive penalties/turnovers and preserve unaffected drives. Do not force a winner through future RNG tuning.

Prefer the linked original scoring sequence if identified. Otherwise search a bounded affected segment. No silent expansion into unrelated periods: show any wider revision in a new preview. Retained raw records are evidence of the original simulation; the effective reconstructed view is the approved synthetic account. Do not add both into totals.

Example: subtracting seven points can turn a scoring possession into a failed drive. Any turnover and defensive takeaway must arise from an actual reconstructed event; a failed fourth down must update its attempts, conversions and next possession consistently. It need not erase yards already earned. Adding one point is an arithmetic target, not proof that a standalone one-point football event occurred; the solver must find a legal surrounding scoring sequence or return BLOCKED.

If no legal solution satisfies the constraints within the allowed segment and compute budget, mark full reconstruction BLOCKED and explain the conflicting fields. Keep the proposed correction uncommitted; offer a broader preview or an explicit score-only save. Never silently substitute unsupported stats or undo an already committed score-only correction.

## 3. ZERO SCORE and clock accounting

ZERO SCORE targets the selected team's entire score across regulation and overtime. Preserve yards, plays and TOP where possible; reconstruct its scoring outcomes and related drive endings as necessary. A score of zero is compatible with substantial offensive production. Do not erase the opponent's unrelated records.

Both team TOP values must use one consistent regulation-time accounting model. They cannot independently increase: a redistribution must preserve the available regulation budget. Drive duration and TOP are separate measures. Broadcasts, halftime, Chairman waits and GL do not create possession time; untimed OT gets no regulation TOP. For the synthetic 10-minute mode, use the configured 40-minute regulation budget, not a fabricated 60-minute total. For 15-minute mode use 60 minutes. A clock correction changes the effective accounting budget only as explicitly approved, with overlap/gap checks. Neither reconstructed history nor its computation changes elapsed GL or Master Zulu.

## 4. Possession and drive identity

Each drive has a stable ID under game/run/revision. A quarter boundary alone does not close a drive. Halftime, possession loss, scoring/restart events and corrections use explicit drive-ending rules. A score edit may require a possession change, but does not automatically require one: select the legal event sequence.

The preview includes before/after possession, field position, down/distance, period and clock. Chairman may pin these as hard constraints or authorize proposed replacements. A proposed live possession change must be selected and sent by the Chairman through the existing edit command. If that command cannot express it, the proposal is BLOCKED. The sidecar attaches matching stats only after verifying the acknowledged correction; it cannot send a possession change itself. Live material edits use the existing continuation-run mechanism and preserve RECEIVER1 half receipts.

A current unresolved play is not recorded as a completed play. Saving an edit follows the established pending-play/continuation semantics; Cancel retains the original checkpoint. Generated events use a separate deterministic reconstruction seed and never draw from the football RNG. The seed is frozen in the proposal so repeated requests produce identical output.

## 5. 2026 NCAA counting and validation

Sources: [2026 NCAA Football Rules and Interpretations](https://ncaaorg.s3.amazonaws.com/championships/sports/football/rules/PRMFB_RulesBook.pdf), title/date confirmed as May 2026; [official Football Statisticians' Manual](https://s3.amazonaws.com/fs.ncaa.org/Docs/stats/Stats_Manuals/Football.pdf), retrieved with no explicit edition year found. Hashes are in item4-sources.json. Completeness of current supplements and a full FBS/FCS exception crosswalk remains BLOCKED pending rule review.

Selected source checks: the manual's Basic Interpretations 4, 8–11 distinguish enforced penalty yardage, third-down opportunities, regulation TOP and overtime statistical treatment. The 2026 rules book Rule 3-1-3 specifies special later-overtime procedures. These require separate counting cases; a generic counter cannot establish compliance.

Implement versioned counting-rule IDs with document/page/section citations and expected fixtures for rushing, passing, sacks, kneels/spikes, fumbles, interceptions, penalties, conversions, kicks/returns, scoring, TOP, drives and OT. Verify applicability for each synthetic team's preserved FBS/FCS profile without substituting real-world membership. Proposed team coverage includes points by period; rushing attempts/net yards; passing attempts/completions/yards/interceptions; total offense; first downs by cause; third/fourth attempts/conversions; sacks allowed/made; fumbles/lost; opponent takeaways; penalty counts/yards; punts; field goals/tries; returns; possession and drive results. Unsupported categories are BLOCKED, not zero.

Current source gap: `applyPlay` retains description/yardage and limited counters, not a complete typed statistical event. Current overtime `advancePeriod` samples points without complete possessions and retains generic later-OT behavior. Therefore observed OT play details cannot be recovered faithfully, and blanket 2026 compliance is not supported. Do not add richer event capture inside the engine. Map only facts exposed by existing output into sidecar records; fields not supported by that output remain BLOCKED or explicitly reconstructed at the Chairman’s request. Any football-mechanics correction to achieve OT compliance is a separately approved work item, not hidden in stats code. Existing 10-minute mode is an explicit synthetic duration variation, not a claim of standard NCAA game duration.

## 6. Live scoring performance and drill-down

The main scoreboard response contains compact current football state and summary versions only. No full stats tables/history appear on either main board. Chairman OPEN GAME and tap/click on a public game open the individual game page. Team Stats is the default view, with Drives and Play-by-Play tabs; public view is read-only and receives no operator credentials, seed material or private audit data.

Live scoring must not wait for statistical aggregation, reconstruction, history reads or exports. Copy available existing command/read responses and durable events into separate sidecar storage without adding writes to the engine transaction. Exact delivery/completeness must be verified; missing observations are gaps, not invented events. A dedicated ordered sidecar worker maintains per-game stats checkpoints; drill-down reads a ready cache or waits briefly for its required version. Proposed APIs: board summaries, paged per-game events/drives, team-stat snapshot with through-event/version, prepare correction, commit correction and QA seal. These are contracts, not deployed endpoints.

Target: drill-down completes within 1–2 seconds (p95 <=2s proposed); score/stat freshness normally <=1s p95, <=2s p99 proposed. If exceeded, keep scores live and show Updating with last computed revision/time. Do not silently show stale stats as matching a newer score. Slow or failed workers cannot roll back football. Coalesce notifications but never discard underlying events. Retry deterministically with checkpoints, surface repeated failures, and rebuild projections from recorded events.

Performance gate proposal: at 60 simultaneously active synthetic games and realistic board/detail readers, incremental p95 scoring API overhead <=20ms and no added missed scoring-refresh deadline against the same baseline load. Measure CPU, storage writes, payload, memory, queue lag, p95/p99 scoring and drill-down latency. These are proposed acceptance budgets, NOT measurements or promises. Current whole-session projection/update architecture remains unchanged. Measure sidecar overhead without rewriting that architecture; if budgets fail, reduce or block the stats capability rather than retune the engine. Cloud storage design is BLOCKED on actual schema/permissions inspection; no cloud DDL is authorized here.

## 7. Replay, repeated saves and separate runs

Every event has game/run/sequence identity and an idempotency key. Duplicate delivery cannot create duplicate plays or stats. Serialize per-game revisions; use compare-and-swap for checkpoint publication so late workers cannot replace newer stats. Simultaneous edits reject the stale approval. Stats never initiate football events.

Restart/purge begins a distinct run and distinct stats records. Original histories stay available but are not mixed into the new run. Reproducibility pins football seed, receipt seed, reconstruction seed, intervention manifest, schedule/ratings snapshot and engine/stats/rule versions. Same input plus same intervention manifest must reproduce the same result. Preview Cancel produces no committed statistical or football change.

## 8. Validation, exports and final acceptance

Validate score/period equality, scoring-event equality, derived yards and opportunities, opposing turnover relationships, possession continuity and nonoverlapping time, field/down bounds, and aggregate consistency under the cited counting rules. Not every drive yard equals rushing plus passing yards: apply the appropriate penalty/return rule instead of forcing a false identity.

Export CSV/JSON play, drive and team-stat tables from one snapshot ID with a manifest carrying game/run/revision/rules/engine/stats versions, source hashes, snapshot digest, generated-versus-observed provenance and QA status. Exports requested while current stats are incomplete clearly report PENDING/BLOCKED or explicitly export an older labeled revision. Only a verified locked revision can be offered for later official acceptance. Sandbox acceptance, standings, rating feeds and SEUD remain denied.

## Minimal record model and ownership

| Record | Key relationship / authority |
|---|---|
| GameRun | One game has many runs; football engine owns current checkpoint and event sequence |
| FootballEvent | Many ordered immutable raw events per run; engine owns observed output |
| CorrectionProposal | Binds expected state/event version, scope, target and proposed checkpoint; not yet authoritative |
| ReconstructionManifest | One exact effective-event replacement set per proposal; seeded solver produces, Chairman approves |
| CorrectionCommit | One approved idempotent proposal/hash; binds verified acknowledged engine version to approved stats revision after separate commits |
| StatsSnapshot | Many immutable revisions per run; stats worker derives from explicit effective manifest and event boundary |
| RuleProfile | Versioned cited counting rules, applicability and documented synthetic variations |
| ResultSeal | Exact final state/stat hashes and Chairman authorization; QA-only in this sandbox |

Private audit stores the operator identity, original/reconstructed differences and approval evidence. Public effective history may identify entries as Chairman-adjusted without exposing private seeds. Ownership: Chairman sets authoritative corrections; engine owns subsequent football; worker owns derived statistics only. No browser or background job independently overrides these roles.

## Proposed work and smoke-test approval boundary

After approval, build a bounded local harness with mocked storage and representative event fixtures; do not publish a cloud runtime. Sequence: existing-output capability map/rule map -> external event reducer/validation -> reconstruction proposals and acknowledged-version reconciliation -> sidecar worker/API projections -> drill-down UI -> performance harness. No engine source modifications. Signed score controls remain a separately authorized engine/UI work item, not part of this design build. Pin RECEIVER1 as the comparator. Each build item maps respectively to tests S01–S20 below. Rules-dependent fixtures cannot be marked passed until their cited expected behavior is verified.

Signed quick-score contract: for EACH home/away team, +1/+2/+3/+6/+7/+8 and -1/-2/-3/-6/-7/-8 plus ZERO SCORE = 13 per team, 26 total. Reject period deductions below zero; use an explicit target period, default current. ZERO means all periods for that team. Direct absolute box-score edits remain available. These values remain the agreed control design; implementation is separate from #4. The sidecar observes corrections supported by the existing engine and follows the revision/approval path. UI may open the existing Edit checkpoint to preview/save a correction; it must not silently rewrite AUTO state outside that commit path.

## Smoke-test matrix — proposed, none run

| ID | Scenario / required result |
|---|---|
| S01 | Typed ordinary plays yield cited rushing/passing/first-down/team totals; compare to fixed expected fixtures |
| S02 | Sidecar fixtures represent all 26 agreed control intentions; existing supported edits observed correctly; unsupported engine commands remain BLOCKED |
| S03 | Sidecar proposals reject invalid delta, negative-period result and malformed input without sending an engine write |
| S04 | Remove linked touchdown/try: score, effective events and derived stats reconcile; raw play survives |
| S05 | ZERO SCORE: selected team/periods clear, unrelated yards survive where legal; opponent not silently reset |
| S06 | Reconstruction uses legal penalties/turnovers/conversions and respects available TOP and scope |
| S07 | Unsatisfiable score/clock/checkpoint target returns BLOCKED without invented output or partial commit |
| S08 | Separately authorized existing Chairman possession edit is observed; stats bind only to its verified checkpoint; RECEIVER1 receipts survive |
| S09 | Chairman approves exact proposal; mutate version before Save -> stale rejection, no regeneration on approval |
| S10 | Crash between engine acknowledgement and stats binding leaves visible PENDING, then idempotent recovery; no blind football-command retry |
| S11 | Engine code hashes unchanged; Pause/Edit/Delay preserve three-clock rules; sidecar has no football RNG access |
| S12 | Fixed-seed/manifest replay, chunk and 1x/50x invariance under stats on/off |
| S13 | Duplicate/out-of-order events and delayed workers cannot double count or overwrite newer stats |
| S14 | Final correction -> worker catch-up -> QA lock/seal; reopen preserves old seal but invalidates current eligibility |
| S15 | Restart/new seed isolate old/new runs, archive receipt and intervention metadata |
| S16 | Counting edge fixtures: sacks, kneels, penalties, first downs, tries, turnovers and rule-profile differences |
| S17 | OT: correct supported counting; missing/simplified unsupported details explicitly BLOCKED; no engine retune |
| S18 | Chairman/public drill-down and back navigation; no detailed main-board stats; public writes/private data denied |
| S19 | 55 real-slate plus 5 distinctly marked synthetic load fixtures; 60 AUTO games at 50x; latency and payload budgets reported |
| S20 | Worker outage/recovery and CSV/JSON exports: live score unaffected, stats visibly stale, exports version-consistent/QA-only |

Count: 20 smoke scenarios. All NOT TESTED. Load fixtures must not alter the canonical 55-game slate.

## Risks and release gates

Key risks: impossible reconstruction (BLOCKED); rule gaps (cited crosswalk); hidden double counting (effective-manifest reducer); stale approval (expected-version/hash); worker lag (visible freshness/score isolation); cross-system commit uncertainty (acknowledged-version binding; BLOCKED when proof is missing); generated stats mistaken for observed (provenance flags). Owner: engineering evidence; Chairman owns rule/scope exceptions and release authorization. Rollback disables this candidate and restores the prior sandbox runtime for NEW runs; no destructive downgrade of revised histories.

For item 4, all 12 gates remain NOT TESTED: (1) engine/state integrity, (2) fixed-seed regression, (3) multi-seed distributions, (4) full-board checks, (5) poll/chunk invariance, (6) 1x/50x, (7) persistence/versioning, (8) Chairman integration, (9) public integration, (10) Mobile Safari, (11) existing-session compatibility, (12) Chairman candidate acceptance. Existing item-5 passes do not certify item 4. Source/rule-map completeness and cloud parity are BLOCKED, not inferred.

Approval requested: approve this design and authorize the local item-4 prototype plus S01–S20 smoke testing on `4.3.2.SB`. This request does not include production/cloud deployment, official acceptance, live session migration, unrelated tuning or OT engine changes. Full reconstruction remains a selectable Chairman option, not an automatic default.

Eight response items preserved: 8 expected / 8 addressed. Seven-feature backlog: 1 draft; 2 draft; 3 draft; 4 this design only; 5 implemented RECEIVER1; 6 approved direction/pending; 7 approved direction/pending. No other feature is implemented by this document.
