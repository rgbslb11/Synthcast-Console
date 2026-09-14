# GameCast 4.3.1 — Power-session and UI reset corrective release

Status: CORRECTIVE RELEASE CANDIDATE / STAGING.

## Chairman-authorized scope

1. Correct the operator experience where a browser can automatically resume a Week 4 session created before the 4.3 Week 4 power package was loaded, leaving persisted `powerReady=false` state visible as POWER PENDING even though the currently deployed 4.3 power package is complete.
2. Add a Chairman control to purge the browser's current UI session binding and start from a brand-new Week 4 cloud session.
3. Preserve all prior cloud sessions for audit; the UI purge control does not delete authoritative cloud history.
4. Preserve the 55-game Schedule v5 slate, 110-team Week 4 power package, 4.2.2 football/play/timing mechanics, and 4.2.3 edit/focus hardening.
5. Do not alter accepted results, publish SEUD, retune football, or overwrite GameCast 4.3.

## Root cause

GameCast persists TEAM/OFF/DEF snapshots and `powerReady` inside each cloud session at creation. The UI also automatically resumes the last saved session from browser `localStorage`. Therefore a session created before the 4.3 Week 4 power package can remain POWER PENDING indefinitely even after the Edge Function is redeployed with complete power. Fresh 4.3 sessions already validate 55/55 POWER READY.

## Corrective design

GameCast 4.3.1 uses a new isolated identity and namespace:

- Branch: `release/gamecast-v4.3.1`
- UI route: `/v4.3.1/`
- Edge Function: `gamecast-week4-v4-3-1`
- Engine identity: `GC-W4-V4.3.1-RC1`
- Session namespace: `w4v431-`
- Browser storage namespace: `synthcastGameCast431Operator`

This guarantees that opening 4.3.1 cannot silently resume an older 4.3 session.

The new **PURGE UI + NEW SESSION** control:

- requires Chairman confirmation;
- creates a new cloud session with new seeds for all 55 games;
- switches the browser to the new operator session;
- replaces the browser's saved 4.3.1 session binding;
- leaves the prior cloud session intact for audit and reproducibility.

It is intentionally not a destructive cloud-session delete.

## Release gates

4.3.1 must not be released for use until CI demonstrates:

- 55/55 Week 4 games and Schedule-v5 identity;
- 110/110 participant power coverage and 55/55 POWER READY on fresh session;
- distinct `w4v431-` session namespace and `synthcastGameCast431Operator` browser namespace;
- PURGE UI + NEW SESSION control present and wired;
- inherited fixed-seed engine regression passes unchanged;
- 4.2.3 interaction regression remains green;
- Edge Function deploy and fresh-session smoke pass;
- Pages route `/v4.3.1/` builds and deploys.
