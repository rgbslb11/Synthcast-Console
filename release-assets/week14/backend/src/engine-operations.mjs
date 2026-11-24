import { createEngineOperations as createBaselineOperations } from './baseline-operations.mjs';
import { SecurityError } from '../security/security-core.mjs';

export function createEngineOperations({ engine, clock }) {
  const baseline = createBaselineOperations({ engine, clock });
  return {
    ...baseline,
    async executeCommand(draft, body) {
      const game = draft.state.find(({ id }) => id === body.id);
      if (body.command === 'overtime_timeout') {
        const team = body.payload?.team;
        if (!game) throw new SecurityError('GAME_NOT_FOUND', 404);
        if (!game.overtime || game.overtime.round !== body.payload?.round) throw new SecurityError('OVERTIME_PERIOD_CHANGED', 409);
        if (!engine.callOvertimeTimeout(game, team)) throw new SecurityError('OVERTIME_TIMEOUT_UNAVAILABLE', 409);
        const record = game.history.at(-1);
        draft.lastAdvancedAt = record.masterZulu;
        return { events: [{ type: 'V508_FOOTBALL_RECORD', gameId: game.id, payload: structuredClone(record) }] };
      }
      if (game?.overtime && body.command === 'clock_set') throw new SecurityError('OVERTIME_UNTIMED', 409);
      if (game?.overtime && body.command === 'edit_commit' && game.editResume && !engine.FINALISH.has(game.editResume.lifecycle)) {
        const payload = body.payload ?? {};
        if ((payload.quarter !== undefined && payload.quarter !== 4) || (payload.clockSeconds ?? 0) !== 0) {
          throw new SecurityError('OVERTIME_UNTIMED', 409);
        }
        if ([payload.awayTimeouts, payload.homeTimeouts].some(value => value !== undefined && ![0, 1].includes(value))) {
          throw new SecurityError('OVERTIME_TIMEOUT_ALLOTMENT_INVALID', 409);
        }
      }
      return baseline.executeCommand(draft, body);
    },
  };
}
