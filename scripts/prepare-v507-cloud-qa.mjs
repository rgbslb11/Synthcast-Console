import fs from 'node:fs';import assert from 'node:assert/strict';
import * as engine from '../release-assets/v5.0.7-week12/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../release-assets/v5.0.7-week12/backend/runtime/week12.mjs';
const out='release-assets/v5.0.7-week12';
let sql=fs.readFileSync('release-assets/v5.0.6-week11/week11-schema.sql','utf8');
for(const [a,b] of [['gamecast_v506_w11','gamecast_v507_qa_w12'],['GC-W11-V5.0.6-RC1',engine.ENGINE_VERSION],['w11v506-','qa-w12v507-'],['2026-W11','2026-W12'],['V506','V507'],['Week 11','Week 12 QA'],['week11','week12_qa']])sql=sql.replaceAll(a,b);
sql=sql.replace(/\b56\b/g,'60').replaceAll('SECURITY DEFINER','SECURITY INVOKER');
sql=sql.replace(/array\['G0531'[^\n]+?\]::text\[\]/g,'array['+slate.map(g=>"'"+g.id+"'").join(',')+']::text[]');
sql=sql.replace(/if p_data_version <> '[^']+'/,"if p_data_version <> '"+engine.DATA_VERSION+"'");
sql=sql.replace('operating_only_state','qa_only_state').replace('array_fill(false, ARRAY[jsonb_array_length(state)])','array_fill(true, ARRAY[jsonb_array_length(state)])');
sql=sql.replace('values (true,false)','values (true,true)');
sql=sql.replace('insert into gamecast_v507_qa_w12.operators select * from gamecast_v505_w10.operators;','insert into gamecast_v507_qa_w12.operators select * from gamecast_v506_w11.operators;');
sql=sql.replace('-- Separate Week 12 QA operating schema. Existing Week 7 QA and prior releases remain unchanged.','-- Isolated Week 12 QA only. No cron, production activation or official results.');
sql+=`
alter table gamecast_v507_qa_w12.sessions add constraint no_official_qa_results
 check (not jsonb_path_exists(state, '$[*] ? (@.lifecycle == "READY")'));
create table gamecast_v507_qa_w12.qa_runs (
 run_key text primary key check(run_key ~ '^[0-9]+-[0-9]+$'),
 user_id uuid not null unique references gamecast_v507_qa_w12.operators(user_id),
 source_sha text not null check(source_sha ~ '^[a-f0-9]{40}$'),
 public_slug text unique check(public_slug ~ '^qa-w12v507-[a-f0-9]{16}$'),
 created_at timestamptz not null default now(), finished_at timestamptz
);
alter table gamecast_v507_qa_w12.qa_runs enable row level security;
grant select,insert,update on gamecast_v507_qa_w12.qa_runs to service_role;

create function gamecast_v507_qa_w12.qa_lookup_run(p_run_key text) returns jsonb
 language sql stable security invoker set search_path=pg_catalog,gamecast_v507_qa_w12
 as $$ select to_jsonb(r) from gamecast_v507_qa_w12.qa_runs r where run_key=p_run_key $$;
create function gamecast_v507_qa_w12.qa_register_run(p_run_key text,p_user_id uuid,p_source_sha text) returns void
 language plpgsql security invoker set search_path=pg_catalog,gamecast_v507_qa_w12 as $$
 begin
  if p_run_key !~ '^[0-9]+-[0-9]+$' or p_source_sha !~ '^[a-f0-9]{40}$' then raise exception 'invalid QA run'; end if;
  insert into gamecast_v507_qa_w12.operators(user_id,role,active) values(p_user_id,'CHAIRMAN',true);
  insert into gamecast_v507_qa_w12.qa_runs(run_key,user_id,source_sha) values(p_run_key,p_user_id,p_source_sha);
 end $$;
create function gamecast_v507_qa_w12.qa_bind_session(p_run_key text,p_slug text) returns void
 language plpgsql security invoker set search_path=pg_catalog,gamecast_v507_qa_w12 as $$
 begin
  if not exists(select 1 from gamecast_v507_qa_w12.qa_runs r join gamecast_v507_qa_w12.sessions s on s.owner_user_id=r.user_id where r.run_key=p_run_key and s.public_slug=p_slug) then raise exception 'foreign QA session'; end if;
  update gamecast_v507_qa_w12.qa_runs set public_slug=p_slug where run_key=p_run_key and public_slug is null;
 end $$;
create function gamecast_v507_qa_w12.qa_finish_run(p_run_key text) returns void
 language plpgsql security invoker set search_path=pg_catalog,gamecast_v507_qa_w12 as $$
 begin
  update gamecast_v507_qa_w12.operators set active=false where user_id=(select user_id from gamecast_v507_qa_w12.qa_runs where run_key=p_run_key);
  update gamecast_v507_qa_w12.qa_runs set finished_at=now() where run_key=p_run_key;
 end $$;
revoke all on all functions in schema gamecast_v507_qa_w12 from public,anon,authenticated;
grant execute on all functions in schema gamecast_v507_qa_w12 to service_role;
notify pgrst,'reload schema';
`;
assert.equal((sql.match(/gamecast_v506_w11/g)||[]).length,1,'only a read of the current Chairman roster is allowed');assert.ok(!sql.includes('G0531'));assert.ok(!sql.includes('SECURITY DEFINER'));
fs.writeFileSync(out+'/cloud-qa-schema.sql',sql);
fs.mkdirSync(out+'/backend/cloud',{recursive:true});
const sequences=JSON.parse(fs.readFileSync('tests/v507/fixtures/week11-sequences.json'));
fs.writeFileSync(out+'/backend/cloud/sequences.mjs','export const sequences='+JSON.stringify(sequences,null,2)+';\n');
console.log('Prepared isolated QA schema and stored-history fixtures; no deployment performed.');
