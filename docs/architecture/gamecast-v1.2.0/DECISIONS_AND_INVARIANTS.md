# GameCast v1.2.0 - Decisions and Invariants

Status: DESIGN DECISIONS / DURABLE MEMORY

## Product boundary

GameCast is a three-layer system:

1. synthetic simulation engine;
2. chairman/operator control console;
3. public live scoreboard.

The operator console is not merely a scoreboard editor. It is a controlled interface into the game-state and simulation engine.

## Operator sovereignty

- AUTO may choose game behavior from current state.
- The operator may intervene in clock, possession, timeout state, tempo, poise, stamina, and focus.
- Manual tempo changes must be pinnable so AUTO does not immediately overwrite them.
- Every material intervention must record value, source, timestamp, and reason.
- Sources are at minimum: SYSTEM, ENGINE, OPERATOR.
- Before result acceptance, an intervention may be reversible when technically safe.
- After LOCK + ACCEPT RESULT, the game and event history become immutable.

## Structural strength versus live state

Power ratings remain structural truth. Live controls must never directly rewrite the stored base power rating.

The intended semantics are:

> POISE, STAMINA, FOCUS, and TEMPO alter a team's ability to express latent strength under current execution demands. They are not automatic positive or negative rating points.

A strategy instruction is a demand, not a reward.

Examples:

- TURBO can improve an elite/mature offense while increasing its turnover exposure.
- The same TURBO state can reduce expected efficiency for a weaker or less mature offense while increasing explosive-play probability and overall variance.
- FOCUS can help up to an optimum and hurt beyond it.
- Higher aggression can increase an underdog's upset tail while worsening its mean expected result.

## MATURITY

MATURITY is a hidden structural team/unit property, not an operator slider.

It governs:

- width of the team's execution envelope;
- tolerance for higher tempo and cognitive load;
- sensitivity to overload;
- stability under pressure;
- how sharply performance deteriorates when demand exceeds capacity.

Strength and maturity are independent concepts. A talented team may be immature; a weaker team may be highly mature and stable.

## Mean and variance

GameCast must model expected performance and volatility separately.

This is non-negotiable because a strategy can:

- lower mean efficiency;
- raise explosive probability;
- raise turnover probability;
- widen the distribution;
- increase upset probability.

Those outcomes must be allowed to coexist.

## Tempo semantics

Supported states:

- AUTO - engine selects situational tempo;
- NORMAL - baseline offense;
- TURBO - faster decisions, less recovery, higher play volume and execution demand;
- CHEW - lower pace, greater clock consumption, lower possession count and generally lower variance;
- KNEEL - constrained end-game state selected only when appropriate or manually forced with warning.

AUTO is not synonymous with NORMAL.

Tempo must change process characteristics such as pace, play mix, aggression, fatigue, clock consumption, and risk. It must not be represented as a simple additive strength bonus.

## POISE semantics

POISE is primarily a pressure-damping property.

High poise reduces the amount of raw game leverage that reaches the execution system. Low poise allows more of the pressure load through. It should matter more in high-leverage situations than in ordinary early-game downs.

## STAMINA semantics

STAMINA represents currently accessible physical capacity.

- Workload and tempo consume stamina.
- Timeouts, possession changes, quarter breaks, and halftime can provide recovery.
- Teams/units may eventually have different fatigue and recovery coefficients.
- Fatigue reduces the ability to express latent strength; it does not rewrite latent strength itself.

## FOCUS semantics

FOCUS follows an inverted-U / activation-fit concept.

- Too little focus can create sloppy execution.
- An optimal level maximizes execution fit.
- Excess focus can create pressing, hesitation, tunnel vision, forced decisions, and mistakes.
- MATURITY broadens the useful focus window.

## Pregame expectation semantics

Expected matchup difficulty may seed an initial activation/complacency prior, but it must not permanently alter structural strength and must not make the market line self-fulfilling.

Pregame expectation influence should decay as actual game evidence accumulates.

## Roster turnover semantics

Roster turnover should not be a single inverted-U modifier. It should affect at least two latent properties separately:

- structural talent/strength;
- maturity/continuity.

Moderate transfer activity can increase talent while preserving enough continuity; extreme churn can improve talent while materially reducing maturity. Any inverted-U in overall performance should emerge from those competing mechanisms rather than be hard-coded.

## Strategic optionality versus aggression

Aggression and tactical optionality are separate concepts.

- A large late lead can mean low aggression and low optionality because the rational strategy is narrow and conservative.
- A 50/50 late game can have high optionality.
- A desperate late deficit can have very high aggression but low optionality because the offense becomes predictable and constrained.

## UI decisions preserved from this thread

- EBC and SEN network logos belong on the scoreboard and must be resolved from carriage/network registry data.
- The Master tab background is to be changed to gray; the final hex code was not supplied in this thread and remains OPEN.
- Human-pressure controls should be collapsible to avoid overwhelming normal operator use.
- A simple operator scale such as `-- / - / N / + / ++` is preferred to misleading 0-100 precision for live POISE/STAMINA/FOCUS adjustments.

## Non-goal

Do not turn operator controls into direct score manipulation or deterministic outcome selection. They change state, demand, risk, and probability distributions; the simulator still resolves football outcomes stochastically from the resulting state.
