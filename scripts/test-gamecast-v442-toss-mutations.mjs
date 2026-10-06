import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const names=['away-always-receives','q3-not-reciprocal','retry-rerolls','wrong-kick-probability'];
const results=names.map(name=>{
 const proc=spawnSync(process.execPath,['scripts/test-gamecast-v442-coin-toss.mjs','--mutation='+name],{encoding:'utf8'});
 assert.equal(proc.status,1,'Test must reject mutation '+name);
 assert.ok(proc.stderr.includes('AssertionError'),'Must fail an assertion, not tool setup');
 return {mutation:name,status:'KILLED',exitCode:proc.status,firstFailure:proc.stderr.match(/AssertionError[^\n]*\n(?:[^\n]*\n){0,3}/)?.[0]?.trim()};
});
fs.writeFileSync('outputs/v442/toss-mutations.json',JSON.stringify({executed:names.length,killed:results.length,survived:0,results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
