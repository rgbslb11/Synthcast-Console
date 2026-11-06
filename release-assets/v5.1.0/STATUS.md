## 2026-11-06 — authenticated session board

Dedicated login accepted by the Chairman. Automatic authorized roster and lifecycle filters implemented on `feature/v510-session-board` (PR #30). 157 unit/regression and 17 SQL checks pass; Chromium/WebKit CI 42156049913 and hosted publication 42156049841 pass, including all 56 games and reconnect recovery. QA WP v16 deployed with JWT verification and exact bundle readback. See [SESSION-BOARD-READINESS-20261106.md](SESSION-BOARD-READINESS-20261106.md) for current publication evidence, preservation and remaining release work. Earlier records below are historical.

## 2026-11-05 — assembled development candidate

Backend/WP `c3d19c0` and approved board UI `671183ee` are combined on
`integration/v510-readiness-20261105`. 153 unit/regression tests, 15 existing
SQL tests and one new 56-game full-game SQL rehearsal pass locally (169 total).
All 56 games reached natural FINAL_PENDING without acceptance. This is not
hosted capacity certification. See INTEGRATED-READINESS-20261105.md for exact
source inputs, live read-only observations, all ten workstreams and twelve gates.
Publication retry and combined CI must be checked separately; production is not ready.

Earlier entries below are historical milestones, not a complete current status.

## 2026-11-03 — isolated hosted command path

101 local tests PASS. QA command endpoint deployed with JWT verification enabled.
Hosted 56-game database check: 168 receipts, 434 plays, all projections available,
no pending revision, zero active grants. Positive signed-in HTTP remains BLOCKED
by the rejected temporary privileged QA harness; it was not deployed.
See [HOSTED-COMMAND-QA.md](HOSTED-COMMAND-QA.md) for exact evidence and limits.
No production activation. Launch = WP freeze remains unchanged.

## Source/outbox milestone — November 3, 2026

QA source commits and durable outbox are now implemented and provisioned.
Two-game hosted recovery passed. Read-only QA details Edge Function v1 is active
with JWT verification; unauthenticated request returned 401. 98 local tests PASS.
Positive signed-in HTTP, hosted engine caller, concurrent load, WP/UI and Safari
remain unverified/incomplete. See SOURCE-OUTBOX-QA.md for exact boundaries.
Earlier milestone records below are historical.

---

## Subsequent integration and cloud QA — November 3, 2026

Backend commit 5a0456ac was fast-forwarded into development/gamecast-v5.1.0
with an expected-head lease after checking concurrent WP changes. All 97 local
tests passed again. Chairman resolved WP freeze: **Launch freezes WP**.

Private gamecast_v510 schema is now provisioned in xsvdmcipviejxynkdbhq.
This is schema isolation on the existing project, which also hosts Week 11;
it is not a separate cloud project. Bounded hosted PostgreSQL smoke checks passed.
No Edge Function, cron, UI, live game or existing-release schema was changed.
One QA-only reporting fixture remains; zero reporting grants remain.

See CLOUD-QA-20261103.md. Authoritative source/outbox wiring, hosted HTTP/Auth,
concurrent load, WP/UI and mobile integration remain incomplete. The foundation
and backend milestone record below describes the earlier pre-cloud state.

---

# 5.1.0 backend delivery milestone — November 3, 2026

**DEVELOPMENT ONLY — NOT RELEASE READY.** Dedicated branch:
`development/gamecast-v5.1.0-backend`, from foundation
`f0eb2a56df7fe8d10e1f7739a261a1d5084b6699`.
Router and procedures 04/05 read in full. Current scope is backend reporting,
access/correction policy, delivery/recovery, and regression. WP and UI remain
separate owners. No production activation or integration merge was performed.

| # | Workstream | Current evidence / remaining work |
|---|---|---|
| 1 | Freeze data contract | Existing GC-STATS-1 unchanged: exact 17/27/22 + 2 + 1 inventories. Additive GC-DELIVERY-1 and BACKEND-INTERFACES.md define transport, cursor, unknown fields and handoff. |
| 2 | Access and correction blocking | Auth-verifying HTTP adapter, database session grants, repeated SQL authorization, source-audit validation, sticky correction evidence; local tests pass. Hosted Auth/source loader not connected. |
| 3 | Normalize resolved plays | Strict state/category/ruling/strategy/score-prefix checks; original descriptions retained; nested output allowlisted. 56 full histories plus boundary fixtures pass. |
| 4 | Team stat calculations | Exact 27 rows retained; scoring ledger reconciles to line score; independent mixed-drive fixture passes; missing TOP is explicit. Punt interpretation noted for Chairman decision. |
| 5 | Possession and field functionality | Exact scoreboard inventory, live/historical field, halftime and regulation-end boundaries; OT field explicitly BLOCKED. Graphical interaction remains UI-owned. |
| 6 | WP calculation | Existing illustrative module and tests unchanged; shared identity/correction/revision interface documented. No sampler or WP journal implemented here. Launch-versus-kickoff freeze wording needs cross-thread coordination. |
| 7 | Live delivery and recovery | Revision/run-bound read handler, bounded summary, immutable PostgreSQL play/source/run journals, source manifest consumer, idempotent receipts, gap detection and disk reopen tests pass locally. Actual authoritative outbox/loader and isolated cloud wiring remain pending. |
| 8 | Regression and load check | 38 local 5.1 tests + 5 PostgreSQL runtime tests + 54 retained release tests pass. 56-game reporting exercise passes; hosted load, networking and browser gates NOT TESTED. |
| 9 | Scoreboard-Stats-Rollup UI | Exact 17-field backend payload and availability handoff ready for separate UI thread; UI implementation not changed. |
| 10 | Detailed stats UI | Pagination/reconnect, 27-row statistics, field, possessions and blocked payload interface documented; UI implementation not changed. |

See BACKEND-VERIFICATION.md for commands, evidence, all twelve release gates and
limitations. Local SQL uses pinned PGlite PostgreSQL/WASM with disk close/reopen;
it is not hosted Supabase durability or concurrent-transaction certification.

Protection diff confirms no changes to `public/v5.0.6`,
`release-assets/v5.0.6-week11`, or `deploy-v506.yml` from protected base 754d959.
No cloud writes, live-session mutations, cron changes, publication, ratings or
schedule changes. No 5.1 cloud deployment or preview URL exists from this work.
Rollback: leave the backend branch unused; if development integration occurs,
revert this backend change set. No production restoration is required.
