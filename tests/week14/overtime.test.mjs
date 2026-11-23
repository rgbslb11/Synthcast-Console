import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as engine from '../../release-assets/week14/backend/runtime/engine.mjs';
import * as baseline from '../../release-assets/v5.0.8.5-week13/backend/runtime/engine.mjs';
import { TEAM_POWER } from '../../release-assets/week14/backend/runtime/power.mjs';
import { OPERATING_SLATE } from '../../release-assets/v5.0.8.5-week13/backend/runtime/week13.mjs';
import { publicGame } from '../../release-assets/v5.0.8.5-week13/backend/security/security-core.mjs';
import { createEngineOperations } from '../../release-assets/week14/backend/src/engine-operations.mjs';

const matchup = OPERATING_SLATE.find(game => game.id === 'G0635');
const tidy = object => JSON.parse(JSON.stringify(object, (key, value) =>
  ['masterZulu', 'completedAt', 'createdRunAt', 'speed'].includes(key) ? undefined : value));

function start(rngSeed = 9, game = matchup) {
  const g = engine.initialGame(game);
  const seedHex = rngSeed.toString(16).padStart(32, '0');
  Object.assign(g, { seedHex, rngState: engine.seedWords(seedHex, g.id), quarter: 4,
    activePeriod: '4', period: '4th', scoreboardSeconds: 0, awayTimeouts: 3, homeTimeouts: 2,
    lifecycle: 'ACTIVE', activity: 'LIVE', auto: true, qaOnly: true });
  engine.finishPeriod(g);
  return g;
}

function snap(g, overrides = {}) {
  if (g.breakSeconds) engine.advanceGame(g, g.breakSeconds);
  g.pendingPlay = { phase: 'PLAY', strategy: 'NORMAL', desc: 'Test snap', remaining: 1,
    team: g.possession, yards: 0, points: 0, ...overrides };
  engine.advanceGame(g, 1);
  return g.history.at(-1);
}

const fieldGoal = (g, points = 3) => snap(g, { fg: true, points });
const rush = (g, yards) => snap(g, { yards, first: yards >= g.distance });
const reachThird = g => {
  for (let index = 0; index < 4; index++) fieldGoal(g);
  assert.equal(g.activePeriod, '3OT');
};

test('121 ranked teams map exactly from approved CSV to runtime TEAM/OFF/DEF', () => {
  const source = readFileSync(new URL('../../release-assets/week14/approved-ratings.csv', import.meta.url), 'utf8');
  const rows = source.trim().split('\n').slice(1).map(line => line.split(','));
  assert.equal(rows.length, 121);
  assert.equal(new Set(rows.map(row => row[1])).size, 121);
  assert.equal(new Set(rows.map(row => row[2])).size, 121);
  assert.equal(Object.keys(TEAM_POWER).length, 121);
  for (const [index, [rank, , name, team, off, def]] of rows.entries()) {
    assert.equal(Number(rank), index + 1);
    assert.deepEqual(TEAM_POWER[name], { overall: Number(team), offense: Number(off), defense: Number(def) });
  }
});

test('OT1 is untimed, starts at +25, earns first downs and resolves the PAT as a separate snap', () => {
  const g = start();
  const first = g.possession;
  const second = 1 - first;
  assert.deepEqual([g.awayTimeouts, g.homeTimeouts], [1, 1]);
  assert.deepEqual([g.fieldPos, g.down, g.distance], [75, 1, 10]);
  assert.equal(rush(g, 7).preSnap.fieldPos, 75);
  assert.deepEqual([g.fieldPos, g.down, g.distance], [82, 2, 3]);
  rush(g, 6);
  assert.deepEqual([g.fieldPos, g.down, g.distance], [88, 1, 10]);
  assert.equal(rush(g, 12).ruling, 'TOUCHDOWN');
  assert.equal(g.scores.OT[first], 6);
  assert.equal(g.fieldPos, 97);
  assert.equal(snap(g, { fg: true, points: 1 }).ruling, 'EXTRA_POINT');
  assert.equal(g.scores.OT[first], 7);
  assert.equal(g.possession, second);
  assert.equal(g.fieldPos, 75);
  fieldGoal(g);
  assert.equal(g.lifecycle, 'FINAL_PENDING');
  assert.equal(g.scoreboardSeconds, 0);
  assert.equal(g.gameClockStatus, 'STOPPED');
  assert.deepEqual(g.teamTopSeconds, [0, 0]);
});

test('OT2 reverses first offense, refreshes timeouts and runs separate two-point tries', () => {
  const g = start();
  const first = g.possession;
  assert.equal(engine.callOvertimeTimeout(g, 0), true);
  fieldGoal(g);
  fieldGoal(g);
  assert.equal(g.activePeriod, '2OT');
  assert.equal(g.possession, 1 - first);
  assert.deepEqual([g.awayTimeouts, g.homeTimeouts], [1, 1]);
  rush(g, 25);
  assert.equal(g.overtime.tryKind, 'TWO_POINT');
  assert.equal(rush(g, 3).adjudicated.points, 2);
  rush(g, 25);
  rush(g, 3);
  assert.deepEqual(g.scores['2OT'], [8, 8]);
  assert.equal(g.activePeriod, '3OT');
  assert.equal(g.breakSeconds, 120);
});

test('shootout alternates order, requires a response and shares one timeout through all later rounds', () => {
  const g = start();
  reachThird(g);
  const first = g.possession;
  assert.equal(engine.callOvertimeTimeout(g, 0), true);
  assert.equal(engine.callOvertimeTimeout(g, 0), false);
  assert.equal(rush(g, 3).preSnap.fieldPos, 97);
  assert.equal(g.lifecycle, 'ACTIVE');
  assert.equal(g.possession, 1 - first);
  rush(g, 3);
  assert.equal(g.activePeriod, '4OT');
  assert.equal(g.breakSeconds, 0);
  assert.equal(g.possession, 1 - first);
  assert.deepEqual([g.awayTimeouts, g.homeTimeouts], [0, 1]);
  rush(g, 2);
  rush(g, 2);
  assert.equal(g.activePeriod, '5OT');
  rush(g, 3);
  rush(g, 2);
  assert.equal(g.lifecycle, 'FINAL_PENDING');
  assert.equal(publicGame(g).activePeriod, '5OT');
  assert.equal(publicGame(g).scoreboardSeconds, 0);
  assert.equal(Object.hasOwn(publicGame(g), 'pendingPlay'), false);
});

test('non-scoring turnover and failed fourth down end the series, not the game on the first possession', () => {
  const g = start();
  snap(g, { turnover: true, overtimeReturn: { yards: 12, touchdown: false } });
  assert.equal(g.overtime.series, 1);
  assert.equal(g.fieldPos, 75);
  for (let i = 0; i < 4; i++) rush(g, 0);
  assert.equal(g.activePeriod, '2OT');
  assert.equal(g.history.at(-1).ruling, 'TURNOVER_ON_DOWNS');
});

test('a defensive touchdown can end a series game immediately, a defensive try return preserves the response', () => {
  const defense = { turnover: true, overtimeReturn: { yards: 99, touchdown: true } };
  const g = start();
  assert.equal(snap(g, defense).adjudicated.points, 6);
  assert.equal(g.lifecycle, 'FINAL_PENDING');
  assert.equal(g.history.filter(event => event.preSnap).length, 1);
  const h = start();
  reachThird(h);
  const defendingTeam = 1 - h.possession;
  const play = snap(h, defense);
  assert.equal(play.adjudicated.points, 2);
  assert.equal(play.scoringTeam, defendingTeam);
  assert.equal(h.possession, defendingTeam);
  assert.equal(h.lifecycle, 'ACTIVE');
  rush(h, 3);
  assert.equal(h.scores['3OT'][defendingTeam], 4);
  assert.equal(h.lifecycle, 'FINAL_PENDING');
});

test('command path records a timeout once and rejects a running OT clock and excess timeout credit', async () => {
  const g = start();
  const draft = { state: [g] };
  const ops = createEngineOperations({ engine });
  const command = (name, payload) => ops.executeCommand(draft, { id: g.id, command: name, payload });
  await assert.rejects(command('overtime_timeout', { team: 0, round: 2 }), /OVERTIME_PERIOD_CHANGED/);
  const receipt = await command('overtime_timeout', { team: 0, round: 1 });
  assert.equal(receipt.events[0].payload.ruling, 'TEAM_TIMEOUT');
  await assert.rejects(command('overtime_timeout', { team: 0, round: 1 }), /OVERTIME_TIMEOUT_UNAVAILABLE/);
  await assert.rejects(command('clock_set', { seconds: 20 }), /OVERTIME_UNTIMED/);
  await command('edit_begin', {});
  await assert.rejects(command('edit_commit', { awayTimeouts: 2 }), /OVERTIME_TIMEOUT_ALLOTMENT_INVALID/);
  const breakBefore = g.breakSeconds;
  await command('edit_commit', { quarter: 4, clockSeconds: 0, ballSide: 'OPP', yardline: 40, resumeAuto: true });
  engine.advanceGame(g, breakBefore);
  assert.equal(g.activePeriod, 'OT');
  assert.equal(g.fieldPos, 60);
});

test('512 seeded fixtures replay identically across snapshots, pause and simulation speeds', () => {
  let third = 0, deeper = 0;
  for (let seed = 0; seed < 512; seed++) {
    const initial = start(seed);
    const final = engine.project([initial], 4000)[0];
    assert.equal(final.lifecycle, 'FINAL_PENDING');
    assert.ok(final.history.some(event => event.preSnap));
    assert.notEqual(engine.total(final, 0), engine.total(final, 1));
    if (final.scores['3OT']) third++;
    if (final.scores['4OT']) deeper++;
    for (const speed of [1, 4, 20, 50]) {
      assert.deepEqual(tidy(engine.project([{ ...initial, speed }], 4000 / speed)[0]), tidy(final));
    }
    let sliced = structuredClone(initial);
    for (let left = 4000; left > 0; left -= 37) {
      engine.advanceGame(sliced, Math.min(37, left));
      sliced = JSON.parse(JSON.stringify(sliced));
    }
    assert.deepEqual(tidy(sliced), tidy(final));
  }
  assert.ok(third > 0 && deeper > 0);
  const game = start(50);
  engine.advanceGame(game, game.breakSeconds + 1);
  const before = structuredClone(game);
  game.operatorPaused = true;
  engine.advanceGame(game, 30);
  game.operatorPaused = false;
  assert.deepEqual(game.pendingPlay, before.pendingPlay);
  assert.deepEqual(game.rngState, before.rngState);
  assert.equal(game.glSeconds, before.glSeconds + 30);
  const result = engine.project([game], 4000)[0];
  const resultWithoutPause = engine.project([before], 4000)[0];
  assert.deepEqual(tidy(result.history).map(({gl, ...item}) => item),
    tidy(resultWithoutPause.history).map(({gl, ...item}) => item));
});

test('regulation play and scores match 5.0.8.5 across 59 games using identical seeded inputs', () => {
  const common = OPERATING_SLATE.map((fixture, i) => {
    const g = baseline.initialGame(fixture);
    g.seedHex = i.toString(16).padStart(32, '0');
    g.rngState = baseline.seedWords(g.seedHex, g.id);
    baseline.ensureOpeningToss(g);
    return Object.assign(g, { lifecycle: 'ACTIVE', auto: true, qaOnly: true });
  });
  const original = baseline.project(common, 20000);
  const candidate = engine.project(common, 20000);
  assert.equal(candidate.length, 59);
  for (const [i, game] of candidate.entries()) {
    const regulation = g => g.history.filter(event => /^[1-4]$/.test(event.period));
    assert.deepEqual(tidy(regulation(game)), tidy(regulation(original[i])));
  }
});
