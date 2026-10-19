import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TEAM_POWER} from '../../release-assets/v5.0.3-week9/backend/runtime/power.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.3-week9/backend/runtime/week9.mjs';
const baseline='release-assets/v5.0.2-week8/backend/';
const candidate='release-assets/v5.0.3-week9/backend/';
test('5.0.3 football code is exactly 5.0.2 after the four release constants and slate import',()=>{
 const normalize=s=>s.replace(/const (ENGINE_VERSION|DATA_VERSION|WEEK_KEY|CONSOLE_URL) = .*;/g,'const $1 = RELEASE_IDENTITY;').replaceAll('./week8.mjs','./week9.mjs');
 assert.equal(normalize(fs.readFileSync(candidate+'runtime/engine.mjs','utf8')),normalize(fs.readFileSync(baseline+'runtime/engine.mjs','utf8')));
 for(const f of ['src/weather.mjs','src/deadman.mjs'])assert.equal(fs.readFileSync(candidate+f,'utf8'),fs.readFileSync(baseline+f,'utf8'));
});
test('all 121 approved rating triples and exact Week 9 dates survive compilation',()=>{
 const raw=fs.readFileSync('release-assets/v5.0.3-week9/ratings.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>l.split(','));
 assert.equal(raw.length,121);
 assert.deepEqual(Object.values(TEAM_POWER).map(x=>[x.overall,x.offense,x.defense]),raw.map(r=>r.slice(1).map(Number)));
 assert.deepEqual(Object.fromEntries([...new Set(OPERATING_SLATE.map(g=>g.date))].map(d=>[d,OPERATING_SLATE.filter(g=>g.date===d).length])),{'2026-10-20':2,'2026-10-21':2,'2026-10-22':2,'2026-10-23':3,'2026-10-24':43});
 assert.equal(new Set(OPERATING_SLATE.flatMap(g=>[g.awayCode,g.homeCode])).size,104);
 for(const g of OPERATING_SLATE){assert(TEAM_POWER[g.away]);assert(TEAM_POWER[g.home]);assert.equal(g.kickoffTimeZone,'America/New_York');assert.equal(g.neutral,false);}
});
test('latest OT editor and status functions are retained byte for byte',()=>{
 const block=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
 const old=fs.readFileSync('public/v5.0.2/w8/app.js','utf8'),fresh=fs.readFileSync('public/v5.0.3/w9/app.js','utf8');
 for(const [a,b] of [['const FINISHED_OT_EDIT_ORIGINS=','function periods(g)'],['function finalOtStatus(g)','function line(g)'],['function saveEdit(id,resumeAuto){','function openGame(id){']]){assert(old.includes(a));assert.equal(block(old,a,b),block(fresh,a,b));}
 const compactOld=fs.readFileSync('public/v5.0.2/w8/ui1.3/scoreboard.js','utf8'),compactNew=fs.readFileSync('public/v5.0.3/w9/ui1.3/scoreboard.js','utf8');
 assert.equal(block(compactOld,'  const otFinalLabel=g=>','  const stateClass='),block(compactNew,'  const otFinalLabel=g=>','  const stateClass='));
});
