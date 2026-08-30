# GameCast v1.2.0 — Staging Acceptance

Status: STAGING ONLY / DO NOT PROMOTE

## Isolation
- Production release `release/v1.1.1` remains the baseline and is not modified.
- Cloud work is confined to `feature/v1.2.0-cloud-sessions`.
- Supabase staging project ref: `percrnamjzetzjjuxuuw`.
- Database objects live only under schema `gamecast_v12`.

## Staging URLs
- Operator/public harness: `https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-v12-console`
- API: `https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-v12`

## Acceptance scenarios
1. Create a cloud session and verify nine canonical Week 1 games appear.
2. Launch one game, enable AUTO, record score/clock/possession, close the browser for at least 60 seconds, reopen the operator URL, and verify the state deterministically advances.
3. Open the public link on a second device and verify it receives the same projected state without operator controls.
4. Run two different AUTO games concurrently and verify each advances independently.
5. Pause one game and verify server-time projection does not consume game-clock simulation while paused beyond the configured break behavior.
6. Exercise an operator write from two stale browser tabs; one must receive a version conflict and reload rather than overwrite newer state.
7. Stop AUTO and verify subsequent cloud reads no longer simulate plays for that game.
8. End a game and verify it reaches FINAL_PENDING and no longer advances.

## Promotion gate
Do not merge to `main`, retag `release/v1.1.1`, replace the existing Pages URL, or merge the Supabase development branch until the operator explicitly approves staging acceptance.

## Current scope
The staging harness validates cloud authority, deterministic continuation, shared public reads, authenticated operator writes, and conflict protection. It is not yet the final v1.2 operator UI replacement; the production-quality operator interface remains gated behind acceptance of this cloud control-plane behavior.
