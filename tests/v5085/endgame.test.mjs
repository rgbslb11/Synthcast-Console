import assert from 'node:assert/strict';
import test from 'node:test';
import * as baseline from '../../release-assets/v5.0.8-week13/backend/runtime/engine.mjs';
import * as candidate from '../../release-assets/v5.0.8.5-week13/backend/runtime/engine.mjs';
import { OPERATING_SLATE } from '../../release-assets/v5.0.8.5-week13/backend/runtime/week13.mjs';
import { publicGame } from '../../release-assets/v5.0.8.5-week13/backend/security/security-core.mjs';

const matchup = OPERATING_SLATE.find(game => game.id === 'G0635');

function lateGame(overrides = {}) {
  return {
    ...candidate.initialGame(matchup),
    lifecycle: 'ACTIVE', activity: 'LIVE', auto: true, qaOnly: true,
    quarter: 4, activePeriod: '4', period: '4th', scoreboardSeconds: 10,
    scores: { ...candidate.blankScores(), 4: [31, 30] },
    possession: 1, fieldPos: 70, down: 1, distance: 10,
    awayTimeouts: 0, homeTimeouts: 1,
    // A first draw near .802 distinguishes the baseline run from the capped pass.
    rngState: [3444563770, 1, 1, 1],
    ...overrides,
  };
}

function timeoutPostPlay(team = 1) {
  return {
    phase: 'POST', team, deadSec: 35, runoffSec: 0, remaining: 25,
    desc: 'Run for 36 yards in bounds', strategy: 'TWO_MINUTE',
  };
}

function expectKick(game, yards = 47) {
  assert.equal(game.pendingPlay.fg, true);
  assert.match(game.pendingPlay.desc, new RegExp('^' + yards + '-yard field goal'));
}

test('G0635 at 0:10: an existing timeout checkpoint leads directly to a 47-yard attempt', () => {
  const old = lateGame({ pendingPlay: timeoutPostPlay() });
  const upgraded = structuredClone(old);
  baseline.advanceGame(old, 26);
  candidate.advanceGame(upgraded, 26);
  assert.match(old.pendingPlay.desc, /^Run/);
  expectKick(upgraded);
  assert.equal(upgraded.pendingPlay.clockBefore, 10);
  assert.equal(upgraded.scoreboardSeconds, 9);
  assert.equal(upgraded.homeTimeouts, 1);
  assert.equal(upgraded.endgameOffensiveTimeoutTeam, undefined);
});

test('G0635 at 0:03: a legacy post-edit state selects a 47-yard attempt and resolves at 0:00', () => {
  const game = lateGame({ scoreboardSeconds: 3, homeTimeouts: 0 });
  const old = structuredClone(game);
  baseline.advanceGame(old, 5);
  assert.match(old.history.at(-1).desc, /^Run/);
  candidate.advanceGame(game, 5);
  assert.match(game.history.at(-1).desc, /^47-yard field goal/);
  assert.equal(game.history.at(-1).clock, 0);
  assert.equal(game.teamTopSeconds[1], 3);
  assert.equal(game.glSeconds, 5);
  assert.equal(game.lifecycle, 'FINAL_PENDING');
});

test('an automatic late offensive timeout is used only for the next snap and stays private', () => {
  const game = lateGame({ homeTimeouts: 2 });
  const play = { team: 1, strategy: 'TWO_MINUTE', first: true, inBounds: true };
  candidate.postTiming(game, play);
  assert.equal(play.runoffSec, 0);
  assert.equal(game.homeTimeouts, 1);
  assert.equal(game.endgameOffensiveTimeoutTeam, 1);
  assert.equal(Object.hasOwn(publicGame(game), 'endgameOffensiveTimeoutTeam'), false);
  candidate.generatePlay(game);
  expectKick(game);
  assert.equal(game.endgameOffensiveTimeoutTeam, undefined);
});

test('a same-possession edit preserves timeout priority and a possession change clears it', () => {
  const same = lateGame({ pendingPlay: timeoutPostPlay() });
  candidate.beginEdit(same, {});
  candidate.commitEdit(same, { clockSeconds: 10, resumeAuto: true }, {});
  candidate.generatePlay(same);
  expectKick(same);

  const changed = lateGame({ pendingPlay: timeoutPostPlay() });
  candidate.beginEdit(changed, {});
  candidate.commitEdit(changed, { possession: 0, resumeAuto: true }, {});
  assert.equal(changed.endgameOffensiveTimeoutTeam, undefined);
  candidate.generatePlay(changed);
  assert.equal(changed.pendingPlay.fg, false);
});

test('kick priority uses the existing range, score, clock and quarter boundaries', () => {
  const cases = [
    { clock: 1, fieldPos: 62, margin: -3, kick: true, yards: 55 },
    { clock: 3, fieldPos: 70, margin: 0, kick: true },
    { clock: 0, fieldPos: 70, margin: -1, kick: false },
    { clock: 3, fieldPos: 61, margin: -1, kick: false },
    { clock: 3, fieldPos: 70, margin: -4, kick: false },
    { clock: 3, fieldPos: 70, margin: 1, kick: false },
    { clock: 9, fieldPos: 70, margin: -1, kick: false },
    { clock: 55, fieldPos: 70, margin: -1, timeoutTeam: 1, kick: true },
    { clock: 56, fieldPos: 70, margin: -1, timeoutTeam: 1, kick: false },
    { clock: 10, fieldPos: 70, margin: -1, timeoutTeam: 0, kick: false },
    { clock: 10, fieldPos: 70, margin: -4, timeoutTeam: 1, kick: false },
    { clock: 10, fieldPos: 61, margin: -1, timeoutTeam: 1, kick: false },
    { clock: 3, fieldPos: 70, margin: -1, quarter: 2, kick: false },
    { clock: 5, fieldPos: 70, margin: -1, quarter: 2, kick: true },
    { clock: 3, fieldPos: 70, margin: -1, quarter: 3, kick: false },
  ];
  for (const { clock, fieldPos, margin, timeoutTeam, quarter = 4, kick, yards } of cases) {
    const game = lateGame({
      scoreboardSeconds: clock, fieldPos, quarter, activePeriod: String(quarter),
      scores: { ...candidate.blankScores(), [quarter]: [31, 31 + margin] },
      endgameOffensiveTimeoutTeam: timeoutTeam,
    });
    candidate.generatePlay(game);
    if (kick) expectKick(game, yards);
    else assert.equal(game.pendingPlay.fg, false, JSON.stringify({ clock, fieldPos, margin, timeoutTeam, quarter }));
  }
});

test('10% cap affects only a trailing Q4 offense with under 2:00 and at most one timeout', () => {
  for (const [clock, timeouts, margin, quarter, expected] of [
    [119, 1, -1, 4, 'PASS'],
    [119, 0, -1, 4, 'PASS'],
    [120, 1, -1, 4, 'RUN'],
    [119, 2, -1, 4, 'RUN'],
    [119, 1, 0, 4, 'RUN'],
    [119, 1, 1, 4, 'RUN'],
    [119, 1, -1, 2, 'RUN'],
  ]) {
    const game = lateGame({
      scoreboardSeconds: clock, homeTimeouts: timeouts, quarter, activePeriod: String(quarter),
      fieldPos: 40, scores: { ...candidate.blankScores(), [quarter]: [31, 31 + margin] },
      weather: { enabled: true, wind: 'STRONG', rain: 'HEAVY' },
    });
    candidate.generatePlay(game);
    assert.equal(game.pendingPlay.weatherAudit.primitive, expected, JSON.stringify({ clock, timeouts, margin, quarter }));
    if (expected === 'PASS') assert.equal(game.pendingPlay.weatherAudit.passRateAfter, 0.90);
  }
});

test('the cap still permits a run above the pass threshold for either offense', () => {
  const args = { scoreboardSeconds: 45, fieldPos: 45 };
  for (const possession of [0, 1]) {
    for (const [draw, expected] of [[.8999, 'PASS'], [.9001, 'RUN']]) {
      const game = lateGame({
        ...args, possession, homeTimeouts: 1, awayTimeouts: 1,
        scores: { ...candidate.blankScores(), 4: possession === 0 ? [23, 24] : [24, 23] },
        weather: { enabled: true, wind: 'LIGHT', rain: 'NONE' },
        rngState: [Math.floor(4294967296 * draw) - 2, 1, 1, 1],
      });
      candidate.generatePlay(game);
      assert.equal(game.pendingPlay.weatherAudit.primitive, expected);
    }
  }
});

test('finished records and accepted results remain byte-identical on projection', () => {
  const game = lateGame({
    lifecycle: 'READY', activity: 'FINAL', locked: true, auto: false,
    scoreboardSeconds: 0, history: [{ period: '4', clock: 0, desc: 'Run for 7 yards in bounds' }],
  });
  assert.deepEqual(candidate.project([game], 50)[0], game);
});
