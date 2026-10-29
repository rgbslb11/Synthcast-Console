import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.5-week10/backend/runtime/week10.mjs';
import {fields,fresh,sum,analyze} from './analyze.mjs';
const dir=new URL('../../outputs/v505/',import.meta.url),base=fs.readFileSync(new URL('../../release-assets/v5.0.5-week10/backend/runtime/engine.mjs',import.meta.url),'utf8');
let results=[];
const stable=g=>JSON.stringify(g.history,(k,v)=>k==='masterZulu'?undefined:v);
function scalar(){return {n:0,score:0,shutout:0,close:0,blowout:0,margin:0,gl:0,ot:0,lowerWins:0,unequal:0};}
async function trial(id,runAdd,passAdd,fixtures=slate,prefix='GC504_W10_POPULATION_R1',N=1000){
 let source=base.replace("from './week10.mjs'","from '../../release-assets/v5.0.5-week10/backend/runtime/week10.mjs'").replace("from './power.mjs'","from '../../release-assets/v5.0.5-week10/backend/runtime/power.mjs'").replaceAll("from '../src/","from '../../release-assets/v5.0.5-week10/backend/src/");
 const passLine='      wxAudit={...wxAudit,explosiveBefore:explosiveBase,explosiveAfter:explosive};';
 const runLine='      inBounds = rnd(g) > (protectLateLead(g) ? .02 : .08);';
 if(passAdd)source=source.replace(passLine,`      yards += ${passAdd};\n`+passLine);
 if(runAdd)source=source.replace(runLine,`      if(yards > 0) yards += ${runAdd};\n`+runLine);
 if(source===base&&(runAdd||passAdd))throw Error('Patch failed');
 fs.writeFileSync(new URL(id+'.mjs',dir),source);const E=await import(new URL(id+'.mjs',dir));
 const aggregate=fresh(),all=scalar(),per=[],checks={state:0,scoreLedger:0,playCounter:0,regulationPoints:0,sameSeed:0,chunkHistory:0};
 for(let j=0;j<fixtures.length;j++){
  const f=fixtures[j],teamStats=[fresh(),fresh()],ps=scalar();let sample;
  function execute(seed,chunk=20000){const g=E.initialGame(f);g.qaOnly=true;g.seedHex=seed;g.rngState=E.seedWords(seed,g.id);g.lifecycle='ACTIVE';g.auto=true;E.ensureOpeningToss(g);let left=20000;while(left>0){const n=Math.min(chunk,left);E.advanceGame(g,n);left-=n;}return g;}
  for(let i=0;i<N;i++){
   const seed=createHash('sha256').update(prefix+'|'+f.id+'|'+i).digest('hex').slice(0,32),g=execute(seed),stats=analyze(g),away=E.total(g,0),home=E.total(g,1),margin=Math.abs(away-home);
   if(g.lifecycle!=='FINAL_PENDING'||margin===0||g.teamTopSeconds.reduce((a,b)=>a+b,0)!==2400)checks.state++;
   for(let t=0;t<2;t++){
    const s=stats[t];sum(aggregate,s);sum(teamStats[t],s);
    if(s.snaps+s.punts+s.fgAttempts!==g.teamPlayCount[t])checks.playCounter++;
    const logged=g.history.filter(h=>h.team===t&&h.points!==undefined).reduce((a,h)=>a+h.points,0);if(logged!==E.total(g,t))checks.scoreLedger++;
    if(s.drivePoints+2*stats[1-t].safetiesConceded!==['1','2','3','4'].reduce((a,k)=>a+g.scores[k][t],0))checks.regulationPoints++;
   }
   const x=scalar();x.n=1;x.score=away+home;x.shutout=Math.min(away,home)===0?1:0;x.close=margin<8?1:0;x.blowout=margin>=28?1:0;x.margin=margin;x.gl=g.glSeconds;x.ot=Object.keys(g.scores).some(k=>k.includes('OT'))?1:0;
   if(g.awayPower.overall!==g.homePower.overall){x.unequal=1;x.lowerWins=((g.awayPower.overall<g.homePower.overall)===(away>home))?1:0;}
   for(const k in x){all[k]+=x[k];ps[k]+=x[k];}
   if(i===0)sample={seed,history:stable(g)};
  }
  if(stable(execute(sample.seed))!==sample.history)checks.sameSeed++;
  if(stable(execute(sample.seed,37))!==sample.history)checks.chunkHistory++;
  per.push({id:f.id,matchup:f.matchup,away:f.away,home:f.home,awayStats:teamStats[0],homeStats:teamStats[1],population:ps});
  if((j+1)%14===0)console.log(id+' '+(j+1)+'/'+fixtures.length);
 }
 const r={id,runAdd,passAdd,multiplier:2,normalRunoffBase:18,seedPrefix:prefix,seedsPerMatchup:N,checks,aggregate,population:all,perMatchup:per};results.push(r);fs.writeFileSync(new URL('results.json',dir),JSON.stringify(results,null,2));console.log('DONE '+JSON.stringify({id,shutouts:100*all.shutout/all.n,close7:100*all.close/all.n,snaps:aggregate.snaps/all.n,points:all.score/all.n,ypp:aggregate.yards/aggregate.snaps,checks}));return r;
}

await trial('release505',0,0);
