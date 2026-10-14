// Destructive steps run ONLY inside a rolled-back transaction in a local database.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const [root,destination,modulePath]=process.argv.slice(2);
if([root,destination,modulePath].some(p=>!path.isAbsolute(p||'')||p.includes('://')))throw Error('Only absolute local paths accepted');
const {PGlite}=await import(pathToFileURL(modulePath));const db=new PGlite(destination);await db.exec("SET timezone='UTC'");
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const manifest=read('FROZEN_DELETION_MANIFEST.json'),report=read('restore-results.json');assert.equal(report.complete,true);assert.equal(report.reopenVerified,true);
const manifestSha=createHash('sha256').update(fs.readFileSync(path.join(root,'FROZEN_DELETION_MANIFEST.json'))).digest('hex');
const checks=[],run=async(name,fn)=>{const at=new Date().toISOString();await fn();checks.push({name,at,expected:'PASS',actual:'PASS'});};
const scalar=async(q,args=[])=>(await db.query(q,args)).rows[0];
const fingerprint=()=>scalar("SELECT (SELECT count(*) FROM gamecast_v500.requests)::integer AS requests,(SELECT count(*) FROM gamecast_v500.events)::integer AS events,(SELECT count(*) FROM gamecast_v500.final_snapshots)::integer AS finals,(SELECT encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex') FROM gamecast_v500.sessions s) AS session_sha256");
const before=await fingerprint();assert.equal(before.requests,11211);
const session=(await db.query('SELECT * FROM gamecast_v500.sessions')).rows[0];
const samples=(await db.query("(SELECT * FROM gamecast_v500.requests WHERE actor_id='SCHEDULER' ORDER BY committed_state_version LIMIT 1) UNION ALL (SELECT * FROM gamecast_v500.requests WHERE actor_id='SCHEDULER' ORDER BY committed_state_version DESC LIMIT 1) UNION ALL (SELECT * FROM gamecast_v500.requests WHERE actor_id<>'SCHEDULER' ORDER BY committed_state_version LIMIT 1) UNION ALL (SELECT * FROM gamecast_v500.requests WHERE actor_id<>'SCHEDULER' ORDER BY committed_state_version DESC LIMIT 1)")).rows;
async function rejected(q,args,match){await db.exec('SAVEPOINT expect_rejection');let rejected=false;try{await db.query(q,args);}catch(e){rejected=true;assert.match(e.message,match);}finally{await db.exec('ROLLBACK TO SAVEPOINT expect_rejection; RELEASE SAVEPOINT expect_rejection');}assert.equal(rejected,true,'operation unexpectedly succeeded');}
const commit="SELECT replayed,encode(sha256(convert_to(response::text,'UTF8')),'hex') AS sha256 FROM gamecast_v500.commit_state($1,$2,$3::jsonb,'[{\"type\":\"V500_RECOVERY_TEST\",\"payload\":{}}]'::jsonb,$4,$5,$6,$7)";
const args=(r,version=1,hash=r.request_hash,key=r.idempotency_key)=>[r.session_id,version,JSON.stringify(session.state),r.actor_id,key,hash,session.last_advanced_at];
await db.exec('BEGIN');
try{
 await run('Restored scheduler/operator receipts replay exact responses without new events',async()=>{
  for(const r of samples){const expected=await scalar("SELECT encode(sha256(convert_to(response::text,'UTF8')),'hex') sha256 FROM gamecast_v500.requests WHERE session_id=$1 AND actor_id=$2 AND idempotency_key=$3",[r.session_id,r.actor_id,r.idempotency_key]);
   const readback=await scalar("SELECT encode(sha256(convert_to(response::text,'UTF8')),'hex') sha256 FROM gamecast_v500.read_request($1,$2,$3,$4)",[r.session_id,r.actor_id,r.idempotency_key,r.request_hash]);assert.equal(readback.sha256,expected.sha256);
   const result=await scalar(commit,args(r));assert.equal(result.replayed,true);assert.equal(result.sha256,expected.sha256);
  }assert.deepEqual(await fingerprint(),before);
 });
 await run('Restored changed-body key rejects',()=>rejected(commit,args(samples[0],1,'f'.repeat(64)),/idempotency conflict/));
 await run('Restored stale version rejects new key',()=>rejected(commit,args(samples[0],1,'e'.repeat(64),'recovery-stale-key-0001'),/version conflict/));
 await run('Imported finals retain immutable trigger',()=>rejected('UPDATE gamecast_v500.final_snapshots SET game_id=game_id',[],/immutable/i));
 await db.exec(fs.readFileSync('tests/v501/retirement-guard.sql','utf8'));
 await db.exec('CREATE TEMP TABLE frozen_manifest (LIKE gamecast_v500.requests EXCLUDING ALL); ALTER TABLE frozen_manifest DROP COLUMN response; ALTER TABLE frozen_manifest ADD COLUMN response_sha256 text, ADD COLUMN row_sha256 text;');
 await db.query('INSERT INTO frozen_manifest SELECT * FROM jsonb_populate_recordset(NULL::frozen_manifest,$1::jsonb)',[JSON.stringify(manifest.rows)]);
 await run('Every proposed row matches frozen full-row checksum after restart',async()=>{
  const row=await scalar("SELECT count(*)::integer AS matched FROM gamecast_v500.requests r JOIN frozen_manifest f USING(session_id,actor_id,idempotency_key) WHERE encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex')=f.row_sha256");assert.equal(row.matched,10997);
 });
 const deletionBefore=await scalar("SELECT count(*)::integer AS rows,sum(pg_column_size(response))::bigint AS stored_payload_bytes FROM gamecast_v500.requests WHERE actor_id='SCHEDULER'");
 await db.query('INSERT INTO gamecast_v501_cleanup.retired_scheduler_requests(session_id,actor_id,idempotency_key,request_hash,committed_state_version,response_sha256,archive_manifest_sha256) SELECT session_id,actor_id,idempotency_key,request_hash,committed_state_version,response_sha256,$1 FROM frozen_manifest',[manifestSha]);
 await run('Exact local cleanup removes 10997 scheduler copies and preserves 214 operator receipts',async()=>{
  const result=await scalar('WITH removed AS (DELETE FROM gamecast_v500.requests r USING frozen_manifest f WHERE r.session_id=f.session_id AND r.actor_id=f.actor_id AND r.idempotency_key=f.idempotency_key RETURNING 1) SELECT count(*)::integer AS rows FROM removed');assert.equal(result.rows,10997);
  assert.equal((await fingerprint()).requests,214);assert.equal((await scalar('SELECT count(*)::integer AS n FROM gamecast_v501_cleanup.retired_scheduler_requests')).n,10997);
 });
 await run('Retired exact historical retry with old version rejects',()=>rejected(commit,args(samples[0]),/version conflict/));
 await run('Retired key cannot be reused with current version and same body',()=>rejected(commit,args(samples[0],session.state_version),/idempotency conflict: retired/));
 await run('Retired key cannot be reused with current version and changed body',()=>rejected(commit,args(samples[0],session.state_version,'d'.repeat(64)),/idempotency conflict: retired/));
 await run('Retirement rejection rolls back state and events atomically',async()=>{const after=await fingerprint();assert.equal(after.session_sha256,before.session_sha256);assert.equal(after.events,before.events);assert.equal(after.finals,before.finals);assert.equal(after.requests,214);});
 await run('New scheduler key still commits normally',async()=>{await db.exec('SAVEPOINT new_key');const r=await scalar(commit,args(samples[0],session.state_version,'c'.repeat(64),'recovery-new-key-0001'));assert.equal(r.replayed,false);assert.equal((await fingerprint()).requests,215);await db.exec('ROLLBACK TO SAVEPOINT new_key; RELEASE SAVEPOINT new_key');});
 await run('Retirement table is unavailable to public/authenticated/service roles',async()=>{for(const role of ['anon','authenticated','service_role'])assert.equal((await scalar("SELECT has_schema_privilege($1,'gamecast_v501_cleanup','usage') AS allowed",[role])).allowed,false);});
 const after=await fingerprint();await db.exec('ROLLBACK');assert.deepEqual(await fingerprint(),before);
 const result={at:new Date().toISOString(),identity:'local PostgreSQL owner; author verification',productionDeletion:false,manifestSha256:manifestSha,checks,before,disposableDeletion:{before:deletionBefore,after,removed:10997,rollbackVerified:true},exitCode:0};
 fs.writeFileSync(path.join(root,'replay-retirement-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:checks.length,exitCode:0,rolledBack:true}));
}catch(e){await db.exec('ROLLBACK');throw e;}finally{await db.close();}
