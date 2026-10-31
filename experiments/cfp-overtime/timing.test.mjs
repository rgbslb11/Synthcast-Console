import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOvertimeTiming, transitionSeconds, beginNextPeriodBreak,
  beginTeamTimeout, beginFootballInterval, advanceOvertimeTiming,
  finishOvertimeTiming,
} from './timing.mjs';

function enterNext(s) {
  const seconds = transitionSeconds(s.period);
  beginNextPeriodBreak(s, `enter-${s.period + 1}`);
  advanceOvertimeTiming(s, seconds);
}
test('opening break contains one coin-toss cue at 9:00 and ends at 10:00', () => {
  const s = createOvertimeTiming();
  beginNextPeriodBreak(s, 'opening');
  advanceOvertimeTiming(s, 539);
  assert.equal(s.coinTossDueEmitted, false);
  advanceOvertimeTiming(s, 1);
  assert.deepEqual(s.events.at(-1), {type:'COIN_TOSS_DUE',period:0,elapsedSeconds:540});
  assert.equal(s.remainingSeconds, 60);
  advanceOvertimeTiming(s, 60);
  assert.equal(s.period, 1);
  assert.equal(s.elapsedSeconds, 600);
  assert.equal(s.events.filter(e => e.type === 'COIN_TOSS_DUE').length, 1);
});
test('break-only elapsed totals are 10, 13, 18, 20, 22 minutes through OT5', () => {
  const s = createOvertimeTiming();
  for (const expected of [600, 780, 1080, 1200, 1320]) {
    enterNext(s);
    assert.equal(s.elapsedSeconds, expected);
  }
});
test('unused timeouts do not accumulate in OT2 or OT3', () => {
  const s = createOvertimeTiming();
  for (let i = 0; i < 5; i++) {enterNext(s);assert.deepEqual(s.timeouts, [1,1]);}
});
test('spent OT1 and OT2 allowances reset; spent OT3 allowance never resets', () => {
  const s = createOvertimeTiming();
  for (let period = 1; period <= 3; period++) {
    enterNext(s);
    for (const team of [0,1]) {
      beginTeamTimeout(s, team, `to-${period}-${team}`);
      advanceOvertimeTiming(s, 90);
    }
    assert.deepEqual(s.timeouts, [0,0]);
  }
  for (let period = 4; period <= 12; period++) {
    enterNext(s);
    assert.deepEqual(s.timeouts, [0,0]);
    assert.throws(() => beginTeamTimeout(s, 0, `to-${period}`), /No overtime timeout/);
  }
});
test('shared OT3+ allowance can be used in different later periods by each team', () => {
  const s = createOvertimeTiming();
  for (let i = 0; i < 3; i++) enterNext(s);
  beginTeamTimeout(s, 0, 'away-ot3');advanceOvertimeTiming(s,90);
  enterNext(s);enterNext(s);
  assert.deepEqual(s.timeouts,[0,1]);
  beginTeamTimeout(s, 1, 'home-ot5');advanceOvertimeTiming(s,90);
  assert.deepEqual(s.timeouts,[0,0]);
});
test('timer cannot resolve a supplied play before its duration has elapsed', () => {
  const s=createOvertimeTiming();enterNext(s);
  beginFootballInterval(s,'PLAY',7,'play-1');
  advanceOvertimeTiming(s,6);assert.equal(s.phase,'PLAY');
  const result=advanceOvertimeTiming(s,50);
  assert.deepEqual(result,{consumedSeconds:1,remainingSeconds:49});
  assert.equal(s.elapsedSeconds,607);assert.equal(s.phase,'READY');
});
test('whole-chunk and one-second polling produce identical timing state', () => {
  const a=createOvertimeTiming(),b=createOvertimeTiming();
  for (let period=1;period<=6;period++) {
    const duration=transitionSeconds(a.period);
    for(const s of [a,b])beginNextPeriodBreak(s,`period-${period}`);
    advanceOvertimeTiming(a,duration);
    for(let i=0;i<duration;i++)advanceOvertimeTiming(b,1);
    for(const s of [a,b])beginFootballInterval(s,'PLAY',5,`play-${period}`);
    advanceOvertimeTiming(a,5);
    for(let i=0;i<5;i++)advanceOvertimeTiming(b,1);
    assert.deepEqual(a,b);
  }
});
test('pause/delay/edit adds elapsed time while preserving the active interval', () => {
  for (const kind of ['PERIOD_BREAK','TEAM_TIMEOUT','PLAY']) {
    const s=createOvertimeTiming();
    if(kind==='PERIOD_BREAK')beginNextPeriodBreak(s,'opening');
    else {enterNext(s);if(kind==='PLAY')beginFootballInterval(s,'PLAY',6,'p');else beginTeamTimeout(s,0,'t');}
    const before=structuredClone(s);
    advanceOvertimeTiming(s,42,{frozen:true});
    assert.deepEqual({...s,elapsedSeconds:before.elapsedSeconds},before);
    assert.equal(s.elapsedSeconds,before.elapsedSeconds+42);
  }
});
test('serialized checkpoint resumes to exactly the same result', () => {
  const a=createOvertimeTiming();beginNextPeriodBreak(a,'opening');advanceOvertimeTiming(a,542);
  const b=JSON.parse(JSON.stringify(a));
  advanceOvertimeTiming(a,58);advanceOvertimeTiming(b,58);
  assert.deepEqual(a,b);
});
test('timeout cannot overlap a break or play or exceed its allowance', () => {
  const s=createOvertimeTiming();beginNextPeriodBreak(s,'opening');
  assert.throws(()=>beginTeamTimeout(s,0,'bad'));
  advanceOvertimeTiming(s,600);
  beginFootballInterval(s,'PLAY',6,'p');assert.throws(()=>beginTeamTimeout(s,0,'bad'));
  advanceOvertimeTiming(s,6);beginTeamTimeout(s,0,'t');
  assert.throws(()=>beginTeamTimeout(s,1,'bad'));
  advanceOvertimeTiming(s,90);
  assert.throws(()=>beginTeamTimeout(s,0,'second'));
  assert.deepEqual(s.timeouts,[0,1]);
});
test('duplicate event is rejected without spending another timeout', () => {
  const s=createOvertimeTiming();enterNext(s);
  beginTeamTimeout(s,0,'t');advanceOvertimeTiming(s,90);enterNext(s);
  const before=structuredClone(s);
  assert.throws(()=>beginTeamTimeout(s,0,'t'),/already completed/);
  assert.deepEqual(s,before);
});
test('final stops elapsed time and does not schedule a transition', () => {
  const s=createOvertimeTiming();enterNext(s);finishOvertimeTiming(s);
  const before=structuredClone(s);
  assert.deepEqual(advanceOvertimeTiming(s,900),{consumedSeconds:0,remainingSeconds:900});
  assert.deepEqual(s,before);assert.throws(()=>beginNextPeriodBreak(s,'extra'));
});
test('invalid elapsed time and premature intervals are rejected', () => {
  const s=createOvertimeTiming();
  for(const n of [-1,NaN,Infinity,0.5])assert.throws(()=>advanceOvertimeTiming(s,n));
  assert.throws(()=>beginFootballInterval(s,'PLAY',4,'p'));
  assert.throws(()=>finishOvertimeTiming(s));
});
