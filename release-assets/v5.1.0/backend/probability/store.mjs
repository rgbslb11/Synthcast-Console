import {readWpSnapshot} from './read-snapshot.mjs';
import {hash,requireScope} from '../delivery/projection.mjs';
import {compactView,validatePrior} from './observer.mjs';
import {captureGame} from './capture.mjs';
// query and transaction must be trusted server-side SQL adapters on one connection.
export function createWpStore({query,transaction}){
 const one=async(sql,args)=>(await query(sql,args)).rows[0];
 const load=async sid=>(await query('select game_id,state from gamecast_v510.wp_heads where session_id=$1',[sid])).rows;
 return {load,
  async prior(sid,gid,run,revision){const r=await one('select prior from gamecast_v510.wp_priors where session_id=$1 and game_id=$2 and run_id=$3 and source_version<$4 order by revision desc limit 1',[sid,gid,run,revision]);return r?.prior??null;},
  async setPrior({sessionId,gameId,userId,expectedVersion,requestId,prior}){requireScope(sessionId,gameId);if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||typeof requestId!=='string'||requestId.length<16||requestId.length>128)throw Error('INVALID_REQUEST');requestId=hash([userId,requestId]);return transaction(async()=>{
   await query("select pg_advisory_xact_lock(hashtextextended('source/'||$1,0))",[sessionId]);
   const allowed=await one('select gamecast_v510.authorize_reporting($1,$2) ok',[userId,sessionId]);if(!allowed?.ok)throw Error('CHAIRMAN_FORBIDDEN');
   const old=await one('select prior,revision,source_version from gamecast_v510.wp_priors where session_id=$1 and game_id=$2 and request_id=$3',[sessionId,gameId,requestId]);
   if(old){if(Number(old.source_version)!==expectedVersion)throw Error('IDEMPOTENCY_CONFLICT');if(JSON.stringify(old.prior)!==JSON.stringify(JSON.parse(JSON.stringify(prior)))){ // jsonb key order differs: compare in SQL
    const eq=await one('select $1::jsonb=$2::jsonb ok',[JSON.stringify(old.prior),JSON.stringify(prior)]);if(!eq.ok)throw Error('IDEMPOTENCY_CONFLICT');}return old;}
   const row=await one('select c.* from gamecast_v510.source_heads h join gamecast_v510.source_commits c using(session_id,state_version) where session_id=$1',[sessionId]);
   if(!row||Number(row.state_version)!==expectedVersion)throw Error('VERSION_CONFLICT');
   const g=row.games.find(x=>x.id===gameId);if(!g||g.lifecycle!=='UNLAUNCHED')throw Error('PREGAME_FROZEN');
   validatePrior(prior,captureGame(g,{engineVersion:row.engine_version,stateVersion:expectedVersion,actionOrdinal:0,command:'pregame',observedAt:new Date(row.committed_at).toISOString()}));
   return one('insert into gamecast_v510.wp_priors(session_id,game_id,run_id,source_version,prior,request_id) values($1,$2,$3,$4,$5,$6) returning revision,prior',[sessionId,gameId,g.runId,expectedVersion,JSON.stringify(prior),requestId]);
  });},
  async progress(sid){return Number((await one('select source_version from gamecast_v510.wp_progress where session_id=$1',[sid]))?.source_version??-1);},
  async commit({sessionId,requestId,sourceVersion,expectedProgress,updates}){return transaction(async()=>{
   await query("select pg_advisory_xact_lock(hashtextextended('wp/'||$1,0))",[sessionId]);
   const body=JSON.stringify({sourceVersion,expectedProgress,updates});
   const old=await one('select response,body=$3::jsonb equal from gamecast_v510.wp_receipts where session_id=$1 and request_id=$2',[sessionId,requestId,body]);
   if(old){if(!old.equal)throw Error('IDEMPOTENCY_CONFLICT');return old.response;}
   const version=Number((await one('select source_version from gamecast_v510.wp_progress where session_id=$1',[sessionId]))?.source_version??-1);
   if(version!==expectedProgress)throw Error('VERSION_CONFLICT');
   for(const {record,state} of updates){requireScope(sessionId,record.gameId);if(record.sessionId!==sessionId)throw Error('IDENTITY_MISMATCH');
    const dup=await one('select record=$5::jsonb equal from gamecast_v510.wp_records where session_id=$1 and game_id=$2 and run_id=$3 and event_id=$4 and model_id=$6',[sessionId,record.gameId,record.runId,record.eventId,JSON.stringify(record),record.modelId]);
    if(dup){if(!dup.equal)throw Error('HISTORY_EVENT_CONFLICT');continue;}
    const n=Number((await one('select sequence from gamecast_v510.wp_heads where session_id=$1 and game_id=$2',[sessionId,record.gameId]))?.sequence??0)+1;
    await query('insert into gamecast_v510.wp_records values($1,$2,$3,$4,$5,$6,$7)',[sessionId,record.gameId,n,record.runId,record.eventId,record.modelId,JSON.stringify(record)]);
    await query('insert into gamecast_v510.wp_heads values($1,$2,$3,$4) on conflict(session_id,game_id) do update set state=excluded.state,sequence=excluded.sequence',[sessionId,record.gameId,JSON.stringify({...state,observationSequence:n}),n]);
   }
   await query('insert into gamecast_v510.wp_progress values($1,$2) on conflict(session_id) do update set source_version=excluded.source_version',[sessionId,sourceVersion]);
   const response={sourceVersion,records:updates.length};await query('insert into gamecast_v510.wp_receipts values($1,$2,$3,$4)',[sessionId,requestId,body,JSON.stringify(response)]);return response;
  });},
  read: args=>readWpSnapshot(query,args)
 };
}
