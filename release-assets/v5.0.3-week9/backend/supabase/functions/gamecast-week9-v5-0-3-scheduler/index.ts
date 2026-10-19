import {createHmac} from 'node:crypto';
import {createConfiguredRuntime} from '../../../deployment/configured-runtime.mjs';
import {createSupabaseTransport} from '../../../src/supabase-rest.mjs';
import {createCronSweepHandler} from '../../../src/scheduler-cron.mjs';

const required=(name:string)=>{const value=Deno.env.get(name);if(!value)throw Error('Missing deployment setting: '+name);return value;};
const publishableKey=Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  || JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default
  || required('SUPABASE_ANON_KEY');
const url=required('SUPABASE_URL'),serviceKey=required('SUPABASE_SERVICE_ROLE_KEY'),secret=createHmac('sha256',required('GAMECAST_V500_SCHEDULER_SECRET')).update('GC-W9-V5.0.3-RC1').digest('hex');
const runtime=createConfiguredRuntime();
const backend=createSupabaseTransport({url,publishableKey,serviceKey});
const cronHandler=createCronSweepHandler({
  rpc:backend.rpc,
  url:url+'/functions/v1/gamecast-week9-v5-0-3-scheduler',
  secret,
  writesEnabled:()=>Deno.env.get('GAMECAST_V500_WRITES_ENABLED')==='true'
});

Deno.serve(req=>req.headers.has('x-gamecast-cron-token')?cronHandler(req):runtime.schedulerHandler(req));

