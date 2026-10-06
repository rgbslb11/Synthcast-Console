import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const jobs=[['scripts/test-gamecast-v442-ui.mjs','locked-hidden'],['scripts/test-gamecast-v442-ui.mjs','exact-search'],['scripts/test-gamecast-v442-release.mjs','neutral-hfa'],['scripts/test-gamecast-v442-release.mjs','double-hfa']];
const results=jobs.map(([file,name])=>{const r=spawnSync(process.execPath,[file,'--mutation='+name],{encoding:'utf8'});assert.equal(r.status,1);assert.ok(r.stderr.includes('AssertionError'),name+' must fail assertion, not setup');return{mutation:name,status:'KILLED',exitCode:r.status};});
fs.writeFileSync('outputs/v442/remaining-mutations.json',JSON.stringify({executed:4,killed:4,survived:0,results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
