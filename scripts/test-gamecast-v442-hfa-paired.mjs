// Diagnostic comparison of the exact baseline and complete assembled candidate.
// No retuning and no newly invented statistical acceptance band.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {baselineSource,runtime,game} from './lib/gamecast-v442-harness.mjs';
const versions=[['4.4.1',runtime(baselineSource()),.035],['4.4.2',runtime(fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8'),'ensureOpeningToss'),.006]];
const results=[],started=performance.now(),n=1000;
for(const [version,gc,edge] of versions){
 let sum=0,squares=0,home=0,neutral=0;
 for(let i=0;i<n;i++){
  const seed='GC442-HFA-PAIRED-'+String(i).padStart(4,'0'),a=game(gc,seed),b=structuredClone(a);b.neutral=true;
  assert.equal(gc.edge(a,1),edge);assert.equal(gc.edge(a,0),-edge);assert.equal(gc.edge(b,1),0);assert.equal(gc.edge(b,0),0);
  const [h,v]=[gc.project([a],21600)[0],gc.project([b],21600)[0]];assert.equal(h.lifecycle,'FINAL_PENDING');assert.equal(v.lifecycle,'FINAL_PENDING');
  const hm=gc.total(h,1)-gc.total(h,0),nm=gc.total(v,1)-gc.total(v,0),d=hm-nm;home+=hm;neutral+=nm;sum+=d;squares+=d*d;
 }
 const mean=sum/n,se=Math.sqrt((squares-n*mean*mean)/(n-1)/n);
 results.push({version,pairs:n,fullGames:2*n,normalizedEdge:edge,homeMeanMargin:home/n,neutralMeanMargin:neutral/n,pairedVenueEffectPoints:mean,standardError:se,empirical95PercentInterval:[mean-1.96*se,mean+1.96*se]});
}
const report={classification:'TEST RESULT',status:'PASS',meaning:'Identical fixed seeds and symmetric ratings; correct approved coefficients and exact neutral zero; effect estimates reported without inventing a tolerance',executed:2000,passed:2000,failed:0,skipped:0,fullGames:4000,seedRange:['GC442-HFA-PAIRED-0000','GC442-HFA-PAIRED-0999'],ratings:[80,80,80],quarterSeconds:600,results,runtimeMilliseconds:performance.now()-started};
fs.writeFileSync('outputs/v442/hfa-paired-final.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
