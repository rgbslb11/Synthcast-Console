import postgres from 'npm:postgres@3.4.5';
import {createWpStore} from './probability/store.mjs';
import {createWpPipeline} from './probability/pipeline.mjs';
import {createSourceStore} from './delivery/source-store.mjs';
import {createReportingTransport} from './delivery/supabase-adapter.mjs';
const sessionId='qa-v510-wp-load-r3';
Deno.serve(async req=>{
 if(req.method!=='POST')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405});
 const token=req.headers.get('x-wp-worker-token');
 if(!token||!/^[a-f0-9]{64}$/.test(token))return Response.json({error:'UNAUTHORIZED'},{status:401});
 const url=Deno.env.get('SUPABASE_DB_URL');
 if(!url){console.error('WP_DATABASE_CONFIGURATION_MISSING');return Response.json({error:'BACKEND_UNAVAILABLE'},{status:503});}
 const sql=postgres(url,{prepare:false,max:1,connect_timeout:10,idle_timeout:5});let tx;
 const query=async(q,a=[])=>({rows:await (tx??sql).unsafe(q,a.map(v=>typeof v==='string'&&/^[{[]/.test(v)?sql.json(JSON.parse(v)):v))});
 const transaction=fn=>sql.begin(async s=>{tx=s;try{return await fn();}finally{tx=undefined;}});
 try{
  const allowed=await sql.unsafe("select exists(select 1 from vault.decrypted_secrets where name='gamecast_v510_wp_worker_token' and decrypted_secret=$1) ok",[token]);
  if(!allowed[0].ok)return Response.json({error:'UNAUTHORIZED'},{status:401});
  const locked=await sql.unsafe("select pg_try_advisory_lock(hashtextextended('wp-worker/'||$1,0)) ok",[sessionId]);
  if(!locked[0].ok)return Response.json({skipped:'WORKER_BUSY'});
  try{
   const head=await sql.unsafe('select state_version from gamecast_v510.source_heads where session_id=$1',[sessionId]);
   if(!head.length)return Response.json({status:'WAITING_FOR_QA_SOURCE',sessionId});
   const t=createReportingTransport({url:Deno.env.get('SUPABASE_URL'),publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),gateway:true});
   const source=createSourceStore({rpc:t.rpc}),store=createWpStore({query,transaction});
   const pipeline=createWpPipeline({store,readSource:source.loadCommittedRevision,sourceVersion:async sid=>Number((await query('select state_version from gamecast_v510.source_heads where session_id=$1',[sid])).rows[0].state_version)});
   return Response.json(await pipeline.sample(sessionId,()=>new Date().toISOString()));
  }finally{await sql.unsafe("select pg_advisory_unlock(hashtextextended('wp-worker/'||$1,0))",[sessionId]);}
 }catch(e){console.error('WP_WORKER_FAILURE',e.code??e.name);return Response.json({error:'BACKEND_UNAVAILABLE'},{status:503});}
 finally{await sql.end({timeout:5});}
});