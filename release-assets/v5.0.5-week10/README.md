# GameCast 5.0.5 — active and published

The Chairman explicitly approved production writes, the five-second cron, one fresh 56-game unlaunched session, and UI publication on 2026-10-29. Activation and publication are complete.

## Open the fresh Week 10 session

- [Chairman console](https://rgbslb11.github.io/Synthcast-Console/v5.0.5/w10/?session=w10v505-bae989b4996e081e) — sign in with the existing authorized account.
- [Public scoreboard](https://rgbslb11.github.io/Synthcast-Console/v5.0.5/w10/?session=w10v505-bae989b4996e081e&view=public)
- [Condensed scoreboard](https://rgbslb11.github.io/Synthcast-Console/v5.0.5/w10/ui1.3/?session=w10v505-bae989b4996e081e)

Use these links to resume the created session. Do not create another slate merely to access it. At release verification, all 56 games are UNLAUNCHED, power ready, AUTO off, ON AIR off and Dead-Man UNARMED. No games or results were automatically launched, accepted or published to SEUD.

## Frozen mathematics and inputs

Engine GC-W10-V5.0.5-RC1 implements exactly the approved 2x rating-edge multiplier, 18-second normal runoff base, and +1 yard on already-positive nonfumble rushing gains. All 56 W10 schedule rows and all 121 rating records are unchanged. Old games remain on their original engine; no existing 5.0.4 result was imported or restarted.

## Verified evidence

- Publication commit 1b3daaaaa7a7fca7bdc3bdd5e15db6f5ff38bc95, branch release/gamecast-v5.0.5. [Publication workflow 40824439901](https://github.com/rgbslb11/Synthcast-Console/actions/runs/40824439901) passed verification, deployment and hosted verification.
- 54/54 regression tests; Chromium and WebKit mobile-viewport Chairman/public/condensed and overtime UI suites passed. These operator tests use handler fixtures. Real iPhone Safari and authenticated live Chairman operation are NOT TESTED.
- Final-version 56,000-game population: shutouts 3.43%, margins 1–7 points 38.99%, offensive snaps/game 127.92, combined points/game 42.71. These are simulation distributions, not guaranteed game outcomes.
- Schema gamecast_v505_w10 has eight tables with RLS, including the scheduler control. Public, Chairman and scheduler functions are deployed version 1.
- Actual database serialization, state/ledger commit, exact replay, conflict refusal and recovery probe passed; its test transaction rolled back.
- Production writes, scheduler control and five-second cron are enabled. Active dispatch HTTP 200; zero eligible sessions and zero processed because games remain unlaunched/unarmed. Cron execution succeeded. The prior disabled-control test returned HTTP 403.
- Public HTTP readback matches approved teams/ratings, schedule, data identity and engine for all 56 games. Live browser public and condensed boards load 56 upcoming games; Chairman entry displays the required sign-in.
- Hosted byte verification preserved all 204 prior files and added 15 new 5.0.5 files. Both existing 5.0.4 session hashes are unchanged.

## Release isolation and rollback

Schema gamecast_v505_w10; w10v505- session prefix; /v5.0.5/w10/ UI; independent 505 browser storage keys. Existing accepted and pending games remain accessible on their original 5.0.4 route.

If rollback becomes necessary, execute rollback.sql to disable only 5.0.5 writes, scheduler control and its cron. Retain the new session and histories for review; never continue 5.0.5 histories with 5.0.4 mathematics. All earlier release files, endpoints and sessions remain intact.
