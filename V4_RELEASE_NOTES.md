# Synthcast GameCast V4

Status: isolated release branch. Do not promote over the active Week 2 v3 session until V4 certification is complete.

## Foundational release requirements

- Authoritative cloud-backed Synthcast engine.
- Chairman / Control Console / Admin UI.
- Public read-only Live Scoreboard.
- Per-game, per-run deterministic seed with Run ID and audit history.
- Seed becomes immutable at launch.
- Restart Same Seed and Purge + New Seed controls with required audit reason.
- 10:00 or 15:00 quarter-length selection before launch.
- AUTO speeds: 1x, 4x, 10x, 50x.
- Acceleration changes operator delivery time only; synthetic Game Length remains authoritative.
- 10:00-quarter timing calibrated around a 2:00-2:15 ordinary synthetic game.
- 15:00-quarter timing calibrated around a 3:20-3:40 ordinary synthetic game.
- Scheduled television breaks, 20:00 halftime, end-quarter breaks and two-minute timeout remain part of Game Length.
- Quarter-by-quarter line score exposed to Chairman and public scoreboard.
- Manual scoreboard clock correction.
- Final Pending score-correction workflow by period.
- Result Lock / Unlock / Accept controls with audit trail.
- Restart/Purge cannot silently erase prior run state; prior run is archived in the event ledger.
- Sacramento State and Idaho retain Chairman-authorized POWER 1B overrides.
- Eastern Michigan remains AUTO-ineligible until a rating override is explicitly authorized.

## Release isolation

V4 must use a side-by-side backend endpoint and V4-prefixed session slugs. Existing `gamecast-week2` v3 sessions remain on the existing engine and are not migrated or reprojected by V4.

## Certification gate

V4 is not certified until the engine, Chairman console, public scoreboard, cloud persistence, audit controls, and mobile Safari behavior pass together. External SEUD publishing is not to be represented as connected until an actual SEUD write integration is wired and tested.
