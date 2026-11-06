import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('shared WP pool preserves transaction isolation across concurrent requests',async()=>{
 const source=fs.readFileSync('release-assets/v5.1.0/qa-wp-api/index.ts','utf8').replace(/^import .*;\n/gm,'');
 let handler,created=0,options;const seen=[];let release;const barrier=new Promise(r=>release=r);
 let txId=0;
 const pool={unsafe:async(text)=>{seen.push(['pool',text]);return [];},json:x=>x,begin:async fn=>{const id=++txId;return fn({unsafe:async text=>{seen.push([id,text]);return [];}});}};
 vm.runInNewContext(source,{Deno:{env:{get:()=>undefined},serve:fn=>handler=fn},
 postgres:(_url,opts)=>{created++;options=opts;return pool;},wpDatabaseUrl:()=> 'fixture',
 createReportingTransport:()=>({authenticate:()=>null}),createWpSqlAuthorization:()=>()=>null,
 createWpStore:x=>x,createWpHandler:({store})=>async req=>{
  if(req.tx)return store.transaction(async()=>{await store.query(req.name+'-before',[]);await barrier;await store.query(req.name+'-after',[]);});
  return store.query(req.name,[]);
 }});
 const a=handler({tx:true,name:'a'}),b=handler({tx:true,name:'b'});await handler({name:'read'});release();await Promise.all([a,b]);
 assert.equal(created,1);assert.equal(options.max,2);assert.equal(options.prepare,false);
 assert.ok(seen.some(([id,text])=>id==='pool'&&text==='read'));
 for(const name of ['a','b']){const rows=seen.filter(([,text])=>text.startsWith(name+'-'));assert.equal(rows.length,2);assert.equal(rows[0][0],rows[1][0]);assert.notEqual(rows[0][0],'pool');}
 assert.notEqual(seen.find(([,text])=>text==='a-before')[0],seen.find(([,text])=>text==='b-before')[0]);
});
