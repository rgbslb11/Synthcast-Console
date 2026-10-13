import {
  SecurityError,requireAllowedOrigin,requireMethod,parseJsonObject,requireSessionSlug,
  requireIdempotencyKey,requireExpectedVersion,requireChairman,verifySchedulerSignature
} from './security-core.mjs';

const headers=(origin='')=>({
  ...(origin?{'access-control-allow-origin':origin,'vary':'origin'}:{}),
  'content-type':'application/json; charset=utf-8','cache-control':'no-store'
});
const json=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
const failure=(error,origin='')=>error instanceof SecurityError?json({error:error.code},error.status,origin):json({error:'INTERNAL_ERROR'},500,origin);

export function createPublicHandler({allowedOrigins,store}){
  return async req=>{
    let origin='';
    try{
      origin=requireAllowedOrigin(req.headers.get('origin')??'',allowedOrigins);
      if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers(origin),'access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type'}});
      requireMethod(req.method,['GET']);
      const url=new URL(req.url),action=url.searchParams.get('api');
      if(action==='health')return json({engine_version:'GC-W7-V5.0.1-RC1',week_key:'2026-W07',activation_inputs_ready:true,immutable_finals_ready:false,release_ready:false,canonical_games:54,active_games:41,immutable_finals_required:13},200,origin);
      if(action!=='read')throw new SecurityError('UNSUPPORTED_ACTION',400);
      return json(await store.read(requireSessionSlug(url.searchParams.get('session'))),200,origin);
    }catch(error){return failure(error,origin);}
  };
}

export function createChairmanHandler({allowedOrigins,authenticate,authorize,store,createSession,executeCommand,beforeWrite=()=>{}}){
  return async req=>{
    let origin='';
    try{
      origin=requireAllowedOrigin(req.headers.get('origin')??'',allowedOrigins);
      if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers(origin),'access-control-max-age':'600','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
      requireMethod(req.method,['POST']);
      const auth=req.headers.get('authorization')??'';
      if(!auth.startsWith('Bearer '))throw new SecurityError('AUTHENTICATION_REQUIRED',401);
      const user=await authenticate(auth.slice(7));
      const identity=await authorize(user);
      const actorId=requireChairman(identity);
      const url=new URL(req.url),action=url.searchParams.get('api');
      if(action==='read')return json(await store.read(requireSessionSlug(url.searchParams.get('session')),{operator:true}),200,origin);
      if(action==='create'){
        beforeWrite();
        const body=parseJsonObject(await req.text());
        const idempotencyKey=requireIdempotencyKey(req.headers.get('idempotency-key'));
        const response=await createSession({actorId,idempotencyKey,body,identity});
        return json(response,response.replayed?200:201,origin);
      }
      if(action!=='command')throw new SecurityError('UNSUPPORTED_ACTION',400);
      beforeWrite();
      const body=parseJsonObject(await req.text()),slug=requireSessionSlug(url.searchParams.get('session'));
      const idempotencyKey=requireIdempotencyKey(req.headers.get('idempotency-key'));
      const expectedVersion=requireExpectedVersion(body.expected_version);
      const request={action,slug,body};
      const response=await store.commit({slug,actorId,idempotencyKey,request,expectedVersion,mutate:draft=>executeCommand(draft,body,identity)});
      return json(response,response.replayed?200:201,origin);
    }catch(error){return failure(error,origin);}
  };
}

export function createSchedulerHandler({secret,store,advance,beforeWrite=()=>{}}){
  return async req=>{
    try{
      requireMethod(req.method,['POST']);
      const raw=await req.text(),body=parseJsonObject(raw);
      const timestamp=Number(req.headers.get('x-gamecast-timestamp')),nonce=req.headers.get('x-gamecast-nonce')??'',signature=req.headers.get('x-gamecast-signature')??'';
      verifySchedulerSignature(secret,{timestamp,nonce,signature,body});
      beforeWrite();
      const slug=requireSessionSlug(body.session),expectedVersion=requireExpectedVersion(body.expected_version);
      const response=await store.commit({slug,actorId:'SCHEDULER',idempotencyKey:nonce,request:body,expectedVersion,mutate:draft=>advance(draft,body)});
      return json(response,response.replayed?200:201);
    }catch(error){return failure(error);}
  };
}


