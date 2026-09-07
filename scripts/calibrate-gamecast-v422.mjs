import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

let src=fs.readFileSync('supabase/functions/gamecast-week3-v4-2-2/index.ts','utf8').replace(/^import .*;\s*$/gm,'');
const cut=src.indexOf('Deno.serve(');if(cut<0)throw new Error('Deno.serve boundary not found');src=src.slice(0,cut);
const harness=String.raw`
function mk(seed,q=600,ap={offense:80,defense:80,overall:80},hp={offense:80,defense:80,overall:80}){return{id:'CAL',away:{name:'Away',record:''},home:{name:'Home',record:''},neutral:false,quarterLengthSeconds:q,scoreboardSeconds:q,playClockSeconds:40,gameClockStatus:'STOPPED',glSeconds:0,quarter:1,period:'1st',activePeriod:'1',scores:blankScores(),possession:0,fieldPos:25,down:1,distance:10,awayTimeouts:3,homeTimeouts:3,breakSeconds:0,breakLabel:'',pendingPeriod:0,pendingPlay:null,tvBreaksTaken:[],history:[],runHistory:[],auto:true,onAir:false,operatorPaused:false,delayed:false,delayResume:null,editing:false,editSnapshot:null,editResume:null,locked:false,lifecycle:'ACTIVE',activity:'LIVE',speed:1,seedHex:seed,rngState:seedWords(seed,'CAL'),seedLocked:true,runNumber:1,runId:'CAL-R01',continuationOf:null,createdRunAt:'2026-09-07T00:00:00.000Z',launchedAt:'2026-09-07T00:00:00.000Z',completedAt:null,awayPower:ap,homePower:hp,powerReady:true,powerSourceVersion:'CAL',strategyMode:'NORMAL',lastPlay:'',teamPlayCount:[0,0],teamTopSeconds:[0,0]};}
function ok(v,m){if(!v)throw new Error(m)}
function final(g,chunk=10,seen=new Set([1])){let n=0;while(!FINALISH.has(g.lifecycle)&&n++<4000){advanceGame(g,chunk);seen.add(g.quarter)}ok(g.lifecycle==='FINAL_PENDING','non-final seed '+g.seedHex);return g}
function key(g){return JSON.stringify({q:g.quarter,p:g.period,a:g.activePeriod,c:g.scoreboardSeconds,gl:g.glSeconds,s:g.scores,pos:g.possession,f:g.fieldPos,d:g.down,x:g.distance,ato:g.awayTimeouts,hto:g.homeTimeouts,b:g.breakSeconds,bl:g.breakLabel,pp:g.pendingPeriod,pending:g.pendingPlay,rng:g.rngState,plays:g.teamPlayCount,top:g.teamTopSeconds,auto:g.auto,l:g.lifecycle,tv:g.tvBreaksTaken,strategy:g.strategyMode});}
function pct(a,p){const x=[...a].sort((a,b)=>a-b);return x[Math.min(x.length-1,Math.max(0,Math.floor((x.length-1)*p)))]}
const N=500,gls=[],plays=[],margins=[];let ot=0;
for(let i=0;i<N;i++){
  const seen=new Set([1]),g=final(mk('V422-'+String(i).padStart(4,'0')),10,seen);
  ok([1,2,3,4].every(q=>seen.has(q)),'skipped quarter seed '+i);
  ok(!seen.has(0),'quarter 0 seed '+i);
  ok(Object.keys(g.scores).every(validScorePeriod),'invalid score key seed '+i);
  ok(!Object.prototype.hasOwnProperty.call(g.scores,'0'),'score key 0 seed '+i);
  gls.push(g.glSeconds);plays.push(g.teamPlayCount[0]+g.teamPlayCount[1]);margins.push(Math.abs(total(g,0)-total(g,1)));if(Object.keys(g.scores).some(k=>k.includes('OT')))ot++;
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,gm=mean(gls),pm=mean(plays);
ok(gm>=7200&&gm<=8100,'10-minute mean GL outside 2:00-2:15: '+gm);
ok(pm>=105&&pm<=145,'play volume structurally abnormal: '+pm);
for(let i=0;i<100;i++){
  const seed='INV-'+String(i).padStart(3,'0'),a=final(mk(seed),10),b=final(mk(seed),37);
  ok(key(a)===key(b),'chunk invariance failure seed '+seed);
}
for(let i=0;i<100;i++){
  const seed='SPD-'+String(i).padStart(3,'0'),a=mk(seed),b=mk(seed);a.speed=1;b.speed=50;
  const pa=project([a],1000)[0],pb=project([b],20)[0];pa.speed=pb.speed=1;
  ok(key(pa)===key(pb),'1x/50x invariance failure seed '+seed);
}
const gl15=[];for(let i=0;i<50;i++)gl15.push(final(mk('15-'+i,900),10).glSeconds);const m15=mean(gl15);
console.log('V422_CALIBRATION '+JSON.stringify({games:N,glMeanSec:+gm.toFixed(2),glMean:(gm/3600).toFixed(3)+'h',glP10: pct(gls,.10),glMedian:pct(gls,.50),glP90:pct(gls,.90),playsMean:+pm.toFixed(2),marginMean:+mean(margins).toFixed(2),otGames:ot,chunkInvariantSeeds:100,speedInvariantSeeds:100,fifteenMinuteDiagnosticMeanSec:+m15.toFixed(2),fifteenMinuteDiagnosticMean:(m15/3600).toFixed(3)+'h'}));
console.log('GameCast 4.2.2 multi-seed structural calibration PASS');
`;
const js=ts.transpileModule(src+harness,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context={console,crypto:globalThis.crypto,structuredClone,TextEncoder,Date,Math,Set,Object,Array,Number,String,RegExp,JSON,Error};vm.createContext(context);vm.runInContext(js,context,{timeout:30000,filename:'gamecast-v422-calibration.js'});
