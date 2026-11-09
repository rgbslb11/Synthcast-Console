import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const source='release-assets/v5.0.7-week12',out=source+'-operating';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const bind=s=>s.replaceAll('GC-W12-V5.0.7-QA1','GC-W12-V5.0.7-RC1').replaceAll('qa-w12v507-','w12v507-').replaceAll('V507_PUNT_TOUCHBACK_QA','V507_PUNT_TOUCHBACK').replaceAll('gamecast_v507_qa_w12','gamecast_v507_w12').replaceAll('W12_QA_ONLY','W12_OPERATOR');
for(const dir of ['runtime','src','security'])for(const f of walk(source+'/backend/'+dir)){
 let s=bind(fs.readFileSync(f,'utf8'));
 s=s.replaceAll('qaOnly:true','qaOnly:false').replaceAll('qaOnly: true','qaOnly: false').replaceAll('"qaOnly": true','"qaOnly": false');
 if(f.endsWith('edge-boundaries.mjs'))s=s.replace('activation_inputs_ready:false','activation_inputs_ready:true').replace(',qa_games:60','');
 if(f.endsWith('supabase-rest.mjs')){
  s=s.replaceAll("'gamecast_v507_w12'","'public'");
  s=s.replace("jsonRequest('rest/v1/rpc/'+name,{body:args})","jsonRequest('rest/v1/rpc/gc507_w12_rpc',{body:{p_action:name,p_args:args}})");
 }
 const target=out+f.slice(source.length);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,s);
}
for(const f of ['ratings.csv','canonical-week12-identity-map.json','input-manifest.json'])fs.copyFileSync(source+'/'+f,out+'/'+f);
const slate=JSON.parse(fs.readFileSync(source+'/qa-week12-slate.json')).map(g=>({...g,qaOnly:false}));
fs.writeFileSync(out+'/slate.json',JSON.stringify(slate,null,2)+'\n');
fs.writeFileSync(out+'/backend/runtime/week12.mjs','// Approved Week 12 operating slate. Games remain unlaunched until Chairman action.\nexport const OPERATING_SLATE = '+JSON.stringify(slate,null,2)+';\n');
for(const f of walk('public/v5.0.7/w12')){
 let s=bind(fs.readFileSync(f,'utf8')).replace('QA ONLY · DEPLOYMENT HELD','SEUD IMPORT ON HOLD').replaceAll('synthcastGameCast507W11Session','synthcastGameCast507W12Session');
 if(f.endsWith('/release-config.js'))s="globalThis.GAMECAST_V507_CONFIG=Object.freeze({projectUrl:'https://xsvdmcipviejxynkdbhq.supabase.co',publishableKey:'sb_publishable_5jxF1vOOyWdUvvk3-poZqQ_83gaaUdf',publicApi:'https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-week12-v5-0-7-public',chairmanApi:'https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-week12-v5-0-7-chairman'});\n";
 const target=out+'/public/'+f.slice('public/'.length);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,s);
}
// Private weekly storage; no exposed-schema allowlist changes, Auth users, or
// operator copies. Authorization delegates to the existing Chairman roster.
let sql=fs.readFileSync('release-assets/v5.0.6-week11/week11-schema.sql','utf8');
for(const [a,b] of [['gamecast_v506_w11','gamecast_v507_w12'],['GC-W11-V5.0.6-RC1','GC-W12-V5.0.7-RC1'],['w11v506-','w12v507-'],['2026-W11','2026-W12'],['V506','V507'],['Week 11','Week 12'],['week11','week12']])sql=sql.replaceAll(a,b);
sql=sql.replace(/\b56\b/g,'60').replaceAll('SECURITY DEFINER','SECURITY INVOKER');
sql=sql.replace(/array\['G0531'[^\n]+?\]::text\[\]/g,'array['+slate.map(g=>"'"+g.id+"'").join(',')+']::text[]');
const engine=fs.readFileSync(out+'/backend/runtime/engine.mjs','utf8');
const data=engine.match(/const DATA_VERSION = "([^"]+)"/)[1];
sql=sql.replace(/if p_data_version <> '[^']+'/ ,"if p_data_version <> '"+data+"'");
sql=sql.replace(/create table gamecast_v507_w12\.operators \([\s\S]*?alter table gamecast_v507_w12\.operators enable row level security;\n/,'');
sql=sql.replace(/^alter table gamecast_v507_w12\.operators[^\n]+\n/gm,'');
sql=sql.replaceAll('REFERENCES gamecast_v507_w12.operators','REFERENCES gamecast_v506_w11.operators');
sql=sql.replace('insert into gamecast_v507_w12.operators select * from gamecast_v505_w10.operators;','');
sql=sql.replace(/  select exists \([\s\S]*?\n  \);/,'  select gamecast_v506_w11.authorize_operator(p_user_id);');
sql=sql.slice(0,sql.indexOf('\ndo $$\ndeclare schemas text;'));
// The only public RPC is callable by service_role, never browser roles. Every
// operation dispatches to a fixed function with typed parameters; no dynamic SQL.
const methods={
 authorize_operator:{args:{p_user_id:'uuid'},scalar:true},
 read_final_snapshots:{args:{},scalar:true},
 read_session:{args:{p_slug:'text'}},
 read_request:{args:{p_session_id:'uuid',p_actor_id:'text',p_idempotency_key:'text',p_request_hash:'text'}},
 scheduler_sessions:{args:{}},
 create_session:{args:{p_owner_user_id:'uuid',p_public_slug:'text',p_data_version:'text',p_state:'jsonb',p_idempotency_key:'text',p_request_hash:'text'}},
 commit_state:{args:{p_session_id:'uuid',p_expected_version:'bigint',p_state:'jsonb',p_events:'jsonb',p_actor_id:'text',p_idempotency_key:'text',p_request_hash:'text',p_stamp:'timestamptz'}},
 authorize_scheduler_cron:{args:{p_token:'text'},scalar:true}
};
let scheduler=fs.readFileSync('release-assets/v5.0.6-week11/week11-scheduler.sql','utf8').replaceAll('gamecast_v506_w11','gamecast_v507_w12').replaceAll('gamecast_v506_week11','gamecast_v507_week12').replaceAll('gamecast-week11-v5-0-6','gamecast-week12-v5-0-7').replaceAll('5.0.6 Week 11','5.0.7 Week 12');
// Cron dispatcher needs Vault/net access; baseline SECURITY DEFINER remains
// restricted to service_role. Token is generated inside Vault, never emitted.
sql+='\n'+scheduler;
sql+=`\ncreate function public.gc507_w12_rpc(p_action text,p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,gamecast_v507_w12 as $rpc$
declare result jsonb;
begin
 case p_action\n`;
for(const [name,m] of Object.entries(methods)){
 const args=Object.entries(m.args).map(([key,type])=>type==='jsonb'?`p_args->'${key}'`:`(p_args->>'${key}')::${type}`).join(',');
 sql+=` when '${name}' then select ${m.scalar?'to_jsonb(gamecast_v507_w12.'+name+'('+args+'))':"coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from gamecast_v507_w12."+name+'('+args+') r'} into result;\n`;
 // PL/pgSQL INTO belongs before FROM for row-returning routines.
 if(!m.scalar)sql=sql.replace(' r into result;',' r;').replace("'[]'::jsonb) from gamecast_v507_w12."+name,"'[]'::jsonb) into result from gamecast_v507_w12."+name);
}
sql+=` else raise exception 'unsupported release RPC'; end case; return result; end $rpc$;
revoke all on function public.gc507_w12_rpc(text,jsonb) from public,anon,authenticated;
grant execute on function public.gc507_w12_rpc(text,jsonb) to service_role;
notify pgrst,'reload schema';\n`;
assert.ok(!sql.includes('alter role authenticator'));assert.ok(!sql.includes('insert into gamecast_v507_w12.operators'));assert.ok(!sql.includes('create table gamecast_v507_w12.operators'));
fs.writeFileSync(out+'/week12-schema.sql',sql);
// Reuse the current deployment environment and the existing password sign-in.
const deployment=out+'/backend/deployment';fs.mkdirSync(deployment,{recursive:true});
fs.writeFileSync(deployment+'/configured-runtime.mjs',fs.readFileSync('release-assets/v5.0.6-week11/backend/deployment/configured-runtime.mjs','utf8').replaceAll('GC-W11-V5.0.6-RC1','GC-W12-V5.0.7-RC1'));
for(const surface of ['public','chairman'])fs.writeFileSync(deployment+'/'+surface+'.ts',`import {createConfiguredRuntime} from './configured-runtime.mjs';\nDeno.serve(req=>createConfiguredRuntime().${surface}Handler(req));\n`);
fs.writeFileSync(out+'/setup-manifest.json',JSON.stringify({engineVersion:'GC-W12-V5.0.7-RC1',week:'2026-W12',games:60,participants:120,ratingRecords:122,ratingsSha256:createHash('sha256').update(fs.readFileSync(out+'/ratings.csv')).digest('hex'),storage:'private gamecast_v507_w12; fixed service-role-only public RPC',authorization:'existing gamecast_v506_w11 Chairman roster; no copies or new Auth users',launch:'Chairman controlled; no automatic launch during setup',rollout:'Tuesday–Thursday monitored operating games; no test outcomes accepted automatically'},null,2)+'\n');
console.log('Prepared Week 12 operating release: 60 unlaunched games; existing Chairman identity; private storage. No deployment performed.');
