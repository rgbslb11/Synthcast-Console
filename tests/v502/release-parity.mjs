import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../../release-assets/v5.0.2-week8/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.2-week8/backend/runtime/week8.mjs';
// The previously approved four-change QA candidate, supplied explicitly at verification time.
const Q=await import(process.env.GAMECAST_APPROVED_QA_ENGINE||'./approved-engine.mjs');
const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:['2026-10-15T00:00:00Z']))}static now(){return 1792022400000}};
const seed=(id,k)=>createHash('sha256').update('GC502-QA-20261015|'+id+'|'+k).digest('hex').slice(0,32);
// Hold the version-keyed coin toss fixed across releases to isolate the approved football change.
function start(M,s,k){const g=M.initialGame(s),h=seed(s.id,k);Object.assign(g,{seedHex:h,rngState:M.seedWords(h,s.id),qaOnly:true,auto:true,lifecycle:'ACTIVE',activity:'LIVE',launchedAt:'2026-10-15T00:00:00Z',speed:1});Q.ensureOpeningToss(g);return g;}
const clean=g=>({history:g.history,scores:g.scores,rngState:g.rngState,down:g.down,distance:g.distance,field:g.fieldPos,poss:g.possession,gl:g.glSeconds,clock:g.scoreboardSeconds,quarter:g.quarter,life:g.lifecycle,counters:g.teamPlayCount,tos:[g.awayTimeouts,g.homeTimeouts]});
function run(M,s,k,chunk){let g=start(M,s,k),n=0;while(!M.FINALISH.has(g.lifecycle)&&n++<10000){if(chunk){g.speed=50;g=M.project([g],2.74)[0];if(n===20)g=JSON.parse(JSON.stringify(g));}else M.advanceGame(g,600);}assert.equal(g.lifecycle,'FINAL_PENDING');assert.notEqual(M.total(g,0),M.total(g,1));assert(!('0' in g.scores));return g;}
const rows=[];let games=0,records=0;
for(const s of slate){for(let k=0;k<50;k++){const a=run(E,s,k,false),b=run(Q,s,k,false),c=run(E,s,k,true);games+=3;assert.deepEqual(clean(a),clean(b),s.id+' approved candidate parity');assert.deepEqual(clean(a),clean(c),s.id+' speed/chunk/JSON recovery');for(const p of a.history.filter(p=>'desc'in p)){records++;assert.ok(p.preSnap&&p.adjudicated);assert.ok(p.preSnap.down>=1&&p.preSnap.down<=4);assert.ok(p.adjudicated.fieldPos>=1&&p.adjudicated.fieldPos<=99);const m=p.desc.match(/(?:Run for|Pass complete for) (-?\d+) yards/);if(m)assert.equal(Number(m[1]),p.yards);}rows.push({id:s.id,k,score:[E.total(a,0),E.total(a,1)],glSeconds:a.glSeconds,plays:a.history.filter(p=>'desc'in p).length,historyHash:createHash('sha256').update(JSON.stringify(clean(a))).digest('hex')});}console.log(s.id,games);}
fs.writeFileSync('outputs/v502/release-parity.json',JSON.stringify({status:'PASS',games,uniqueCandidateGames:2800,matchups:56,records,approvedCandidateParity:true,speedChunkRecovery:true,rows},null,2));
