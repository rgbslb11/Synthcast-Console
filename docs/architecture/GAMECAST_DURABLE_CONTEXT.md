# GameCast Durable Context Index

Last updated: 2026-09-07

This file is the entry point for durable GameCast architecture context that should not depend on chat memory.

## Current release-line control

As of this update, the active corrective development line is associated with `release/gamecast-v4.2.2`.

Do not merge architecture or implementation changes into production without explicit operator authorization.

Before making a new GameCast change:

1. inspect the current release branch and current release notes;
2. determine whether the requested behavior already exists, has been superseded, or conflicts with current architecture;
3. use the historical design records below as lineage and intent, not as automatic proof of current implementation;
4. preserve operator sovereignty, auditability, and immutable accepted results.

## Historical v1.2.0 architecture lineage

The following design thread introduced the core concepts for slate initialization and dynamic human-pressure / strategy modeling:

- `gamecast-v1.2.0/README.md`
- `gamecast-v1.2.0/DECISIONS_AND_INVARIANTS.md`
- `gamecast-v1.2.0/FUNCTIONS_01_12.md`
- `gamecast-v1.2.0/OPERATOR_SLATE_CONTROL_SPEC.md`
- `gamecast-v1.2.0/OPEN_QUESTIONS_AND_CALIBRATION.md`

## Key retained doctrine

- Power ratings are structural truth; live state must not silently rewrite them.
- Tempo, poise, stamina, and focus alter execution conditions and demand, not guaranteed performance.
- MATURITY is a latent structural property controlling robustness/brittleness.
- Mean performance and variance are separate model outputs.
- The same intervention may improve an elite/mature team, destabilize a brittle team, or improve an underdog's upset tail while worsening expected margin.
- Operator actions must be attributable to SYSTEM, ENGINE, or OPERATOR and be reconstructable from event history.
- Blank-board slate activation should be staged and validated from schedule, ratings, and carriage master data.
- EBC/SEN branding should derive from carriage/network registry data.
- The Master-tab background is intended to become gray, but the requested final hex value remains unresolved until explicitly supplied.

## Update discipline

When a historical design item is implemented, superseded, rejected, or recalibrated in a later release:

- update current release documentation;
- preserve the historical file;
- add a clear lineage note rather than silently rewriting history;
- move unresolved values from OPEN to a versioned decision/calibration record once approved.
