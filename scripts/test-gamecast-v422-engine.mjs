import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const file='supabase/functions/gamecast-week3-v4-2-2/index.ts';
let src=fs.readFileSync(file,'utf8');
src=src.replace(/^import .*;\s*$/gm,'');
const cut=src.indexOf('Deno.serve(');
if(cut<0)throw new Error('Deno.serve boundary not found');
src=src.slice(0,cut);

const harness=String.raw`
function mkGame(seed='regression-seed') {
  return {
    id:'TEST', away:{name:'Away',record:''}, home:{name:'Home',record:''}, neutral:false,
    quarterLengthSeconds:600, scoreboardSeconds:600, playClockSeconds:40, gameClockStatus:'STOPPED',
    glSeconds:0, quarter:1, period:'1st', activePeriod:'1', scores:blankScores(), possession:0,
    fieldPos:25, down:1, distance:10, awayTimeouts:3, homeTimeouts:3, breakSeconds:0, breakLabel:'',
    pendingPeriod:0, pendingPlay:null, tvBreaksTaken:[], history:[], runHistory:[], auto:true, onAir:false,
    operatorPaused:false, delayed:false, delayResume:null, editing:false, editSnapshot:null, editResume:null,
    locked:false, lifecycle:'ACTIVE', activity:'LIVE', speed:1, seedHex:seed, rngState:seedWords(seed,'TEST'),
    seedLocked:true, runNumber:1, runId:'TEST-R01', continuationOf:null, createdRunAt:new Date(0).toISOString(),
    launchedAt:new Date(0).toISOString(), completedAt:null,
    awayPower:{offense:80,defense:80,overall:80}, homePower:{offense:80,defense:80,overall:80},
    powerReady:true, powerSourceVersion:'TEST', strategyMode:'NORMAL', lastPlay:'', teamPlayCount:[0,0], teamTopSeconds:[0,0]
  };
}
function assert(c,m){if(!c)throw new Error(m);}

// A scheduled TV timeout is a stoppage, not a quarter transition.
{
  const g=mkGame('tv'); g.quarter=1; g.period='1st'; g.activePeriod='1'; g.scoreboardSeconds=450;
  g.breakSeconds=1; g.breakLabel='Scheduled TV timeout'; g.pendingPeriod=0; g.activity='BREAK'; g.auto=false;
  advanceGame(g,1);
  assert(g.quarter===1,'TV timeout changed quarter');
  assert(g.activePeriod==='1','TV timeout changed score period');
  assert(g.breakSeconds===0 && g.breakLabel==='', 'TV timeout did not clear cleanly');
}

// An end-quarter break transitions exactly once to the pending quarter.
{
  const g=mkGame('period'); g.quarter=1; g.period='1st'; g.activePeriod='1'; g.scoreboardSeconds=0;
  g.breakSeconds=1; g.breakLabel='END 1ST'; g.pendingPeriod=2; g.activity='BREAK'; g.auto=false;
  advanceGame(g,1);
  assert(g.quarter===2,'End 1st did not transition to Q2');
  assert(g.activePeriod==='2','Q2 score period was not activated');
  assert(g.scoreboardSeconds===600,'Q2 clock was not initialized to 10:00');
}

// Fourth-down FG from opponent 11: score is attributed to the active quarter and possession flips after the kick.
{
  const g=mkGame('fg'); g.quarter=2; g.period='2nd'; g.activePeriod='2'; g.scoreboardSeconds=300;
  g.fieldPos=89; g.down=4; g.distance=6; g.possession=0; g.auto=false;
  const p={team:0,desc:'28-yard field goal GOOD',yards:0,points:3,turnover:false,punt:false,fg:true,first:false,inBounds:false,incomplete:false,playSec:5,runoffSec:0,deadSec:0,strategy:'NORMAL',phase:'PLAY',remaining:0,clockBefore:300,edgeAtSnap:0};
  applyPlay(g,p);
  assert(g.scores['2'][0]===3,'FG was not credited to Q2');
  assert(!Object.prototype.hasOwnProperty.call(g.scores,'0'),'Invalid score period 0 was created');
  assert(g.possession===1 && g.fieldPos===25,'Post-FG possession/field state is inconsistent');
}

// Fixed-seed full game must traverse all regulation quarters, never quarter 0, and have normal 10-minute-game GL.
{
  const g=mkGame('full-game-422');
  const seen=new Set([g.quarter]);
  let guard=0;
  while(!FINALISH.has(g.lifecycle) && guard++<12000){ advanceGame(g,1); seen.add(g.quarter); }
  assert(g.lifecycle==='FINAL_PENDING','Full game did not reach FinalPending');
  for(const q of [1,2,3,4])assert(seen.has(q),'Full game skipped regulation quarter '+q);
  assert(!seen.has(0),'Full game entered invalid quarter 0');
  assert(g.glSeconds>=6000,'10-minute game GL is implausibly short: '+g.glSeconds);
  assert(g.glSeconds<=10000,'10-minute game GL is implausibly long: '+g.glSeconds);
  for(const k of Object.keys(g.scores))assert(validScorePeriod(k),'Invalid score key emitted: '+k);
  assert(!Object.prototype.hasOwnProperty.call(g.scores,'0'),'Box score contains invalid period 0');
  console.log(JSON.stringify({status:g.lifecycle,glSeconds:g.glSeconds,quarters:[...seen].sort(),score:[total(g,0),total(g,1)],scoreKeys:Object.keys(g.scores),plays:g.teamPlayCount}));
}
`;

const js=ts.transpileModule(src+harness,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context={console,crypto:globalThis.crypto,structuredClone,TextEncoder,Date,Math,Set,Object,Array,Number,String,RegExp,JSON,Error};
vm.createContext(context);
vm.runInContext(js,context,{timeout:10000,filename:'gamecast-v422-regression.js'});
console.log('GameCast 4.2.2 engine regression PASS');
