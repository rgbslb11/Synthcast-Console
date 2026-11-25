import assert from 'node:assert/strict';
import * as baseline from '../../release-assets/week14/backend/runtime/engine.mjs';
import * as candidate from '../../release-assets/v5.0.9/backend/runtime/engine.mjs';
import { OPERATING_SLATE } from '../../release-assets/week14/backend/runtime/week14.mjs';

function run(runtime, matchup, seed) {
  const game = runtime.initialGame({ ...matchup, gameType: 'CONFERENCE_CHAMPIONSHIP' });
  game.seedHex = seed.toString(16).padStart(32, '0');
  game.rngState = runtime.seedWords(game.seedHex, game.id);
  runtime.ensureOpeningToss(game);
  Object.assign(game, { lifecycle: 'ACTIVE', auto: true, qaOnly: true });
  return runtime.project([game], 20000)[0];
}
const football = game => ({
  scores: game.scores, rng: game.rngState,
  snaps: game.history.filter(record => record.preSnap).map(({ gl, masterZulu, ...snap }) => snap),
});
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const samples = [];
for (const game of OPERATING_SLATE) {
  for (let seed = 0; seed < 20; seed++) {
    const original = run(baseline, game, seed);
    const revised = run(candidate, game, seed);
    assert.equal(revised.lifecycle, 'FINAL_PENDING');
    assert.deepEqual(football(revised), football(original));
    const breaks = revised.history.filter(event => event.ruling === 'COMMERCIAL_TIMEOUT').length;
    samples.push({ original: original.glSeconds, revised: revised.glSeconds, breaks });
  }
}
const values = samples.map(sample => sample.revised).sort((a, b) => a - b);
console.log(JSON.stringify({
  samples: samples.length,
  baselineMeanSeconds: mean(samples.map(sample => sample.original)),
  candidateMeanSeconds: mean(values),
  candidateP10Seconds: values[Math.floor(values.length * 0.10)],
  candidateP90Seconds: values[Math.floor(values.length * 0.90)],
  withinTarget: values.filter(seconds => seconds >= 9000 && seconds <= 9900).length,
  meanCommercials: mean(samples.map(sample => sample.breaks)),
}, null, 2));
