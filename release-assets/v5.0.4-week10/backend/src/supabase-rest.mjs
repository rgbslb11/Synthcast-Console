import {SecurityError} from '../security/security-core.mjs';
// Server-only transport. User identity is verified by Auth, never decoded locally.
export function createSupabaseTransport({url,publishableKey,serviceKey,fetchImpl=fetch}){
  const base=new URL(url);
  if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||!publishableKey||!serviceKey)throw Error('Explicit HTTPS Supabase server configuration required');
  async function jsonRequest(path,{method='POST',body,auth=serviceKey,profile=true}={}){
    let response;
    try{response=await fetchImpl(new URL(path,base),{method,headers:{apikey:profile?serviceKey:publishableKey,Authorization:`Bearer ${auth}`,'content-type':'application/json',...(profile?{'Content-Profile':'gamecast_v504_w10','Accept-Profile':'gamecast_v504_w10'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error',cache:'no-store'});}catch{throw new SecurityError('BACKEND_UNAVAILABLE',504);}
    let data;try{data=await response.json();}catch{throw new SecurityError('BACKEND_RESPONSE_INVALID',502);}
    if(!response.ok){
      if(!profile)throw new SecurityError('AUTHENTICATION_REQUIRED',401);
      const message=String(data?.message??'');
      const codes=[['release writes disabled','RELEASE_WRITES_DISABLED',504],['idempotency conflict','IDEMPOTENCY_CONFLICT',409],['version conflict','VERSION_CONFLICT',409],['session not found','SESSION_NOT_FOUND',404],['Chairman forbidden','CHAIRMAN_FORBIDDEN',403],['13 immutable finals required','FINAL_EVIDENCE_NOT_READY',504],['locked weather','LOCKED_WEATHER_CHANGED',409]];
      for(const [part,code,status] of codes)if(message.includes(part))throw new SecurityError(code,status);
      throw new SecurityError('PERSISTENCE_REJECTED',504);
    }
    return data;
  }
  const rpc=(name,args)=>{
    if(!/^[a-z_]+$/.test(name))throw Error('Invalid RPC name');
    return jsonRequest('rest/v1/rpc/'+name,{body:args});
  };
  async function authenticate(token){
    if(typeof token!=='string'||token.length<16||token.length>8192||/[\r\n]/.test(token))throw new SecurityError('AUTHENTICATION_REQUIRED',401);
    const user=await jsonRequest('auth/v1/user',{method:'GET',auth:token,profile:false});
    if(!/^[a-f0-9-]{36}$/i.test(user?.id??'')||user.is_anonymous===true)throw new SecurityError('AUTHENTICATION_REQUIRED',401);
    return {id:user.id};
  }
  async function authorize(user){
    const active=await rpc('authorize_operator',{p_user_id:user.id});
    return {userId:user.id,role:active===true?'CHAIRMAN':null,active:active===true};
  }
  return {rpc,authenticate,authorize};
}


