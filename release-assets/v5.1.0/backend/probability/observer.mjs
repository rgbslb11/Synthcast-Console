import {MODEL,calculate} from '../reporting/illustrative-wp.mjs';
import {hash,requireScope} from '../delivery/projection.mjs';
import {CAPTURE_VERSION} from './capture.mjs';
const overrides=new Set(['score','clock_set','edit_commit','end','reopen_live']);
const terminal=c=>['FINAL_PENDING','LOCKED','READY','FINAL'].includes(c.lifecycle);
export function validatePrior(p,c){
 if(!p||![c.homeTeamId,c.awayTeamId].includes(p.favoriteTeamId)||p.otherTeamId===p.favoriteTeamId||![c.homeTeamId,c.awayTeamId].includes(p.otherTeamId))throw Error('PRIOR_MATCHUP_MISMATCH');
 if(!Number.isFinite(p.pregameMargin)||p.pregameMargin<0||p.pregameMargin>200)throw Error('PRIOR_MARGIN_INVALID');
 if(!['APPROVED_SIMULATION_ENSEMBLE','QA_FIXTURE'].includes(p.source?.kind)||p.source.kind==='QA_FIXTURE'&&!c.qaOnly)throw Error('PRIOR_SOURCE_REQUIRED');
 if(typeof p.source.id!=='string'||!p.source.id||!Number.isSafeInteger(p.source.sampleCount)||p.source.sampleCount<1||!Number.isFinite(Date.parse(p.source.generatedAt)))throw Error('PRIOR_PROVENANCE_REQUIRED');
 if(p.source.contextHash!==c.contextHash)throw Error('PRIOR_CONTEXT_MISMATCH');
 return structuredClone(p);
}
export function observeCapture(previous,c,{prior=null,kind=null,eventId=null}={}){
 requireScope(c.sessionId,c.gameId);
 if(c.captureVersion!==CAPTURE_VERSION||!Number.isSafeInteger(c.stateVersion)||c.stateVersion<0||!Number.isSafeInteger(c.actionOrdinal)||c.actionOrdinal<0||!Number.isFinite(Date.parse(c.observedAt)))throw Error('INVALID_CAPTURE');
 if(previous&&previous.stateVersion>c.stateVersion)throw Error('SOURCE_REVISION_REVERSED');
 const same=previous?.runId===c.runId;
 const launch=['launch','deadman_launch'].includes(c.command);
 const frozen=launch?prior:same?previous.frozenPrior:null;
 const sticky=previous?.corrected===true||overrides.has(c.command);
 const seen=same&&previous?.seenGameplay===true;
 const type=kind??(overrides.has(c.command)?'override':c.command==='edit_begin'?'edit_begin':c.command==='edit_cancel'?'edit_cancel':launch?'kickoff':terminal(c)?'final':c.resolvedPlayCount>0&&!seen?'first_observed_gameplay':c.lifecycle==='UNLAUNCHED'?'pregame':'poll');
 const slot=Math.floor(Date.parse(c.observedAt)/5000);
 const id=eventId??(['poll'].includes(type)?'poll:'+slot:`${type}:${c.stateVersion}:${c.actionOrdinal}`);
 let reason=sticky?'CHAIRMAN_CORRECTION':c.editing?'CHAIRMAN_EDIT_OPEN':null,probability=null,status='BLOCKED',input=null,trace=null;
 const chosen=c.lifecycle==='UNLAUNCHED'?prior:frozen;
 if(!reason&&!chosen)reason='PREGAME_INPUTS_MISSING';
 if(!reason&&!launch&&c.lifecycle!=='UNLAUNCHED'&&(!same||!previous?.launchSeen))reason='KICKOFF_OBSERVATION_MISSING';
 if(!reason){try{
  validatePrior(chosen,c);
  if(!Object.entries(c.scores).every(([p,v])=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(p)&&Array.isArray(v)&&v.length===2&&v.every(n=>Number.isSafeInteger(n)&&n>=0)))throw Error('INVALID_SCORE_STATE');
  const fav=chosen.favoriteTeamId===c.awayTeamId?0:1,total=t=>Object.values(c.scores).reduce((n,v)=>n+v[t],0);
  input={gameId:c.gameId,runId:c.runId,eventId:id,sequence:0,stateRevision:c.stateVersion,favoriteTeamId:chosen.favoriteTeamId,otherTeamId:chosen.otherTeamId,pregameMargin:chosen.pregameMargin,
   favoriteScore:total(fav),otherScore:total(1-fav),period:/^[1-4]$/.test(c.period)?Number(c.period):c.period,quarterSeconds:c.quarterSeconds,clockSeconds:c.clockSeconds,possessionTeamId:c.possessionTeamId,yardsToGoal:c.yardsToGoal,sourceTimestamp:c.observedAt,
   kind:terminal(c)?'final':launch||!c.resolvedPlayCount?'kickoff':'timeout_fixture'};
  const result=calculate(input);trace=result.trace;
  if(result.status==='ot_unavailable')reason='OVERTIME_MODEL_UNAVAILABLE';
  else {probability=result.probability;status=terminal(c)?'FINAL':c.lifecycle==='UNLAUNCHED'?'PREGAME':'ESTIMATED';}
 }catch(e){reason=e.message;}}
 const missingIntervals=previous?Math.max(0,slot-Math.floor(Date.parse(previous.observedAt)/5000)-1):0;
 const record={sessionId:c.sessionId,engineVersion:c.engineVersion,gameId:c.gameId,runId:c.runId,modelId:MODEL.id,eventId:id,kind:type,stateVersion:c.stateVersion,actionOrdinal:c.actionOrdinal,throughEventSequence:c.throughEventSequence,observedAt:c.observedAt,probability,status,reason,calibrationStatus:'DEFERRED',gapBefore:missingIntervals>0,missingIntervals,input,trace};
 const state={...record,corrected:sticky,launchSeen:launch||same&&previous?.launchSeen===true,seenGameplay:c.resolvedPlayCount>0||seen,frozenPrior:launch?structuredClone(prior):frozen,capture:structuredClone(c)};
 return {record,state};
}
export function compactView(state){
 if(!state)return {status:'BLOCKED',reason:'NO_COMMITTED_OBSERVATION',probability:null,color:'#808080',calibrationStatus:'DEFERRED'};
 const {sessionId,gameId,runId,modelId,stateVersion,throughEventSequence,observedAt,probability,status,reason,observationSequence}=state;
 return {sessionId,gameId,runId,modelId,stateVersion,throughEventSequence,observedAt,probability,status,reason,observationSequence,color:status==='BLOCKED'?'#808080':probability>=.5?'#1267b1':'#d32f3b',calibrationStatus:'DEFERRED',favoriteTeamId:state.frozenPrior?.favoriteTeamId??state.input?.favoriteTeamId??null};
}
