# GameCast v5.0.6 Week 11 — local backend milestone

Status: QA_ONLY, not deployed, not release-ready. Screen designs remain pending.

Procedures fully read: GAMECAST_MASTER_ROUTER.md, 01_WEEKLY_DATA_DEPLOYMENT.md,
05_INTEGRATED_UI_ENGINE_FEATURE.md at baseline commit
9d13c58548072f4e8ba9cd8f8c9ebcb5cd0f4bd8 (release/gamecast-v5.0.5).
All 14 files returned for the deployed v5.0.5 public function match that commit.
This is source provenance, not a production health or database-schema certification.

## Implemented

- Separate v5.0.6 backend modules and Week 11 namespace, schema binding and event prefix.
- Exact 56 Chairman game IDs, away/home matchups, dates, Eastern kickoffs and networks.
- All 121 R2 rating triples; 112 scheduled teams. CSV bytes preserved.
- UTC conversions use America/New_York (including late games on the following UTC date).
- Pure liveStats read model and GET api=stats&session=...&game=... through the existing origin-checked public handler.
- Stats response is derived from persisted state and carries state_version. Polling does not advance games.
- Score, line score, clock, GL, possession, field/down/distance, timeouts, regulation TOP,
  started plays, completed plays and allowlisted resolved play-by-play.
- Raw history, pending play outcomes, ratings, seeds and RNG are never included in the stats response.
- Writes default disabled in the candidate runtime. Created candidate games are QA_ONLY.
- No deployment wrappers, SQL schema, scheduler activation or UI published for this candidate.

Stats polling is a read request: inputs are the release-bound session and game ID;
unknown games return 404. It reads one persisted version, makes no state transition,
does not persist another copy, and uses no notification or RNG. Retrying returns the
current saved snapshot. Recovery uses the existing persisted game and its run ID.
During Chairman Edit the existing state freezes; the response labels editing=true.
Public access follows the existing origin/session policy; operator commands retain
existing authentication, version and idempotency controls.

No football tuning changed. Engine code equality is tested after version/data metadata
normalization. The opening-toss stream includes engine version, so v5.0.5 and v5.0.6
need not produce identical tosses. Reproduction and speed comparisons are within v5.0.6.
Existing v5.0.5 sessions must continue on v5.0.5; cross-version session IDs are rejected.

## Validation

Baseline: 54/54 existing local tests passed. Candidate: 31/31 local tests passed.
Candidate population: 56 matchups x 10 seeds = 560 simulations. Mean combined score
42.4857, range 10–89; diagnostic only, not an approved calibration target.
Each run reached a non-tied final with 2400 seconds combined regulation TOP and
reconciled line scores and completed play counts. First seed per matchup also tested
37-second chunks with stats polling and 1x/4x/20x/50x speed equivalence.
All 56 active games were advanced together through the local operations layer with
stats reads between ticks and compared against independent bulk progression.
HTTP recovery tests exercise command -> disk-backed RPC fixture -> restart -> stats
read, duplicate requests, and QA acceptance denial. This is not a real Postgres test.

The initial candidate run caught five copied test fixtures still using V505_AUTO;
the fixtures were corrected to V506_AUTO and all tests rerun successfully.

| Release gate | Status | Evidence / limit |
|---|---|---|
| Engine/state integrity | PASS | Local invariants and football boundary tests |
| Fixed-seed regression | PASS | Local repeated progression and retained mechanics |
| Multi-seed distribution | PASS | 560 runs; diagnostic sample, no tuning acceptance implied |
| Full-board checks | PASS | 56 active games locally; cloud concurrency NOT TESTED |
| Poll/chunk invariance | PASS | 56 matchups plus pure-read mutation tests |
| 1x vs 50x invariance | PASS | Also 4x and 20x for all 56 matchups |
| Backend persistence/versioning | NOT TESTED | Local RPC/disk fixtures pass; actual v506 DB absent |
| Chairman Console integration | NOT TESTED | Designs pending |
| Public Scoreboard integration | NOT TESTED | Local API passes; no finished UI |
| Mobile Safari | NOT TESTED | No candidate UI |
| Existing-session compatibility | NOT TESTED | Namespace rejection passes; live regression absent |
| Chairman approval | NOT TESTED | Milestone only; final candidate not presented |

## Remaining work and boundaries

- Turnovers, offensive snaps, yards, drive metrics and win probability return BLOCKED,
  not zero. The legacy started-play counter includes punts/field goals and is not
  labeled offensive snaps. Statistical classification, OT coverage and correction
  accounting need their own verified implementation.
- Play history lacks a dedicated statistical event schema. No text-parsed metrics
  are shipped in this milestone. Fields supplied by the engine are presented as recorded.
- Records, poll ranks and announcers supplied in the Chairman thread still need
  serialization into the final presentation package; no replacements are inferred.
- Venue IDs and conference-game flags were not supplied in this intake. They remain
  absent pending authoritative mapping. The supplied "at" designations are retained.
- The stats read currently loads the session internally and scans the requested game's
  history. Local results do not establish cloud throughput or 56-client polling capacity.
- Source/API/schema/deployed scheduler verification and independent cloud test isolation
  must precede cloud writes. No production writes occurred in this work.
- Final screen design, chart selection and mathematical model approval remain separate.

## Reproduce and rollback

Run from repository root:

    python scripts/prepare-v506-local.py
    node --test tests/v506/*.test.mjs

Preparation regenerates candidate runtime modules from the retained v5.0.5 source;
the independently authored live-stats module is retained. No network or database is used.
Rollback is to leave the development branch unused. Production still uses its existing
release. No schema, cron, existing session or accepted result needs restoration.
