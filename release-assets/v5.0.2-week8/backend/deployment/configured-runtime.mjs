import {createHmac} from 'node:crypto';
import {createReleaseRuntime} from '../src/release-runtime.mjs';
// Reuse project infrastructure settings; derive a distinct scheduler signing key.
// Schema, session namespace, RPC grants and release switch are separately isolated.
export function createConfiguredRuntime(){
  const required=name=>{const value=Deno.env.get(name);if(!value)throw Error('Missing deployment setting: '+name);return value;};
  // Supabase supplies a JSON dictionary rather than a singular publishable-key
  // variable. Prefer an explicit override, then the platform's default key.
  const publishableKey=Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    || JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default
    || required('SUPABASE_ANON_KEY');
  return createReleaseRuntime({url:required('SUPABASE_URL'),publishableKey,serviceKey:required('SUPABASE_SERVICE_ROLE_KEY'),schedulerSecret:createHmac('sha256',required('GAMECAST_V500_SCHEDULER_SECRET')).update('GC-W8-V5.0.2-RC1').digest('hex'),allowedOrigins:required('GAMECAST_V500_ALLOWED_ORIGINS').split(',').map(x=>x.trim()).filter(Boolean),writesEnabled:()=>Deno.env.get('GAMECAST_V500_WRITES_ENABLED')==='true'});
}


