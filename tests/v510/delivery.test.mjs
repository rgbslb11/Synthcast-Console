import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProjection} from '../../release-assets/v5.1.0/backend/delivery/projection.mjs';
import {createDetailsHandler} from '../../release-assets/v5.1.0/backend/delivery/http.mjs';
import {createReportingTransport} from '../../release-assets/v5.1.0/backend/delivery/supabase-adapter.mjs';
import {normalizePlays} from '../../release-assets/v5.1.0/backend/reporting/normalize.mjs';
import {teamStatistics} from '../../release-assets/v5.1.0/backend/reporting/statistics.mjs';
import {createReportingService} from '../../release-assets/v5.1.0/backend/reporting/service.mjs';
import * as E from '../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
export const sid='qa-v510-delivery',uid='11111111-1111-4111-8111-111111111111',origin='https://qa.example.test';
export const fresh=()=>({...E.initialGame(slate[0]),sessionId:sid,qaOnly:true});
export const snapshot=(game,stateVersion=0,commands=[])=>({game,stateVersion,commands,engineVersion:E.ENGINE_VERSION,committedAt:'2026-11-03T21:00:00.000Z',audit:{complete:true,sessionId:game.sessionId,gameId:game.id,throughStateVersion:stateVersion,commands}});
export function play(g,yards=5){E.applyPlay(g,{team:g.possession,strategy:'NORMAL',desc:`Run for ${yards} yards in bounds`,yards,points:0,turnover:false,punt:false,fg:false,first:yards>=g.distance,inBounds:true,incomplete:false});}
const identity={userId:uid,authenticated:true,active:true,role:'CHAIRMAN',authorizedSessionIds:[sid]};
const request=(query='',headers={})=>new Request(`https://qa.test/details?session=${sid}&game=${slate[0].id}${query}`,{headers:{origin,authorization:'Bearer verified-test-token',...headers}});
const defaults={allowedOrigins:[origin],authenticate:async()=>({id:uid}),authorize:async()=>identity,loadSourceVersion:async()=>0,readDetails:async()=>({availability:{status:'NOT_STARTED'}})};
test('HTTP verifies Auth and grant before any source or detail read; spoofed identity ignored',async()=>{
 for(const change of [{authenticate:async()=>null},{authorize:async()=>({...identity,active:false})},{authorize:async()=>({...identity,userId:'another'})},{authorize:async()=>({...identity,authorizedSessionIds:[]})}]){
  let reads=0;const handler=createDetailsHandler({...defaults,...change,loadSourceVersion:async()=>{reads++;return 0;},readDetails:async()=>{reads++;}});
  const r=await handler(request('&identity=CHAIRMAN&active=true'));assert.ok([401,403].includes(r.status));assert.equal(reads,0);
 }
});
test('HTTP rejects public origins, methods, legacy scope and unbound cursors',async()=>{
 const h=createDetailsHandler(defaults);
 assert.equal((await h(request('',{origin:'https://public.test'}))).status,403);
 assert.equal((await h(new Request(request(),{method:'POST'}))).status,405);
 assert.equal((await h(request('&after=1'))).status,400);
 assert.equal((await h(request('&limit=251'))).status,400);
 assert.equal((await h(request('&after=-1'))).status,400);
 assert.equal((await h(new Request(request().url.replace(sid,'w11v506-123456789abcdef0'),request()))).status,404);
});
test('HTTP requires live source version, scrubs errors, and forbids caching',async()=>{
 let read=0;const h=createDetailsHandler({...defaults,loadSourceVersion:async()=>null,readDetails:async()=>{read++;}});
 const r=await h(request());assert.equal(r.status,503);assert.equal(read,0);assert.equal(r.headers.get('cache-control'),'no-store');
 const error=await createDetailsHandler({...defaults,authenticate:async()=>{throw Error('service secret');}})(request());assert.equal((await error.text()).includes('service secret'),false);
});
test('projection is pure, QA-only, has complete envelope and missing TOP is explicit',()=>{
 const g=fresh();g.lifecycle='ACTIVE';g.possession=0;play(g);delete g.teamTopSeconds;
 const before=JSON.stringify(g),p=buildProjection(snapshot(g,1));assert.equal(JSON.stringify(g),before);
 assert.equal(p.summary.generatedAt,'2026-11-03T21:00:00.000Z');assert.equal(p.summary.throughEventSequence,0);
 assert.equal(p.summary.fieldAvailability.timeOfPossession.status,'BLOCKED');assert.equal(p.summary.teamStatistics[0].timeOfPossession,null);
 assert.throws(()=>buildProjection(snapshot({...g,qaOnly:false},1)),/QA_SCOPE_REQUIRED/);
 assert.throws(()=>buildProjection(snapshot({...g,sessionId:'w11v506-123456789abcdef0'},1)),/QA_SCOPE_REQUIRED/);
});
test('invalid coordinates, ruling, score ledger and unknown scoring records fail closed',()=>{
 for(const change of [g=>g.history[0].preSnap.fieldPos=101,g=>g.history[0].adjudicated.down=5,g=>g.history[0].ruling='INVENTED',g=>g.scores['1']=[3,0],g=>g.history.push({period:'1',team:0,points:3,gl:0,source:'UNKNOWN'})]){
  const g=fresh();g.lifecycle='ACTIVE';g.possession=0;play(g);change(g);
  const p=buildProjection(snapshot(g,1));assert.equal(p.summary.availability.status,'BLOCKED');assert.equal(p.summary.teamStatistics,undefined);assert.equal(p.plays.length,0);
 }
});
test('resolved nested weather fields cannot leak RNG or pending outcomes',()=>{
 const g=fresh();g.lifecycle='ACTIVE';g.possession=0;play(g);g.history[0].weatherAudit={modelVersion:'wx',primitive:'RUN',rngState:[1,2],pendingPlay:{winner:1}};
 const p=buildProjection(snapshot(g,1));assert.equal(p.summary.availability.status,'AVAILABLE');assert.deepEqual(p.plays[0].weatherAdjustment,{modelVersion:'wx',primitive:'RUN'});assert.equal(p.plays[0].originalDescription,'Run for 5 yards in bounds');
});
test('foundation service rejects stale revision without detail',async()=>{
 const g=fresh();g.lifecycle='ACTIVE';g.possession=0;play(g);
 const service=createReportingService({loadSnapshot:async()=>snapshot(g,2)});
 const r=await service({identity,sessionId:sid,gameId:g.id,expectedStateVersion:1});assert.equal(r.availability.reason,'STATE_VERSION_CHANGED');assert.equal(r.plays,undefined);
});
test('transport uses verified Auth user and fixed v510 schema; anonymous users rejected',async()=>{
 const calls=[];
 const transport=createReportingTransport({url:'https://isolated.supabase.co',publishableKey:'public-key',serviceKey:'server-only',fetchImpl:async(url,init)=>{calls.push({url:String(url),...init});return Response.json(String(url).includes('/auth/')?{id:uid,user_metadata:{role:'CHAIRMAN'}}:true);}});
 const user=await transport.authenticate('long-test-bearer-token');await transport.authorize(user,sid);
 assert.equal(calls[0].headers.apikey,'public-key');assert.equal(calls[1].headers['Content-Profile'],'gamecast_v510');assert.equal(calls[1].headers.Authorization,'Bearer server-only');assert.equal(calls[0].redirect,'error');
 assert.throws(()=>transport.rpc('commit_state',{}),/RPC_NOT_ALLOWED/);
 const bad=createReportingTransport({url:'https://isolated.supabase.co',publishableKey:'p',serviceKey:'s',fetchImpl:async()=>Response.json({id:uid,is_anonymous:true})});await assert.rejects(()=>bad.authenticate('long-test-bearer-token'),/AUTHENTICATION_REQUIRED/);
});

test('scoreboard preserves all 17 fields and marks missing records without inventing them',async()=>{
 const fs=await import('node:fs');const contract=JSON.parse(fs.readFileSync('release-assets/v5.1.0/data-contract.v1.json'));
 const g=fresh();g.lifecycle='ACTIVE';g.possession=0;play(g);const p=buildProjection(snapshot(g,1));
 assert.deepEqual(Object.keys(p.summary.scoreboard),contract.scoreboard);
 assert.equal(p.summary.scoreboard.awayTeamAndRecords.record,null);
 assert.equal(p.summary.fieldAvailability['awayTeamAndRecords.record'].reason,'AUTHORITATIVE_RECORD_MISSING');
 assert.equal(p.summary.scoreboard.scheduledKickoff,g.kickoffZulu);
});
test('live OT carries score but exposes no invented field or offensive snaps',()=>{
 const g=fresh();g.lifecycle='ACTIVE';g.possession=0;play(g);g.activePeriod='OT';g.scores.OT=[0,0];
 const p=buildProjection(snapshot(g,1));assert.equal(p.summary.availability.status,'AVAILABLE');
 assert.equal(p.summary.field.availability.reason,'OVERTIME_FIELD_UNAVAILABLE');
 assert.equal(p.summary.scoreboard.fieldPosition,null);assert.equal(p.summary.possessions.at(-1).result,'REGULATION_END');
 assert.equal(p.summary.teamStatistics[0].offensiveSnaps,1);
});
test('unknown audit commands do not establish a clean game',()=>{
 const g=fresh();assert.throws(()=>buildProjection(snapshot(g,1,[{command:'future_override',stateVersion:1}])),/VERIFICATION_UNAVAILABLE/);
});
test('hand-calculated mixed drive reconciles all efficiency and scoring rows',()=>{
 const g=fresh();g.lifecycle='ACTIVE';g.possession=0;
 // 25->30 run; 30->40 complete first down; incomplete; sack -5;
 // third-and-15 completion to 55; rush TD from 55 (credited 45).
 const emit=(desc,yards,extra={})=>E.applyPlay(g,{team:0,strategy:'NORMAL',desc,yards,points:0,turnover:false,punt:false,fg:false,first:yards>=g.distance,inBounds:true,incomplete:false,...extra});
 emit('Run for 5 yards in bounds',5);emit('Pass complete for 10 yards in bounds',10);
 emit('Incomplete pass',0,{incomplete:true});emit('Sack for 5-yard loss',-5);
 emit('Pass complete for 20 yards in bounds',20);emit('Run for 60 yards in bounds',60);
 const s=teamStatistics(g,normalizePlays(g,{sessionId:sid,engineVersion:E.ENGINE_VERSION}))[0];
 assert.equal(s.offensiveSnaps,6);assert.equal(s.rushingAttempts,3);assert.equal(s.rushingYards,45);assert.equal(s.rushingTouchdowns,1);
 assert.equal(s.passingAttempts,3);assert.equal(s.completions,2);assert.equal(s.passingYards,30);assert.equal(s.totalOffense,75);
 assert.equal(s.yardsPerRush,15);assert.equal(s.yardsPerCompletion,15);assert.equal(s.yardsPerOffensivePlay,12.5);
 assert.equal(s.firstDowns,3);assert.equal(s.thirdDownAttempts,1);assert.deepEqual(s.thirdDownConversionsPercentage,{made:1,attempted:1,percentage:100});
 assert.equal(s.totalPoints,7);assert.deepEqual(s.pointsByQuarter,{'1':7,'2':0,'3':0,'4':0});
});

test('trusted atomic source adapter verifies complete revision/event manifests',async()=>{
 const {committedSnapshots,createCommittedSourceConsumer}=await import('../../release-assets/v5.1.0/backend/delivery/source-adapter.mjs');
 const {hash}=await import('../../release-assets/v5.1.0/backend/delivery/projection.mjs');
 const g=fresh(),events=[{gameId:g.id,command:'edit_commit'}];
 const source={sessionId:sid,engineVersion:E.ENGINE_VERSION,stateVersion:1,committedAt:'2026-11-03T21:00:00Z',games:[g],commits:[{stateVersion:1,eventCount:1,eventHash:hash(events),events}]};
 assert.equal(committedSnapshots(source)[0].audit.commands[0].command,'edit_commit');
 for(const change of [s=>s.commits=[],s=>s.commits[0].events=[],s=>s.commits[0].events[0].command='pause',s=>s.games[0].sessionId='other']){
  const bad=structuredClone(source);change(bad);assert.throws(()=>committedSnapshots(bad));
 }
 let writes=0;const consume=createCommittedSourceConsumer({loadCommittedRevision:async()=>source,writeProjection:async()=>{writes++;return {};}});
 await assert.rejects(()=>consume(sid,2),/SOURCE_IDENTITY_MISMATCH/);assert.equal(writes,0);await consume(sid,1);assert.equal(writes,1);
});

test('per-play score mismatch and private nested state never reach detail responses',()=>{
 for(const mutate of [g=>g.history[0].score=[3,0],g=>g.history[0].strategy={rngState:[1,2]},g=>g.weather.wind={seedHex:'private'}]){
  const g=fresh();g.lifecycle='ACTIVE';g.possession=0;play(g);mutate(g);const p=buildProjection(snapshot(g,1));
  assert.equal(p.summary.availability.status,'BLOCKED');assert.equal(p.summary.teamStatistics,undefined);assert.equal(p.summary.scoreboard,undefined);assert.equal(p.plays.length,0);
 }
});
