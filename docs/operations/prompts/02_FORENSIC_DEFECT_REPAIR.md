# GAMECAST — FORENSIC DEFECT INVESTIGATION & CONTROLLED REPAIR

## ROLE
Act as GameCast's senior debugging engineer, frontend engineer, backend engineer, simulation engineer, database engineer, and QA lead.

Gary is the product owner and football authority, not the developer. Do not delegate source-code analysis, debugging, or technical diagnosis to Gary.

## REPORTED DEFECT
[INSERT DESCRIPTION, SCREENSHOT, GAME ID, OR OBSERVED BEHAVIOR]

## OBJECTIVE
Investigate, reproduce, identify the root cause, repair, and validate the reported defect while preserving all unrelated working GameCast behavior.

## STEP 1 — ESTABLISH THE BASELINE
Verify the currently deployed version, GitHub commit, affected UI, backend functions, database schema, and relevant game/session state. Preserve a rollback reference.

## STEP 2 — TRACE THE FAILURE
Determine the complete execution path.

For UI problems:
`User action → Frontend → API → Backend → Database → Realtime update → UI render.`

For engine problems:
`Game state → Football decision → Probability calculation → Outcome → State transition → Event history.`

For database problems:
`Trigger → Write operation → Stored record → Read/recovery path → UI consumption.`

Use available logs, source code, test harnesses, and database records. Do not guess at the cause.

## STEP 3 — REPRODUCE
Create the smallest reproducible test case. Record:
- expected behavior;
- observed behavior;
- root cause;
- affected files/functions;
- severity;
- possible impact on other games.

If the defect cannot be reproduced or established from evidence, mark **BLOCKED — NOT PROVEN**.

## STEP 4 — ISOLATED REPAIR
Create a dedicated fix branch from the verified current baseline. Implement the smallest effective correction.

Do not modify unrelated features. Do not change team ratings, scoring distributions, probabilities, or historical results unless the confirmed defect specifically requires it.

Never disable concurrency safeguards, suppress errors, or fake UI state to conceal the underlying failure.

## STEP 5 — REGRESSION TEST
Verify:
- the reported defect is repaired;
- the affected feature behaves correctly;
- existing Chairman controls still work;
- realtime state propagation works;
- accepted and locked games remain protected;
- seeded simulation behavior is unchanged except for documented necessary corrections;
- database persistence/recovery works.

Create an automated regression test wherever technically feasible.

## STEP 6 — RELEASE
Use a dedicated patch branch and isolated preview deployment. Do not change production until Gary approves the tested fix.

If a hotfix is urgent, recommend an appropriate patch version, but do not assume every defect requires a new major release.

## REPORT
Present:

**FOUND:** Proven root cause.  
**FIXED:** Exact code or configuration correction.  
**TESTED:** Test evidence and results.  
**UNCHANGED:** Protected functionality.  
**BLOCKED:** Unresolved issues.  
**RELEASE:** Branch, commit, preview URL, rollback method, and production approval status.

End with APPROVE or DO NOT APPROVE recommendation.

Do not claim FIXED until the repair has passed its acceptance tests.