import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePlays } from '../../release-assets/v5.1.0/backend/reporting/normalize.mjs';

const context = { sessionId: 'qa-v510-punt-test', engineVersion: 'GC-W14-OT-RC1' };
const punt = {
  period: '2', team: 0, clock: 230, gl: 1700, yards: 48,
  desc: 'PUNT TOUCHBACK · Punt · 48 net yards',
  originalDescription: 'Punt · 48 net yards',
  ruling: 'PUNT_TOUCHBACK', score: [0, 0],
  preSnap: { down: 4, distance: 7, fieldPos: 60 },
  adjudicated: { possession: 1, down: 1, distance: 10, fieldPos: 20, points: 0 },
};
const game = play => ({ id: 'G9000', runId: 'fixture-1', quarterLengthSeconds: 600, history: [play] });

test('normalizes a recorded Week 14 punt touchback without treating it as an offensive snap', () => {
  const [play] = normalizePlays(game(punt), context);
  assert.equal(play.category, 'PUNT');
  assert.equal(play.ruling, 'PUNT_TOUCHBACK');
  assert.equal(play.postPossession, 1);
  assert.equal(play.postFieldPosition, 20);
  assert.equal(play.offensive, false);
});

test('fails closed on an inconsistent punt touchback or unknown ruling', () => {
  const altered = { ...punt, adjudicated: { ...punt.adjudicated, fieldPos: 21 } };
  assert.throws(() => normalizePlays(game(altered), context), /INVALID_PUNT_TOUCHBACK/);
  assert.throws(() => normalizePlays(game({ ...punt, ruling: 'UNKNOWN' }), context), /UNKNOWN_PLAY_RULING/);
});
