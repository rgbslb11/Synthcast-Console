import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const request=JSON.parse(fs.readFileSync('release-assets/gamecast-v4.4.2/deploy-request.json'));
assert.equal(request.backendFunction,'gamecast-week7-v4-4-2');assert.equal(request.uiRoot,'/v4.4.2/');assert.equal(request.qaOnly,true);
for(const [name,expected] of Object.entries(request.backendSha256)){
 const bytes=fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/'+name);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,'Deployed source mismatch: '+name);
}
for(const [fn,engine,count] of [['gamecast-week7-v4-4-2','GC-W7-V4.4.2-RC1',54],['gamecast-week6-v4-4-1','GC-W6-V4.4.1-RC1',56]]){
 const r=await fetch('https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/'+fn+'?api=health');assert.equal(r.status,200);const x=await r.json();assert.equal(x.engine_version,engine);assert.equal(x.games,count);
}
const report={classification:'TEST RESULT',status:'PASS',sourceFiles:4,healthChecks:2,backendVersion:request.backendVersion,sourceCommit:request.backendSourceCommit,previousReleaseReachable:true};
fs.writeFileSync('outputs/v442/deployment-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
