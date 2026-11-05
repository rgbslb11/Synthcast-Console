import fs from 'node:fs';
import {fetchPublishedFile} from './fetch-preserved.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='https://rgbslb11.github.io/Synthcast-Console/', mode=process.argv[2];
const digest=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]).sort();
const old=JSON.parse(fs.readFileSync('release-assets/v5.1.0/pages-baseline.json')).files;
assert.equal(old.length,234);assert.equal(new Set(old.map(e=>e.path)).size,234);
const fresh=walk('public/v5.1.0/review').map(f=>({path:f.slice(7),sha256:digest(fs.readFileSync(f))}));
assert(fresh.length>10);assert(fresh.every(e=>e.path.startsWith('v5.1.0/review/')&&!old.some(p=>p.path===e.path)));
const previous=JSON.parse(fs.readFileSync('release-assets/v5.1.0/review-previous-manifest.json')).files;
assert.equal(previous.length,13);assert.deepEqual(previous.map(e=>e.path).sort(),fresh.map(e=>e.path).sort());
const out='out-v510-review';
async function get(p){return fetchPublishedFile(root+p);}
function write(p,b){assert(!p.startsWith('/')&&!p.split('/').includes('..'));fs.mkdirSync(path.dirname(`${out}/${p}`),{recursive:true});fs.writeFileSync(`${out}/${p}`,b);}
if(mode==='prepare'){
 assert(!fs.existsSync(out));fs.mkdirSync(out);
}else assert.equal(mode,'verify');
const items=mode==='prepare'?[...old,...previous]:[...old,...fresh];
for(let i=0;i<items.length;i+=4){await Promise.all(items.slice(i,i+4).map(async e=>{const b=await get(e.path);assert.equal(digest(b),e.sha256,`Published bytes differ: ${e.path}`);if(mode==='prepare')write(e.path,b);}));}
if(mode==='prepare')for(const e of fresh)write(e.path,fs.readFileSync('public/'+e.path));
fs.mkdirSync('outputs/v510-hosted',{recursive:true});fs.writeFileSync(`outputs/v510-hosted/${mode}.json`,JSON.stringify({status:'PASS',preserved:old.length,added:fresh.length,files:[...old,...fresh]},null,2));
console.log(JSON.stringify({status:'PASS',mode,preserved:old.length,added:fresh.length}));
