# GameCast 5.1 UI — integration readiness

Chairman instructed proceeding after reviewing the repository build. This authorizes
continued UI integration preparation; no production deployment or merge is performed.
The approved desktop concept and previously accepted mobile appearance are preserved.

Verified source heads for this pass:
- UI build: `796ea3768361f8eea68f7d4f462db189d7c8367a`.
- Integration: `8a1a647845d2ab6c05241973239937b6ca1e6ab3`.
- WP: `eb6f35231cc8b07c424b3732d74f22f335154746`.

Repository AGENTS, router and procedure 03 were read in full. UI scope remains
presentation and existing read-only transport. The integration/WP heads have not
advanced. No competing backend, probability model, auth grant, session, scheduler,
contract or lifecycle change is introduced to fill a gap.

## 1. Scoreboard / Stats / Rollup — StatsCenter

Implemented: approved status-lane board, search/filter/selection retention, compact
text-team scores, blank blocked action areas, expandable authoritative rollup and
return navigation. The UI already uses the deployed details endpoint for explicitly
supplied QA IDs. Roster/lifecycle filters remain disabled in live mode because this
endpoint does not supply the required board index.

New verification: 56 hand-authored generic response copies exercise rendering, ten
refreshes, search, return state, keyboard tabs and the phone game selector. These
copies are authored from the public UI examples, with no engine, database or real
team/game data. Timings measure browser automation plus DOM interaction only; they
are neither a latency SLA nor evidence of 56 live games or cloud capacity.

Live integration status: **BLOCKED** for the board index and supported Chairman
identity/session flow. Positive authenticated HTTP has not been tested in this thread.

## 2. Detailed Stats / Game Stats

Implemented: contracted score/period/scoreboard clock/GL/possession/down/field/timeouts,
line score, last resolved play and available schedule/weather; 27 statistics per team,
22 play attributes, supplied possession rollups, live/historical fields, merged
plays/drives and WP observation rendering. Missing values stay unavailable.

New browser scenarios use intercepted HTTP to exercise stale-to-fresh source state,
automatic five-second reads without advancing clocks, retained drive/play selection,
edit block/cancel, transport failure/recovery, and persistent saved-correction
blocking through repeated reads. These do not create football events or prove live
server enforcement. Existing server-denial/reload tests remain in place.

Live integration status: **BLOCKED** for hosted WP composition/delivery and positive
Chairman authorization. No endpoint is guessed and no WP read creates observations.

## Deployment evidence

Read-only cloud function inventory was rechecked in this pass:
- `gamecast-v5-1-0-qa-details`: ACTIVE v1, JWT verification enabled.
- `gamecast-v5-1-0-qa-commands`: ACTIVE v2, JWT verification enabled.
- `gamecast-v5-1-0-qa-harness`: ACTIVE v10 in the platform inventory. Earlier source
  evidence marks its behavior retired; ACTIVE is deployment metadata, not permission
  to invoke it or evidence of a functioning harness. It was not called here.
- No WP or board-index Edge Function appears in this project's function inventory.
  The WP owner's current handoff explicitly says its handler is not a deployed URL.

This is QA deployment evidence, not verification of a production 5.1 engine identity.
No production migration, Site modification, engine operation or release is performed.

## Exact handoff to existing owners

| # | Owner | Required field/interface or behavior | Acceptance evidence needed |
| --- | --- | --- | --- |
| 1 | Backend | Authorized bounded board index for every game, including blocked/not-started: gameId, team identities/entering records, schedule/network/week, lifecycle/activity/halftime, acceptance status, current display score/clock and detail availability; documented revision/source time and batch GET semantics. | One authorized full-board response plus denial, correction and lifecycle fixtures; no inferred lane classification. |
| 2 | Integration | Verified current 5.1 Chairman Console route and supported Chairman Auth/session flow with an authorized QA grant; preview origin approved by that owner. | Positive and negative browser reads from the permitted preview origin, without sharing credentials in repository files. |
| 3 | Backend | Authoritative Master Zulu operations time. `generatedAt` remains a source-commit timestamp. | Explicit time field/units and source authority; no browser-clock substitute. |
| 4 | Backend | Per-possession drive duration, including units and timing semantics. | Contracted elapsed football duration; no GL-difference reconstruction. |
| 5 | Backend | Scoring-summary type, full description and scoreAfter, joined to the immutable scoring event. | Supplied rows including TD/PAT/FG/safety cases and score order; no UI reconstruction. |
| 6 | Backend | Historical pre-snap lineToGain/goalToGo, or an explicitly approved presentation transform. | Historical/goal-to-go/possession-change fixtures; no duplicated field calculation. |
| 7 | WP/integration | Explicit authenticated hosted WP URL, approved prior manifest, durable observation store, source recovery and browser-independent five-second worker. | Real GET pagination with identity/high-watermark binding, authorization denial, source pending, edit/cancel, sticky correction, gaps and recovery. Existing local WP tests do not establish hosted readiness. |
| 8 | WP, optional concept fidelity | Football-time coordinates/units for quarter-based WP plot positions. | Supplied coordinates; current UI correctly uses observation sequence. |
| 9 | WP, optional concept fidelity | Explicit other-team probability and identity if both numbers are required. | Supplied value; current UI renders only the authoritative favorite probability. |

Items 8–9 are optional source extensions for concept fidelity, not permission to
change the approved probability model. The existing detailed handoff documents are
retained. This document does not send messages to other threads or their owners.

## Verification status and release boundary

The accepted build's evidence is GitHub run 41953309833: 117 local tests; nine
browser scenario groups per Chromium/WebKit; phone screenshots pixel-identical to
the accepted baseline. New scenario results must be read from this revision's run;
test authorship alone is not a PASS. Preview screenshots use generic fixture data.

Native iPhone/iPad/Mobile Safari, authorized live updates/recovery, sustained hosted
56-game load and production readiness remain **NOT TESTED**. UI layout/behavior
checks are separate from football fixed-seed, distribution, acceleration, persistence
and accepted-result gates owned by the backend/release threads. Production approval
is not requested while these dependencies remain unresolved.

Preview source and rollback: `public/v5.1.0/review`; leave draft PR #22 isolated or
restore UI build 796ea37 to remove only this readiness pass. No cloud restoration.
