# External WP QA result — 2026-11-05

Tested source: 5971fb7e0b10c89fa743714a1dc24bba8f800847.
Workflow: https://github.com/rgbslb11/Synthcast-Console/actions/runs/41979305620

PASS: bounded 56-game authenticated WP polling during serialized QA advancement.
Six rounds × 56 = 336 WP load reads, plus one initial authorization read.
Each round started on its five-second schedule (maximum 2 ms start lag).
Round completion times: 3053, 2486, 2416, 2427, 2362, 3001 ms.
Six commands advanced the fixed QA board by 60 simulated seconds each, source
revisions 5–10. Command latency: 9560, 9187, 8982, 5965, 5174, 5284 ms.
Logout PASS. Database independently confirmed source head and WP progress both 10.

The read cadence and football-command execution are measured independently.
A 60-second synthetic advance for all 56 games is not required to finish in five
wall seconds by this polling test. The command timings remain performance
evidence, not an assurance of arbitrary acceleration capacity.

## Corrections made during verification

1. The new external harness initially generated G502 instead of G0502.
   Fixed padding and regression assertion; authentication had succeeded, but
   scope validation caused HTTP 503. Sanitized QA error logging identified it.
2. The harness initially used the last WP observation revision as the command's
   source revision. Backend rejected the stale command with 409. Commands now
   use an explicit independently verified source-head revision in the request
   manifest, preserving optimistic concurrency rather than retrying blindly.
3. The harness initially waited for football advancement before polling again.
   The preceding round had all 56 reads within 3340 ms but a command taking
   9672 ms. Test loops now run independently: six read rounds at fixed cadence,
   six serialized commands; all in-flight commands settle before logout.

Prior failed attempts remain in GitHub workflow artifacts. No result has been
relabeled. Three harness unit tests passed. The real hosted pass is this workflow,
distinct from original prototype 62 tests, backend 67 local tests, and UI 124 CI
tests with Chromium/WebKit fixture/mock checks.

## Scope and limits

This is a roughly 30-second polling window plus command completion, NOT a
full-game soak. It checks authorized responses, identity/revisions, read cadence
and successful commands. It does not independently certify every probability
value, every historical observation, uninterrupted five-second backend sampling,
real Mobile Safari, hosted browser integration or production readiness.

The old privileged load runner remains retired v4 with verify_jwt=true. WP QA
read endpoint is v3 with unchanged authorization/model and sanitized error
logging; no secret/request contents are logged. Production, 5.0.6, approved UI
layout and football engine behavior are unchanged.

Hosted UI review route is still pending. No production deployment is authorized.
The saved run manifest is now stale at revision 4; do not rerun blindly. Obtain
a fresh source-head revision for a subsequent authorized QA run.

Raw result:
```json
{
  "status": "PASS",
  "rounds": [
    {
      "round": 1,
      "reads": 56,
      "startLagMs": 2,
      "elapsedMs": 3053
    },
    {
      "round": 2,
      "reads": 56,
      "startLagMs": 0,
      "elapsedMs": 2486
    },
    {
      "round": 3,
      "reads": 56,
      "startLagMs": 1,
      "elapsedMs": 2416
    },
    {
      "round": 4,
      "reads": 56,
      "startLagMs": 0,
      "elapsedMs": 2427
    },
    {
      "round": 5,
      "reads": 56,
      "startLagMs": 0,
      "elapsedMs": 2362
    },
    {
      "round": 6,
      "reads": 56,
      "startLagMs": 0,
      "elapsedMs": 3001
    }
  ],
  "commands": [
    {
      "stateVersion": 5,
      "elapsedMs": 9560
    },
    {
      "stateVersion": 6,
      "elapsedMs": 9187
    },
    {
      "stateVersion": 7,
      "elapsedMs": 8982
    },
    {
      "stateVersion": 8,
      "elapsedMs": 5965
    },
    {
      "stateVersion": 9,
      "elapsedMs": 5174
    },
    {
      "stateVersion": 10,
      "elapsedMs": 5284
    }
  ],
  "logout": "PASS"
}
```
