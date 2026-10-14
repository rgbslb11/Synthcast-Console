// Engineer-only, private-data rehearsal. No network client and no production connection.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {applyDelta} from './recovery-codec.mjs';
const [archiveDir,dataDir,modulePath]=process.argv.slice(2);
if(!archiveDir||!dataDir||!modulePath||[archiveDir,dataDir,modulePath].some(p=>!path.isAbsolute(p)||p.includes('://')))throw Error('Three absolute local paths required: archive, isolated database, PGlite module');
if(path.resolve(archiveDir)===path.resolve(dataDir))throw Error('Archive and restore destination must differ');
const {PGlite}=await import(pathToFileURL(modulePath));const db=new PGlite(dataDir);
await db.exec("SET timezone='UTC'");
const read=n=>JSON.parse(fs.readFileSync(path.join(archiveDir,n),'utf8'));
const cat=read('database-schema-catalog.json'),deps=read('dependencies-and-hashes.json');
const session=read('gamecast-v500-session.json')[0].session;
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const sqlhash=e=>`encode(sha256(convert_to(${e},'UTF8')),'hex')`;
async function insert(table,rows,identity=false){if(!rows.length)return;await db.query(`INSERT INTO gamecast_v500.${quote(table)} ${identity?'OVERRIDING SYSTEM VALUE':''} SELECT * FROM jsonb_populate_recordset(NULL::gamecast_v500.${quote(table)},$1::jsonb)`,[JSON.stringify(rows)]);}
let prior;
const exists=(await db.query("SELECT to_regclass('public.rehearsal_progress') AS found")).rows[0].found;
if(!exists){
 await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE SCHEMA gamecast_v500; CREATE TABLE public.rehearsal_progress(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), version bigint NOT NULL, response jsonb, restored bigint NOT NULL); INSERT INTO public.rehearsal_progress VALUES(true,0,null,0);');
 for(const role of ['anon','authenticated','service_role'])await db.exec(`CREATE ROLE ${role} NOLOGIN;`);
 const owners=new Set([session.owner_user_id,...deps.operators.map(r=>r.user_id),...read('gamecast-v500-finals.json').map(x=>x.final.imported_by)]);
 for(const id of owners)await db.query('INSERT INTO auth.users VALUES($1)',[id]);
 for(const table of [...new Set(cat.columns.map(c=>c.relname))]){
   const cols=cat.columns.filter(c=>c.relname===table).map(c=>`${quote(c.attname)} ${c.type}${c.attidentity?' GENERATED ALWAYS AS IDENTITY':c.default_expr?' DEFAULT '+c.default_expr:''}${c.attnotnull?' NOT NULL':''}`);
   await db.exec(`CREATE TABLE gamecast_v500.${quote(table)} (${cols.join(',')}); ALTER TABLE gamecast_v500.${quote(table)} ENABLE ROW LEVEL SECURITY;`);
 }
 for(const c of [...cat.constraints].sort((a,b)=>(a.contype==='f')-(b.contype==='f')))await db.exec(`ALTER TABLE ${c.relation} ADD CONSTRAINT ${quote(c.conname)} ${c.definition};`);
 for(const f of read('all-functions.json'))if(!['authorize_scheduler_cron','dispatch_scheduler_cron'].includes(f.proname))await db.exec(f.definition);
 for(const t of cat.trigger)await db.exec(t.definition);
 await insert('operators',deps.operators);await insert('release_control',deps.release_control);await insert('sessions',[session]);
 await insert('creation_requests',deps.creation_requests);await insert('final_snapshots',read('gamecast-v500-finals.json').map(x=>x.final));
 for(const f of fs.readdirSync(archiveDir).filter(n=>/^events-\d+\.json$/.test(n)).sort())await insert('events',read(f).map(x=>x.event),true);
 await db.exec("SELECT setval(pg_get_serial_sequence('gamecast_v500.events','event_id'),(SELECT max(event_id) FROM gamecast_v500.events),true);");
 console.log(JSON.stringify({stage:'initialized',at:new Date().toISOString(),database:(await db.query('SELECT version()')).rows[0]}));
}
const progress=(await db.query('SELECT * FROM public.rehearsal_progress')).rows[0];prior=progress.response;let last=Number(progress.version),count=Number(progress.restored);
for(const file of fs.readdirSync(archiveDir).filter(n=>/^requests-\d+-\d+\.json$/.test(n)).sort()){
 const rows=read(file);if(Number(rows.at(-1)?.row.committed_state_version)<=last)continue;
 const began=Date.now();await db.exec('BEGIN');
 try{
  for(const item of rows){
   if(Number(item.row.committed_state_version)<=last)continue;
   const response=applyDelta(prior,item.delta);const row={...item.row,response};
   const actual=(await db.query(`INSERT INTO gamecast_v500.requests AS r SELECT * FROM jsonb_populate_record(NULL::gamecast_v500.requests,$1::jsonb) RETURNING ${sqlhash('r.response::text')} AS response_sha256,${sqlhash('to_jsonb(r)::text')} AS row_sha256`,[JSON.stringify(row)])).rows[0];
   assert.equal(actual.response_sha256,item.response_sha256,'response checksum at '+item.row.committed_state_version);assert.equal(actual.row_sha256,item.row_sha256,'complete receipt checksum');
   prior=response;last=Number(item.row.committed_state_version);count++;
  }
  await db.query('UPDATE public.rehearsal_progress SET version=$1,response=$2::jsonb,restored=$3',[last,JSON.stringify(prior),count]);await db.exec('COMMIT');
 }catch(e){await db.exec('ROLLBACK');throw e;}
 console.log(JSON.stringify({stage:'receipt-batch',file,count,last,elapsedMs:Date.now()-began,rss:process.memoryUsage().rss,at:new Date().toISOString()}));
}
const state=(await db.query(`SELECT state_version,md5(state::text) as md5,${sqlhash('state::text')} as state_sha256,${sqlhash('to_jsonb(s)::text')} as session_sha256 FROM gamecast_v500.sessions s`)).rows[0];
assert.equal(state.state_sha256,deps.source_state_sha256);assert.equal(state.session_sha256,deps.session_sha256);
const finals=(await db.query(`SELECT game_id AS id,${sqlhash('to_jsonb(t)::text')} AS sha256 FROM gamecast_v500.final_snapshots t ORDER BY game_id`)).rows;assert.deepEqual(finals,[...deps.final_hashes].sort((a,b)=>a.id.localeCompare(b.id)));
const events=(await db.query(`SELECT (event_id/1000)::integer as block,count(*)::integer as rows,${sqlhash("string_agg(md5(to_jsonb(t)::text),'' ORDER BY event_id)")} as sha256 FROM gamecast_v500.events t GROUP BY event_id/1000 ORDER BY event_id/1000`)).rows;assert.deepEqual(events,deps.event_checksums);
const counts=(await db.query('SELECT (SELECT count(*) FROM gamecast_v500.sessions)::integer AS sessions,(SELECT count(*) FROM gamecast_v500.final_snapshots)::integer AS finals,(SELECT count(*) FROM gamecast_v500.events)::integer AS events,(SELECT count(*) FROM gamecast_v500.requests)::integer AS requests')).rows[0];
const result={at:new Date().toISOString(),sourceVersion:deps.server_version,restoredVersion:(await db.query('SELECT version()')).rows[0],counts,state,receiptChecksumsVerified:count,lastReceiptVersion:last,complete:count===11211,identity:'local PostgreSQL owner; restored Auth IDs are FK placeholders, not authenticated browser identities',excluded:['Auth credentials','Vault secrets','outbound cron dispatch']};
fs.writeFileSync(path.join(archiveDir,'restore-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await db.close();
const reopened=new PGlite(dataDir);await reopened.exec("SET timezone='UTC'");const check=(await reopened.query('SELECT restored,version FROM public.rehearsal_progress')).rows[0];assert.equal(Number(check.restored),count);assert.equal(Number(check.version),last);await reopened.close();result.reopenVerified=true;fs.writeFileSync(path.join(archiveDir,'restore-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({stage:'reopen-verified',count,last}));
