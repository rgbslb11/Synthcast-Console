# Detailed Stats UI — IMG_0548.jpeg

UI-only update on `ui/gamecast-v5.1.0-review`, from `7ae9450`.
Integration and WP heads rechecked: `8a1a647` and `eb6f352`, respectively.
AGENTS, router and procedure 03 loaded in full. All implementation remains in
GitHub; no hosted Site, app, engine, contract, backend/WP logic or deployment is changed.

## Explicit Chairman clarifications

- Circled Play-by-Play / Drives: **Combine them.**
- WP COLOR Δ: **Favorite = Black >50%; when it goes below 50%, Red.**

Presentation rule: `p < 0.5` → canonical red #D71A20; `p >= 0.5` → black #000000.
Exactly 50% stays black until the favorite falls below the threshold. BLOCKED
and missing values override this treatment with grey #808080 and no current
percentage. The favorite never switches identity at the threshold. No equation,
probability, observation, or football state is recomputed by this rule.

## Markup and layout reconciliation

These are visual targets in a JPEG, not a PDF annotation-object count.

| Target | Applied behavior / boundary |
| --- | --- |
| Crossed Game Center label and handwritten Game Stats | Detail heading and masthead use GAME STATS. |
| Away logo in score band | Removed; authoritative team text only. |
| Home logo in score band | Removed; authoritative team text only. |
| Crossed line / O-U panel | No betting panel. Existing available network/weather/schedule metadata remains below the compact score band. |
| Circled Play-by-Play / Drives | One combined tab, drive selector, supplied drive rollup and matching resolved plays. Filtering uses server playSequences. |
| Question mark beside Scoring | No deletion instruction was established; Scoring remains accessible. The clear lower-panel rename is applied separately. Further meaning of the question mark is BLOCKED pending instruction. |
| Favorite WP logo | Removed; supplied favorite identity rendered as text. |
| Other-team WP logo | Removed. No invented opponent probability/complement is calculated. |
| WP COLOR Δ | Explicitly clarified black/red favorite rule applied to current number, plotted line/dots and supplied frozen prior ring. Grey audit history remains grey after blocking. |
| Away logo in Key Team Stats | Removed. |
| Home logo in Key Team Stats | Removed. |
| Scoring Events crossed to Summary | Panel heading SCORING SUMMARY. |
| First scoring-row logo | No team logo is rendered. |
| Second scoring-row logo | No team logo is rendered. |
| Third scoring-row logo | No team logo is rendered. |
| Fourth scoring-row logo, not individually crossed | Standing no-team-logo rule also applies. |
| Game-bank team logos | Standing no-team-logo rule applies throughout the left game bank. |
| Grey covered area / incidental photo-app chrome | No additional legible requirement established. Photo controls and thumbnails are not application UI. |

The reference structure is now left game bank → compact score/clock/timeout/
possession/line-score band → Overview, Team Stats, Play-by-Play / Drives, Scoring.
Overview has exactly four widgets: Current Drive, Live WP, Key Team Stats,
Scoring Summary. On narrow screens the bank yields to an explicit game selector;
Overview stacks vertically. Desktop and landscape preserve the two-column rows.
The canonical #ECECEC page and neutral field palette remain in use; no additional
turf color or team branding is invented from screenshot pixels.

## Interface behavior

Both sides of the score band use supplied team names and timeout counts. No
abbreviation mapping is invented. Scoreboard clock and GL remain separate; the
Master Zulu/source-commit distinction remains in the global header.

Key Team Stats uses seven existing fields: totalOffense, rushingYards,
passingYards, firstDowns, thirdDownConversionsPercentage, turnovers,
timeOfPossession. Team Stats still exposes all 27 requested entries. The
combined history view exposes all 22 attributes for the selected play. Drive
and historical selection survive refresh and reset when game/run identity changes.

WP is assigned to a selected game only when session/game/run/stateVersion match.
A mismatched game/run is unavailable; a mismatched source revision is pending.
No hosted WP route is guessed. The generic G9001 examples are explicitly authored
UI data, aligned by identity to demonstrate this view; no backend-derived
observations, real teams, schedules, or live game records are exported.

The plot uses immutable observation sequence on its x-axis. It does not invent
quarter/time positions when source coordinates are absent. Color clipping at
50% changes only presentation. Nulls, gaps and run/model boundaries remain gaps.
Pregame ring values come only from a supplied pregame observation; no first-live
probability is substituted as the prior.

## Exact backend handoffs

| Missing item | Required source/interface |
| --- | --- |
| Current-drive duration | Authoritative per-possession elapsed football seconds and timing definition. GL difference and play-resolution clocks are not substituted. |
| Scoring type and full description | ScoringSummary entries currently expose eventSequence, period, GL, points, source. Supply type, description and any applicable scoreAfter through the contract owner; UI does not infer PAT, scoring play or running score. |
| Other-team WP number | If desired, supply the explicit value/identity. Current contract exposes favorite probability; no competing complement model is implemented. |
| Quarter-based WP x-axis | Supply documented observation elapsed-football coordinates/units if required. Current view labels observation sequence rather than fabricating period position. |
| Historical line to gain | Existing earlier handoff remains open. Historical ball/down/distance use supplied play fields; line to gain is unavailable. |
| Live game bank / WP delivery | Earlier board roster/lifecycle/authenticated access and hosted WP endpoint handoffs remain open. This is a fixture/mocked-HTTP UI review. |

## Verification

113 local tests PASS (19 UI + 94 retained release/backend). New checks cover
threshold boundaries and blocked priority, four widgets/four tabs, drive mapping,
22 attributes, no detail team images/betting elements, identity/revision mismatch,
separate frozen pregame prior and cleared blocked details.

GitHub Chromium/WebKit verification was extended for this exact layout and
black/red rule, merged drive/play selection, game bank, and 390/820/1194/1440
viewport widths. Read the run result; test authorship is not a pass. Screenshots
are GitHub artifacts. No production preview, Site or deployment is created.

Actual authorized live integration, 56-game sustained browser load, native
iPhone/iPad/Mobile Safari and Chairman final implementation acceptance remain
NOT TESTED. The StatsCenter board behavior is preserved and remains in the same
regression suite. Rollback is to the previous UI commit; no cloud restoration.

## Compact layout correction

The earlier screenshots were 1440-pixel-wide full-page captures (Game Stats 1440x1374; phone 390x2238), not 1920x1080 viewport captures. The Chairman requested tighter spacing and real mobile collapse. This revision reduces header/panel/table padding, stops empty overview panels stretching to their neighbor height, and uses the available desktop width. Mobile has collapsible Menu/Status, Games selector, line score, Key Team Stats and Scoring Summary. Primary score, field and WP remain visible; expanded menu/game/stats state survives refresh. No CSS zoom, image scaling or football/API changes. GitHub verification checks a real 1920x1080 viewport and produces an exact 1920x1080 PNG separately from full-page screenshots.

## Desktop spacing feedback

Mobile appearance accepted by Chairman. Subsequent desktop-only rules are confined to min-width 1101px: field column increased to approximately 70%, WP narrowed, card gutters reduced to 5–7px, desktop header/navigation grouped, padding reduced, and numeric team-stat columns paired at 140px. StatsCenter team/score pairs use content-sized name columns with a 16px gap, rather than scores pinned to the far card edge. Verification measures field width at least 68% of Overview and team-score gaps no greater than 18px. No <=1100px CSS rule or mobile markup changed.

At widths above 1300px, the Overview uses a 24-column layout: field 17 columns / WP 7 columns on top; Key Team Stats 12 / Scoring Summary 12 below. The field is dominant while bottom comparisons remain balanced.

## Approved professional concept — full UI build, November 5

The Chairman rejected the earlier desktop spacing iterations, then approved the
professional desktop concept and instructed the full build. That concept now
supersedes the earlier neutral-field desktop treatment above. Its green turf is
approved illustration content, not a replacement for the canonical brand palette.
The accepted mobile view remains the baseline at widths <=1100px.

Implemented in repository-native HTML/CSS/SVG, not a flattened mockup:
- Desktop masthead/navigation, compact score band, separate scoreboard/GL labels,
  supplied timeout dots, quarter line score and network metadata.
- Wide perspective turf with mowing stripes, mirrored yard numbers, text-only
  end zones and supplied ball/scrimmage/gain coordinates. Missing coordinates
  omit markers; blocked field omits the illustration. Historical view uses
  supplied pre-snap position and leaves the unavailable gain line absent.
- Four Overview panels with compact tables and aligned hierarchy. WP selector
  and immutable-observation disclosure remain available below the primary chart.
- StatsCenter typography, compact team/score pairs, filters and status lanes.
- Desktop Game Stats navigation state and breakpoint rerendering. Existing
  return-to-board, selection, filters, read-only polling and recovery retained.

The concept's sample teams, scores, drive duration, full scoring descriptions,
quarter-based WP coordinates and opponent percentage are not permission to
invent source values. All backend handoffs above remain open. Chairman Console
navigation stays visibly disabled pending a verified 5.1 route; controls remain
in the existing operator console. No backend, hosted Site or release changed.

New semantic tests cover authoritative field geometry, missing/invalid coordinates,
blocked fields, historical positions and immutable input. Browser verification
must be read from the current commit's run before claiming a pass. Live authorized
HTTP integration and real iPhone/iPad/Safari remain NOT TESTED. Rollback: restore
UI commit 5f96298; no cloud restoration is needed.
