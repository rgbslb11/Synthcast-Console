# Dedicated 5.1 QA sign-in page

Baseline: 7f4c31fe0f87d1a80296de25544bedf6afb314af; verified previous Pages run 42147793078. UI-only procedure 03 and repository router loaded. Requested outcome: a plain login page that opens the existing 5.1 UI.

The entry URL now opens a dedicated #login route: plain background, Synthcast logo, email, password, inline status and Sign in. Existing QA session/game settings and generic sample UI remain under QA options. The workspace header, board, toolbar and footer are hidden on this route. Successful authentication opens StatsCenter; sign-out, expiration and reload return to sign-in. Direct dashboard hashes do not expose the workspace without an in-memory token. The same-document route preserves the existing in-memory-only token policy; no credentials pass through URLs, storage or another window.

Public files changed: index.html, app.mjs, review.css. Backend, auth transport, grants and all football/state semantics are unchanged. This remains read-only 5.1 QA, not a new production console.

Local tests: 155 PASS. Actions validate Chromium/WebKit fresh entry, rejected credentials, direct-navigation guard, sample UI, successful transition, existing stats/polling, logout/reload and 390/1920px layout. Screenshots: login-phone.png and login-desktop.png in the integrated evidence artifact. Physical iPhone Safari remains NOT TESTED. Pending Actions results must not be reported as passing.

Rollback: republish these three UI files from the baseline using a newly verified preservation manifest. The publisher checks all 234 earlier Pages assets byte-for-byte. Current branch: feature/v510-login-page; no merge to production requested.
