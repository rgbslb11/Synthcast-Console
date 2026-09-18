# Sandbox smoke results — 2026-09-18

Author self-check — not independent verification. QA_ONLY; official=false.

## Executive verdict

CONTROL-TESTED — domain behavior not yet proven. This verdict applies only to the existing isolated sandbox. The combined stats/OT/countdown candidate is BLOCKED: it is not implemented. No production approval.

## Scope and commands

Source parent f512f380198488583ea2f693b5c37f747e3aa6f0, branch 4.3.2.SB. Verified baseline 8163e9d1a2b22789f0579a761d1e4ae926eaa430 with RECEIVER1 adapter. Local mock persistence and loopback HTTP only. Tier 2 local test; official publication would be Tier 3 and is prohibited.

| Command | Exit | Result |
|---|---:|---|
| node sandbox/test.mjs | 0 | 9/9 grouped checks PASS |
| node sandbox/test-receiver.mjs | 0 | 5/5 grouped checks PASS |
| node sandbox/test-http.mjs | 0 | 8/8 checks PASS |
| node sandbox/test-ot-readiness.mjs | 1 | O02 FAIL: expected 600 seconds; actual 180 |

22/22 existing regression groups passed, including 55-game checks, 10,000 receiver seeds, deterministic replay/chunk/speed comparisons, three-clock holds, foreign-session/token rejection, publication rejection and public redaction. These are not the 32 new-feature scenarios. Existing scripts refresh their evidence JSON files. The OT probe injects an incomplete final regulation play in a disposable local fixture; it never changes the engine or real sessions.

Engine source SHA256 remains 33fecdd438ea497458a878dc437ff0c7dfb3dbc64810b154370b3a45ec31fdcf. No football source, live session, accepted result, standings, rating or publication was changed.

## New-feature traceability — all 32 scenarios retained

Status NT means NOT TESTED, BLOCKED by missing implementation or rule evidence. Descriptions are shortened; governing expectations remain in the consolidated specification and ITEM4_DESIGN.md.

| Case | Requirement | Status / evidence gap |
|---|---|---|
| S01 | Derived team totals | NT — no sidecar reducer/rule map |
| S02 | 26 signed controls | NT — controls not implemented |
| S03 | Invalid correction rejection | NT — proposal validator absent |
| S04 | Remove linked TD/try | NT — revision model absent |
| S05 | ZERO SCORE reconciliation | NT — correction implementation absent |
| S06 | Coherent reconstruction | NT — reconstruction absent |
| S07 | Impossible target blocks | NT — reconstruction validator absent |
| S08 | Stats bind possession checkpoint | NT — binding absent; existing edit regression passes separately |
| S09 | Exact proposal/version approval | NT — proposal workflow absent |
| S10 | Acknowledgement recovery | NT — sidecar binding absent |
| S11 | Freeze/clock/RNG separation | NT — sidecar absent; baseline hash/clocks pass separately |
| S12 | Stats on/off replay | NT — no stats-on candidate |
| S13 | Dedup/out-of-order recovery | NT — worker absent |
| S14 | Final seal/reopening | NT — stats seal absent |
| S15 | Stats run isolation | NT — stats archive absent; receiver restart passes separately |
| S16 | Counting edge fixtures | NT — cited counting coverage incomplete |
| S17 | Full OT counting | NT — full OT absent |
| S18 | Stats drill-down UI | NT — UI absent |
| S19 | 60-game worker load | NT — worker absent; 55-game regression not equivalent |
| S20 | Worker outage and exports | NT — worker/export absent |
| O01 | Seeded OT toss/95% choice | NT — new OT choice absent |
| O02 | 600-second entry break/OPP25 | FAIL — observed 180 seconds; later possession assertions not reached |
| O03 | OT1 full series/tries | NT — simplified score selection remains |
| O04 | OT2 order/two-point/break | NT — full OT absent |
| O05 | OT3 OPP3 attempts | NT — full OT absent |
| O06 | Defensive return distinctions | NT — return model absent |
| O07 | 30-second OT timeout pools | NT — OT pools absent |
| O08 | Penalties/fractional placement | NT — penalty model absent |
| O09 | Nullified winner/repeated tries | NT — penalty model absent |
| O10 | OT checkpoint edits/counting | NT — full OT checkpoint absent |
| C01 | Chairman-only countdown | NT — requested display not implemented |
| C02 | Held/stale countdown states | NT — requested display not implemented |

Count: 32 = 0 PASS + 1 FAIL + 31 NOT TESTED/BLOCKED. Do not transfer old regression passes to combined-feature gates.

## Readiness and findings

Package/execution: existing test scripts execute. Control effectiveness: local isolation exercised with negative requests. Workflow/domain: combined feature BLOCKED. Operational/production readiness: NOT TESTED and not authorized.

High H1: engine does not meet approved OT entry timing. Reproduce with node sandbox/test-ot-readiness.mjs; expected 600, actual 180, exit 1. Missing implementation, not a regression introduced in this turn.

High H2: combined stats/OT/countdown feature is design-only. Reproduce by inspecting sandbox/runtime.mjs and receiver.mjs: RECEIVER1 is the active adapter, no new full OT or stats worker. All unimplemented requirements are documented but not enforced.

Critical: none established within this limited local run. Medium: full NCAA counting map and probability calibration remain unverified. Low: none separately established. Existing test-suite mutation coverage was not performed; however, the new requirement probe detects actual noncompliance while old regression suites pass. Old suites are insufficient to establish new-feature readiness.

## Dependencies, residual risks and next step

Implement the bounded candidate before rerunning feature smoke tests. Preserve regulation code, fixed-seed replay and three clocks. Use forced fixtures only for new uncalibrated event types; do not infer realistic probabilities. Confirm offsetting replay semantics and timeout-pool interpretation before their acceptance fixtures. OPP18 and 30 seconds are settled.

Browser/Mobile Safari, cloud persistence parity, sidecar latency, full NCAA applicability and 60-game stats load remain untested. No live/deployed runtime was re-fetched this turn. Deployment requires a separate explicit authorization after implementation, full scenario evidence, remaining release gates, independent verification and rollback planning; this report authorizes none of those actions.

This review establishes **the existing sandbox regression results and an observed OT requirement failure**. It does not establish **implementation or readiness of the new stats, OT or countdown features**.
