# GameCast 4.2.3 — operator edit preservation

Status: implemented and tested; Chairman authorized 4.2.3 branch deployment on 2026-09-08. Publication is pending workflow verification; not certified final.
Date: 2026-09-08.
Base: `42e57e5dcfaa688a2ff40573c7e1a8d726e9432f` on `release/gamecast-v4.2.3` (identical to 4.2.2 when work resumed).

## Authorized scope and finding

**P1 — operator-control / correction-entry integrity.** Observed source behavior: a successful 7-second operator read called `render()`, which replaced the whole grid using `innerHTML`. Public reads used 4 seconds. Open Chairman Edit inputs were rebuilt from cloud values, losing partial entries and focus. Evidence: base `public/v4.2.2/app.js`, functions `load`, `render`, `edit`, and the final polling interval; `public/v4.2/patch-rc2.js` supplies the final edit renderer and Save handler. Root cause is destructive DOM replacement during interaction. Impact is draft loss and the possibility of saving an unintended correction. Correction and regression scope were restored by the Chairman in the resumed thread; no football tuning is authorized.

## Implementation

- New `public/v4.2.3/index.html` and `app.js`. All older release files are unchanged.
- UI label is 4.2.3. Cloud endpoint remains `gamecast-week3-v4-2-2`, actual engine remains `GC-W3-V4.2.2-RC1`, sessions remain `w3v422-`, and operator storage remains `synthcastGameCast422Operator`. Existing credentials/session links can be used on the new UI route. This is a UI release, not an engine release.
- Polling stays at 7 seconds operator / 4 seconds public. Master Zulu's existing local one-second tick remains independent.
- Background reads continue during Edit or focused input/select/textarea interaction, but do not adopt new editable state/version or rerender the grid. They update cloud-derived GL text and the Master Zulu anchor only. Other game score displays therefore catch up when interaction ends.
- Command/filter renders keep each open edit card and focused game card physically attached. Opening or saving a second game does not destroy the first game's draft. Filters retain protected cards until the interaction finishes.
- Read responses started before a write are invalidated. Writes are serialized. Successful commands advance the local version from their CAS-protected response; this allows multiple local edits while an intervening external write still conflicts.
- Successful Save/Cancel replaces only its own protected card and requests a fresh authoritative read. Remaining open edit cards retain their drafts and version protection.
- Background polling does not flash SYNCING or replace a successful write/manual status banner. Network errors remain visible.
- A server version conflict preserves drafts and blocks further writes until the Chairman uses REFRESH and explicitly confirms discarding local drafts. It does not retry a stale correction or silently rebase it. Reload alone does not cancel the cloud Edit state.
- Existing OT edit rendering and valid-period filtering are reused in their original script order.
- A regression-only workflow runs on the 4.2.3 branch. It has no deployment job and never creates cloud sessions automatically.

## Validation evidence

### Local DOM and engine integration — PASS, 10/10

`scripts/test-gamecast-v423-ui.mjs` loads the actual classic UI scripts into jsdom, and uses the actual 4.2.2 `beginEdit`, `advanceGame`, `commitEdit`, and `cancelEdit` implementations. HTTP/persistence is simulated in this suite. Tests cover:

1. 35 simulated seconds / five reads: all fields, element identity, focus and selection survive; GL/Master advance; RNG/history/football state freeze.
2. Save of all 17 input fields, exact backend state and forced readback.
3. Cancel checkpoint restoration and resumed version adoption.
4. Focused prelaunch select during an in-flight read, including external-version conflict.
5. Read started before a command cannot overwrite its checkpoint or new form.
6. Two simultaneous game edits; opening/saving one preserves the other's form and focus.
7. External conflict preserves drafts, blocks retries and requires explicit discard to reload.
8. Manual refresh/filter render retains the active form.
9. Original operator/public intervals and public updates while a game is in EDIT.
10. Failed write/read preserves the draft; successful retry closes it and resumes sync.

Reproduce with Node 24:

```bash
npm install --prefix /tmp/gamecast-v423-qa --no-audit --no-fund jsdom@26.1.0
GAMECAST_QA_MODULES=/tmp/gamecast-v423-qa node --test scripts/test-gamecast-v423-ui.mjs
```

### Live staging HTTP + local DOM regression — PASS

Explicitly created a new QA-only session: `w3v422-4626b0ba019b726b`.
Engine: `GC-W3-V4.2.2-RC1`. Slate: 52 games. Controlled QA game: G0066.

- Launch → AUTO → Chairman Edit.
- Actual edit window: 61 seconds; cloud GL increased 62 seconds from the opening checkpoint.
- Five spaced background reads preserved all 17 field values, the exact clock input element and focus.
- Cloud read confirmed EDIT lifecycle and unchanged RNG, history, scores, quarter, football clock, possession, field, down/distance and timeouts during the edit.
- Save & Hold persisted Q1–Q4 scores `[7,0]`, `[3,10]`, `[14,7]`, `[0,3]`; Q3 at 06:42; home possession; opponent 11; fourth-and-6; timeouts 1/2. A continuation run was confirmed.
- An unauthenticated public read returned the corrected scores and clock.
- A second edit followed by Cancel restored the saved checkpoint.
- QA stopped at FINAL_PENDING; never locked, accepted, READY or published. These arbitrary QA values are not official results and must never feed standings, ratings or SEUD.

Reproduction is explicitly opt-in and always creates a fresh staging session:

```bash
GAMECAST_QA_MODULES=/tmp/gamecast-v423-qa node scripts/qa-gamecast-v423-cloud.mjs --create-qa-session
```

This was jsdom with real staging HTTP, not a Chromium/Safari browser test. No production or operational session was used.

### Existing engine regression — PASS

The unmodified 4.2.2 fixed-seed regression and broader backend audit were rerun using Node 24 native TypeScript stripping instead of the unavailable TypeScript package. Test harness and engine logic were unchanged.

- Fixed seed: FINAL_PENDING, GL 7,541 seconds, Q1–Q4 only, 126 plays.
- Existing chunk and equal-synthetic-time 1x/50x assertions passed.
- Existing edit/delay/pause and other assertions in the broader audit passed.
- The known 15-minute duration diagnostic remains open; no retuning was made.

## Release gates — exactly 12

| # | Gate | Status | Evidence / limit |
|---|---|---|---|
| 1 | Engine/state integrity | PASS | Existing regression/audit and live edit freeze/save/cancel checks; UI-only scope. |
| 2 | Fixed-seed regression | PASS | Existing 4.2.2 fixture, GL 7,541, 126 plays. |
| 3 | Multi-seed distribution checks | NOT TESTED | No new distribution run; engine unchanged. |
| 4 | Full-board checks | NOT TESTED | All 52 cards rendered in local/live-session tests; no new full-board simulation audit. |
| 5 | Poll/chunk invariance | PASS | Existing backend audit assertions and new stale-read UI tests; not a new population-scale run. |
| 6 | 1x vs 50x invariance | PASS | Existing equal-synthetic-time backend audit assertion. |
| 7 | Backend persistence/versioning | PASS | Fresh live-session save/readback/cancel; conflict UI tested with simulated external writer. |
| 8 | Chairman console integration | PASS | Actual scripts, local DOM, real staging HTTP; native browser testing remains untested. |
| 9 | Public scoreboard integration | PASS | Public DOM fixture and live unauthenticated corrected-state readback; deployed 4.2.3 page untested. |
| 10 | Mobile Safari | NOT TESTED | No Safari/device test performed. |
| 11 | Existing-session compatibility | NOT TESTED | Same API/storage contract preserved; pre-existing operational sessions were not exercised. |
| 12 | Chairman approval | PASS | Chairman explicitly authorized deployment from the separate 4.2.3 branch on 2026-09-08; no production merge or final certification authorized. |

## Next step / handoff

Patch source is ready for review on `release/gamecast-v4.2.3`. The 4.2.3 route has not been published. No production merge, older-release overwrite, backend deployment, ratings/schedule modification or accepted-result change is included. Native desktop/mobile browser verification and Chairman review remain before final release certification. Do not infer a new backend or alter engine identity to match the UI label.

## Deployment authorization and Week 3 verification

The Chairman requested deployment on the separate 4.2.3 branch. `.github/workflows/deploy-v423-preview.yml` publishes the existing GitHub Pages site with the added `/v4.2.3/` route. It verifies the 51 canonical Week 3 games plus the single explicitly labeled Week 2 carryover G0021, the `2026-W03` engine key, all prior public/backend source files against the base commit, all exported public file bytes, and the UI regression before deploying. It does not regenerate or redeploy the backend. Changes confined to this document do not trigger deployment. The existing regression-only workflow remains read-only.

A fresh read of the previously created QA session confirmed `2026-W03`, 51 Week 3 games, one Week 2 carryover (SMU at Florida State), 52/52 power-ready games, and `GC-W3-V4.2.2-RC1`. The patch did not change the week or schedule.
