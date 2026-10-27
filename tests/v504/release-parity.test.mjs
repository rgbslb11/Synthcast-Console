import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as oldEngine from '../../release-assets/v5.0.3-week9/backend/runtime/engine.mjs';
import * as engine from '../../release-assets/v5.0.4-week10/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.4-week10/backend/runtime/week10.mjs';
import {TEAM_POWER} from '../../release-assets/v5.0.4-week10/backend/runtime/power.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.4-week10/backend/src/engine-operations.mjs';
const old='release-assets/v5.0.3-week9/',fresh='release-assets/v5.0.4-week10/';
const read=f=>fs.readFileSync(f,'utf8');
test('Football engine changes only the four release constants and slate import; approved ratings cover every team',()=>{
 const normalize=s=>s.replace(/const (ENGINE_VERSION|DATA_VERSION|WEEK_KEY|CONSOLE_URL) = .*;/g,'const $1 = RELEASE_IDENTITY;').replaceAll('./week9.mjs','./week10.mjs');
 assert.equal(normalize(read(old+'backend/runtime/engine.mjs')),normalize(read(fresh+'backend/runtime/engine.mjs')));
 for(const f of ['backend/src/weather.mjs','backend/src/deadman.mjs'])assert.equal(read(old+f),read(fresh+f),f);
 assert.equal(Object.keys(TEAM_POWER).length,121);
 for(const g of slate){assert(TEAM_POWER[g.away],g.away);assert(TEAM_POWER[g.home],g.home);}
});
test('All 363 final approved ratings compile exactly; 18 Chairman overrides and 103 untouched base triples survive',()=>{
 const parse=file=>read(fresh+file).trim().split(/\r?\n/).slice(1).map(l=>l.split(','));
 const approved=parse('approved-ratings.csv'),base=new Map(parse('option2-base-ratings.csv').map(([id,...v])=>[id,v.map(Number)]));
 const ids=JSON.parse(read(fresh+'team-identities.json')),audit=JSON.parse(read(fresh+'chairman-rating-overrides.json'));
 const overrides=new Map(audit.audit.map(a=>[a.id,a.after]));assert.equal(overrides.size,18);
 assert.equal(approved.length,121);assert.equal(new Set(approved.map(r=>r[0])).size,121);
 assert.equal(read(fresh+'approved-ratings.csv'),read(fresh+'ratings.csv'));
 let unchanged=0,nonCentered=0;
 for(const [id,...raw] of approved){const values=raw.map(Number),p=TEAM_POWER[ids[id]];
  assert.deepEqual([p.overall,p.offense,p.defense],values,id);assert(values.every(v=>Number.isInteger(v)&&v>=60&&v<=99));
  if(overrides.has(id))assert.deepEqual(values,overrides.get(id),id);else{assert.deepEqual(values,base.get(id),id);unchanged++;}
  if(values[1]+values[2]!==2*values[0])nonCentered++;
 }
 assert.equal(unchanged,103);assert.equal(nonCentered,9);
 for(const [team,values] of [['North Dakota State',[82,80,89]],['Georgia State',[72,73,74]],['Florida',[95,96,95]],['UTSA',[85,86,84]],['Nevada',[77,72,74]]]){
  const p=TEAM_POWER[team];assert.deepEqual([p.overall,p.offense,p.defense],values,team);
 }
 const sql=read(fresh+'week10-schema.sql'),m=JSON.parse(read(fresh+'input-manifest.json'));assert(sql.includes("'"+m.dataVersion+"'"));
});
test('All 56 carriage rows exactly retain Chairman date, kickoff, network, matchup and notes',()=>{
 const rows=read(fresh+'chairman-carriage.tsv').trim().split('\n').map(l=>l.split('\t'));
 assert.equal(rows.length,56);assert.equal(slate.length,56);
 for(const [i,r] of rows.entries())assert.deepEqual([slate[i].dateLabel,slate[i].kickoff,slate[i].network,slate[i].displayMatchup,slate[i].notes],[...r.slice(0,4),r[4]==='—'?'':r[4]]);
 const canonical=JSON.parse(read(fresh+'canonical-week10.json'));
 for(const s of slate){const c=canonical.find(g=>g.id===s.id);assert(c);for(const k of ['away','home','awayCode','homeCode','neutral','conferenceGame','venueId'])assert.equal(s[k],c[k],s.id+' '+k);assert.equal(s.kickoffTimeZone,'America/New_York');const local=new Date(s.kickoffZulu).toLocaleDateString('en-CA',{timeZone:'America/New_York'});assert.equal(local,s.date);}
 assert.equal(new Set(slate.flatMap(g=>[g.away,g.home])).size,112);
 assert.equal(slate.filter(g=>g.conferenceGame).length,47);assert.equal(slate.filter(g=>!g.conferenceGame).length,9);
 assert.deepEqual(slate.filter(g=>g.neutral).map(g=>g.id),['G0455','G0473']);
 assert.equal(slate.at(-1).kickoffZulu,'2026-11-01T03:59:00Z');
 assert.deepEqual(Object.fromEntries([...new Set(slate.map(g=>g.date))].map(d=>[d,slate.filter(g=>g.date===d).length])),{'2026-10-27':1,'2026-10-28':2,'2026-10-29':2,'2026-10-30':3,'2026-10-31':48});
});
test('Latest OT editor, final OT labels and all styling are retained',()=>{
 const block=(s,a,b)=>{assert(s.includes(a));return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));};
 const a=read('public/v5.0.3/w9/app.js'),b=read('public/v5.0.4/w10/app.js');
 for(const [start,end] of [['const FINISHED_OT_EDIT_ORIGINS=','function periods(g)'],['function finalOtStatus(g)','function line(g)'],['function saveEdit(id,resumeAuto){','function openGame(id){']])assert.equal(block(a,start,end),block(b,start,end));
 for(const f of ['legacy/app.css','deadman.css','confirmation.css','ui1.3/scoreboard.css'])assert.equal(read('public/v5.0.3/w9/'+f),read('public/v5.0.4/w10/'+f));
});
test('Database create and commit guards use all 56 canonical identities and append API schemas',()=>{
 const sql=read(fresh+'week10-schema.sql');
 const arrays=[...sql.matchAll(/<> array\[(.*?)\]::text\[\] then/g)];assert.equal(arrays.length,2);
 for(const a of arrays)assert.deepEqual(a[1].replaceAll("'",'').split(','),slate.map(g=>g.id));
 assert(sql.includes('do $$'));assert(sql.includes('end $$;'));
 assert(sql.includes("schemas || ', gamecast_v504_w10'"));
 assert(sql.includes('insert into gamecast_v504_w10.operators select * from gamecast_v503_w9.operators;'));
 assert(sql.includes('values (true,false)'));assert(sql.includes('jsonb_array_length(state) = 56'));
 assert(!sql.includes('G0406'));assert(!sql.includes('gamecast_v504_w10, gamecast_v504_w10'));
});
test('Prior and candidate engines produce identical full-game football history on the same 56 inputs and seeds',async()=>{
 const stable=g=>JSON.parse(JSON.stringify(g,(k,v)=>['masterZulu','createdRunAt','launchedAt','completedAt','lockedAtZulu','snapshotId','speed'].includes(k)?undefined:v));
 const ops=createEngineOperations({engine,clock:()=>'2026-10-26T00:00:00Z'});
 for(const s of slate){const g=engine.initialGame(s);g.seedHex='0123456789abcdef0123456789abcdef';g.rngState=engine.seedWords(g.seedHex,g.id);await ops.executeCommand({state:[g]},{id:g.id,command:'launch'});g.auto=true;g.speed=50;
  const a=oldEngine.project([structuredClone(g)],1000)[0],b=engine.project([structuredClone(g)],1000)[0];assert(oldEngine.FINALISH.has(a.lifecycle),s.id+' final');assert.deepEqual(stable(a),stable(b),s.id);}
});
