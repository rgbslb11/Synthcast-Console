import postgres from 'npm:postgres@3.4.5';
import {createReportingTransport} from './supabase-adapter.mjs';
import {createQaController} from './controller.mjs';
import {createCommandHandler} from './command-http.mjs';
import {createWpStore} from '../probability/store.mjs';
import {createWpPipeline} from '../probability/pipeline.mjs';
const t=createReportingTransport({url:Deno.env.get('SUPABASE_URL'),publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),gateway:true});
Deno.serve(async req=>{
 let sql,tx;
 const connect=()=>sql??=postgres(Deno.env.get('SUPABASE_DB_URL'),{prepare:false,max:1,connect_timeout:10,idle_timeout:5});
 const query=async(q,a=[])=>({rows:await (tx??connect()).unsafe(q,a.map(v=>typeof v==='string'&&/^[{[]/.test(v)?connect().json(JSON.parse(v)):v))});
 const transaction=fn=>connect().begin(async s=>{tx=s;try{return await fn();}finally{tx=undefined;}});
 const source=createQaController({rpc:t.rpc}),store=createWpStore({query,transaction});
 const pipeline=createWpPipeline({store,readSource:source.store.loadCommittedRevision,sourceVersion:async sid=>Number((await query('select state_version from gamecast_v510.source_heads where session_id=$1',[sid])).rows[0].state_version)});
 const controller={async execute(request){const receipt=await source.execute(request);try{await pipeline.recover(request.sessionId);}catch(e){console.error('WP_RECOVERY_PENDING',e.code??e.name);}return receipt;}};
 try{return await createCommandHandler({authenticate:t.authenticate,authorize:t.authorize,controller,allowedOrigins:['https://rgbslb11.github.io']})(req);}finally{if(sql)await sql.end({timeout:5});}
});