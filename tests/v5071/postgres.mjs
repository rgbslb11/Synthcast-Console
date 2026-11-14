import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
assert.equal(process.env.GITHUB_ACTIONS,'true');const u=new URL(process.env.GC507_PG_URL);assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55432');assert.equal(u.pathname,'/gc507operating');
const pg=await import(pathToFileURL(process.env.PG_MODULE).href);const db=new pg.default.Client({connectionString:u.href});await db.connect();try{
 await db.query('update gamecast_v506_w11.operators set active=true');
 const old=(await db.query('select * from gamecast_v507_w12.sessions')).rows[0];assert.ok(old);
 old.state[0].lifecycle='ACTIVE';old.state[0].glSeconds=27;
 await db.query('update gamecast_v507_w12.sessions set state=$1::jsonb where session_id=$2',[JSON.stringify(old.state),old.session_id]);
 const sql=fs.readFileSync('release-assets/v5.0.7.1/apply-schedule.sql','utf8').replaceAll('w12v507-506ff58ba0cfb7a5',old.public_slug);
 await db.query(sql);const next=(await db.query('select * from gamecast_v507_w12.sessions')).rows[0];assert.equal(Number(next.state_version),Number(old.state_version)+1);assert.equal(String(next.last_advanced_at),String(old.last_advanced_at));
 for(let i=0;i<11;i++)assert.deepEqual(next.state[i],old.state[i]);
 const patch=JSON.parse(fs.readFileSync('release-assets/v5.0.7.1/schedule-patch.json'));for(const p of patch){const g=next.state.find(g=>g.id===p.id);for(const [k,v] of Object.entries(p.patch))assert.deepEqual(g[k],v);const before={...old.state.find(g=>g.id===p.id)},after={...g};for(const k of Object.keys(p.patch))delete before[k],delete after[k];assert.deepEqual(after,before);}
 await db.query(sql);assert.equal(String((await db.query('select state_version from gamecast_v507_w12.sessions')).rows[0].state_version),String(next.state_version));console.log('PASS real disposable PostgreSQL: 49 metadata patches, 11 protected games, active state preserved, elapsed checkpoint preserved, exact idempotent reapply.');
}finally{await db.end();}
