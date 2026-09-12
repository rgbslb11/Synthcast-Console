# SYNTHCAST SCOREBOARD UI 1.0

Status: BUILT FOR REVIEW on `release/scoreboard-ui-v1.0`; not deployed; not merged to production.

## Purpose

Create a separate public-facing, mobile-first scoreboard that consumes authoritative GameCast public state while leaving the Chairman / Control Console unchanged.

## Architecture

- Source of truth: existing `gamecast-week3-v4-2-2` public read endpoint.
- Engine identity remains `GC-W3-V4.2.2-RC1`.
- No operator token is accepted or stored.
- No POST/write paths are implemented.
- No independent simulation or local football state is created.
- Existing GameCast 4.2.3 files are unchanged.

## UI behavior

- Mobile-first single-column compact game cards.
- 2 columns at 560px+, 3 columns at 900px+, 4 columns at 1250px+.
- Compact header with Week, local time, sync status.
- Summary counters for LIVE, FINAL, UPCOMING, DELAY.
- Filters: ALL, LIVE, FINAL, UPCOMING.
- Optional SEN / SEN+ / EBC network-only filter.
- Compact card shows status, game ID, network, teams, scores, and possession marker.
- Tap expands a game to show down/distance/field position, timeouts, quarter-by-quarter line score, and last play.
- Operational sort order: DELAY/LIVE first, then most-recent finals, then upcoming by kickoff order.
- Background public read every 4.5 seconds.
- Card reconciliation updates only changed game cards rather than replacing the entire scoreboard DOM.

## Files

- `public/scoreboard/v1.0/index.html`
- `public/scoreboard/v1.0/scoreboard.css`
- `public/scoreboard/v1.0/scoreboard.js`
- `scripts/test-scoreboard-ui-v1.mjs`

## Validation performed

Local static regression: PASS.

Checks include:

1. iPhone-safe viewport configuration exists.
2. Responsive 1/2/3/4-column breakpoints exist.
3. Public client is bound to `gamecast-week3-v4-2-2`.
4. Reads use `cache: no-store`.
5. Poll interval is 4.5 seconds.
6. Game-level reconciliation and expansion state are implemented.
7. SEN/EBC filter is present.
8. No operator-token header or storage exists.
9. No POST requests, create action, or command action exists in the public client.

Local syntax check of `scoreboard.js`: PASS.

A local mock-browser screenshot attempt was blocked by the execution environment's headless Chromium process behavior; therefore native visual rendering remains NOT TESTED in this review build.

## Change control

No GameCast engine code, ratings, schedule, accepted results, session namespace, lifecycle semantics, or 4.2.3 Chairman UI files were modified.

No deployment workflow was added or invoked. Deployment requires separate Chairman authorization after review.

## Release gates

| # | Gate | Status | Evidence / limit |
|---|---|---|---|
| 1 | Engine/state integrity | PASS | Read-only UI; engine untouched. |
| 2 | Fixed-seed regression | NOT APPLICABLE | No engine changes. |
| 3 | Multi-seed distribution checks | NOT APPLICABLE | No engine changes. |
| 4 | Full-board checks | NOT TESTED | Requires live-session/browser validation. |
| 5 | Poll/chunk invariance | NOT APPLICABLE | UI performs public reads only. |
| 6 | 1x vs 50x invariance | NOT APPLICABLE | No engine changes. |
| 7 | Backend persistence/versioning | PASS BY DESIGN | No write path exists. |
| 8 | Chairman console integration | PASS BY ISOLATION | Existing 4.2.3 files untouched. |
| 9 | Public scoreboard integration | PARTIAL PASS | Public API contract inspected; live browser session not yet exercised. |
| 10 | Mobile Safari | NOT TESTED | Native iPhone/Safari review required. |
| 11 | Existing-session compatibility | NOT TESTED | Designed for existing `w3v422-` public sessions; live test pending. |
| 12 | Chairman approval | PENDING | Build created for Chairman review; deployment not authorized. |

## Review URL shape after deployment

`https://rgbslb11.github.io/Synthcast-Console/scoreboard/v1.0/?session=w3v422-...`

This URL does not exist until a deployment is explicitly authorized and completed.
