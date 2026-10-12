import {SecurityError,requireSessionSlug,requireExpectedVersion,requireIdempotencyKey,sha256,persistedRead,publicGame,composeDisplayBoard,ACTIVE_GAME_IDS} from '../security/security-core.mjs';
const one=rows=>Array.isArray(rows)?rows[0]:rows;
const secrets=new Set(['seedHex','rngState','coinTossAudit','history','runHistory','pendingPlay','pendingRandom','operatorToken','operator_token','operator_token_hash','schedulerSecret','editSnapshot','awayPower','homePower']);
export function chairmanGame(value){
  if(Array.isArray(value))return value.map(chairmanGame);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([k])=>!secrets.has(k)).map(([k,v])=>[k,chairmanGame(v)]));
}
function weatherChangeAllowedForPurge(old,next,events){
  if(!old.weather?.locked||next?.lifecycle!=='UNLAUNCHED'||next.weather?.locked!==false||next.weather?.lockedAtZulu!==null||next.weather?.snapshotId!==null)return false;
  const config=weather=>Object.fromEntries(Object.entries(weather??{}).filter(([key])=>!['locked','lockedAtZulu','snapshotId'].includes(key)));
  return sha256(config(old.weather))===sha256(config(next.weather))&&events.some(event=>event?.type==='V500_PURGE_NEW_SEED'&&event?.gameId===old.id);
}
export function validateCommit(before,draft,events){
  if(draft.state.length!==41||draft.state.some((g,i)=>g.id!==ACTIVE_GAME_IDS[i]))throw new SecurityError('ACTIVE_IDENTITY_INVALID',400);
  composeDisplayBoard(draft.finals,draft.state);
  for(const k of ['sessionId','publicSlug','ownerUserId','weekKey','engineVersion','dataVersion','stateVersion'])if(before[k]!==draft[k])throw new SecurityError('SESSION_IDENTITY_CHANGED',409);
  if(sha256(before.finals)!==sha256(draft.finals))throw new SecurityError('IMMUTABLE_FINALS_CHANGED',409);
  for(const old of before.state){const next=draft.state.find(g=>g.id===old.id);if(old.weather?.locked&&sha256(old.weather)!==sha256(next.weather)&&!weatherChangeAllowedForPurge(old,next,events))throw new SecurityError('LOCKED_WEATHER_CHANGED',409);}
  if(!Array.isArray(events)||!events.length)throw new SecurityError('AUDIT_EVENTS_REQUIRED',400);
  for(const e of events){if(!/^V500_[A-Z0-9_]+$/.test(e.type??''))throw new SecurityError('EVENT_TYPE_INVALID',400);if(/"(seedHex|rngState|operatorToken|operator_token|operator_token_hash|schedulerSecret|pendingRandom)"\s*:/.test(JSON.stringify(e)))throw new SecurityError('PRIVATE_EVENT_FIELD',400);}
}
export class DatabaseStore{
  constructor({rpc,clock=()=>new Date().toISOString()}){this.rpc=rpc;this.clock=clock;}
  async snapshot(slug){
    requireSessionSlug(slug);
    const [rows,finals]=await Promise.all([this.rpc('read_session',{p_slug:slug}),this.rpc('read_final_snapshots',{})]);
    const row=one(rows);if(!row)throw new SecurityError('SESSION_NOT_FOUND',404);
    if(row.public_slug!==slug||row.week_key!=='2026-W07'||row.engine_version!=='GC-W7-V5.0.0-RC1')throw new SecurityError('SESSION_NOT_FOUND',404);
    composeDisplayBoard(finals,row.state);
    return {sessionId:row.session_id,publicSlug:slug,ownerUserId:row.owner_user_id,weekKey:row.week_key,engineVersion:row.engine_version,dataVersion:row.data_version,stateVersion:Number(row.state_version),state:row.state,finals,lastAdvancedAt:row.last_advanced_at};
  }
  async read(slug,{operator=false}={}){
    const session=await this.snapshot(slug),out=persistedRead(session,{operator});
    out.state=out.state.map(operator?chairmanGame:publicGame);out.master_zulu=this.clock();out.operator=operator;out.data_version=session.dataVersion;
    out.governance={games:54,active_games:41,power_ready:session.state.filter(g=>g.powerReady).length,power_pending:session.state.filter(g=>!g.powerReady).length};
    return out;
  }
  response(row,finals,operator){
    const r=row.response??row;
    return {...r,state:composeDisplayBoard(finals,r.state).map(operator?chairmanGame:publicGame),replayed:row.replayed===true,master_zulu:this.clock()};
  }
  async commit({slug,actorId,idempotencyKey,request,expectedVersion,mutate}){
    requireSessionSlug(slug);requireExpectedVersion(expectedVersion);requireIdempotencyKey(idempotencyKey);
    const current=await this.snapshot(slug),requestHash=sha256(request);
    const prior=one(await this.rpc('read_request',{p_session_id:current.sessionId,p_actor_id:actorId,p_idempotency_key:idempotencyKey,p_request_hash:requestHash}));
    if(prior)return this.response({...prior,replayed:true},current.finals,actorId!=='SCHEDULER');
    if(current.stateVersion!==expectedVersion)throw new SecurityError('VERSION_CONFLICT',409);
    const draft=structuredClone(current),result=await mutate(draft);
    validateCommit(current,draft,result?.events);
    const row=one(await this.rpc('commit_state',{p_session_id:current.sessionId,p_expected_version:expectedVersion,p_state:draft.state,p_events:result.events,p_actor_id:actorId,p_idempotency_key:idempotencyKey,p_request_hash:requestHash,p_stamp:draft.lastAdvancedAt}));
    if(!row?.response)throw new SecurityError('BACKEND_RESPONSE_INVALID',502);
    return this.response(row,current.finals,actorId!=='SCHEDULER');
  }
}

