import {DatabaseStore} from './src/database-store.mjs';
import {createEngineOperations} from './src/engine-operations.mjs';
import * as engine from './runtime/engine.mjs';
import {SecurityError,sha256} from './security/security-core.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'POST_REQUIRED'},405);
 const token=req.headers.get('x-gamecast-recovery-token')||'';
 if(!/^[a-f0-9]{64}$/.test(token))return json({error:'FORBIDDEN'},403);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const rpc=async(name,args={})=>{
  const response=await fetch(url+'/rest/v1/rpc/recovery_probe_rpc',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'content-type':'application/json','Content-Profile':'gamecast_v501','Accept-Profile':'gamecast_v501'},body:JSON.stringify({p_token:token,p_name:name,p_args:args}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  if(!response.ok){const message=String(data?.message||'');throw new SecurityError(message.includes('idempotency conflict')?'IDEMPOTENCY_CONFLICT':'RECOVERY_RPC_REJECTED',409);}
  return data;
 };
 try{if(await rpc('authorize')!==true)return json({error:'FORBIDDEN'},403);}catch{return json({error:'FORBIDDEN'},403);}
 const began=performance.now(),check=(ok,message)=>{if(!ok)throw Error(message);};
 try{
  const slug='w7v501-0000000000000001',store=new DatabaseStore({rpc});
  const before=await store.snapshot(slug),stamp=new Date(Date.parse(before.lastAdvancedAt)+1000).toISOString();
  const ops=createEngineOperations({engine,clock:()=>stamp}),expected=structuredClone(before);
  await ops.advance(expected,{seconds:1});
  const request={probe:'saved-R2-edge-recovery',seconds:1};
  const input={slug,actorId:'SCHEDULER',idempotencyKey:'recovery-r2-edge-probe-20261014',request,expectedVersion:before.stateVersion,mutate:d=>ops.advance(d,{seconds:1})};
  const saved=await store.commit(input);check(saved.state_version===before.stateVersion+1&&!saved.replayed,'FIRST_COMMIT_FAILED');
  const replay=await store.commit({...input,mutate:()=>{throw Error('REPLAY_MUTATED')}});
  check(replay.replayed&&replay.state_version===saved.state_version,'REPLAY_FAILED');
  let conflict=false;try{await store.commit({...input,request:{probe:'changed-input'}});}catch(e){if(e.code==='IDEMPOTENCY_CONFLICT')conflict=true;else throw e;}
  check(conflict,'CONFLICT_NOT_REJECTED');
  const after=await store.snapshot(slug);check(after.stateVersion===saved.state_version,'REOPEN_VERSION_FAILED');
  check(sha256(after.state)===sha256(expected.state),'ENGINE_CONTINUATION_MISMATCH');
  check(sha256(after.finals)===sha256(before.finals),'FINAL_PAYLOAD_CHANGED');
  const pub=await store.read(slug);check(pub.state.length===54,'PUBLIC_BOARD_FAILED');
  return json({passed:true,scope:'Separately deployed Edge verifier using unchanged deployed application modules and restored Postgres runtime tables',beforeVersion:before.stateVersion,afterVersion:after.stateVersion,exactEngineContinuation:true,commitPersisted:true,replayExactlyOnce:true,conflictRejected:true,reopenedPublicGames:pub.state.length,finalsPreserved:after.finals.length,durationMs:Math.round(performance.now()-began)});
 }catch(e){return json({passed:false,error:e.code||e.message||'RECOVERY_FAILED'},500);}
});
