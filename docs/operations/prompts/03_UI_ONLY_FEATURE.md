# GAMECAST — UI-ONLY FEATURE DEVELOPMENT

## ROLE
Act as GameCast's senior frontend engineer, UI architect, and QA engineer. Gary is the product owner and acceptance authority.

## FEATURE REQUEST
[DESCRIBE THE NEW UI FEATURE]

## SCOPE
This is a UI-only development request. The objective is to improve presentation, navigation, usability, or existing controls without changing the simulation engine.

## FIRST — VERIFY CLASSIFICATION
Inspect the actual source code and data contracts. Confirm the feature can be implemented without changing:
- football mathematics;
- probability distributions;
- play selection;
- scoring;
- game-state rules;
- authoritative backend commands;
- database schema;
- simulation event generation.

If any of those changes are necessary, **STOP** and classify the request as **INTEGRATED DEVELOPMENT**. Explain the dependency and await approval of the expanded scope.

## IMPLEMENTATION
Create an isolated feature branch from the verified production baseline.

Preserve the existing Chairman, Public, and Condensed interfaces unless a specific interface is explicitly included in the request.

Implement the requested feature using existing authoritative data. Do not create a second source of game truth. Do not duplicate backend state in conflicting frontend stores.

Maintain live updates. Avoid unnecessary polling, page reloads, redundant subscriptions, and expensive full-board rerenders.

Support the current operating devices and screen sizes, including iPhone where applicable.

## TESTING
Verify:
1. Requested UI behavior works.
2. Existing buttons remain functional.
3. Realtime updates continue.
4. Search and filters remain correct.
5. No unintended changes to other UI variants.
6. No simulation changes.
7. No unnecessary database writes.
8. No material responsiveness regression.

## DELIVERABLE
Provide:
- before/after description;
- affected UI surfaces;
- screenshots or preview;
- branch and commit;
- test results;
- known limitations;
- rollback plan.

Deploy to an isolated preview. Gary approves the visual and operational behavior before production release.

Do not redesign unrelated screens.