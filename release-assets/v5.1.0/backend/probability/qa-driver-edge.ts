import {createQaController} from '../delivery/controller.mjs';
import {captureGame} from './capture.mjs';
import postgres from 'npm:postgres@3.4.5';
import {createWpStore} from './store.mjs';
import {createWpPipeline} from './pipeline.mjs';
import {createSourceStore} from '../delivery/source-store.mjs';
import {createReportingTransport} from '../delivery/supabase-adapter.mjs';
const sessionId='qa-v510-wp-hosted-r2';
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
   const operation=await req.json();
   if(operation.qaAction==='auth_checks'){
    const base=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');
    let uid,token;const results=[];
    const call=async(path,method,body,bearer=key,apikey=key,extra={})=>{const r=await fetch(base+path,{method,headers:{apikey,Authorization:'Bearer '+bearer,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json().catch(()=>null)};};
    const check=(name,ok)=>{results.push({name,pass:!!ok});if(!ok)throw Error(name);};
    try{
     const email='wp-qa-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomUUID()+crypto.randomUUID();
     const user=await call('/auth/v1/admin/users','POST',{email,password,email_confirm:true});uid=user.body?.id;check('temporary identity',user.status===200&&uid);
     const login=await call('/auth/v1/token?grant_type=password','POST',{email,password},anon,anon);token=login.body?.access_token;check('login',login.status===200&&token);
     const path='/functions/v1/gamecast-v5-1-0-qa-wp?session='+sessionId+'&game=G0503&limit=1';
     const read=()=>call(path,'GET',undefined,token,anon,{Origin:'https://rgbslb11.github.io'});
     check('ungranted denial',(await read()).status===403);
     await query('insert into gamecast_v510.reporting_grants values($1,$2,true)',[sessionId,uid]);
     const first=await read();check('authorized read',first.status===200&&first.body.points.length===1);
     const page=await call(path+'&after='+first.body.nextSequence+'&run='+encodeURIComponent(first.body.summary.runId)+'&through='+first.body.highWatermark,'GET',undefined,token,anon,{Origin:'https://rgbslb11.github.io'});
     check('bound pagination',page.status===200&&page.body.nextSequence>first.body.nextSequence&&page.body.highWatermark===first.body.highWatermark);
     const frozen=await call(path,'POST',{expectedVersion:4,prior:{}},token,anon,{Origin:'https://rgbslb11.github.io','Idempotency-Key':'qa-freeze-'+crypto.randomUUID()});
     check('prior frozen',frozen.status===409&&frozen.body.error==='PREGAME_FROZEN');
    }catch(e){results.push({error:e.message});}
    finally{
     if(uid){await query('delete from gamecast_v510.reporting_grants where session_id=$1 and user_id=$2',[sessionId,uid]);}
     if(token){const r=await call('/auth/v1/logout','POST',{},token,anon);results.push({logout:r.status});}
     if(uid){const r=await call('/auth/v1/admin/users/'+uid,'DELETE');results.push({deleteIdentity:r.status});}
    }
    return Response.json({results});
   }
   if(operation.qaAction){
    const actors=await query('select user_id from gamecast_v510.reporting_grants where session_id=$1 and active',[sessionId]);
    if(actors.rows.length!==1)throw Error('QA_ACTOR_REQUIRED');
    const actorId=actors.rows[0].user_id;
    const version=Number((await query('select state_version from gamecast_v510.source_heads where session_id=$1',[sessionId])).rows[0].state_version);
    if(operation.qaAction==='fixture_priors'){
     const src=await source.loadCommittedRevision(sessionId,version);
     for(const g of src.games){
      const c=captureGame(g,{engineVersion:src.engineVersion,stateVersion:version,actionOrdinal:0,command:'pregame',observedAt:new Date().toISOString()});
      await store.setPrior({sessionId,gameId:g.id,userId:actorId,expectedVersion:version,requestId:'hosted-qa-prior-fixture-v1',prior:{favoriteTeamId:g.homeCode,otherTeamId:g.awayCode,pregameMargin:7,source:{kind:'QA_FIXTURE',id:'hosted-wp-integration-only',sampleCount:1,generatedAt:'2026-11-05T00:00:00Z',contextHash:c.contextHash}}});
     }
    }else if(operation.qaAction==='commands'){
     await createQaController({rpc:t.rpc}).execute({sessionId,actorId,requestId:operation.requestId,expectedVersion:operation.expectedVersion,actions:operation.actions});
    }else throw Error('QA_ACTION_DENIED');
   }
   const pipeline=createWpPipeline({store,readSource:source.loadCommittedRevision,sourceVersion:async sid=>Number((await query('select state_version from gamecast_v510.source_heads where session_id=$1',[sid])).rows[0].state_version)});
   return Response.json(await pipeline.sample(sessionId,()=>new Date().toISOString()));
  }finally{await sql.unsafe("select pg_advisory_unlock(hashtextextended('wp-worker/'||$1,0))",[sessionId]);}
 }catch(e){console.error('WP_WORKER_FAILURE',e.code??e.name);return Response.json({error:'BACKEND_UNAVAILABLE'},{status:503});}
 finally{await sql.end({timeout:5});}
});