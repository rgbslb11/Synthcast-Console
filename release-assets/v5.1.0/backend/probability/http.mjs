import {requireChairman} from '../reporting/access.mjs';
// Same trusted authentication/authorization adapters as the reporting endpoint.
export function createWpHandler({allowedOrigins,authenticate,authorize,store}){
 return async request=>{
  const origin=request.headers.get('origin'),headers={'content-type':'application/json','cache-control':'no-store',...(allowedOrigins.includes(origin)?{'access-control-allow-origin':origin,vary:'Origin'}:{})};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  try{
   if(!allowedOrigins.includes(origin))return reply({error:'ORIGIN_DENIED'},403);
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
   if(!['GET','POST'].includes(request.method))return reply({error:'METHOD_NOT_ALLOWED'},405);
   const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];if(!token)return reply({error:'AUTHENTICATION_REQUIRED'},401);
   const user=await authenticate(token);if(!user?.id||user.is_anonymous)return reply({error:'AUTHENTICATION_REQUIRED'},401);
   const q=new URL(request.url).searchParams,sessionId=q.get('session'),gameId=q.get('game'),identity=await authorize(user,sessionId);
   requireChairman(identity,sessionId);if(identity.userId!==user.id)return reply({error:'CHAIRMAN_FORBIDDEN'},403);
   if(request.method==='POST'){
    const requestId=request.headers.get('idempotency-key');if(!/^[\w.-]{16,128}$/.test(requestId??''))return reply({error:'INVALID_REQUEST'},400);
    const text=await request.text();if(text.length>16384)return reply({error:'REQUEST_TOO_LARGE'},413);
    const {expectedVersion,prior}=JSON.parse(text);return reply(await store.setPrior({sessionId,gameId,userId:user.id,expectedVersion,requestId,prior}));
   }
   return reply(await store.read({sessionId,gameId,userId:user.id,after:Number(q.get('after')??0),limit:Number(q.get('limit')??100),runId:q.get('run'),highWatermark:q.has('through')?Number(q.get('through')):null}));
  }catch(e){const code=e.code??e.message;const status=e.status??(['CHAIRMAN_FORBIDDEN'].includes(code)?403:['PREGAME_FROZEN','VERSION_CONFLICT','IDEMPOTENCY_CONFLICT','RUN_CHANGED'].includes(code)?409:code.startsWith('PRIOR_')||code==='INVALID_CURSOR'?400:503);return reply({error:status===503?'BACKEND_UNAVAILABLE':code},status);}
 };
}
