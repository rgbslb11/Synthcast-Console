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
const overlay=walk(assets);
assert.equal(overlay.length,4);
if(mode==='prepare'){
 const prior=walk(out);
 for(const name of ['index.html','week14/index.html','v5.0.8/w13/index.html','v5.1.0/review/index.html']){
  assert.ok(fs.existsSync(path.join(out,name)),name);
 }
 assert.ok(!fs.existsSync(path.join(out,route)));
 assert.equal((await get(route+'/')).status,404);
 const publicFiles=prior.filter(f=>!path.relative(out,f).split('/').some(p=>p.startsWith('.')||p==='CNAME'));
 for(let i=0;i<publicFiles.length;i+=8)await Promise.all(publicFiles.slice(i,i+8).map(f=>check(f,out)));
 const destination=path.join(out,route);
 fs.mkdirSync(destination,{recursive:true});
 for(const name of ['auth.mjs','detail-view.mjs','review.css','detail-view.css','desktop-product.css','synthcast-s.png']){
  fs.copyFileSync(path.join(review,name),path.join(destination,name));
 }
 for(const file of overlay)fs.copyFileSync(file,path.join(destination,path.basename(file)));
 console.log('Verified '+publicFiles.length+' retained Pages assets');
}else if(mode==='verify'){
 await Promise.all(overlay.map(f=>check(f,'public')));
 for(const name of ['week14/','v5.0.8/w13/','v5.1.0/review/']){
  assert.equal((await get(name)).status,200,name);
 }
}else throw Error('Expected prepare or verify');
