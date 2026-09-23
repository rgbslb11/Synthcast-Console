> Current narrow amendment (2026-09-23): [OT3 return correction and verification](OT3_RETURN_CORRECTION.md). It replaces the prior immediate-Final rule. Historical approval/status notes below retain their original dates.

# Consolidated GameCast rulings and smoke-test specification

Latest Chairman rulings: timeout pools and offsetting replay are now approved as recorded in [OT_PROBABILITY_DRAFT.md](OT_PROBABILITY_DRAFT.md). They supersede provisional language below. The probability design is a proposal; no numeric rates or new test passes are approved by that document.

Implementation update: [OT_MODEL_PROGRESS.md](OT_MODEL_PROGRESS.md) records the opt-in OTMODEL1 state machine and its per-scenario evidence. It supersedes earlier claims that all full-OT logic is absent, but does not claim normal stochastic AUTO, full statistics or UI completion. Seven of the 32 scenarios pass under scripted local outcomes; 25 remain BLOCKED. D4 rulings below remain authoritative.

## D4 ruling addendum — governs conflicting D3 text below

Chairman approved smoke testing on 2026-09-18. OT timeouts are 30 seconds (not the proposed 60); regulation timeout behavior is unchanged. R2 is approved: PAT in OT1 unless two are needed to tie; omit an unnecessary try when the answering touchdown already wins, including OT2. R3 is approved: defensive OT2 try return awards two, then evaluate score and remaining opportunity, not automatic termination. Offensive dead-ball penalty is 15 yards; Chairman explicitly corrected OPP3 -> OPP18, not OPP20. Offsetting is nullified; replay interpretation remains to be explicitly confirmed. Timeout pool interpretation remains as proposed below, not a newly confirmed ruling. Smoke authorization does not approve invented event probabilities, production deployment or a release number. See SMOKE_RESULTS_2026-09-18.md for actual execution and blockers; no new football implementation is claimed.

Revision D3 — 2026-09-18. Branch `4.3.2.SB`. Source inspected: `8df9c10f3f65e9f51285ed71ffcc17384ad1eda0`. This is a documentation-only consolidation of the Chairman's subsequent conversation rulings. It supersedes conflicting portions of ITEM4_DESIGN.md; untouched provenance, record-model and failure-handling provisions there remain applicable. No smoke tests or new implementation were performed in this consolidation. Mode: Design; experimental sandbox; not certified or fully build-ready.

## A. Scope and current implementation

| Item | Requirement | Current status |
|---|---|---|
| 1 | Two-minute/endgame decisions | Draft; no regulation changes authorized by this package |
| 2 | Event-driven Game Length | Draft; only separately instructed OT breaks are in the present engine-change scope |
| 3 | Drive/quarter scoring-probability influence | Draft; not authorized for this build |
| 4 | Play-by-play, drive identity, team stats, reconstruction and drill-down | Consolidated design; implementation/testing awaiting approval |
| 5 | Seeded opening receiver with opposite halftime receiver | RECEIVER1 implemented and tested previously; preserve it |
| 6 | Weekly schedule upload/validation/immutable locking | Approved direction; implementation pending and outside this smoke package |
| 7 | Off-white/grey Chairman theme | Approved direction; implementation pending; keep dark theme in this package |

Seven requested features / seven retained. Added work packages: full OT simulation (expressly authorized engine exception), signed score controls (agreed scope, not yet implemented), Chairman-only countdown (requested, not yet implemented). No silent release-number change, production deployment, active-session migration, official acceptance or SEUD publication. Every smoke artifact stays QA_ONLY.

REGULATION FREEZE: do not change football-engine coding or behavior merely to obtain stats. No retuning ratings, HFA, run/pass probabilities, clock constants or unrelated mechanics. OT implementation is the Chairman's explicit exception, limited to the rules below. Signed score commands are another explicitly bounded correction feature, not a scoring-probability influence control. Stats may consume outputs of the approved OT implementation but may not require unrelated engine modifications.

## B. Statistics and display rulings

1. Neither main Chairman nor main public board displays detailed team stats. Chairman OPEN GAME opens one game with controls and full stats. Clicking/tapping a public game opens its read-only game page. Back navigation preserves the board context.
2. Team Stats is the default individual-game view; Drives and Play-by-Play are separate tabs. Preserve mobile readability and edit focus/scroll during refresh. Public responses exclude private seeds, tokens and approval internals.
3. Stat source classes are Recorded, Derived, Reconstructed, or BLOCKED. Missing engine evidence displays **Unavailable first**. No automatic fabrication/reconstruction merely to populate a box score; patch capability gaps during later authorized hardening.
4. Full reconstruction is an available, explicit Chairman option after an edit, not the default. Show before/after scores, affected team stats, drive/event revisions and any proposed next football checkpoint before approval.
5. Reconstruction can change supporting penalties, turnovers, TOP and third/fourth outcomes within the approved segment, but must construct a coherent event sequence. It cannot independently adjust unrelated totals to hide contradictions. Begin with the affected drive; obtain approval before expanding scope. Preserve raw events; derive totals from exactly one effective revision so replacements are not double-counted.
6. Chairman can authorize possession changes needed by a correction. The engine changes possession only through the approved edit/command path, never a background stats worker. Preserve OT first/second opportunity state, receiver assignments and continuation lineage. An edit to a final that creates a tie flags required action; stats never launch OT themselves.
7. Approve an exact proposal hash against the expected football-state version. Acknowledge the engine correction, then bind its resulting version to the approved stats snapshot. Reject stale previews. Existing engine and sidecar commits are not falsely presented as one atomic transaction. During uncertain response/recovery show Updating, do not blindly resend the football command.
8. Each committed stats revision is immutable; later plays/edits create successors. A final statistical seal requires matching score, per-period totals, final event boundary, rule version and validated team/drive totals. Editing/reopening invalidates current seal eligibility, never deletes old history. Official acceptance stays blocked in the sandbox.
9. CSV/JSON exports use one snapshot/version and identify game, run, engine/stats/rule versions, raw/reconstructed lineage and QA status. Unavailable fields stay explicit rather than zero. Private audit exports are role-restricted.
10. Reuse current output streams where possible. Stats run externally and never consume football RNG or block scoring. Repeated/out-of-order delivery is deduplicated and reconciled; gaps remain visible. Restart/purge isolates runs; recover worker failure without modifying football results.
11. Live scoring must not wait for aggregation/reconstruction/export. Individual stats-page calculation may take 1–2 seconds. If unavailable or late, show honest freshness/status while the score continues. The earlier p95/p99 and 20ms overhead budgets are engineering proposals, not Chairman-approved measured guarantees.
12. Validate 2026 FBS/FCS statistical counting with a cited applicability map. Keep custom GameCast broadcast/choice rules explicit. Complete compliance and exact observed-stat coverage remain BLOCKED pending mapping and fixtures; no engine changes are implied by a missing stat. Source references/hashes are retained in item4-sources.json; the hosted statistics manual was not explicitly dated 2026.

## C. Chairman scoring controls

Both teams get +1, +2, +3, +6, +7, +8; -1, -2, -3, -6, -7, -8; and ZERO SCORE. Exactly 13 controls/team, 26 total. Addition/subtraction share signed-delta validation. No other quick-adjustment denominations. Prior inspection found only the six permitted positive values, so nothing was purged.

Target a specified regulation/OT period, defaulting to current. Reject a deduction below that period's zero floor. ZERO SCORE clears all score periods for that team, not automatically its yards, plays or TOP. Direct box-score entry is retained. ZERO needs clear confirmation of its full-team scope. Preserve original history with explicit correction records.

AUTO -> Chairman Edit -> authoritative Save & Resume AUTO or Save & Hold. Football freezes during Edit; GL and Master Zulu continue; no RNG football events occur. Cancel discards proposed changes. Statistical reconstruction failure never silently reverses a saved score-only correction. Corrections must not accidentally add an OT opportunity or trigger Final before Save.

## D. Full overtime rules

| Phase/transition | TV break if still tied | Football action |
|---|---:|---|
| Tied regulation -> OT1 | 10:00 | Each team receives a full offensive series starting OPP 25 |
| Tied OT1 -> OT2 | 5:00 | Each team receives a full offensive series starting OPP 25 |
| Tied OT2 -> OT3 | 5:00 | Each team receives one two-point attempt starting OPP 3 |
| Tied OT3 or later -> next OT | 1:30 | Repeat one OPP 3 attempt per team |
| Decided game -> Final | None | No post-Final TV break |

- At tied regulation, conduct one seeded unbiased coin toss. Winner chooses defense first with probability 95%, offense first with probability 5%; never enforce an exact ratio in a finite sample.
- Reverse first-offense order each OT period. No fresh order coin toss every period. Log toss/choice/order in private reproducibility metadata without perturbing regulation RNG.
- OT1 permits PAT or a two-point option after a touchdown. OT2 requires a two-point attempt after a touchdown, subject to unresolved unnecessary-try decision R2 below. OT3+ consists of alternating two-point attempts from OPP 3, NOT OPP 2.
- Second offense must finish tied to extend or ahead to win. If its completed opportunity leaves it behind, it loses. Its strategy must seek enough points; no guaranteed scoring or rubber-banding. Both scoreless or equal scoring means continue after the prescribed break.
- A first-offense score alone does not ordinarily prevent the answering opportunity. Finish at the decisive legal result rather than run extra plays/breaks. Maintain explicit OT number, first offense, current offense, series/try number, completed opportunities, pending penalty/try and possession checkpoint.
- Defensive return touchdown on an ordinary OT series: game ends immediately under the Chairman's ruling. A blocked PAT returned for 2 points: credit the defense, but **do not automatically end**; evaluate score and remaining opportunity. In OT3+, a defensive return on a try awards two points but does not waive equal series. After the first resolved try, the other team must receive its scheduled try. After the second resolved try, compare totals: unequal means Final; tied means the next OT. Resolve fouls, nullification and any retry before counting a completed opportunity. This Chairman correction supersedes the earlier immediate-Final ruling (2026-09-23). OT2 handling follows approved R3.
- OT is untimed: no regulation countdown or regulation TOP allocation. Play processing, timeouts and TV stoppages still consume GL; Master Zulu remains real operations time. Scoreless OT periods remain visible as zeros. Valid score-period keys: OT, 2OT, 3OT, etc.; never 0.
- Ordinary OT1/OT2 offensive plays count toward supported full-game statistics. PAT and two-point try activity in OT1, OT2 and OT3+ is excluded from ordinary full-game team-stat production/efficiency totals. Try points remain in scores and line scores; keep attempt/result/penalty detail in the OT event/audit record, not silently deleted.

### OT timeouts and penalties

Chairman: each team gets one timeout which must last to OT3, then one timeout in OT3+. Proposed interpretation, not yet separately confirmed: one shared allowance across OT1–OT2; replace it at OT3 with one shared allowance for all OT3+ periods, no carryover stacking and no per-period refill. Duration is unresolved (R1).

For OT3+: defensive end-zone penalty that awards another try replays at half distance; OPP3 -> OPP1.5. Preserve fractional position; do not round back to a whole yard. Offensive penalty on successful attempt: cancel the score, enforce appropriate yardage, repeat. Offensive penalty on failed played attempt: decline penalty and retain failed attempt. Full penalty taxonomy, dead-ball/offsetting and additional legal exceptions require R4; do not apply the failed-play decline rule to a false start where no attempt occurred.

Game-ending checks must wait until applicable penalty enforcement resolves. A nullified score cannot end the game. Any case outside the approved rule map is BLOCKED pending ruling; no guessed field position or automatic winner.

## E. Chairman-only break countdown

During TV breaks, quarter breaks, halftime and OT breaks, show PLAY RESUMES IN MM:SS on Chairman main/game views only. Its authoritative value is backend break state. Display interpolation may follow that anchor but never advances the game, draws RNG, or creates a quarter transition; resync after refresh/reconnect.

Respect effective AUTO speed: 50x advances simulated break seconds at 50x, not Master Zulu. This is break time remaining, not a fixed wall-clock promise. Hide when break ends. Public main/game views never display it. Pause/Edit/indefinite Delay uses HELD — RESUME REQUIRED, not a false restart countdown. During stale/disconnected state show sync/unknown, do not claim play restarted. If automatic play is off, present break completion separately from manual restart. No new timing constants outside the approved OT breaks.

## F. Superseded statements

| Earlier statement | Governing replacement |
|---|---|
| OT3 starts OPP2 | OPP3 |
| Every defensive OT score ends the game | Ordinary-series defensive TD ends; returns ON tries do not waive equal series, including OT3+; resolve fouls/retries before the final score comparison |
| Stats may require engine hooks/counters/new write transaction | External stats only; full OT and signed controls are separately bounded approved change scopes |
| Missing detail can be automatically reconstructed | Unavailable first; explicit Chairman reconstruction option only |
| Approved edit makes all stats permanently final | Exact revision immutable; later events produce successor; final seal after validation/lock |
| Full OT/statistics/countdown already implemented | Design only; inspected implementation remains RECEIVER1 |

## G. Five remaining ruling groups — recommendations, not approvals

| ID | Decision needed | Recommended resolution |
|---|---|---|
| R1 | Timeout pool meaning, carryover and duration | Confirm shared OT1–2 pool and replacement shared OT3+ pool, no stacking/refill. Choose a 60-second timeout duration as a proposed GameCast setting; pending Chairman approval. |
| R2 | OT1 PAT-vs-two strategy and unnecessary final try | For initial smoke scope, choose PAT in OT1 unless two are needed to tie; do not add a new discretionary coaching-risk model. End when the answering TD already wins, without a needless try. This is an explicit exception to literal OT2 'after any touchdown'; Chairman must resolve it. |
| R3 | Defensive return of OT2 two-point try | Recommend credit 2, then evaluate score/opportunities like blocked-PAT treatment; OT3+ now also requires equal resolved series under the 2026-09-23 correction. |
| R4 | Penalty/rare-event fallback | Apply verified 2026 rule cases for unspecified penalty types, dead-ball, offsetting, replay enforcement and rare scoring; retain explicit approved GameCast overrides. First smoke fixtures use an enumerated verified subset; unsupported cases BLOCKED. No blanket claim all penalties are implemented. |
| R5 | Probability calibration for new OT event types | Separate logic smoke from realism calibration. Initially force scripted outcomes in the test harness only, leaving candidate runtime probabilities unset/BLOCKED where no approved formula exists. Reuse existing applicable verified play formulas without retuning regulation; obtain approval of new PAT/try/block/return/penalty rates before randomized full-OT acceptance. No hidden guessed percentages. |

Only five ruling groups are requested. Additional engineering details belong in implementation/test evidence, not an endless expansion of Chairman policy questions. Sandbox prototype and smoke authorization remain to be confirmed along with these resolutions.

## H. Smoke coverage and evidence requirements

Retain S01–S20 from ITEM4_DESIGN.md for stats, signed-control intentions, reconstruction, replay, failure recovery and UI/load tests, with these overrides: S01 proves available observations, not newly instrumented engine events; S02–S03 validate actual signed controls only once their bounded adapter is implemented; S11 freezes regulation/RECEIVER1 code outside approved OT/control scope; S12 compares identical OT rules with stats on/off, and separately compares regulation-only histories against RECEIVER1; S17 uses the approved full-OT implementation rather than declaring that implementation itself forbidden. Missing stats remain Unavailable.

Add the following 12 scenario groups (20 + 12 = 32 total):

| ID | Required result |
|---|---|
| O01 | Coin toss reproducible; both winners/choices covered; empirical 50/50 and 95/5 checked only when approved RNG implementation exists |
| O02 | Regulation tie -> exact 600-second TV break -> OPP25; no stray RNG/period transitions during stoppage |
| O03 | OT1 possession order and answering strategy; PAT/two, scoreless/matched scores; tied -> exact 300-second break |
| O04 | OT2 order reverses; OPP25, mandatory two-point rule and R2/R3 decisions; tied -> exact 300-second break |
| O05 | OT3+ OPP3 alternating attempts; both success/fail extends; one success wins; tied -> exact 90 seconds |
| O06 | Ordinary defensive TD ending and try-return equal-series handling tested separately; OT3+ first return, second winning return, second tying return, and foul-nullified return required |
| O07 | Timeout pool exhaustion, OT3 replacement, no unwanted refill/carryover, approved duration |
| O08 | Defensive half-distance/fractional placement; successful-offense penalty replay; failed-offense decline; R4 exceptions |
| O09 | Penalty-nullified winning score, repeated tries and scoreless periods; no premature Final or extra post-Final break |
| O10 | OT Chairman score/possession/clock correction and continuation; opportunities/order preserved; full history and stats exclusions reconcile |
| C01 | Chairman main/game countdown on all break kinds, backend resync and all speeds; no countdown on either public view |
| C02 | Pause/Edit/Delay, AUTO off, disconnect/reconnect and Final: correct held/stale/hidden state; GL/Master Zulu preserved |

The 60-game load fixture is the unchanged canonical 55 plus five labeled synthetic test games, not a schedule edit. Test scores never enter standings, ratings or publication feeds. Before/after source hashes and scoped diffs accompany results. Worker outage must not delay scoring. Report p50/p95/p99 latency, event-loss/dedup counts, CPU/memory/payload and observed drill-down wait; do not claim performance from design alone.

All 32 cases are NOT TESTED for this consolidated candidate; the separate RECEIVER1 test results remain historical evidence only. Rule-dependent cases are BLOCKED until their ruling/verified fixture exists. Force-scripted tests establish transitions, not realism or stochastic calibration.

## I. Readiness and approval checkpoint

Documentation consolidated; source unchanged. Full implementation, actual source-to-stat coverage map, five rule resolutions and smoke authorization remain prerequisites. No claim the feature is executable today.

All 12 consolidated release gates: NOT TESTED — engine/state integrity; fixed-seed regression; multi-seed distributions; full board; poll/chunk invariance; 1x/50x invariance; backend persistence/versioning; Chairman integration; public integration; Mobile Safari; existing-session compatibility; Chairman completed-candidate approval. Cloud schema/credentials and full NCAA mapping remain BLOCKED for any later cloud-readiness claim.

Approve R1–R5 (or provide replacements) and authorize the bounded local implementation plus smoke suite before execution. Do not merge, deploy, alter accepted/live results or change other candidate features. The next report must preserve every scenario separately with PASS/FAIL/NOT TESTED, and explain BLOCKED evidence rather than infer completion.
