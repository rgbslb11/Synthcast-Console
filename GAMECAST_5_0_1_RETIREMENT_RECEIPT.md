# GameCast 5.0.1 authorized retirement and final-reference correction

Observed 2026-10-14 UTC. Engineer-operated follow-up. This is not production certification.

## Completed actions
- Verified source head 6fcaac2ca0214ba4283d7f9d2c876eeb0f68271f on release/gamecast-v5.0.1.
- Verified both release write switches and both scheduler cron jobs disabled.
- Inspected dependencies: no incoming cross-schema foreign keys to the retired tables; no v501 database functions reference v500.
- Applied fresh migration retire_v500_runtime_owner_authorized_20261014. Five explicitly named v500 runtime tables were truncated transactionally with RESTRICT, retained sequences, exact inventory preconditions and candidate-state preservation assertions. Existing tables, immutable triggers, access controls, shared Auth and candidate records remain.
- Applied v501_owner_approved_g0331_reference_correction_20261014. G0331 reference is Kansas 24 / Utah 56; quarters are 0-7, 7-14, 17-14, 0-21. The prior score/provenance is retained in one correction audit event. Immutable-final protection was restored within the same migration. Play-derived statistics were not reconstructed and are explicitly unverified for this corrected reference.
- No SEUD import, production promotion or main merge.

## Retirement receipt
| Table | Before | Removed | After |
|---|---:|---:|---:|
| sessions | 1 | 1 | 0 |
| events | 17328 | 17328 | 0 |
| requests | 11211 | 11211 | 0 |
| creation_requests | 1 | 1 | 0 |
| final_snapshots | 13 | 13 | 0 |

Before database bytes: 2407175859. After observed database bytes: 48182963. Measured reduction: 2358992896 bytes. The requests relation is now 24576 bytes. These are PostgreSQL database/relation measurements, not claims about billable provisioned disk size.

Candidate preservation before correction: 6 sessions, 13615 events, 1171 requests, 13 final references. Retirement preserved candidate session checksums and these counts. G0331 correction adds exactly one audit event; resulting event count is 13616.

## Remaining engineering acceptance
| Gate | Disposition |
|---|---|
| 1 Baseline protection | Source retained; operational records intentionally retired with owner authorization; older release data untouched |
| 2 Separate branch | Starting candidate head verified; follow-up remains on candidate branch |
| 3 Live UI | Prior reported hosted evidence retained; not rerun in this follow-up |
| 4 Chairman controls | BLOCKED: authenticated hosted Final/Unlock/QA Accept checks outstanding |
| 5 Deadman | BLOCKED: full authenticated hosted sequence outstanding |
| 6 Concurrency | Prior regression evidence retained; not rerun here |
| 7 Storage architecture | Prior compact-receipt evidence retained; source duplication storage removed |
| 8 Retirement | PASS: authorized transaction executed and independently queried after commit |
| 9 Fourth down | Prior regression evidence retained; no engine change |
| 10 Safety | Prior regression evidence retained; no engine change |
| 11 Kneels | Prior regression evidence retained; no engine change |
| 12 Simulation preservation | No simulation code or stored candidate histories changed |
| 13 Performance | BLOCKED: staged hosted measurements and acceptance thresholds remain incomplete |
| 14 Recovery | Retirement-based old-session rollback replaced; candidate rehearsal evidence retained, current recovery certification incomplete |
| 15 Release evidence | Sanitized follow-up report, rollback replacement and exact SQL published on candidate branch; complete-release evidence remains incomplete |

## Exact limitation
The secure cloud browser currently presents a sign-in form; no authenticated Chairman session is available to this follow-up. Public inspection cannot substitute for authenticated control tests. Database cleanup success does not certify control behavior.
DO NOT APPROVE 5.0.1 FOR PRODUCTION while these engineering acceptance gaps remain.
