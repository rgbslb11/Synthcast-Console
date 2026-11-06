# 5.1 QA mobile sign-in repair

Baseline: `059fed9009dd8591142e17ccab3dc872aa09d404`, last verified Pages publication `42142313303`. Router and procedures 02/03 applied. Scope: existing read-only QA sign-in presentation and bounded authentication transport.

## P3 finding
Observed screenshots show a remembered QA session, blank credentials and LOADING placeholders. Code confirms mobile CSS hides the only connection/error status inside the collapsed masthead; restoring a QA session does not restore credentials. Database read confirms the Chairman account is confirmed, not banned, and has an active grant for qa-v510-wp-load-r3. The screenshots do not establish invalid credentials or a failed backend login.

Correction: show inline status beside the form; open the form whenever a live session needs authentication; replace unauthenticated board/detail loading with a sign-in prompt; translate auth/access failures; disable duplicate submissions; bound authentication/logout network waits. No credential changes, grant changes, schema changes, engine writes or result changes.

Validation: 155 local tests PASS, including stalled/network auth transport. New Chromium/WebKit tests cover a remembered QA session at 390px with collapsed menu, rejected credentials, password clearing and honest board/detail states. Hosted test additionally checks sign-in presentation after phone-sized reload. Browser and publication outcomes are recorded in the branch Actions runs; do not treat pending runs as passed.

Rollback: restore the three changed review files (app.mjs, auth.mjs, index.html) from baseline and republish through the preserved-pages workflow using a fresh verified inventory. Prior 234 Pages assets are checked byte-for-byte. Backend and football state remain identical to baseline. This is QA repair, not production release certification. Physical iPhone Safari remains NOT TESTED.
