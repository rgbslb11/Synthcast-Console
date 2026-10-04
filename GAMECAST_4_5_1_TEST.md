# GameCast 4.5.1 Week 6 Chairman test

Week 7 publication is awaiting the finalized carriage board. This separate test uses all 56 games, canonical IDs, dates, kickoff times, networks, venues and TEAM/OFF/DEF values shipped in deployed 4.4.1. The Week 6 operating ratings are the post-Week-5 GameCast v1.3 set; no ratings are recalculated.

The football change is short-gain chain-sustain multiplier 5.0 to 0.5. Rating multiplier 4.0, raw home-field effect 0.035, and all other football/state functions are preserved. The console adds FINAL — NOT ACCEPTED for FINAL_PENDING and LOCKED games.

Chairman route: https://rgbslb11.github.io/Synthcast-Console/v4.5.1-test/
Engine: GC-W6-V4.5.1-TEST1. Backend: gamecast-week6-v4-5-1-test. Dedicated gamecast_test451 sessions/events and RPCs; testw6v451 session and browser storage namespaces. New sessions are forcibly QA-only even without a query flag. API and database deny accepting or promoting these results. Previous operating sessions, RPCs, schedulers and public route bytes are preserved. The test scheduler is scoped solely to the dedicated test tables.

## Chairman procedure

1. Open the test route and CREATE OPERATING SLATE. Save COPY OPERATOR LINK privately. Confirm ALL · 56 and POWER 56/56.
2. Leave 10:00 QTRS selected. For each game, select OPEN GAME for close observation, then LAUNCH, START AUTO and choose 50 for a quick full game. AUTO and ON AIR are mutually exclusive; leave ON AIR off while testing AUTO.
3. Allow the engine to reach FINAL on its own. Do not use CALL FINAL, manual scores or clock corrections during a distribution test. A typical 10-minute game takes about 2–3 minutes of wall time at 50x; GL is still the simulated game length.
4. Record game ID, matchup, final away/home scores, total, margin, shutout, rating-favored winner/upset, GL, Q-by-Q pattern and notable sustained drives. Watch a few games at 4x or 10x to judge flow, possession, field position and stalled drives.
5. Click FINAL — NOT ACCEPTED to review completed games. Both FINAL_PENDING and LOCKED appear. QA acceptance is blocked; results cannot become official.
6. RESTART SAME SEED, confirm, LAUNCH and START AUTO should reproduce the football result with unchanged inputs. Use PURGE + NEW SEED and confirm, then LAUNCH and START AUTO for independent runs. Different seeds should allow different outcomes.
7. Run every matchup once, then repeat selected close matchups, strong favorites at home, and strong favorites away at least 10 times with new seeds. One score alone does not establish a distribution. Judge aggregate totals, winning margins, 28+ point blowouts, shutouts and upsets across runs.

Keep this route open for observation and cloud refreshes. Week 6 kickoff timestamps are historical: KICKOFF modes reject past triggers; an optional deadman test needs an explicit future TV START in UTC. It is not necessary to arm deadman for a manual full-game AUTO test.

Validation: all 30 inherited operational/state tests passed on the Week 6 test entrypoint; 168 paired same-engine manual/scheduled full games plus 56 poll/chunk and 56 equal-synthetic-time 1x/50x comparisons. Chairman/public DOM checks passed with 56 cards, arm/disarm and focus preservation. The new filter includes 20 matching rows from a 56-row lifecycle fixture, drops to 19 after an acceptance fixture transition, and leaves the existing FINAL and ALL filters intact. These fixture accepted states are not allowed in hosted QA sessions. Mobile Safari is not tested. No Chairman scoring-distribution approval is claimed.
