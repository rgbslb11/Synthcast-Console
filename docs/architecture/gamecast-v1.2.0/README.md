# GameCast v1.2.0 - Durable Design Context

Status: HISTORICAL DESIGN LINEAGE / SOURCE MEMORY

This folder preserves the design decisions developed in the GameCast v1.2.0 engineering thread. It is intended to prevent loss of architectural intent across chats and future releases.

Important: these documents describe the v1.2.0 design lineage. They must not be treated as proof that every item is implemented in the current runtime. Before changing a later release, verify the current code and current release documentation.

## Core thesis

GameCast is not only a scoreboard. It is a synthetic college-football simulation and operator-control system in which:

- latent team strength remains the structural baseline;
- the operator may change live game conditions and strategic intent;
- tempo, poise, stamina, and focus are not automatic performance bonuses;
- team maturity determines how well a team can convert added demand into execution;
- the same operator intervention can improve one team, destabilize another, or increase an underdog's upset probability while worsening its average expected result;
- mean performance and outcome variance must be modeled separately;
- operator interventions must be auditable and accepted results must become immutable.

## Durable v1.2.0 feature set

1. Add EBC and SEN network logos to the scoreboard, driven by carriage data rather than hard-coded per game.
2. Allow a completely blank board to be initialized from three master sources:
   - week schedule;
   - power ratings;
   - carriage.
3. Stage, validate, preview, and activate a weekly slate rather than importing master data directly into the live board.
4. Add operator controls to:
   - set/correct the game clock;
   - force a change of possession;
   - manage real timeout inventory and timeout scenario logic;
   - control or pin offensive tempo;
   - adjust POISE, STAMINA, and FOCUS during the game.
5. Tempo states: AUTO, NORMAL, TURBO, CHEW, KNEEL.
6. Add hidden latent MATURITY as a structural team property. MATURITY is not an operator slider.
7. Interpret POISE, STAMINA, FOCUS, and TEMPO through a capacity-vs-demand model rather than additive rating boosts.
8. Preserve a source-aware event log for SYSTEM, ENGINE, and OPERATOR changes.

## Files in this folder

- `DECISIONS_AND_INVARIANTS.md` - canonical design rules and non-negotiable semantics.
- `FUNCTIONS_01_12.md` - mathematical model and the twelve response functions developed in the thread.
- `OPERATOR_SLATE_CONTROL_SPEC.md` - blank-board initialization, carriage, clock, possession, timeout, tempo, and human-pressure controls.
- `OPEN_QUESTIONS_AND_CALIBRATION.md` - items that remain unresolved, uncalibrated, or require source data.

## Compact process flow

```text
Pregame master inputs
  -> slate staging + validation
  -> immutable slate/rating/carriage snapshot
  -> live game state
  -> operator/engine controls
  -> capacity vs demand engine
  -> strategic context / optionality / aggression
  -> play outcome probabilities
  -> drive/game state update
  -> auditable event log
  -> lock + accept result
```

## Mathematical summary

```text
Latent Strength + Maturity + Stamina
  -> Execution Capacity

Tempo + Focus + Pressure + Complexity
  -> Execution Demand

Capacity - Demand
  -> Headroom

Headroom + Focus Fit + Overload + Strategic Context
  -> Outcome Probabilities + Volatility
```

## Historical artifacts created from this design discussion

The thread also produced:

- a one-page GameCast v1.2.0 mathematical summary/process-flow PDF;
- a portrait infographic containing the twelve functions and process flow;
- a 13-page population guide explaining Functions 1-12 with labeled graphs.

Those artifacts are explanatory outputs. The Markdown files in this folder are the durable source-memory layer.
