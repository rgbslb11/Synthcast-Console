# GameCast v1.2.0 - Mathematical Response Functions 01-12

Status: MATHEMATICAL DESIGN / PROVISIONAL CALIBRATION

The equations below preserve the response architecture developed in the v1.2.0 design thread. They define intended mathematical behavior. Coefficients, scaling constants, and population calibration are NOT canonical until fitted and validated against the synthetic CFB population and simulation results.

## Symbol legend

- `S` = latent structural strength
- `M` = maturity / continuity / execution robustness
- `P` = poise
- `ST` = stamina
- `T` = tempo intensity
- `f` = focus intensity
- `L` = raw leverage / game pressure
- `L_eff` = poise-adjusted leverage
- `X` = situational complexity
- `u` = urgency
- `w` = win probability
- `C` = execution capacity
- `D` = execution demand
- `H` = headroom
- `O` = overload
- `AGG` = aggression
- `V` = volatility
- `sigma(x)` = logistic sigmoid `1 / (1 + exp(-x))`

---

## 1. Structural execution capacity

```math
C = \sigma(a + bS + cM + dST)
```

Purpose: convert structural strength, maturity, and current stamina into available execution capacity.

Population behavior:

- higher latent strength raises the ceiling;
- higher maturity improves the ability to access that strength under stress;
- fatigue lowers current accessible capacity without changing latent strength;
- the sigmoid prevents unbounded capacity and creates diminishing returns at the elite end.

---

## 2. Poise-adjusted pressure

```math
L_{eff} = L e^{-\gamma P}
```

Purpose: model POISE as a pressure damper rather than a direct performance bonus.

Population behavior:

- identical raw leverage can create different effective execution pressure across teams;
- high-poise teams absorb more situational pressure;
- low-poise teams experience more of the raw leverage signal;
- the effect is naturally more meaningful when `L` is high.

---

## 3. Execution demand

```math
D = \alpha + \beta_T T + \beta_L L_{eff} + \beta_X X + \beta_F f
```

Purpose: aggregate the demand placed on the unit by pace, pressure, complexity, and activation/focus.

Population behavior:

- TURBO raises demand;
- high leverage raises demand after POISE adjustment;
- complex down/distance or tactical states raise demand;
- elevated focus is not free; excessive activation can add cognitive burden.

---

## 4. Headroom

```math
H = C - D
```

Purpose: measure how much execution capacity remains after current demand.

Interpretation:

- `H >> 0`: comfortable operating zone;
- `H ~= 0`: edge / high-variance zone;
- `H < 0`: overload region.

Headroom is a central state variable because the same operator instruction produces different results for teams with different capacity.

---

## 5. Strategy conversion

```math
G(H) = \frac{1}{1 + e^{-kH}}
```

Purpose: smoothly translate headroom into the team's ability to convert strategic demand into clean execution.

Population behavior:

- large positive headroom -> conversion approaches 1;
- zero headroom -> conversion near the midpoint;
- negative headroom -> conversion falls rapidly;
- `k` controls how sharp the transition is.

A useful tempo-response form discussed in the thread is:

```math
\Delta \mu_T = A_T T (2G(H) - 1)
```

This allows the same TURBO instruction to improve mean execution for a high-headroom team and reduce it for an overloaded team.

---

## 6. Focus fit - maturity-dependent inverted U

```math
F_{fit} = \exp\left(-\frac{(f - \mu(M))^2}{2w(M)^2}\right)
```

Purpose: represent the idea that focus/activation has an optimum rather than a monotonic benefit.

Population behavior:

- low focus -> under-activation / sloppy execution;
- near `mu(M)` -> peak fit;
- focus above the optimum -> pressing / tunnel vision / hesitation / forced decisions;
- maturity should widen `w(M)`, allowing mature teams to operate effectively across a broader focus range.

This is the mathematical mechanism behind the principle that `FOCUS ++` can help one team and hurt another.

---

## 7. Maturity-weighted overload

```math
O = (1 - M) \cdot softplus(D - C)
```

where:

```math
softplus(x) = \ln(1 + e^x)
```

Purpose: make overload increase smoothly as demand exceeds capacity, with immature teams suffering more from the same excess demand.

Population behavior:

- when `D < C`, overload remains small;
- near the threshold, consequences begin rising;
- when `D > C`, overload grows quickly;
- maturity acts as a brittleness reducer.

A scaled softplus may be used during calibration if a sharper or softer transition is required.

---

## 8. Stamina decay and recovery

```math
ST_{t+1} = ST_t e^{-\lambda W_t} + \rho R_t (1 - ST_t)
```

Purpose: make stamina a dynamic state variable.

- `W_t` = workload since the prior update;
- `lambda` = fatigue sensitivity;
- `R_t` = recovery opportunity;
- `rho` = recovery rate.

Population behavior:

- repeated snaps, long drives, and TURBO increase workload;
- timeouts, possession changes, quarter breaks, and halftime provide recovery;
- depth/conditioning can eventually be expressed through team-specific `lambda` and `rho`.

---

## 9. Tactical optionality

```math
Opty(w,u) = (1-u) + u[4w(1-w)]
```

Purpose: distinguish tactical optionality from aggression.

Population behavior:

- early in games (`u` near 0), much of the playbook remains available regardless of win probability;
- late in games (`u` near 1), optionality peaks near a 50/50 game;
- a large late lead narrows rational choices toward clock/risk control;
- a desperate late deficit also narrows choices even while aggression becomes extreme.

Thus desperation can mean HIGH aggression + LOW optionality.

---

## 10. Aggression

```math
AGG = \sigma(a_0 + a_1U + a_2Def + a_3F4 + a_4T)
```

Purpose: model willingness/necessity to accept risk separately from tactical optionality.

Suggested inputs:

- `U` = urgency;
- `Def` = deficit pressure;
- `F4` = fourth-down decision pressure;
- `T` = tempo.

Population behavior:

- aggression can rise sharply in desperate states;
- a favorite protecting a lead can have low aggression;
- high aggression does not imply high-quality choices or high optionality.

---

## 11. Volatility

```math
V = V_0 \cdot \exp(v_T T + v_O O + v_F(1-F_{fit}) + v_B(1-M))
```

Purpose: model distribution width independently from mean performance.

Population behavior:

- faster tempo can increase variance;
- overload increases variance;
- focus misfit increases variance;
- immaturity increases brittleness/variance;
- the exponential keeps volatility positive and allows multiplicative growth.

This function is essential to underdog strategy: a team can become worse on average while increasing its right-tail/upset probability.

---

## 12. Outcome probability models

### Turnover model

```math
P(TO) = \sigma(\theta_0 + \theta_T T + \theta_O O + \theta_{TO}(T \times O) + \theta_F(1-F_{fit}) + \theta_S(1-ST))
```

Key interaction:

```math
T \times O
```

Turbo alone need not create a huge turnover penalty. Turbo while overloaded should be materially more dangerous.

### Explosive-play model

```math
P(EXP) = \sigma(\phi_0 + \phi_S S + \phi_T T + \phi_A AGG - \phi_O O)
```

Purpose: allow explosive opportunity and turnover risk to rise at the same time.

The engine should eventually use separate probability models for at least:

- success;
- explosive play;
- turnover;
- sack;
- penalty;
- negative play;
- completion/incompletion;
- yardage distribution;
- clock consumed.

Do not collapse all outcomes into one effective rating.

---

# Supplemental models discussed in the same thread

## Pregame activation / trap-game prior

A symmetric parabola was rejected because it cannot represent asymmetric complacency and panic behavior well.

Preferred conceptual form:

```math
A_{pre}(s)=
\begin{cases}
\exp[-(s-\mu)^2/(2\sigma_L^2)], & s < \mu \\
\exp[-(s-\mu)^2/(2\sigma_R^2)], & s \ge \mu
\end{cases}
```

where `s` is signed expected margin from the team's perspective.

Important semantic rule: expected spread seeds an initial psychological prior only. It must not permanently change latent strength and should decay as actual game evidence accumulates.

## Pregame-prior decay

```math
A_{pre,t} = A_{pre,0} e^{-t/\tau}
```

Possession-based decay may be preferable to wall-clock decay in implementation.

## Roster turnover decomposition

Do not model transfer-portal usage as one direct performance curve.

Illustrative structural-talent response:

```math
S(r) = S_0 + Gq(1-e^{-ar})
```

Illustrative continuity/maturity response:

```math
M(r) = M_0 e^{-\lambda r}
```

where `r` is roster replacement rate and `q` can represent incoming-player quality. The apparent inverted-U in total team performance should emerge from improving talent competing against deteriorating continuity.

---

# Calibration doctrine

1. Preserve these functional relationships unless evidence demonstrates they produce incorrect football behavior.
2. Do not treat illustrative coefficients from exploratory examples as production constants.
3. Fit coefficients against the entire synthetic CFB population, not only elite teams.
4. Evaluate response separately for favorites, underdogs, mature teams, brittle teams, fresh units, fatigued units, high-poise units, and low-poise units.
5. Validate both mean outcomes and distribution tails.
6. Explicitly test whether a high-variance underdog strategy can increase upset probability while lowering expected margin.
