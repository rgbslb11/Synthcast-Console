# GameCast Project Source Manifest — Current Sandbox Baseline

Updated 2026-09-18 UTC. Current baseline: 4.3.1 product / 4.2.3 UI lineage / 4.2.2 football mechanics.

Repository: `rgbslb11/Synthcast-Console`; branch: `release/gamecast-v4.3.1`; pinned commit: `8163e9d1a2b22789f0579a761d1e4ae926eaa430`.

## Exact reconstruction inputs

Read and retain the pinned versions of:
1. `scripts/build-gamecast-v43.mjs`
2. `scripts/build-gamecast-v431-base.mjs`
3. `scripts/build-gamecast-v431.mjs`
4. `supabase/functions/gamecast-week3-v4-2-2/index.ts` and direct source imports `week3.ts`, `power.ts`
5. `public/v4.2.3/index.html` and `app.js`
6. `release-assets/gamecast-v4.3/week4.ts` and `power.ts`
7. `release-assets/gamecast-v4.3.1/power.ts`
8. `public/v4.2/app.css`, `public/v4.2/patch-rc2.js`, `public/v4.2.2/patch-422.js` and linked review assets for full UI testing
9. `GAMECAST_4_3_1_CORRECTIVE_RELEASE.md`
10. `.github/workflows/deploy-v431-release.yml` for provenance only; do not trigger deployment as part of sandbox setup
11. `scripts/verify-gamecast-v431-power.mjs`, engine/UI test scripts and package files before choosing test commands

Run the generator only in an isolated local checkout: `node scripts/build-gamecast-v431.mjs`. It generates `supabase/functions/gamecast-week4-v4-3-1/{index.ts,week4.ts,power.ts}` and `public/v4.3.1/{index.html,app.js,patch-431.js}`. These generated paths are not committed in the inspected tree. The generator overwrites its generated output directories locally, so do not run it over a modified experimental candidate without preserving those changes.

Runtime authority is generated/deployed index.ts plus week4.ts and power.ts. Do not substitute retained engine-core.ts.

Power artifact Git blob: `6eb58cdc1bce4f5a63b8c62e23f72a397c2f8f55`.
Schedule artifact Git blob: `9a4095335fd1b440017641c9cc514b2a01510739`.
SHA-256 runtime witnesses and exact deployed identities are in GAMECAST_PROJECT_CURRENT_STATE.md.

Reconstruction and exact deployed-source/UI asset comparisons PASS as recorded there. Simulation gates remain NOT TESTED in this update. The retained verification script can create cloud sessions unless invoked in its source-only mode; do not run cloud checks against existing operational endpoints for sandbox experimentation.

## Persistent and historical boundaries

The attached `download_GAMECAST_4_2_2_project_sources.ps1` remains an unchanged historical downloader pinned to a55561fb346d1149352ea7bca1acf417c4ab37c6. It does not fetch the current 4.3.1 baseline. The v1.2.0 population PDF remains mathematical lineage, not proof of current runtime implementation.

Current deployed source takes precedence for deployment behavior; the pinned current GitHub build establishes reproducibility. Old snapshot data and prior assistant summaries do not override either. Inspect actual database schema/RPCs before a cloud sandbox design; no storage migration is authorized by this registry update.

---

## Historical 4.2.2 manifest — retained for reference only

# GameCast Project Source Manifest

Use this manifest to populate the ChatGPT Project with an exact source snapshot for engineering review.

## Snapshot identity
- Repository: `rgbslb11/Synthcast-Console`
- Branch lineage: `release/gamecast-v4.2.2`
- **Pinned commit:** `a55561fb346d1149352ea7bca1acf417c4ab37c6`

The downloader script in this project pack uses the pinned commit rather than a moving branch so the uploaded files remain a reproducible reference snapshot.

## Priority A — upload these to the ChatGPT Project
These files are the minimum useful engineering source set.

### Authoritative cloud runtime
1. `source/backend/index.ts`
   - Current 4.2.2 Edge Function runtime and football/state logic.
2. `source/backend/power.ts`
   - Week 3 60–99 TEAM/OFF/DEF package.
3. `source/backend/week3.ts`
   - Canonical 51-game Week 3 schedule mapping.
4. `source/backend/engine-core.ts`
   - Retained engine lineage/reference. **Not imported by current runtime `index.ts`; do not mistake it for runtime authority.**

### Chairman / public UI
5. `source/ui/index.html`
6. `source/ui/app.js`
7. `source/ui/patch-422.js`
8. `source/ui/shared-app.css`
9. `source/ui/shared-patch-rc2.js`

### Release / QA evidence
10. `source/docs/GAMECAST_4_2_2_CORRECTIVE_REVIEW.md`
11. `source/docs/GAMECAST_4_2_CALIBRATION_2500.md`
12. `source/docs/GAMECAST_4_2_IMPLEMENTATION.md`
13. `source/workflows/qa-v422-cloud-session.yml`
14. `source/workflows/deploy-v422-supabase.yml`
15. `source/workflows/deploy-v422-preview.yml`

## Priority B — strongly recommended for simulation hardening
16. `source/scripts/test-gamecast-v422-engine.mjs`
17. `source/scripts/audit-gamecast-v422.mjs`
18. `source/scripts/audit-gamecast-v422-week3.mjs`
19. `source/scripts/calibrate-gamecast-v422.mjs`
20. `source/scripts/build-gamecast-v422.mjs`
21. `source/scripts/wire-gamecast-v422-ui.mjs`
22. `source/package.json`

## Optional lineage/reference files
23. `source/docs/GAMECAST_4_2_1_RELEASE.md`
24. `source/docs/README_REPO.md`
25. `source/ui/v421-review.html`
26. `source/ui/v421-power-421.js`

## Database boundary
The repository snapshot does not contain a Supabase migrations directory defining the deployed `gamecast_v12` RPC/table layer. The current Edge Function relies on the deployed RPCs used for session create/read/update/event insertion.

Therefore:
- do not infer database DDL from the repository;
- when a future task depends on table/RPC definitions, inspect the connected Supabase project first;
- do not rewrite the storage layer from assumptions.

## Source hierarchy for future work
When sources disagree, use this order unless the Chairman explicitly says otherwise:
1. Current live GitHub release branch / explicit commit selected for the task
2. Current deployed Supabase runtime/state for cloud-behavior questions
3. Project snapshot source files
4. Release/calibration documentation
5. Prior-chat summaries

Never silently reconcile a mismatch. Surface it.
