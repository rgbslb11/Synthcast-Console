# WP authenticated HTTP integration

QA commands v3 includes capture-enabled controller and WP recovery after committed source commands. A WP recovery failure does not reroll source. Deployment bundle d051fb87acfd92f1de9505637ad086a68bf25b79878772960e2bcaed875e9184. Production/UI/model untouched.

Actual WP API: https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-wp
Session qa-v510-wp-hosted-r2. Contract unchanged from WP-UI-HANDOFF at eb6f352, model GC-WP-ILLUSTRATIVE-0.1.0, capture GC-WP-CAPTURE-1.

Request 370557 against private QA driver v2 verified real Auth password login using temporary test identity, ungranted WP 403, granted WP 200, run/high-watermark pagination and post-Launch prior rejection 409 PREGAME_FROZEN. Logout 204, delete identity 200; SQL confirmed zero test accounts. These are real HTTP calls, not browser-rendering tests. The temporary identity had only this QA session grant, removed in cleanup. No user password or JWT is recorded.

Supported user flow: existing Supabase user login; Authorization Bearer user access token; active reporting_grants row for the specific QA session; Origin https://rgbslb11.github.io. Chairman's confirmed account is granted for r2. Never use service keys in UI.

Outstanding: positive command request through newly composed endpoint, hosted pending-source recovery, full final lifecycle, sustained progressing 56-game load and actual browser/native Safari integration. Cron smoke is stopped. No continuous-operation or production certification.
