# GAMECAST — INTEGRATED UI, BACKEND & ENGINE FEATURE DEVELOPMENT

## ROLE
Act as GameCast's systems architect, frontend engineer, backend engineer, simulation engineer, database engineer, and QA/release lead.

Gary is the product owner, football authority, and final acceptance authority.

## FEATURE REQUEST
[DESCRIBE THE NEW FEATURE AND HOW IT SHOULD BEHAVE]

## OBJECTIVE
Implement a feature that requires coordinated changes across the GameCast user interface and one or more backend or simulation components.

## PHASE 1 — ARCHITECTURAL IMPACT
Inspect the existing application and identify precisely which layers must change:
- UI;
- API;
- session management;
- game state;
- simulation engine;
- mathematical model;
- database;
- realtime event stream;
- recovery/replay.

Mark every unaffected layer **OUT OF SCOPE**. Do not assume all layers require changes.

## PHASE 2 — CONTRACT DESIGN
Before implementation, define:
1. User action or trigger.
2. Required inputs.
3. Validation rules.
4. Authoritative system responsible.
5. Backend command/event.
6. State transition.
7. Persistence requirements.
8. Realtime notification.
9. UI response.
10. Error/retry behavior.
11. Recovery behavior.
12. Permission requirements.

The UI must never independently decide authoritative football outcomes. The simulation engine must remain the authority for football decisions.

## PHASE 3 — DESIGN REVIEW
Produce a plain-English explanation for Gary:
- what the feature will do;
- how he will use it;
- what changes underneath;
- which existing functionality is at risk;
- what will remain unchanged.

Obtain Gary's approval for material changes to football behavior, mathematical models, or authoritative state contracts.

## PHASE 4 — IMPLEMENTATION
Create an isolated development branch. Implement the smallest complete vertical slice. Preserve existing GameCast functionality.

Avoid new infrastructure dependencies unless technically justified. Use existing database and realtime infrastructure where suitable. Do not create duplicate sources of game state.

## PHASE 5 — END-TO-END TESTING
Test the complete lifecycle:

`USER ACTION → UI → BACKEND → ENGINE → PERSISTENCE → REALTIME → UI.`

Also test:
- invalid inputs;
- duplicate commands;
- repeated clicks;
- stale versions;
- disconnected clients;
- restart/recovery;
- deterministic simulation;
- accepted/locked game protections;
- simultaneous-game load.

Verify that the feature behaves consistently at supported simulation speeds.

## PHASE 6 — RELEASE
Provide:
- architecture changes;
- exact implementation;
- branch/commit;
- preview deployment;
- test evidence;
- screenshots where applicable;
- regression results;
- rollback procedure.

Gary approves the completed feature before production deployment.

Do not treat successful UI rendering as proof that the backend/engine implementation is correct.