import { normalizePlays } from './normalize.mjs';
import { teamStatistics } from './statistics.mjs';

const supported = new Set(['V508_SCORE', 'V508_ACCEPT']);
const pair = (actual, expected) => Array.isArray(actual) && actual.length === 2
  && actual.every((n, i) => n === expected[i]);

export function derive(packet) {
  const { game, audit, version, engine, journalMatches } = packet;
  const live = ['ACTIVE', 'DELAY'].includes(game.lifecycle);
  const base = { id: game.id, version, run: game.runId, live };
  const blocked = (reason) => ({ ...base, status: 'BLOCKED', reason });
  if ((!live && game.lifecycle !== 'READY') || game.qaOnly !== false) return blocked('RESULT_AWAITING_ACCEPTANCE');
  if (audit.some((entry) => !supported.has(entry.type))) return blocked('CORRECTION_REQUIRES_REVIEW');
  if (!journalMatches) return blocked('JOURNAL_MISMATCH');
  const accepted = audit.findLast((entry) => entry.type === 'V508_ACCEPT');
  if (!live && accepted?.run !== game.runId) return blocked('ACCEPTANCE_UNVERIFIED');
  const corrections = audit.filter((entry) => entry.type === 'V508_SCORE');
  const score = [0, 0];
  let manualIndex = 0;
  for (const record of game.history) {
    if (record.preSnap) continue;
    if (![0, 1].includes(record.team) || !Number.isInteger(record.points)) return blocked('INVALID_SCORE_RECORD');
    score[record.team] += record.points;
    if (record.source === 'MANUAL') {
      const entry = corrections[manualIndex++];
      if (entry?.run !== game.runId || entry.stamp !== record.masterZulu || !pair(entry.score, score)) {
        return blocked('CORRECTION_UNVERIFIED');
      }
    }
  }
  if (manualIndex !== corrections.length) return blocked('CORRECTION_UNVERIFIED');
  if (!live && !pair(accepted.score, score)) return blocked('ACCEPTED_SCORE_MISMATCH');
  try {
    const plays = normalizePlays(game, { sessionId: 'W13-5.0.8', engineVersion: engine, allowAuditedManualScore: true });
    if (!live && !pair(game.teamPlayCount, [0, 1].map((team) => plays.filter((play) => play.possessingTeam === team).length))) {
      return blocked('SNAP_COUNT_MISMATCH');
    }
    return { ...base, status: 'AVAILABLE', corrected: corrections.length > 0, stats: teamStatistics(game, plays) };
  } catch (error) {
    return blocked(error.message);
  }
}
