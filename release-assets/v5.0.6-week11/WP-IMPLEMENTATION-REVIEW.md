# Win-probability history — v5.0.6 candidate

Status: **local implementation and smoke test; NOT APPROVED FOR PRODUCTION**.
Chairman authorized the four P1 corrections, kickoff/poll observation behavior,
grey BLOCKED behavior following overrides, and smoke-test design. No production,
official-result, ratings, or football-calibration changes were made.

## Baseline and scope

Working branch: `development/gamecast-v5.0.6`; parent remote commit
`69904c943888165ca47ccc21f6555b02ceeced36`. The earlier local parent has the same
tree as that remote commit. Underlying engine baseline:
`release/gamecast-v5.0.5`, `9d13c58548072f4e8ba9cd8f8c9ebcb5cd0f4bd8`.
Previously inspected deployed v505 public-function source matched all 14 returned
files; this is not current database/health certification.

Fully read procedures: GAMECAST_MASTER_ROUTER, 02_FORENSIC_DEFECT_REPAIR,
04_MATH_PROBABILITY_ENGINE, 05_INTEGRATED_UI_ENGINE_FEATURE. The Week 11 data
milestone also applied procedure 01. Mathematical behavior changes beyond the
supplied illustrative formula still require Chairman approval.

The uploaded `GameCast_Favorite_WP_Implementation_Package.zip` supplied the
formula and chart. Its 17 manifest entries matched and its 13 original tests
passed during intake. The candidate keeps the equations and all 14 worked
percentages. It replaces the package's in-memory append routine and adds input
validation for terminal states. `GC-WP-ILLUSTRATIVE-0.1.0` identifies the unchanged
equations; `GC-WP-HISTORY-1` identifies the new storage/observation contract.

## Four authorized P1 findings

| Finding | Observed behavior and root cause | Impact | Implemented correction and acceptance evidence | Authorization |
|---|---|---|---|---|
| P1-1: session identity | Original key omitted session; run IDs repeat between sessions. | Independent sessions can collide. | Key includes session, engine, game, run, model and event identity. Session-isolation and cross-session rejection tests pass locally. | Implemented within approval; cloud activation pending. |
| P1-2: revised duplicate kickoff | Original key included revision, permitting another copy of the same kickoff. | Multiple contradictory kickoff points. | Event identity excludes revision; exact retries are no-ops; changed revision/content conflicts; a second kickoff is rejected. Tests pass. | Implemented within approval. |
| P1-3: recovery/continuation | Original array append rejected late delivery and had no durable adapter. | Lost/reordered delivery or continuation could corrupt history. | Snapshot and identical audit observations use the existing commit transaction contract. Hash-linked records recover from original events delivered in any order; missing/conflicting events fail explicitly. Old points survive overrides and continuation. Disk-backed API and fresh-process recovery pass. Actual Postgres durability remains NOT TESTED. | Candidate implementation authorized; cloud setup not performed. |
| P1-4: mixed model history | Original append compared matchup/margin but did not enforce model identity. | A chart could silently mix calculations. | Model, session/engine/game identity, kickoff prior and monotonic source revision are enforced; model swaps require a separate history contract, not silent mixing. Rejection tests pass. | Implemented within approval. |

## Observation contract

1. An authenticated Chairman `wp_pregame` command supplies a validated prior while
   the game is UNLAUNCHED. A later pregame update appends another record rather
   than rewriting the earlier one. Weather, quarter-length or other relevant
   context changes require a refreshed matching prior.
2. Launch appends a kickoff observation equal to that pregame probability;
   possession field value is deliberately zero at kickoff. The favorite, prior,
   source provenance and model are frozen for the run.
3. Proposed central backend cadence: **5 seconds of Master Zulu time**. The first
   successful backend update in each UTC five-second slot appends one sample.
   Browser polling is read-only and never advances football or creates samples.
   A configured five-second cloud scheduler is still required; it is not deployed.
4. First observed resolved gameplay and football final append immediately within
   that backend update, even in an already sampled slot. At 50x, several plays can
   finish between updates. This is sampled history, not a claim to preserve every
   intermediate play state. No pending play result or live RNG is inspected.
5. Each point stores observed UTC, source state revision, period/scoreboard clock,
   GL, resolved-play count, model input/trace, source prior, and available
   down/distance/timeouts/activity context. A missed interval is reported;
   missing observations are never invented or interpolated as facts.
6. Score, clock correction, saved Chairman Edit, manual Final and reopen-live
   append **BLOCKED / null / grey**. Later observations in the affected run remain
   blocked, including its saved-edit continuation. Prior points remain unchanged.
   There is no automatic unblocking command. A separate restarted run can receive
   a new pregame prior; the previous run remains preserved.
7. Opening Edit temporarily blocks; cancelling a live Edit resumes estimation.
   Pause and Delay alone do not constitute a football override. GL may advance
   while an unchanged football state retains the same probability.
8. Existing already-active sessions lacking a kickoff observation are not given a
   fabricated retrospective kickoff. Missing history/source inputs are BLOCKED.
9. Football-terminal outcomes produce 0 or 1 only when not Chairman-blocked.
   Nonterminal OT is explicitly BLOCKED because the package has no OT estimator.
   Final here does not accept or publish an official result.

Equal football states yield equal probabilities. Sampling density may differ by
speed or wall-time cadence; it must not change the underlying football history.
The model is an estimate, not a proof of mathematical elimination.

## Inputs and smoke-test flags

| Input | Required for | Local smoke status | Actual release status |
|---|---|---|---|
| Release/session/game/run/model identity | Isolation, recovery and lineage | PASS | W11 candidate identity present; cloud untested |
| Canonical away/home team IDs | Fixed favorite/opponent mapping | PASS | 56 games / 112 scheduled teams present |
| Approved 121 TEAM/OFF/DEF triples | Recommended offline prior source | Baseline validation PASS | R2 supplied; no ratings changed |
| Expected pregame margin and fixed favorite | Current illustrative formula | PASS with explicit 7- then 3-point QA inputs | **BLOCKED: actual 56-game priors not generated/approved** |
| Source kind, ID, creation time, trial count, context hash | Provenance and frozen configuration | PASS; missing/mismatched sources rejected | **BLOCKED: approved ensemble artifact absent** |
| Engine/data version, quarter length, venue designation, weather | Bind prior to actual game configuration | PASS | Prior must be regenerated when relevant settings change |
| Committed scores, period, scoreboard seconds | Live calculation | PASS | Engine supplies; cloud observer untested |
| Possession and offense-relative yards to goal | Live field contribution | PASS | Engine supplies; null possession is explicit |
| Down/distance and remaining timeouts | Future late-game feasibility model | Captured as context | **BLOCKED: current formula does not use these** |
| Clock-running, activity, breaks, pause/delay/edit | Explain observed state / future model | Captured; pause/edit smoke PASS | Full late-game decision model not implemented |
| State revision and timestamp | Immutable sampling order | PASS | Central five-second scheduler NOT DEPLOYED |
| Override command and continuation lineage | Immediate BLOCKED state | All five override types PASS | Chairman screen integration NOT TESTED |
| OT rules and estimator | Nonterminal overtime probability | BLOCKED branch PASS | **BLOCKED: estimator absent** |
| Persisted snapshots plus observation journal | Atomicity/recovery | Disk-backed API + separate-process recovery PASS | Real database roles/transactions/retention NOT TESTED |
| Held-out outcomes and calibration report | Trustworthy numeric estimates | NOT TESTED | **BLOCKED: calibration deferred** |

QA prior values are explicitly fixtures, not forecasts for Buffalo/Middle
Tennessee or any other Week 11 game. A production game rejects QA_FIXTURE sources.
The API does not accept a betting source kind. Provenance labels are validated
metadata, not proof that the supplied ensemble was independently certified.

## Smoke execution and evidence

Run from repository root:

```sh
python scripts/prepare-v506-local.py
node --test --test-reporter=tap tests/v506/*.test.mjs
```

The probability suite adds 17 tests: 16 model/history/control tests and one API
smoke scenario. The API scenario exercises two pregame updates, launch equality,
duplicate replay, late-prior rejection, gameplay update, repeated public reads,
runtime restart, separate Node-process recovery, failed-save atomicity, retry,
Chairman score override, grey response, journal reconstruction, origin rejection,
unknown-game rejection and private-input exclusion.

The full candidate suite has **48 tests**. Evidence is in
`evidence/v506-wp-tests.tap`. The original 560-run diagnostic population remains
covered. Observer isolation additionally compares all 56 matchups at both 1x and
50x (112 comparisons) against observer-disabled progression, including full
football state, seeded history and final score. No probability result enters
football generation. The runtime wrapper removes analytics before invoking the
engine, then appends observations after it returns.

The tests use an atomic disk-backed RPC fixture; they do not establish Supabase
transaction isolation, RLS, remote recovery or cloud capacity. The SVG renderer
has grey BLOCKED rendering and gap tests; it is not mounted in a finished UI.

## Recommended probability sources and next model decision

**Pregame recommendation:** isolated QA simulation ensembles using the unchanged
approved GameCast engine, R2 TEAM/OFF/DEF inputs, approved home/neutral behavior,
quarter length and actual configured weather. Use independent reproducible
analytics seeds, never the target live seed. Freeze the engine/data/configuration
hashes and trial manifest. Start with 10,000 trials per matchup for validation:
at a true 50% probability, ordinary binomial sampling alone gives approximately
±1 percentage point at 95% confidence. This does not quantify model error.

Record both the ensemble win fraction and mean signed margin. The supplied model
currently needs a nonnegative expected margin for a fixed favorite and transforms
it by `sigmoid(0.14 * margin)` at kickoff. **That number is not necessarily the
ensemble win fraction.** Using the win fraction directly or refitting the
coefficient is a mathematical change needing review and approval. Do not infer a
margin by subtracting TEAM ratings or add HFA twice. Equal-strength/tie selection
needs an explicit stable favorite convention if an ensemble produces no favorite.

**Live recommendation:** a separately versioned observer trained/validated on
independent synthetic state-to-outcome trials. Condition on score difference,
period/remaining scoreboard time, possession, field position, down/distance,
timeouts, clock-running and relevant rules/activity. Include OT explicitly.
For rollout-based estimates, start from an allowlisted resolved-state checkpoint
and fresh analytics RNG, not a clone containing the live seed or queued play.
Split training and evaluation by game/run. Check calibration by time remaining,
score band and favorite strength, with Brier/log-loss and reliability summaries.

Historical *completed* synthetic games can support held-out calibration with
explicit QA/official provenance. They must never be used to look up the ending
of the game currently being estimated. Current records, poll ranks and broadcast
carriage are display data unless separately approved as model features.

No fixed winner, target final score, betting line, wagering information or known
future play/ending is a gameplay input. Observer failure or BLOCKED status does
not modify football decisions. Storage/CAS failures still reject a transaction
normally; this is persistence integrity, not football retuning.

**Model readiness remains BLOCKED.** The existing formula reacts to score, time,
possession and field position, but does not model all observed successes/failures,
down/distance, timeouts, legal late-game opportunities or OT. Implementing that
larger estimator without an approved specification would silently change the
mathematical model. This candidate fixes history and tests integration; it does
not certify the formula as a complete live win-probability engine.

## Storage and deployment boundary

No separate container or separate database is necessary for the arithmetic.
Use the existing backend for calculation and existing Postgres for durable
history. Production recommendation: append-only observation rows with unique
event identity and source revision, per-session authorization, an immutable
prior manifest, indexed/paginated history reads and transactional writes with
the authoritative update (or a durable transactional outbox).

The **local candidate stores the complete ledger in each game's persisted
snapshot and duplicates newly appended points into the existing audit event
transaction**. That makes recovery testable without a fabricated database API.
It is not the recommended full-board cloud storage layout: five-second sampling
over 2–2.25 hours yields about 1,440–1,620 ordinary samples per game, or
80,640–90,720 for 56 simultaneous games, before kickoff/control/final records.
Repeatedly saving that entire growing ledger can materially increase payload,
hashing and memory costs. Normalize the journal and bound the live snapshot
before cloud release; benchmark retention, retries and full-board throughput.
Database immutability privileges and backup/recovery must also be verified.

The new `GET ?api=probability&session=...&game=...` endpoint reads saved history
for the current run; it does not recompute. Generic board responses exclude the
ledger. The original detailed-stats endpoint still reports its WP field as
unavailable; the final UI must use the dedicated probability endpoint.

## Release gates

| Gate | Status | Scope |
|---|---|---|
| Engine/state integrity | PASS | Local tests; observer detached from engine inputs |
| Fixed-seed regression | PASS | Local candidate |
| Multi-seed distribution | PASS | Existing 560-run diagnostic; WP calibration NOT TESTED |
| Full-board checks | PASS | Local engine checks; sustained WP journal cloud load NOT TESTED |
| Poll/chunk invariance | PASS | Football state and read purity locally |
| 1x vs 50x invariance | PASS | Observer-on/off comparisons for all 56 matchups |
| Backend persistence/versioning | NOT TESTED | Local fixture passes; real candidate database absent |
| Chairman Console integration | NOT TESTED | Command contract tested, screen not connected |
| Public Scoreboard integration | NOT TESTED | API/SVG tests pass; live screen not connected |
| Mobile Safari | NOT TESTED | No deployed candidate UI |
| Existing-session compatibility | NOT TESTED | Old namespaces rejected locally; live regression absent |
| Chairman release approval | NOT TESTED | Current authority is development/testing only |

Rollback: leave this development branch unused or revert this isolated candidate
change. Production, prior releases, official results, G0495 Miami's corrected win,
ratings and schedule were not altered. No production restoration is required.

Recommendation: **DO NOT APPROVE production release yet.** Approve the isolated
history work for continued development; complete model specification/calibration,
normalized cloud persistence, scheduler activation, both UI integrations and
remaining release gates before presenting the final release.
