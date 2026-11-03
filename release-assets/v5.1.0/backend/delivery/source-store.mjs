import {hash,createProjectionWriter} from './projection.mjs';
import {createCommittedSourceConsumer} from './source-adapter.mjs';
export function createSourceStore({rpc}){
 const loadCommittedRevision=async(sessionId,revision)=>{
  const source=await rpc('load_source',{p_session_id:sessionId,p_version:revision});
  if(!source)throw Error('SOURCE_REVISION_UNAVAILABLE');
  source.commits=source.commits.map(c=>({...c,eventCount:c.events.length,eventHash:hash(c.events)}));
  return source;
 };
 const consume=createCommittedSourceConsumer({loadCommittedRevision,writeProjection:createProjectionWriter({rpc})});
 return {
  loadCommittedRevision,
  commit:({sessionId,expectedVersion,engineVersion,games,events,requestId})=>rpc('commit_source',{p_session_id:sessionId,p_expected_version:expectedVersion,p_engine_version:engineVersion,p_games:games,p_events:events,p_request_id:requestId}),
  sourceVersion:(sessionId,gameId)=>rpc('source_version',{p_session_id:sessionId,p_game_id:gameId}),
  async recover(sessionId,{maxRevisions=100}={}){
   if(!Number.isSafeInteger(maxRevisions)||maxRevisions<1||maxRevisions>100)throw Error('INVALID_RECOVERY_LIMIT');
   let recovered=0;
   for(;recovered<maxRevisions;recovered++){
    const revision=await rpc('pending_source',{p_session_id:sessionId});
    if(revision===null)return {recovered,caughtUp:true};
    await consume(sessionId,revision);
   }
   return {recovered,caughtUp:(await rpc('pending_source',{p_session_id:sessionId}))===null};
  }
 };
}
