# GameCast Post-5.0.1 Operating Prompts

Six reusable Markdown prompts for an AI coding/deployment agent. **These are instructions, not evidence that GameCast 5.0.1 is deployed.** The agent must inspect the live baseline before making changes.

## Which prompt to use

| File | Use when |
| --- | --- |
| `01_WEEKLY_DATA_DEPLOYMENT.md` | Load approved weekly schedule and ratings, beginning with W08. |
| `02_FORENSIC_DEFECT_REPAIR.md` | Investigate and fix a UI, backend, database, or football-engine defect. |
| `03_UI_ONLY_FEATURE.md` | Add or change an interface feature without engine/backend behavior changes. |
| `04_MATH_PROBABILITY_ENGINE.md` | Change mathematics, probabilities, football decision rules, or calibration. |
| `05_INTEGRATED_UI_ENGINE_FEATURE.md` | Build a UI feature that requires backend or simulation changes. |
| `06_MISC_MAINTENANCE.md` | Configuration and other maintenance, escalating to a stricter prompt when needed. |

## Operator workflow

1. Choose the matching Markdown file.
2. Paste its content into your AI coding agent, or direct the agent to read that file from the repository.
3. Fill in the bracketed request/defect details, and attach files or screenshots when applicable.
4. Review the agent's plain-English findings, tests, and proposed release.
5. Approve production activation or destructive database changes explicitly when requested.

## Standing governance

- Gary is the product owner and football authority, **not** the developer.
- Confirm the real deployed version and commit; do not assume 5.0.1 has shipped.
- Isolate code changes on branches and preserve rollback.
- Preserve canonical results, accepted/locked games, deterministic behavior, and existing live UI unless the approved change explicitly requires otherwise.
- Do not perform unverified destructive Supabase operations.
- Do not claim a fix or deployment succeeded without evidence.
- The W08 expectation of 56 games and 121 rated teams is a starting reconciliation target, subject to verified approved source revisions.

## Suggested repository location

`docs/operations/prompts/`

## Package provenance

Compiled from the six GameCast operating prompts in the immediately preceding conversation response. Markdown was chosen over XML for direct human review, GitHub diffs, and easy AI-agent ingestion.