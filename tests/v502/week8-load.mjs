import fs from 'node:fs';import assert from 'node:assert/strict';
import * as engine from '../../release-assets/v5.0.2-week8/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.2-week8/backend/runtime/week8.mjs';
const samples=[],start=performance.now();let finalCount=0;
for(let batch=0;batch<20;batch++){
 let state=OPERATING_SLATE.map(s=>{const g={...engine.initialGame(s),qaOnly:true,lifecycle:'ACTIVE',activity:'LIVE',auto:true};g.seedHex='week8-engine-load-'+batch+'-'+s.id;g.rngState=engine.seedWords(g.seedHex,g.id);engine.ensureOpeningToss(g);return g;});
 const t=performance.now();state=engine.project(state,21600);
 assert.ok(state.every(g=>engine.FINALISH.has(g.lifecycle)),'All games must finish within six simulated hours');
 for(const g of state){assert.equal(g.qaOnly,true);assert.equal(g.auto,false);assert.ok(!Object.hasOwn(g.scores,'0'));assert.ok(engine.total(g,0)!==engine.total(g,1));finalCount++;}
 const boardBytes=Buffer.byteLength(JSON.stringify(state));state=null;global.gc();const mem=process.memoryUsage();samples.push({batch,ms:performance.now()-t,heapUsed:mem.heapUsed,rss:mem.rss,completedBoardBytes:boardBytes});
}
const result={status:'PASS',scope:'Local Node engine workload and GC memory samples; not a hosted overnight endurance test',games:finalCount,slates:20,elapsedMs:performance.now()-start,heapMin:Math.min(...samples.map(s=>s.heapUsed)),heapMax:Math.max(...samples.map(s=>s.heapUsed)),samples};
fs.mkdirSync('outputs/v502',{recursive:true});fs.writeFileSync('outputs/v502/week8-engine-load.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));

