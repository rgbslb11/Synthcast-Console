# Backend verification — November 3, 2026

Source baseline verified: `f0eb2a56df7fe8d10e1f7739a261a1d5084b6699`.
Remote development head was fetched again before commit and still matched.
Dedicated work branch: `development/gamecast-v5.1.0-backend`.
No integration merge; recheck the shared head immediately before any later merge.

## Local execution

| Command / check | Observed result |
|---|---|
| Foundation `node --test tests/v510/*.test.mjs` before changes | 24/24 PASS |
| Retained `node --test tests/v506/*.test.mjs` before changes | 54/54 PASS |
| Candidate `node --test tests/v510/*.test.mjs` | 38/38 PASS |
| `npm ci --prefix tests/v510/database --ignore-scripts --no-audit --no-fund` then `node --test tests/v510/database/recovery.test.mjs` | 5/5 PASS; pinned PGlite 0.3.14 |
| Retained `node --test tests/v506/*.test.mjs` after changes | 54/54 PASS |
| Protected release diff from 754d959 | No differences in public/v5.0.6, release-assets/v5.0.6-week11, deploy-v506.yml |
| Shared contract / WP diff from f0eb2a56 | data-contract.v1.json, illustrative-wp.mjs and wp.test.mjs unchanged |
| `git diff --check` | PASS |

Candidate test total: **97 = 38 + 5 + 54**, no skipped tests. Node 24.22.1.
The five database tests include: role denial/immutability; transaction/retry/gap/
rewrite/disk recovery; correction lifecycle; full-board reporting; competing
writer and empty-run reuse rejection. Unknown source fields, missing audit,
foreign sessions and corrupted score/field state fail closed.

56-game exercise: 56 explicit QA genesis records + six revisions each = **392
projection commits**, **336 measured reads**, and **56 concurrent HTTP requests**.
All source games remain unchanged by reporting, and their football state matches
controls advanced without reporting. One local run measured read P95 **4.00 ms**,
maximum **6.07 ms**. The test regression ceilings are P95 <1,000 ms and max <5,000
ms; these are local guardrails, not proposed hosted SLAs. The PostgreSQL/WASM
runtime queues work; this is not evidence for 56 parallel database transactions.

Disk recovery closes a database containing a partially consumed page, reopens
it from disk, continues at the acknowledged sequence, and retries the prior
write without duplicating records. A conflicting retry is rejected. A history
rewrite rolls back the entire attempted transaction. Old source/journal rows
cannot be updated/deleted. Source lag blocks detail until recovered.

## Release gates

| # | Gate | Status | Scope of evidence / outstanding work |
|---|---|---|---|
| 1 | Engine/state integrity | PASS (local) | Retained engine suite; reporting does not mutate source; input validation. Hosted integration not tested. |
| 2 | Fixed-seed regression | PASS (local) | Retained same-seed and baseline parity; full-board reporting/control parity. |
| 3 | Multi-seed distribution checks | NOT TESTED | Retained structural/OT checks ran; no new population calibration or distribution certification. Football equations unchanged. |
| 4 | Full-board load | PASS (local) | 56 games, 392 commits, 336 reads, 56 concurrent HTTP requests. Hosted load NOT TESTED. |
| 5 | Poll/chunk invariance | PASS (local) | Reporting reads are pure; retained regression and paginated rereads. Hosted cadence integration NOT TESTED. |
| 6 | 1x vs 50x invariance | PASS (local) | Retained 56-pair fixed-seed speed suite. No speed constants changed. |
| 7 | Backend persistence/versioning | PASS (local) | PostgreSQL/WASM SQL, atomic CAS, disk reopen, immutable records and retry. Hosted Postgres/backup/outbox NOT TESTED. |
| 8 | Chairman console integration | NOT TESTED | HTTP contract tested locally; separate UI thread. |
| 9 | Public scoreboard integration | NOT TESTED | No public detail endpoint added; separate UI thread. |
| 10 | Mobile Safari | NOT TESTED | Real-device run remains required. |
| 11 | Existing-session compatibility | NOT TESTED | Existing sessions are protected by namespace rejection; no migration attempted. |
| 12 | Chairman candidate approval | NOT TESTED | Development authorized; production activation not authorized. |

## Findings and disposition

**P1 — delivery consistency (corrected in development).** Observed foundation
service accepted an expected run but no expected revision, and omitted generatedAt.
Evidence: foundation service.mjs. Impact: mixed-revision pages and missing stale
metadata. Tests: stale revision, stale source, page continuation. Correction:
revision-bound API, persisted timestamp and explicit re-fetch protocol. Additional
authorization: no, within approved backend scope; activation still separate.

**P1 — trusted access/durability absent (local slice implemented).** Foundation
accepted injected identity and audit without an HTTP/SQL boundary. Evidence:
foundation STATUS.md and reporting service. Impact: no deployable authentication
or durable recovery proof. Tests: spoof/role/session denial, SQL grant recheck,
source manifests, journal conflict/restart. Correction: staged server adapters,
private schema and source consumer. Actual authoritative cloud loader/outbox is
still BLOCKED on isolated runtime integration; production not activated.

**P1 — incomplete record validation (corrected in development).** Foundation
checked finiteness without complete field ranges, accepted unknown scoring source,
and forwarded nested weather/strategy data. Impact: incorrect derived detail or
private nested fields could pass through malformed source. Tests: invalid ranges,
unknown source/ruling/strategy, nested secret fields, per-play score mismatch,
scoreboard-to-scoring-ledger reconciliation. Correction: explicit validation and
allowlisted output. Additional authorization: no, approved normalization scope.

**P2 — punt accounting definition (not changed).** Existing test fixture records
40 net punt yards from OWN 64; engine clamps the endpoint to OPP 1, a 35-yard field
change. Root cause: generated net yardage precedes spot clamping. Impact: recorded
net yardage differs from physical field change. Recommended test/correction:
choose recorded engine net versus adjudicated field change, then add explicit
boundary fixtures. Chairman accounting decision required before changing the
frozen field meaning; current foundation calculation retained.

## Remaining implementation order

1. Connect a 5.1-only authoritative transaction/outbox and atomic revision/audit
   loader. Recover every missed revision from genesis; do not backfill from only
   the latest game snapshot or a truncated audit.
2. Exercise the staged schema/HTTP adapters in an isolated cloud deployment with
   real Auth grants, concurrent transactions, failure injection and recovery.
3. Integrate separate WP/UI branches against the documented contract after
   reviewing current branch changes; settle freeze-at-launch/kickoff wording.
4. Run hosted 50+ game load, network reconnect, Chairman/public UI and Mobile
   Safari gates, then present the complete candidate for release approval.

Rollback for this milestone: keep this development branch inactive. No live
state was changed and no production rollback is necessary.
