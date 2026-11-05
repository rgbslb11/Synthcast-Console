# GC-WP-BOARD-1 — additive QA summary contract

Scope: GameCast 5.1.0 QA only. Existing GC-STATS-1, GC-DELIVERY-1 and per-game WP history remain unchanged. No engine, model, calibration, lifecycle, schema or approved layout changes.

## Request and authorization

GET the existing QA WP endpoint with `session=qa-v510-…&view=board&games=G0502,G0503,…`.

`games` contains 1–56 unique IDs matching `G[0-9]{4}`. Request order is response order. Invalid scope, duplicate IDs or an empty/oversize list return 400. POST to this view returns 405. No pagination or write semantics apply.

Use the existing Supabase password sign-in flow with a nonanonymous QA user and an active session-specific Chairman reporting grant. Send its access token as `Authorization: Bearer …`. JWT verification remains enabled; the handler authenticates the user and the SQL snapshot rechecks the current grant. There is no authorization cache. Allowed browser origin remains `https://rgbslb11.github.io`. Missing authentication returns 401; revoked/absent grants return 403. Database failures return 503. Responses use `Cache-Control: no-store`. No service or worker credential is sent to a browser.

## Response

- `contractVersion`: exactly `GC-WP-BOARD-1`.
- `sessionId`: requested QA session.
- `sourceVersion`: committed source revision, or null when absent.
- `wpVersion`: observed source revision, or null when absent.
- `games`: exactly one `{gameId, summary}` entry per requested ID, including missing games. Summary fields retain the existing per-game WP contract. No history, captures, pending outcomes or football state payload is included.

Authorization, heads and projection progress are read in one SQL snapshot. Missing heads return `BLOCKED / NO_COMMITTED_OBSERVATION`, null probability and grey status. Missing/mismatched source/projection versions make every entry `BLOCKED / WP_SOURCE_PENDING` with null probability. These conditions never substitute a prior probability. Missing heads need not supply run/model identity.

## UI and history

Poll this view once every five seconds while the authorized board is visible; do not overlap board polls or let slow detail loads queue summary polls. Cancel on connection/navigation changes and ignore responses from superseded connections. Keep summaries only in memory and clear them on failed authorization, disconnect and reload.

On opening a game, a summary may temporarily populate its existing WP panel only when session, game, run and state revision match the committed detail response and the summary is no more than ten seconds old. It contains no invented history or frozen pregame prior. Display history loading until the separate per-game history request completes. Fresh BLOCKED summaries take precedence over cached history. Keep existing run/cursor validation and pinned immutable history pagination. No board probability badge or layout change is added.

## Model and QA boundary

Estimates remain illustrative, calibration deferred and nonterminal overtime unsupported. Existing kickoff freeze, overrides, cancellation and terminal behavior remain unchanged. Summary reads cannot create observations, alter gameplay, sample RNG or accept results.

Validate exact 56-entry cardinality and ordering, revocation, missing heads, pending source, no journal writes and per-game summary equivalence. Test normal-user board polling plus independently requested selected-game history at five-second intervals for a bounded three-minute window. Report this separately from the heavier 56-concurrent-history stress test; a successful board test does not erase that result or certify production. Final-only transport testing does not establish active-game sampler cadence.
