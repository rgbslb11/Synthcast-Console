import postgres from 'npm:postgres@3.4.5';
import * as engine from './runtime/engine.mjs';
import {createEngineOperations} from './src/engine-operations.mjs';
import {createWpStore} from './probability/store.mjs';
import {createWpPipeline} from './probability/pipeline.mjs';
import {captureGame} from './probability/capture.mjs';
import {compactView} from './probability/observer.mjs';
import {buildProjection,hash} from './delivery/projection.mjs';

const session='w14v510-production';
const origin='https://rgbslb11.github.io';
const base=Deno.env.get('SUPABASE_URL');
const anon=Deno.env.get('SUPABASE_ANON_KEY');
const schema='gamecast_v510_w14';
const commands=new Set(['launch','quarter_length','weather_set','auto','on_air','speed','pause','delay','resume_delay','score','clock_set','edit_begin','edit_cancel','edit_commit','end','lock','unlock','accept','reopen_live','restart_same_seed']);
const finals=new Set(['FINAL_PENDING','LOCKED','READY','FINAL']);
const clock=()=>new Date().toISOString();
const ops=createEngineOperations({engine,clock});

Deno.serve(async req=>{
 const url=new URL(req.url),action=url.searchParams.get('action')??'board',isWorker=action==='tick';
 const cors=req.headers.get('origin')===origin;
 const headers={'cache-control':'no-store',...(cors?{'access-control-allow-origin':origin,vary:'Origin'}:{})};
 const answer=(body,status=200)=>Response.json(body,{status,headers});
 if(req.method==='OPTIONS'&&cors)return new Response(null,{status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
 if(!isWorker&&req.headers.has('origin')&&!cors)return answer({error:'ORIGIN_DENIED'},403);
 if(!(req.method===(isWorker||action==='command'?'POST':'GET')))return answer({error:'METHOD_NOT_ALLOWED'},405);
 let actor='';
 if(!isWorker){
  const token=req.headers.get('authorization');
  if(!token?.startsWith('Bearer '))return answer({error:'AUTHENTICATION_REQUIRED'},401);
  const auth=await fetch(base+'/auth/v1/user',{headers:{Authorization:token,apikey:anon??''},redirect:'error',signal:AbortSignal.timeout(5000)}).catch(()=>null);
  if(!auth?.ok)return answer({error:'AUTHENTICATION_REQUIRED'},401);
  const user=await auth.json();
  if(!user.id||user.is_anonymous)return answer({error:'AUTHENTICATION_REQUIRED'},401);
  actor=user.id;
 }else if(!/^[a-f0-9]{64}$/.test(req.headers.get('x-gamecast-worker')??''))return answer({error:'AUTHENTICATION_REQUIRED'},401);
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{prepare:false,max:1,connect_timeout:5,idle_timeout:4});
 let tx;
 const query=async(q,args=[])=>({rows:await (tx??sql).unsafe(q,args.map(v=>typeof v==='string'&&/^[{[]/.test(v)?sql.json(JSON.parse(v)):v))});
 const transaction=(fn)=>sql.begin(async t=>{tx=t;try{return await fn();}finally{tx=undefined;}});
 const one=async(q,args=[]) => (await query(q,args)).rows[0];
 const revision=async()=>Number((await one(`select state_version from ${schema}.source_heads where session_id=$1`,[session]))?.state_version);
 const load=async(sid,v)=>{
  const row=await one(`select session_id, state_version, engine_version, committed_at, games, events
   from ${schema}.source_commits where session_id=$1 and state_version=$2`,[sid,v]);
  return row&&{sessionId:row.session_id,stateVersion:Number(row.state_version),engineVersion:row.engine_version,
   committedAt:new Date(row.committed_at).toISOString(),games:row.games,commits:[{events:row.events}]};
 };
 const store=createWpStore({query,transaction});
 const wp=createWpPipeline({store,readSource:load,sourceVersion:revision});
 try{
  if(isWorker){
   const allowed=await one("select exists(select 1 from vault.decrypted_secrets where name='gamecast_v510_w14_worker' and decrypted_secret=$1) ok",[req.headers.get('x-gamecast-worker')]);
   if(!allowed?.ok)return answer({error:'AUTHENTICATION_REQUIRED'},401);
  }else{
   const allowed=await one(`select ${schema}.authorize_reporting($1,$2) ok`,[actor,session]);
   if(!allowed?.ok)return answer({error:'CHAIRMAN_FORBIDDEN'},403);
  }
  const version=await revision(), source=await load(session,version);
  if(!source||source.engineVersion!==engine.ENGINE_VERSION)return answer({error:'WEEK14_SOURCE_UNAVAILABLE'},503);
  const gameId=url.searchParams.get('game');
  if(action==='board'){
   const games=source.games.map(g=>({id:g.id,away:g.away.name,home:g.home.name,network:g.network,kickoffET:g.kickoffET,kickoffZulu:g.kickoffZulu,lifecycle:g.lifecycle,activity:g.activity,speed:g.speed,auto:g.auto,onAir:g.onAir,operatorPaused:g.operatorPaused,score:[engine.total(g,0),engine.total(g,1)],quarterSeconds:g.quarterLengthSeconds,clockSeconds:g.scoreboardSeconds,glSeconds:g.glSeconds,period:g.activePeriod}));
   return answer({sessionId:session,stateVersion:version,masterZulu:clock(),games});
  }
  if(action==='wp'){
   if(!source.games.some(g=>g.id===gameId))return answer({error:'GAME_NOT_FOUND'},404);
   const data=await store.read({sessionId:session,gameId,userId:actor,after:Number(url.searchParams.get('after')??0),limit:Math.min(Number(url.searchParams.get('limit')??100),250),runId:url.searchParams.get('run'),highWatermark:url.searchParams.has('through')?Number(url.searchParams.get('through')):null});
   if(!data.summary.modelId)data.summary={...data.summary,sessionId:session,gameId,runId:source.games.find(g=>g.id===gameId).runId,modelId:'GC-WP-ILLUSTRATIVE-0.1.0',stateVersion:version};
   if(data.highWatermark==null)data.highWatermark=data.nextSequence;
   return answer(data);
  }
  if(action==='details'){
   const game=source.games.find(g=>g.id===gameId);
   if(!game)return answer({error:'GAME_NOT_FOUND'},404);
   const {rows:audit}=await query(`select c.state_version, e->>'command' command from ${schema}.source_commits c
    cross join lateral jsonb_array_elements(c.events) e where c.session_id=$1 and c.state_version<=$2
    and (e->>'gameId'=$3 or e->>'gameId' is null) order by c.state_version`,[session,version,gameId]);
   const commands=audit.map(row=>({stateVersion:Number(row.state_version),command:row.command}));
   const p=buildProjection({game,engineVersion:source.engineVersion,stateVersion:version,committedAt:source.committedAt,audit:{sessionId:session,gameId,throughStateVersion:version,complete:true,commands}});
   const after=Number(url.searchParams.get('after')??0),limit=Number(url.searchParams.get('limit')??100);
   if(!Number.isSafeInteger(after)||after<0||!Number.isSafeInteger(limit)||limit<1||limit>250)return answer({error:'INVALID_CURSOR'},400);
   const run=url.searchParams.get('run'),expected=url.searchParams.get('version');
   if(run&&run!==game.runId||expected&&Number(expected)!==version)return answer({...p.summary,availability:{status:'BLOCKED',reason:run!==game.runId?'RUN_CHANGED':'STATE_VERSION_CHANGED'}});
   const plays=p.plays.filter(x=>x.sequence>after).slice(0,limit);
   return answer({...p.summary,plays,nextSequence:plays.at(-1)?.sequence??after,hasMore:(plays.at(-1)?.sequence??after)<p.plays.length});
  }
  if(!(isWorker||action==='command'))return answer({error:'NOT_FOUND'},404);
  let body={};
  if(!isWorker){
   const raw=await req.text();
   if(new TextEncoder().encode(raw).length>16384)return answer({error:'BODY_TOO_LARGE'},413);
   try{body=JSON.parse(raw);}catch{return answer({error:'INVALID_JSON'},400);}
   if(!body||!commands.has(body.command)||!/^G\d{4}$/.test(body.id)||!Number.isSafeInteger(body.expectedVersion))return answer({error:'INVALID_COMMAND'},400);
  }
  const key=isWorker?'tick:'+Math.floor(Date.now()/5000):req.headers.get('idempotency-key')??'';
  if(!isWorker&&!/^[A-Za-z0-9._~-]{16,128}$/.test(key))return answer({error:'IDEMPOTENCY_REQUIRED'},400);
  const requestId=hash([actor,key]),fingerprint=hash(body);
  const result=await transaction(async()=>{
   await query("select pg_advisory_xact_lock(hashtextextended('source/'||$1,0))",[session]);
   const version=await revision(), source=await load(session,version);
   if(!source||source.engineVersion!==engine.ENGINE_VERSION)return {body:{error:'WEEK14_SOURCE_UNAVAILABLE'},status:503};
   const old=await one(`select ${schema}.lookup_source_request($1,$2) data`,[session,requestId]);
  if(old?.data){
   if(old.data.requestHash!==fingerprint)return {body:{error:'IDEMPOTENCY_CONFLICT'},status:409};
   return {body:{stateVersion:old.data.stateVersion,replayed:true},status:200};
  }
  if(!isWorker&&body.expectedVersion!==version){
   const controlCommands=['auto','on_air','pause','speed'];
   if(!controlCommands.includes(body.command)||body.expectedVersion<0||body.expectedVersion>version)
    return {body:{error:'VERSION_CONFLICT'},status:409};
   // Scheduler revisions are safe for mode controls only. Any intervening
   // command for this game requires the Chairman to review again.
   const stale=await one(`select exists(select 1 from ${schema}.source_commits c
    cross join lateral jsonb_array_elements(c.events) e
    where c.session_id=$1 and c.state_version>$2 and c.state_version<=$3 and e->>'gameId'=$4) changed`,
    [session,body.expectedVersion,version,body.id]);
   if(stale.changed)return {body:{error:'VERSION_CONFLICT'},status:409};
  }
  const now=clock();
  const elapsed=Math.floor((Date.parse(now)-Date.parse(source.committedAt))/1000);
  const hasRunning=source.games.some(g=>['ACTIVE','EDIT','DELAY'].includes(g.lifecycle));
  if(hasRunning&&(elapsed<0||elapsed>21600))return {body:{error:'PROGRESSION_INTERVAL_INVALID'},status:409};
  if(isWorker&&!hasRunning)return {body:{stateVersion:version},status:200};
  const draft={state:source.games};
  const events=[];
  function append(result){
   for(const e of result.events){
    if(e.type==='V508_FOOTBALL_RECORD')continue;
    const command=e.type.slice(5).toLowerCase();
    const games=e.gameId===null?draft.state:draft.state.filter(g=>g.id===e.gameId);
    const actionOrdinal=events.length;
    events.push({gameId:e.gameId,command,requestHash:fingerprint,wpCaptures:games.map(g=>captureGame(g,{engineVersion:source.engineVersion,stateVersion:version+1,actionOrdinal,command,observedAt:now}))});
   }
  }
  if(hasRunning&&elapsed>0)append(await ops.advance(draft,{seconds:elapsed}));
  if(!isWorker)append(await ops.executeCommand(draft,body));
  if(events.length){
   await one(`select ${schema}.commit_source($1,$2,$3,$4,$5,$6)`,[session,version,source.engineVersion,JSON.stringify(draft.state),JSON.stringify(events),requestId]);
  }
  return {body:{stateVersion:version+Number(events.length>0)},status:200};
  });
  if(isWorker&&result.status===200)await wp.sample(session,clock);
  return answer(result.body,result.status);
 }catch(e){
  const code=String(e?.code??e?.message??'BACKEND_ERROR');
  const message=String(e?.message??code);
  console.error('W14_REQUEST',action,code);
  if(['VERSION_CONFLICT','RUN_CHANGED','IDEMPOTENCY_CONFLICT','INVALID_CURSOR'].includes(message))return answer({error:message},409);
  if(typeof e?.status==='number'&&e.status>=400&&e.status<500)return answer({error:code},e.status);
  return answer({error:'BACKEND_UNAVAILABLE'},503);
 }finally{await sql.end({timeout:3});}
});
