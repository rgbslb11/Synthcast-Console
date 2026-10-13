import {SecurityError,requireMethod,parseJsonObject} from '../security/security-core.mjs';
import {runSchedulerSweep} from './scheduler-runner.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

/**
 * Authenticated pg_cron entrypoint. The database keeps the opaque trigger token
 * in Vault; the existing HMAC scheduler boundary still performs every write.
 */
export function createCronSweepHandler({
  rpc,url,secret,writesEnabled=()=>true,sweep=runSchedulerSweep,
  maxSessions=2,timeoutMs=4000,budgetMs=8000
}){
  return async req=>{
    try{
      requireMethod(req.method,['POST']);
      const body=parseJsonObject(await req.text());
      if(Object.keys(body).length)throw new SecurityError('CRON_BODY_INVALID',400);
      const token=req.headers.get('x-gamecast-cron-token')??'';
      if(!/^[a-f0-9]{64}$/.test(token))throw new SecurityError('SCHEDULER_CRON_UNAUTHORIZED',403);
      const authorized=await rpc('authorize_scheduler_cron',{p_token:token});
      if(authorized!==true)throw new SecurityError('SCHEDULER_CRON_UNAUTHORIZED',403);
      if(writesEnabled()!==true)throw new SecurityError('RELEASE_WRITES_DISABLED',503);
      const result=await sweep({rpc,url,secret,maxSessions,timeoutMs,budgetMs});
      return json(result,200);
    }catch(error){
      if(error instanceof SecurityError)return json({error:error.code},error.status);
      return json({error:'INTERNAL_ERROR'},500);
    }
  };
}
