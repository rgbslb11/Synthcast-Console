import assert from 'node:assert/strict';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';

export const MAX_JSON_BYTES=64*1024;
export const SESSION_RE=/^w8v502-[a-f0-9]{16}$/;
export const IDEMPOTENCY_RE=/^[A-Za-z0-9._~-]{16,128}$/;
export const FINAL_GAME_IDS=Object.freeze([]);
export const ACTIVE_GAME_IDS=Object.freeze(["G0365","G0372","G0380","G0386","G0344","G0346","G0348","G0356","G0362","G0371","G0350","G0339","G0341","G0347","G0349","G0357","G0361","G0368","G0369","G0370","G0384","G0387","G0390","G0392","G0352","G0359","G0360","G0366","G0373","G0374","G0375","G0377","G0383","G0388","G0393","G0345","G0363","G0379","G0382","G0391","G0354","G0376","G0385","G0342","G0378","G0353","G0358","G0381","G0389","G0355","G0340","G0367","G0343","G0364","G0338","G0351"]);
export const CANONICAL_GAME_IDS=ACTIVE_GAME_IDS;
export const PRIVATE_GAME_KEYS=new Set([
  'seedHex','rngState','history','runHistory','coinTossAudit','pendingRandom',
  'operatorToken','operator_token','operator_token_hash','schedulerSecret','deadman',
  'pendingPlay','awayPower','homePower','editSnapshot','editResume','weatherAudit'
]);

export class SecurityError extends Error{
  constructor(code,status,message=code){super(message);this.name='SecurityError';this.code=code;this.status=status;}
}

export function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  if(typeof value==='number'&&!Number.isFinite(value))throw new SecurityError('INVALID_NUMBER',400);
  return value;
}
export function canonicalJson(value){return JSON.stringify(canonical(value));}
export function sha256(value){return createHash('sha256').update(typeof value==='string'?value:canonicalJson(value)).digest('hex');}

export function requireAllowedOrigin(origin,allowed){
  if(!origin||!allowed.includes(origin))throw new SecurityError('ORIGIN_DENIED',403);
  return origin;
}
export function requireMethod(actual,allowed){
  if(!allowed.includes(actual))throw new SecurityError('METHOD_NOT_ALLOWED',405);
}
export function requireBodySize(raw){
  const size=new TextEncoder().encode(raw??'').length;
  if(size>MAX_JSON_BYTES)throw new SecurityError('BODY_TOO_LARGE',413);
  return size;
}
export function parseJsonObject(raw){
  requireBodySize(raw);
  let value;
  try{value=JSON.parse(raw);}catch{throw new SecurityError('INVALID_JSON',400);}
  if(!value||Array.isArray(value)||typeof value!=='object')throw new SecurityError('JSON_OBJECT_REQUIRED',400);
  return value;
}
export function requireSessionSlug(slug){
  if(!SESSION_RE.test(String(slug??'')))throw new SecurityError('SESSION_NOT_FOUND',404);
  return slug;
}
export function requireIdempotencyKey(key){
  if(!IDEMPOTENCY_RE.test(String(key??'')))throw new SecurityError('IDEMPOTENCY_KEY_REQUIRED',400);
  return key;
}
export function requireExpectedVersion(value){
  if(!Number.isSafeInteger(value)||value<0)throw new SecurityError('EXPECTED_VERSION_REQUIRED',400);
  return value;
}
export function requireChairman(identity){
  if(!identity?.userId)throw new SecurityError('AUTHENTICATION_REQUIRED',401);
  if(identity.active!==true||identity.role!=='CHAIRMAN')throw new SecurityError('CHAIRMAN_FORBIDDEN',403);
  return identity.userId;
}

export function publicGame(game){
  const strip=value=>{
    if(Array.isArray(value))return value.map(strip);
    if(!value||typeof value!=='object')return value;
    return Object.fromEntries(Object.entries(value).filter(([key])=>!PRIVATE_GAME_KEYS.has(key)).map(([key,item])=>[key,strip(item)]));
  };
  const out=strip(structuredClone(game));
  if(out.coinToss&&typeof out.coinToss==='object')delete out.coinToss.seedHex;
  return out;
}

export function composeDisplayBoard(finals,active){
  if(!Array.isArray(finals)||finals.length!==0)throw new SecurityError('FINAL_SNAPSHOT_COUNT_INVALID',503);
  if(!Array.isArray(active)||active.length!==56)throw new SecurityError('ACTIVE_GAME_COUNT_INVALID',503);
  for(const game of finals){
    if(game?.lifecycle!=='READY'||game?.activity!=='FINAL'||game?.immutableFinal!==true)throw new SecurityError('FINAL_SNAPSHOT_INVALID',503);
  }
  const combined=[...structuredClone(finals),...structuredClone(active)];
  if(new Set(combined.map(game=>game?.id)).size!==56)throw new SecurityError('BOARD_GAME_IDENTITY_INVALID',503);
  if(new Set(combined.map(game=>game?.kickoffOrder)).size!==56)throw new SecurityError('BOARD_ORDER_INVALID',503);
  const ordered=combined.sort((a,b)=>a.kickoffOrder-b.kickoffOrder||String(a.id).localeCompare(String(b.id)));
  if(ordered.some((game,index)=>game?.id!==CANONICAL_GAME_IDS[index]||game?.kickoffOrder!==index+1))throw new SecurityError('BOARD_CANONICAL_IDENTITY_INVALID',503);
  return ordered;
}

export function persistedRead(session,{operator=false}={}){
  requireSessionSlug(session.publicSlug);
  const active=structuredClone(operator?session.state:session.state.map(publicGame));
  const state=session.finals?composeDisplayBoard(operator?session.finals:session.finals.map(publicGame),active):active;
  return {
    public_slug:session.publicSlug,
    engine_version:session.engineVersion,
    week_key:session.weekKey,
    state_version:session.stateVersion,
    state,
    immutable_final_count:session.finals?.length??0,
    active_game_count:session.state.length
  };
}

export function schedulerSignature(secret,{timestamp,nonce,body}){
  return createHmac('sha256',secret).update(`${timestamp}\n${nonce}\n${sha256(body)}`).digest('hex');
}
export function verifySchedulerSignature(secret,input,{nowMs=Date.now(),windowMs=60_000}={}){
  if(!Number.isSafeInteger(input.timestamp)||Math.abs(nowMs-input.timestamp)>windowMs)throw new SecurityError('SCHEDULER_TIMESTAMP_INVALID',403);
  requireIdempotencyKey(input.nonce);
  const expected=Buffer.from(schedulerSignature(secret,input),'hex'),actual=Buffer.from(String(input.signature??''),'hex');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new SecurityError('SCHEDULER_UNAUTHORIZED',403);
  return true;
}

export class InMemoryAuthoritativeStore{
  constructor(){this.sessions=new Map();this.requests=new Map();this.events=[];}
  installSession(session){
    assert.equal(session.weekKey,'2026-W08');
    assert.equal(session.engineVersion,'GC-W8-V5.0.2-RC1');
    requireSessionSlug(session.publicSlug);
    this.sessions.set(session.publicSlug,structuredClone(session));
  }
  read(slug,options){
    requireSessionSlug(slug);
    const session=this.sessions.get(slug);if(!session)throw new SecurityError('SESSION_NOT_FOUND',404);
    return persistedRead(session,options);
  }
  commit({slug,actorId,idempotencyKey,request,expectedVersion,mutate}){
    requireSessionSlug(slug);requireIdempotencyKey(idempotencyKey);requireExpectedVersion(expectedVersion);
    if(!actorId)throw new SecurityError('ACTOR_REQUIRED',401);
    const session=this.sessions.get(slug);if(!session)throw new SecurityError('SESSION_NOT_FOUND',404);
    const requestHash=sha256(request),key=`${session.sessionId}|${actorId}|${idempotencyKey}`;
    const prior=this.requests.get(key);
    if(prior){
      if(prior.requestHash!==requestHash)throw new SecurityError('IDEMPOTENCY_CONFLICT',409);
      return {...structuredClone(prior.response),replayed:true};
    }
    if(session.stateVersion!==expectedVersion)throw new SecurityError('VERSION_CONFLICT',409);
    const draft=structuredClone(session),result=mutate(draft);
    if(!result||!Array.isArray(result.events)||result.events.length===0)throw new SecurityError('AUDIT_EVENTS_REQUIRED',400);
    if(sha256(draft.finals??null)!==sha256(session.finals??null))throw new SecurityError('IMMUTABLE_FINALS_CHANGED',409);
    draft.stateVersion++;
    this.sessions.set(slug,draft);
    const response={public_slug:slug,state_version:draft.stateVersion,state:structuredClone(draft.state)};
    this.events.push(...result.events.map(event=>({...structuredClone(event),sessionId:draft.sessionId,stateVersion:draft.stateVersion,actorId})));
    this.requests.set(key,{requestHash,response:structuredClone(response)});
    return {...response,replayed:false};
  }
}



