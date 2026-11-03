# 5.1.0 foundation milestone — November 3, 2026

Development only. No 5.1.0 deployment exists. This branch is based on the released Week11 source and adds reporting modules without modifying it. The prior WP development branch is retained, not merged wholesale.

| # | Workstream | Current evidence |
|---|---|---|
| 1 | Freeze data contract | GC-STATS-1 field inventory and semantics committed: 17/27/22 + 2 field features + 1 chart |
| 2 | Implement access and correction blocking | Server service policy locally tested; trusted production identity/audit adapter still required |
| 3 | Normalize resolved plays | Pure adapter implemented and exercised on 56 full simulated games; unknown records fail closed |
| 4 | Team stat calculations | All 27 output keys implemented; hand-checked scoring/yardage/safety/turnover fixtures pass; broader statistical audit pending |
| 5 | Possession and field functionality | Backend possession grouping and field coordinates implemented; interactive UI not yet built |
| 6 | WP calculation | Exact supplied illustrative model ported from cd26ed23; four pure-model tests pass; actual priors, expanded late-game/OT model and durable journal remain blocked/pending |
| 7 | Live delivery and recovery | Pure revision/run-bound paginated service implemented; actual API, immutable journal, reconnect and database recovery integration pending |
| 8 | Regression and load check | 24 foundation tests pass, including 56-game source immutability; retained release suite run separately. Cloud/reporting load NOT TESTED |
| 9 | Scoreboard-Stats-Rollup UI | Contract and access states defined; implementation pending |
| 10 | Detailed stats UI | Field/table inventory defined; implementation and final design acceptance pending |

Tests are local author verification, not production certification. Request identity/session grants must be supplied by trusted server adapters, never copied from browser input. The service is intentionally not registered on the public API. Source history/audit must be loaded atomically at one revision. Correction evidence covers the entire session/game so a restart cannot erase it.

Code changes: reporting/access.mjs, normalize.mjs, statistics.mjs, field.mjs, service.mjs, illustrative-wp.mjs. Statistical ratios are unrounded; formatting belongs in the client. Regulation-only coverage remains explicit; score includes overtime. The supplied WP formula remains experimental and cannot provide a nonterminal OT probability. Calibration is deferred, not a barrier to local experimentation.

No cloud writes, cron changes, published UI, ratings updates, or live session mutations were performed for this milestone. Runtime APIs and UI adapters remain a subsequent implementation stage; no ready claim is made for them. Rollback: leave the branch unused.
