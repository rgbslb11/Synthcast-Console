# GameCast 5.1.0 — WP integration contract, revision D1

Date: November 3, 2026. Status: PROPOSED / QA_ONLY / NOT APPROVED FOR PRODUCTION.
This is a reviewable supplement to GC-STATS-1, not a replacement or a claim that integration is complete. Material model and authoritative-contract decisions below require Chairman approval before implementation. Another thread owns broader 5.1.0 delivery.

## 1. Verified source and scope

| Item | Evidence / disposition |
|---|---|
| Repository | rgbslb11/Synthcast-Console |
| Inspected 5.1.0 branch | development/gamecast-v5.1.0 |
| Pinned head | f0eb2a56df7fe8d10e1f7739a261a1d5084b6699 |
| Parent / protected release source | 754d959def7a67f2ada99a13f4e3a4c3254be4b8, release/gamecast-v5.0.6 |
| Shared contract | release-assets/v5.1.0/data-contract.v1.json, GC-STATS-1; Git blob b237ecd70a4aae4583893b64aedfdf0effd7ec9d |
| Contract inventory | 17 scoreboard entries; 27 team-stat rows; 22 play attributes; 2 possession features; 1 WP chart; 10 workstreams |
| Existing model | GC-WP-ILLUSTRATIVE-0.1.0 in backend/reporting/illustrative-wp.mjs; equivalent prototype source except trailing whitespace |
| Existing integration | Pure model and reporting/access service; no WP journal, cloud adapter, live WP endpoint or integrated UI established at this head |
| Procedures read in full | AGENTS.md, GAMECAST_MASTER_ROUTER.md, 04_MATH_PROBABILITY_ENGINE.md, 05_INTEGRATED_UI_ENGINE_FEATURE.md; 02_FORENSIC_DEFECT_REPAIR.md for dependency/findings review |
| Cloud inspection | Project xsvdmcipviejxynkdbhq, as selected by the protected release config: 5.0.6 public, chairman and scheduler functions ACTIVE, version 1; no 5.1.0 functions in returned inventory; gamecast_v510 schema absent |
| Database evidence | Read-only inspection of gamecast_v506_w11 sessions/events/requests columns and commit_state definition. Existing function atomically saves session state, events and request receipt. It is 5.0.6-specific and must not be modified for this work. |

No production writes, session commands, migrations, scheduler changes, accepted-result changes or deployments were made. Function inventory is not source/binary certification of the deployed release. Older uploaded 4.2.2/4.3.1 snapshots are historical and do not supersede these pinned sources.

## 2. Prototype ancestry and selective port

Verified ancestry, oldest to newest:

1. 9d13c58548072f4e8ba9cd8f8c9ebcb5cd0f4bd8 — common ancestor / 5.0.5 lineage.
2. 69904c943888165ca47ccc21f6555b02ceeced36 — isolated candidate backend and read-only statistics.
3. b433942e4c07d187f8be4f64195cf7e356fce2ef — probability history, override blocking and smoke coverage.
4. cd26ed23bff38004e61210a1004051ae51906846 — cancellation, gaps, response reasons, tooltip and regression corrections.

GitHub comparison reports 5.1.0 and the prototype as diverged: 5.1.0 is six commits ahead and three behind, with 9d13c58 as merge base. The correction commit is not a standalone feature. Do not cherry-pick the whole candidate ancestry onto the operating release.

| Prototype component | 5.1.0 treatment |
|---|---|
| illustrative-model.mjs | Already present as illustrative-wp.mjs. Preserve mathematics pending model decision. |
| history.mjs validation and correction cases | Preserve behavior, test fixtures and immutable-event assertions; adapt storage and session/game-wide correction evidence. |
| operations.mjs | Reference only. Replace the snapshot-embedded history wrapper with committed-state/outbox adapter owned by 5.1.0 integration. |
| database-store.mjs assertions | Preserve intent: atomic journal/receipt agreement, prefix integrity, identity and retry checks. Do not overwrite protected store. |
| public probability API | Do not port. GC-STATS-1 restricts detailed WP to authenticated active Chairman with session authorization. |
| chart.mjs | Preserve gaps, grey BLOCKED state, corrected score tooltips and escaping. Final styling/layout stays with UI owner. |
| tests/v506 at cd26ed23 | Preserve unchanged at the source ref, record hashes, run separately. Adapt additional tests into tests/v510 only after contract agreement. Protected tests/v506 in 5.1.0 have different release lineage and must not be replaced. |

## 3. Pregame source recommendation and mathematics

Recommended source: an independently seeded, offline simulation ensemble using the approved matchup context: team identities; approved TEAM/OFF/DEF artifact hashes; engine and rules versions; quarter length; venue/neutral flag; approved HFA settings; approved weather scenario. Use separate QA jobs, storage and random streams. Never read the scheduled live run's seed, RNG state, pending outcomes or future trajectory. Do not use betting lines, market probabilities, fixed winners or completed target-game results.

Suggested initial ensemble size: 10,000 independent trials per matchup (560,000 for 56 games), run ahead of kickoff. This is a proposal, not a completed ensemble. At a 50% win rate, Monte Carlo standard error is about 0.5 percentage points and an approximate 95% interval is ±0.98 points. This quantifies sampling error only, not simulation bias or calibration. Store wins/losses/unresolved counts, actual completed-trial count, mean and standard deviation of margin, quantiles, run configuration and artifact hashes. Failed/unresolved trials must be reported; do not silently count them as losses or half-wins. A model may resolve offline OT, but its rule/version must be declared; that does not enable live OT estimates in this model.

There is currently no approved matchup-level prior manifest in the inspected 5.1.0 foundation. Actual pregame values are BLOCKED until one is supplied/generated and approved. QA fixtures remain explicitly labelled fixtures.

Let M_j be the signed final margin for a designated team in independent trial j.

**Direct ensemble probability:** p_hat = count(M_j > 0) / N, provided all N trials resolve a winner. This measures the proportion of simulated wins and retains the distribution's effect on win frequency.

**Existing margin-derived probability:** m_bar = sum(M_j) / N; orient the selected model favorite so m >= 0. At kickoff the existing formula produces p0 = sigmoid(0.14 m). This replaces the observed win-frequency distribution with a fixed logistic relationship. It is not generally equal to p_hat.

Illustrative example, not a GameCast forecast: a team wins by 28 in 40% of trials and loses by 7 in 60%. Its expected margin is +7, its ensemble win rate is 40%, and the existing margin transform gives sigmoid(0.98) ≈ 72.71%. Mean margin and chance of winning answer different questions; even favorite identity can disagree.

For the first integration test, recommend **retaining the existing margin-derived formula**, using the independent ensemble's mean margin as input and storing its raw win rate as a separate diagnostic. Label the output “Illustrative margin-derived WP — calibration deferred.” This minimizes model changes while durability/access/recovery are tested. It does not endorse 0.14 as calibrated.

If the Chairman instead wants the ensemble's actual win percentage displayed at kickoff, that is a material model revision. Merely displaying p_hat at kickoff while live calculations still use m creates an unexplained discontinuity. A candidate bridge is m_equiv = log(p0/(1-p0))/0.14, which aligns the existing live prior term to p0. m_equiv is a logistic-equivalent strength, NOT expected scoring margin; it must be named separately and assigned a new model ID. Treatment of p0=0 or 1, uncertainty smoothing, favorite identity and disagreement with mean margin require a specified policy. No clipping/smoothing policy has been implemented here.

Current live equation, preserved from source:

- T = 4Q; t = (4-period)Q + clockSeconds; u = t/T, with Q in seconds (600 or 900).
- D = favoriteScore - otherScore.
- V = signed fieldValue(yardsToGoal) after observed resolved gameplay; zero at kickoff/pre-first-play. Field anchors interpolate 5,4,3,2,1 points at 0,25,50,75,100 yards to goal.
- R = m*u; S = sqrt(2² + ((1/0.14)² - 2²)*u).
- p = sigmoid((D + V + R)/S).
- Untied football-terminal state: actual result 1 or 0; this is not official acceptance.
- Nonterminal OT: no estimate, null probability and OVERTIME_MODEL_UNAVAILABLE.

The current estimator does not use down/distance, timeouts, clock-running status, detailed strategy or remaining-possession feasibility. Recording these fields for audit does not make them model inputs. Therefore it is an illustrative score/time/possession/field estimator, not a complete late-game “can still win” model. No impossibility rules, new EP table, timeout model, smoothing or OT model are silently introduced.

## 4. Shared integration boundary

The broader thread owns authoritative football, commit/outbox production, access/audit adapters, delivery infrastructure and UI routing. This WP thread owns the pure estimator, prior validation, observation append rules, compact WP projection, chart semantics and WP tests. Integration uses GC-STATS-1 plus proposed extension GC-WP-INTEGRATION-D1. Neither thread independently redefines session/run identity, event sequence, correction scope or clocks.

Required trusted input snapshot:

| Group | Fields and semantics |
|---|---|
| Identity | contractVersion, sessionId, engineVersion, dataVersion, gameId, runId, parentRunId, modelId, modelArtifactHash |
| Commit | stateVersion, throughEventSequence, sourceCommittedAt, committedInputHash; complete authoritative audit bound to the same revision |
| Football | team IDs, score by team, valid period, quarterSeconds, scoreboardSeconds, possessionTeamId, offense-relative fieldPosition, resolvedPlayCount |
| Context | down, distance, timeouts, lifecycle, activity, editing, delay/pause, GL; audit-only where not used by model |
| Prior | priorId/revision/hash, source manifest, selected method, favorite identity, margin and/or ensemble diagnostics; immutable kickoff binding |
| Trigger | stable sourceEventId or UTC sample slot, kind, observedAt; generated by backend only |

Use an explicit allowlist to construct WP input. No full engine object crosses into the estimator. Prohibit seedHex, rngState, pendingPlay, pendingRandom, hidden target winner, future play lists and market inputs. Ratings may support the offline ensemble but are not inferred into a point margin by WP. Convert fieldPosition to yardsToGoal as 100-fieldPosition; validate range and possession orientation.

Keep stateVersion (football commit), throughEventSequence (source history cursor), observationSequence (WP append cursor) and projectionRevision (summary revision) distinct. A poll can observe the same football revision multiple times. Analytics writes must not change football revision, timing anchors, edit tokens or RNG. Never compare these different sequences as if interchangeable.

Envelope availability remains AVAILABLE / NOT_STARTED / BLOCKED. Nested WP status is PREGAME / ESTIMATED / FINAL / BLOCKED. Pregame WP can exist while broader statistics are NOT_STARTED; use a Chairman-only pregame configuration/read operation rather than silently redefining availability. Require run/version-bound pages. Current service returns no WP and has no production adapter; this supplement defines the missing integration.

## 5. Observation and correction behavior

| Trigger | Record and rule |
|---|---|
| Pregame update | Append immutable prior revision and pregame observation while UNLAUNCHED; expected revision/idempotency key required. |
| Kickoff | Freeze selected prior, favorite identity, model ID/artifact and context in the launch transaction; one kickoff record per run. Launch/configuration race has one winner. |
| First observed gameplay | Append once when a committed snapshot first has resolvedPlayCount>0, even within the kickoff's five-second slot. Record actual count and revision; do not claim the exact first-play moment if a backend batch committed multiple plays. |
| Five-second sample | UTC slot=floor(observedAtEpochMs/5000), Master Zulu basis, independent of speed and browser polling. First valid committed capture wins; no second record for the same run/model/slot. |
| Open Edit | Append edit_begin immediately; BLOCKED/null/grey. Temporary block only unless older committed correction exists. |
| Cancel unsaved Edit | Append distinct edit_cancel even in the same slot and after a terminal edit; restore PREGAME/ESTIMATED/FINAL as appropriate only after checking the complete session/game correction audit. |
| Saved correction | score, clock_set, edit_commit, end or reopen_live: append override referencing original command ID; BLOCKED/null/grey remains across acceptance, restart and continuation for this session/game under GC-STATS-1. |
| Pause / Delay | Preserve football state; Master Zulu and GL continue under existing engine semantics. Sampling may append unchanged estimates. Neither is itself a saved correction. |
| Natural Final | Append terminal record immediately; 0/1 for untied result only if no overriding block. No subsequent periodic samples. Accept/Lock is not a new football outcome. |
| Nonterminal OT | Append BLOCKED/null with OVERTIME_MODEL_UNAVAILABLE; no interpolated curve. Natural final can record actual result if otherwise eligible. |
| Missing interval / outage | Record actual observation time, missingIntervals and gapBefore. Never synthesize historical observations from the latest state. |
| Existing in-progress run without kickoff | BLOCKED/KICKOFF_OBSERVATION_MISSING; never invent a frozen prior after the fact. |

Distinct kickoff/first-gameplay/final/edit/override events must not be suppressed by poll-slot deduplication. If first gameplay and final are first seen in one commit, preserve both trigger identities, explicitly noting their shared observed snapshot. A change of score within the same slot does not rewrite that slot's observation; special events still append independently.

Proposed missing-slot accounting uses UTC slot differences and explicit capture coverage; a missed sampling slot is different from a lost journal row. Special events that successfully capture a slot may mark its coverage. Graphs break on either missing coverage, a correction boundary or unsupported estimate. Preserve the corrected 0→10 and 4→10 boundary tests.

Live context is frozen at kickoff. If weather/config changes before launch, prior context validation must be rerun in that same transaction. Recommended failure policy: football launch continues under existing rules, WP becomes BLOCKED for missing/mismatched prior. This policy needs contract approval; WP failure must not silently prevent or alter gameplay.

## 6. Append-only database and bounded live state — proposed, not deployed

Reserve gamecast_v510 only; do not reuse gamecast_v506_w11. No migration has been applied. Existing 5.0.6 commit_state is useful architecture evidence, not a function to extend in place.

| Proposed relation | Purpose / invariants |
|---|---|
| wp_prior_revisions | Append-only pregame values, provenance, context/model hashes and request identity. Unique session/game/prior revision; no UPDATE/DELETE through application roles. |
| wp_run_bindings | Immutable launch binding: session/game/run/model/prior/context and kickoff source event. Unique launch binding per run. |
| wp_observations | Append-only identity, cursor, source revision, timestamps, input/trace, status/reason, probability, prior hash and gap metadata. |
| wp_latest | Replaceable compact projection, at most one current summary per session/game/run/model. Bounded payload; no historical points array. |
| wp_capture_outbox | Durable allowlisted captures produced at authoritative commit or periodic committed-state read; delivery/ack metadata separate from immutable payload. |
| correction audit / block projection | Consume broader thread's authoritative session/game audit. Never let restarting or deleting a local WP cache erase evidence. |

Logical observation identity: (sessionId, engineVersion, gameId, runId, modelId, eventId). Event ID is derived from source command/commit-event identity for special events; from UTC slot for polls. stateVersion belongs in the payload, not the retry key. Exact replay returns original receipt; same key with different canonical payload is a conflict, never an overwrite. Do not regenerate observedAt or input for an ambiguous retry.

Use one database transaction for observation append, latest projection update, cursor advancement and receipt/outbox acknowledgement. Assign sequence under per-stream serialization and unique constraints. Multiple workers may retry delivery; only one durable observation survives. A source capture and frozen prior must be atomically attached to their authoritative launch/command commit. Poll captures read one coherent committed snapshot without invoking engine projection.

WP calculations run outside football execution. Football commits a small outbox capture; calculation or delivery failure leaves durable pending work and stale/blocked WP, without changing football outcomes. This outbox field is a proposed authoritative-contract extension and must be agreed with the other thread before implementation. If an atomic capture is unavailable, report BLOCKED rather than relying on an ephemeral callback after a football save.

Use narrow writer privileges, authenticated/session-authorized read adapters, explicit RLS/grants and no public WP routes. Revoke application UPDATE/DELETE on history, enforce immutability with database controls, and test denial. Hash chaining can detect corruption when compared to retained checkpoints; it does not alone prevent a privileged administrator rewriting the entire chain. Pin a canonical serialization/hash version and retain independent checkpoint evidence. No history cleanup/retention deletion is authorized here.

At 56 active games and five-second sampling: 11.2 periodic observations/second. Two hours yield 80,640 periodic observations; 2h15m yield 90,720, plus special events. At 1–2 KiB per observation this is roughly 89–177 MiB raw payload for the longer case, before indexes, WAL, receipts or replicas. Measure actual row sizes. Never copy the entire ledger into every session snapshot/receipt or return it with every board poll.

Suggested compact summary budget: ≤1 KiB per game, ≤56 KiB raw WP board payload. Include current status/reason, probability, prior/model IDs, favorite identity, source revision/cursor, observation cursor/time, gap indicator and calibration status. Retrieve detailed immutable history separately in bounded pages (default 100, maximum 250), with a captured high-watermark. Derived chart downsampling never edits source points.

## 7. Delivery, recovery and UI

Start with authenticated bounded summary polling at five seconds, matching the backend capture cadence. Browser reads are strictly observational. A later private notification channel may signal changed cursors; it is not the source of truth. Require an independent backend sampler even with zero browsers open. Do not claim cron availability or a five-second SLA until tested on isolated infrastructure.

Return source and observation versions together. A client ignores duplicate/older projection revisions, replaces state on run change, clears current numbers on BLOCKED, and never joins pages from different run/model/high-watermark identities. Reconnect from the last acknowledged observationSequence, reconcile durable rows, then refresh summary. If a cursor is invalid/expired, reset to a validated snapshot rather than silently merging histories. Recheck authorization for every request; never copy client-supplied roles/session grants into trusted identity.

On worker restart, replay original unacknowledged captures with original timestamps and identities. A crash after append but before acknowledgement is an exact retry. Recover wp_latest from the journal. Validate ordering, hashes, run binding and correction evidence. Missing capture intervals remain gaps; persisted events delayed in delivery are replayed as original captures with capturedAt distinct from persistedAt. Missing/corrupt durable rows produce BLOCKED/HISTORY_INTEGRITY_FAILURE and an alert, not an invented repair.

UI: fixed pregame favorite identity; fraction 0..1 formatted as percent; no favorite switching as live probability crosses 50%. Show “Illustrative estimate — calibration deferred,” model version and last-observed time. Show pregame value before launch. BLOCKED is grey #808080, explicit reason, no current numeric estimate; old points remain audit history, visually grey when blocked. Do not smooth across gaps, corrections, run changes or OT. Tooltip reads scores from stored model input, as corrected in the prototype. Display terminal outcome separately from official acceptance. Background #ECECEC; remaining brand colors/layout belong to the approved design artifact. Suggested freshness display: STALE after 15 seconds without expected observation, distinct from a model/correction BLOCKED status; terminal states exempt. This threshold is proposed.

The current public scoreboard receives no detailed WP feature under GC-STATS-1. Public access is a separate product/contract decision, not implied by the prototype endpoint.

## 8. Test preservation and realistic load gates

Preserve all 62 prototype tests at cd26ed23 and record exact test-file hashes. Run them in a separate pinned worktree; never overwrite 5.1.0's protected tests/v506. Initial local reconstruction lacked older comparison modules; the first run failed for missing files. After retrieving those exact dependencies, the unchanged full suite passed 62/62. The 5.1.0 foundation independently passed 24/24 at f0eb2a5. These are local author results only.

Added scripts/test-v510-wp-load.mjs exercises a complete 56-game board at 1x/4x/10x/20x/50x using virtual five-second sweeps, pure WP calculation, board serialization, four parallel authorized detailed reads, read-purity checks and full football-state comparison across speeds. Seven-point priors are QA fixtures. It does not exercise SQL, network, cloud workers, real wall-clock pacing or concurrent writers; its timing is local CPU/workload evidence, not capacity certification. Result: PASS for all 280 local game runs, 122,652 WP calculations/observations and 9,172 authorized detailed reads. Maximum per-speed p95 sweep time was 61.60 ms on this host. All 56 games finished at every speed; full football states matched across speeds. See evidence/wp-local-56-game-load.json. These sample observations are test output, not a persisted production journal.

Required isolated end-to-end scenarios, still NOT TESTED:

| ID | Scenario | Required evidence |
|---|---|---|
| L01 | 56 games simultaneously active, no browsers | Backend alone produces five-second captures; no dependence on viewers. |
| L02 | 56 games at 1x for at least 2h15m, plus longer natural finals | CPU, RSS, DB size, WAL, row/receipt growth, p50/p95/p99 latency, no growing snapshot history. |
| L03 | 56 games at each supported speed 1/4/10/20/50 | Identical football histories and RNG for matched inputs; WP histories may differ in sample count because Master Zulu is real time. |
| L04 | 1 Chairman board + 4 simultaneous detail tabs + 100 public scoreboard clients | Authenticated WP throughput, public isolation, unchanged engine timing; all traffic uses test routes/storage. |
| L05 | Two sampler workers race the same 56 slots | Unique rows, no conflicting latest projection, no silent payload replacement. |
| L06 | 10% retry traffic and lost acknowledgements | Exactly-once durable identity with at-least-once delivery; original receipts preserved. |
| L07 | Worker death before append / after append / before ack | Replay original captures, no missing committed special event, no duplicated point. |
| L08 | 90-second capture outage; separate 90-second delivery outage | Capture outage has visible gaps; delivery outage replays original captures without pretending new timestamps. |
| L09 | DB latency 250ms/1s/3s and temporary unavailability | Bounded queues and retries; no football rerolls or hidden journal loss; recover or explicitly block. |
| L10 | Launch/prior-update/weather-update and edit/cancel/override races | Single frozen prior; stale configuration rejected for WP; saved override remains sticky across restart/continuation. |
| L11 | Forced same-slot kickoff/first-gameplay/final/override and OT | Mandatory records survive dedup; unsupported OT is null; terminal outcome never clears an override. |
| L12 | Reconnect, out-of-order/duplicate pages, role revocation, mobile background/resume | Cursor correctness, no mixed run/versions, unauthorized denial before details, clear stale/blocked UI. |

Proposed operating budgets for review: local/worker 56-game capture batch p95 <1s and p99 <2.5s; no overlapping normal five-second sweeps; summary API p95 <500ms and p99 <1s in the test region; observed-state age p95 ≤7s and p99 ≤10s under nominal load; zero lost mandatory events, duplicates, rewritten rows or unauthorized reads. Quantify engine slowdown with WP enabled/disabled; target ≤5% added scheduler duration at p95 without changed football histories. These are test targets, not measurements or existing guarantees.

Extend inherited tests with session/game-wide block persistence across same/new-seed restarts; pregame context/model/launch race; unauthorized Chairman/API access; database immutability; outbox/summary atomicity; zero-viewer sampler; real five-second pacing; 56-game concurrency; fixture poisoning with getters that throw on pending/RNG fields; current summary byte caps; paginated recovery; and final/OT/correction precedence. Retain all five corrected behaviors and all ten terminal/active cancellation combinations.

## 9. Findings and implementation order

| Severity / finding | Observed behavior → evidence → cause → impact → test → proposed action → approval |
|---|---|
| P1: incompatible prototype integration | Public probability handler and g.winProbability.records → prototype security/history/store source → older candidate boundary → violates Chairman-only access and bounded snapshots → unauthorized access + growing-history load tests → selective adapter/journal port → contract approval before implementation. |
| P1: correction scope differs | Prototype finds sticky block within run; GC-STATS-1 requires session/game history through restarts → history.mjs vs access.mjs → differing scopes → restart may appear unblocked if copied unchanged → restart/continuation tests with prior correction → consume complete authoritative audit → existing GC-STATS-1 requirement, no separate relaxation. |
| P2: late-game completeness | Formula ignores down/distance/TO and has no nonterminal OT estimator → illustrative-wp.mjs → intentionally limited model → cannot claim logical endgame certainty → boundary/coverage fixtures → retain disclosure for test version; model upgrade separate → Chairman decision for new math. |
| P1: durability not implemented | No v510 schema/functions; pure service has no production adapter → read-only cloud inventory and service source → foundation-only milestone → real recovery/load cannot pass yet → isolated database/worker tests → shared outbox+journal implementation → contract approval then isolated work; production authorization separate. |

Order after contract/model approval: (1) verify moving 5.1.0 head and agree D1 extension; (2) preserve upstream tests and build trusted input adapter; (3) prior/run binding and append-only storage in isolated environment; (4) command outbox and independent sampler; (5) compact query/recovery integration; (6) Chairman UI; (7) L01–L12 and regressions; (8) candidate review. No ratings, HFA, football probabilities, event timings, scheduler behavior of 5.0.6 or official results change.

## 10. Release status and decisions

| Gate | 5.1.0 integrated WP status |
|---|---|
| Engine/state integrity | NOT TESTED as integrated feature; foundation/prototype local evidence only |
| Fixed-seed regression | NOT TESTED as integrated feature |
| Multi-seed distributions | NOT TESTED as integrated feature; inherited prototype suite includes 560 runs |
| Full-board checks | Local 56-game workload reported separately; cloud full-board load NOT TESTED |
| Poll/chunk invariance | NOT TESTED as integrated feature; preserve inherited tests |
| 1x vs 50x invariance | Local workload evidence separately; cloud integration NOT TESTED |
| Backend persistence/versioning | NOT TESTED; v510 schema absent |
| Chairman console integration | NOT TESTED |
| Public scoreboard integration | NOT TESTED for compatibility/isolation; public WP excluded by current contract |
| Mobile Safari | NOT TESTED |
| Existing-session compatibility | NOT TESTED; do not migrate existing 5.0.6 sessions |
| Chairman approval | NOT TESTED / pending model and contract decision |

Recommendation: DO NOT APPROVE PRODUCTION. This assignment prepares a contract and test evidence; it does not port runtime code or certify a release.

Chairman decision requested: approve the unchanged margin-derived model for the first test version (recommended), or select direct ensemble win percentage and commission a separately versioned prior/live transition model. Also approve D1's authoritative capture/outbox and missing-prior launch policy before integration. All further implementation must re-read the current shared branch head and explicitly reconcile any contract changes from the broader thread.

Rollback at this stage: leave this isolated review branch/PR unmerged. No production restoration is needed. Do not merge or deploy without the applicable authorization.
