import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const live=new URL('https://rgbslb11.github.io/Synthcast-Console/');
const route='v5.1.0/week14';
const assets='public/'+route;
const review='public/v5.1.0/review';
const out='out-week14';
const mode=process.argv[2];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const digest=b=>createHash('sha256').update(b).digest('hex');
const get=p=>fetch(new URL(p,live),{cache:'no-store',signal:AbortSignal.timeout(20000)});
async function check(file,root){
 const key=path.relative(root,file);
 const response=await get(key);
 assert.equal(response.status,200,key);
 const remote=Buffer.from(await response.arrayBuffer());
 assert.equal(digest(remote),digest(fs.readFileSync(file)),key);
}
const shared=['auth.mjs','detail-view.mjs','desktop-field.mjs','review.css','detail-view.css','desktop-product.css','synthcast-s.png'];
const overlay=walk(assets);
const sources=new Map([...shared.map(name=>[name,path.join(review,name)]),...overlay.map(file=>[path.basename(file),file])]);
function verifyImports(){
 for(const [name,file] of sources){
  if(!name.endsWith('.mjs'))continue;
  for(const match of fs.readFileSync(file,'utf8').matchAll(/\bfrom\s+['"]\.\/([^'"]+)['"]/g)){
   assert.ok(sources.has(match[1]),`${name} imports unpublished module ${match[1]}`);
  }
 }
}
verifyImports();
assert.equal(overlay.length,4);
if(mode==='prepare'){
 const prior=walk(out);
 for(const name of ['index.html','week14/index.html','v5.0.8/w13/index.html','v5.1.0/review/index.html']){
  assert.ok(fs.existsSync(path.join(out,name)),name);
 }
 const publicFiles=prior.filter(f=>!path.relative(out,f).split('/').some(p=>p.startsWith('.')||p==='CNAME'));
 for(let i=0;i<publicFiles.length;i+=8)await Promise.all(publicFiles.slice(i,i+8).map(f=>check(f,out)));
 const destination=path.join(out,route);
 fs.mkdirSync(destination,{recursive:true});
 for(const [name,file] of sources)fs.copyFileSync(file,path.join(destination,name));
 console.log('Verified '+publicFiles.length+' retained Pages assets');
}else if(mode==='verify'){
 await Promise.all([...sources].map(async ([name,file])=>{
  const response=await get(route+'/'+name);
  assert.equal(response.status,200,name);
  assert.equal(digest(Buffer.from(await response.arrayBuffer())),digest(fs.readFileSync(file)),name);
 }));
 for(const name of ['week14/','v5.0.8/w13/','v5.1.0/review/']){
  assert.equal((await get(name)).status,200,name);
 }
}else throw Error('Expected prepare or verify');
