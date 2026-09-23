# OT3+ defensive try return correction — 2026-09-23

Status: implemented and locally tested on sandbox branch `4.3.2.SB`; no release number change, deployment, production merge, accepted-result edit, or SEUD publication.

## Evidence and scope

Inspected sandbox parent: `cfe9688bc419ed4935885224636c736387f74627`. Baseline remains GameCast 4.3.1, UI 4.2.3, mechanics 4.2.2, engine GC-W4-V4.3.1-RC1, commit `8163e9d1a2b22789f0579a761d1e4ae926eaa430`, 55 games. The attached September 7 snapshot is historical 4.2.2 evidence, superseded by the selected branch/registry and Chairman instructions.

Reviewed the [2026 NCAA rule book](https://ncaaorg.s3.amazonaws.com/championships/sports/football/rules/PRMFB_RulesBook.pdf), Rule 3-1-3(e)–(h), printed FR-52–53. Download SHA256: `2a9e63b038b6efc70ad846487f33fdda175993c2229c911c3e06291ec74a9dd5`. Rule (f) requires equal series except a defensive score other than on a try. Rule (g) governs fouls after possession changes.

No deployed OT behavior is claimed. Live/deployed verification is NOT TESTED. The local server still uses RECEIVER1; OTMODEL1 is an opt-in, fixture-driven candidate.

## Governing behavior

1. A legal defensive return on the first OT3+ try scores two for the defense. Keep ACTIVE, record one completed opportunity, and give the other team its scheduled try.
2. A legal defensive return on the second try scores two, then compare total scores. Unequal scores move to FINAL_PENDING; equal scores advance to the next OT using the existing break/order rules.
3. Resolve fouls before awarding points or completing the opportunity. A retry does not consume an opportunity. Unsupported adjudication blocks without awarding points or completing the series.
4. For the requested nullified-return case, the narrow resolved input `RETURN_TEAM_LIVE_BALL` means an ordinary live-ball foul by the returning/scoring team. The return score is canceled and the down is not replayed. It excludes live-ball fouls treated as dead-ball fouls and other exceptions. It is accepted only on OT3+ defensive-return fixture outcomes. This is not a general penalty adjudicator or a new probability model.

## Inspected code and change trace

| Layer | Source inspected | Result |
|---|---|---|
| Football state | `sandbox/overtime.mjs`: validEvent, apply, endOpportunity, advanceOvertime | Removed premature OT3+ return finish. Both legal returns use completed-opportunity handling. Added narrow resolved-foul input for nullified returns. |
| Scoring/lifecycle | Generated baseline `supabase/functions/gamecast-week4-v4-3-1/index.ts`: score, finishGame, advanceGame, project | Existing score helper awards +2 once; existing finish runs only after two resolved tries and unequal totals. Baseline file unchanged. |
| Runtime/persistence | `sandbox/runtime.mjs`, `sandbox/overtime.mjs`: patchOvertime | Existing local JSON/RPC adapter persists completed count, pending event, scores, phase and lifecycle. No schema/migration change. |
| Chairman console | Generated `public/v4.3.1/app.js`: ds, line, finalCtl; `sandbox/build-ui.mjs` | Existing presentation follows lifecycle/period. ACTIVE first return has OT label and no final lock control. No UI code patch. |
| Public scoreboard | Backend publicGame/display; same UI ds/line | Public projection stays in OT after first return/tied pair; score totals reflect return points. Private pending events remain redacted. |
| Isolation | `sandbox/server.mjs`, runtime guards | Nonofficial namespaces and publication/acceptance/feed restrictions retained. No live session touched. |

The baseline generated index still has SHA256 `33fecdd438ea497458a878dc437ff0c7dfb3dbc64810b154370b3a45ec31fdcf`. Clock constants, probability tables, regulation code, seed selection, ordinary play RNG, ratings, statistics and manual controls were not retuned.

## Tests executed

All commands exited 0 after correcting test-fixture setup (fixed opening receipt/possession and expected create HTTP status 201). No production behavior was changed to satisfy these fixture corrections.

| Command | Result |
|---|---|
| `node sandbox/test-ot3-return.mjs` | 8 groups PASS: first return; second winning return; second tying return; nullified first/second return; retry before completion; unsupported foul blocks; replay/speed/pause/GL; persistence and Chairman/public presentation. |
| `node sandbox/test-overtime.mjs` | 15 groups PASS, including revised O06. Existing provisional timeout label is stale; see conflicts below. |
| `node sandbox/test-ot-integration.mjs` | 55 regulation trajectories unchanged through Final/OT entry; one naturally entered OT. API reload/pause/privacy/acceptance guards PASS. |
| `node sandbox/test.mjs` | 9 baseline/isolation groups PASS. |
| `node sandbox/test-receiver.mjs` | 5 receiver groups PASS. |
| `node sandbox/test-http.mjs` | 8 HTTP/isolation checks PASS against RECEIVER1, not an OT-enabled browser deployment. |

Focused evidence: `sandbox/evidence/ot3-return-results.json`. Test creates only fresh temporary QA sessions and deletes them. First-return state survives reload; pending second return survives another reload; tied 2–2 returns proceed exactly once to OT4. Presentation tests execute actual UI helper source, not a replacement rendering model. Replay compares 1-second/13-second steps and equal elapsed simulation at 1x/50x. Pause advances GL while the try stays pending; scoreboard remains zero and ordinary RNG/TOP remain unchanged.

## Separate conflicts — documented, not changed

- **Timeout policy:** Chairman approved one shared OT1–2 allowance and one replacement shared OT3+ allowance, no carryover/stacking. NCAA 3-1-3(h) grants one each in OT1 and OT2, then one shared for OT3+. Existing code follows the custom shared pools; its PROVISIONAL label and old report language are stale. Review separately before claiming NCAA compliance.
- **OT3+ breaks:** Existing custom 90-second TV stoppages differ from rule (h), which permits media timeouts only after OT1 and OT2, and specifies a two-minute break after OT2 when there is no media timeout. No timing changes in this patch.
- **Offsetting fouls:** A blanket replay rule is not sufficient after possession changes. Rule (g)(3) includes cancellation without repeating the down when its conditions apply. Current simulator blocks OFFSETTING rather than guessing. A complete possession-aware foul map needs separate approval and tests.
- **Other fouls:** Flagrant/unsportsmanlike/dead-ball enforcement, live-ball fouls treated as dead-ball, and mixed fouls are not represented by the narrow return-foul input. Do not label those covered by this test.

## Remaining release gates

| Gate | Status and limit |
|---|---|
| Engine/state integrity | PASS for bounded scripted correction; complete OT model still BLOCKED. |
| Fixed-seed regression | PASS for exercised fixtures/regulation regression. Replays must use the same source commit; no old accepted histories were regenerated. |
| Multi-seed distributions | NOT TESTED for this correction; stochastic OT model remains BLOCKED pending data/model approval. |
| Full board | PASS local 55-game regulation comparison; full randomized OT board NOT TESTED. |
| Poll/chunk invariance | PASS local scripted cases. |
| 1x/50x invariance | PASS local scripted cases. |
| Backend persistence/versioning | PASS local adapter reload/exactly-once and existing version guard tests; cloud RPC/schema integration BLOCKED/unverified. |
| Chairman integration | Source presentation/API PASS; browser OT integration NOT TESTED. |
| Public integration | Source presentation/public API PASS; deployed/browser OT integration NOT TESTED. |
| Mobile Safari | NOT TESTED. |
| Existing-session compatibility | NOT TESTED for old OT checkpoints; no migration or repair applied. Foreign/official session denial PASS. |
| Chairman completed-candidate approval | Pending review; no release certification asserted. |
