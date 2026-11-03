import * as engine from '../../../v5.0.6-week11/backend/runtime/engine.mjs';
import {createEngineOperations} from '../../../v5.0.6-week11/backend/src/engine-operations.mjs';
import {createSourceStore} from './source-store.mjs';
import {hash,requireScope} from './projection.mjs';
// Server-only caller. Uses retained football mechanics; no public raw-state write.
export function createQaController({rpc,clock=()=>new Date().toISOString()}){
 const store=createSourceStore({rpc}),ops=createEngineOperations({engine,clock});
 return {store,
  async execute({sessionId,actorId,requestId,expectedVersion,actions}){
   if(typeof actorId!=='string'||!actorId||typeof requestId!=='string'||requestId.length<16||requestId.length>128||!Number.isSafeInteger(expectedVersion)||expectedVersion<0||!Array.isArray(actions)||actions.length<1||actions.length>112)throw Error('INVALID_REQUEST');
   requireScope(sessionId,actions.find(a=>a?.id)?.id??'G0000');
   const key=hash([actorId,requestId]),fingerprint=hash({sessionId,actorId,expectedVersion,actions});
   const prior=await rpc('lookup_source_request',{p_session_id:sessionId,p_request_id:key});
   if(prior){if(prior.requestHash!==fingerprint)throw Error('IDEMPOTENCY_CONFLICT');await store.recover(sessionId);return {stateVersion:prior.stateVersion,replayed:true};}
   const source=await store.loadCommittedRevision(sessionId,expectedVersion);
   const draft={state:structuredClone(source.games)},events=[];
   for(const action of actions){
    if(!action||typeof action!=='object'||['accept','power','purge_new_seed'].includes(action.command))throw Error('QA_COMMAND_DENIED');
    const result=action.command==='advance'?await ops.advance(draft,{seconds:action.seconds}):await ops.executeCommand(draft,action);
    for(const e of result.events){if(e.type==='V506_FOOTBALL_RECORD')continue;events.push({gameId:e.gameId,command:e.type.slice('V506_'.length).toLowerCase(),requestHash:fingerprint});}
   }
   let receipt;
   try{receipt=await store.commit({sessionId,expectedVersion,engineVersion:source.engineVersion,games:draft.state,events,requestId:key});}
   catch(error){const committed=await rpc('lookup_source_request',{p_session_id:sessionId,p_request_id:key});if(!committed||committed.requestHash!==fingerprint)throw error;receipt={stateVersion:committed.stateVersion,replayed:true};}
   await store.recover(sessionId);return receipt;
  }
 };
}
