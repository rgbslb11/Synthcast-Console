# GameCast 5.0.1 state contract

| Property | Authority | Client behavior |
|---|---|---|
| Score, possession, down, distance, clock, lifecycle, seed/history | Current persisted session, advanced by backend engine | Render received values; client clock display is presentation only |
| Accepted/locked state | Persisted game lifecycle | Never manufacture acceptance locally |
| Imported finals | Immutable final_snapshots rows | Read-only display; excluded from operating writes |
| Session version | Atomic commit_state increment | Reject older reads; retain database CAS |
| Per-game control token | Server hash of control-relevant fields | Opaque precondition only; not authentication |
| Edit token | Server hash of complete game except elapsed GL | Preserve draft; reject real target change |
| Button busy, search, filter, open details, draft fields | Frontend | Must not rewrite authoritative football state |
| Idempotency result | requests, scoped to session/actor/key/hash | Replay original committed result; never execute twice |
| Scheduler progress | Authenticated backend sweep | Browser never runs authoritative independent football |

A normal control request acts on the latest football instant after validating the relevant control witness. Corrections use the stricter edit witness. Version collisions from unrelated games can retry three times; each retry reads current state and revalidates. Genuine target changes reject. Missing witnesses retain strict session-version handling.

Operator response snapshots can be older than a subsequent scheduler result; client state never regresses to an older version. Unknown write outcomes preserve their idempotency key. No optimistic fake score/control transitions were added. Existing polling/draft DOM ownership remains; there is no React, Supabase Realtime or WebSocket lifecycle on these routes.
