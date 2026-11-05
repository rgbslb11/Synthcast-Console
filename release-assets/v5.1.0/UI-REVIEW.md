# GameCast 5.1 UI review — GitHub only

Development branch: `ui/gamecast-v5.1.0-review`.
Verified base: `development/gamecast-v5.1.0` at
`8a1a647845d2ab6c05241973239937b6ca1e6ab3`.
WP reference: `development/gamecast-v5.1.0-wp` at
`eb6f35231cc8b07c424b3732d74f22f335154746`.

AGENTS.md, GAMECAST_MASTER_ROUTER.md and procedure 03_UI_ONLY_FEATURE.md were
read in full. This is presentation and read-only transport work. No backend
scope expansion is implemented. Earlier migration instructions are historical.

The Chairman directed all implementation to this GitHub repository and no
changes to existing hosted Sites. No hosted Site was modified or deployed.
The earlier temporary local preview was stopped. `.openai`, `app`, existing
publication workflows, prior-release UI, engine, contracts, calculations and WP
implementation remain unchanged. This branch has verification only, no deploy job.

## Actual baseline and evidence

- Integration head was rechecked before preparing this branch; still 8a1a647.
- No `public/v5.1.0` UI existed at that baseline. Two new surfaces were pending.
- Supabase project `xsvdmcipviejxynkdbhq` has active QA details v1 and QA commands
  v2. The details deployment requires JWT and allows only
  `https://rgbslb11.github.io`; inspected deployed edge.ts matches that binding.
- An unauthenticated QA details GET returned HTTP 401. No positive authorized
  live browser integration was performed here. No grants/identities were created.
- WP handoff says local contract/fixtures ready, hosted route/worker not deployed.
  Its eight response cases informed interface checks. Backend-derived observations are excluded from this change set; public examples are hand-authored generic data.
- HTTP observation: `/v5.1.0/` on GitHub Pages returned 404; historical
  `/v5.0.6/w11/` returned 200. This is route evidence, not a claim that the
  Chairman's 5.1 migration must be repeated. No migration or old-release edit occurs.
- The legacy `.openai` Site identity belongs to the Week 1 app, not this UI target.

## Markup reconciliation — 9 annotation objects

Source: the newly supplied `Week_10_Scoreboard_Prototypes_Review(1).pdf`, page 1.
Its 9 annotation objects were inspected and rendered. The accompanying
`UI Overview_baxter(1).pdf` has no annotation objects and shows the base layout.

| Object | Exact annotation | Disposition |
| --- | --- | --- |
| 1 | FreeText: StatsCenter | Active navigation label and board title use StatsCenter. |
| 2 | Square: StatsCenter | Active StatsCenter navigation receives the canonical red treatment; same instruction as object 1, retained separately. |
| 3 | Square: Chairman Console | Separate navigation control retained. Destination is BLOCKED pending a verified current 5.1 console route; no historical route guessed. |
| 4 | Final Results | Finished lane and filter renamed Final Results. Does not accept or publish results. |
| 5 | INPROGRESS | Live lane and filter use the exact requested label. |
| 6 | Updated / Zulu Time | Header shows Updated Zulu Time with the persisted source-commit UTC timestamp. It does not manufacture authoritative Master Zulu from a browser clock. |
| 7 | Add “S” logo | Actual supplied S logo used with preserved proportions. No team logos. |
| 8 | Blocked = <BLANK>; “Remove Chairman Correction” | Blocked board action area is blank; no BLOCKED action, link, or correction notice on the card. Direct detail still fails closed and explains server restrictions. |
| 9 | Drawing-only Stamp; empty Contents | Rendered separately. No additional readable instruction established; BLOCKED for any interpretation beyond its visible marks. No invented instruction applied. |

Counts: expected 9 objects; inspected 9; documented 9. Two StatsCenter objects
are separate annotation objects, not two independent product requirements.

## Design sources and approval boundaries

Page background is #ECECEC. Actual retrieved palette and unified branding PDFs
specify #F7F7F7 surfaces, #B8B8B8 borders, #000000 primary text, #303030 secondary
text, #D71A20 scoreboard red, #1A6D37 status green, and #EA1B23 supplied logo red.
The WP owner's BLOCKED treatment specifies #808080. Source logo file was the
supplied `image(20261103-163439).png`, SHA-256
`1ef07d96544525c32612fb4ca03d6e28ac138ae459bde1d6581b2f4d02761e7b`.

All nine pages of Synthcast_UI_Mockups_Review.pdf were reviewed: Detailed Game
Center overview/statistics/play history; Broadcast live/drive/WP; Chairman
monitor/analysis/alerts. They are labeled illustrative design concepts. Team
logos, betting lines and invented fields in those concepts were not adopted.
The marked Status Lane Board is the specific board direction. No final Detailed
Game Center visual approval was found. Its current layout is a review scaffold,
not an approved final design. Relevant editable PPTX files were not located after
two targeted searches; their contents and approval status remain BLOCKED.

## 1. Scoreboard–Stats–Rollup / StatsCenter

Before: no 5.1 board source. After: a separate text-team status-lane board with
search, filters, blank blocked actions, explicit not-started state, expandable
contract rollup, S branding, source UTC, selection and board return restoration.

Fixture board: six hand-authored generic UI examples, with no real teams or game histories.
Roster and lifecycle metadata are explicit example inputs;
those fields are deliberately not represented as delivery API fields.

Live adapter: authenticated GET-only details, bound session/game/run/revision,
rebuild on revision changes, bounded retries, no credential persistence. Current
delivery has no roster/lifecycle endpoint; explicitly supplied game IDs are
unclassified rather than guessed into lanes. Unsupported live lane filters are
disabled. No 56-game full-board polling claim is made.

Review source: `public/v5.1.0/review/index.html` (`#board`). No hosted preview or
production route was deployed. GitHub verification publishes screenshots as run
artifacts, separate from deployment.

Remaining: board index/summary API, correct 5.1 Chairman destination, authorized
live QA, current source time semantics, true halftime/activity/lifecycle and
metadata for blocked/not-started games. Existing operator controls are untouched.

## 2. Detailed Stats / Game Center

Before: no 5.1 detail UI. After: separate route (`#game=G9001` in the fixture),
game switching, Team Stats default, Overview, Play-by-Play, Possessions/Field,
Scoring and WP tabs. Return preserves filter/search/card position. The viewer
renders backend values only; scoreboard and GL never advance in the browser.

Exact inventory: 17 scoreboard fields; 27 statistics per team (26 table rows plus
scoring summary); all 22 play attributes in the selected-play panel; live and
historical possession/field access; one WP component. Missing values remain
unavailable/dash. Zero-denominator rates are not converted to zero.

Pagination uses nextSequence, run and stateVersion, not throughEventSequence.
BLOCKED/access failure clears detailed content. Historical selection survives
refresh in the same run and is reset when run identity changes. Reconnection
requires an authorized coherent snapshot. Reload never silently changes a live
connection into fixture values; it requires authentication again.

WP rendering uses generic observation-shaped examples only. It does not generate estimates. Separate fixture examples are
explicitly labeled as independent of the selected game's statistics. Current
BLOCKED value is null and prior points are grey. Lines break at missing/null
observations and run/model boundaries; no smoothing or model calculation. The
prepared WP pagination adapter preserves the high watermark and observation
cursor. No hosted WP URL is guessed; no prior editor is connected without a
supplied approved prior manifest.

Remaining: hosted WP composition/sampler/endpoint, authenticated positive live
read, final layout approval, real devices, and historical line-to-gain geometry
from the backend. Historical ball coordinates are shown; historical line to gain
is unavailable rather than recomputed in UI.

## Precise handoffs — no backend changes here

| Owner | Missing interface/behavior | Required resolution |
| --- | --- | --- |
| Backend | Session roster and bounded board summary | Supply gameId, teams/entering records, schedule/network/week/venue, lifecycle, activity/halftime, acceptance status, score/current display and detail availability for ALL authorized games, including blocked/not-started. Define revision/source timestamp and GET-only batch semantics. Keep stats inventory unchanged unless explicitly revised. |
| Backend | Master Zulu versus source commit | Supply authoritative operations time if current Master Zulu is required. generatedAt is persisted source commit, not current operations time or last browser receipt. |
| Backend | Historical field geometry | Expose per-play pre-snap lineToGain/goalToGo from existing fieldState logic, or document the approved presentation transform; UI does not duplicate that calculation. |
| Integration | Chairman destination/Auth | Provide verified 5.1 console route and supported active Chairman identity/session flow. Existing QA details origin is GitHub Pages only. No origin allowlist or grant is changed here. |
| WP | Hosted endpoint and worker | Review WP branch independently, provision its QA storage/composition, central five-second sampler, explicit authenticated route, approved manifest and hosted tests. UI consumes read-only observations. |
| Chairman | Final Detailed Game Center design | Approve or mark up this scaffold after reviewing the marked board implementation. Exploratory mockups are not treated as final approval. |

## Verification and limits

- 12 local UI transport/contract tests PASS, including all 8 generic WP state examples,
  immutable reads, 17/27/22 cardinalities, authorization failures, page recovery,
  null/zero distinction and WP high-watermark handling.
- 94 retained 5.0.6/5.1 backend tests PASS in this workspace before markup edits;
  final combined check is recorded in the GitHub verification run.
- Earlier local Chromium checks: board filters/search, game return, 22 play
  attributes, historical selection across refresh, direct blocked detail with
  zero tables, grey WP audit, and 390/820/1194 iframe viewport checks across all
  six detail tabs. These were fixture checks before the final markup changes.
- `tests/v510-ui/browser.mjs` and `verify-v510-ui.yml` run final markup,
  Chromium/WebKit viewport, navigation and mocked HTTP recovery tests in GitHub.
  Their actual run result is authoritative; authoring a test is not a pass.
- Actual backend response verified here: unauthenticated HTTP 401 only.
  Positive authorized live integration, sustained cloud load, actual live
  updates/recovery, real iPhone/iPad and native Mobile Safari: NOT TESTED.
- Static protection diff: `.openai`, `app`, existing engine/backend/contracts,
  historical release and production publication workflow unchanged.

Not release ready. No production/merge/official-result approval is implied.
Rollback: leave this isolated branch unused or revert its new UI/test/docs files;
no cloud, database, Site or production restoration is needed.

## Upload boundary

Automatic approval review rejected including the earlier generated game-stat/WP records in GitHub. Those records were excluded. The pushed example payloads contain only generic Example Away/Home/Favorite labels, G9001–G9006 example IDs, year-2000 timestamps and explicitly authored interface values. The generator has no engine import, database access or live API calls. No rejected backend-derived record is uploaded or regenerated by this UI verification workflow.
