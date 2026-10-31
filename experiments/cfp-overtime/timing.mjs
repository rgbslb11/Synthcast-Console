// Isolated CFP timing candidate. Not imported by any release runtime.
// Football outcomes and timeout decisions belong to the authoritative engine.
export const CFP_OT_TIMING = Object.freeze({
  regulationToOtSeconds: 600,
  coinTossSecondsRemaining: 60, // Proposed placement within "near end".
  ot1ToOt2Seconds: 180,
  ot2ToOt3Seconds: 300,
  laterTransitionSeconds: 120,
  teamTimeoutSeconds: 90,
});

function requireState(condition, message) {
  if (!condition) throw new Error(message);
}
function positiveInteger(value) {
  requireState(Number.isSafeInteger(value) && value > 0, 'Positive integer required');
}
export function transitionSeconds(completedPeriod) {
  requireState(Number.isSafeInteger(completedPeriod) && completedPeriod >= 0, 'Invalid OT period');
  if (completedPeriod === 0) return CFP_OT_TIMING.regulationToOtSeconds;
  if (completedPeriod === 1) return CFP_OT_TIMING.ot1ToOt2Seconds;
  if (completedPeriod === 2) return CFP_OT_TIMING.ot2ToOt3Seconds;
  return CFP_OT_TIMING.laterTransitionSeconds;
}

export function createOvertimeTiming() {
  return {
    period: 0, phase: 'READY', remainingSeconds: 0,
    elapsedSeconds: 0, timeouts: [0, 0], coinTossDueEmitted: false,
    completedEventIds: [], activeEvent: null, events: [],
  };
}
function record(state, type, details = {}) {
  state.events.push({ type, elapsedSeconds: state.elapsedSeconds, period: state.period, ...details });
}
function requireIdle(state) {
  requireState(state.phase === 'READY', 'Timing event already active or overtime finished');
}
function requireEventId(state, eventId) {
  requireState(typeof eventId === 'string' && eventId.length > 0, 'Event ID required');
  requireState(!state.completedEventIds.includes(eventId), 'Event already completed');
}
function start(state, kind, seconds, eventId, details = {}) {
  requireIdle(state);
  positiveInteger(seconds);
  requireEventId(state, eventId);
  state.phase = kind;
  state.remainingSeconds = seconds;
  state.activeEvent = { eventId, kind, ...details };
  record(state, 'TIMING_STARTED', { seconds, ...state.activeEvent });
}

// Caller must first adjudicate that regulation/previous period ended tied.
// No event completion decides a score or automatically awards a possession.
export function beginNextPeriodBreak(state, eventId) {
  requireIdle(state);
  start(state, 'PERIOD_BREAK', transitionSeconds(state.period), eventId,
    { nextPeriod: state.period + 1 });
}

// Timeout may be called only at an eligible dead ball, not during a play or
// another break. An attempted overlap is rejected, never silently stacked.
export function beginTeamTimeout(state, team, eventId) {
  requireIdle(state);
  requireEventId(state, eventId);
  requireState(state.period >= 1, 'Overtime has not begun');
  requireState(team === 0 || team === 1, 'Invalid team');
  requireState(state.timeouts[team] > 0, 'No overtime timeout remaining');
  start(state, 'TEAM_TIMEOUT', CFP_OT_TIMING.teamTimeoutSeconds, eventId, { team });
  state.timeouts[team]--;
}

// Actual play/dead-ball durations must come from the approved football model.
// This layer never samples a duration or invents play-by-play around a score.
export function beginFootballInterval(state, kind, seconds, eventId) {
  requireState(state.period >= 1, 'Overtime has not begun');
  requireState(['PLAY', 'DEAD_BALL', 'POSSESSION_CHANGE', 'TRY_SETUP'].includes(kind), 'Invalid interval');
  start(state, kind, seconds, eventId);
}

// Returns unconsumed time for the engine to apply after resolving the completed
// event. This prevents polling chunks from skipping required football actions.
// elapsedSeconds is a component ledger, not a second authoritative GL clock.
// The integrating engine advances its own GL by consumedSeconds exactly once.
export function advanceOvertimeTiming(state, seconds, { frozen = false } = {}) {
  requireState(Number.isSafeInteger(seconds) && seconds >= 0, 'Invalid elapsed seconds');
  if (state.phase === 'FINAL') return { consumedSeconds: 0, remainingSeconds: seconds };
  if (frozen) {
    state.elapsedSeconds += seconds;
    return { consumedSeconds: seconds, remainingSeconds: 0 };
  }
  if (state.phase === 'READY') return { consumedSeconds: 0, remainingSeconds: seconds };
  const consumed = Math.min(seconds, state.remainingSeconds);
  const before = state.remainingSeconds;
  const after = before - consumed;
  if (state.phase === 'PERIOD_BREAK' && state.activeEvent.nextPeriod === 1 &&
      !state.coinTossDueEmitted && before > CFP_OT_TIMING.coinTossSecondsRemaining &&
      after <= CFP_OT_TIMING.coinTossSecondsRemaining) {
    state.coinTossDueEmitted = true;
    state.events.push({ type: 'COIN_TOSS_DUE', period: 0,
      elapsedSeconds: state.elapsedSeconds + before - CFP_OT_TIMING.coinTossSecondsRemaining });
  }
  state.elapsedSeconds += consumed;
  state.remainingSeconds = after;
  if (after === 0) {
    const event = state.activeEvent;
    state.completedEventIds.push(event.eventId);
    record(state, 'TIMING_COMPLETED', event);
    if (event.kind === 'PERIOD_BREAK') {
      state.period = event.nextPeriod;
      // Fresh allowance in OT1, OT2, OT3. OT4+ retains the OT3 balance.
      if (state.period <= 3) state.timeouts = [1, 1];
      record(state, 'PERIOD_READY', { timeouts: [...state.timeouts] });
    }
    state.phase = 'READY';
    state.activeEvent = null;
  }
  return { consumedSeconds: consumed, remainingSeconds: seconds - consumed };
}

export function finishOvertimeTiming(state) {
  requireIdle(state);
  requireState(state.period >= 1, 'Overtime has not begun');
  state.phase = 'FINAL';
  record(state, 'OVERTIME_TIMING_FINISHED');
}
