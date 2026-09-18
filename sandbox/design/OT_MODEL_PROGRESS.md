# OT state-machine implementation — 2026-09-18

QA_ONLY; official=false. Branch 4.3.2.SB. No product release assignment. Author self-check, not independent verification.

## Outcome and authority

Built opt-in OTMODEL1 behind createRuntime({receiver:true,otModel:true}). This supersedes the timing-only adapter for this candidate, not the active Chairman server. Identity GC-W4-V4.3.1-RC1-SANDBOX-RECEIVER1-OTMODEL1; namespace qa-otmodel1-. RECEIVER1 and OTENTRY1 remain independently reproducible. Nothing was deployed, migrated, accepted or published.

Architecture skill: Design mode, experimental prototype, local reversible changes. Activated state/action modeling, provenance, execution, isolation and tests. Engine owns OT state and scoring. The future stats worker is a consumer, never an authority over possession or Final.

Objects: Game owns one OT checkpoint; checkpoint owns period number, ordered first/answering opportunities, down/distance, pending event, timer, timeout pool and blocked reason. Events have run-bound IDs and monotonic sequence. Game history stores actual scripted plays, tries, penalties and transitions. Scores from the fixture provider are explicitly OT_SCRIPTED_QA. Try events remain in history but do not increase ordinary team-play counts or regulation TOP. Reset archives the OT checkpoint before clearing it.

Transitions: regulation tie -> 600-second break -> two OPP25 series; tied OT1/2 -> 300-second break; OT3+ -> paired OPP3 attempts and 90-second tied-period breaks. First offense alternates. Separate seeded toss does not consume regulation RNG. Events finish once, after their explicit duration; malformed/missing outcomes block before scoring. Timeout-pool interpretation remains provisional. Offsetting is blocked pending replay ruling.

Security: host-only fixture provider, unavailable through HTTP. Without an approved outcome model, normal AUTO stops at the first OT opportunity and displays BLOCKED. Existing official acceptance/publication/ratings/standings restrictions remain. Public OT data excludes toss, pending fixture and sequence internals. OT score/clock/edit/reopen corrections return 409 before persistence until a coherent correction checkpoint is built.

## Test evidence

- node sandbox/test-overtime.mjs: exit 0, 15 named assertion groups; detailed evidence overtime-results.json.
- node sandbox/test-ot-integration.mjs: exit 0, 2 integration groups; evidence overtime-integration-results.json.
- Existing baseline, receiver and HTTP tests: 22 grouped checks pass separately. OTENTRY1 regression and entry-timing tests also pass.
- 55 fixed-seed regulation trajectories agree through Final/OT entry; 1 naturally tied game in the selected sample. Full scripted OT agrees at 1s/13s chunks and 1x/50x.
- Mid-play local API persistence/reload completes the event once, public data is redacted, unsupported corrections are denied without persistence mutation. Pause advances GL and Master Zulu without advancing scoreboard, break or pending OT events.

Initial replay test failed because its fixtures independently randomized receiver receipts; fixed the fixture to initialize all seed-dependent receiver fields consistently. An intermediate archive patch conflicted with RECEIVER1's checked anchor; changed it to a non-overlapping anchor and reran. These were test/integration defects corrected before the reported final passes.

No new empirical success, return, block or penalty probabilities were invented. Scripted event durations are test inputs, not approved broadcast timing calibration. No full NCAA compliance claim. Unknown penalty/safety cases remain BLOCKED.

## Complete 32-scenario status

PASS below means local scripted logic acceptance only, not population realism, UI or production approval. A passing subset is not a passing complete scenario.

| ID | Status | Remaining gap or evidence |
|---|---|---|
| S01 | BLOCKED | Stats reducer/counting rule map missing |
| S02 | BLOCKED | Signed-control implementation missing |
| S03 | BLOCKED | Correction proposal validator missing |
| S04 | BLOCKED | Effective-event revision model missing |
| S05 | BLOCKED | ZERO SCORE reconciliation missing |
| S06 | BLOCKED | Reconstruction missing |
| S07 | BLOCKED | Reconstruction target validator missing |
| S08 | BLOCKED | Stats/checkpoint binding missing |
| S09 | BLOCKED | Exact-proposal approval missing |
| S10 | BLOCKED | Sidecar commit recovery missing |
| S11 | BLOCKED | Regulation regression passes; sidecar isolation cannot be tested before implementation |
| S12 | BLOCKED | OT replay passes; no stats-on/off candidate |
| S13 | BLOCKED | Stats worker dedup missing |
| S14 | BLOCKED | Stats seal/reopening missing |
| S15 | BLOCKED | OT reset archive implemented; stats run archive missing |
| S16 | BLOCKED | Full cited counting fixtures missing |
| S17 | BLOCKED | OT events now available; full stats counting missing |
| S18 | BLOCKED | Stats drill-down UI missing |
| S19 | BLOCKED | 60-game stats-worker load not available |
| S20 | BLOCKED | Worker outage/export implementation missing |
| O01 | PASS | Seeded toss/order choices; 10,000-seed sample |
| O02 | PASS | 600 seconds, OPP25, no scoreboard/TOP time |
| O03 | PASS | OT1 multiple downs, PAT/two-needed choice, answering TD, ties/scoreless |
| O04 | PASS | OT2 order reversal, mandatory two, defensive return handling, 300 seconds |
| O05 | PASS | OPP3 paired attempts, matched success/failure, 90 seconds, winning pair |
| O06 | PASS | Ordinary defensive TD, blocked PAT, OT2 and OT3 defensive try distinctions |
| O07 | BLOCKED | 30 seconds implemented/tested; pool policy still provisional |
| O08 | BLOCKED | Approved penalty subset tested; offsetting/rare exceptions unresolved |
| O09 | PASS | Nullified answering score, retries, scoreless periods and no final TV break |
| O10 | BLOCKED | Coherent Chairman OT checkpoint edits not implemented; unsafe commands denied |
| C01 | BLOCKED | Chairman countdown UI missing |
| C02 | BLOCKED | Countdown hold/stale UI missing |

Count: 32 = 7 scripted PASS + 25 BLOCKED. The 15 unit assertion groups and 2 integration groups are not 17 additional scenario completions.

## Remaining decisions and next implementation

1. Confirm timeout pools: one shared timeout across OT1–2, replaced by one shared across OT3+, no stacking or refill each period. Duration 30 seconds is already settled.
2. Confirm offsetting: nullify attempt and score, then replay from previous spot. OPP18 dead-ball placement is settled.
3. New-event probability model still needs approval before unforced OT AUTO. A proposed, evidence-backed model must be presented rather than silently selected.

Remaining engineering (not approval blockers): OT edit checkpoints, signed score controls, external stats/counting/reconstruction, drill-down UI, Chairman countdown, then full load/browser tests. Preserve these separately from the original seven feature candidates. No changes to two-minute regulation logic, general variable GL, probability influence, schedule locking or theme were made.

Rollback: select RECEIVER1/OTENTRY1 in a separate namespace; never reinterpret or migrate OTMODEL1 sessions. Chairman server remains RECEIVER1. No migration required for this opt-in test candidate. Release readiness and cloud parity remain BLOCKED.
