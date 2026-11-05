# WP connected UI candidate — 2026-11-05

Isolated branch: ui/gamecast-v5.1.0-wp-connected. Base: approved UI review
5e29af6aa14e50538c8356cb01e552f811a93e99. Backend evidence reference:
development/gamecast-v5.1.0-wp at 08f68cda7500bcdc7be0c78a754371092b04c9b5.
AGENTS, master router and procedures 03/05 loaded. Prior procedures 02/04
remain applicable to backend/model work; this candidate changes neither.

## Integration

Verified project URL: https://xsvdmcipviejxynkdbhq.supabase.co

WP GET API: https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-wp

Existing WP handoff response contract at backend revision 08f68cda; no new
wire version has been invented. Capture GC-WP-CAPTURE-1; illustrative model
GC-WP-ILLUSTRATIVE-0.1.0. Stats GC-STATS-1 / delivery GC-DELIVERY-1 unchanged.

The selected game's WP panel now uses authenticated GET history with fixed
run/high-watermark pagination, same-source revision checks and clearing on
failure. Board polling does not fetch 56 complete WP histories. Incomplete
history is rejected rather than silently truncated. No football command or
prior mutation is added. UI colors, CSS, layout, filters and engine are retained.

The existing connection panel accepts email/password via Supabase Auth.
Only the public publishable key is embedded. Password is cleared immediately;
JWT is memory-only. Reload/expiration requires sign-in. Sign-out revokes only
the current auth session. No signup, email dispatch, password reset, user
impersonation or service credential is implemented. Every data request remains
subject to non-anonymous user verification and active reporting grant.

Gary's confirmed account has an active grant for qa-v510-wp-hosted-r2,
rechecked 2026-11-05. That session contains completed QA games only. G0502 has
a committed override; other games have observed finals. These are not accepted
results. qa-v510-wp-load-r3 is a separate partial load-test session.

## Evidence and limits

30 local UI/transport tests PASS, including seven new auth/WP adapter tests.
Browser verification script now exercises mock sign-in and WP HTTP wiring;
CI outcome must be checked separately. Mock browser success is not hosted
browser integration or real Mobile Safari acceptance.

Earlier backend evidence remains in WP-RECOVERY-FINAL-QA.md,
WP-AUTHENTICATED-HTTP-QA.md, WP-CONTROLS-CADENCE-QA.md and
WP-CONCURRENT-LOAD-QA.md on the WP branch. Original corrected prototype 62 tests
and implementation 67 local tests are distinct retained evidence sets.

Hosted sustained 56-game concurrent load: NOT PASSED. The recorded run completed
24 reads then encountered a rate-limit exception of unconfirmed origin. Do not
attribute it to GameCast capacity or claim a successful load gate.

No approved real-game ensemble manifest exists here; QA illustrative priors
remain explicit. Unsupported nonterminal overtime remains BLOCKED.

## Preview and Chairman test boundary

No hosted UI URL is claimed. Repository instructions preserve existing hosted
Sites. The backend currently allows only https://rgbslb11.github.io. Publishing
an entire GitHub Pages artifact could replace protected release assets, so this
candidate does not run a production publication workflow. Before Chairman
browser testing, an isolated QA hosting route must be selected/authorized and
verified. Do not ask Gary to paste JWTs or credentials into chat.

Once hosted: sign in, select the QA session/game, confirm WP matches committed
state; test grey override history, reconnect/reload and mobile layout. This
read-only UI intentionally provides no football controls or prior editor.

Rollback: close this unmerged candidate or revert its UI-only changes. No
database restoration or history deletion is necessary. No production deployed.
