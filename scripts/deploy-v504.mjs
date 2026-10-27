// Add 5.0.4 while preserving every prior published release byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='https://rgbslb11.github.io/Synthcast-Console/';
const mode=process.argv[2],out=process.argv[3]||'out-v504';
const oldRoot='public/v5.0.2/w8',newRoot='public/v5.0.4/w10';
const baseline='57e688da30d59f470b82c72f8d6f3d6a25991feb';
const sha=x=>createHash('sha256').update(x).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]).sort();
const sources=walk(newRoot),oldSources=walk(oldRoot);
assert.equal(sources.length,15);assert.equal(oldSources.length,15);
assert.equal(execFileSync('git',['diff','--name-only',baseline,'--','public/v5.0.2','release-assets/v5.0.2-week8','supabase'],{encoding:'utf8'}),'');
const prior=JSON.parse(fs.readFileSync('release-assets/gamecast-v5.0.2/prior-pages-manifest.json')).files.map(x=>({...x,classification:'PRESERVED'}));
assert.equal(prior.length,129);
const releases=[
 ['v5.0.2/w8','ea5dfe6d321e1a30a8a353475391e624ba09a262',0],
 ['v5.0.2-ot-patch/w8','a02f34593fd45a5c4859cc6d4b1ac94d20739adb',1],
 ['v5.0.2-ot-patch-2/w8','949cbb965b1daaf3708e6090545e1436edec4b48',2],
 ['v5.0.2-ot-patch-3/w8',baseline,3],
];
function previousBytes(file,ref,patch){
 let b=execFileSync('git',['show',ref+':'+file],{maxBuffer:2*1024*1024});
 if(patch&&file.endsWith('/w8/index.html')){
  let s=b.toString();
  for(const [a,z] of [
   ['<b>GAMECAST 5.0.2</b>','<b>GAMECAST 5.0.2 · OT PATCH</b>'],
   ['legacy/app.css?v=5.0.2-auth2','legacy/app.css?v=5.0.2-ot-patch-1'],
   ['app.js?v=5.0.2-confirm1','app.js?v=5.0.2-ot-patch-1'],
   ['WEEK 8 ROLLOVER: approved slate and approved W8 ratings only. Create a new session on this route. The Chairman link requires sign-in. Share COPY PUBLIC LINK for viewing.','FINISHED-GAME OT EDIT PATCH: use the existing Week 8 session. Do not create a new slate or purge the UI. The Chairman link requires sign-in.']
  ]){assert.equal(s.split(a).length,2);s=s.replace(a,z);}
  if(patch===3)s=s.replace('<b>GAMECAST 5.0.2 · OT PATCH</b>','<b>GAMECAST 5.0.2 · OT STATUS PATCH</b>').replace('app.js?v=5.0.2-ot-patch-1','app.js?v=5.0.2-final-ot-status-3');
  b=Buffer.from(s);
 }
 return b;
}
const optionalPatch3=[];
for(const [web,ref,patch] of releases)for(const file of oldSources){
 const entry={path:web+'/'+file.slice(oldRoot.length+1),sha256:sha(previousBytes(file,ref,patch)),classification:'PRESERVED'};
 if(patch===3)optionalPatch3.push(entry);else prior.push(entry);
}
// Patch 3 exists in source but its proposed route returned 404 during release
// preflight. Preserve any of its files that actually exist; never infer deployment.
for(let i=0;i<optionalPatch3.length;i+=4)await Promise.all(optionalPatch3.slice(i,i+4).map(async entry=>{
 const r=await fetch(root+entry.path,{cache:'no-store',signal:AbortSignal.timeout(25000)});
 assert([200,404].includes(r.status),'Unexpected patch 3 route status '+r.status);
 const body=Buffer.from(await r.arrayBuffer());
 if(r.status===200){assert.equal(sha(body),entry.sha256,'Existing patch 3 bytes changed');prior.push(entry);}
}));
assert(prior.length>=174&&prior.length<=189);assert.equal(new Set(prior.map(x=>x.path)).size,prior.length);
// The complete published 5.0.3 route is retained exactly from its pinned source.
for(const file of walk('public/v5.0.3/w9'))prior.push({path:file.replace(/^public\//,''),sha256:sha(fs.readFileSync(file)),classification:'PRESERVED'});
assert.equal(new Set(prior.map(x=>x.path)).size,prior.length);
const fresh=sources.map(f=>({path:f.replace(/^public\//,''),sha256:sha(fs.readFileSync(f)),classification:'NEW_V504'}));
async function get(file){
 const u=file==='index.html'?root:root+file;
 for(let attempt=0;attempt<3;attempt++){
  const r=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(25000)});
  if((r.status===429||r.status>=500)&&attempt<2){await r.arrayBuffer();continue;}
  assert.equal(r.status,200,'HTTP status: '+file);return Buffer.from(await r.arrayBuffer());
 }
 throw Error('fetch failed '+file);
}
function write(relative,b){assert(!relative.startsWith('/')&&!relative.split('/').includes('..'));const f=path.join(out,relative);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);}
async function audit(items,copy){
 for(let i=0;i<items.length;i+=4){await Promise.all(items.slice(i,i+4).map(async item=>{
  const b=await get(item.path);assert.equal(sha(b),item.sha256,'published byte mismatch: '+item.path);if(copy)write(item.path,b);
 }));if(i%40===0)console.log('Verified published files',Math.min(i+4,items.length),'/',items.length);}
}
fs.mkdirSync('outputs/v504',{recursive:true});
if(mode==='restore'){
 const collision=await fetch(root+'v5.0.4/w10/',{cache:'no-store',signal:AbortSignal.timeout(25000)});
 assert.equal(collision.status,404,'5.0.4 route already published; stop instead of overwriting');await collision.arrayBuffer();
 assert(!fs.existsSync(out)||fs.readdirSync(out).length===0,'Output must be new or empty');fs.mkdirSync(out,{recursive:true});
 await audit(prior,true);
 for(const file of sources)write(file.replace(/^public\//,''),fs.readFileSync(file));
 for(const x of [...prior,...fresh])assert.equal(sha(fs.readFileSync(path.join(out,x.path))),x.sha256);
 fs.writeFileSync('outputs/v504/pages-manifest.json',JSON.stringify({files:[...prior,...fresh]},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',preserved:prior.length,added:15,total:prior.length+15,route:'/v5.0.4/w10/'}));
}else if(mode==='verify'){
 await audit([...prior,...fresh],false);
 const report={status:'PASS',preserved:prior.length,added:15,total:prior.length+15,route:'/v5.0.4/w10/',checkedAt:new Date().toISOString()};
 fs.writeFileSync('outputs/v504/hosted-pages.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else throw Error('Use restore or verify');
