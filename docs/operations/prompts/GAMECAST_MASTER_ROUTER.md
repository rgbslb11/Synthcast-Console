# GAMECAST — MASTER OPERATING PROMPT ROUTER

**Purpose:** This document is the entry point for GameCast engineering requests. It classifies the Chairman's request, reads the relevant operating prompt(s) from this repository, and enforces their controls. It is an instruction file, **not** executable automation, a background agent, or evidence of a deployed release.

**Repository:** `rgbslb11/Synthcast-Console`  
**Directory:** `docs/operations/prompts/`  
**Owner:** GameCast Chairman / product owner / football authority

## 1. Start here on every engineering request

1. Restate the Chairman's requested outcome in plain English, including the exact affected surface: authoritative engine/cloud state, Chairman Console, Public Live Scoreboard, or a combination.
2. Verify the actual repository, active release/branch/commit, deployed backend, relevant schema, and available evidence **before** making implementation claims. Do not assume GameCast 5.0.1 is deployed merely because these instructions are labeled post-5.0.1.
3. Classify the request using the table below.
4. **Read the complete contents** of every selected Markdown procedure from the current authorized GitHub ref. A filename or README summary is not a substitute for reading the file.
5. Apply the selected procedure, and this router's standing governance, to the specific request. If source access is unavailable, report **BLOCKED — PROCEDURE NOT LOADED** and do not pretend to have followed it.
6. Ask the Chairman only for product/football/acceptance decisions or genuinely missing inputs; the AI engineering agent owns source inspection, diagnosis, SQL/Git work, implementation, test design, and release preparation.

## 2. Route by actual technical impact

| Request type | Required procedure | Examples |
| --- | --- | --- |
| Approved weekly schedule, team ratings, or data import | `01_WEEKLY_DATA_DEPLOYMENT.md` | Load W08/W09 slate and approved ratings |
| Existing feature is broken or behaves incorrectly | `02_FORENSIC_DEFECT_REPAIR.md` | Deadman fails, stale-version error, UI stops refreshing, incorrect safety |
| Presentation, navigation, search, filtering, or layout with **no** backend/engine change | `03_UI_ONLY_FEATURE.md` | Chairman-only Upcoming filter using existing authoritative data |
| Equations, tuning, probabilities, ratings logic, play/decision mechanics, or football calibration | `04_MATH_PROBABILITY_ENGINE.md` | HFA formula, fourth-down decision policy, weather probabilities |
| New capability requiring UI plus backend, state, API, persistence, or engine work | `05_INTEGRATED_UI_ENGINE_FEATURE.md` | Chairman play-call override requiring authoritative state changes |
| Other bounded operational/configuration/documentation work | `06_MISC_MAINTENANCE.md` | Non-destructive log retention review, documentation maintenance |

**Classification rules:**

- Classify by **required implementation**, not the Chairman's casual wording. A "button" may be an integrated backend feature; a "quick fix" may be a mathematics change.
- A reported defect starts with **02**. If the proven repair also changes football probabilities or decision semantics, add **04** and require football approval. If it changes UI/API/state contracts, add **05**.
- If a UI-only task needs new authoritative commands, backend fields, schema changes, or engine changes, reclassify from **03** to **05** before implementation.
- If a weekly import reveals a defect, use **01 + 02**; do not silently fix unrelated issues.
- Use **06** only for genuine residual maintenance. Never use it to bypass the stricter safeguards in **01–05**.
- When several procedures apply, read all of them; apply the **strictest compatible evidence, test, versioning, and approval gates**. Resolve conflicting directions in favor of preserving authoritative state and obtaining Chairman approval. Flag any unresolved conflict instead of guessing.

## 3. Non-negotiable GameCast controls

- **Authority:** The backend simulation/cloud state is authoritative. The Chairman UI and Public Live Scoreboard render and control that state; neither runs a competing simulation.
- **Traceability:** For a defect, inspect the full path `engine logic → football state → timing → persistence → API → Chairman UI → public UI`, narrowing to the proven failing segment. Separate observed fact, code-derived conclusion, test result, and untested hypothesis.
- **Three clocks:** Preserve independent Master Zulu, Game Length (Launch to Final, including breaks, delays, edits), and football Scoreboard Clock semantics.
- **State integrity:** Preserve possession, field, down/distance, quarter, timeouts, score, line score, lifecycle, seed/run identity, and valid periods `1,2,3,4,OT,2OT,…` (never period 0).
- **Determinism:** Same seed + approved inputs + engine version must reproduce football history. Simulation speed and polling cadence must not change the outcome for equivalent synthetic elapsed time. Live material corrections must preserve past events and use appropriate continuation identity.
- **Governance:** Preserve all prior releases, canonical schedule/team identity, ratings, HFA, probabilities, timing, calibration, accepted/locked/official results, and SEUD publication unless explicitly in approved scope. Never silently alter them.
- **Lifecycle:** Human acceptance is required before a result becomes official. QA results must not enter standings or publication.
- **Change scope:** Do not repair additional issues just because they are discovered. Record evidence, impact, recommended test/correction, and whether authorization is required.
- **Safe delivery:** Use a dedicated branch and preview for code changes. Do not merge/deploy to production, perform destructive database operations, purge data, or overwrite a prior release without explicit Chairman authorization.
- **Database changes:** Verify ownership, row counts, backups, retention, recovery, and affected sessions before any cleanup. Never assume snapshots are redundant without evidence.
- **No fabrication:** Do not invent code findings, test passes, deployed status, PR links, schema details, or source contents. Mark unavailable evidence **NOT VERIFIED** or **BLOCKED**.

## 4. Operating sequence

**Intake → classify → load procedure(s) → inspect live baseline → reproduce/define behavior → propose scoped solution → obtain required football/production authorization → implement in isolation → test → report → await release approval.**

For material football or state-semantic choices, stop for approval **before** implementing. For a straightforward approved defect fix, proceed through isolated implementation and testing, but do not ship production without authorization.

Use a severity label where applicable: **P0** release-threatening, **P1** state-integrity, **P2** realism/calibration, **P3** UI/operator, **P4** future architecture.

For relevant release reviews, mark **PASS / FAIL / NOT TESTED** for engine/state integrity, fixed-seed regression, multi-seed distribution, full-board load, poll/chunk invariance, speed invariance, persistence/versioning, Chairman UI, Public UI, Mobile Safari, existing-session compatibility, and Chairman approval. Do not call a release certified when material gates are untested.

## 5. Response contract to the Chairman

Start with:

- **Request understood:** desired behavior and protected scope.
- **Selected procedure(s):** exact file(s), GitHub ref, and whether full contents were successfully read.
- **Evidence status:** observed facts versus hypotheses; verified current version or **NOT VERIFIED**.
- **Plan / execution:** what will change, what will not, and what requires approval.

For a defect, report **Observed behavior → evidence → root cause/hypothesis → impact → recommended test → proposed correction → authorization required?**

After execution, report exact changed files, branch/commit, tests and outcomes, deployment status, rollback path, remaining issues, and next Chairman decision. Use **BLOCKED** when tools, access, or evidence are missing.

## 6. Invocation example

> GameCast: Use `docs/operations/prompts/GAMECAST_MASTER_ROUTER.md` from the authorized GitHub branch. Read and apply the correct procedure(s) to this request: [describe desired result].

**Important:** This file does not automatically load into every ChatGPT/Codex session. The operating agent or its repository-level instructions must explicitly load it. Adding a repository-level auto-load mechanism would be a separate, approved change.
