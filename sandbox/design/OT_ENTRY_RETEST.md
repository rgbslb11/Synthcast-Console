# OT entry correction and retest

2026-09-18. QA_ONLY, official=false. Branch 4.3.2.SB. Author self-check, not independent verification.

## Implemented scope

New opt-in sandbox engine adapter OTENTRY1 changes the tied-regulation entry break from 180 to 600 seconds. Exactly one hash-pinned source anchor is replaced. No regulation logic, play probabilities, ratings, schedule or football RNG changes. No new product release number.

Instantiate with createRuntime({receiver:true,otEntry:true}). Identity ends in -RECEIVER1-OTENTRY1, namespace qa-otentry1-. Old sessions are rejected. This candidate is exercised by the local smoke harness; the existing Chairman server remains RECEIVER1. It is not deployed or silently applied to any session.

## Results

| Command | Exit | Evidence |
|---|---:|---|
| node sandbox/test-ot-readiness.mjs | 0 | Expected 600 seconds, observed 600 |
| node sandbox/test-ot-readiness.mjs --unpatched | 1 | Negative control: expected 600, observed 180 |
| node sandbox/test-ot-entry.mjs | 0 | 55-game comparisons plus forced tied-regulation fixture, timing boundaries, replay, speed/chunk invariance and candidate namespace checks |
| node sandbox/test.mjs | 0 | 9 existing regression groups passed |
| node sandbox/test-receiver.mjs | 0 | 5 existing receiver groups passed |
| node sandbox/test-http.mjs | 0 | 8 existing server isolation checks passed; server is still RECEIVER1 |

The 55 selected seeds produced zero natural OT games. A separate forced final incomplete pass at tied regulation exercises actual entry and completion: only GL changes by +420 seconds versus the old engine; final scores and football RNG agree. Candidate full-game results agree at 1s/13s chunks and 1x/50x, including the forced OT fixture. Through 599 break seconds, scoreboard and football RNG remain frozen; transition occurs at 600. The original engine source remains unchanged.

## Limits and scenario status

O02 timing subcheck now PASS. O02 as a whole remains BLOCKED because full OPP25 offensive series are not implemented. All other S01–S20, O01, O03–O10 and C01–C02 statuses remain NOT TESTED/BLOCKED as individually listed in SMOKE_RESULTS_2026-09-18.md. Thus all 32 complete new-feature scenarios remain incomplete; do not claim a full smoke-suite pass.

Full OT possessions, conversions/returns/penalties, 30-second OT timeout pools, statistics sidecar, signed correction controls and Chairman-only countdown remain unimplemented. OPP18 is the approved penalty destination, not implemented by this timing-only patch. No standings, ratings, accepted results, production or SEUD writes occurred.

Next bounded implementation is the OT possession/attempt state machine, with scripted outcomes until new event probabilities are approved. This result establishes the OT-entry timing repair, not full OT or feature-4 readiness.
