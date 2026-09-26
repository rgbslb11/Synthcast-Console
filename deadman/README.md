# GameCast Dead-Man Fallback — Week 6 preparation

Branch: `4.2.2.1`
Parent: `release/gamecast-v4.3.2.1` @ `e6dbe1107ecb6542d41d156246f2209da31ca6c4`
Status: DEVELOPMENT / QA ONLY. No deployment, production merge, accepted-result change, SEUD publication, schedule substitution, or rating change is authorized by this branch.

## Purpose

Carry the complete GameCast 4.3.2.1 Week 5 implementation forward as the engineering baseline for the Week 6 build and add the Chairman-selective Dead-Man Fallback capability.

The Week 6 schedule and post-Week-5 TEAM/OFF/DEF package have not been supplied in this task. They are **BLOCKED**, not inferred. The integration builder therefore uses the current Week 5 release only as a QA fixture and labels it accordingly. It must not be represented or deployed as Week 6.

## Dead-Man operating contract

Every game begins `UNARMED`.

The Chairman may manually arm a specific `UNLAUNCHED` game with exactly one basis:

- `TV_START`
- `KICKOFF`
- `KICKOFF_PLUS` with an integer 0–180 minute offset

The schedule object must provide absolute UTC metadata:

- `kickoffZulu` for KICKOFF / KICKOFF_PLUS
- `tvStartZulu` for TV_START

Missing authoritative UTC metadata returns `BLOCKED`; the system does not infer a timezone from a display string.

Headline states are:

`UNARMED -> ARMED -> AUTONOMOUS`

Audit/terminal states additionally include `SATISFIED`, `DISARMED`, and `BLOCKED`.

### Trigger behavior

At or after the calculated Master-Zulu trigger:

1. if AUTO is already running, the arm is `SATISFIED`;
2. if ON AIR is already active, the arm is `SATISFIED`;
3. deliberate Chairman Pause/Edit/Delay/final state wins over the fallback and marks the arm `SATISFIED`;
4. missing power marks it `BLOCKED` and does not launch football;
5. if still `UNLAUNCHED`, Dead-Man performs the normal Launch transition and starts existing AUTO at 1x;
6. if the Chairman pressed LAUNCH but left an ACTIVE game idle, Dead-Man starts existing AUTO;
7. the trigger consumes no football RNG draw and does not alter quarter length, ratings, HFA, probability models, clock constants, or accepted results.

Manual LAUNCH alone does not satisfy an arm. A qualifying Chairman control command does. This specifically protects the case where a game was launched but AUTO / ON AIR was forgotten.

### Control ownership

`AUTONOMOUS` identifies the origin of control, not a different simulator. Football continues through the existing AUTO engine and authoritative cloud state. Chairman/public UI updates use the normal read path.

Dead-Man never locks, accepts, publishes, updates standings, updates ratings, or publishes to SEUD. Normal lifecycle governance remains in force and the game can progress only to `FINAL_PENDING` without human authorization.

## Scheduler architecture

The Edge Function candidate exposes a scheduler-only `deadman_tick` action. It is protected by `GAMECAST_DEADMAN_CRON_SECRET` / `x-deadman-scheduler` and uses the existing optimistic state-version update RPC.

Supabase Cron + pg_net should invoke the tick for each matching Week 6 session. The cron template is in `deadman/cron-template.sql`; secrets and the final Week 6 function/engine identity remain deployment-time values.

A tick first projects the current session state to current Master Zulu using the unchanged engine. It only persists if a Dead-Man state actually changes. A simultaneous Chairman command wins through the existing state-version conflict mechanism; stale scheduler state is rejected rather than overwriting the operator.

## UI

Operator cards expose ARM / DISARM, trigger basis, offset minutes, state, and a Master-Zulu countdown. Public views receive no Dead-Man control metadata. After trigger, both public and Chairman scoreboards continue to update through the ordinary cloud-read flow.

## QA evidence

`deadman/test.mjs` contains 16 named A01–A16 scenarios plus one input validation check. Current local result: 17/17 PASS for the pure Dead-Man controller.

The integration builder is `scripts/build-gamecast-w6-deadman.mjs`. It rolls the current 4.3.2.1 release forward into a clearly labeled Week-5-data QA fixture and overlays the feature without altering the predecessor.

## Week 6 blockers

Before this becomes a Week 6 release candidate, provide and validate:

1. canonical Week 6 game slate;
2. authoritative kickoff Zulu for every game;
3. TV-start Zulu where TV_START arming is desired;
4. post-Week-5 TEAM/OFF/DEF ratings for the governed population plus approved schedule-only sidecars;
5. final Week 6 engine/function/route/session namespace;
6. scheduler secret and cron deployment authorization.

No placeholder Week 5 matchup or post-Week-4 rating may be silently relabeled Week 6.
