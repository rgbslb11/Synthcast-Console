import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {createReleaseRuntime} from '../../release-assets/v5.0.7-week12-operating/backend/src/release-runtime.mjs';
const url=new URL(process.env.GC507_PG_URL||'http://invalid');
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');assert.equal(url.pathname,'/gc507operating');
const pg=await import(pathToFileURL(process.env.PG_MODULE).href);pg.default.types.setTypeParser(1184,s=>s);const db=new pg.default.Client({connectionString:url.href});await db.connect();
const actor='05070507-0507-4507-8507-050705070507';
try{
 await db.query(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${actor}');
 create schema gamecast_v506_w11;create table gamecast_v506_w11.operators(user_id uuid primary key,role text,active boolean);
 insert into gamecast_v506_w11.operators values('${actor}','CHAIRMAN',true);
 create function gamecast_v506_w11.authorize_operator(p_user_id uuid) returns boolean language sql security definer as $$select exists(select 1 from gamecast_v506_w11.operators where user_id=p_user_id and active and role='CHAIRMAN')$$;
 grant usage on schema gamecast_v506_w11 to service_role;grant execute on function gamecast_v506_w11.authorize_operator(uuid) to service_role;
 create schema extensions;create extension pgcrypto with schema extensions;
 create schema vault;create table vault.decrypted_secrets(id uuid default gen_random_uuid(),decrypted_secret text,name text,created_at timestamptz default now());
 create function vault.create_secret(secret text,name text,description text) returns uuid language sql as $$insert into vault.decrypted_secrets(decrypted_secret,name) values(secret,name) returning id$$;
 create schema net;create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$select 1::bigint$$;
 create schema cron;create table cron.job(jobid bigint generated always as identity,jobname text,active boolean);
 create function cron.schedule(job_name text,schedule text,command text) returns bigint language sql as $$insert into cron.job(jobname,active) values(job_name,true) returning jobid$$;
 create function cron.alter_job(job_id bigint,active boolean) returns void language sql as $$update cron.job set active=$2 where jobid=$1$$;
 `);
 await db.query(fs.readFileSync('release-assets/v5.0.7-week12-operating/week12-schema.sql','utf8'));
 assert.equal((await db.query("select active from cron.job where jobname='gamecast_v507_week12'")).rows[0].active,false);
 assert.equal((await db.query("select to_regclass('gamecast_v507_w12.operators') absent")).rows[0].absent,null);
 for(const role of ['anon','authenticated']){await db.query('set role '+role);await assert.rejects(db.query("select public.gc507_w12_rpc('scheduler_sessions','{}')"),/permission denied/);await db.query('reset role');}
 async function rpc(name,args){await db.query('set role service_role');try{return (await db.query('select public.gc507_w12_rpc($1,$2::jsonb) result',[name,JSON.stringify(args)])).rows[0].result;}finally{await db.query('reset role');}}
 assert.equal(await rpc('authorize_operator',{p_user_id:actor}),true);assert.deepEqual(await rpc('read_final_snapshots',{}),[]);
 await assert.rejects(rpc('drop_schema',{}),/unsupported release RPC/);
 const runtime=createReleaseRuntime({allowedOrigins:['https://rgbslb11.github.io'],schedulerSecret:'disposable-only',transport:{rpc,authenticate:async()=>({id:actor}),authorize:async()=>({userId:actor,role:'CHAIRMAN',active:true})}});
 const req=()=>new Request('https://example.invalid?api=create',{method:'POST',headers:{origin:'https://rgbslb11.github.io',authorization:'Bearer fixture','content-type':'application/json','idempotency-key':'operating-fixture-507'},body:'{}'});
 assert.equal((await runtime.chairmanHandler(req())).status,500); // Raw SQL exception fixture; transport maps this to 504 in deployment.
 await db.query('update gamecast_v507_w12.release_control set writes_enabled=true where singleton');
 const response=await runtime.chairmanHandler(req());assert.equal(response.status,201,await response.clone().text());const created=await response.json();
 assert.match(created.public_slug,/^w12v507-[a-f0-9]{16}$/);assert.equal(created.state.length,60);assert.ok(created.state.every(g=>g.qaOnly===false&&g.lifecycle==='UNLAUNCHED'&&!g.auto));
 const replay=await runtime.chairmanHandler(req());assert.equal(replay.status,200);assert.equal((await replay.json()).public_slug,created.public_slug);
 const rows=await rpc('read_session',{p_slug:created.public_slug});assert.equal(rows.length,1);assert.equal(rows[0].state_version,1);assert.equal(rows[0].engine_version,'GC-W12-V5.0.7-RC1');
 const before=JSON.stringify(rows[0].state);await runtime.store.read(created.public_slug);assert.equal(JSON.stringify((await rpc('read_session',{p_slug:created.public_slug}))[0].state),before);
 assert.deepEqual(await rpc('read_session',{p_slug:'w11v506-'+'0'.repeat(16)}),[]);assert.deepEqual(await rpc('scheduler_sessions',{}),[]);
 await db.query(`update gamecast_v506_w11.operators set active=false where user_id='${actor}'`);assert.equal(await rpc('authorize_operator',{p_user_id:actor}),false);
 console.log('PASS operating SQL: private storage, service-only dispatcher, existing roster revocation, 60 unlaunched games, exact creation retry, read-only polling, cron disabled, foreign release isolation. Vault/net/cron are disposable SQL fixtures; shared Supabase is not exercised.');
}finally{await db.end();}
