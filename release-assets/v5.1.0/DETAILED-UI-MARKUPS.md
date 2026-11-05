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
