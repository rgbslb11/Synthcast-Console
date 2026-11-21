# GameCast 5.0.8.5 · Week 13

Candidate `GC-W13-V5.0.8.5-RC1` implements the approved endgame play-selection changes. Baseline source is `release/gamecast-v5.0.8` at `37c52fa588f24454cbeb7dab75d94f4c72e98086`. The baseline engine file matched the deployed Week 13 Chairman and scheduler engine sources byte for byte. The GameCast master router and the forensic defect and probability-engine procedures apply.

## Football behavior

- After an offensive timeout at 0:55 or less in Q4, the same offense's next snap prioritizes a field goal if a kick would tie or win and the ball is at the opponent's 38 or closer. That is the existing 55-yard modeled range. With 0:01–0:08 left, the same score and range conditions prioritize a kick on any down, including when a Chairman clock edit clears the pending play. The existing fourth-down priority rule continues through 2:00.
- Ordinary scrimmage calls for a trailing Q4 offense are capped at 10% runs with 0:01–1:59 and one or zero offensive timeouts. The engine computes the existing weather adjustment, then applies a 90% minimum pass probability. Field goals and punts are selected before the cap.
- Both decisions use the existing play RNG. Kicking accuracy, play resolution, timeout consumption, clock mechanics, ratings and schedule use the baseline inputs. The opening toss retains its baseline seed stream so identical inputs keep the same possession before the changed Q4 decisions become eligible.

## Isolated preview and release bindings

| Surface | Candidate |
| --- | --- |
| Engine | `GC-W13-V5.0.8.5-RC1` |
| Schema and session prefix | `gamecast_v5085_w13` / `w13v5085-` |
| Dispatcher and scheduler job | `gc5085_w13_rpc` / `gamecast_v5085_week13` |
| Function names | `gamecast-week13-v5-0-8-5-public`, `-chairman`, `-scheduler` |
| Candidate write switch | `GAMECAST_V5085_WRITES_ENABLED` |

The candidate schema starts with writes and its scheduler disabled. The release preserves the 5.0.8 event format and reuses the shared Chairman authorization roster. Provisioning, copying or switching an operating session, enabling the scheduler, and serving hosted Pages require separate production approval. For a provisioned candidate, `rollback.sql` disables its writes and cron and retains its data.

## Verification

From the repository root, run:

```sh
node --test tests/v5085/*.test.mjs
node tests/v5085/gates.mjs
npm install --prefix ./outputs/v5085-qa --save-exact @electric-sql/pglite@0.5.17
PGLITE_DIST=./outputs/v5085-qa/node_modules/@electric-sql/pglite/dist node tests/v5085/postgres.mjs
```

The isolated PostgreSQL preview runs the candidate SQL and actual backend handlers with local fixtures for Supabase Auth, Vault, cron, and HTTP dispatch. It exercises scheduler signatures and retries, persistence across commits, Chairman and public reads, and candidate rollback.

The two saved G0635 checkpoints were replayed privately with their original RNG states. At 0:10 and 0:03 the candidate attempted a 47-yard field goal. Both kicks missed in those replays. The accepted 31–30 result remains in the original Week 13 session.
