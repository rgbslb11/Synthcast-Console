# GameCast v1.2.0 - Operator and Slate-Control Specification

Status: DESIGN SPECIFICATION / DURABLE MEMORY

## 1. Blank-board slate initialization

The console must be capable of starting from:

```text
0 GAMES - NO SLATE LOADED
```

A future weekly slate is prepared from three authoritative master inputs:

1. Week Schedule
2. Power Ratings
3. Carriage

### Authority by source

| Master | Authority |
|---|---|
| Week Schedule | game identity, date, kickoff, home/away, week |
| Power Ratings | simulation baseline / structural team ratings |
| Carriage | network assignment, broadcast window, ON AIR eligibility |

### Required import sequence

```text
BLANK BOARD
  -> WEEK SCHEDULE
  -> POWER RATINGS
  -> CARRIAGE
  -> VALIDATION
  -> PREVIEW SLATE
  -> ACTIVATE WEEK
  -> GAMECAST OPERATOR
```

Do not import master files directly into the live board.

Use a staging layer that reports validity, missing references, duplicate IDs, and unresolved team/game mappings before activation.

### Canonical identifiers

Prefer stable IDs such as:

```text
season_id
week_id
game_id
team_id
```

Display names must not be used as the durable join key.

### Activation snapshot

When `ACTIVATE WEEK` is executed, create an immutable or versioned snapshot of the exact inputs used:

```text
SlateSnapshot
  - ScheduleSnapshot
  - RatingsSnapshot
  - CarriageSnapshot
```

This permits later reconstruction of exactly what GameCast knew at slate activation.

## 2. Carriage and scoreboard logos

Network branding belongs to a registry rather than matchup-specific hard-coding.

Suggested game carriage object:

```text
game_id
primary_network
secondary_network[]
streaming_platform[]
broadcast_window
on_air_eligible
```

Initial graphical requirement:

- EBC logo
- SEN logo

The renderer should support more networks later without a schema redesign.

If simulcast data exists, multiple bugs/logos should be supportable.

## 3. Master-tab appearance

The Master tab background is to be changed to gray.

Status: OPEN - final hex code not supplied in this design thread.

Do not guess the hex value.

## 4. Clock correction

The operator must be able to pause/correct game time explicitly.

Suggested action:

```text
SET CLOCK
  quarter
  game_clock
  reason
  APPLY CLOCK CORRECTION
```

Persist at minimum:

```text
previous_clock
new_clock
quarter
operator_timestamp
reason
```

A manual clock correction is an administrative state change, not simulated clock passage. It must not silently re-fire clock-triggered events such as an already-consumed two-minute timeout.

## 5. Forced possession change

Provide an explicit `CHANGE POSSESSION` action.

Field location should be stored as an absolute physical coordinate, then rendered from the current offense's perspective.

Default post-change behavior:

- possession -> opponent;
- down -> 1;
- distance -> 10 unless goal-to-go logic applies;
- physical ball location unchanged;
- play clock reset appropriately.

Required reason field examples:

- turnover correction;
- missed possession change;
- administrative correction;
- manual scenario;
- other.

## 6. Timeout state machine

Timeout dots must represent actual inventory, not decoration.

Each timeout credit has state such as:

```text
AVAILABLE
USED
```

Timeout processing must be scenario-aware and should include:

```text
TIMEOUT REQUESTED
  -> verify legal game/dead-ball state
  -> verify timeout inventory
  -> reject invalid duplicate use in same dead-ball interval when applicable
  -> stop game clock / AUTO processing
  -> deduct timeout
  -> record event
  -> recalculate strategic context and tempo recommendation
```

Regulation and overtime inventories should be modeled as explicit state rather than UI-only counters.

The exact NCAA rule implementation must be verified against the rule set governing the simulated season before release.

## 7. Tempo engine

Supported modes:

```text
AUTO
NORMAL
TURBO
CHEW
KNEEL
```

### AUTO

AUTO means the engine selects tempo from live context. Inputs may include:

- quarter;
- game clock;
- score differential;
- possession;
- field position;
- down/distance;
- own timeouts;
- opponent timeouts;
- latent strength;
- current poise;
- current stamina;
- current focus;
- urgency;
- win probability;
- tactical optionality.

### NORMAL

Baseline simulation behavior.

### TURBO

Expected effects include:

- lower time between snaps;
- greater play volume;
- higher execution demand;
- more aggressive passing / fourth-down behavior when context supports it;
- less recovery time;
- potentially higher explosive probability;
- potentially higher error/turnover risk, especially under overload.

TURBO is not an offense bonus.

### CHEW

Expected effects include:

- longer pre-snap consumption;
- greater run/low-risk tendency when appropriate;
- fewer possessions;
- more recovery opportunity between snaps;
- reduced tactical variance in many contexts.

CHEW is not automatically better or safer in every state.

### KNEEL

KNEEL is a constrained end-game state.

AUTO should select it only when the engine's end-game logic considers it viable. A manual forced KNEEL may be allowed with an operator warning if the mathematical clock/timeout tree indicates the game cannot yet be exhausted safely.

## 8. Operator pinning

A manually selected tempo must be pinnable.

Example semantics:

```text
AUTO: engine may change state
MANUAL/PINNED: operator state persists until released or explicitly changed
```

The UI should show both value and source.

Example:

```text
TURBO
SOURCE: ENGINE
REASON: trailing 7 / Q4 / 02:17
```

or:

```text
TURBO
SOURCE: OPERATOR
PINNED
```

## 9. POISE / STAMINA / FOCUS operator controls

The operator can adjust live conditions for offense and defense independently.

Preferred low-false-precision scale:

```text
--   -   N   +   ++
```

Internal representation may map to:

```text
-2  -1   0  +1  +2
```

For two teams and two units, the conceptual state inventory is:

```text
3 variables x 2 units x 2 teams = 12 live human-pressure states
```

The panel should be collapsible.

### Semantics

- POISE: pressure absorption / composure under leverage.
- STAMINA: current physical ability to access latent strength.
- FOCUS: activation intensity relative to team/unit optimum.

These controls alter the capacity-demand system; they do not directly add/subtract fixed rating points.

## 10. Event log

Every material state change should retain:

```text
value
prior_value
source
actor/operator
timestamp
game_state_context
reason
```

Example:

```text
GAME G0031
OPERATOR changed TEX DEF STAMINA
N -> -
Q3 04:11
score TEX 24 / OU 21
```

The log must allow reconstruction of why the engine was in a given state.

## 11. Lock and acceptance

Before acceptance:

```text
intervention -> logged -> reversible when safe
```

After:

```text
LOCK GAME
  -> ACCEPT RESULT
  -> seal event history
  -> immutable game result
```

## 12. Minimum release behavior to test

- blank console can become a valid weekend slate from the three master sources;
- duplicate/missing game or team IDs prevent activation;
- EBC/SEN branding follows carriage assignment;
- clock correction does not duplicate clock-triggered events;
- forced possession preserves physical field location;
- timeout inventory and reset behavior are stateful and rule-valid;
- AUTO tempo is situational;
- manual tempo can remain pinned;
- kneel logic evaluates clock + timeout viability;
- POISE/STAMINA/FOCUS do not alter stored base power ratings;
- human-pressure effects remain bounded and auditable;
- accepted games cannot be changed;
- regression behavior from the prior stable release remains intact.
