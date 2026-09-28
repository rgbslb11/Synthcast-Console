// Snapshot or restore the exact currently published files. No old route is rebuilt.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='https://rgbslb11.github.io/Synthcast-Console/', mode=process.argv[2],out=process.argv[3],input=process.argv[4];
const hash=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]);
async function get(p){const u=p==='index.html'?base:base+p;const r=await fetch(u,{cache:'no-store'});assert.equal(r.status,200,`Preservation fetch ${p}`);return Buffer.from(await r.arrayBuffer());}
const write=(p,b)=>{assert.ok(!p.startsWith('/')&&!p.split('/').includes('..'),p);const f=path.join(out,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);};
fs.mkdirSync(out,{recursive:true});
if(mode==='snapshot'){
 const seeds=walk(input).map(p=>path.relative(input,p).split(path.sep).join('/'));const pending=new Set([...seeds,'index.html','404.html']),done=new Map();
 while(pending.size){const batch=[...pending].slice(0,8);batch.forEach(p=>pending.delete(p));await Promise.all(batch.map(async p=>{if(done.has(p))return;const b=await get(p);write(p,b);done.set(p,hash(b));if(/\.(html|js|css|json|txt)$/.test(p)){
  const t=b.toString('utf8').replaceAll('\\"','"').replaceAll('\\/','/');const refs=[...t.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]);
  refs.push(...[...t.matchAll(/["'(]((?:\.?\.?\/|\/Synthcast-Console\/|_next\/|static\/)[^\s"'()<>]+\.(?:js|css|woff2?|svg|png|ico|json|txt))(?:\?[^"']*)?["')]/g)].map(m=>m[1]));
  for(const ref of refs){let u;try{u=new URL(ref,ref.startsWith('static/')?base+'_next/':ref.startsWith('_next/')?base:base+p);}catch{continue;}if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Synthcast-Console/'))continue;let key=decodeURIComponent(u.pathname.slice('/Synthcast-Console/'.length));if(key.endsWith('/'))key+='index.html';if(!key||key===p||done.has(key)||u.search||u.hash)continue;if(!/\.(html|js|css|woff2?|svg|png|jpe?g|webp|ico|json|txt)$/.test(key))continue;pending.add(key);}
 }}));}
 // All generated public route files must agree with the published content.
 for(const p of seeds)assert.equal(done.get(p),hash(fs.readFileSync(path.join(input,p))),`Live source differs: ${p}`);
 const manifest={sourceCommit:'01613cf661a9b438affeb5e5fd923d1d0cc69e59',sourceWorkflowRun:36257254023,capturedAt:new Date().toISOString(),publicFiles:seeds.length,files:[...done].sort(([a],[b])=>a.localeCompare(b)).map(([p,sha256])=>({path:p,sha256})),scope:'All 50 public files from the latest successful publication, root and 404 pages, and recursively referenced same-site assets.'};fs.writeFileSync('release-assets/gamecast-v4.4.0/preserved-pages-manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(`PASS snapshot ${manifest.files.length} published files, including ${seeds.length} public route/shared files.`);
}else if(mode==='restore'){
 const m=JSON.parse(fs.readFileSync(input,'utf8'));
 for(let i=0;i<m.files.length;i+=8)await Promise.all(m.files.slice(i,i+8).map(async f=>{const b=await get(f.path);assert.equal(hash(b),f.sha256,'Concurrent published change: '+f.path);write(f.path,b);}));
 assert.ok(!fs.existsSync(path.join(out,'v4.4.0')),'Existing Week 6 route must not be overwritten');fs.cpSync('public/v4.4.0',path.join(out,'v4.4.0'),{recursive:true});
 for(const f of m.files)assert.equal(hash(fs.readFileSync(path.join(out,f.path))),f.sha256);
 fs.writeFileSync('v440-evidence/pages-preservation.json',JSON.stringify({status:'PASS',preservedFiles:m.files.length,priorPublicFiles:m.publicFiles,newRouteFiles:walk('public/v4.4.0').length,sourceWorkflow:m.sourceWorkflowRun,sourceCommit:m.sourceCommit,testedAt:new Date().toISOString()},null,2)+'\n');console.log(`PASS preserved ${m.files.length} files and added only v4.4.0.`);
}else throw Error('Use snapshot or restore');
