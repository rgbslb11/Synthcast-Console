# GameCast 5.0.5 — approved mathematics release

Engine: GC-W10-V5.0.5-RC1. Exactly the approved 2x rating-edge multiplier, 18-second ordinary runoff base and +1 yard on positive nonfumble rushing gains. W10 schedule and all 121 ratings are unchanged.

Separate identities: gamecast_v505_w10 schema; w10v505- sessions; /v5.0.5/w10/ UI; gamecast-week10-v5-0-5-{chairman,public,scheduler} functions. Existing 5.0.4 endpoints, sessions, UI, data and results remain untouched. New 5.0.5 sessions start unlaunched; no existing 5.0.4 game is automatically migrated, restarted, accepted or republished. Existing results remain on the 5.0.4 route.

## Tests

54/54 local regression checks passed. Final-version population: 56 matchups x 1,000 seeds; 3.43% shutouts, 38.99% margins 1–7, 127.92 offensive snaps, 42.71 combined points. All population accounting and sampled replay/chunk checks passed. Source and evidence are frozen here. GitHub verification runs Chromium/WebKit fixtures before any publication; no deploy-request exists.

## Production block

Automatic approval review rejected applying week10-schema.sql to project xsvdmcipviejxynkdbhq, citing new persistent production tables/functions, copying authorized operator records and appending gamecast_v505_w10 to PostgREST exposure without exact boundary-change authorization. No SQL migration was applied. Do not retry via raw SQL or another path. No new functions or UI were deployed.

After explicit authorization: apply this exact schema (new namespace only; writes initially disabled), add the separately named disabled scheduler from week10-scheduler.sql, deploy the three new functions, run actual-cloud persistence/Auth/recovery probes, verify CI browser evidence, create an unlaunched 5.0.5 session, then publish the preserved-site bundle through deploy-request.json. No automatic game launch is permitted. Database writes and scheduler activation must occur only after cloud probes pass.

## Rollback

Use rollback.sql to disable only new-release writes and cron; retain its state and audit evidence. Keep prior endpoints and routes available. Never run 5.0.5 histories through 5.0.4 mathematics. No rollback is currently needed because no production change occurred. Real Mobile Safari, cloud persistence, final hosted UI and rollback rehearsal remain untested.

## GitHub handoff block

Automatic approval review also rejected the 66-file release tree upload to the public rgbslb11/Synthcast-Console repository, citing insufficiently explicit authorization for source, SQL/configuration, schedule/rating inputs and population evidence disclosure. Repository identity and admin/push permission were verified. The remote release/gamecast-v5.0.5 branch exists at 285ef52 only. No 5.0.5 source or workflow was uploaded and no CI/publication started. Explicit approval for this public-repository payload and the separate production schema/API change is required before retrying.
