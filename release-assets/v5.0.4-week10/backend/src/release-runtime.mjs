import * as engine from '../runtime/engine.mjs';
import {OPERATING_SLATE} from '../runtime/week10.mjs';
import {createSupabaseTransport} from './supabase-rest.mjs';
import {DatabaseStore} from './database-store.mjs';
import {createEngineOperations} from './engine-operations.mjs';
import {createPublicHandler,createChairmanHandler,createSchedulerHandler} from '../security/edge-boundaries.mjs';
import {sha256,composeDisplayBoard,SecurityError} from '../security/security-core.mjs';
/** @param {{url?:string,publishableKey?:string,serviceKey?:string,allowedOrigins:string[],schedulerSecret:string,clock?:()=>string,fetchImpl?:typeof fetch,transport?:any,writesEnabled?:()=>boolean}} options */
export function createReleaseRuntime({url,publishableKey,serviceKey,allowedOrigins,schedulerSecret,clock=()=>new Date().toISOString(),fetchImpl=fetch,transport,writesEnabled=()=>true}){
  const backend=transport??createSupabaseTransport({url,publishableKey,serviceKey,fetchImpl});
  if(!schedulerSecret||!Array.isArray(allowedOrigins)||!allowedOrigins.length)throw Error('Explicit origins and scheduler secret required');
  const store=new DatabaseStore({rpc:backend.rpc,clock}),operations=createEngineOperations({engine,clock});
  const requireWrites=()=>{if(writesEnabled()!==true)throw new SecurityError('RELEASE_WRITES_DISABLED',504);};
  const elapsed=(draft,command)=>{
    const seconds=Math.floor((Date.parse(clock())-Date.parse(draft.lastAdvancedAt))/1000);
    // Unlaunched and completed games have no football or GL time to catch up.
    // Keep the outage guard for every live, paused, delayed or editing game.
    if(Number.isSafeInteger(seconds)&&seconds>21600
      &&draft.state.length===56&&draft.state.every(g=>(g.lifecycle==='UNLAUNCHED'||engine.FINALISH.has(g.lifecycle))&&!g.auto&&!g.onAir))return 0;
    if(!Number.isSafeInteger(seconds)||seconds<0||seconds>21600)throw new SecurityError('PROGRESSION_INTERVAL_INVALID',409);
    return seconds;
  };
  async function executeCommand(draft,body){
    requireWrites();
    const tick=await operations.advance(draft,{seconds:elapsed(draft,body.command)});
    const result=await operations.executeCommand(draft,body);
    return {events:[...tick.events,...result.events]};
  }
  async function createSession({actorId,idempotencyKey,body}){
    requireWrites();
    if(Object.keys(body).length)throw new SecurityError('CREATE_INPUTS_FROZEN',400);
    const finals=await backend.rpc('read_final_snapshots',{});
    if(finals?.length!==0)throw new SecurityError('FINAL_EVIDENCE_NOT_READY',504);
    const state=OPERATING_SLATE.map(s=>({...engine.initialGame(s),qaOnly:false}));composeDisplayBoard(finals,state);
    if(finals.some(g=>g.qaOnly!==false))throw new SecurityError('FINAL_EVIDENCE_NOT_READY',504);
    const bytes=crypto.getRandomValues(new Uint8Array(8)),slug='w10v504-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    const rows=await backend.rpc('create_session',{p_owner_user_id:actorId,p_public_slug:slug,p_data_version:engine.DATA_VERSION,p_state:state,p_idempotency_key:idempotencyKey,p_request_hash:sha256({action:'create',body})});
    const row=Array.isArray(rows)?rows[0]:rows;if(!row?.response?.public_slug)throw new SecurityError('BACKEND_RESPONSE_INVALID',502);
    return {...await store.read(row.response.public_slug,{operator:true}),replayed:row.replayed===true};
  }
  return {store,engine,operations,
    publicHandler:createPublicHandler({allowedOrigins,store}),
    chairmanHandler:createChairmanHandler({allowedOrigins,store,authenticate:backend.authenticate,authorize:backend.authorize,createSession,executeCommand,beforeWrite:requireWrites}),
    schedulerHandler:createSchedulerHandler({secret:schedulerSecret,store,beforeWrite:requireWrites,advance:draft=>{requireWrites();return operations.advance(draft,{seconds:elapsed(draft)});}})};
}


