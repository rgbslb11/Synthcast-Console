# Opening coin toss and halftime choices — design candidate

Date: 2026-09-23. Branch: `4.3.2.SB`. Status: DESIGN ONLY / NOT APPROVED FOR IMPLEMENTATION.

This candidate expands item 5 (seeded opening receiver) in the seven-item enhancement list. It does not authorize changes to runtime probabilities, football mechanics, release numbers, existing sessions, accepted results, production, ratings, standings or SEUD. The overtime toss and the corrected OT3+ ending condition remain separate and unchanged.

## 1. Decision memo

### Evidence and inspected implementation

Inspected source commit: `206ee69eb1d2624305a924298d15b465add3229e`.

- `sandbox/receiver.mjs`: RECEIVER1 derives one receiver bit from SHA-256(seed, game ID), starts possession with that receiver and assigns the opposite receiver at Q3. There is no opening toss winner, deferral decision, team option sequence or defended-goal state.
- `sandbox/runtime.mjs`: applies RECEIVER1 to the hash-pinned baseline; local nonofficial namespaces, optimistic state versions, private-seed redaction and publication/acceptance restrictions remain in place.
- Generated `supabase/functions/gamecast-week4-v4-3-1/index.ts`: initialGame, advancePeriod, reset, continuation, archive and publicGame. Reset changes runId even for same-seed restarts; continuation changes the football seed. The proposed choice history therefore cannot depend on the current mutable runId/football seed alone.
- `sandbox/test-receiver.mjs`: existing tests cover reciprocal receipt, restart, continuation, poll/chunk and speed behavior. These are evidence of RECEIVER1 only; they do not prove the candidate below.
- Generated `public/v4.3.1/app.js` and `sandbox/build-ui.mjs`: current possession rendering represents football possession, not an independent kickoff designation. A future kickoff recipient label must not reuse the possession dot.

Rules source: [2026 NCAA Football Rule 3-1-1](https://ncaaorg.s3.amazonaws.com/championships/sports/football/rules/PRMFB_RulesBook.pdf), printed FR-51, paragraphs (d)–(j). Rule 3-1-2 on FR-52 governs goal changes between Q1/Q2 and Q3/Q4. Download inspected in this session; SHA256 `2a9e63b038b6efc70ad846487f33fdda175993c2229c911c3e06291ec74a9dd5`.

The rule allows the toss winner to designate the kicking team, choose the goal their team defends, or defer first choice to halftime. After a defer, the opponent chooses one of the two remaining types and the winner chooses the other. Without a defer, the winner chooses one type and the opponent the other. At halftime, first choice belongs to the original loser unless the winner deferred. No new halftime toss occurs.

### Evidence decision record

| ID | Input | Interpretation and status |
|---|---|---|
| E1 | 2024: 35 deferrals / 41 distinct selected FBS-versus-FBS games = 85.3659% | Chairman-supplied audit summary involving Texas, Oregon and Boise State. Oregon–Boise State counted once; FCS excluded, as reported. Raw game register and official page extracts not supplied here: independent verification BLOCKED. |
| E2 | 2025: 35 / 40 = 87.5% | Same reported selection frame; independent game-level verification BLOCKED. |
| E3 | Pooled arithmetic: 70 / 81 = 86.4198% | Calculated from E1/E2. Selected samples, repeated programs, different seasons. Not an FBS-wide estimate and not 81 independent samples of team strategy. |
| E4 | Earlier 60% toss-winner opening-kickoff assumption | **CANCELED by Chairman, 2026-09-23.** Historical record only. Excluded from active assumptions, alternatives, calibration, sensitivity tests and pending approvals. |
| E5 | Current RECEIVER1: nominal 50/50 opening receiver with reciprocal halftime receiver | Actual inspected code. This is an unconditional receiver selection, not a 50% deferral rate. |

Recommendation: propose **p(defer) = 0.85**, a rounded experimental value near E1/E2, explicitly labeled selected-sample-informed. E4 has been canceled by the Chairman and has no role in this recommendation. Neither 85%, 86.4% nor 87.5% becomes a canonical population rate through this memo.

For initial future sandbox automation, propose a clearly labeled **common-sequence profile**: defer 85%; otherwise select receipt by designating the opponent as kicker. When given first kickoff choice after an opponent's defer, choose receipt. At halftime the first chooser also chooses receipt. This conditional profile is a simplifying design assumption; E1/E2 only measure deferral, not these conditional choices. It requires Chairman approval separately.

Under that profile, the toss winner kicks first about 85% of games and receives first about 15%. With a fair toss and identical choice policy for both teams, each team still receives the opening kickoff about 50% of the time. These are different probabilities. No exact finite-sample quota is imposed. New decision semantics may change individual fixed-seed trajectories relative to RECEIVER1 even when aggregate receipt remains balanced; no compatibility promise is made across model versions.

## 2. Choice-resolution table

Let W be the toss winner and L the loser. The visitor calls the opening coin; propose a fixed recorded call of HEADS and a seeded fair outcome, without a separate random draw for the call. Defer is available only to W at the opening toss, not at halftime or as a second choice.

| Opening decision | First substantive chooser, half 1 | Second chooser, half 1 | First chooser, half 2 | Second chooser, half 2 |
|---|---|---|---|---|
| W defers | L | W | W | L |
| W does not defer | W | L | L | W |

The following resolver applies independently in both halves. A is that half's first chooser; B is the other team. E and W are abstract fixed physical field ends, not team-relative OWN/OPP labels; they need not mean compass east/west. `g` can be either end; `opposite(g)` is the other.

| First substantive choice by A | Remaining choice by B | Kicking team | Receiving team | Goal assignment |
|---|---|---|---|---|
| Designate A to kick | B chooses goal g to defend | A | B | B defends g; A opposite(g) |
| Designate B to kick (A receives) | B chooses goal g to defend | B | A | B defends g; A opposite(g) |
| A chooses goal g to defend | B designates A to kick (B receives) | A | B | A defends g; B opposite(g) |
| A chooses goal g to defend | B designates B to kick | B | A | A defends g; B opposite(g) |

Each row supports either goal. Once kickoff is designated, only goal selection remains; once the goal is selected, only kickoff designation remains. Teams cannot both select the same option category. A designation of SELF or OPPONENT as kicker is resolved to a stable team ID before committing.

### Ordinary and unusual sequences

| Case | Opening choices | Halftime choices | Result |
|---|---|---|---|
| Ordinary defer | W defers; L receives; W selects goal | W receives; L selects goal | L receives half 1; W receives half 2 |
| Ordinary receive | W receives; L selects goal | L receives; W selects goal | W receives half 1; L receives half 2 |
| Kick is not defer | W chooses itself to kick; L selects goal | L chooses receipt; W selects goal | L legally receives both halves |
| Goal first | W chooses a goal; L chooses receipt | L chooses receipt; W selects goal | L can legally receive both halves |
| Defer does not guarantee receipt | W defers; L receives; W selects goal | W chooses goal; L chooses receipt | L receives both halves even though W deferred |
| Unusual answering kickoff choice | W defers; L designates itself to kick; W selects goal | W receives; L selects goal | W receives both halves |

Wind or field preference may explain a goal choice, but the resolver needs no weather effect. Legal goal-first and voluntary-kick branches remain available to scripted fixtures and explicit Chairman selections. No unsupported automatic frequency is assigned to them. Goal selection as the remaining option still occurs in every fully resolved half; that is not the same as making wind the first-choice strategy.

## 3. Authoritative state schema and history

Proposed schema contract, not implemented types. Team is a stable away/home team ID; End is `END_A | END_B`. Unknown values are null with explicit status, never guessed. All objects carry game/run lineage and a revision.

```typescript
type Choice = {
  sequence: number;
  teamId: string;
  kind: 'DEFER' | 'DESIGNATE_KICKER' | 'DEFEND_GOAL';
  kickingTeamId?: string; // required only for DESIGNATE_KICKER
  defendedEnd?: 'END_A' | 'END_B'; // only for DEFEND_GOAL
  source: 'MODEL' | 'CHAIRMAN' | 'REPLAY';
  reason?: string; // optional operator explanation, no comment requirement
  decisionKey: string;
};
type HalfOptions = {
  half: 1 | 2;
  status: 'PENDING' | 'CHOOSING' | 'RESOLVED' | 'KICKOFF_RESOLVED';
  firstChooserTeamId: string;
  choices: Choice[]; // exactly two substantive choices when RESOLVED
  kickingTeamId: string | null;
  receivingTeamId: string | null;
  defendedEnds: Record<string, 'END_A' | 'END_B'> | null;
  kickoffOutcome: {
    eventId: string;
    possessionAfterKickoffTeamId: string | null;
    source: 'SIMULATED' | 'CHAIRMAN' | 'ASSUMED_HANDOFF';
  } | null;
  firstOffensiveSnap: { eventId: string; teamId: string } | null;
};
type OpeningDecisionReceipt = {
  schemaVersion: string;
  rulesVersion: string;
  modelVersion: string;
  parameterSnapshotHash: string;
  sourceCommit: string;
  gameId: string;
  activeRunId: string;
  originRunId: string; // stable across same-seed replay lineage
  decisionLineageId: string;
  privateDecisionSeedRef: string;
  receiptId: string;
  revision: number;
  supersedesReceiptId: string | null;
  replayOfReceiptId: string | null;
  qaOnly: true;
  official: false;
  toss: {
    callerTeamId: string;
    call: 'HEADS' | 'TAILS';
    result: 'HEADS' | 'TAILS';
    winnerTeamId: string;
    loserTeamId: string;
    deferred: boolean;
  };
  openingDecision: Choice; // DEFER or first substantive half-1 choice
  halves: [HalfOptions, HalfOptions];
  effectiveEventSequence: number;
};
```

When openingDecision is substantive, it references the same decisionKey as half 1's first choice; it is not a second applied event. Persist the frozen parameter values beside their hash in private session metadata, not just a hash with no recoverable configuration. Current defended ends by quarter are derived from the applicable half assignment: swap Q1->Q2 and Q3->Q4; resolve fresh half-2 options rather than blindly copying Q2 orientation. Keep relative field position unchanged when switching physical ends.

Invariants: exactly two distinct teams; kicker differs from receiver; defended ends are opposite; one kickoff designation and one goal designation per resolved half; halftime priority follows the original defer decision; no new halftime toss. First offensive snap may differ from kickoff recipient (for example, a kicking-team recovery). A kickoff return touchdown need not produce an offensive snap for the receiving team. Leave that snap null until an actual qualifying play occurs.

### Deterministic decision sequence

Propose one ordered, domain-separated sequence keyed by game ID, stable original seed/decision lineage and model version. Persist originRunId and bind the resulting receipt to every activeRunId. Derive labeled subdraws such as `OPENING_TOSS`, `OPENING_OPTION`, `HALF1_GOAL`, `HALF2_OPTION` and `HALF2_GOAL` from that root. The root belongs to this opening/halftime decision process only: no calls into regulation play RNG or overtime toss RNG.

Pin the parameter snapshot at game creation. Commit toss and opening choices once, before first-half kickoff. Commit halftime choices only at the existing halftime-to-Q3 boundary. Deterministic labels prevent skipped branches from shifting later draws. Reading/rendering never draws or independently resolves choices. Existing authoritative projection may cross the boundary on a read, but elapsed-time projection commits the same decision keys once regardless of poll size. Use expected state version, idempotent event IDs and atomic local state/event persistence; cloud support must be verified separately.

On halftime exit: verify original receipt -> determine first chooser -> apply choices in order -> validate kicker/receiver/goals -> commit receipt/events -> initialize kickoff handoff -> permit Q3 play. No duplicate execution after reload. If state/choice is invalid, retain halftime, show BLOCKED and require resolution; no guessed receiver. GL continues through a hold, scoreboard remains stopped, Master Zulu remains wall time. This design adds no pregame duration, break duration, kickoff timing or clock retune.

The current engine has no full kickoff simulation in this receiver adapter. Recommended first implementation boundary: keep its existing handoff behavior, explicitly record `ASSUMED_HANDOFF`, and populate firstOffensiveSnap only when the first ordinary play begins. Return/onside outcomes are separate future scope; legal distinction tests can inject resolved kickoff fixtures without inventing return probabilities. Chairman must approve this boundary before implementation.

### Events, corrections and restarts

Append events: OPENING_TOSS_RESOLVED, OPTION_SELECTED, HALF_KICKOFF_ASSIGNED, KICKOFF_OUTCOME_RECORDED, FIRST_OFFENSIVE_SNAP_RECORDED, OPTIONS_CORRECTED and DECISION_RECEIPT_REUSED. Include event ID, decision key, game ID, origin/active run IDs, revision, half, actor/source, effective state version, Master Zulu, GL and before/after receipt references. Original events remain immutable; snapshots reference one effective revision.

- Pregame correction: validate legal choice order and recompute only its dependent assignments, append successor receipt. Changing defer can change halftime priority; a kickoff-only correction cannot silently change defer.
- Correction of future halftime choices: allow only before that kickoff under an authorized Chairman command; validate priority and both option categories. Stage/save/cancel must preserve current edit semantics and clocks.
- After an affected kickoff/play: do not retroactively rewrite the toss to explain current possession. A possession edit is a football correction, not a toss edit. A historical option correction would require an explicit successor/checkpoint policy and separate approval; recommended initial support is BLOCKED after the affected kickoff.
- Same-seed restart: new activeRunId, same original decision root/seed and pinned model/parameters; copy/reference the effective receipt and approved choice inputs. Replay identical choices without generating a new toss. Preserve archived receipts and distinguish original versus corrected revisions. Audit timestamps/run IDs may differ; football decisions must not.
- New-seed restart: archive old receipt, create a new decision lineage and receipt. A new seed may happen to produce the same choices; do not force a change.
- Football continuation: keep the opening/halftime decision root even when continuation changes the football seed. Replay of later manual inputs requires those same inputs and their effective boundaries, not the seed alone.
- No receipt on an older session: do not fabricate a historical toss winner from its receiver. Retain RECEIVER1 semantics and show toss history Unavailable. Candidate applies only to new explicitly selected sandbox sessions unless a migration is separately approved.

### UI contract

Chairman Open Game: show toss winner, defer/other choice, ordered team choices, opening kicker/receiver, both defended goals, halftime first-choice entitlement and resolved half-2 assignments. Before halftime selection, show entitlement and Pending, not a promised receiver. Label manual corrections and assumed handoff; show any blocked choice. Main card may show a short receipt summary without adding detailed team statistics.

Public Open Game: optional short factual summary: “A won toss and deferred; B receives opening kickoff.” At halftime show the resolved second-half receiver, not an inferred guarantee. Do not expose decision seeds, unpublished choices, internal parameters or private correction metadata. Keep the current possession dot tied to actual football possession; a separate kickoff label shows designation. All sandbox views remain explicitly NONOFFICIAL / QA. Browser refresh must preserve Chairman edit focus and unsaved form inputs.

## 4. Proposed probability table with provenance

Every numeric proposal below requires approval; none is a runtime change. Rule-required transitions are deterministic constraints, not sampled probabilities.

| Parameter/event | Proposed value or handling | Supporting sample/provenance | Team adjustment / fallback |
|---|---|---|---|
| Opening toss winner | Away 50%, home 50% | Fair-coin modeling assumption; NCAA specifies visitor call, not a fitted winner rate | No team-strength effect; fixed recorded visitor call proposed |
| Winner defers | 85% provisional | E1 35/41; E2 35/40; rounded design choice, not population estimate | Same rate for both teams; no supported team-specific adjustment |
| Winner does not defer | 15%, complement | Proposed complement of 85%; E1/E2 do not provide full nondefer choice taxonomy | Under proposed common profile, choose receipt; unusual branches require explicit inputs |
| Opponent's response to defer | Receive in 100% of common-profile auto cases | Simplifying conditional policy; supporting response counts BLOCKED | Voluntary kick/goal-first remain legal manual/fixture options; not a universal rule claim |
| Halftime first chooser's choice | Receive in 100% of common-profile auto cases | Simplifying conditional policy; supporting counts BLOCKED | Manual/fixture goal-first or voluntary-kick supported by resolver |
| Goal chosen when that is the remaining option | END_A 50%, END_B 50% provisional neutral orientation | Administrative symmetry assumption; no empirical goal-choice sample | No weather, home, ratings or team-strength effect; explicit goal overrides permitted |
| Goal-first or voluntary-kick automatic strategy | No random rate proposed; outside common-profile auto generator | Legal branches; occurrence evidence BLOCKED | Exercise with fixtures/manual choices; do not describe omission as real-world 0% |
| Current direct receiver selector | Nominal 50/50; unchanged until authorized replacement | E5, inspected RECEIVER1 code | Existing reciprocal halftime assumption continues in current runtime |
| Kickoff recovery / first-snap outcome | No new probability proposed | Data and kickoff simulator calibration BLOCKED | Proposed existing assumed handoff; no unapproved kickoff mechanics |

Uncertainty: selected programs and game selection limit generalization; opponent records, season context and coaching changes are not controlled. Exact game lists, selection method and reported choices need preservation before treating E1/E2 as independently verified. Do not infer a wind preference, team effect or trend from the 2.13-percentage-point difference between the two samples. Future evaluation should compare 0.85 and 70/81 as labeled sensitivity profiles, never silently switch production parameters.

## 5. Test matrix — specified, not executed

All 24 candidate tests are NOT TESTED. Existing RECEIVER1 or OT passes do not transfer to this design. Fixture choices cover branches without pretending their frequencies are calibrated.

| ID | Test | Required result |
|---|---|---|
| T01 | Ordinary defer, each team as winner | Opponent receives opening; winner has first halftime option and receives under common profile |
| T02 | Ordinary choose-receive, each winner | Winner receives opening; loser receives halftime under common profile |
| T03 | Winner explicitly chooses to kick | Not recorded as defer; loser gets first halftime option; same team may receive both halves |
| T04 | Winner chooses goal first | Opponent chooses kicker; both end orientations and both kicker choices resolve legally |
| T05 | Defer then opponent chooses goal first | Winner chooses kicker; both legal kicker choices resolve; winner keeps halftime priority |
| T06 | Defer then opponent chooses itself to kick | Winner receives opening without changing halftime priority |
| T07 | Halftime first chooser chooses goal | Other team designates kicker; either team may receive; no reciprocity shortcut |
| T08 | Halftime first chooser explicitly kicks | Other team chooses goal; deliberate kicking distinct from defer |
| T09 | Invalid option sequences | Reject defer at halftime/by loser/as second choice; duplicate category, unknown team/end and same goal/kicker/receiver contradictions |
| T10 | Halftime atomicity/idempotence | No fresh toss; no early assignment, double kickoff, duplicate events or Q3 before valid assignments |
| T11 | Goal continuity | Q1/Q2 and Q3/Q4 end swaps; Q3 uses half-2 choice; relative field/down/distance consistent |
| T12 | Recipient differs from first snap | Inject kicking-team recovery; keep original designated receiver while actual possession/snap belong to kicker |
| T13 | Return TD before offensive snap | Preserve kickoff recipient; no invented receiving-team offensive snap |
| T14 | Fixed-seed reproduction | Same seed, root lineage, model, parameters and inputs reproduce all choices/event order; regulation/OT RNG untouched |
| T15 | Same-seed restart with changed activeRunId | Receipt and approved corrections replay; prior history retained; no reroll |
| T16 | New-seed restart and continuation | New seed creates new lineage; continuation preserves original choices/root; no forced opposite outcome |
| T17 | Poll/chunk and repeated reads | 1s/13s/random chunks at equal elapsed time match; repeated zero-time reads make no choices or duplicate events |
| T18 | 1x/50x invariance | Equal simulated elapsed time yields same choices, kickoff assignments and football state |
| T19 | Persistence/failure recovery | Reload before/after each decision and midway through halftime; atomic state/history, stale-version rejection and idempotent retry |
| T20 | Chairman correction lifecycle | Legal prospective edit/save/cancel; dependency recompute; immutable predecessor; post-kick historical edit blocked |
| T21 | Clock semantics | Pause/Edit/Delay/blocked options keep GL running; scoreboard football frozen; Master Zulu unaccelerated; no timing retune |
| T22 | Chairman UI | Correct pending/resolved labels and goals; kickoff label distinct from possession; no refresh focus loss; desktop/mobile Safari |
| T23 | Public UI and privacy | Correct summary and actual possession; no private seed/future choice leak; no assumed halftime guarantee; QA label |
| T24 | Isolation, legacy and distribution | Legacy missing receipt remains Unavailable; no session migration or feeds; selected large-seed sample approaches proposed 50/50 toss and 85/15 choice without enforcing quotas; 55-game board remains coherent |

## 6. Chairman decisions before implementation

These are ten separate open decisions; recommendations are proposals, not presumed approvals.

| ID | Decision | Recommendation / missing evidence |
|---|---|---|
| D01 | Provisional deferral rate | Approve 0.85 for new sandbox sessions only. Raw E1/E2 register remains BLOCKED. E4 cancellation is resolved and requires no further approval. |
| D02 | Nondefer, response-to-defer and halftime conditional strategy | Approve common-profile receive-first assumptions explicitly; no observed conditional counts available. |
| D03 | Automatic frequency of unusual legal branches | Keep fixture/manual only until measured; determine later whether automatic mixing is desired. |
| D04 | Coin call and goal orientation model | Approve fixed visitor HEADS call, fair toss and neutral 50/50 physical ends; no weather effect. |
| D05 | Team differences and future recalibration | No rating/team adjustment; pin policy per run. Require new evidence and approval for future policy versions. |
| D06 | Kickoff simulation boundary | Preserve assumed handoff initially, labeled as such; recovery/return probabilities and full kickoff simulation remain separate BLOCKED scope. |
| D07 | Same-seed and continuation lineage | Use stable original decision root despite new activeRunId/football continuation seed; replay effective approved inputs. |
| D08 | Manual correction cutoffs | Allow valid prospective option corrections; block historical changes after affected kickoff pending checkpoint design. |
| D09 | Chairman/public presentation | Approve Open Game detail, minimal main-card summary, optional public factual summary and Pending halftime entitlement. |
| D10 | Existing-session/version adoption | New opt-in sandbox sessions only; leave legacy receipts and results untouched. Choose model/schema identifier before implementation; no release bump implied. |

No new test pass, deployment, rule-compliance certification or runtime probability approval is claimed by this design memo.
