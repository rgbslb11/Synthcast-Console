import {createDetailsHandler} from './http.mjs';
import {createReportingTransport} from './supabase-adapter.mjs';
import {createSourceStore} from './source-store.mjs';
const transport=createReportingTransport({url:Deno.env.get('SUPABASE_URL'),publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),gateway:true});
const source=createSourceStore({rpc:transport.rpc});
Deno.serve(createDetailsHandler({allowedOrigins:['https://rgbslb11.github.io'],authenticate:transport.authenticate,authorize:transport.authorize,readDetails:transport.readDetails,loadSourceVersion:source.sourceVersion}));
