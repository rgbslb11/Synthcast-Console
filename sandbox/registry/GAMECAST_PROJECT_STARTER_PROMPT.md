# GameCast — Sandbox Engineering Starter Prompt

Use the updated GAMECAST_PROJECT_CURRENT_STATE.md, GAMECAST_PROJECT_INSTRUCTIONS.md and GAMECAST_PROJECT_SOURCE_MANIFEST.md first.

Current verified baseline: GameCast 4.3.1 product, 4.2.3 UI lineage, 4.2.2 football mechanics. Pin rgbslb11/Synthcast-Console commit 8163e9d1a2b22789f0579a761d1e4ae926eaa430 on release/gamecast-v4.3.1. Current deployed engine is GC-W4-V4.3.1-RC1, function gamecast-week4-v4-3-1, Week 4, 55 games. Retain the 121-team v1.1 ratings package and four additional FCS rows at 60/60/60.

The current route is dark. Do not assume the proposed light Chairman console was implemented.

The Chairman wants engine changes tested only in a sandbox. The registry has been updated; an isolated runtime has not been provisioned. First identify the particular requested modifications. Reconstruct the pinned baseline in an isolated checkout, verify it against the registry hashes, and establish isolated execution/persistence before running experiments. Do not reuse the current function, operator credentials, session namespace or browser storage binding for candidate writes.

Do not trigger existing deployment workflows or publish a replacement. No production merge, SEUD publication, accepted-result change, live session migration, silent version bump, ratings/schedule change or unrelated correction is authorized.

Preserve the three clocks, state integrity, seeded reproducibility and all previously protected mechanics except changes explicitly selected for the sandbox experiment. Report baseline versus candidate results and PASS / FAIL / NOT TESTED for all 12 release gates. Source identity verification is not football certification.

Keep all seven backlog items separately tracked: (1) endgame decisions, (2) causal Game Length variance, (3) Chairman scoring influence, (4) play-by-play/drive/statistics ledger, (5) randomized reciprocal half receipts, (6) weekly slate upload/lock, (7) light Chairman theme. Discussed designs are not completed features or blanket implementation authorization.
