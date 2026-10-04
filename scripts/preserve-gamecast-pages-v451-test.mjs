import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='https://rgbslb11.github.io/Synthcast-Console/',assets='release-assets/gamecast-v4.5.1-test',mode=process.argv[2],out=process.argv[3],hash=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync('v451-test-evidence',{recursive:true});
async function get(p){const r=await fetch(p==='index.html'?base:base+p,{cache:'no-store'});assert.equal(r.status,200,p);return Buffer.from(await r.arrayBuffer());}
function write(p,b){assert.ok(!p.startsWith('/')&&!p.split('/').includes('..'));const f=path.join(out,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);}
if(mode==='snapshot'){
 const prior=JSON.parse(fs.readFileSync('release-assets/gamecast-v4.4.1/preserved-pages-manifest.json')).files.map(x=>x.path);
 const seeds=JSON.parse(fs.readFileSync(assets+'/pages-seed-paths.json'));
 const pending=new Set([...prior,...seeds,'v4.4.1/index.html','v4.4.1/app.js','v4.4.1/deadman.css','v4.4.1/patch-441.js','index.html','404.html']),done=new Map();
 while(pending.size){const batch=[...pending].slice(0,8);batch.forEach(p=>pending.delete(p));await Promise.all(batch.map(async p=>{if(done.has(p))return;const b=await get(p);write(p,b);done.set(p,hash(b));if(/\.(html|js|css|json|txt)$/.test(p)){
 const t=b.toString('utf8').replaceAll('\\"','"').replaceAll('\\/','/');const refs=[...t.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]);
 refs.push(...[...t.matchAll(/["'(]((?:\.?\.?\/|\/Synthcast-Console\/|_next\/|static\/)[^\s"'()<>]+\.(?:js|css|woff2?|svg|png|ico|json|txt))(?:\?[^"']*)?["')]/g)].map(m=>m[1]));
 for(const ref of refs){let u;try{u=new URL(ref,ref.startsWith('static/')?base+'_next/':ref.startsWith('_next/')?base:base+p);}catch{continue;}if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Synthcast-Console/'))continue;let key=decodeURIComponent(u.pathname.slice('/Synthcast-Console/'.length));if(key.endsWith('/'))key+='index.html';if(!key||done.has(key)||u.search||u.hash)continue;if(/\.(html|js|css|woff2?|svg|png|jpe?g|webp|ico|json|txt)$/.test(key))pending.add(key);}
 }}));}
 const manifest={sourceCommit:'eb64653300a893d579935cf7400a38f042903672',sourceWorkflowRun:37082802129,capturedAt:new Date().toISOString(),files:[...done].sort(([a],[b])=>a.localeCompare(b)).map(([p,sha256])=>({path:p,sha256})),scope:'Prior verified publication files, all current public source paths, generated 4.4.1 route, current root/404 and recursively referenced assets.'};fs.writeFileSync(assets+'/preserved-pages-manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('PASS snapshot '+done.size+' current published files.');
}else if(mode==='restore'){
 const m=JSON.parse(fs.readFileSync(assets+'/preserved-pages-manifest.json'));
 for(let i=0;i<m.files.length;i+=8)await Promise.all(m.files.slice(i,i+8).map(async f=>{const b=await get(f.path);assert.equal(hash(b),f.sha256,'Concurrent publication: '+f.path);write(f.path,b);}));
 assert.ok(!fs.existsSync(path.join(out,'v4.5.1-test')));fs.cpSync('public/v4.5.1-test',path.join(out,'v4.5.1-test'),{recursive:true});
 for(const f of m.files)assert.equal(hash(fs.readFileSync(path.join(out,f.path))),f.sha256);
 fs.writeFileSync('v451-test-evidence/pages-preservation.json',JSON.stringify({status:'PASS',preservedFiles:m.files.length,newRoute:'/v4.5.1-test/'},null,2));console.log('PASS '+m.files.length+' preserved published files; added only 4.5.1 test route.');
}else throw Error('Use snapshot or restore');
