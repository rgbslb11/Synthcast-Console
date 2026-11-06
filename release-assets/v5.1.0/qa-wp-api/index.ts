import {createWpSqlAuthorization} from './probability/sql-authorization.mjs';
import {wpDatabaseUrl} from './database-config.mjs';
import postgres from 'npm:postgres@3.4.5';
import {createWpStore} from './probability/store.mjs';
import {createWpHandler} from './probability/http.mjs';
import {createReportingTransport} from './delivery/supabase-adapter.mjs';
// Two reusable clients per isolate; transaction bindings remain request-local.
let sharedSql;
const sharedConnection=()=>sharedSql??=postgres(wpDatabaseUrl(name=>Deno.env.get(name)),{prepare:false,max:2,connect_timeout:10,idle_timeout:20,max_lifetime:60});
const t=createReportingTransport({url:Deno.env.get('SUPABASE_URL'),publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),gateway:true});
Deno.serve(async req=>{
 // Request-local connection/transaction binding: concurrent users cannot share tx state.
 let sql,tx;
 const connect=()=>sql??=sharedConnection();
 const query=async(text,args=[])=>({rows:await (tx??connect()).unsafe(text,args.map(v=>typeof v==='string'&&/^[{[]/.test(v)?connect().json(JSON.parse(v)):v))});
 const transaction=fn=>connect().begin(async scoped=>{tx=scoped;try{return await fn();}finally{tx=undefined;}});
 const handler=createWpHandler({allowedOrigins:['https://rgbslb11.github.io'],authenticate:t.authenticate,authorize:createWpSqlAuthorization(query),store:createWpStore({query,transaction})});
 return await handler(req);
});