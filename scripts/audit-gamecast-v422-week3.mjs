import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read=p=>fs.readFileSync(p,'utf8');
const extractRaw=s=>{const m=s.match(/const RAW=`([\s\S]*?)`\.trim\(\);/);if(!m)throw new Error('RAW block not found');return m[1].trim();};
const week=extractRaw(read('supabase/functions/gamecast-week3-v4-2-2/week3.ts')).split('\n').map((line,k)=>{const [id,date,dateLabel,kickoff,network,matchup]=line.split('|'),[away,home]=matchup.split(' at ');return{id,date,dateLabel,kickoff,network,matchup,away,home,kickoffOrder:k+1};});
const power=Object.fromEntries(extractRaw(read('supabase/functions/gamecast-week3-v4-2-2/power.ts')).split('\n').map(line=>{const [team,off,def,overall]=line.split('|');return[team,{offense:+off,defense:+def,overall:+overall}];}));
if(week.length!==51)throw new Error('Week 3 board is not 51 games');
for(const g of week)if(!power[g.away]||!power[g.home])throw new Error('Missing power: '+g.matchup);

let src=read('supabase/functions/gamecast-week3-v4-2-2/index.ts').replace(/^import .*;\s*$/gm,'');const cut=src.indexOf('Deno.serve(');if(cut<0)throw new Error('Deno.serve boundary not found');src=src.slice(0,cut);
const harness=`
const AUDIT_WEEK=${JSON.stringify(week)};
const AUDIT_POWER=${JSON.stringify(power)};
function mkBoard(s,seed){const ap=AUDIT_POWER[s.away],hp=AUDIT_POWER[s.home];return{id:s.id,away:{name:s.away,record:''},home:{name:s.home,record:''},neutral:false,quarterLengthSeconds:600,scoreboardSeconds:600,playClockSeconds:40,gameClockStatus:'STOPPED',glSeconds:0,quarter:1,period:'1st',activePeriod:'1',scores:blankScores(),possession:0,fieldPos:25,down:1,distance:10,awayTimeouts:3,homeTimeouts:3,breakSeconds:0,breakLabel:'',pendingPeriod:0,pendingPlay:null,tvBreaksTaken:[],history:[],runHistory:[],auto:true,onAir:false,operatorPaused:false,delayed:false,delayResume:null,editing:false,editSnapshot:null,editResume:null,locked:false,lifecycle:'ACTIVE',activity:'LIVE',speed:1,seedHex:seed,rngState:seedWords(seed,s.id),seedLocked:true,runNumber:1,runId:s.id+'-R01',continuationOf:null,createdRunAt:'2026-09-07T00:00:00.000Z',launchedAt:'2026-09-07T00:00:00.000Z',completedAt:null,awayPower:ap,homePower:hp,powerReady:true,powerSourceVersion:'W3',strategyMode:'NORMAL',lastPlay:'',teamPlayCount:[0,0],teamTopSeconds:[0,0]};}
function okBoard(v,m){if(!v)throw new Error(m)}
function pctBoard(a,p){const x=[...a].sort((a,b)=>a-b);return x[Math.min(x.length-1,Math.max(0,Math.floor((x.length-1)*p)))]}
const gls=[],plays=[],margins=[];let ot=0,runs=0;
for(const s of AUDIT_WEEK){for(let r=0;r<5;r++){runs++;const seen=new Set([1]),g=mkBoard(s,s.id+'-W3-'+r);let n=0;while(!FINALISH.has(g.lifecycle)&&n++<3000){advanceGame(g,10);seen.add(g.quarter)};okBoard(g.lifecycle==='FINAL_PENDING','non-final '+s.id+' run '+r);okBoard([1,2,3,4].every(q=>seen.has(q)),'skipped quarter '+s.id+' run '+r);okBoard(!seen.has(0),'quarter 0 '+s.id+' run '+r);okBoard(Object.keys(g.scores).every(validScorePeriod),'invalid score period '+s.id+' run '+r);okBoard(!Object.prototype.hasOwnProperty.call(g.scores,'0'),'score key 0 '+s.id+' run '+r);gls.push(g.glSeconds);plays.push(g.teamPlayCount[0]+g.teamPlayCount[1]);margins.push(Math.abs(total(g,0)-total(g,1)));if(Object.keys(g.scores).some(k=>k.includes('OT')))ot++;}}
const meanBoard=a=>a.reduce((s,x)=>s+x,0)/a.length,gm=meanBoard(gls),pm=meanBoard(plays);okBoard(gm>=7200&&gm<=8100,'Week3 board mean GL outside 2:00-2:15: '+gm);okBoard(pm>=105&&pm<=145,'Week3 board play volume abnormal: '+pm);
console.log('V422_WEEK3_BOARD_AUDIT '+JSON.stringify({games:51,runs,glMeanSec:+gm.toFixed(2),glMean:(gm/3600).toFixed(3)+'h',glMin:Math.min(...gls),glP10:pctBoard(gls,.10),glMedian:pctBoard(gls,.50),glP90:pctBoard(gls,.90),glMax:Math.max(...gls),playsMean:+pm.toFixed(2),marginMean:+meanBoard(margins).toFixed(2),otRuns:ot}));console.log('GameCast 4.2.2 full Week 3 power-board audit PASS');
`;
const js=ts.transpileModule(src+harness,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;const context={console,crypto:globalThis.crypto,structuredClone,TextEncoder,Date,Math,Set,Object,Array,Number,String,RegExp,JSON,Error};vm.createContext(context);vm.runInContext(js,context,{timeout:30000,filename:'gamecast-v422-week3-audit.js'});
