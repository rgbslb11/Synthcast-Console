export const DEADMAN_STATUS = Object.freeze({
  UNARMED: 'UNARMED',
  ARMED: 'ARMED',
  AUTONOMOUS: 'AUTONOMOUS',
  SATISFIED: 'SATISFIED',
  DISARMED: 'DISARMED',
  BLOCKED: 'BLOCKED',
});

export const DEADMAN_BASIS = Object.freeze({
  TV_START: 'TV_START',
  KICKOFF: 'KICKOFF',
  KICKOFF_PLUS: 'KICKOFF_PLUS',
});

const CLAIM_COMMANDS = new Set([
  'auto', 'on_air', 'pause', 'delay', 'resume_delay', 'score', 'clock_set',
  'edit_begin', 'edit_commit', 'end', 'lock', 'unlock', 'accept', 'reopen_live',
]);

export function freshDeadman() {
  return {
    status: DEADMAN_STATUS.UNARMED,
    basis: null,
    offsetMinutes: 0,
    dueZulu: null,
    armedAtZulu: null,
    armedBy: null,
    triggeredAtZulu: null,
    satisfiedAtZulu: null,
    satisfiedReason: null,
    disarmedAtZulu: null,
    blockedReason: null,
  };
}

export function ensureDeadman(game) {
  if (!game.deadman || typeof game.deadman !== 'object') game.deadman = freshDeadman();
  return game.deadman;
}

function parseZulu(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

export function calculateDeadmanDue(game, basis, offsetMinutes = 0) {
  if (!Object.values(DEADMAN_BASIS).includes(basis)) return { ok: false, reason: 'INVALID_BASIS' };
  const mins = Math.floor(Number(offsetMinutes));
  if (!Number.isFinite(mins) || mins < 0 || mins > 180) return { ok: false, reason: 'OFFSET_OUT_OF_RANGE' };
  const source = basis === DEADMAN_BASIS.TV_START ? game.tvStartZulu : game.kickoffZulu;
  const base = parseZulu(source);
  if (base === null) return { ok: false, reason: basis === DEADMAN_BASIS.TV_START ? 'TV_START_ZULU_UNAVAILABLE' : 'KICKOFF_ZULU_UNAVAILABLE' };
  const applied = basis === DEADMAN_BASIS.KICKOFF_PLUS ? mins : 0;
  return { ok: true, dueZulu: new Date(base + applied * 60000).toISOString(), offsetMinutes: applied };
}

export function armDeadman(game, { basis, offsetMinutes = 0 } = {}, stampZulu, actor = 'CHAIRMAN') {
  if (!game || game.lifecycle !== 'UNLAUNCHED') return { ok: false, reason: 'GAME_NOT_UNLAUNCHED' };
  const due = calculateDeadmanDue(game, basis, offsetMinutes);
  const dm = ensureDeadman(game);
  if (!due.ok) {
    Object.assign(dm, freshDeadman(), { status: DEADMAN_STATUS.BLOCKED, basis: basis || null, offsetMinutes: Number(offsetMinutes) || 0, blockedReason: due.reason });
    return { ok: false, reason: due.reason };
  }
  Object.assign(dm, freshDeadman(), {
    status: DEADMAN_STATUS.ARMED,
    basis,
    offsetMinutes: due.offsetMinutes,
    dueZulu: due.dueZulu,
    armedAtZulu: stampZulu,
    armedBy: actor,
  });
  return { ok: true, dueZulu: due.dueZulu };
}

export function disarmDeadman(game, stampZulu) {
  const dm = ensureDeadman(game);
  if (![DEADMAN_STATUS.ARMED, DEADMAN_STATUS.BLOCKED].includes(dm.status)) return { ok: false, reason: 'NOT_ARMED' };
  dm.status = DEADMAN_STATUS.DISARMED;
  dm.disarmedAtZulu = stampZulu;
  dm.blockedReason = null;
  return { ok: true };
}

export function satisfyDeadman(game, stampZulu, reason = 'CHAIRMAN_CONTROL') {
  const dm = ensureDeadman(game);
  if (dm.status !== DEADMAN_STATUS.ARMED) return false;
  dm.status = DEADMAN_STATUS.SATISFIED;
  dm.satisfiedAtZulu = stampZulu;
  dm.satisfiedReason = reason;
  dm.blockedReason = null;
  return true;
}

export function noteOperatorCommand(game, command, stampZulu) {
  const dm = ensureDeadman(game);
  if (dm.status !== DEADMAN_STATUS.ARMED) return false;
  if (command === 'auto' && game.auto) return satisfyDeadman(game, stampZulu, 'CHAIRMAN_AUTO');
  if (command === 'on_air' && game.onAir) return satisfyDeadman(game, stampZulu, 'CHAIRMAN_ON_AIR');
  if (CLAIM_COMMANDS.has(command) && !['auto', 'on_air'].includes(command)) return satisfyDeadman(game, stampZulu, `CHAIRMAN_${command.toUpperCase()}`);
  return false;
}

export function resetDeadman(game) {
  game.deadman = freshDeadman();
  if (game.controlOrigin === 'AUTONOMOUS') game.controlOrigin = null;
}

function refreshDue(game) {
  const dm = ensureDeadman(game);
  if (dm.status !== DEADMAN_STATUS.ARMED) return { ok: true };
  const due = calculateDeadmanDue(game, dm.basis, dm.offsetMinutes);
  if (!due.ok) {
    dm.status = DEADMAN_STATUS.BLOCKED;
    dm.blockedReason = due.reason;
    dm.dueZulu = null;
    return due;
  }
  dm.dueZulu = due.dueZulu;
  dm.blockedReason = null;
  return due;
}

export function tickDeadman(game, stampZulu) {
  const dm = ensureDeadman(game);
  if (dm.status !== DEADMAN_STATUS.ARMED) return { changed: false, action: 'NONE' };
  const due = refreshDue(game);
  if (!due.ok) return { changed: true, action: 'BLOCKED', reason: due.reason };
  const nowMs = parseZulu(stampZulu), dueMs = parseZulu(dm.dueZulu);
  if (nowMs === null) return { changed: false, action: 'INVALID_NOW' };
  if (dueMs === null || nowMs < dueMs) return { changed: false, action: 'WAIT' };

  if (game.auto) {
    satisfyDeadman(game, stampZulu, 'CHAIRMAN_AUTO');
    return { changed: true, action: 'SATISFIED' };
  }
  if (game.onAir) {
    satisfyDeadman(game, stampZulu, 'CHAIRMAN_ON_AIR');
    return { changed: true, action: 'SATISFIED' };
  }

  // Deliberate Chairman-held states win over the fallback. Never seize from Edit, Delay, Pause, or a finished game.
  if (game.operatorPaused || game.editing || game.delayed || ['EDIT', 'DELAY', 'FINAL_PENDING', 'LOCKED', 'READY', 'FINAL'].includes(game.lifecycle)) {
    satisfyDeadman(game, stampZulu, 'CHAIRMAN_CONTROL');
    return { changed: true, action: 'SATISFIED' };
  }

  if (!game.powerReady) {
    dm.status = DEADMAN_STATUS.BLOCKED;
    dm.blockedReason = 'POWER_NOT_READY';
    return { changed: true, action: 'BLOCKED', reason: dm.blockedReason };
  }

  if (game.lifecycle === 'UNLAUNCHED') {
    game.lifecycle = 'ACTIVE';
    game.activity = 'LIVE';
    game.glSeconds = 0;
    game.seedLocked = true;
    game.launchedAt = stampZulu;
    game.auto = true;
    game.onAir = false;
    game.operatorPaused = false;
    game.delayed = false;
    game.editing = false;
    game.controlOrigin = 'AUTONOMOUS';
    dm.status = DEADMAN_STATUS.AUTONOMOUS;
    dm.triggeredAtZulu = stampZulu;
    dm.blockedReason = null;
    game.lastPlay = `Dead-Man autonomous start · ${game.runId}`;
    return { changed: true, action: 'AUTONOMOUS_LAUNCH' };
  }

  // A Chairman may have pressed LAUNCH but forgotten AUTO/ON AIR. ARMED explicitly authorizes the fallback to take AUTO here.
  if (game.lifecycle === 'ACTIVE') {
    game.auto = true;
    game.onAir = false;
    game.operatorPaused = false;
    game.controlOrigin = 'AUTONOMOUS';
    dm.status = DEADMAN_STATUS.AUTONOMOUS;
    dm.triggeredAtZulu = stampZulu;
    dm.blockedReason = null;
    game.lastPlay = `Dead-Man autonomous AUTO · ${game.runId}`;
    return { changed: true, action: 'AUTONOMOUS_AUTO' };
  }

  dm.status = DEADMAN_STATUS.BLOCKED;
  dm.blockedReason = `LIFECYCLE_${String(game.lifecycle || 'UNKNOWN')}`;
  return { changed: true, action: 'BLOCKED', reason: dm.blockedReason };
}
