import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {buildProjection,hash} from '../../../release-assets/v5.1.0/backend/delivery/projection.mjs';
import {createDetailsHandler} from '../../../release-assets/v5.1.0/backend/delivery/http.mjs';
import * as E from '../../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
const sid='qa-v510-db',uid='11111111-1111-4111-8111-111111111111';
const fresh=(s=slate[0])=>({...E.initialGame(s),sessionId:sid,qaOnly:true});
const snap=(game,stateVersion=0,commands=[])=>({game,stateVersion,engineVersion:E.ENGINE_VERSION,committedAt:'2026-11-03T21:00:00.000Z',audit:{complete:true,sessionId:sid,gameId:game.id,throughStateVersion:stateVersion,commands}});
const play=g=>E.applyPlay(g,{team:g.possession,strategy:'NORMAL',desc:'Run for 5 yards in bounds',yards:5,points:0,turnover:false,punt:false,fg:false,first:5>=g.distance,inBounds:true,incomplete:false});
const schema=fs.readFileSync('release-assets/v5.1.0/backend/delivery/schema.sql','utf8');
const provision=async db=>{await db.exec('create role service_role bypassrls; create role anon; create role authenticated;');await db.exec(schema);await db.query('insert into gamecast_v510.reporting_grants values ($1,$2,true)',[sid,uid]);};
const commit=async(db,p)=>(await db.query('select gamecast_v510.commit_reporting($1::jsonb) as result',[JSON.stringify(p)])).rows[0].result;
const read=async(db,g,{after=0,limit=100,run=null,version=null,sourceVersion=1,user=uid}={})=>(await db.query('select gamecast_v510.read_reporting($1,$2,$3,$4,$5,$6,$7,$8) as result',[user,sid,g.id,after,limit,run,version,sourceVersion])).rows[0].result;

test('PostgreSQL schema denies public roles and makes journal/receipts immutable',async()=>{
 const db=new PGlite();await provision(db);const g=fresh();await commit(db,buildProjection(snap(g)));
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(()=>read(db,g),/permission denied/);await assert.rejects(()=>db.query('select * from gamecast_v510.reporting_heads'),/permission denied/);await db.exec('reset role');}
 await assert.rejects(()=>db.exec('delete from gamecast_v510.reporting_receipts'),/IMMUTABLE_JOURNAL/);
 await db.exec('set role service_role');assert.equal((await read(db,g,{sourceVersion:0})).availability.status,'NOT_STARTED');await db.exec('reset role');await db.close();
});

test('transactional journal: idempotency, source gaps, rewrite rollback, cursor binding and disconnect recovery',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gc-v510-pg-'));let db=new PGlite(dir);await provision(db);
 const g=fresh();await commit(db,buildProjection(snap(g)));g.lifecycle='ACTIVE';g.possession=0;play(g);play(g);
 const p=buildProjection(snap(g,1,[{command:'launch',stateVersion:1}]));assert.equal((await commit(db,p)).replayed,false);assert.equal((await commit(db,p)).replayed,true);
 await assert.rejects(()=>commit(db,{...p,summary:{...p.summary,generatedAt:'2026-11-03T22:00:00Z'}}),/IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>commit(db,buildProjection(snap(g,3,p.commands))),/SOURCE_REVISION_GAP/);
 const a=await read(db,g,{limit:1});assert.equal(a.plays.length,1);assert.equal(a.nextSequence,1);assert.equal(a.hasMore,true);
 const serialized=JSON.stringify(a);assert.ok(!/rngState|pendingPlay|seedHex/.test(serialized));
 await db.close();db=new PGlite(dir);
 const b=await read(db,g,{after:a.nextSequence,limit:1,run:a.runId,version:a.stateVersion});assert.equal(b.plays[0].sequence,2);assert.equal(b.hasMore,false);
 assert.equal((await commit(db,p)).replayed,true);
 const tamper=structuredClone(g);tamper.history[0].desc='Run for 6 yards in bounds';
 await assert.rejects(()=>commit(db,buildProjection(snap(tamper,2,p.commands))),/IMMUTABLE_HISTORY_CONFLICT/);
 assert.equal((await read(db,g)).stateVersion,1);
 assert.equal((await read(db,g,{sourceVersion:2})).availability.reason,'SOURCE_REVISION_UNAVAILABLE');
 assert.equal((await read(db,g,{run:'wrong'})).availability.reason,'RUN_CHANGED');
 assert.equal((await read(db,g,{version:0})).availability.reason,'STATE_VERSION_CHANGED');
 await assert.rejects(()=>read(db,g,{after:1}),/CHECKPOINT_REQUIRED/);
 await assert.rejects(()=>read(db,g,{user:'22222222-2222-4222-8222-222222222222'}),/CHAIRMAN_FORBIDDEN/);
 // Revocation is checked again by SQL, even after an earlier HTTP grant check.
 await db.query('update gamecast_v510.reporting_grants set active=false where user_id=$1',[uid]);await assert.rejects(()=>read(db,g),/CHAIRMAN_FORBIDDEN/);
 await db.close();fs.rmSync(dir,{recursive:true,force:true});
});

test('Edit/cancel restores only clean games; saved correction survives accept, restart and audit rewrite attempts',async()=>{
 const db=new PGlite();await provision(db);const g=fresh();await commit(db,buildProjection(snap(g)));
 const commands=[];let v=0;
 async function save(command){v++;commands.push({command,stateVersion:v});await commit(db,buildProjection(snap(g,v,commands)));return read(db,g,{sourceVersion:v});}
 g.lifecycle='ACTIVE';g.possession=0;play(g);assert.equal((await save('launch')).availability.status,'AVAILABLE');
 E.beginEdit(g,{});assert.equal((await save('edit_begin')).availability.reason,'CHAIRMAN_EDIT_OPEN');
 E.cancelEdit(g);assert.equal((await save('edit_cancel')).availability.status,'AVAILABLE');
 E.beginEdit(g,{});await save('edit_begin');E.commitEdit(g,{clockSeconds:400},{});
 assert.equal((await save('edit_commit')).availability.reason,'CHAIRMAN_CORRECTION');
 E.beginEdit(g,{});await save('edit_begin');E.cancelEdit(g);assert.equal((await save('edit_cancel')).availability.reason,'CHAIRMAN_CORRECTION');
 g.lifecycle='READY';assert.equal((await save('accept')).availability.reason,'CHAIRMAN_CORRECTION');
 E.reset(g,false,'QA restart');assert.equal((await save('restart_same_seed')).availability.reason,'CHAIRMAN_CORRECTION');
 await assert.rejects(()=>commit(db,buildProjection(snap(g,v+1,[]))),/AUDIT_REWRITE/);
 const count=(await db.query('select count(*)::int as n from gamecast_v510.reporting_plays')).rows[0].n;assert.equal(count,1);
 await db.close();
});

test('56 active games: retained engine with reporting reads, durable commits, recovery and concurrent HTTP requests',async t=>{
 const db=new PGlite();await provision(db);const games=slate.map(fresh),controls=structuredClone(games);let v=0;const durations=[];
 for(let i=0;i<games.length;i++){
  await commit(db,buildProjection(snap(games[i])));
  for(const g of [games[i],controls[i]]){g.seedHex='510'.padStart(32,'0');g.rngState=E.seedWords(g.seedHex,g.id);g.lifecycle='ACTIVE';g.auto=true;E.ensureOpeningToss(g);}
 }
 const start=performance.now();
 for(const seconds of [300,300,300,300,300,18500]){
  v++;
  for(let i=0;i<games.length;i++){
   E.advanceGame(games[i],seconds);E.advanceGame(controls[i],seconds);
   const before=JSON.stringify(games[i]);
   await commit(db,buildProjection(snap(games[i],v,[{command:'launch',stateVersion:1}])));
   const at=performance.now(),r=await read(db,games[i],{sourceVersion:v});durations.push(performance.now()-at);
   assert.equal(r.availability.status,'AVAILABLE');assert.equal(r.plays.length<=100,true);assert.equal(JSON.stringify(games[i]),before);
   const football=g=>{const x=structuredClone(g);delete x.createdRunAt;delete x.launchedAt;delete x.completedAt;for(const h of x.history)delete h.masterZulu;return x;};
   assert.equal(hash(football(games[i])),hash(football(controls[i])));
  }
 }
 const handler=createDetailsHandler({allowedOrigins:['https://qa.test'],authenticate:async()=>({id:uid}),authorize:async()=>({userId:uid,authenticated:true,active:true,role:'CHAIRMAN',authorizedSessionIds:[sid]}),loadSourceVersion:async()=>v,readDetails:({gameId,sourceVersion})=>read(db,{id:gameId},{sourceVersion})});
 const responses=await Promise.all(games.map(g=>handler(new Request(`https://qa.test/details?session=${sid}&game=${g.id}`,{headers:{origin:'https://qa.test',authorization:'Bearer test-token-for-qa'}}))));
 assert.equal(responses.filter(r=>r.status===200).length,56);
 for(const r of responses)assert.equal((await r.json()).availability.status,'AVAILABLE');
 durations.sort((a,b)=>a-b);
 const metrics={games:56,commits:392,measuredReads:durations.length,concurrentHttp:56,readP95Ms:durations[Math.floor(durations.length*.95)],readMaxMs:durations.at(-1),totalMs:performance.now()-start};
 t.diagnostic(JSON.stringify(metrics));
 // A local regression ceiling, not a hosted latency SLA.
 assert.ok(metrics.readP95Ms<1000);assert.ok(metrics.readMaxMs<5000);
 await db.close();
});

test('competing projection writers cannot overwrite a revision or reuse an empty run ID',async()=>{
 const db=new PGlite();await provision(db);const g=fresh(),initial=g.runId;await commit(db,buildProjection(snap(g)));
 const p1=buildProjection(snap(g,1)),p2=structuredClone(p1);p2.summary.generatedAt='2026-11-03T22:00:00Z';
 const results=await Promise.allSettled([commit(db,p1),commit(db,p2)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/IDEMPOTENCY_CONFLICT/);
 E.reset(g,false,'empty QA');await commit(db,buildProjection(snap(g,2,[{command:'restart_same_seed',stateVersion:2}])));
 g.runId=initial;await assert.rejects(()=>commit(db,buildProjection(snap(g,3,[{command:'restart_same_seed',stateVersion:2},{command:'restart_same_seed',stateVersion:3}]))),/RUN_ID_REUSED/);
 await db.close();
});
