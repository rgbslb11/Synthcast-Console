# Hosted WP control and cadence evidence

QA session qa-v510-wp-hosted-r2; no production/UI/model changes.

Request 369662 HTTP 200: G0502 edit_begin BLOCKED/CHAIRMAN_EDIT_OPEN, then edit_cancel ESTIMATED, in source revision 3.
Request 369692 repeated identical command: HTTP 200, source stayed revision 3; no rerolled football revision. A later periodic observation is allowed.
Request 369718 HTTP 200: score correction + edit/cancel at revision 4. Override, edit_begin, edit_cancel and subsequent polls all BLOCKED/CHAIRMAN_CORRECTION.

Bounded cron job 10 at five-second cadence ran independently of a browser, then was unscheduled successfully. SQL observed eight complete batches of 56 records from 04:46:31.532Z through 04:47:07.427Z on November 5 UTC (November 4 Chicago). Intervals approximately 4.55–5.88 seconds; not exact scheduling. Source stayed revision 4 while worker appended history. This is a short unchanged-state cadence smoke test, NOT sustained 56-game progression/load certification. Later in-flight batches are not included in this eight-batch count.

Remaining: positive browser JWT/API reads and pagination; hosted prior-freeze rejection, disk/process recovery with pending commands, full sustained game progression; final UI acceptance. Worker cron is stopped, not continuously operating. Approved real-game priors remain absent. DO NOT APPROVE production yet.
