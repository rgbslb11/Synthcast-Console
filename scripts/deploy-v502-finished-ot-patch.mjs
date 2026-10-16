// Isolated GameCast 5.0.2 finished-result OT patch publisher.
// Reconstruct the currently published site byte-for-byte, then ADD a new patch route.
// No backend, database, official-result, or original UI path is modified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const root='https://rgbslb11.github.io/Synthcast-Console/';
const baseline='ea5dfe6d321e1a30a8a353475391e624ba09a262';
const existingRoot='public/v5.0.2/w8';
const patchRoot='v5.0.2-ot-patch-2/w8';
const previousPatchRoot='v5.0.2-ot-patch/w8';
const previousPatchCommit='a02f34593fd45a5c4859cc6d4b1ac94d20739adb';
const out=process.argv[3]||'out';
const mode=process.argv[2];
const previous=JSON.parse(fs.readFileSync('release-assets/gamecast-v5.0.2/prior-pages-manifest.json','utf8')).files;
const sha=data=>createHash('sha256').update(data).digest('hex');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]).sort();
const toWebFile=source=>source.replace(/^public\//,'');
const original=execFileSync('git',['ls-tree','-r','--name-only',baseline,'--','public/v5.0.2'],{encoding:'utf8'})
  .trim().split('\n').filter(Boolean).sort();
const patchSource=walk(existingRoot);
const previousPatchFiles=original.map(p=>previousPatchRoot+'/'+p.slice(existingRoot.length+1));
assert.equal(original.length,15,'Expected exactly 15 original GameCast 5.0.2 files');
assert.deepEqual(patchSource,original,'Patch must preserve the exact original 15-file route inventory');
assert.equal(previous.length,129,'Previous site preservation manifest count changed');
const known=new Set(previous.map(x=>x.path));
for(const p of original)assert.ok(!known.has(toWebFile(p)),'Duplicate original route: '+p);
for(const p of patchSource)assert.ok(!known.has(patchRoot+'/'+p.slice(existingRoot.length+1)),'Patch collides with historical route');
function originalBytes(file){return execFileSync('git',['show',baseline+':'+file],{maxBuffer:10*1024*1024});}
function patchIndex(body){
  let s=body.toString('utf8');
  const substitutions=[
    ['<b>GAMECAST 5.0.2</b>','<b>GAMECAST 5.0.2 · OT PATCH</b>'],
    ['legacy/app.css?v=5.0.2-auth2','legacy/app.css?v=5.0.2-ot-patch-1'],
    ['app.js?v=5.0.2-confirm1','app.js?v=5.0.2-ot-patch-1'],
    ['WEEK 8 ROLLOVER: approved slate and approved W8 ratings only. Create a new session on this route. The Chairman link requires sign-in. Share COPY PUBLIC LINK for viewing.','FINISHED-GAME OT EDIT PATCH: use the existing Week 8 session. Do not create a new slate or purge the UI. The Chairman link requires sign-in.']
  ];
  for(const [from,to] of substitutions){
    assert.equal(s.split(from).length,2,'Patch page source marker changed: '+from.slice(0,35));
    s=s.replace(from,to);
  }
  return Buffer.from(s);
}
function previousPatchBytes(webFile){
  const name=webFile.slice(previousPatchRoot.length+1);
  const b=execFileSync('git',['show',previousPatchCommit+':'+existingRoot+'/'+name],{maxBuffer:10*1024*1024});
  return name==='index.html'?patchIndex(b):b;
}
function patchBytes(file){
  const b=fs.readFileSync(file);
  return file===existingRoot+'/index.html'?patchIndex(b):b;
}
function write(file,data){
  assert.ok(!file.startsWith('/')&&!file.split('/').includes('..'),'unsafe output path');
  const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);
}
async function fetchLive(file){
  const u=file==='index.html'?root:root+file;
  for(let attempt=0;attempt<4;attempt++){
    const r=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(20000)});
    if((r.status===429||r.status>=500)&&attempt<3){await r.arrayBuffer();await delay(1200*(attempt+1));continue;}
    assert.equal(r.status,200,'published file not HTTP 200: '+file);
    return Buffer.from(await r.arrayBuffer());
  }
  throw Error('Unable to verify '+file);
}
async function eachChunk(items,fn){
  for(let i=0;i<items.length;i+=4)await Promise.all(items.slice(i,i+4).map(fn));
}
async function existingAudit(copy){
  await eachChunk(previous,async f=>{
    const live=await fetchLive(f.path);
    assert.equal(sha(live),f.sha256,'Previously published file changed: '+f.path);
    if(copy)write(f.path,live);
  });
  await eachChunk(original,async file=>{
    const published=toWebFile(file),expected=originalBytes(file),live=await fetchLive(published);
    assert.equal(sha(live),sha(expected),'Original 5.0.2 deployed file changed: '+published);
    if(copy)write(published,live);
  });
  await eachChunk(previousPatchFiles,async file=>{
    const expected=previousPatchBytes(file),live=await fetchLive(file);
    assert.equal(sha(live),sha(expected),'Previously deployed OT patch changed: '+file);
    if(copy)write(file,live);
  });
}
const patchItems=patchSource.map(file=>({
  source:file,
  published:patchRoot+'/'+file.slice(existingRoot.length+1)
}));
async function patchAudit(){
  await eachChunk(patchItems,async item=>{
    const live=await fetchLive(item.published);
    assert.equal(sha(live),sha(patchBytes(item.source)),'Patch deployed byte mismatch: '+item.published);
  });
}
function manifest(){
  const files=[
    ...previous.map(f=>({path:f.path,sha256:f.sha256,classification:'PRESERVED'})),
    ...original.map(file=>({path:toWebFile(file),sha256:sha(originalBytes(file)),classification:'ORIGINAL_V502'})),
    ...previousPatchFiles.map(file=>({path:file,sha256:sha(previousPatchBytes(file)),classification:'PRESERVED_OT_PATCH'})),
    ...patchItems.map(x=>({path:x.published,sha256:sha(patchBytes(x.source)),classification:'NEW_OT_PATCH_V2'}))
  ];
  assert.equal(files.length,174,'site file count');
  assert.equal(new Set(files.map(x=>x.path)).size,174,'site unique file count');
  return files;
}
const reportDir='outputs/v502-ot-patch';fs.mkdirSync(reportDir,{recursive:true});
if(mode==='restore'){
  const collision=await fetch(root+patchRoot+'/index.html',{cache:'no-store',signal:AbortSignal.timeout(20000)});
  assert.equal(collision.status,404,'Patch route already exists: STOP instead of overwriting');
  await collision.arrayBuffer();
  fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
  await existingAudit(true);
  for(const x of patchItems)write(x.published,patchBytes(x.source));
  for(const {path:file,sha256} of manifest())assert.equal(sha(fs.readFileSync(path.join(out,file))),sha256,'predeployment copied file mismatch '+file);
  const result={status:'PASS',classification:'TEST RESULT',stage:'RESTORED_NOT_DEPLOYED',
    originalPriorFiles:previous.length,originalV502Files:original.length,previousPatchFiles:previousPatchFiles.length,newPatchFiles:patchItems.length,
    totalPublishedFiles:174,patchRoute:'/'+patchRoot+'/',baseline,checkedAt:new Date().toISOString()};
  fs.writeFileSync(reportDir+'/preflight.json',JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(reportDir+'/file-manifest.json',JSON.stringify({files:manifest()},null,2)+'\n');
  console.log(JSON.stringify(result));
}else if(mode==='verify'){
  await existingAudit(false);
  await patchAudit();
  const result={status:'PASS',classification:'TEST RESULT',stage:'HOSTED_VERIFIED',
    originalPriorFiles:previous.length,originalV502Files:original.length,previousPatchFiles:previousPatchFiles.length,newPatchFiles:patchItems.length,
    totalPublishedFiles:174,patchRoute:'/'+patchRoot+'/',baseline,checkedAt:new Date().toISOString()};
  fs.writeFileSync(reportDir+'/postdeployment.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}else throw Error('Use restore or verify');
