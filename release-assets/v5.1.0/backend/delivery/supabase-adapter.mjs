import {AccessError} from '../reporting/access.mjs';
// Explicit isolated deployment only. Never inherits a 5.0.6 schema or endpoint.
export function createReportingTransport({url,publishableKey,serviceKey,fetchImpl=fetch,gateway=false}){
 const base=new URL(url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||!publishableKey||!serviceKey)throw Error('EXPLICIT_SERVER_CONFIGURATION_REQUIRED');
 async function send(path,body,token){
  const auth=token!==undefined;
  let response;
  try{response=await fetchImpl(new URL(path,base),{method:auth?'GET':'POST',headers:{apikey:auth?publishableKey:serviceKey,Authorization:`Bearer ${auth?token:serviceKey}`,'content-type':'application/json',...(!auth&&!gateway?{'Content-Profile':'gamecast_v510','Accept-Profile':'gamecast_v510'}:{})},body:auth?undefined:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new AccessError('BACKEND_UNAVAILABLE',503);}
  if(!response.ok){
   if(!auth){let error;try{error=await response.json();}catch{}
    if(error?.code==='P0001'&&['VERSION_CONFLICT','IDEMPOTENCY_CONFLICT'].includes(error.message))throw new AccessError(error.message,409);
   }
   throw new AccessError(auth?'AUTHENTICATION_REQUIRED':'BACKEND_UNAVAILABLE',auth?401:503);
  }
  try{return await response.json();}catch{throw new AccessError('BACKEND_UNAVAILABLE',503);}
 }
 const names=new Set(['authorize_reporting','read_reporting','commit_reporting','commit_source','load_source','source_version','pending_source','lookup_source_request','qa_grant']);
 const rpc=(name,args)=>{if(!names.has(name))throw Error('RPC_NOT_ALLOWED');return gateway?send('rest/v1/rpc/gamecast_v510_gateway',{p_operation:name,p_args:args}):send('rest/v1/rpc/'+name,args);};
 return {rpc,
  async authenticate(token){if(typeof token!=='string'||token.length<16||token.length>8192||/[\r\n]/.test(token))throw new AccessError('AUTHENTICATION_REQUIRED',401);const u=await send('auth/v1/user',null,token);if(!/^[a-f0-9-]{36}$/i.test(u?.id??'')||u.is_anonymous===true)throw new AccessError('AUTHENTICATION_REQUIRED',401);return {id:u.id};},
  async authorize(user,sessionId){const active=await rpc('authorize_reporting',{p_user_id:user.id,p_session_id:sessionId});return {authenticated:true,userId:user.id,active:active===true,role:active===true?'CHAIRMAN':null,authorizedSessionIds:active===true?[sessionId]:[]};},
  readDetails:({userId,sessionId,gameId,afterSequence,limit,expectedRunId,expectedStateVersion,sourceVersion})=>rpc('read_reporting',{p_user_id:userId,p_session_id:sessionId,p_game_id:gameId,p_after:afterSequence,p_limit:limit,p_run:expectedRunId,p_version:expectedStateVersion,p_source_version:sourceVersion})
 };
}
