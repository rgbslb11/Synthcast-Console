import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const file='supabase/functions/gamecast-week3-v4-2-2/index.ts';
let src=fs.readFileSync(file,'utf8').replace(/^import .*;\s*$/gm,'');
const cut=src.indexOf('Deno.serve(');
if(cut<0)throw new Error('Deno.serve boundary not found');
src=src.slice(0,cut);

const harness=String.raw`
function mk(seed='AUDIT',quarterSeconds=600){
  return {id:'AUDIT',away:{name:'Away',record:''},home:{name:'Home',record:''},neutral:false,
    quarterLengthSeconds:quarterSeconds,scoreboardSeconds:quarterSeconds,playClockSeconds:40,gameClockStatus:'STOPPED',glSeconds:0,
    quarter:1,period:'1st',activePeriod:'1',scores:blankScores(),possession:0,fieldPos:25,down:1,distance:10,
    awayTimeouts:3,homeTimeouts:3,breakSeconds:0,breakLabel:'',pendingPeriod:0,pendingPlay:null,tvBreaksTaken:[],history:[],runHistory:[],
    auto:true,onAir:false,operatorPaused:false,delayed:false,delayResume:null,editing:false,editSnapshot:null,editResume:null,locked:false,
    lifecycle:'ACTIVE',activity:'LIVE',speed:1,seedHex:seed,rngState:seedWords(seed,'AUDIT'),seedLocked:true,runNumber:1,runId:'AUDIT-R01',
    continuationOf:null,createdRunAt:'2026-09-07T00:00:00.000Z',launchedAt:'2026-09-07T00:00:00.000Z',completedAt:null,
    awayPower:{offense:80,defense:80,overall:80},homePower:{offense:80,defense:80,overall:80},powerReady:true,powerSourceVersion:'AUDIT',
    strategyMode:'NORMAL',lastPlay:'',teamPlayCount:[0,0],teamTopSeconds:[0,0]};
}
function ok(v,m){if(!v)throw new Error(m)}
function football(g){return JSON.stringify({l:g.lifecycle,q:g.quarter,p:g.period,a:g.activePeriod,c:g.scoreboardSeconds,gl:g.glSeconds,s:g.scores,pos:g.possession,f:g.fieldPos,d:g.down,x:g.distance,ato:g.awayTimeouts,hto:g.homeTimeouts,b:g.breakSeconds,bl:g.breakLabel,pp:g.pendingPeriod,pending:g.pendingPlay,rng:g.rngState,plays:g.teamPlayCount,top:g.teamTopSeconds,auto:g.auto,on:g.onAir,paused:g.operatorPaused,delayed:g.delayed});}
function runToFinal(g,chunk=10){let n=0;while(!FINALISH.has(g.lifecycle)&&n++<3000)advanceGame(g,chunk);if(g.lifecycle!=='FINAL_PENDING'){console.log('NONFINAL_DIAGNOSTIC '+JSON.stringify({seed:g.seedHex,chunk,iterations:n,lifecycle:g.lifecycle,quarter:g.quarter,period:g.period,activePeriod:g.activePeriod,clock:g.scoreboardSeconds,gl:g.glSeconds,breakSeconds:g.breakSeconds,breakLabel:g.breakLabel,pendingPeriod:g.pendingPeriod,auto:g.auto,pendingPlay:g.pendingPlay,score:g.scores,plays:g.teamPlayCount,lastPlay:g.lastPlay}));}ok(g.lifecycle==='FINAL_PENDING','did not reach FinalPending');return g;}

// Same seed must not depend on the server's advancement chunk size.
{
  const a=runToFinal(mk('CHUNK'),10),b=runToFinal(mk('CHUNK'),37);
  ok(football(a)===football(b),'fixed-seed result changes with advancement chunk size');
}

// Acceleration changes wall wait, not football history/state.
{
  const a=mk('SPEED'),b=mk('SPEED');a.speed=1;b.speed=50;
  const pa=project([a],1000)[0],pb=project([b],20)[0];
  pa.speed=pb.speed=1;
  ok(football(pa)===football(pb),'1x and 50x differ after equal synthetic elapsed time');
}

// Pause and Delay freeze football state but GL continues.
for(const mode of ['PAUSE','DELAY']){
  const g=mk(mode),rng=JSON.stringify(g.rngState),clock=g.scoreboardSeconds;
  if(mode==='PAUSE')g.operatorPaused=true;else{g.delayed=true;g.lifecycle='DELAY';}
  advanceGame(g,120);
  ok(g.glSeconds===120,mode+' did not advance GL');
  ok(g.scoreboardSeconds===clock,mode+' changed scoreboard clock');
  ok(JSON.stringify(g.rngState)===rng,mode+' consumed RNG while frozen');
}

// Chairman Edit freezes football/RNG, then resumes with a continuation seed.
{
  const g=mk('EDIT'),rng=JSON.stringify(g.rngState),oldRun=g.runId,oldSeed=g.seedHex;
  beginEdit(g,{});advanceGame(g,90);
  ok(g.glSeconds===90,'Edit did not advance GL');
  ok(g.scoreboardSeconds===600,'Edit changed football clock');
  ok(JSON.stringify(g.rngState)===rng,'Edit consumed RNG');
  const e={};commitEdit(g,{scores:{'1':[3,0]},quarter:1,clockSeconds:550,possession:0,ballSide:'OWN',yardline:25,down:1,distance:10,awayTimeouts:3,homeTimeouts:3,resumeAuto:true,hold:false},e);
  ok(g.lifecycle==='ACTIVE'&&g.auto===true,'Edit did not resume AUTO');
  ok(g.runId!==oldRun&&g.seedHex!==oldSeed,'Edit resume did not create continuation seed');
  ok(g.scores['1'][0]===3,'Edit score correction not authoritative');
}

// Correcting a final returns it to FinalPending with derived valid-period total.
{
  const g=mk('FINAL');g.lifecycle='FINAL_PENDING';g.activity='FINAL';g.auto=false;g.scores={'1':[7,0],'2':[0,3],'3':[0,0],'4':[0,0]};
  beginEdit(g,{});const e={};commitEdit(g,{scores:{'1':[7,0],'2':[0,3],'3':[7,0],'4':[0,7]}},e);
  ok(g.lifecycle==='FINAL_PENDING','Final edit did not return to FinalPending');
  ok(total(g,0)===14&&total(g,1)===10,'Final edit total is wrong');
}

// Regulation score attribution must remain Q1-Q4 only when no OT is played.
{
  const g=runToFinal(mk('PERIODS'),10);
  ok(Object.keys(g.scores).every(validScorePeriod),'invalid line-score key emitted');
  ok(!Object.prototype.hasOwnProperty.call(g.scores,'0'),'period 0 emitted');
  ok(g.quarter===4,'regulation final did not finish in Q4');
}

// 15-minute mode is audited diagnostically without changing its tuning in 4.2.2.
{
  const g=runToFinal(mk('FIFTEEN',900),10);
  console.log('15MIN_DIAGNOSTIC '+JSON.stringify({glSeconds:g.glSeconds,glHours:(g.glSeconds/3600).toFixed(3),score:[total(g,0),total(g,1)],plays:g.teamPlayCount,scoreKeys:Object.keys(g.scores)}));
}
console.log('GameCast 4.2.2 broader backend audit PASS');
`;

const js=ts.transpileModule(src+harness,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context={console,crypto:globalThis.crypto,structuredClone,TextEncoder,Date,Math,Set,Object,Array,Number,String,RegExp,JSON,Error};
vm.createContext(context);
vm.runInContext(js,context,{timeout:30000,filename:'gamecast-v422-audit.js'});
