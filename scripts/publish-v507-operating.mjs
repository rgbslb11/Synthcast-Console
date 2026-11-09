import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='https://rgbslb11.github.io/Synthcast-Console/',asset='release-assets/v5.0.7-week12-operating',out='out-v507-operating',mode=process.argv[2];
const hash=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]).sort();
const old=JSON.parse(fs.readFileSync(asset+'/pages-baseline.json')).files;
assert.equal(old.length,247);assert.equal(new Set(old.map(e=>e.path)).size,247);
const fresh=walk(asset+'/public').map(f=>({path:f.slice((asset+'/public/').length),sha256:hash(fs.readFileSync(f))}));
assert.equal(fresh.length,15);assert.ok(fresh.every(e=>e.path.startsWith('v5.0.7/w12/')&&!old.some(p=>p.path===e.path)));
async function get(p){for(let n=0;n<3;n++){const r=await fetch(root+p,{cache:'no-store',signal:AbortSignal.timeout(25000)});if((r.status===429||r.status>=500)&&n<2){await r.arrayBuffer();continue;}assert.equal(r.status,200,p);return Buffer.from(await r.arrayBuffer());}}
function write(p,b){assert.ok(!p.startsWith('/')&&!p.split('/').includes('..'));const f=path.join(out,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);}
if(mode==='prepare'){
 assert.ok(!fs.existsSync(out));const r=await fetch(root+'v5.0.7/w12/',{cache:'no-store'});assert.equal(r.status,404,'New route already exists; stop before overwriting it');await r.arrayBuffer();fs.mkdirSync(out);
}else assert.equal(mode,'verify');
const items=mode==='prepare'?old:[...old,...fresh];
for(let i=0;i<items.length;i+=4)await Promise.all(items.slice(i,i+4).map(async e=>{const b=await get(e.path);assert.equal(hash(b),e.sha256,'Published bytes changed: '+e.path);if(mode==='prepare')write(e.path,b);}));
if(mode==='prepare')for(const e of fresh)write(e.path,fs.readFileSync(asset+'/public/'+e.path));
fs.mkdirSync('outputs/v507-operating',{recursive:true});fs.writeFileSync('outputs/v507-operating/pages-'+mode+'.json',JSON.stringify({status:'PASS',mode,preserved:247,added:15,files:[...old,...fresh]},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',mode,preserved:247,added:15}));
