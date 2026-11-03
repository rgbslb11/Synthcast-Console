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
