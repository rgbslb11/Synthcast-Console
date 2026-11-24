import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../../release-assets/v5.0.9/backend/runtime/engine.mjs';
import * as regular from '../../release-assets/week14/backend/runtime/engine.mjs';
import { OPERATING_SLATE } from '../../release-assets/week14/backend/runtime/week14.mjs';
import { POSTSEASON_GAME_TIMING, NORMAL_GAME_TIMING } from '../../release-assets/v5.0.9/backend/runtime/game-timing.mjs';

const match = OPERATING_SLATE[0];
const volatile = new Set(['masterZulu', 'completedAt', 'createdRunAt', 'timingProfile', 'speed', 'engineVersion']);
const stable = value => JSON.parse(JSON.stringify(value, (k, v) => volatile.has(k) ? undefined : v));
function start(runtime = engine, gameType = 'CONFERENCE_CHAMPIONSHIP', seed = 0, game = match) {
  const g = runtime.initialGame({ ...game, gameType });
  g.seedHex = seed.toString(16).padStart(32, '0');
  g.rngState = runtime.seedWords(g.seedHex, g.id);
  runtime.ensureOpeningToss(g);
  return Object.assign(g, { lifecycle: 'ACTIVE', auto: true, qaOnly: true });
}

function play(g, options = {}) {
  g.pendingPlay = { phase: 'PLAY', team: g.possession, strategy: 'NORMAL', clockBefore: g.scoreboardSeconds,
    edgeAtSnap: 0, yards: 1, points: 0, inBounds: true, remaining: 2, ...options };
  engine.advanceGame(g, 2);
}
const commercials = g => g.history.filter(event => event.ruling === 'COMMERCIAL_TIMEOUT');

test('profile is derived from game classification and survives restart', () => {
  for (const type of ['CONFERENCE_CHAMPIONSHIP', 'BOWL', 'PLAYOFF', 'REGULAR_SEASON', undefined]) {
    const approved = ['CONFERENCE_CHAMPIONSHIP', 'BOWL', 'PLAYOFF'].includes(type);
    const g = engine.initialGame({ ...match, gameType: type, timingProfile: 'caller-supplied' });
    assert.equal(g.timingProfile, approved ? POSTSEASON_GAME_TIMING : NORMAL_GAME_TIMING);
    engine.reset(g, false);
    assert.equal(g.timingProfile, approved ? POSTSEASON_GAME_TIMING : NORMAL_GAME_TIMING);
  }
});

test('a crossed threshold cannot interrupt a drive and the next possession change can trigger a break', () => {
  const g = start();
  g.scoreboardSeconds = 541;
  play(g);
  assert.equal(g.scoreboardSeconds, 539);
  assert.equal(g.breakSeconds, 0);
  engine.advanceGame(g, g.pendingPlay.remaining);
  play(g, { turnover: true });
  const state = [g.possession, g.down, g.distance, g.fieldPos, g.scoreboardSeconds, g.quarter];
  assert.equal(g.breakSeconds, 180);
  assert.equal(commercials(g)[0].reason, 'CHANGE_OF_POSSESSION');
  const oldGL = g.glSeconds;
  engine.advanceGame(g, 180);
  assert.deepEqual([g.possession, g.down, g.distance, g.fieldPos, g.scoreboardSeconds, g.quarter], state);
  assert.equal(g.glSeconds - oldGL, 180);
});

test('charged timeout has 90 seconds before the queued commercial, without scoreboard runoff', () => {
  const g = start();
  Object.assign(g, { quarter: 4, period: '4th', activePeriod: '4', scoreboardSeconds: 179 });
  g.scores['4'][g.possession] = 7;
  const defense = 1 - g.possession;
  play(g);
  const elapsed = g.glSeconds;
  assert.equal(g.pendingPlay.remaining, 90);
  assert.equal(g.breakSeconds, 0);
  assert.equal(g.history.at(-1).team, defense);
  assert.equal(g.history.at(-1).ruling, 'TEAM_TIMEOUT');
  assert.equal(defense ? g.homeTimeouts : g.awayTimeouts, 2);
  const saved = structuredClone(g);
  g.operatorPaused = true;
  engine.advanceGame(g, 12);
  assert.deepEqual(g.pendingPlay, saved.pendingPlay);
  g.operatorPaused = false;
  engine.advanceGame(g, 89);
  assert.equal(g.breakSeconds, 0);
  engine.advanceGame(g, 1);
  assert.equal(g.breakSeconds, 180);
  assert.equal(g.glSeconds - elapsed, 102);
  assert.equal(g.scoreboardSeconds, 177);
});

test('the official two-minute stoppage consumes exactly one Q2 or Q4 slot', () => {
  for (const quarter of [2, 4]) {
    const g = start();
    Object.assign(g, { quarter, activePeriod: String(quarter), scoreboardSeconds: 125 });
    play(g);
    engine.advanceGame(g, 3);
    assert.equal(g.scoreboardSeconds, 120);
    assert.equal(g.breakSeconds, 180);
    assert.equal(commercials(g)[0].reason, 'TWO_MINUTE_TIMEOUT');
    engine.advanceGame(g, 180);
    assert.equal(g.scoreboardSeconds, 120);
    assert.equal(commercials(g).length, 1);
  }
});

test('adjudicated replay, review and injury qualify at dead balls, without forcing repeat commercials', () => {
  for (const reason of ['REPLAY', 'OFFICIAL_REVIEW', 'INJURY']) {
    const g = start();
    g.scoreboardSeconds = 520;
    assert.equal(engine.registerOfficiatingStoppage(g, 'ORDINARY_DEAD_BALL'), false);
    g.pendingPlay = { phase: 'PLAY' };
    assert.equal(engine.registerOfficiatingStoppage(g, reason), false);
    g.pendingPlay = null;
    assert.equal(engine.registerOfficiatingStoppage(g, reason), true);
    assert.equal(engine.registerOfficiatingStoppage(g, reason), false);
    assert.equal(commercials(g)[0].reason, reason);
  }
});

test('end of quarter drops unused slots and halftime advances only Game Length for 27:30', () => {
  const g = start();
  Object.assign(g, { quarter: 2, activePeriod: '2', scoreboardSeconds: 1 });
  play(g, { turnover: true });
  assert.equal(commercials(g).length, 0);
  assert.equal(g.breakSeconds, 1650);
  engine.advanceGame(g, 1649);
  assert.equal(g.quarter, 2);
  assert.equal(g.scoreboardSeconds, 0);
  engine.advanceGame(g, 1);
  assert.equal(g.quarter, 3);
  assert.equal(g.scoreboardSeconds, 600);
  assert.equal(g.glSeconds, 1652);
});

test('a postseason overtime team timeout lasts 90 seconds, with no TV break', () => {
  const g = start();
  Object.assign(g, { quarter: 4, activePeriod: '4', scoreboardSeconds: 0 });
  engine.finishPeriod(g);
  engine.advanceGame(g, g.breakSeconds);
  assert.equal(engine.callOvertimeTimeout(g, 0), true);
  assert.equal(engine.callOvertimeTimeout(g, 0), false);
  assert.equal(g.pendingPlay.remaining, 90);
  assert.equal(g.scoreboardSeconds, 0);
  assert.equal(commercials(g).length, 0);
});

test('regulation profile matches Week 14 and postseason is invariant across chunks and speeds', () => {
  for (let i = 0; i < OPERATING_SLATE.length; i++) {
    const m = OPERATING_SLATE[i];
    assert.deepEqual(stable(engine.project([start(engine, 'REGULAR_SEASON', i, m)], 20000)),
      stable(regular.project([start(regular, 'REGULAR_SEASON', i, m)], 20000)));
    const g = start(engine, 'CONFERENCE_CHAMPIONSHIP', i, m);
    const expected = engine.project([g], 20000)[0];
    for (const speed of [4, 10, 20, 50]) {
      assert.deepEqual(stable(engine.project([{ ...g, speed }], 20000 / speed)[0]), stable(expected));
    }
    let fragmented = structuredClone(g);
    for (let left = 20000; left > 0; left -= 37) {
      engine.advanceGame(fragmented, Math.min(37, left));
      fragmented = JSON.parse(JSON.stringify(fragmented));
    }
    assert.deepEqual(stable(fragmented), stable(expected));
    for (const [period, slots] of Object.entries({1:4, 2:4, 3:4, 4:5})) {
      const occurrences = commercials(expected).filter(e => e.period === period);
      assert.ok(occurrences.length <= slots);
      assert.equal(new Set(occurrences.map(e => e.slot)).size, occurrences.length);
    }
    assert.equal(expected.teamTopSeconds[0] + expected.teamTopSeconds[1], 2400);
  }
});

test('all 17 slots can be used with enough eligible stoppages, including 15-minute quarters', () => {
  for (const quarterLengthSeconds of [600, 900]) {
    for (const [quarter, cap] of [[1,4], [2,4], [3,4], [4,5]]) {
      const g = start();
      Object.assign(g, { quarter, activePeriod: String(quarter), quarterLengthSeconds, scoreboardSeconds: 125 });
      const hasOfficialTimeout = quarter === 2 || quarter === 4;
      for (let i = 0; i < cap - Number(hasOfficialTimeout); i++) {
        assert.equal(engine.registerOfficiatingStoppage(g, 'OFFICIAL_REVIEW'), true);
        engine.advanceGame(g, 180);
      }
      assert.equal(engine.registerOfficiatingStoppage(g, 'OFFICIAL_REVIEW'), false);
      if (hasOfficialTimeout) {
        play(g);
        engine.advanceGame(g, 3);
        assert.equal(g.breakSeconds, 180);
      }
      assert.equal(commercials(g).length, cap);
    }
  }
});
