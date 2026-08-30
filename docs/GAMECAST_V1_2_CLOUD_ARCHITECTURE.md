# GameCast v1.2.0 — Cloud Sessions

Status: STAGING / ISOLATED

## Release isolation

- Baseline: `release/v1.1.1` at `fb023e04da8b422bc07a5307fbf640c23a585a83`.
- Development: `feature/v1.2.0-cloud-sessions`.
- Do not merge this branch into `release/v1.1.1`.
- Do not change the existing v1.1.1 GitHub Pages deployment while v1.2 is under review.
- Backend staging project: Supabase development branch `gamecast-v1-2-staging` (`percrnamjzetzjjuxuuw`).
- Backend namespace: `gamecast_v12`.

## Authority model

A cloud session is the authoritative Week 1 state. The browser is a projection/operator client, not the source of truth.

Each session stores:

- opaque `session_id`
- shareable `public_slug`
- SHA-256 hash of a 256-bit operator token
- full deterministic GameCast state JSON
- `state_version` for optimistic concurrency
- `last_advanced_at` for disconnect/reconnect catch-up
- engine/data version
- append-only checkpoint event records

The raw operator token is returned only when a session is created. It is never stored in plaintext in the database. Public viewers do not receive it.

## API

Staging Edge Function: `gamecast-v12`

- `POST /sessions` — create an authoritative session and operator token.
- `GET /sessions/:slug` — read public authoritative state.
- `PUT /sessions/:slug` — operator-only state checkpoint; requires `x-operator-token` and `expected_version`.

Writes use optimistic concurrency. A stale operator receives HTTP 409 rather than silently overwriting newer state.

## Reconnect semantics

On reconnect the client reads `state`, `last_advanced_at`, and `server_now`. The deterministic engine advances the saved state by the elapsed authoritative interval, capped for safety, then checkpoints the resulting state. This permits AUTO games to continue logically while no browser is open without requiring a permanently running per-game process.

The deterministic RNG state, clocks, pending breaks, possession, field position, period, score, and lifecycle are already contained in the v1.1.1 GameState and therefore survive checkpoint/restart.

## Public/operator modes

Operator URL:

`?session=<public_slug>` plus the matching operator token retained in that operator browser.

Public URL:

`?session=<public_slug>&view=public`

Public mode is read-only and polls/streams authoritative state. Operator mode may issue validated checkpoints and commands.

## Security

- `gamecast_v12.sessions` and `gamecast_v12.events` have RLS enabled.
- `anon` and `authenticated` have no direct table privileges.
- Database access occurs only through the Edge Function service role.
- Public reads expose state but never operator token hashes or internal session IDs.
- Operator tokens are hashed before persistence.
- State updates require token validation and exact expected state version.

## Promotion gate

v1.2.0 must not replace v1.1.1 until all of these pass:

1. Create cloud session.
2. Launch an AUTO game and checkpoint it.
3. Close the operator browser.
4. Reopen from a second device and deterministically catch up.
5. Confirm same score, RNG state, possession, clock state, and lifecycle.
6. Confirm public URL is read-only.
7. Confirm stale writes receive 409.
8. Confirm invalid operator token receives 403.
9. Complete a game through Final Pending -> Lock -> Accept.
10. Confirm v1.1.1 release branch and production URL are unchanged.
