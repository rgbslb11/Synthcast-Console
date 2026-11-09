import {createHmac} from 'node:crypto';
import {createReleaseRuntime} from '../src/release-runtime.mjs';
import {createSupabaseTransport} from '../src/supabase-rest.mjs';
export const origins=['https://rgbslb11.github.io','http://127.0.0.1:9876','http://localhost:9876'];
export function configuration(){
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const publishableKey=Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||Deno.env.get('SUPABASE_ANON_KEY');
 if(url!=='https://xsvdmcipviejxynkdbhq.supabase.co'||!serviceKey||!publishableKey)throw Error('Explicit existing GameCast QA project required');
 return {url,serviceKey,publishableKey};
}
export function configuredRuntime(){
 const c=configuration();return createReleaseRuntime({...c,allowedOrigins:origins,schedulerSecret:createHmac('sha256',c.serviceKey).update('GC507_QA_NO_CRON').digest('hex')});
}
export const transport=()=>createSupabaseTransport(configuration());
