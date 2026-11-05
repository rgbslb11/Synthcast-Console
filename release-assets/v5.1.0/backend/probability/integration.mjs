import {createQaController} from '../delivery/controller.mjs';
import {createWpStore} from './store.mjs';
import {createWpPipeline} from './pipeline.mjs';
import {createWpHandler} from './http.mjs';
import {createWpSampler} from './sampler.mjs';
// Composition root for the backend owner. No deployment or timer starts implicitly.
export function createWpBackend({query,transaction,rpc,authenticate,authorize,allowedOrigins,listSessions,clock=()=>new Date().toISOString(),onRecoveryError=()=>{}}){
 const store=createWpStore({query,transaction}),source=createQaController({rpc,clock});
 const pipeline=createWpPipeline({store,readSource:source.store.loadCommittedRevision,sourceVersion:async sessionId=>{
  const row=(await query('select state_version from gamecast_v510.source_heads where session_id=$1',[sessionId])).rows[0];
  if(!row)throw Error('SOURCE_REVISION_UNAVAILABLE');return Number(row.state_version);
 }});
 const controller={...source,async execute(request){
  const receipt=await source.execute(request);
  // Football is already committed. A WP failure leaves read-side pending/block
  // evidence and durable source work; never rerun football to recover analytics.
  try{await pipeline.recover(request.sessionId);}catch(error){onRecoveryError({sessionId:request.sessionId,code:error.message});}
  return receipt;
 }};
 return {controller,store,pipeline,handler:createWpHandler({allowedOrigins,authenticate,authorize,store}),sweep:createWpSampler({pipeline,listSessions,clock})};
}
