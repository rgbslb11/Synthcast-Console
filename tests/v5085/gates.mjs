import assert from 'node:assert/strict';
import * as baseline from '../../release-assets/v5.0.8-week13/backend/runtime/engine.mjs';
import * as candidate from '../../release-assets/v5.0.8.5-week13/backend/runtime/engine.mjs';
import { OPERATING_SLATE } from '../../release-assets/v5.0.8.5-week13/backend/runtime/week13.mjs';

const GAME_WINDOW = 20_000;
const SPEEDS = [1, 4, 10, 20, 50];
const volatileKeys = new Set(['masterZulu', 'createdRunAt', 'launchedAt', 'completedAt', 'speed', 'engineVersion']);
const clean = value => JSON.stringify(value, (key, item) => volatileKeys.has(key) ? undefined : item);

function start(engine, matchup, seed) {
  const game = engine.initialGame(matchup);
  game.seedHex = seed.toString(16).padStart(32, '0');
  game.rngState = engine.seedWords(game.seedHex, game.id);
  Object.assign(game, { lifecycle: 'ACTIVE', activity: 'LIVE', auto: true, qaOnly: true });
  engine.ensureOpeningToss(game);
  return game;
}

function finish(engine, game) {
  const result = structuredClone(game);
  engine.advanceGame(result, GAME_WINDOW);
  return result;
}

function checkFinal(game) {
  assert.equal(game.lifecycle, 'FINAL_PENDING');
  assert.equal(game.qaOnly, true);
  assert.notEqual(candidate.total(game, 0), candidate.total(game, 1));
  assert.equal(game.teamTopSeconds[0] + game.teamTopSeconds[1], 2400);
  assert.ok(game.fieldPos >= 1 && game.fieldPos <= 99);
  assert.ok(Object.keys(game.scores).every(key => /^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(key)));
}

function aggregate(totals, game) {
  totals.points += candidate.total(game, 0) + candidate.total(game, 1);
  totals.margin += Math.abs(candidate.total(game, 0) - candidate.total(game, 1));
  totals.plays += game.teamPlayCount[0] + game.teamPlayCount[1];
  totals.gl += game.glSeconds;
}

const board = OPERATING_SLATE.map(matchup => start(candidate, matchup, 9000));
const full = candidate.project(board, GAME_WINDOW);
assert.equal(full.length, 59);
full.forEach(checkFinal);
assert.equal(clean(full), clean(candidate.project(board.map(game => ({ ...game, speed: 50 })), GAME_WINDOW / 50)));

const counters = { pairs: 0, exactHistory: 0, changedScore: 0, changedWinner: 0, repeat: 0, chunks: 0, speeds: 0 };
const oldTotals = { points: 0, margin: 0, plays: 0, gl: 0 };
const newTotals = { points: 0, margin: 0, plays: 0, gl: 0 };
const beforeFourth = game => game.history.filter(play => ['1', '2', '3'].includes(play.period));
const score = game => [candidate.total(game, 0), candidate.total(game, 1)];

for (const matchup of OPERATING_SLATE) {
  for (let seed = 0; seed < 20; seed++) {
    const initial = start(candidate, matchup, seed);
    const original = finish(baseline, start(baseline, matchup, seed));
    const revised = finish(candidate, initial);
    checkFinal(revised);
    assert.equal(clean(beforeFourth(revised)), clean(beforeFourth(original)), matchup.id + '/' + seed);
    counters.pairs++;
    if (clean(original.history) === clean(revised.history)) counters.exactHistory++;
    const [oldAway, oldHome] = score(original);
    const [newAway, newHome] = score(revised);
    if (oldAway !== newAway || oldHome !== newHome) counters.changedScore++;
    if ((oldAway > oldHome) !== (newAway > newHome)) counters.changedWinner++;
    aggregate(oldTotals, original);
    aggregate(newTotals, revised);

    assert.equal(clean(revised), clean(finish(candidate, initial)));
    counters.repeat++;
    if (seed !== 0 && clean(revised.history) === clean(original.history)) continue;

    let checkpoint = structuredClone(initial);
    for (let t = 0; t < GAME_WINDOW; t += 37) {
      candidate.advanceGame(checkpoint, Math.min(37, GAME_WINDOW - t));
      if (t % 407 === 0) checkpoint = JSON.parse(JSON.stringify(checkpoint));
    }
    assert.equal(clean(revised), clean(checkpoint));
    counters.chunks++;
    for (const speed of SPEEDS) {
      assert.equal(clean(revised), clean(candidate.project([{ ...initial, speed }], GAME_WINDOW / speed)[0]));
      counters.speeds++;
    }
  }
}

const matchup = OPERATING_SLATE.find(game => game.id === 'G0635');
const draws = 10_000;
const samples = { originalRushes: 0, revisedRushes: 0 };
for (let seed = 0; seed < draws; seed++) {
  const game = {
    ...start(candidate, matchup, seed),
    period: '4th', activePeriod: '4', quarter: 4, scoreboardSeconds: 60,
    scores: { ...candidate.blankScores(), 4: [31, 27] },
    possession: 1, fieldPos: 45, down: 2, distance: 6, homeTimeouts: 1,
  };
  const original = structuredClone(game);
  baseline.generatePlay(original);
  candidate.generatePlay(game);
  if (original.pendingPlay.desc.startsWith('Run')) samples.originalRushes++;
  if (game.pendingPlay.desc.startsWith('Run')) samples.revisedRushes++;
}
assert.ok(Math.abs(samples.originalRushes / draws - .26) < .025);
assert.ok(Math.abs(samples.revisedRushes / draws - .10) < .02);
const means = sums => Object.fromEntries(Object.entries(sums).map(([key, value]) => [key, value / counters.pairs]));
console.log(JSON.stringify({
  fullBoard: full.length, ...counters, draws, ...samples,
  baselineMeans: means(oldTotals), candidateMeans: means(newTotals),
}, null, 2));
