GameCast control investigation — 2026-10-12

Observed: all 41 operating games FINAL_PENDING; session v11168 last advanced 2026-10-11 08:12:51Z. Screenshot PROGRESSION_INTERVAL_INVALID. All commands called advance before mutation; >6h guard rejected finished boards.

Chairman logs 12:50–13:56Z: 89 reads mean 1070ms max 4011ms; four commands all409 mean1299ms. Full stored state 1,590,361 JSON bytes. Every click performs a separate read; per-board version races and global writing guard remain. Receipt stores full state each commit. These are observed design costs, not yet isolated latency attribution.

Deployed Chairman v8: permit zero-time advance after long idle only when all games unlaunched/finalish and not auto/onAir; retain guard for live/edit/delay. Parallel independent snapshot/finals reads. Cache successful Chairman preflight 600sec, with origin/auth enforcement retained. No football changes or production game mutations performed by this investigation.

Tests: node release-assets/v5.0.0/backend/test-controls.mjs —16 local handler/engine checks, simulated commit boundary. Not a hosted end-to-end write test.

Remaining: Start Auto, Stop, Edit Game, Final, Accept, Lock, Dead-Man each need hosted interaction timing under scheduler contention; reproduce with realistic full-history state; address redundant frontend read safely using per-game preconditions rather than blind rebase; remove silent ignored clicks with explicit busy feedback; inspect full-state receipt/persistence costs. Browser/mobile responsiveness and all three hosted surfaces NOT VERIFIED this turn. Scheduler function v5 still has old >6h guard; completed slate is not selected by scheduler. Long outage recovery of active games remains deliberately blocked pending explicit semantics.

Additional DB evidence: requests relation is 2228 MB for estimated11166 live rows. Lifetime pg_stat_statements: commit_state RPC11166 calls mean137.07ms max673.42ms; read_session35096 calls mean14.96ms max99.57ms; finals reads mean1.81ms. SQL execution alone does not account for the observed >1sec edge read latency. Static hosted-surface source gates19/19 PASS; these are not browser interaction tests.
