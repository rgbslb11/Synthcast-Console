// Local workload benchmark only. No network, deployment, production writes or prior approval.
// Run from repo root: node scripts/test-v510-wp-load.mjs > /tmp/wp-load.json
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as E from '../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {calculate} from '../release-assets/v5.1.0/backend/reporting/illustrative-wp.mjs';
import {createReportingService} from '../release-assets/v5.1.0/backend/reporting/service.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const quantile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))];
const clean=x=>Array.isArray(x)?x.map(clean):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>!['masterZulu','timestamp','createdRunAt','launchedAt','completedAt','atZulu','speed'].includes(k)).map(([k,v])=>[k,clean(v)])):x;
assert.equal(slate.length,56);assert.equal(new Set(slate.map(s=>s.id)).size,56);
const reports=[];let reference=null;
for(const speed of [1,4,10,20,50]){
 const sessionId='QA-LOCAL-WP-LOAD-'+speed,identity={authenticated:true,active:true,role:'CHAIRMAN',authorizedSessionIds:[sessionId]};
 let games=slate.map((s,i)=>{const g={...E.initialGame(s),sessionId,qaOnly:true,lifecycle:'ACTIVE',auto:true,speed};g.seedHex=createHash('sha256').update('wp-load-seed-'+i).digest('hex').slice(0,32);g.rngState=E.seedWords(g.seedHex,g.id);E.ensureOpeningToss(g);return g;});
 let stateVersion=1,wall=0,observations=0,reads=0,maxSummaryBytes=0,otUnavailable=0;
 const latencies=[],firstObserved=new Set(),done=new Set();
 const service=createReportingService({loadSnapshot:async(s,id)=>{assert.equal(s,sessionId);const game=games.find(g=>g.id===id);return {game,stateVersion,engineVersion:E.ENGINE_VERSION,audit:{complete:true,sessionId,gameId:id,throughStateVersion:stateVersion,commands:[]}};}});
 const runStarted=performance.now();
 while(done.size<56&&wall<18000){
  const sweepStarted=performance.now();
  if(wall)games=E.project(games,5);
  stateVersion++;
  const summaries=[];
  for(const g of games){
   if(done.has(g.id))continue;
   const terminal=E.FINALISH.has(g.lifecycle),resolved=g.history.filter(h=>h.preSnap&&h.adjudicated).length;
   let kind=terminal?'final':resolved?'timeout_fixture':'kickoff';
   const input={gameId:g.id,runId:g.runId,eventId:'sample:'+wall,sequence:wall/5,stateRevision:stateVersion,favoriteTeamId:g.homeCode,otherTeamId:g.awayCode,favoriteScore:E.total(g,1),otherScore:E.total(g,0),pregameMargin:7,period:/^[1-4]$/.test(g.activePeriod)?Number(g.activePeriod):g.activePeriod,quarterSeconds:g.quarterLengthSeconds,clockSeconds:g.scoreboardSeconds,possessionTeamId:g.possession===null?null:g.possession===0?g.awayCode:g.homeCode,yardsToGoal:100-g.fieldPos,sourceTimestamp:new Date(Date.parse('2026-11-03T23:00:00Z')+wall*1000).toISOString(),kind};
   // Only this allowlisted input enters the estimator. Seven points is a QA fixture.
   const before=hash(g),result=calculate(input);assert.equal(hash(g),before);
   assert.deepEqual(calculate(structuredClone(input)),result);observations++;
   if(result.status==='ot_unavailable'){assert.equal(result.probability,null);otUnavailable++;}
   else assert.ok(result.probability>=0&&result.probability<=1);
   if(resolved)firstObserved.add(g.id);
   if(terminal){done.add(g.id);assert.equal(result.probability,E.total(g,1)>E.total(g,0)?1:0);}
   summaries.push({gameId:g.id,runId:g.runId,stateVersion,observationSequence:wall/5,probability:result.probability,status:result.status});
  }
  // One all-board summary plus four simultaneous authorized detailed views.
  maxSummaryBytes=Math.max(maxSummaryBytes,Buffer.byteLength(JSON.stringify(summaries)));
  const prior=hash(games);
  await Promise.all(games.slice(0,4).map(async g=>{const r=await service({identity,sessionId,gameId:g.id,limit:100,expectedRunId:g.runId});assert.equal(r.availability.status,'AVAILABLE');reads++;}));
  assert.equal(hash(games),prior);
  latencies.push(performance.now()-sweepStarted);wall+=5;
 }
 assert.equal(done.size,56);assert.equal(firstObserved.size,56);
 // Compare all speeds' full football histories and final states. Ignore only wall stamps,
 // speed configuration, and fixture session identity, never RNG or football fields.
 const signatures=games.map(g=>{const c=clean(g);delete c.sessionId;return hash(c);});
 if(reference)assert.deepEqual(signatures,reference);else reference=signatures;
 reports.push({speed,games:56,finished:done.size,sweeps:latencies.length,virtualWallSeconds:wall,observations,detailedReads:reads,otUnavailable,maxSummaryBytes,localSweepP50Ms:quantile(latencies,.5),localSweepP95Ms:quantile(latencies,.95),localSweepMaxMs:Math.max(...latencies),localElapsedMs:performance.now()-runStarted});
}
console.log(JSON.stringify({status:'PASS',scope:'LOCAL_VIRTUAL_CLOCK_WORKLOAD_ONLY',realNetwork:false,databasePersistence:false,concurrentWriters:false,prior:'QA_FIXTURE: home +7, not an approved forecast',gamesPerSpeed:56,speeds:[1,4,10,20,50],totalGameRuns:280,footballSpeedInvariance:true,readPurity:true,repeatCalculationEquality:true,reports},null,2));
