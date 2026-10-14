# GameCast 5.0.1 rollback plan

5.0.0 was never replaced. The normal rollback is to stop using the candidate and reopen the unchanged 5.0.0 session:

https://rgbslb11.github.io/Synthcast-Console/v5.0.0/?session=w7v500-17e1dde75f5b1cba

Public adds &view=public. Condensed:
https://rgbslb11.github.io/Synthcast-Console/v5.0.0/ui1.3/?session=w7v500-17e1dde75f5b1cba

Preserved source branch: release/gamecast-v5.0.0.
Exact baseline commit: 762da633e38ddf8acb0a9e7798ee4502deb1e81f.
Preserved source functions: gamecast-week7-v5-public v3, gamecast-week7-v5-chairman v8 and gamecast-week7-v5-scheduler v5.
Source schema: gamecast_v500; session v11213; MD5(state::text) 43212ea3ddf3f1181bbcf9b5ab33f2ca at release audit.

## Engineer-operated candidate shutdown

Run only on project xsvdmcipviejxynkdbhq:

```sql
BEGIN;
UPDATE gamecast_v501.release_control SET writes_enabled=false WHERE singleton;
UPDATE gamecast_v501.scheduler_cron_control SET enabled=false WHERE singleton;
SELECT cron.alter_job(job_id := jobid, active := false)
FROM cron.job WHERE jobname='gamecast_v501_isolated_qa';
COMMIT;
```

Then verify candidate writes fail, scheduler discovery no longer causes writes, and the unchanged 5.0.0 public read still returns its original session identity and version. Keep candidate tables, receipts, history and branch for investigation. Do not drop schemas, delete QA sessions, rotate the shared scheduler environment key, disable the shared project writes environment setting, or restore QA state into 5.0.0.

No frontend re-publication is required to operate 5.0.0. If candidate-route removal is later requested, produce a new Pages artifact that omits only v5.0.1 and independently verifies every prior manifest byte before publication. Do not blindly rerun an old multi-route publisher.

## Recovery limitations

No source database data was deleted, so source operation requires no database restore. The private current-state export protects session/finals/events but omits historic requests and infrastructure credentials; it is not a complete database backup. A full destructive-cleanup restoration procedure remains BLOCKED and must be rehearsed before any future deletion.
