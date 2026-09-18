# Item 5 — seeded opening receiver

Chairman authorization: “Proceed with 5.” Branch: `4.3.2.SB`. Product release remains 4.3.1; RECEIVER1 is an experimental engine identity, not a new release number. Local only; no deployment or production session changes.

## Behavior

- Opening possession is a seeded 50/50 choice: 0 away, 1 home.
- SHA-256 of JSON `["GAMECAST_OPENING_RECEIVER_V1", seed, gameID]`, low bit of its first byte, produces the choice. This independent deterministic decision never consumes football RNG draws.
- Store `openingReceiver`, `secondHalfReceiver`, `receiptSeed`, and `receiptVersion`. Q3 uses the saved opposite receiver, irrespective of end-Q2 possession.
- Same-seed restart preserves receipts. New-seed purge recalculates them; it can legitimately select the same side again.
- Chairman continuation changes the football seed as before, but preserves established half receipts and the original receipt seed. Archived runs retain receipt metadata for replay. Public responses omit receiptSeed.
- Existing HFA, schedule, ratings, play probabilities, clock constants and all other football functions remain unchanged. A different opening possession can change game outcomes. Away-opening test cases reproduce the old engine's football history.

The original generated source remains hash-pinned and unmodified. `receiver.mjs` applies explicit, uniquely checked source substitutions only in the candidate loader. `createRuntime()` still loads the unchanged sandbox baseline for comparison; `createRuntime({receiver:true})` selects this candidate.

## Isolation and startup

- Engine: `GC-W4-V4.3.1-RC1-SANDBOX-RECEIVER1`.
- Sessions: `qa-receiver1-`; storage key: `synthcastGameCast431Receiver1Operator`.
- Local persistence: `sandbox/data/qa-receiver1-sessions.json`, ignored by Git.
- Old sandbox and live sessions are rejected, not migrated. UI and API remain local. QA-only acceptance/publication/feed guards remain in force.

```sh
node scripts/build-gamecast-v431.mjs
node sandbox/test.mjs
node sandbox/test-receiver.mjs
node sandbox/test-http.mjs
node sandbox/server.mjs
```

On that machine, open `http://127.0.0.1:4311/sandbox/` and create a fresh QA slate. This is not a hosted preview.

## Results and release gates

Machine-readable evidence: `evidence/receiver-results.json`, baseline regression `evidence/test-results.json`, HTTP isolation `evidence/http-results.json`.

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Engine/state integrity | PASS | 55 full games with valid score periods; receipts checked; candidate Pause/Delay/Edit clocks and RNG checked |
| 2. Fixed-seed regression | PASS | 55 same-seed full-game replays; away-opening subset matches baseline; continuation/archive and new-seed checks |
| 3. Multi-seed distribution | PASS | Receipt selection only: 10,000 seeds, 4,972 away / 5,028 home. Scoring/win/GL population recalibration NOT TESTED |
| 4. Full board | PASS | 55/55 matchups, one fixed seed per matchup, both opening sides represented |
| 5. Poll/chunk invariance | PASS | All 55 complete games at 1-second versus 13-second advance chunks |
| 6. 1x vs 50x | PASS | All 55 complete games compared at equal synthetic elapsed after each projection |
| 7. Persistence/versioning | PASS | Candidate local reload and namespace isolation; baseline optimistic conflict regression. Actual cloud storage parity BLOCKED |
| 8. Chairman console integration | NOT TESTED | Served candidate API/identity bindings checked; interactive browser rendering not tested |
| 9. Public scoreboard integration | NOT TESTED | API redaction including receipt seed checked; browser rendering not tested |
| 10. Mobile Safari | NOT TESTED | No device test |
| 11. Existing-session compatibility | NOT TESTED | Migration deliberately unsupported; negative rejection tests pass |
| 12. Chairman approval | NOT TESTED | Implementation authorized; completed candidate acceptance and deployment not authorized |

No production certification is claimed. Master Zulu remains actual operations time; frozen football states retain advancing GL. Receipt selection adds no play duration and changes no timing constant.

## Seven-item scope record

1. Two-minute/endgame decisions — draft, not implemented.
2. Event-driven GL — draft, not implemented.
3. Drive/quarter scoring influence — draft, not implemented.
4. Play-by-play, drive identity and team statistics — draft, not implemented.
5. Random opening/reciprocal halftime receiver — implemented in this local candidate.
6. Weekly upload/validation/locking — approved direction, implementation pending.
7. Off-white/grey Chairman theme — approved direction, implementation pending; current theme stays dark.

Count: 7 tracked, exactly 1 implemented candidate enhancement.
