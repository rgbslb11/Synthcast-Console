# Week 12 — GameCast 5.0.7 operating setup

Chairman direction on November 9, 2026: proceed with normal Week 12 setup;
use Tuesday, Wednesday and Thursday operating games for monitored rollout.
The separate shared-project QA installation was declined and is not required.

60 canonical games, 120 participants, 122 approved integer rating records.
The only gameplay correction is uncapped punt endpoint adjudication:
endpoint >= 100 becomes a punt touchback at own 20. Short punts retain their
actual receiving spot. Safety scoring, probabilities, timing and RNG remain
as in 5.0.6. Existing accepted Week 11 results are preserved.

## Operating storage and access

New private schema `gamecast_v507_w12`, with RLS and service-role-only functions.
The fixed dispatcher `public.gc507_w12_rpc` is executable only by service_role.
No changes to PostgREST's global schema allowlist, no operator copies, no new
Auth users or QA harness. Authorization checks the existing Week 11 Chairman
roster. A roster revocation applies to both releases.

Setup creates no launched football games. The normal authenticated console
creates the operating board; Launch/AUTO/ON AIR/deadman remain Chairman controls.
Cron and the write switch initially remain disabled until backend preflight.
The scheduler token is generated inside Vault and is never returned or recorded
in repository artifacts. Result acceptance remains an explicit human action.

## Verification scope

The preceding candidate passed 81 automated checks, paired 3,000-game
populations, full-board and repeatability/speed/chunk checks, and a disposable
PostgreSQL run with 60 database/browser checks and 24 process restarts.
Those results are scoped to their recorded source commits in the QA evidence.
The operating binding has separate engine and disposable SQL preflight.
Physical iPhone Safari and normal target-cloud authenticated interactions are
NOT TESTED until observed. This is a monitored operating rollout, not blanket
certification of all release gates. Further repairs require bounded scope,
versioned engine identity, regression checks and preservation of resolved events.

## Rollback

Run `rollback.sql` to disable only Week 12 progression/writes. Keep all Week 12
data for diagnosis; do not delete sessions, repoint them to 5.0.6, or rewrite
accepted results. Prior published routes and backend functions stay intact.
Pages publication must preserve the complete latest live inventory, including
the 5.1 review route, and add only the new `/v5.0.7/w12/` files.
