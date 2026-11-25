import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { OPERATING_SLATE } from '../../release-assets/week14/backend/runtime/week14.mjs';

const script = fs.readFileSync(new URL('../../public/week14/display-game-ids.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(script, context);
const displayId = context.week14DisplayGameId;

test('Week 14 display IDs cover the Thursday-to-Saturday slate exactly once', () => {
  const future = OPERATING_SLATE.filter(game => game.date >= '2026-11-26');
  const expected = Array.from({ length: 59 }, (_, i) => 'G0' + (677 + i))
    .filter(id => id !== 'G0685' && id !== 'G0735');
  assert.equal(future.length, 57);
  assert.deepEqual(future.map(game => displayId(game.id)).sort(), expected);
  for (const game of OPERATING_SLATE.filter(game => game.date < '2026-11-26')) {
    assert.equal(displayId(game.id), game.id);
  }
  assert.equal(displayId('G0635'), 'G0635');
});

test('display IDs follow the approved fixtures including the four SEUD schedule differences', () => {
  const byMatchup = new Map(OPERATING_SLATE.map(game => [game.matchup, game.id]));
  for (const [matchup, expected] of [
    ['TCU at Texas Tech', 'G0721'],
    ['Boise State at Colorado State', 'G0686'],
    ['San Diego State at Washington State', 'G0734'],
    ['Texas State at Utah State', 'G0727'],
    ['Oregon State at Fresno State', 'G0689'],
    ['Navy at Hawaii', 'G0693'],
  ]) {
    assert.equal(displayId(byMatchup.get(matchup)), expected, matchup);
  }
});
