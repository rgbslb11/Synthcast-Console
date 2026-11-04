# Authenticated QA follow-up

Baseline e4d6cff; router and procedure 05 read. Explicit temporary-harness authorization received.

PASS: temporary Auth identity creation, password login, ungranted detail HTTP 403, granted detail HTTP 200.
FAIL: authenticated advancement returned HTTP 503 after source revision 3 committed. Reporting revision 3 remains pending for qa-v510-board-20261103. Retry and 56-client HTTP load were not reached.

Cleanup confirmed: grant revoked, logout 204, identity deletion 200; zero active reporting grants. Privileged harness replaced with a stateless HTTP 410 handler with JWT verification enabled, version 2. No production functions or Week 11 data changed.

Investigation: the earlier manually generated board fixture stored gameId in projection audit commands, while the production source adapter emits only stateVersion and command. Immutable audit-prefix comparison rejects this shape change. Do not rewrite immutable journals. Next verification must use a fresh QA session created and projected exclusively through the source adapter, then repeat command retry and HTTP load. Existing fixture remains isolated and unavailable to operators.

## Fresh source-adapter session

{
  "sessionId": "qa-v510-fresh-670e916d-7932-4180-81fa-b71f2956b949",
  "version": 2,
  "results": [
    {
      "label": "create identity",
      "pass": true
    },
    {
      "label": "login",
      "pass": true
    },
    {
      "label": "no grant denied",
      "pass": true
    },
    {
      "label": "granted detail",
      "pass": true
    },
    {
      "label": "command revision 0 HTTP 200",
      "pass": true
    },
    {
      "label": "launch retry",
      "pass": true
    },
    {
      "label": "command revision 1 HTTP 200",
      "pass": true
    },
    {
      "error": "Rate limit exceeded for trace 01a1a55d9b4e70a0848b81d57d5f3c52. Retry after 47216ms."
    },
    {
      "cleanup": "grant revoked"
    },
    {
      "logout": 204
    },
    {
      "deleteIdentity": 200
    }
  ]
}

Source revision 2 has no pending projection. Authenticated Launch, Launch retry and advancement PASS. The 56-request burst hit a rate limit; concurrent HTTP load is FAIL at this tested burst level, not certified. Recovery/correction tests after the burst were not reached. Harness retired again; no production code changed.

## Separate recovery verification after rate-limit cooldown

{
  "sessionId": "qa-v510-fresh-670e916d-7932-4180-81fa-b71f2956b949",
  "version": 4,
  "results": [
    {
      "label": "create identity",
      "pass": true
    },
    {
      "label": "login",
      "pass": true
    },
    {
      "label": "no grant denied",
      "pass": true
    },
    {
      "label": "granted detail",
      "pass": true
    },
    {
      "label": "injected projection interruption",
      "pass": true
    },
    {
      "label": "stale projection blocked",
      "pass": true
    },
    {
      "label": "HTTP retry recovers committed revision",
      "pass": true
    },
    {
      "label": "outbox drained",
      "pass": true
    },
    {
      "label": "command revision 3 HTTP 200",
      "pass": true
    },
    {
      "label": "correction blocked",
      "pass": true
    },
    {
      "cleanup": "grant revoked"
    },
    {
      "logout": 204
    },
    {
      "deleteIdentity": 200
    }
  ]
}

PASS: simulated projection interruption after source commit; stale reporting blocked; authenticated HTTP retry recovered original committed revision; outbox drained; authoritative correction blocked details. Harness retired to JWT-protected HTTP 410 handler version 6. Test identities deleted and grants revoked. Full-game lifecycle, restart and sustained HTTP load remain NOT TESTED. No production activation.
