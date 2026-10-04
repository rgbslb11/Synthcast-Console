// Operational controller only. Never consumes football RNG or chooses a football outcome.
export const BASES = Object.freeze(['KICKOFF', 'KICKOFF_PLUS', 'TV_START']);
export const TERMINAL = new Set(['FINAL_PENDING', 'LOCKED', 'READY', 'FINAL', 'SEUD PUBLISHED']);
export function freshDeadman(revision = 0) {
  return {status:'UNARMED', revision, basis:null, offsetMinutes:0, tvStartZulu:null,
    dueZulu:null, armedAtZulu:null, triggeredAtZulu:null, resolvedAtZulu:null,
    reason:null, controlOwner:'CHAIRMAN', armRunId:null};
}
export function utcMillis(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const n = Date.parse(value);
  if (!Number.isFinite(n)) return NaN;
  const canonical = new Date(n).toISOString();
  return canonical === value || canonical === value.replace('Z','.000Z') ? n : NaN;
}
export function dueFor(g, config) {
  if (!BASES.includes(config?.basis)) throw Error('Invalid Dead-Man trigger basis');
  const minutes = config.offsetMinutes ?? 0;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180) throw Error('Dead-Man offset must be an integer from 0 to 180 minutes');
  const offsetMinutes = config.basis === 'KICKOFF_PLUS' ? minutes : 0;
  const tvStartZulu = config.basis === 'TV_START' ? config.tvStartZulu : null;
  const base = utcMillis(config.basis === 'TV_START' ? tvStartZulu : g.kickoffZulu);
  if (!Number.isFinite(base)) throw Error(config.basis === 'TV_START' ? 'BLOCKED: enter the authorized TV start in UTC' : 'BLOCKED: kickoff UTC unavailable');
  return {basis:config.basis, offsetMinutes, tvStartZulu, dueZulu:new Date(base + offsetMinutes*60000).toISOString()};
}
export function arm(g, config, stamp) {
  if (g.lifecycle !== 'UNLAUNCHED') throw Error('Dead-Man can only be armed before Launch');
  const computed = dueFor(g, config), t = utcMillis(stamp);
  if (!Number.isFinite(t) || utcMillis(computed.dueZulu) <= t) throw Error('Trigger is not in the future; use normal Launch/AUTO');
  const d = freshDeadman((g.deadman?.revision || 0) + 1);
  Object.assign(d, computed, {status:'ARMED', armedAtZulu:stamp, armRunId:g.runId});
  g.deadman = d;
  return {action:'ARMED', id:g.id, runId:g.runId, deadman:structuredClone(d)};
}
export function disarm(g, stamp) {
  if (!['ARMED','BLOCKED'].includes(g.deadman?.status)) throw Error('Dead-Man is not armed');
  Object.assign(g.deadman,{status:'DISARMED',resolvedAtZulu:stamp,reason:'CHAIRMAN_DISARMED',controlOwner:'CHAIRMAN'});
  // Edit cancellation must not restore an obsolete arm.
  if (g.editSnapshot) g.editSnapshot.deadman = structuredClone(g.deadman);
  return {action:'DISARMED',id:g.id,runId:g.runId,deadman:structuredClone(g.deadman)};
}
export function afterOperatorCommand(g, command, stamp) {
  if (command === 'restart_same_seed' || command === 'purge_new_seed') {
    g.deadman = freshDeadman((g.deadman?.revision || 0) + 1);
    return;
  }
  const d = g.deadman;
  if (!d || ['launch','quarter_length','deadman_arm','deadman_disarm'].includes(command)) return;
  if (d.status === 'ARMED' || d.status === 'BLOCKED') {
    Object.assign(d,{status:'SATISFIED',reason:'CHAIRMAN_'+command.toUpperCase(),resolvedAtZulu:stamp,controlOwner:'CHAIRMAN'});
  } else if (d.status === 'AUTONOMOUS') d.controlOwner = 'CHAIRMAN';
  if (g.editSnapshot) g.editSnapshot.deadman = structuredClone(d);
}
export function tick(g, stamp) {
  const d = g.deadman;
  if (!d || d.status !== 'ARMED') return null;
  const t = utcMillis(stamp);
  if (!Number.isFinite(t)) throw Error('Invalid scheduler UTC');
  const out = action => ({id:g.id,runId:g.runId,action,masterZulu:stamp,deadman:structuredClone(d)});
  const block = reason => {Object.assign(d,{status:'BLOCKED',reason,resolvedAtZulu:stamp});return out('BLOCKED');};
  if (d.armRunId !== g.runId) return block('RUN_CHANGED_REARM_REQUIRED');
  let computed;
  try {computed = dueFor(g,d);} catch(e) {return block(e.message);}
  const changed = computed.dueZulu !== d.dueZulu;
  d.dueZulu = computed.dueZulu;
  if (t < utcMillis(d.dueZulu)) return changed ? out('RESCHEDULED') : null;
  if (g.auto || g.onAir || g.operatorPaused || g.editing || g.delayed || g.locked || TERMINAL.has(g.lifecycle) || ['EDIT','DELAY'].includes(g.lifecycle)) {
    Object.assign(d,{status:'SATISFIED',reason:'CHAIRMAN_CONTROL',resolvedAtZulu:stamp,controlOwner:'CHAIRMAN'});
    return out('SATISFIED');
  }
  if (!['UNLAUNCHED','ACTIVE'].includes(g.lifecycle)) return block('LIFECYCLE_NOT_ELIGIBLE');
  // Fail closed on actual rating values as well as the inherited readiness flag.
  const ready = p => p && ['overall','offense','defense'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k]));
  if (!g.powerReady || !ready(g.awayPower) || !ready(g.homePower)) return block('POWER_NOT_READY');
  // ACTIVE is eligible only for a launch that has never begun AUTO/ON AIR or any football.
  if (g.lifecycle === 'ACTIVE' && (g.pendingPlay || (g.history || []).length || (g.teamPlayCount || []).some(n=>n!==0))) return block('ACTIVE_FOOTBALL_ALREADY_STARTED');
  const launched = g.lifecycle === 'UNLAUNCHED';
  if (launched) {
    g.lifecycle='ACTIVE';g.activity='LIVE';g.glSeconds=0;g.seedLocked=true;g.launchedAt=stamp;
  }
  g.auto=true;g.onAir=false;g.operatorPaused=false;g.speed=1;
  g.lastPlay='Opening kickoff ready';
  Object.assign(d,{status:'AUTONOMOUS',triggeredAtZulu:stamp,reason:null,controlOwner:'AUTONOMOUS'});
  return out(launched ? 'AUTONOMOUS_LAUNCH' : 'AUTONOMOUS_AUTO');
}
