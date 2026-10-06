// Mutations are in-memory test copies only, never candidate artifacts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const names=['automatic-fourth-kneel','forced-kneel-clock','forced-kneel-possession','halftime-carryover','duplicate-half-reset'];
const results=names.map(name=>{
 const proc=spawnSync(process.execPath,['scripts/test-gamecast-v442-football-fixes.mjs','--mutation='+name],{encoding:'utf8'});
 assert.equal(proc.status,1,'Regression suite must reject mutation '+name+' '+proc.stderr);
 const report=JSON.parse(fs.readFileSync(`outputs/v442/mutation-${name}-football-fixes.json`,'utf8'));
 assert.ok(report.failed>0);
 return {mutation:name,status:'KILLED',executed:report.executed,failedAssertions:report.failed,failedGroups:Object.entries(report.groups).filter(([,v])=>v.failed>0).map(([k])=>k)};
});
const report={mutations:results.length,killed:results.length,survived:0,results};
fs.writeFileSync('outputs/v442/fix-mutations.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
