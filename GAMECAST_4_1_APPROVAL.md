# Synthcast GameCast 4.1 — Chairman Approval

**Status:** APPROVED

**Approval date:** 2026-09-05

## Approved scope

Synthcast GameCast 4.1 is approved as the governed Week 2 release on the isolated branch `release/gamecast-v4.1`.

Approved operating controls:

- 47 Week 2 results of record are ledger-locked and non-simulatable.
- Six remaining eligible Week 2 games are simulatable in GameCast 4.1:
  - G0013 UCLA at California
  - G0024 UNLV at Hawaii
  - G0061 Washington State at Washington
  - G0032 Ole Miss vs Louisville
  - G0021 SMU at Florida State
  - G0035 Wisconsin vs Notre Dame
- G0033 Clemson at LSU remains HELD / non-simulatable because its Saturday kickoff is before 10:00 PM ET and no final of record was supplied in the governing intake.
- Chairman console and public live scoreboard remain required foundational surfaces.
- 10:00 / 15:00 quarter modes remain approved.
- AUTO delivery speeds 1x / 4x / 10x / 50x remain approved.
- Per-game seed / Run ID governance, restart same seed, purge + new seed, clock correction, score correction, result lock/unlock/accept, audit history, and device resume behavior remain approved.

## Release isolation

This approval does **not** authorize replacement or destructive modification of prior GameCast v3/v4 sessions, nor does it authorize an automatic merge into another branch or Supabase production. Existing historical sessions and prior hosted surfaces remain preserved.

## Week 3

The separately supplied Week 3 board is not part of this GameCast 4.1 approval and should be handled as a subsequent governed release/input set.
