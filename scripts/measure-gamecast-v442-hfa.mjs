// Offline diagnostic only. Does not activate or write an engine calibration.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {baselineSource,runtime,game} from './lib/gamecast-v442-harness.mjs';
import {applyFootballFixes} from '../release-assets/gamecast-v4.4.2/football-fixes.mjs';
const n=Number(process.env.HFA_PAIRS || 1000),prefix=process.env.HFA_SEED_PREFIX || 'HFA442-EXPLORE';
const coefficients=(process.env.HFA_EDGES || '0.003,0.004,0.005,0.006,0.035').split(',').map(Number);
assert.ok(Number.isInteger(n)&&n>=1000);assert.ok(coefficients.every(x=>Number.isFinite(x)&&x>=0&&x<=.035));
const src=applyFootballFixes(baselineSource()),anchor='if (!g.neutral) e += t === 1 ? .035 : -.035;';
assert.equal(src.split(anchor).length,2);
const start=performance.now(),results=[];
function final(gc,g){let iterations=0;while(g.lifecycle!=='FINAL_PENDING'&&iterations++<2000)gc.advanceGame(g,10);assert.equal(g.lifecycle,'FINAL_PENDING');}
for(const coefficient of coefficients){
 const gc=runtime(src.replace(anchor,`if (!g.neutral) e += t === 1 ? ${coefficient} : -${coefficient};`));
 let sum=0,squares=0,home=0,neutral=0;
 for(let i=0;i<n;i++){
  const seed=prefix+'-'+String(i).padStart(5,'0'),a=game(gc,seed),b=game(gc,seed);b.neutral=true;
  assert.equal(gc.edge(b,0),0);assert.equal(gc.edge(b,1),0);
  final(gc,a);final(gc,b);
  const h=gc.total(a,1)-gc.total(a,0),v=gc.total(b,1)-gc.total(b,0),d=h-v;
  home+=h;neutral+=v;sum+=d;squares+=d*d;
 }
 const mean=sum/n,variance=(squares-n*mean*mean)/(n-1),se=Math.sqrt(variance/n);
 const result={normalizedEdge:coefficient,pairs:n,games:2*n,meanHomeMargin:home/n,meanNeutralMargin:neutral/n,pairedVenueEffectPoints:mean,standardError:se,empirical95PercentInterval:[mean-1.96*se,mean+1.96*se]};
 results.push(result);console.log(JSON.stringify(result));
}
const report={classification:'TEST RESULT',purpose:'Diagnostic conversion study; no approved calibration or acceptance tolerance inferred',engine:'Verified 4.4.1 plus only candidate kneel and halftime fixes',ratings:{home:[80,80,80],away:[80,80,80]},quarterSeconds:600,seedRange:[prefix+'-00000',prefix+'-'+String(n-1).padStart(5,'0')],chunkSeconds:10,results,runtimeMilliseconds:performance.now()-start};
fs.mkdirSync('outputs/v442',{recursive:true});fs.writeFileSync(`outputs/v442/hfa-${prefix}.json`,JSON.stringify(report,null,2)+'\n');
