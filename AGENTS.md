# AGENTS.md — GameCast Coding Agent Instructions

This file applies to the entire `rgbslb11/Synthcast-Console` repository. It is the **Codex repository entry point** for GameCast engineering work.

## Mandatory startup for GameCast requests

1. **Before investigating, editing, testing, or deploying**, read the **complete** local repository file:
   `docs/operations/prompts/GAMECAST_MASTER_ROUTER.md`
2. Classify the Chairman's request using that router, then read the **complete** text of each applicable procedure under `docs/operations/prompts/`:
   - `01_WEEKLY_DATA_DEPLOYMENT.md`
   - `02_FORENSIC_DEFECT_REPAIR.md`
   - `03_UI_ONLY_FEATURE.md`
   - `04_MATH_PROBABILITY_ENGINE.md`
   - `05_INTEGRATED_UI_ENGINE_FEATURE.md`
   - `06_MISC_MAINTENANCE.md`
3. If multiple procedures apply, load all relevant ones and apply the strictest compatible safety, testing, and authorization requirements.
4. Use the **checked-out repository files** for the active task branch; if working via GitHub connector rather than a local checkout, retrieve the same files from the verified authorized ref. Never claim to have read a file based only on its filename or a summary.
5. If the router or required procedure cannot be read, report **BLOCKED — PROCEDURE NOT LOADED** before modifying code or state. Do not silently substitute assumptions.
6. State which procedure(s) were loaded, the inspected source ref, and the verified baseline in the initial substantive report.

## GameCast engineering authority and boundaries

- The Chairman is the product owner, football authority, and acceptance authority, **not the software engineer**. The agent performs source inspection, debugging, design, Git operations, SQL investigation, implementation, and testing.
- The cloud backend is authoritative; Chairman Console and Public Live Scoreboard must reflect the same state. Never create a competing UI simulation.
- Preserve Master Zulu, Game Length, and football Scoreboard Clock as separate clocks.
- Preserve deterministic seeded replay, speed/poll invariance, football state integrity, lifecycle, accepted results, release history, and existing sessions unless the specifically approved change requires otherwise.
- **Do not silently retune** ratings, HFA, scoring/play probabilities, timing, football decision policies, schedules, or official results.
- Investigate defects end to end and distinguish **observed evidence**, **code-derived conclusions**, **test results**, and **untested hypotheses**.
- Do not make unrelated corrections. Document out-of-scope findings and await authorization.
- Do not merge to production, deploy production code, publish official results, purge/modify production data destructively, or overwrite prior releases without explicit Chairman authorization.
- Use an isolated branch for code changes and provide tests, diff/commit, rollback, and approval status. Do not infer deployed release identity from documentation.

## Agent response standard

For every substantive engineering task, communicate:
- **Request and protected scope**
- **Router and procedure(s) loaded**
- **Actual verified baseline and evidence**
- **Findings, impact, proposed correction, and approvals required**
- **Changed files, test outcomes, preview/release status, and rollback**

If an agent cannot access the repository files, it must request access or report a blocker rather than claiming automatic routing succeeded.

**Scope note:** `AGENTS.md` provides repository-level instructions for compatible coding agents such as Codex when they load this repository. It does **not** install a background service, modify ChatGPT's global instructions, or force unrelated chat sessions to load these files.
