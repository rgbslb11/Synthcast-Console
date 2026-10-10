import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const base='https://rgbslb11.github.io/Synthcast-Console/';
const mode=process.argv[2];
const out=process.argv[3]||'out';
const prior=JSON.parse(fs.readFileSync('release-assets/gamecast-v5.0.0/prior-pages-manifest.json','utf8'));
const candidate='public/v5.0.0';
const evidence='outputs/v500';
const sha=body=>createHash('sha256').update(body).digest('hex');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
async function get(relative){
  const response=await fetch(relative==='index.html'?base:base+relative,{cache:'no-store'});
  assert.equal(response.status,200,relative);
  return Buffer.from(await response.arrayBuffer());
}
function write(relative,body){
  assert.ok(!relative.startsWith('/')&&!relative.split('/').includes('..'));
  const target=path.join(out,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,body);
}
async function verifyPrior(copy){
  for(let i=0;i<prior.files.length;i+=8){
    await Promise.all(prior.files.slice(i,i+8).map(async file=>{
      const body=await get(file.path);
      assert.equal(sha(body),file.sha256,'Existing GitHub Pages byte changed: '+file.path);
      if(copy)write(file.path,body);
    }));
  }
}

fs.mkdirSync(evidence,{recursive:true});
if(mode==='restore'){
  fs.rmSync(out,{recursive:true,force:true});
  fs.mkdirSync(out,{recursive:true});
  await verifyPrior(true);
  assert.ok(!fs.existsSync(path.join(out,'v5.0.0')),'GameCast 5.0.0 route already exists in preserved publication');
  fs.cpSync(candidate,path.join(out,'v5.0.0'),{recursive:true});
  const report={classification:'TEST RESULT',status:'PASS',mode,priorFiles:prior.files.length,newFiles:walk(candidate).length,newRoute:'/v5.0.0/',testedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(evidence,'pages-preservation-restore.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}else if(mode==='verify'){
  await verifyPrior(false);
  for(const file of walk(candidate)){
    const relative=path.relative(candidate,file);
    const live=await get('v5.0.0/'+relative);
    assert.equal(sha(live),sha(fs.readFileSync(file)),'Deployed 5.0.0 byte mismatch: '+relative);
  }
  const report={classification:'TEST RESULT',status:'PASS',mode,priorFiles:prior.files.length,newFiles:walk(candidate).length,newRoute:'/v5.0.0/',testedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(evidence,'pages-preservation-verify.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}else throw Error('Use restore or verify');
