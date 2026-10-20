# GameCast 5.0.3 — Week 9 release

Publication authorized by Gary on October 19, 2026. This release contains exactly three approved changes:

1. All 52 Week 9 games, October 20–24, using the Chairman's Eastern kickoff times and networks. There are 44 conference games, 8 nonconference games, and 104 unique participants.
2. All 121 Option 2 ratings: SYNTH-SAG TEAM with TEMPO-derived OFF/DEF. The approved CSV SHA-256 is `dc8160bcfcb2429a14a900de3f3aa5a0c5804a70698733f5722e9b5ff9601939`.
3. The latest finished-game OT editor and FINAL/XOT status fixes from commit `57e688da30d59f470b82c72f8d6f3d6a25991feb`, carried into Chairman, public, and condensed views.

## Implementation

New source branch: `release/gamecast-v5.0.3`. New route: `/v5.0.3/w9/`. New schema: `gamecast_v503_w9`. New session prefix: `w9v503-`. New functions: `gamecast-week9-v5-0-3-chairman`, `gamecast-week9-v5-0-3-public`, and `gamecast-week9-v5-0-3-scheduler` in the existing GameCast project.

Football code is identical to 5.0.2 after normalizing the slate import and four release/data identity constants. HFA, timing, weather probabilities, game rules, and seeded mechanics are unchanged. All 363 rating values are checked against the approved file. Poll ranks have no simulation weight. Existing 5.0.2 source, routes, functions, and accepted state are preserved.

The stadium metadata exception for Virginia Tech at Clemson does not block release: the current weather implementation accepts Chairman-entered categories and does not consume a stadium ID. Clemson remains the home team. No canonical venue record was altered.

## Evidence and publication state

At the preparation commit, 25 local tests pass, including exact OT code retention, all 121 rating triples, 52-game ordering, safe launch defaults, permissions, and fixed-seed speed invariance. A real database transaction probe passed serialization, commit, replay, stale-write/conflicting-replay rejection, recovery, and RLS checks; all probe writes rolled back.

The 5.0.3 backend is deployed with writes and scheduling disabled pending final release activation. Public health reports `GC-W9-V5.0.3-RC1`, week `2026-W09`, and 52 games. The publication workflow gates GitHub Pages on Chromium and mobile-viewport WebKit tests of all three views, Start/Stop Auto, Upcoming, live polling, the OT editor, and final OT status.

Source availability is not deployment proof: the proposed `v5.0.2-ot-patch-3/w8/` route returned 404 in preflight. The publisher verifies and preserves the 174 known published files, plus any patch-3 files actually found online, before adding the 15 new 5.0.3 files. It never overwrites the old routes with the latest source.

The earlier 104,000-simulation comparison remains applicable to the unchanged football mathematics and approved ratings. It is a controlled simulation comparison, not predictive-accuracy certification. Publication status and live verification will be recorded separately after the workflow completes.

## Rollback

`release-assets/v5.0.3-week9/rollback.sql` disables only new Week 9 writes and scheduling while retaining state and audit evidence. Existing Week 8 routes continue to operate. If the new page route must be withdrawn, reconstruct the preserved published manifest excluding only `v5.0.3/`; do not replace the entire site from an old repository checkout. No games are launched or accepted by publication.

## Published and activated — October 20, 2026 UTC (October 19 Central)

Release source: `4c66a22edf5260d82e3988761a9702dc04fc2b54`.
Successful workflow: https://github.com/rgbslb11/Synthcast-Console/actions/runs/39345383113

- PASS: 25 logic tests; Chromium and WebKit/mobile-viewport tests for the full board, controls, polling, OT editor, and final OT labels.
- PASS: hosted verification of all 15 new files and byte-for-byte preservation of 174 existing files.
- PASS: live public API readback of all 52 ordered games, dates, kickoff times, networks, and participant rating objects against the approved runtime inputs.
- PASS: authenticated Chairman boundary (unauthenticated HTTP 401) and public write rejection (HTTP 405).
- PASS: exactly one operating session, `w9v503-38631f64661af135`; all 52 UNLAUNCHED, AUTO off, ON AIR off, Deadman UNARMED. Week 9 writes and scheduler enabled; three observed cron runs succeeded.
- PASS: existing Week 8 state version 42785 and state MD5 `4782821de6b6686faf70e156fccfe85d` unchanged.
- Scope limitation: browser tests used actual release UI with local API fixtures; physical iOS Safari and real-user sign-in were not exercised. Hosted source bytes and live public API were verified separately. No games were launched or accepted for production testing.

Two failed preflight runs were corrected only in test fixtures: reset upcoming state between surfaces, and include the required week identity in OT mock responses. No application or football code changed in those corrections.

Chairman: https://rgbslb11.github.io/Synthcast-Console/v5.0.3/w9/?session=w9v503-38631f64661af135

Public: https://rgbslb11.github.io/Synthcast-Console/v5.0.3/w9/?session=w9v503-38631f64661af135&view=public

Condensed: https://rgbslb11.github.io/Synthcast-Console/v5.0.3/w9/ui1.3/?session=w9v503-38631f64661af135
