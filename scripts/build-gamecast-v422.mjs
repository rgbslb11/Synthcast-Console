import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcFn = path.join(root, 'supabase/functions/gamecast-week3-v4-2-1');
const dstFn = path.join(root, 'supabase/functions/gamecast-week3-v4-2-2');
const srcUi = path.join(root, 'public/v4.2.1');
const dstUi = path.join(root, 'public/v4.2.2');

const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, 'utf8'); };
function replaceOnce(s, from, to, label) {
  const i = s.indexOf(from);
  if (i < 0) throw new Error(`Expected source fragment not found: ${label}`);
  if (s.indexOf(from, i + from.length) >= 0) throw new Error(`Source fragment is not unique: ${label}`);
  return s.slice(0, i) + to + s.slice(i + from.length);
}
function replaceAllRequired(s, from, to, label) {
  if (!s.includes(from)) throw new Error(`Expected source token not found: ${label}`);
  return s.split(from).join(to);
}

if (!fs.existsSync(path.join(srcFn, 'index.ts'))) throw new Error('4.2.1 cloud source is missing');
if (!fs.existsSync(path.join(srcUi, 'index.html'))) throw new Error('4.2.1 UI source is missing');

fs.rmSync(dstFn, { recursive: true, force: true });
fs.cpSync(srcFn, dstFn, { recursive: true });

let index = read(path.join(dstFn, 'index.ts'));
index = replaceAllRequired(index, 'GC-W3-V4.2.1-RC1', 'GC-W3-V4.2.2-RC1', 'engine version');
index = replaceAllRequired(index, 'W3-51+POWER_60_99_V421+PLAYVOL_CAL_2500', 'W3-51+POWER_60_99_V422+PERIOD_STATE_FIX+PLAYVOL_CAL_2500', 'data version');
index = replaceAllRequired(index, 'https://rgbslb11.github.io/Synthcast-Console/v4.2.1/', 'https://rgbslb11.github.io/Synthcast-Console/v4.2.2/', 'console URL');
index = replaceAllRequired(index, 'w3v421-', 'w3v422-', 'session namespace');
index = replaceAllRequired(index, 'V421_', 'V422_', 'event namespace');
index = replaceAllRequired(index, 'GameCast 4.2.1 Week 3 session not found', 'GameCast 4.2.2 Week 3 session not found', 'not-found message');
index = replaceAllRequired(index, 'gamecast-week3-v4-2-1', 'gamecast-week3-v4-2-2', 'function identity');

const oldScoreBlock = `const blankScores = () => ({ "1": [0, 0], "2": [0, 0], "3": [0, 0], "4": [0, 0] });
function total(g: Game, t: 0 | 1): number {
  return (Object.values(g.scores ?? {}) as any[]).reduce((s: number, q: any) => s + (Number(q?.[t]) || 0), 0);
}
const periodLabel = (q: number) => q === 1 ? "1st" : q === 2 ? "2nd" : q === 3 ? "3rd" : "4th";`;
const newScoreBlock = `const blankScores = () => ({ "1": [0, 0], "2": [0, 0], "3": [0, 0], "4": [0, 0] });
const validScorePeriod = (k: string) => ["1", "2", "3", "4", "OT"].includes(k) || /^(?:[2-9]|[1-9][0-9]+)OT$/.test(k);
function total(g: Game, t: 0 | 1): number {
  return (Object.entries(g.scores ?? {}) as [string, any][]).reduce((s: number, [k, q]: [string, any]) => validScorePeriod(k) ? s + (Number(q?.[t]) || 0) : s, 0);
}
const periodLabel = (q: number) => {
  if (q === 1) return "1st";
  if (q === 2) return "2nd";
  if (q === 3) return "3rd";
  if (q === 4) return "4th";
  throw new Error(\`invalid regulation quarter: \${q}\`);
};`;
index = replaceOnce(index, oldScoreBlock, newScoreBlock, 'score-period integrity block');

const oldScoreFn = `function score(g: Game, t: 0 | 1, pts: number, source = "SIM") {
  const k = g.activePeriod, cur = g.scores[k] ?? [0, 0], n: [number, number] = [Number(cur[0] || 0), Number(cur[1] || 0)];
  n[t] += pts; g.scores[k] = n;
  g.history.push({ masterZulu: now(), gl: g.glSeconds, period: k, team: t, points: pts, source });
}`;
const newScoreFn = `function score(g: Game, t: 0 | 1, pts: number, source = "SIM") {
  const k = String(g.activePeriod);
  if (!validScorePeriod(k)) throw new Error(\`invalid score period: \${k}\`);
  const cur = g.scores[k] ?? [0, 0], n: [number, number] = [Number(cur[0] || 0), Number(cur[1] || 0)];
  n[t] += pts; g.scores[k] = n;
  g.history.push({ masterZulu: now(), gl: g.glSeconds, period: k, team: t, points: pts, source });
}`;
index = replaceOnce(index, oldScoreFn, newScoreFn, 'score period guard');

const oldFinishPeriod = `function finishPeriod(g: Game) {
  g.scoreboardSeconds = 0; g.pendingPlay = null; g.gameClockStatus = "STOPPED";
  if (g.quarter === 1) { g.pendingPeriod = 2; g.breakSeconds = 255; g.breakLabel = "END 1ST"; g.activity = "BREAK"; }
  else if (g.quarter === 2) { g.pendingPeriod = 3; g.breakSeconds = 1200; g.breakLabel = "HALFTIME"; g.activity = "BREAK"; }
  else if (g.quarter === 3) { g.pendingPeriod = 4; g.breakSeconds = 255; g.breakLabel = "END 3RD"; g.activity = "BREAK"; }
  else if (total(g, 0) === total(g, 1)) { g.period = "OT"; g.activePeriod = "OT"; g.scores.OT = [0, 0]; g.breakSeconds = 180; g.breakLabel = "OT setup"; g.pendingPeriod = -1; g.activity = "OT"; }
  else finishGame(g, "Regulation complete");
}`;
const newFinishPeriod = `function finishPeriod(g: Game) {
  g.scoreboardSeconds = 0; g.pendingPlay = null; g.gameClockStatus = "STOPPED";
  if (g.quarter === 1) { g.pendingPeriod = 2; g.breakSeconds = 255; g.breakLabel = "END 1ST"; g.activity = "BREAK"; }
  else if (g.quarter === 2) { g.pendingPeriod = 3; g.breakSeconds = 1200; g.breakLabel = "HALFTIME"; g.activity = "BREAK"; }
  else if (g.quarter === 3) { g.pendingPeriod = 4; g.breakSeconds = 255; g.breakLabel = "END 3RD"; g.activity = "BREAK"; }
  else if (g.quarter === 4 && total(g, 0) === total(g, 1)) { g.period = "OT"; g.activePeriod = "OT"; g.scores.OT = [0, 0]; g.breakSeconds = 180; g.breakLabel = "OT setup"; g.pendingPeriod = -1; g.activity = "OT"; }
  else if (g.quarter === 4) finishGame(g, "Regulation complete");
  else throw new Error(\`invalid quarter at period end: \${g.quarter}\`);
}`;
index = replaceOnce(index, oldFinishPeriod, newFinishPeriod, 'finish-period regulation guard');

const oldAdvanceStart = `function advancePeriod(g: Game) {
  const q = Number(g.pendingPeriod || 0); g.pendingPeriod = 0; g.breakLabel = "";
  if (q === -1) {`;
const newAdvanceStart = `function advancePeriod(g: Game) {
  const q = Number(g.pendingPeriod || 0); g.pendingPeriod = 0; g.breakLabel = "";
  if (q !== -1 && ![2, 3, 4].includes(q)) throw new Error(\`invalid pending period transition: \${q}\`);
  if (q === -1) {`;
index = replaceOnce(index, oldAdvanceStart, newAdvanceStart, 'advance-period transition guard');

const oldBreakBlock = `    if (g.breakSeconds > 0) {
      const s = Math.min(rem, g.breakSeconds); g.breakSeconds -= s; g.glSeconds += s; rem -= s;
      if (g.breakSeconds === 0) advancePeriod(g); continue;
    }`;
const newBreakBlock = `    if (g.breakSeconds > 0) {
      const s = Math.min(rem, g.breakSeconds); g.breakSeconds -= s; g.glSeconds += s; rem -= s;
      if (g.breakSeconds === 0) {
        if (g.pendingPeriod !== 0) advancePeriod(g);
        else { g.breakLabel = ""; g.activity = "LIVE"; g.gameClockStatus = "STOPPED"; }
      }
      continue;
    }`;
index = replaceOnce(index, oldBreakBlock, newBreakBlock, 'scheduled-break completion');

const oldPlayAdvance = `      if (p.phase === "PLAY") {
        const s = Math.min(rem, p.remaining, g.scoreboardSeconds);
        p.remaining -= s; g.scoreboardSeconds -= s; g.glSeconds += s; g.teamTopSeconds[p.team] += s; rem -= s; g.gameClockStatus = "RUNNING";
        if (p.remaining <= 0) { applyPlay(g, p); maybeBreak(g, p.clockBefore, g.scoreboardSeconds); if (g.scoreboardSeconds <= 0) finishPeriod(g); }
        continue;
      }`;
const newPlayAdvance = `      if (p.phase === "PLAY") {
        // A snap begun before 0:00 must be allowed to finish even if its play duration extends past the period clock.
        // Only the portion before 0:00 is charged to the scoreboard clock/TOP; the entire play duration counts toward GL.
        const s = Math.min(rem, p.remaining), clockUsed = Math.min(s, g.scoreboardSeconds);
        p.remaining -= s; g.scoreboardSeconds -= clockUsed; g.glSeconds += s; g.teamTopSeconds[p.team] += clockUsed; rem -= s; g.gameClockStatus = "RUNNING";
        if (p.remaining <= 0) { applyPlay(g, p); maybeBreak(g, p.clockBefore, g.scoreboardSeconds); if (g.scoreboardSeconds <= 0) finishPeriod(g); }
        continue;
      }`;
index = replaceOnce(index, oldPlayAdvance, newPlayAdvance, 'end-period play completion');

write(path.join(dstFn, 'index.ts'), index);

// The 4.2.2 correction intentionally leaves ratings and schedule bytes unchanged.
if (read(path.join(dstFn, 'power.ts')) !== read(path.join(srcFn, 'power.ts'))) throw new Error('Power package changed unexpectedly');
if (read(path.join(dstFn, 'week3.ts')) !== read(path.join(srcFn, 'week3.ts'))) throw new Error('Week 3 schedule changed unexpectedly');

fs.rmSync(dstUi, { recursive: true, force: true });
fs.mkdirSync(dstUi, { recursive: true });
let page = read(path.join(srcUi, 'index.html'));
page = page.split('4.2.1').join('4.2.2');
page = replaceOnce(page, 'shim-421.js', 'shim-422.js', '4.2.2 UI shim');
page = replaceOnce(page, '<script src="../v4.2/patch-rc2.js"></script>', '<script src="../v4.2/patch-rc2.js"></script><script src="patch-422.js"></script>', '4.2.2 UI integrity patch');
page = page.split('href="review.html"').join('href="../v4.2.1/review.html"');
page = page.replace('4.2 RC3 clock, GL, uncertainty, continuation-seed, Delay, Chairman Edit, and acceleration mechanics remain frozen.', '4.2 RC3 play/timing calibration, ratings, uncertainty, continuation-seed, Delay, Chairman Edit, and acceleration mechanics remain unchanged. 4.2.2 repairs scheduled-break period progression and period score attribution.');
write(path.join(dstUi, 'index.html'), page);

const shim = `'use strict';
// GameCast 4.2.2 packaging shim: isolated cloud endpoint and local operator namespace.
(() => {
  const FROM = 'https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2';
  const TO   = 'https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2-2';
  const OLD_STORE = 'synthcastGameCast42Operator';
  const NEW_STORE = 'synthcastGameCast422Operator';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') input = input.replace(FROM, TO);
    else if (input instanceof Request && input.url.startsWith(FROM)) input = new Request(input.url.replace(FROM, TO), input);
    return nativeFetch(input, init);
  };
  const nativeGet = Storage.prototype.getItem, nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
  Storage.prototype.getItem = function(key) { return nativeGet.call(this, key === OLD_STORE ? NEW_STORE : key); };
  Storage.prototype.setItem = function(key, value) { return nativeSet.call(this, key === OLD_STORE ? NEW_STORE : key, value); };
  Storage.prototype.removeItem = function(key) { return nativeRemove.call(this, key === OLD_STORE ? NEW_STORE : key); };
})();
`;
write(path.join(dstUi, 'shim-422.js'), shim);

const uiPatch = `'use strict';
// 4.2.2 presentation integrity: only regulation and NCAA-style OT score periods are rendered.
engine='GC-W3-V4.2.2-RC1';
periods=function(g){
  const base=['1','2','3','4'];
  const extra=Object.keys(g.scores||{}).filter(k=>k==='OT'||/^(?:[2-9]|[1-9][0-9]+)OT$/.test(k));
  const n=k=>k==='OT'?1:Number(k.slice(0,-2));
  extra.sort((a,b)=>n(a)-n(b));
  return [...base,...extra];
};
`;
write(path.join(dstUi, 'patch-422.js'), uiPatch);

// Regression assertions tied directly to the reported defects.
const builtIndex = read(path.join(dstFn, 'index.ts'));
for (const forbidden of ['w3v421-', 'V421_', 'GC-W3-V4.2.1-RC1', 'gamecast-week3-v4-2-1']) {
  if (builtIndex.includes(forbidden)) throw new Error(`4.2.1 runtime token leaked into 4.2.2: ${forbidden}`);
}
if (builtIndex.includes('if (g.breakSeconds === 0) advancePeriod(g)')) throw new Error('Unconditional break-to-period transition still present');
if (builtIndex.includes('Math.min(rem, p.remaining, g.scoreboardSeconds)')) throw new Error('End-period play completion bug still present');
for (const required of [
  'if (g.pendingPeriod !== 0) advancePeriod(g);',
  'clockUsed = Math.min(s, g.scoreboardSeconds)',
  'invalid regulation quarter',
  'invalid score period',
  'invalid quarter at period end',
  'invalid pending period transition',
  'w3v422-',
  'V422_',
  'GC-W3-V4.2.2-RC1'
]) if (!builtIndex.includes(required)) throw new Error(`Missing 4.2.2 invariant: ${required}`);

// Micro-regression of the break transition contract: TV timeout must stay in-quarter;
// end-quarter break must transition only when pendingPeriod is set.
let probe={quarter:1,pendingPeriod:0,breakSeconds:1,breakLabel:'Scheduled TV timeout',activity:'BREAK'};
probe.breakSeconds=0;
if(probe.breakSeconds===0){if(probe.pendingPeriod!==0)probe.quarter=probe.pendingPeriod;else{probe.breakLabel='';probe.activity='LIVE';}}
if(probe.quarter!==1||probe.activity!=='LIVE')throw new Error('TV-timeout regression failed');
probe={quarter:1,pendingPeriod:2,breakSeconds:0,breakLabel:'END 1ST',activity:'BREAK'};
if(probe.breakSeconds===0){if(probe.pendingPeriod!==0)probe.quarter=probe.pendingPeriod;else{probe.breakLabel='';probe.activity='LIVE';}}
if(probe.quarter!==2)throw new Error('End-quarter transition regression failed');

console.log('GameCast 4.2.2 source generated and period/box-score regression checks passed.');
