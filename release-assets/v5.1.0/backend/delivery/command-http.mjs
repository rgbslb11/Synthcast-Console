import {AccessError,requireChairman} from '../reporting/access.mjs';
export function createCommandHandler({authenticate,authorize,controller,allowedOrigins}){
 return async req=>{
  let origin='';const response=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store',...(origin?{'access-control-allow-origin':origin,vary:'Origin'}:{})}});
  try{
   if(!allowedOrigins.includes(req.headers.get('origin')))throw new AccessError('ORIGIN_DENIED');origin=req.headers.get('origin');
   if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key',vary:'Origin'}});
   if(req.method!=='POST')throw new AccessError('METHOD_NOT_ALLOWED',405);
   const bearer=req.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];if(!bearer)throw new AccessError('AUTHENTICATION_REQUIRED',401);
   const user=await authenticate(bearer),sessionId=new URL(req.url).searchParams.get('session');const identity=await authorize(user,sessionId);requireChairman(identity,sessionId);
   if(identity.userId!==user.id)throw new AccessError('CHAIRMAN_FORBIDDEN');
   const raw=await req.text();if(new TextEncoder().encode(raw).length>65536)throw new AccessError('BODY_TOO_LARGE',413);
   let body;try{body=JSON.parse(raw);}catch{throw new AccessError('INVALID_JSON',400);}
   return response(await controller.execute({sessionId,actorId:user.id,requestId:req.headers.get('idempotency-key'),expectedVersion:body.expectedVersion,actions:body.actions}));
  }catch(e){const known=['IDEMPOTENCY_CONFLICT','VERSION_CONFLICT','INVALID_REQUEST','QA_COMMAND_DENIED','QA_SCOPE_REQUIRED'];return response({error:e instanceof AccessError?e.code:known.includes(e.message)?e.message:'COMMAND_FAILED'},e instanceof AccessError?e.status:known.includes(e.message)?409:503);}
 };
}
