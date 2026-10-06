# GameCast 4.4.2 rollback

OBSERVED FACT: rollback target is GameCast 4.4.1 commit `bf1d67a7c174b46ccf9d98cb6dcded5a8fc18616`, backend `gamecast-week6-v4-4-1` version 1 / `GC-W6-V4.4.1-RC1`, and existing `/v4.4.1/` UI. It retains its W6 data and sessions; rollback does not convert W7 data into W6.

1. Disable only the new scheduler:
   `select cron.alter_job(jobid,active:=false) from cron.job where jobname='gamecast-v442-deadman';`
2. Stop using the 4.4.2 candidate. Return to `https://rgbslb11.github.io/Synthcast-Console/v4.4.1/` and the existing private 4.4.1 operator session. Do not include operator credentials in reports.
3. Retain all `w7v442-` QA sessions and events for audit. They remain isolated by engine, week, slug, token, and commit-function checks. Do not delete, migrate, accept, or publish them.
4. No canonical route was redirected. Earlier files are retained byte-for-byte by the 74-file publication manifest, so rollback requires no overwrite or rebuild of an earlier UI.

TEST RESULT: the new cron job was disabled and then restored while no eligible candidate sessions existed. The three earlier cron jobs retained fingerprint `69bb367a16a6e513dcc470bca5220e61`. The previous backend health check and 74-file hosting restore check passed. Previous persistence function fingerprints also remained unchanged.

The rollback does not purge QA data or undo prior official results. Re-enabling 4.4.2 later requires checking its candidate status and eligible sessions first.
