# GameCast Project — Current State and Sandbox Registry

Registry revision: 2026-09-18-R1 (UTC). Supersedes the 2026-09-07 snapshot as the current baseline; that snapshot is retained below as historical evidence.

## Verified current baseline

| Component | Registered value | Evidence |
|---|---|---|
| Product/release | Synthcast GameCast 4.3.1, preview / corrective release candidate | Chairman statement, release source, live page |
| UI lineage | 4.2.3 interaction hardening, rebound to 4.3.1; includes PURGE UI + NEW SESSION | Build chain and live JavaScript |
| Football mechanics | 4.2.2 lineage | Build copies 4.2.2 runtime; generated result exactly matches deployed source |
| Repository | rgbslb11/Synthcast-Console | GitHub inspection |
| Baseline branch | release/gamecast-v4.3.1 | Resolved branch head |
| Pinned baseline commit | 8163e9d1a2b22789f0579a761d1e4ae926eaa430 | Resolved 2026-09-18 |
| Operating week | 2026-W04; 55 Schedule-v5 games; 110 participants | Deployed schedule and local count check |
| Runtime function | gamecast-week4-v4-3-1 | Supabase deployed-source inspection |
| Runtime identity | GC-W4-V4.3.1-RC1 | Deployed index.ts |
| Backend deployment | ACTIVE, function version 3 | Supabase metadata |
| Supabase project | percrnamjzetzjjuxuuw | Connected deployment |
| Existing session namespace | w4v431- | Deployed source; not a new sandbox namespace |
| Browser storage namespace | synthcastGameCast431Operator | Live JavaScript |
| Chairman route | https://rgbslb11.github.io/Synthcast-Console/v4.3.1/ | Live HTTP 200 |
| API | https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week4-v4-3-1 | Live UI binding and deployed source |
| Light Chairman theme | NOT ACTIVE on the verified route; dark background #090b0e | Live HTML links ../v4.2/app.css; retrieved CSS matches source |

Data identity: `W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_POST_W3_121_60_99+GAMECAST_V1_1_FCS60+V431_UI_RESET`.

The product number, UI lineage, football-mechanics lineage, and deployed engine identity are different fields. Retaining 4.2.2 football mechanics does not mean the current UI should call the old Week 3 function.

## Ratings and schedule contract

Source: `SYNTHCAST_GAMECAST_W4_TEAM_OFF_DEF_POWER_121_v1.1.xlsx`, worksheet `GameCast Power`, identified by the release record; the workbook itself was not reread in this registry update. Deployed power.ts and the committed approved power artifact match exactly.

Power source identity: `SYNTHCAST-v4.3.1-W4-POST-W3-2026-09-14-GAMECAST-TEAM-OFF-DEF-v1.1-121+FCS_60`.

- 121 canonical teams × 3 ratings = 363 fields.
- 4 additional schedule-only synthetic FCS-path teams × 3 = 12 fields.
- Total: 125 runtime rows and 375 rating fields.
- Scheduled: 55 unique games, 110 distinct participants, 330 rating fields; source coverage 55/55.
- Charlotte: TEAM 60 / OFF 60 / DEF 60.
- Duquesne: TEAM 60 / OFF 60 / DEF 60.
- Idaho: TEAM 60 / OFF 60 / DEF 60.
- Western Kentucky: TEAM 60 / OFF 60 / DEF 60.
- Preserve synthetic team classification. Do not substitute real-world membership.
- TEAM maps to overall; OFF to offense; DEF to defense. Preserve the approved values without recomputing a blend.
- Old 0.10× opponent-derived FCS values are superseded for this baseline.
- G0142 is Colorado at Northwestern; kickoff and network remain TBD/BLOCKED in the inspected release. No schedule correction was made.
- Existing sessions retain their own snapshots. Source coverage does not prove any particular existing session has current ratings. No existing session was inspected or migrated during this update.

## Provenance verification performed in this update

The pinned generator chain was reconstructed locally without deployment. Its three runtime outputs match the three deployed function files byte-for-byte. Generated index.html and app.js match the live 4.3.1 page assets byte-for-byte; the live shared CSS also matches the pinned CSS.

| File | SHA-256 of deployed content / matching generated output |
|---|---|
| index.ts | 33fecdd438ea497458a878dc437ff0c7dfb3dbc64810b154370b3a45ec31fdcf |
| week4.ts | 13cfad6038c0fb7400aaa13ee020462b58754f2e7e9591dc6145df8412e58a22 |
| power.ts | f0609f8715c691f256f6bc4234eee08664099d69a146a4e47f4b702218762b94 |

Deployment bundle metadata: `ezbr_sha256=7d27f0438d117f57758660f7c3fd30326f5371a5512b8896b03a81bb826e3e7f`. This bundle hash is distinct from individual source hashes.

These checks PASS for source/deployment provenance, build reconstruction, static counts, and UI/API binding. They do not certify football behavior or isolation.

## Sandbox-only operating boundary

Chairman direction: update the registry to the latest verified engine baseline and conduct subsequent engine modification/testing only in a sandbox. The particular next engine changes have not yet been selected in this turn. The seven-item backlog below is not blanket implementation approval.

Current sandbox status: NOT PROVISIONED. A local source reconstruction exists for inspection; it is not an isolated running console or cloud test service. Execution of experimental changes is BLOCKED until isolation is implemented and verified.

Before the first experimental run:
1. Derive the sandbox from pinned 4.3.1 commit 8163e9d1a2b22789f0579a761d1e4ae926eaa430 and the matching runtime outputs above, including current ratings and Week 4 data.
2. Use a separate development branch/worktree, explicit sandbox engine/run identity, isolated UI route and browser storage key, and isolated persistence. A branch or a new session in the current backend alone is insufficient.
3. Bind the sandbox UI exclusively to its test backend. Do not reuse live operator credentials, current session slugs, or live storage bindings. Test that cross-environment writes fail.
4. Prefer a local/offline harness with mocked persistence for the first mechanics tests. If a cloud sandbox is needed, verify the actual storage schema and credentials before provisioning; this registry does not choose or claim a new cloud project.
5. Mark all outputs QA_ONLY; block official acceptance, publication, SEUD, standings, ratings feeds and other live result promotion. Exercise lifecycle behavior only in isolated QA storage.
6. Pin seed, input state, ratings, schedule, engine revision, and intervention history for reproducible baseline-versus-candidate comparisons.
7. Record each requested change and its tests independently. Preserve all prior releases, accepted results and active sessions. Do not silently assign a new release version.

No cloud session, deployment, engine behavior, ratings, schedule, or UI styling was changed in this registry task. No production merge or SEUD publication is authorized.

## Seven separately tracked requirements

| ID | Requirement | Current disposition | Next sandbox evidence |
|---|---|---|---|
| 1 | Two-minute / endgame decision trees | Proposed enhancement; retained mechanics are the baseline, no new late-game redesign established | State-driven decision and clock-transition cases |
| 2 | Variable Game Length caused by plays and stoppages | Proposed enhancement; old calibration results are historical, not current tests | Event-accounted duration and multi-seed distributions |
| 3 | Chairman scoring influence per drive / quarter | Proposed design; no implementation claimed | Bounded probabilities, expiry, intervention lineage, no guaranteed score |
| 4 | Exportable play-by-play, drive ledger and derived team statistics | Existing limited history/counters; full proposed capability not established | Ledger-to-box-score reconciliation; no extra RNG draws for logging |
| 5 | Random opening receiver; reciprocal halftime receiver | Outstanding; deployed initialGame/reset use possession 0 and Q3 assigns 1 | Seeded single draw, reciprocal receipt and invariance |
| 6 | Weekly slate upload, validation, preview and lock | Proposed; deployed runtime still imports compiled week4.ts | Exact game-set equality, immutable revisions, isolated administration |
| 7 | Off-white / grey Chairman theme | Requested design remains outstanding; current route is dark | Isolated stylesheet; contrast, edit focus, mobile and public-view scope |

Count check: 7 expected / 7 recorded. Implementation order remains a proposal; next specific changes require the Chairman's selection.

## Release gates for a future sandbox candidate

No candidate mechanics were changed and no simulation suite was run during this registry update. Historical passes below do not transfer automatically.

| Gate | Current sandbox candidate status |
|---|---|
| 1. Engine/state integrity | NOT TESTED |
| 2. Fixed-seed regression | NOT TESTED |
| 3. Multi-seed distributions | NOT TESTED |
| 4. Full-board simulated checks | NOT TESTED |
| 5. Poll/chunk invariance | NOT TESTED |
| 6. 1x vs 50x invariance | NOT TESTED |
| 7. Backend persistence/versioning | NOT TESTED |
| 8. Chairman console integration | NOT TESTED |
| 9. Public scoreboard integration | NOT TESTED |
| 10. Mobile Safari | NOT TESTED |
| 11. Existing-session compatibility | NOT TESTED |
| 12. Chairman approval of candidate | NOT TESTED — no candidate presented |

## Source references and conflicts resolved

- Pinned source: https://github.com/rgbslb11/Synthcast-Console/commit/8163e9d1a2b22789f0579a761d1e4ae926eaa430
- Release record: https://github.com/rgbslb11/Synthcast-Console/blob/8163e9d1a2b22789f0579a761d1e4ae926eaa430/GAMECAST_4_3_1_CORRECTIVE_RELEASE.md
- Generator authority: scripts/build-gamecast-v43.mjs → build-gamecast-v431-base.mjs → build-gamecast-v431.mjs.
- Direct deployed-source inspection: Supabase gamecast-week4-v4-3-1, ACTIVE version 3, inspected 2026-09-18 UTC.
- Live page/assets: /v4.3.1/, /v4.3.1/app.js, /v4.2/app.css, retrieved 2026-09-18 UTC.
- The old uploaded snapshot pins a55561f and Week 3; it is historical, not the sandbox starting point.
- Generated public/v4.3.1 and gamecast-week4-v4-3-1 files are build outputs absent from this Git tree. A contents-API 404 for those paths does not mean the deployed release is missing. Reconstruct through the pinned generators.
- The live route remains dark. The prior 4.2.4 light-console plan is not evidence of deployment.
- Storage RPC calls were inspected in source; current database DDL/RLS was not inspected. Cloud sandbox storage design remains BLOCKED on that inspection.

---

## Historical appendix — preserved 2026-09-07 snapshot

Everything below is historical, including its phrases “current” and “live,” its Week 3 ratings, endpoints, counts and test results. Do not use it to override the registry above.

# GameCast Project — Current State Snapshot

**Snapshot date:** 2026-09-07  
**Repository:** `rgbslb11/Synthcast-Console`  
**Branch:** `release/gamecast-v4.2.2`  
**Pinned reference commit:** `a55561fb346d1149352ea7bca1acf417c4ab37c6`  
**Status:** 4.2.2 corrective release candidate; staging cloud runtime published; no production merge.

## Live surfaces
- Chairman / Control Console: `https://rgbslb11.github.io/Synthcast-Console/v4.2.2/`
- Supabase staging project ref: `percrnamjzetzjjuxuuw`
- Edge Function: `gamecast-week3-v4-2-2`
- Edge endpoint: `https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2-2`
- Engine: `GC-W3-V4.2.2-RC1`
- Data identity: `W3-51+POWER_60_99_V422+PERIOD_STATE_FIX+PLAYVOL_CAL_2500`
- Week/session namespace: `w3v422-`

## Week 3 data contract
- 51 games
- 102 participating teams
- 102/102 rating coverage
- TEAM / OFF / DEF on Chairman-approved 60–99 scale
- Southern Utah override: TEAM 62 / OFF 62 / DEF 62, based on 0.10x opponent-strength mapping versus Colorado State
- Cal Poly override: TEAM 62 / OFF 63 / DEF 61, based on 0.10x opponent-strength mapping versus San Jose State
- Florida International schedule identity maps to FIU rating lineage; current runtime key is `Florida International`

Do not alter ratings or Week 3 schedule/carriage without explicit authorization.

## 4.2.1 failures that triggered 4.2.2
Operator-observed live failures included:
- apparent Q1 -> Q4 jumps;
- scores accumulating in invalid period `0`;
- Q2–Q4 showing zero while totals changed;
- regulation games ending around 53–56 minutes GL;
- unreliable box-score attribution;
- concern over a Rutgers fourth-down/FG situation near the opponent 11.

### Proven root causes
1. **Ordinary break expiration could call the quarter-advance path.** A TV timeout with `pendingPeriod = 0` could corrupt the quarter to 0; the old fallback label displayed non-1/2/3 as 4th, and subsequent scoring used `scores["0"]`.
2. **A play could strand at 0:00.** Play duration could remain after scoreboard time reached zero.
3. **Projection result could depend on read/poll chunk size.** POST timing combined stopped dead-ball and running runoff in a way that could cross internal boundaries differently depending on projection chunk size.

### 4.2.2 corrections
- quarter advances only when a real `pendingPeriod` transition exists;
- invalid regulation quarter/pending transition/score-period states are rejected;
- score totals and UI rendering accept only Q1–Q4 plus valid OT labels;
- plays legally started before 0:00 resolve correctly;
- POST timing is segmented into deterministic stopped/running phases with exact break-threshold handling;
- dedicated 4.2.2 UI points directly to the 4.2.2 backend/storage namespace.

## 4.2.2 engineering test results before cloud QA
Targeted fixed-seed regression after correction:
- lifecycle: `FINAL_PENDING`
- GL: 7,541 sec = 2:05:41
- quarters observed: 1, 2, 3, 4
- line-score keys: 1, 2, 3, 4 only
- total plays: 126

500-run structural calibration:
- mean GL: 7,550.77 sec = 2:05:50.77
- P10 GL: 7,380 sec = 2:03:00
- median GL: 7,538 sec = 2:05:38
- P90 GL: 7,735 sec = 2:08:55
- mean plays: 123.13
- poll/chunk invariance: 100/100 passed
- 1x vs 50x equal-synthetic-time invariance: 100/100 passed

Full Week 3 board audit:
- 51 matchups x 5 runs = 255 simulations
- all 255 passed structural checks
- mean GL approximately 2:06:21
- median approximately 2:06:04
- P10 approximately 2:03:34
- P90 approximately 2:09:31
- mean plays approximately 124.84
- no quarter-0 or invalid line-score states observed.

## Published cloud QA
QA workflow run: `34168197660`

Fresh QA session:
- `w3v422-a0b6b471fff79ed2`
- engine `GC-W3-V4.2.2-RC1`
- 51 games / 51 POWER READY / 0 pending
- controlled game: G0066 Rutgers at Boston College
- AUTO / 50x
- Q1, Q2, Q3, Q4 all observed
- no invalid period 0
- final GL: 7,748 sec = 2:09:08
- synthetic QA final: Boston College 31, Rutgers 0
- final persisted/read back as `LOCKED`

This result is **QA only**, not an official Week 3 result. It must not flow into standings, ratings, or SEUD.

## Source authority note
The current deployed Edge Function's runtime engine is contained in `supabase/functions/gamecast-week3-v4-2-2/index.ts`, which imports `week3.ts` and `power.ts`. The retained `engine-core.ts` is included in the repository/source pack for lineage and audit context, but the current `index.ts` does not import it. When tracing actual deployed behavior, treat `index.ts` plus its direct imports as runtime authority.

## Open issue intentionally NOT corrected
15-minute-quarter mode was found in audit to average roughly 2:32:33, shorter than the previously contemplated 3:20–3:40 range.

No 15-minute-mode retune has been authorized. Treat it as an open design item requiring Chairman approval before implementation.

## Protected boundaries
As of this snapshot, do not change without explicit authorization:
- Week 3 ratings
- Week 3 schedule/carriage
- HFA
- run/pass/completion/turnover/explosive-play tuning
- FG/fourth-down probability tuning
- 4.2 RC3 duration constants except in an explicitly approved timing project
- uncertainty/upset mechanics
- official/accepted result governance
- production/SEUD state
