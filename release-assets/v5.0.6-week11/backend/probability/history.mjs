import {sha256} from '../security/security-core.mjs';
import {MODEL,calculate} from './illustrative-model.mjs';

export const SAMPLE_MS=5000;
export const HISTORY_VERSION='GC-WP-HISTORY-1';
export const OVERRIDES=new Set(['score','clock_set','edit_commit','end','reopen_live']);
const clone=structuredClone;
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const id=x=>typeof x==='string'&&x.trim()===x&&x.length>0;
const final=g=>['FINAL_PENDING','LOCKED','READY','FINAL'].includes(g.lifecycle);
const total=(g,t)=>Object.values(g.scores).reduce((n,s)=>n+s[t],0);
const plays=g=>(g.history??[]).filter(h=>h.preSnap&&h.adjudicated).length;
const entries=g=>g.winProbability?.records??[];
export function contextHash(g,session){
 const weather=Object.fromEntries(Object.entries(g.weather??{}).filter(([k])=>!['locked','lockedAtZulu','snapshotId'].includes(k)));
 return sha256({engineVersion:session.engineVersion,dataVersion:session.dataVersion,gameId:g.id,
  away:g.awayCode,home:g.homeCode,neutral:g.neutral,quarterSeconds:g.quarterLengthSeconds,weather});
}
export function validatePrior(prior,g,session){
 requireValue(prior&&id(prior.favoriteTeamId)&&id(prior.otherTeamId),'PRIOR_TEAMS_REQUIRED');
 requireValue(prior.favoriteTeamId!==prior.otherTeamId&&[g.awayCode,g.homeCode].every(t=>[prior.favoriteTeamId,prior.otherTeamId].includes(t)),'PRIOR_MATCHUP_MISMATCH');
 requireValue(Number.isFinite(prior.pregameMargin)&&prior.pregameMargin>=0&&prior.pregameMargin<=200,'PRIOR_MARGIN_INVALID');
 const source=prior.source;
 requireValue(source&&['APPROVED_SIMULATION_ENSEMBLE','QA_FIXTURE'].includes(source.kind),'PRIOR_SOURCE_REQUIRED');
 requireValue(source.kind!=='QA_FIXTURE'||g.qaOnly===true,'QA_PRIOR_FORBIDDEN');
 requireValue(id(source.id)&&Number.isFinite(Date.parse(source.generatedAt)),'PRIOR_PROVENANCE_REQUIRED');
 requireValue(Number.isSafeInteger(source.sampleCount)&&source.sampleCount>0,'PRIOR_SAMPLE_COUNT_REQUIRED');
 requireValue(source.contextHash===contextHash(g,session),'PRIOR_CONTEXT_MISMATCH');
 return clone(prior);
}
function identity(session,g){
 requireValue(id(session.sessionId)&&id(session.engineVersion)&&id(g.id)&&id(g.runId),'HISTORY_IDENTITY_REQUIRED');
 return {sessionId:session.sessionId,engineVersion:session.engineVersion,gameId:g.id,runId:g.runId,modelId:MODEL.id};
}
const sameRun=(r,g)=>r.runId===g.runId;
export function appendRecord(history,record){
 requireValue(record.modelId===MODEL.id,'HISTORY_MODEL_MISMATCH');
 const records=history?.records??[];
 const key=JSON.stringify([record.sessionId,record.engineVersion,record.gameId,record.runId,record.modelId,record.eventId]);
 const body={...clone(record),key};
 const existing=records.find(r=>r.key===key);
 if(existing){
  const {index,previousHash,hash,...old}=existing;
  requireValue(sha256(old)===sha256(body),'HISTORY_EVENT_CONFLICT');
  return history;
 }
 const prev=records.at(-1),run=records.filter(r=>r.runId===record.runId),last=run.at(-1);
 if(prev){
  for(const k of ['sessionId','engineVersion','gameId','modelId'])requireValue(prev[k]===record[k],'HISTORY_IDENTITY_CHANGED');
  requireValue(record.stateRevision>=prev.stateRevision,'HISTORY_REVISION_REVERSED');
 }
 requireValue(Number.isSafeInteger(record.stateRevision)&&record.stateRevision>=0,'HISTORY_REVISION_REQUIRED');
 const kickoff=run.find(r=>r.kind==='kickoff');
 requireValue(record.kind!=='kickoff'||!kickoff,'HISTORY_DUPLICATE_KICKOFF');
 if(kickoff&&record.prior)requireValue(sha256(kickoff.prior)===sha256(record.prior),'HISTORY_FROZEN_PRIOR_CHANGED');
 requireValue(!last?.terminal||['override','edit_begin'].includes(record.kind),'HISTORY_AFTER_FINAL');
 const next={...body,index:records.length,previousHash:prev?.hash??null};
 next.hash=sha256(next);
 return {version:HISTORY_VERSION,records:[...records,next]};
}
/** Replay original committed records, including out-of-order delivery. Never synthesize backfill. */
export function recoverHistory(existing,delivered){
 const merged=new Map();
 for(const r of [...(existing?.records??[]),...delivered]){
  const old=merged.get(r.index);requireValue(!old||sha256(old)===sha256(r),'HISTORY_RECOVERY_CONFLICT');merged.set(r.index,clone(r));
 }
 let history={version:HISTORY_VERSION,records:[]};
 for(const r of [...merged.values()].sort((a,b)=>a.index-b.index)){
  requireValue(r.index===history.records.length,'HISTORY_RECOVERY_GAP');
  const {index,previousHash,hash,key,...body}=r;
  const next=appendRecord(history,body);
  requireValue(next.records.length===history.records.length+1&&sha256(next.records.at(-1))===sha256(r),'HISTORY_HASH_INVALID');
  history=next;
 }
 return history;
}
export function assertHistoryPreserved(before,after){
 const old=entries(before),next=entries(after);
 requireValue(next.length>=old.length,'HISTORY_TRUNCATED');
 for(let i=0;i<old.length;i++)requireValue(sha256(old[i])===sha256(next[i]),'HISTORY_REWRITTEN');
 if(next.length>old.length)recoverHistory(before.winProbability,next.slice(old.length));
}
export function assertHistoryEvents(before,after,events){
 const added=after.state.flatMap(g=>entries(g).slice(entries(before.state.find(old=>old.id===g.id)).length));
 const audit=events.filter(e=>['V506_WP_PREGAME','V506_WP_OBSERVATION'].includes(e.type));
 requireValue(audit.length===added.length,'HISTORY_AUDIT_COUNT_MISMATCH');
 for(const record of added){
  requireValue(record.sessionId===after.sessionId&&record.engineVersion===after.engineVersion,'HISTORY_SESSION_MISMATCH');
  requireValue(audit.filter(e=>e.gameId===record.gameId&&sha256(e.payload)===sha256(record)).length===1,'HISTORY_AUDIT_RECORD_MISSING');
 }
}
export function setPregame(draft,g,prior,stamp){
 requireValue(g.lifecycle==='UNLAUNCHED','PREGAME_FROZEN');
 const validated=validatePrior(prior,g,draft);
 const probability=calculate(modelInput(g,validated,'kickoff',stamp,draft.stateVersion+1)).probability;
 const record={...identity(draft,g),eventId:'pregame:'+String(draft.stateVersion+1),kind:'pregame',
  stateRevision:draft.stateVersion+1,observedAt:stamp,prior:validated,status:'PREGAME',probability,terminal:false};
 g.winProbability=appendRecord(g.winProbability,record);
 return record;
}
/** Only resolved/public state crosses into the estimator. No seed, RNG or pending play. */
export function modelInput(g,prior,kind,stamp,revision){
 const favorite=prior.favoriteTeamId===g.awayCode?0:1;
 return {gameId:g.id,runId:g.runId,eventId:kind,sequence:0,stateRevision:revision,
  favoriteTeamId:prior.favoriteTeamId,otherTeamId:prior.otherTeamId,pregameMargin:prior.pregameMargin,
  favoriteScore:total(g,favorite),otherScore:total(g,1-favorite),
  period:/^[1-4]$/.test(g.activePeriod)?Number(g.activePeriod):g.activePeriod,
  quarterSeconds:g.quarterLengthSeconds,clockSeconds:g.scoreboardSeconds,
  possessionTeamId:g.possession===null?null:g.possession===0?g.awayCode:g.homeCode,
  yardsToGoal:100-g.fieldPos,sourceTimestamp:stamp,
  kind:kind==='final'?'final':kind==='kickoff'||plays(g)===0?'kickoff':'timeout_fixture'};
}
export function observe(draft,g,{stamp,trigger='poll',forceBlock=null}={}){
 if(g.lifecycle==='UNLAUNCHED')return null;
 const history=g.winProbability??{version:HISTORY_VERSION,records:[]};
 const run=history.records.filter(r=>sameRun(r,g)),last=run.at(-1);
 const current=run.filter(r=>r.kind!=='pregame');
 const nplays=plays(g),now=Date.parse(stamp);
 requireValue(Number.isFinite(now),'OBSERVATION_TIME_INVALID');
 const sticky=forceBlock??run.find(r=>r.blockSticky)?.reason??null;
 const kind=forceBlock?'override':trigger==='edit_begin'?'edit_begin':!current.length?(g.glSeconds>0||nplays>0?'attach':'kickoff'):
  final(g)?'final':nplays>0&&!run.some(r=>r.resolvedPlays>0)?'first_play':'poll';
 if(last?.terminal&&!forceBlock&&trigger!=='edit_begin')return null;
 if(kind==='poll'&&trigger==='poll'&&last&&Math.floor(now/SAMPLE_MS)<=Math.floor(Date.parse(last.observedAt)/SAMPLE_MS))return null;
 const prior=current[0]?.prior??run.findLast(r=>r.kind==='pregame')?.prior??
  history.records.findLast(r=>r.runId===g.continuationOf&&r.prior)?.prior??null;
 let status='BLOCKED',reason=sticky,probability=null,trace=null,input=null;
 if(!reason&&kind==='attach')reason='KICKOFF_OBSERVATION_MISSING';
 if(!reason&&g.editing)reason='CHAIRMAN_EDIT_IN_PROGRESS';
 if(!reason&&!prior)reason='PREGAME_INPUTS_MISSING';
 if(!reason){
  try{
   validatePrior(prior,g,draft);
   input=modelInput(g,prior,kind,stamp,draft.stateVersion+1);
   const result=calculate(input);trace=result.trace;
   if(result.status==='ot_unavailable')reason='OVERTIME_MODEL_UNAVAILABLE';
   else {status=result.status==='terminal'?'FINAL':'ESTIMATED';probability=result.probability;}
  }catch(error){reason=error.message;}
 }
 const previousAt=last?Date.parse(last.observedAt):now;
 const eventId=kind==='kickoff'?'kickoff':kind==='final'?'final':kind==='poll'?'poll:'+Math.floor(now/SAMPLE_MS):kind+':'+(draft.stateVersion+1);
 const record={...identity(draft,g),eventId,kind,stateRevision:draft.stateVersion+1,observedAt:stamp,
  prior,probability,status,reason,blockSticky:!!sticky,terminal:final(g),parentRunId:g.continuationOf??null,
  resolvedPlays:nplays,glSeconds:g.glSeconds,period:g.activePeriod,clockSeconds:g.scoreboardSeconds,
  gapBefore:now-previousAt>2*SAMPLE_MS,missingIntervals:Math.max(0,Math.floor(now/SAMPLE_MS)-Math.floor(previousAt/SAMPLE_MS)-1),
  stateContext:{down:g.down,distance:g.distance,awayTimeouts:g.awayTimeouts,homeTimeouts:g.homeTimeouts,
   gameClockStatus:g.gameClockStatus,lifecycle:g.lifecycle,activity:g.activity,
   breakLabel:g.breakLabel,breakSeconds:g.breakSeconds,editing:g.editing===true,
   delayed:g.delayed===true,operatorPaused:g.operatorPaused===true},
  input,trace,calibrationStatus:'DEFERRED'};
 // A command and scheduler can observe the same slot. Keep its first committed record.
 if(history.records.some(r=>r.runId===g.runId&&r.eventId===eventId))return null;
 g.winProbability=appendRecord(history,record);
 return record;
}
export function probabilityView(g){
 const points=entries(g).filter(r=>r.runId===g.runId&&(g.lifecycle==='UNLAUNCHED'||r.kind!=='pregame'));
 const last=points.at(-1);
 return {gameId:g.id,runId:g.runId,modelId:MODEL.id,sampleIntervalSeconds:SAMPLE_MS/1000,
  status:last?.status??'BLOCKED',reason:last?.reason??'NO_COMMITTED_OBSERVATION',
  probability:last?.probability??null,color:last?.status==='BLOCKED'||!last?'#808080':last.probability>=0.5?'#1267b1':'#d32f3b',
  calibrationStatus:'DEFERRED',points:clone(points)};
}
