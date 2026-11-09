import {configuration,configuredRuntime,transport,origins} from './configured-runtime.mjs';
import {verifyGithubOIDC} from './oidc.mjs';
import {sequences} from './sequences.mjs';
import {OPERATING_SLATE} from '../runtime/week12.mjs';
import {TEAM_POWER} from '../runtime/power.mjs';
import {sha256} from '../security/security-core.mjs';
const origin=origins[1],deadline=Date.parse('2026-11-11T00:00:00Z');
const json=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
async function authRequest(path,body,admin=false){
 const c=configuration();const r=await fetch(c.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:admin?c.serviceKey:c.publishableKey,...(admin?{Authorization:'Bearer '+c.serviceKey}:{}),'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});
 const data=await r.json();if(!r.ok)throw Error('QA_AUTH_'+r.status+'_'+String(data.code||data.error_code||'FAILED'));return data;
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  if(Date.now()>deadline)return json({error:'QA_HARNESS_EXPIRED'},410);
  const claims=await verifyGithubOIDC((req.headers.get('authorization')||'').replace(/^Bearer /,''));
  const key=claims.run_id+'-'+claims.run_attempt,t=transport(),runtime=configuredRuntime();
  const raw=await req.text();if(raw.length>16000)return json({error:'BODY_TOO_LARGE'},413);const body=JSON.parse(raw);
  if(body.action==='bootstrap'){
   if(await t.rpc('qa_lookup_run',{p_run_key:key}))return json({error:'QA_RUN_ALREADY_BOOTSTRAPPED'},409);
   const password=crypto.randomUUID()+crypto.randomUUID(),email='gc507-'+key+'@qa.invalid';
   const created=await authRequest('admin/users',{email,password,email_confirm:true,user_metadata:{qa_only:true,purpose:'GameCast507 isolated tests'}},true);
   const userId=created.id||created.user?.id;if(!userId)throw Error('QA_USER_MISSING');
   await t.rpc('qa_register_run',{p_run_key:key,p_user_id:userId,p_source_sha:claims.sha});
   const auth=await authRequest('token?grant_type=password',{email,password});
   const response=await runtime.chairmanHandler(new Request(origin+'/?api=create',{method:'POST',headers:{origin,authorization:'Bearer '+auth.access_token,'content-type':'application/json','idempotency-key':'qa507-create-'+key},body:'{}'}));
   const data=await response.json();if(!response.ok)throw Error('QA_CREATE_'+data.error);
   await t.rpc('qa_bind_session',{p_run_key:key,p_slug:data.public_slug});
   return json({public_slug:data.public_slug,user_id:userId,access_token:auth.access_token,refresh_token:auth.refresh_token,expires_at:Math.floor(Date.now()/1000)+auth.expires_in,projectUrl:configuration().url,publishableKey:configuration().publishableKey,publicApi:configuration().url+'/functions/v1/gamecast-week12-v5-0-7-qa-public',chairmanApi:configuration().url+'/functions/v1/gamecast-week12-v5-0-7-qa-chairman'});
  }
  const run=await t.rpc('qa_lookup_run',{p_run_key:key});if(!run||!run.public_slug||run.finished_at||run.source_sha!==claims.sha)return json({error:'QA_RUN_UNAVAILABLE'},403);
  const slug=run.public_slug;
  if(body.action==='finish'){await t.rpc('qa_finish_run',{p_run_key:key});return json({status:'QA_OPERATOR_DISABLED',public_slug:slug});}
  let snapshot=await runtime.store.snapshot(slug);
  if(body.action==='snapshot'){
   const g=snapshot.state[0];return json({version:snapshot.stateVersion,stateHash:sha256(snapshot.state),games:snapshot.state.length,qaOnly:snapshot.state.every(g=>g.qaOnly===true),gameId:g.id,sourceGameId:g.qaReplaySourceGameId,fieldPos:g.fieldPos,possession:g.possession,scores:g.scores,history:g.history,lastPlay:g.lastPlay,allFinal:snapshot.state.every(g=>g.lifecycle==='FINAL_PENDING'),allScores:snapshot.state.map(g=>({id:g.id,lifecycle:g.lifecycle,away:runtime.engine.total(g,0),home:runtime.engine.total(g,1)}))});
  }
  if(!['checkpoint','followup','full_board'].includes(body.action))return json({error:'QA_ACTION_INVALID'},400);
  // Commit the supported purge first, so locked-weather and run-lineage guards
  // remain intact. Checkpoint installation never rewrites a prior run's events.
  if(body.action==='checkpoint'||body.action==='full_board'){
   await runtime.store.commit({slug,actorId:run.user_id,idempotencyKey:'qa507-reset-'+crypto.randomUUID(),expectedVersion:snapshot.stateVersion,request:{body:{command:'qa_reset',action:body.action}},mutate:async draft=>{
    const events=[];for(const g of body.action==='full_board'?draft.state:[draft.state[0]])events.push(...(await runtime.operations.executeCommand(draft,{id:g.id,command:'purge_new_seed',payload:{confirmed:true,note:'Isolated QA new run'}})).events);
    return {events};
   }});snapshot=await runtime.store.snapshot(slug);
  }
  const result=await runtime.store.commit({slug,actorId:run.user_id,idempotencyKey:'qa507-'+body.action+'-'+crypto.randomUUID(),expectedVersion:snapshot.stateVersion,request:{body:{command:'qa_harness',action:body.action,scenario:body.scenario??null}},mutate:async draft=>{
   const events=[];let g=draft.state[0];
   if(body.action==='checkpoint'){
    if(!Number.isInteger(body.scenario)||body.scenario<0||body.scenario>=sequences.length)throw Error('QA_SCENARIO');
    const seq=sequences[body.scenario],r=seq.records[0];
    Object.assign(g,{qaReplaySourceGameId:seq.gameId,qaReplayScenario:body.scenario,lifecycle:'ACTIVE',activity:'LIVE',auto:false,possession:r.team,fieldPos:r.preSnap.fieldPos,down:r.preSnap.down,distance:r.preSnap.distance,quarter:Number(seq.period),activePeriod:seq.period,period:['1st','2nd','3rd','4th'][Number(seq.period)-1],scoreboardSeconds:r.clock+1,glSeconds:r.gl-1});
    g.away.name=seq.away;g.home.name=seq.home;
    g.pendingPlay={team:r.team,strategy:'NORMAL',yards:r.yards,points:0,turnover:false,punt:true,fg:false,first:false,inBounds:false,incomplete:false,desc:r.desc,edgeAtSnap:0,phase:'PLAY',remaining:1,playSec:7,clockBefore:r.clock+7};
    g.lastPlay='QA checkpoint · '+seq.gameId+' · punt pending';
    draft.lastAdvancedAt=new Date().toISOString();
   }else if(body.action==='followup'){
    const seq=sequences[g.qaReplayScenario];if(!seq||!g.history.length)throw Error('QA_CHECKPOINT_REQUIRED');g.pendingPlay=null;
    for(const r of seq.records.slice(1)){
     const p={team:r.team,strategy:r.strategy,yards:r.yards,points:0,turnover:false,punt:false,fg:false,first:r.yards>=g.distance,inBounds:r.desc.includes('in bounds')||r.desc.includes('Sack'),incomplete:r.desc==='Incomplete pass',desc:r.originalDescription||r.desc,edgeAtSnap:0};
     g.scoreboardSeconds=r.clock;runtime.engine.applyPlay(g,p);
     events.push({type:'V507_FOOTBALL_RECORD',gameId:g.id,payload:structuredClone(g.history.at(-1))});
    }draft.lastAdvancedAt=new Date().toISOString();
   }else{
    for(const [i,s] of OPERATING_SLATE.entries()){
     g=draft.state[i];
     g.away={name:s.away,record:''};g.home={name:s.home,record:''};g.awayPower=TEAM_POWER[s.away];g.homePower=TEAM_POWER[s.home];delete g.qaReplaySourceGameId;delete g.qaReplayScenario;
     g.seedHex=String(i+507).padStart(32,'0');g.rngState=runtime.engine.seedWords(g.seedHex,g.id);
     events.push(...(await runtime.operations.executeCommand(draft,{id:g.id,command:'launch',payload:{}})).events);g.auto=true;g.speed=50;
    }
    const advanced=await runtime.operations.advance(draft,{seconds:400});events.push(...advanced.events);
    if(!draft.state.every(g=>g.lifecycle==='FINAL_PENDING'&&g.qaOnly))throw Error('QA_FULL_BOARD_INCOMPLETE');
   }
   events.push({type:'V507_QA_'+body.action.toUpperCase(),gameId:null,payload:{qaOnly:true,runKey:key,sourceSha:claims.sha,scenario:body.scenario??null}});
   return {events};
  }});
  return json({state_version:result.state_version,public_slug:slug,status:'QA_'+body.action.toUpperCase()});
 }catch(e){return json({error:String(e.message||'QA_FAILED')},String(e.message).startsWith('OIDC_')?403:500);}
});
