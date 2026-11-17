import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as e from '../../release-assets/v5.0.8-week13/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.8-week13/backend/runtime/week13.mjs';
import {TEAM_POWER} from '../../release-assets/v5.0.8-week13/backend/runtime/power.mjs';
import {SESSION_RE,composeDisplayBoard} from '../../release-assets/v5.0.8-week13/backend/security/security-core.mjs';
const root='release-assets/v5.0.8-week13',prior='release-assets/v5.0.7-week12-operating';
test('exact 59 canonical IDs, 118 distinct programs, supplied carriage and all 25 ranks',()=>{
 const {rows}=JSON.parse(fs.readFileSync(root+'/canonical-week13-source.json'));
 assert.equal(slate.length,59);assert.equal(new Set(slate.flatMap(g=>[g.awayCode,g.homeCode])).size,118);
 assert.deepEqual(slate.map(g=>g.id).sort(),rows.map(g=>g.game_id).sort());
 assert.deepEqual(slate.reduce((o,g)=>(o[g.date]=(o[g.date]||0)+1,o),{}),{'2026-11-17':1,'2026-11-18':1,'2026-11-19':3,'2026-11-20':6,'2026-11-21':48});
 assert.deepEqual(slate.flatMap(g=>[g.awayRank,g.homeRank]).filter(Boolean).sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
 assert.equal(slate.find(g=>g.id==='G0676').kickoffZulu,'2026-11-21T02:00:00Z');
 assert.equal(slate.find(g=>g.id==='G0650').kickoffZulu,'2026-11-22T03:30:00Z');
 assert.equal(slate.find(g=>g.id==='G0633').kickoffZulu,'2026-11-21T19:10:00Z');
 assert.equal(slate.at(-1).kickoffZulu,'2026-11-22T04:30:00Z');
 assert.equal(slate[0].kickoffZulu,'2026-11-18T00:30:00Z');
 for(const g of slate){assert.ok(TEAM_POWER[g.away]);assert.ok(TEAM_POWER[g.home]);assert.equal(g.kickoffTimeZone,'America/New_York');}
});
test('exact approved post-W12 ratings mapped with every football byte retained',()=>{
 const csv=fs.readFileSync(root+'/ratings.csv');assert.equal(createHash('sha256').update(csv).digest('hex'),'d69662d7ac62554f770ddea65cee3646830ae4e3f28e5c72c9984b211f345ac4');
 assert.deepEqual(csv,fs.readFileSync(root+'/approved-ratings.csv'));
 const [header,...lines]=csv.toString().trim().split(/\r?\n/).map(l=>l.split(','));assert.equal(lines.length,121);assert.equal(Object.keys(TEAM_POWER).length,121);
 for(const a of lines){const r=Object.fromEntries(header.map((k,i)=>[k,a[i]])),p=TEAM_POWER[r.team];assert.ok(p,r.team);assert.deepEqual([p.overall,p.offense,p.defense],[+r.gamecast_team,+r.gamecast_offense,+r.gamecast_defense]);}

 const normalize=s=>s.replace(/const (?:ENGINE_VERSION|DATA_VERSION|WEEK_KEY|CONSOLE_URL) = "[^"]+";/g,'RELEASE_BINDING').replaceAll('week13.mjs','week12.mjs');
 assert.equal(normalize(fs.readFileSync(root+'/backend/runtime/engine.mjs','utf8')),normalize(fs.readFileSync(prior+'/backend/runtime/engine.mjs','utf8')));
 for(const f of ['deadman.mjs','weather.mjs','command-preconditions.mjs'])assert.equal(fs.readFileSync(root+'/backend/src/'+f,'utf8'),fs.readFileSync(prior+'/backend/src/'+f,'utf8'));
});
test('prior release source and all prior UI routes preserved in git',()=>{
 const changes=execFileSync('git',['diff','538ea025efec5c4d517b7449c8b4d66169060b17','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert.ok(changes.every(p=>p.startsWith('public/v5.0.8/')||p.startsWith('release-assets/v5.0.8-week13/')||p==='scripts/build-v508.mjs'||p.startsWith('tests/v508/')||p==='.github/workflows/verify-v508.yml'||p==='.github/workflows/publish-v508.yml'||p==='scripts/publish-v508.mjs'));
});
test('unlaunched defaults, exact board identities and foreign-session rejection',()=>{
 const board=slate.map(e.initialGame);assert.equal(composeDisplayBoard([],board).length,59);
 for(const g of board){assert.equal(g.lifecycle,'UNLAUNCHED');assert.equal(g.deadman.status,'UNARMED');assert.equal(g.auto,false);assert.equal(g.onAir,false);assert.equal(g.glSeconds,0);assert.equal(g.powerReady,true);}
 assert.ok(SESSION_RE.test('w13v508-0000000000000001'));assert.ok(!SESSION_RE.test('w12v507-506ff58ba0cfb7a5'));
 assert.throws(()=>composeDisplayBoard([],board.slice(1)));assert.throws(()=>composeDisplayBoard([],board.map((g,i)=>i?g:board[1])));
 const sql=fs.readFileSync(root+'/week13-schema.sql','utf8');assert.ok(sql.startsWith('begin;'));assert.ok(sql.trimEnd().endsWith('commit;'));
 assert.match(sql,/gamecast_v506_w11\.authorize_operator/);assert.ok(!sql.includes('gamecast_v507_'));assert.match(sql,/writes_enabled\) values \(true,false\)/);
 assert.match(sql,/active:=false/);assert.match(sql,/gamecast-week13-v5-0-8-scheduler/);assert.match(sql,/^.*revoke all on function public.gc508_w13_rpc.*$/mi);
});
test('punt touchback and legitimate safety from 5.0.7 remain intact',()=>{
 for(const [field,yards,punt,spot,pts] of [[59,41,true,20,0],[60,45,true,20,0],[50,42,true,8,0],[9,-9,false,25,2],[9,-8,false,1,0]]){
 const g=e.initialGame(slate[0]);Object.assign(g,{lifecycle:'ACTIVE',quarter:1,activePeriod:'1',possession:0,fieldPos:field,down:punt?4:1});
 e.applyPlay(g,{team:0,strategy:'NORMAL',yards,points:0,turnover:false,punt,fg:false,first:false,inBounds:!punt,incomplete:false,desc:punt?'Punt':'Sack',edgeAtSnap:0});
 assert.equal(g.fieldPos,spot);assert.equal(e.total(g,1),pts);
 }
});
