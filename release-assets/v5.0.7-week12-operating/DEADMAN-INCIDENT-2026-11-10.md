# G0568 deadman and pending-write incident

Inspected November 10, 2026 Central / November 11 UTC. Baseline branch
`release/gamecast-v5.0.7`, commit `ac9d4aaf2640ee9b071e39899a7a07397d0beb25`.
Actual deployed Chairman function: ACTIVE version 1. Procedures loaded in full:
master router, 02 forensic repair, 05 integrated UI/backend work. Historical
uploaded 4.3.1 instructions are superseded by the verified 5.0.7 deployment.

## Finding 1 — P1: scheduler disabled

Observed: G0568 Florida International at Delaware remains UNLAUNCHED, 0–0,
GL zero, deadman ARMED. Trigger `2026-11-11T00:07:00.000Z` = November 10,
6:07 PM Central. Arm was persisted at state version 2; board is version 9.
The scheduler control is false, cron job 17 is inactive, and no cron runs
were recorded. All 60 games are unlaunched; eight are armed.

Root cause: the background scheduler was never activated after the setup's
automatic approval-review block. Arming a game does not turn that service on.
Impact: armed games cannot receive scheduled progression. Proposed correction:
explicitly authorize and enable the Week 12 scheduler, then verify its actual
authenticated cron path. This is NOT performed by this patch. Enabling it will
make the overdue G0568 eligible for a late autonomous launch at the actual
current Master Zulu time, GL zero. It will also service the other armed games
at their configured deadlines. Do not backdate a launch or invent missed plays.

## Finding 2 — P1: overdue fallback conflicts with explicit controls

Observed evidence: live request logs in the incident window show six command
responses 409 and one 500, with no new committed receipts after version 9.
The request body of the user's locally pending command is not available in
the inspected backend logs. Do not claim that its exact command is known.

Reproducer: pre-command advance evaluates an overdue deadman and transitions
the draft to ACTIVE/AUTONOMOUS before the requested command runs. A manual
Launch then fails its UNLAUNCHED precondition (409). A Disarm calls the
unprotected deadman-disarm function on an AUTONOMOUS draft and throws a plain
error (500). Failed drafts are not persisted. These reproduce the observed
response pattern without changing live state.

Patch: only explicitly targeted UNLAUNCHED Launch/Disarm actions suppress
fallback evaluation during that command's pre-advance, including batch
Disarm targets. Normal scheduler evaluation and other games are unchanged.
Disarm on an ineligible status returns a definitive 409. Elapsed projection,
weather locking, football generation, clock rules, CAS and control witnesses
retain their existing implementations.

## Finding 3 — P1: Refresh does not resolve the local pending latch

The Auth client retains an ambiguous 5xx request and rejects a different write
with `Previous request needs retry or refresh`. Preserving its idempotency key
for exact retry is correct. The existing Refresh calls the normal protected
read path, which deliberately retains this latch; consequently that button
does not perform the promised recovery.

Patch: explicit confirmed Refresh reads and validates the current cloud board
first, then clears only the local retry entry and adopts that version. It does
not replay a command, generate a receipt, change the saved game, or automatically
submit a new action. Cancelled or failed reads keep the original retry entry.
Ordinary background reads still cannot clear it. A full browser reload of the
same session also clears the old in-memory latch, but does not fix the disabled
scheduler or the deployed overdue-control conflict.

## Verification and release status

109 automated tests PASS locally: 99 previous tests plus 10 focused recovery
cases, covering both long-idle and recent checkpoints, manual Launch, Disarm,
batch Disarm, ordinary autonomous fallback, weather locking, exact retry,
unchanged stale-witness rejection, successful Refresh recovery, and cancellation
or failed-read protection. HTTP tests use disposable in-memory RPC fixtures;
UI recovery uses the actual Auth/Refresh functions in a DOM fixture.

Football runtime source, Week 11 source and prior public routes are unchanged.
No live game, request receipt, operator, cron setting or deployed function was
modified. No production approval is inferred from the incident report.
Real target-cloud scheduler recovery, actual Chairman controls and physical
Mobile Safari are NOT TESTED for this patch. The first fix is ready for controlled
review on `fix/v507-deadman-command-recovery`; production deployment and scheduler
activation require explicit authorization. Rollback restores these four modified
operating code/UI files from the pinned baseline and disables only Week 12's
scheduler. Preserve all sessions, events, seeds and accepted history.

Out of scope: the console currently allows an arm while the scheduler is disabled.
A visible availability warning is recommended separately; it is not implemented
as an unrelated UI or authoritative-state change in this patch.
