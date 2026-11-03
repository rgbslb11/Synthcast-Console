import {createReportingTransport} from './supabase-adapter.mjs';
import {createQaController} from './controller.mjs';
import {createCommandHandler} from './command-http.mjs';
const t=createReportingTransport({url:Deno.env.get('SUPABASE_URL'),publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),gateway:true});
Deno.serve(createCommandHandler({authenticate:t.authenticate,authorize:t.authorize,controller:createQaController({rpc:t.rpc}),allowedOrigins:['https://rgbslb11.github.io']}));
