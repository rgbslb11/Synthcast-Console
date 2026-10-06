// Preserve published bytes only. Earlier release implementations are not inputs
// to the 4.4.2 generator, and their routes must never be rebuilt here.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='https://rgbslb11.github.io/Synthcast-Console/', mode=process.argv[2], out=process.argv[3];
const manifestPath='release-assets/gamecast-v4.4.2/preserved-pages-manifest.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]);
async function get(p){const r=await fetch(p==='index.html'?base:base+p,{cache:'no-store'});assert.equal(r.status,200,p);return Buffer.from(await r.arrayBuffer());}
function write(p,b){assert.ok(!p.startsWith('/')&&!p.split('/').includes('..'));const f=path.join(out,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);}
assert.ok(out);fs.mkdirSync(out,{recursive:true});fs.mkdirSync('outputs/v442',{recursive:true});
if(mode==='snapshot'){
 const prior=JSON.parse(fs.readFileSync('outputs/v442/prior-publication-manifest.json'));
 const pending=new Set([...prior.files.map(f=>f.path),'v4.5.1-test/index.html']),done=new Map();
 while(pending.size){const batch=[...pending].slice(0,8);batch.forEach(p=>pending.delete(p));await Promise.all(batch.map(async p=>{
  if(done.has(p))return;assert.ok(!p.startsWith('v4.4.2/'));const b=await get(p);write(p,b);done.set(p,hash(b));
  if(/\.(html|js|css|json|txt)$/.test(p)){
   const t=b.toString('utf8').replaceAll('\\"','"').replaceAll('\\/','/');
   const refs=[...t.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]);
   refs.push(...[...t.matchAll(/["'(]((?:\.?\.?\/|\/Synthcast-Console\/|_next\/|static\/)[^\s"'()<>]+\.(?:js|css|woff2?|svg|png|ico|json|txt))(?:\?[^"']*)?["')]/g)].map(m=>m[1]));
   for(const ref of refs){let u;try{u=new URL(ref,ref.startsWith('static/')?base+'_next/':ref.startsWith('_next/')?base:base+p);}catch{continue;}if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Synthcast-Console/'))continue;let key=decodeURIComponent(u.pathname.slice('/Synthcast-Console/'.length));if(key.endsWith('/'))key+='index.html';if(!key||done.has(key)||u.search||u.hash)continue;if(/\.(html|js|css|woff2?|svg|png|jpe?g|webp|ico|json|txt)$/.test(key))pending.add(key);}
  }
 }));}
 for(const f of prior.files)assert.equal(done.get(f.path),f.sha256,'Prior publication changed: '+f.path);
 const m={classification:'OBSERVED FACT',sourceCommit:'9c5ea0d626b4efeb34a06999a3ecb7ecf12ae60a',sourceWorkflowRun:37177479066,capturedAt:new Date().toISOString(),scope:'Complete prior publication manifest plus its only added route and recursively referenced assets; preserved bytes only, no candidate implementation imported.',files:[...done].sort(([a],[b])=>a.localeCompare(b)).map(([p,sha256])=>({path:p,sha256}))};
 fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');console.log('PASS snapshot '+m.files.length+' existing published files.');
}else if(mode==='restore'||mode==='verify'){
 const m=JSON.parse(fs.readFileSync(manifestPath));
 for(let i=0;i<m.files.length;i+=8)await Promise.all(m.files.slice(i,i+8).map(async f=>{const b=await get(f.path);assert.equal(hash(b),f.sha256,'Concurrent publication: '+f.path);if(mode==='restore')write(f.path,b);}));
 if(mode==='restore'){
  assert.ok(!fs.existsSync(path.join(out,'v4.4.2')),'Never overwrite an existing candidate directory');
  fs.cpSync('public/v4.4.2',path.join(out,'v4.4.2'),{recursive:true});
  for(const f of m.files)assert.equal(hash(fs.readFileSync(path.join(out,f.path))),f.sha256);
  assert.equal(walk(out).length,m.files.length+walk('public/v4.4.2').length);
 }
 const report={classification:'TEST RESULT',status:'PASS',preservedFiles:m.files.length,newRoute:'/v4.4.2/',newRouteFiles:walk('public/v4.4.2').length,mode,sourceWorkflow:m.sourceWorkflowRun,testedAt:new Date().toISOString()};
 fs.writeFileSync('outputs/v442/pages-preservation-'+mode+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else throw Error('Use snapshot, restore, or verify');
