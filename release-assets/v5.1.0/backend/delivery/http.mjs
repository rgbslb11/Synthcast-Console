import {AccessError,requireChairman} from '../reporting/access.mjs';
import {requireScope,DELIVERY} from './projection.mjs';
const integer=(value,fallback)=>{if(value===null)return fallback;if(!/^(0|[1-9][0-9]*)$/.test(value)||!Number.isSafeInteger(Number(value)))throw new AccessError('INVALID_CURSOR',400);return Number(value);};
// Dependency injection is server-side only. Browser-supplied identity, role,
// audit-complete flags and source versions are never authority.
export function createDetailsHandler({allowedOrigins,authenticate,authorize,readDetails,loadSourceVersion}){
 return async request=>{
  let origin='';
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':origin,vary:'Origin'}:{})}});
  try{
   const incoming=request.headers.get('origin');
   if(!incoming||!allowedOrigins.includes(incoming))throw new AccessError('ORIGIN_DENIED');
   origin=incoming;
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,vary:'Origin','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'authorization','cache-control':'no-store'}});
   if(request.method!=='GET')throw new AccessError('METHOD_NOT_ALLOWED',405);
   const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
   if(!token)throw new AccessError('AUTHENTICATION_REQUIRED',401);
   const user=await authenticate(token);
   if(!user?.id||user.is_anonymous===true)throw new AccessError('AUTHENTICATION_REQUIRED',401);
   const q=new URL(request.url).searchParams,sessionId=q.get('session'),gameId=q.get('game');
   try{requireScope(sessionId,gameId);}catch{throw new AccessError('QA_SCOPE_REQUIRED',404);}
   const identity=await authorize(user,sessionId);
   requireChairman(identity,sessionId);
   if(identity.userId!==user.id)throw new AccessError('CHAIRMAN_FORBIDDEN');
   const afterSequence=integer(q.get('after'),0),limit=integer(q.get('limit'),100),expectedStateVersion=integer(q.get('version'),null),expectedRunId=q.get('run');
   if(limit<1||limit>250||expectedRunId?.length>128)throw new AccessError('INVALID_CURSOR',400);
   if(afterSequence>0&&(!expectedRunId||expectedStateVersion===null))throw new AccessError('CHECKPOINT_REQUIRED',400);
   const sourceVersion=await loadSourceVersion(sessionId,gameId);
   if(!Number.isSafeInteger(sourceVersion)||sourceVersion<0)throw new AccessError('VERIFICATION_UNAVAILABLE',503);
   const result=await readDetails({userId:user.id,sessionId,gameId,afterSequence,limit,expectedRunId,expectedStateVersion,sourceVersion});
   return reply({...result,deliveryVersion:DELIVERY});
  }catch(e){return reply({error:e instanceof AccessError?e.code:'BACKEND_UNAVAILABLE'},e instanceof AccessError?e.status:503);}
 };
}
