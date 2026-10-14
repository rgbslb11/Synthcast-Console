# Supabase storage root cause

Observed 2026-10-13 UTC. Measurements are source facts, not estimates of physically reclaimable disk.

## 5.0.0 measurements

| Item | Measured value |
|---|---:|
| Project | xsvdmcipviejxynkdbhq |
| Namespace | gamecast_v500 |
| Source session | w7v500-17e1dde75f5b1cba |
| Session version | 11213 |
| requests relation, TOAST and indexes | 2,350,628,864 bytes |
| requests rows | 11,211 |
| Scheduler rows | 10,997 |
| Operator rows | 214 |
| Scheduler response stored bytes | 2,227,124,833 |
| Average scheduler response | 202,521 bytes |
| Operator response stored bytes | 28,593,995 |
| Average operator response | 133,617 bytes |
| events rows / relation bytes | 17,328 / 7,438,336 |
| sessions rows / relation bytes | 1 / 917,504 |
| immutable final rows / relation bytes | 13 / 106,496 |
| Entire database before | 2,389,997,235 bytes |

## Mechanism and evidence

Frontend commands and the five-second scheduler invoke engine operations. DatabaseStore submits the complete 41-game state to commit_state. The source function updates sessions.state and also inserts a full response containing that same state into requests.response for exact idempotent replay. Each game's accumulated history remains inside that state.

Thus every committed scheduler sweep retains another full board, even when only a few games changed. Start Auto creates ongoing eligible state transitions; the sweep repeatedly retains all games. It is not exactly one database write per play: one tick can cover multiple plays/games and creates one full-board receipt plus event rows. 10,997 of 11,211 receipts (98.1%) are scheduler receipts. Larger accumulated histories make later copies larger.

A current-state update alone can create PostgreSQL MVCC/TOAST churn, but this is separate from the proven permanent duplicate request payloads. requests has a session foreign key. No incoming foreign keys were found for requests. The application reads requests for idempotency, so absence of incoming foreign keys does not establish deletability.

## Small candidate change

gamecast_v501.commit_state retains compact scheduler receipts with session, engine, week, committed version and receipt format. Scheduler replay returns the original committed version; it does not pretend a newer board is the original result. Operator receipts remain unchanged to retain existing recovery semantics.

Current state, full per-game deterministic history and incremental event rows are retained. No new snapshot table or event-only reconstruction architecture was introduced. This removes the demonstrated scheduler multiplier, not every possible source of storage growth.

Actual isolated database: 100 controlled writes used 17,600 stored response bytes; maximum 176 bytes. Hosted 41+9 simultaneous QA games likewise retained 176-byte receipts, zero full-board scheduler responses. Final observation: 171 candidate scheduler receipts, four QA sessions, zero active sessions after stopping the bounded tests. Exact load samples are in evidence/load1result.json and load50final.json.

## Historical releases — read only

Project percrnamjzetzjjuxuuw uses gamecast_v12.sessions and events, not the 5.0.0 request-copy table.

| Release | Sessions | Stored current-state bytes | Events | Stored event payload bytes | Largest event |
|---|---:|---:|---:|---:|---:|
| 4.2.2 | 7 | 335,432 | 416 | 114,765 | 626 bytes |
| 4.4.2 | 14 | 505,588 | 1,161 | 736,501 | 1,018 bytes |

Shared historical relations total 4,751,360 bytes for sessions and 2,400,256 for events, including other releases. The inspected commit paths update current state and append event payloads. Neither sampled release has top-level state/board event payloads. This is evidence against the same retained full-board request pattern; current-state MVCC churn can still occur. No historical data or functions were modified.

## After measurement

Source requests remain 11,211 rows and 2,350,628,864 relation bytes. Source session remains v11213 with MD5(state::text) 43212ea3ddf3f1181bbcf9b5ab33f2ca. Whole project database after QA setup/tests was 2,396,739,251 bytes. That includes new isolated QA tables and background activity.

**Removed: zero rows. Claimed reclaimed disk: zero.** No DELETE, VACUUM FULL, retention purge or compaction was executed.
