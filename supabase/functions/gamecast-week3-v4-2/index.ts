import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { WEEK3 } from "./week3.ts";
import { TEAM_POWER, type TeamPowerInput } from "./power.ts";

const ENGINE_VERSION="GC-W3-V4.2.0-RC1";
const DATA_VERSION="W3-51+POWER_CONTRACT_V1";
const WEEK_KEY="2026-W03";
const CONSOLE_URL="https://rgbslb11.github.io/Synthcast-Console/v4.2/";
const SPEEDS=[1,4,10,50];
const FINALISH=new Set(["FINAL_PENDING","LOCKED","READY","FINAL"]);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-operator-token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json; charset=utf-8"}});
const clamp=(lo:number,v:number,hi:number)=>Math.max(lo,Math.min(v,hi));
const now=()=>new Date().toISOString();
const randHex=(n:number)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,"0")).join("");
const sha256=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,"0")).join("");
type Game=Record<string,any>;
type Segment={kind:"PLAY"|"DEAD"|"RUNOFF",remaining:number,clockRuns:boolean};
type PendingPlay={team:0|1,playType:string,description:string,yards:number,points:number,turnover:boolean,punt:boolean,fieldGoal:boolean,firstDown:boolean,inBounds:boolean,incomplete:boolean,playDuration:number,segments:Segment[],strategy:string,clockBefore:number,applied:boolean};

function seedWords(seed:string,id:string){const t=`${seed}|${id}`;let a=0x9e3779b9,b=0x243f6a88,c=0xb7e15162,d=0xdeadbeef;for(let i=0;i<t.length;i++){const x=t.charCodeAt(i);a=Math.imul(a^x,2654435761)>>>0;b=Math.imul(b^x,1597334677)>>>0;c=Math.imul(c^x,2246822519)>>>0;d=Math.imul(d^x,3266489917)>>>0}return[a||1,b||2,c||3,d||4]}
function rnd(g:Game){let[a,b,c,d]=g.rngState as number[];const t=(a+b+d)>>>0;d=(d+1)>>>0;a=(b^(b>>>9))>>>0;b=(c+(c<<3))>>>0;c=((c<<21)|(c>>>11))>>>0;c=(c+t)>>>0;g.rngState=[a,b,c,d];return t/4294967296}
const runId=(id:string,n:number)=>`${id}-R${String(n).padStart(2,"0")}`;
function blankScores(){return{"1":[0,0],"2":[0,0],"3":[0,0],"4":[0,0]}}
function total(g:Game,t:0|1):number{return (Object.values(g.scores??{}) as any[]).reduce((s:number,q:any)=>s+(Number(q?.[t])||0),0)}
function periodKey(q:number){return String(q)}
function periodLabel(q:number){return q===1?"1st":q===2?"2nd":q===3?"3rd":"4th"}
function ratingReady(p:any){return !!p&&Number.isFinite(Number(p.offense))&&Number.isFinite(Number(p.defense))&&Number.isFinite(Number(p.overall))}
function powerFor(team:string){const p=TEAM_POWER[team];return p?structuredClone(p):null}
function setPowerReady(g:Game){g.powerReady=ratingReady(g.awayPower)&&ratingReady(g.homePower)}
function initialGame(s:any):Game{
  const seedHex=randHex(16),runNumber=1,awayPower=powerFor(s.away),homePower=powerFor(s.home);
  const g:Game={...s,away:{name:s.away,record:""},home:{name:s.home,record:""},quarterLengthSeconds:600,scoreboardSeconds:600,playClockSeconds:40,gameClockStatus:"STOPPED",restartRule:"SNAP",glSeconds:0,period:"1st",quarter:1,activePeriod:"1",otCount:0,speed:1,scores:blankScores(),possession:0,fieldPos:25,down:1,distance:10,awayTimeouts:3,homeTimeouts:3,breakSeconds:0,breakLabel:"",pendingPeriod:0,pendingPlay:null,tvBreaksTaken:[],history:[],runHistory:[],audit:[],auto:false,onAir:false,operatorPaused:false,delayed:false,editing:false,editSnapshot:null,editResume:null,locked:false,lifecycle:"UNLAUNCHED",activity:"UPCOMING",simAllowed:true,finalOfRecord:false,seedHex,rngState:seedWords(seedHex,s.id),seedLocked:false,runNumber,runId:runId(s.id,runNumber),continuationOf:null,createdRunAt:now(),launchedAt:null,completedAt:null,lastPlay:"Ready for launch · Week 3 power pending",awayPower,homePower,powerReady:false,powerSourceVersion:null,strategyMode:"NORMAL"};
  setPowerReady(g);if(g.powerReady)g.lastPlay="Ready for launch · Week 3 power loaded";return g;
}
function score(g:Game,t:0|1,pts:number,source="SIM"){const k=g.activePeriod,cur=g.scores[k]??[0,0],n:[number,number]=[Number(cur[0]||0),Number(cur[1]||0)];n[t]+=pts;g.scores[k]=n;g.history.push({masterZulu:now(),gl:g.glSeconds,period:k,team:t,points:pts,source})}
function offenseScore(g:Game):number{return g.possession===0?total(g,0):total(g,1)}
function defenseScore(g:Game):number{return g.possession===0?total(g,1):total(g,0)}
function offenseTO(g:Game):number{return g.possession===0?g.awayTimeouts:g.homeTimeouts}
function defenseTO(g:Game):number{return g.possession===0?g.homeTimeouts:g.awayTimeouts}
function useTimeout(g:Game,team:0|1){if(team===0&&g.awayTimeouts>0){g.awayTimeouts--;return true}if(team===1&&g.homeTimeouts>0){g.homeTimeouts--;return true}return false}
function strategy(g:Game){
  if(g.quarter!==2&&g.quarter!==4)return "NORMAL";
  const diff=offenseScore(g)-defenseScore(g),t=g.scoreboardSeconds;
  if(g.quarter===4&&t<=160&&diff>0&&defenseTO(g)===0)return "KNEEL";
  if(g.quarter===4&&t<=240&&diff>0)return "FOUR_MINUTE";
  if(g.quarter===4&&t<=90&&diff<=-9)return "DESPERATION";
  if(g.quarter===4&&t<=120&&Math.abs(diff)<=3&&g.fieldPos>=60)return "FG_MANAGEMENT";
  if(g.quarter===4&&t<=120&&diff<=0)return "TWO_MINUTE";
  if(g.quarter===2&&t<=120)return "END_HALF";
  if(t<=240)return diff>0?"FOUR_MINUTE":(g.quarter===2?"END_HALF":"TWO_MINUTE");
  return "NORMAL";
}
function normalizedEdge(g:Game,t:0|1){const own=t===0?g.awayPower:g.homePower,opp=t===0?g.homePower:g.awayPower;if(!ratingReady(own)||!ratingReady(opp))return 0;const vals=[Math.abs(Number(own.offense)),Math.abs(Number(opp.defense)),Math.abs(Number(own.overall)),Math.abs(Number(opp.overall))],scale=Math.max(1,vals.reduce((a,b)=>a+b,0)/vals.length);let e=(.62*(Number(own.offense)-Number(opp.defense))+.38*(Number(own.overall)-Number(opp.overall)))/scale;if(!g.neutral)e+=t===1?.035:-.035;return clamp(-.45,e,.45)}
function passRate(mode:string){return mode==="KNEEL"?0:mode==="FOUR_MINUTE"?.28:mode==="TWO_MINUTE"?.74:mode==="DESPERATION"?.86:mode==="END_HALF"?.66:mode==="FG_MANAGEMENT"?.58:.50}
function fourthDownGo(g:Game,mode:string){if(g.down!==4)return false;const diff=offenseScore(g)-defenseScore(g);if(mode==="DESPERATION"||mode==="TWO_MINUTE")return g.distance<=8||g.scoreboardSeconds<80;if(g.quarter===4&&diff<0&&g.scoreboardSeconds<300)return g.distance<=5;return g.fieldPos>=45&&g.distance<=2}
function fgRange(g:Game){return g.fieldPos>=62}
function makeBetween(g:Game,p:PendingPlay){
  const under2=(g.quarter===2||g.quarter===4)&&g.scoreboardSeconds<=120;
  let stopped=0,running=0;
  if(p.incomplete||!p.inBounds||p.points>0||p.turnover||p.punt||p.fieldGoal){stopped=p.strategy==="TWO_MINUTE"||p.strategy==="DESPERATION"?12:22}
  else if(under2&&p.firstDown){stopped=3;running=p.strategy==="TWO_MINUTE"||p.strategy==="DESPERATION"?7:12}
  else if(p.strategy==="FOUR_MINUTE"||p.strategy==="KNEEL")running=36;
  else if(p.strategy==="TWO_MINUTE"||p.strategy==="DESPERATION")running=10;
  else if(p.strategy==="END_HALF"||p.strategy==="FG_MANAGEMENT")running=14;
  else running=27;
  const diff=offenseScore(g)-defenseScore(g),off=g.possession as 0|1,def=(off===0?1:0) as 0|1;
  if(running>0&&g.quarter===4&&diff>0&&g.scoreboardSeconds<=180&&defenseTO(g)>0&&useTimeout(g,def)){stopped=45;running=0;g.lastPlay+=" · defensive timeout"}
  else if(running>0&&(p.strategy==="TWO_MINUTE"||p.strategy==="DESPERATION")&&g.scoreboardSeconds<=55&&offenseTO(g)>0&&useTimeout(g,off)){stopped=35;running=0;g.lastPlay+=" · offensive timeout"}
  const segs:Segment[]=[];if(stopped>0)segs.push({kind:"DEAD",remaining:stopped,clockRuns:false});if(running>0)segs.push({kind:"RUNOFF",remaining:running,clockRuns:true});return segs;
}
function generatePlay(g:Game){
  if(!g.powerReady){g.auto=false;g.lastPlay="AUTO blocked · Week 3 offense/defense/overall power missing";return}
  const t=g.possession as 0|1,mode=strategy(g),edge=normalizedEdge(g,t);g.strategyMode=mode;
  if(mode==="KNEEL"){g.pendingPlay={team:t,playType:"KNEEL",description:"Quarterback kneel",yards:-1,points:0,turnover:false,punt:false,fieldGoal:false,firstDown:false,inBounds:true,incomplete:false,playDuration:2,segments:[{kind:"PLAY",remaining:2,clockRuns:true}],strategy:mode,clockBefore:g.scoreboardSeconds,applied:false};return}
  if(g.down===4&&fgRange(g)&&!fourthDownGo(g,mode)){
    const dist=117-g.fieldPos,make=clamp(.45,.90-(Math.max(0,dist-35)*.018)+edge*.25,.96),ok=rnd(g)<make;
    g.pendingPlay={team:t,playType:"FIELD_GOAL",description:`${dist}-yard field goal ${ok?"GOOD":"NO GOOD"}`,yards:0,points:ok?3:0,turnover:!ok,punt:false,fieldGoal:true,firstDown:false,inBounds:false,incomplete:false,playDuration:5,segments:[{kind:"PLAY",remaining:5,clockRuns:true}],strategy:mode,clockBefore:g.scoreboardSeconds,applied:false};return
  }
  if(g.down===4&&!fourthDownGo(g,mode)&&g.fieldPos<62){const net=34+Math.floor(rnd(g)*15);g.pendingPlay={team:t,playType:"PUNT",description:`Punt · ${net} net yards`,yards:net,points:0,turnover:false,punt:true,fieldGoal:false,firstDown:false,inBounds:false,incomplete:false,playDuration:7,segments:[{kind:"PLAY",remaining:7,clockRuns:true}],strategy:mode,clockBefore:g.scoreboardSeconds,applied:false};return}
  const pass=rnd(g)<passRate(mode),r=rnd(g);let yards=0,incomplete=false,inBounds=true,turnover=false,desc="";
  if(pass){const sack=clamp(.035,.065-edge*.04,.09),pick=clamp(.012,.025-edge*.025,.045),comp=clamp(.48,.62+edge*.18,.76);if(r<sack){yards=-(3+Math.floor(rnd(g)*8));desc=`Sack for ${-yards}-yard loss`}else if(r<sack+pick){yards=Math.floor(rnd(g)*12);turnover=true;desc="Pass intercepted"}else if(r<sack+pick+comp){const explosive=rnd(g)<(.12+edge*.08);yards=explosive?16+Math.floor(rnd(g)*29):2+Math.floor(rnd(g)*14);inBounds=rnd(g)>(mode==="TWO_MINUTE"||mode==="DESPERATION"?.32:.12);desc=`Pass complete for ${yards} yards${inBounds?" in bounds":" out of bounds"}`}else{incomplete=true;inBounds=false;desc="Incomplete pass"}}
  else{const fumble=clamp(.006,.014-edge*.01,.025);if(r<fumble){yards=Math.floor(rnd(g)*8);turnover=true;desc="Run · fumble lost"}else{const loss=rnd(g)<.15;if(loss)yards=-(1+Math.floor(rnd(g)*4));else{const explosive=rnd(g)<(.08+edge*.05);yards=explosive?11+Math.floor(rnd(g)*25):Math.floor(rnd(g)*9)}inBounds=rnd(g)>.08;desc=`Run for ${yards} yards${inBounds?" in bounds":" out of bounds"}`}}
  const firstDown=!turnover&&!incomplete&&yards>=g.distance,playDuration=3+Math.floor(rnd(g)*6);g.pendingPlay={team:t,playType:pass?"PASS":"RUN",description:desc,yards,points:0,turnover,punt:false,fieldGoal:false,firstDown,inBounds,incomplete,playDuration,segments:[{kind:"PLAY",remaining:playDuration,clockRuns:true}],strategy:mode,clockBefore:g.scoreboardSeconds,applied:false};
}
function flipPossession(g:Game,newField:number){g.possession=g.possession===0?1:0;g.fieldPos=clamp(1,Math.round(newField),99);g.down=1;g.distance=Math.min(10,100-g.fieldPos);g.playClockSeconds=25;g.gameClockStatus="STOPPED";g.restartRule="SNAP"}
function applyPlayOutcome(g:Game,p:PendingPlay){
  if(p.applied)return;p.applied=true;const team=p.team,oldPos=g.fieldPos;
  if(p.fieldGoal){if(p.points)score(g,team,p.points,"SIM");flipPossession(g,25);g.lastPlay=`${team===0?g.away.name:g.home.name} · ${p.description}`}
  else if(p.punt){const landing=clamp(1,oldPos+p.yards,99);flipPossession(g,100-landing);g.lastPlay=`${team===0?g.away.name:g.home.name} · ${p.description}`}
  else if(p.turnover){const spot=clamp(1,oldPos+Math.max(0,p.yards),99);flipPossession(g,100-spot);g.lastPlay=`${team===0?g.away.name:g.home.name} · ${p.description}`}
  else{
    const next=oldPos+p.yards;
    if(next>=100){score(g,team,7,"SIM");flipPossession(g,25);g.lastPlay=`${team===0?g.away.name:g.home.name} · TOUCHDOWN · ${p.description}`;p.points=7}
    else{g.fieldPos=clamp(1,next,99);if(p.firstDown){g.down=1;g.distance=Math.min(10,100-g.fieldPos)}else{const gained=p.yards;g.distance=Math.max(1,g.distance-gained);g.down=(g.down+1) as 1|2|3|4;if(g.down>4){const spot=g.fieldPos;flipPossession(g,100-spot);g.lastPlay="Turnover on downs"}else g.lastPlay=`${team===0?g.away.name:g.home.name} · ${p.description}`}}
  }
  g.history.push({masterZulu:now(),gl:g.glSeconds,period:g.activePeriod,clock:g.scoreboardSeconds,team,playType:p.playType,description:p.description,yards:p.yards,strategy:p.strategy,fieldPos:g.fieldPos,down:g.down,distance:g.distance,score:[total(g,0),total(g,1)]});
  if(g.lifecycle!=="ACTIVE")return;
  if(g.scoreboardSeconds<=0){finishPeriod(g);return}
  if(g.breakSeconds<=0)p.segments.push(...makeBetween(g,p));
  if(p.segments.length===0)g.pendingPlay=null;
}
function thresholds(g:Game){const q=g.quarterLengthSeconds;if(g.quarter===1||g.quarter===3)return[[Math.round(q*.75),180,"Scheduled TV timeout"],[Math.round(q*.475),180,"Scheduled TV timeout"],[Math.round(q*.25),180,"Scheduled TV timeout"],[120,180,"Scheduled TV timeout"]] as [number,number,string][];return[[Math.round(q*.75),180,"Scheduled TV timeout"],[Math.round(q*.5),180,"Scheduled TV timeout"],[120,150,"Two-minute timeout"]] as [number,number,string][]}
function maybeBreakAfterClockMove(g:Game,before:number,after:number){for(const[th,dur,label]of thresholds(g)){const k=`Q${g.quarter}-${th}`;if(before>th&&after<=th&&!g.tvBreaksTaken.includes(k)){g.tvBreaksTaken.push(k);g.breakSeconds=dur;g.breakLabel=label;g.activity="BREAK";g.gameClockStatus="STOPPED";return true}}return false}
function nextBetweenThreshold(g:Game,before:number,maxMove:number){const after=Math.max(0,before-maxMove);let best:number|null=null;for(const[th]of thresholds(g)){const k=`Q${g.quarter}-${th}`;if(before>th&&after<=th&&!g.tvBreaksTaken.includes(k)&&(best===null||th>best))best=th}return best}
function finishPeriod(g:Game){g.pendingPlay=null;g.scoreboardSeconds=0;g.gameClockStatus="STOPPED";g.restartRule="SNAP";if(g.quarter===1){g.pendingPeriod=2;g.breakSeconds=255;g.breakLabel="END 1ST";g.activity="BREAK";return}if(g.quarter===2){g.pendingPeriod=3;g.breakSeconds=1200;g.breakLabel="HALFTIME";g.activity="BREAK";return}if(g.quarter===3){g.pendingPeriod=4;g.breakSeconds=255;g.breakLabel="END 3RD";g.activity="BREAK";return}if(total(g,0)===total(g,1)){startOT(g);return}finishGame(g,"Regulation complete")}
function advancePeriod(g:Game){const q=Number(g.pendingPeriod||0);g.pendingPeriod=0;g.breakLabel="";g.activity="LIVE";if(!q)return;g.quarter=q;g.period=periodLabel(q);g.activePeriod=periodKey(q);g.scoreboardSeconds=g.quarterLengthSeconds;g.playClockSeconds=40;g.gameClockStatus="STOPPED";g.restartRule="SNAP";if(q===3){g.possession=1;g.fieldPos=25;g.down=1;g.distance=10;g.lastPlay="Second-half kickoff"}else g.lastPlay=`${periodLabel(q)} quarter begins`}
function startOT(g:Game){g.otCount++;const k=g.otCount===1?"OT":`${g.otCount}OT`;g.period=k;g.activePeriod=k;g.scores[k]=[0,0];g.activity="OT";g.breakSeconds=180;g.breakLabel=`${k} setup`;g.pendingPeriod=-1;g.gameClockStatus="STOPPED";g.lastPlay=`End regulation · ${k} pending`}
function resolveOT(g:Game){const first=rnd(g)<.5?0:1,second=first===0?1:0;const op=(t:0|1)=>{const e=normalizedEdge(g,t),r=rnd(g);if(g.otCount>=3)return r<clamp(.35,.48+e*.2,.62)?2:0;if(r<clamp(.35,.52+e*.2,.66))return g.otCount===2?8:7;if(r<.76)return 3;return 0};score(g,first as 0|1,op(first as 0|1));score(g,second as 0|1,op(second as 0|1));if(total(g,0)!==total(g,1))finishGame(g,`${g.period} complete`);else{g.otCount++;const k=`${g.otCount}OT`;g.period=k;g.activePeriod=k;g.scores[k]=[0,0];g.breakSeconds=60;g.breakLabel=`${k} setup`;g.pendingPeriod=-1;g.lastPlay=`${g.period} pending`}}
function finishGame(g:Game,label:string){g.lifecycle="FINAL_PENDING";g.activity="FINAL";g.auto=false;g.onAir=false;g.operatorPaused=false;g.delayed=false;g.editing=false;g.pendingPlay=null;g.breakSeconds=0;g.gameClockStatus="STOPPED";g.completedAt=now();g.lastPlay=`${label} · ${total(g,0)}-${total(g,1)} · awaiting lock`}
function advanceGame(g:Game,syntheticSeconds:number){if(syntheticSeconds<=0||g.lifecycle==="UNLAUNCHED"||FINALISH.has(g.lifecycle))return;let rem=Math.floor(syntheticSeconds),guard=0;while(rem>0&&!FINALISH.has(g.lifecycle)&&g.lifecycle!=="UNLAUNCHED"&&guard++<20000){
  if(g.operatorPaused||g.editing||g.delayed||g.lifecycle==="EDIT"||g.lifecycle==="DELAY"){g.glSeconds+=rem;return}
  if(g.breakSeconds>0){const s=Math.min(rem,g.breakSeconds);g.breakSeconds-=s;g.glSeconds+=s;rem-=s;if(g.breakSeconds===0){if(g.pendingPeriod===-1)resolveOT(g);else advancePeriod(g)}continue}
  const p=g.pendingPlay as PendingPlay|null;
  if(p){const seg=p.segments[0];if(!seg){g.pendingPlay=null;continue}let step=Math.min(rem,seg.remaining);const before=g.scoreboardSeconds;if(seg.kind==="RUNOFF"&&seg.clockRuns){const th=nextBetweenThreshold(g,before,step);if(th!==null)step=Math.min(step,before-th)}if(seg.clockRuns)step=Math.min(step,g.scoreboardSeconds);seg.remaining-=step;if(seg.clockRuns){g.scoreboardSeconds=Math.max(0,g.scoreboardSeconds-step);g.gameClockStatus="RUNNING"}else g.gameClockStatus="STOPPED";g.glSeconds+=step;rem-=step;if(seg.remaining<=0){p.segments.shift();if(seg.kind==="PLAY"){applyPlayOutcome(g,p);if(FINALISH.has(g.lifecycle))continue;if(g.breakSeconds===0)maybeBreakAfterClockMove(g,p.clockBefore,g.scoreboardSeconds)}else if(seg.kind==="RUNOFF")maybeBreakAfterClockMove(g,before,g.scoreboardSeconds);if(g.scoreboardSeconds<=0&&!FINALISH.has(g.lifecycle))finishPeriod(g);if(p.segments.length===0&&g.breakSeconds===0)g.pendingPlay=null}if(step===0&&g.scoreboardSeconds<=0&&!FINALISH.has(g.lifecycle))finishPeriod(g);continue}
  if(g.auto&&g.lifecycle==="ACTIVE"){generatePlay(g);if(!g.pendingPlay)return;continue}
  g.glSeconds+=rem;return
}}
function project(state:Game[],wallSeconds:number){const wall=Math.max(0,Math.min(21600,Math.floor(wallSeconds))),out=structuredClone(state);let maxSyn=0;for(const g of out){if(g.lifecycle==="UNLAUNCHED"||FINALISH.has(g.lifecycle))continue;const frozen=g.operatorPaused||g.editing||g.delayed||g.lifecycle==="EDIT"||g.lifecycle==="DELAY";const sp=!frozen&&g.auto&&SPEEDS.includes(Number(g.speed))?Number(g.speed):1,syn=wall*sp;maxSyn=Math.max(maxSyn,syn);advanceGame(g,syn)}return{state:out,projected_wall_seconds:wall,max_projected_synthetic_seconds:maxSyn,catchup_capped:wallSeconds>wall}}
function archive(g:Game,disposition:string,note=""){return{runId:g.runId,runNumber:g.runNumber,seedHex:g.seedHex,disposition,note,lifecycle:g.lifecycle,awayFinal:total(g,0),homeFinal:total(g,1),quarterLengthSeconds:g.quarterLengthSeconds,glSeconds:g.glSeconds,archivedAt:now()}}
function resetRun(g:Game,newSeed:boolean,disposition:string,note=""){const a=archive(g,disposition,note);g.runHistory=[...(g.runHistory??[]),a].slice(-30);g.runNumber++;if(newSeed)g.seedHex=randHex(16);g.runId=runId(g.id,g.runNumber);g.rngState=seedWords(g.seedHex,g.id);g.seedLocked=false;g.lifecycle="UNLAUNCHED";g.activity="UPCOMING";g.auto=false;g.onAir=false;g.operatorPaused=false;g.delayed=false;g.editing=false;g.editSnapshot=null;g.editResume=null;g.scoreboardSeconds=g.quarterLengthSeconds;g.playClockSeconds=40;g.gameClockStatus="STOPPED";g.restartRule="SNAP";g.glSeconds=0;g.period="1st";g.quarter=1;g.activePeriod="1";g.otCount=0;g.speed=1;g.scores=blankScores();g.possession=0;g.fieldPos=25;g.down=1;g.distance=10;g.awayTimeouts=3;g.homeTimeouts=3;g.breakSeconds=0;g.breakLabel="";g.pendingPeriod=0;g.pendingPlay=null;g.tvBreaksTaken=[];g.createdRunAt=now();g.launchedAt=null;g.completedAt=null;g.history=[];g.locked=false;g.lastPlay=newSeed?"Purged · new seed assigned · ready for launch":"Restarted · same seed preserved · ready for launch";return a}
function publicStatus(g:Game){if(g.delayed||g.lifecycle==="DELAY")return"DELAY";if(FINALISH.has(g.lifecycle))return"FINAL";if(g.breakLabel==="HALFTIME")return"HALFTIME";if(g.breakLabel==="END 1ST")return"END 1ST";if(g.breakLabel==="END 3RD")return"END 3RD";if(g.operatorPaused)return"PAUSED";if(String(g.period).includes("OT"))return g.period;return `${g.period} · ${Math.floor(g.scoreboardSeconds/60)}:${String(g.scoreboardSeconds%60).padStart(2,"0")}`}
function publicGame(g:Game){const c=structuredClone(g);for(const k of["seedHex","rngState","seedLocked","runHistory","history","audit","awayPower","homePower","editSnapshot","editResume","pendingPlay"])delete c[k];c.displayStatus=publicStatus(g);return c}
function requireConfirmed(p:any){if(p?.confirmed!==true)throw new Error("confirmation required")}
function captureEdit(g:Game){return{lifecycle:g.lifecycle,activity:g.activity,auto:g.auto,onAir:g.onAir,operatorPaused:g.operatorPaused,delayed:g.delayed,period:g.period,quarter:g.quarter,activePeriod:g.activePeriod,scoreboardSeconds:g.scoreboardSeconds,playClockSeconds:g.playClockSeconds,possession:g.possession,fieldPos:g.fieldPos,down:g.down,distance:g.distance,awayTimeouts:g.awayTimeouts,homeTimeouts:g.homeTimeouts,scores:structuredClone(g.scores),pendingPlay:structuredClone(g.pendingPlay),breakSeconds:g.breakSeconds,breakLabel:g.breakLabel,pendingPeriod:g.pendingPeriod,completedAt:g.completedAt,locked:g.locked}}
function startEdit(g:Game,p:any){if(["LOCKED","READY","FINAL"].includes(g.lifecycle))requireConfirmed(p);g.editSnapshot=captureEdit(g);g.editResume={lifecycle:g.lifecycle,activity:g.activity,auto:g.auto,onAir:g.onAir,operatorPaused:g.operatorPaused,delayed:g.delayed};g.lifecycle="EDIT";g.activity="EDIT";g.auto=false;g.onAir=false;g.operatorPaused=false;g.delayed=false;g.editing=true;g.pendingPlay=null;g.gameClockStatus="STOPPED";g.lastPlay="Chairman edit · football state frozen"}
function restoreEdit(g:Game){const s=g.editSnapshot;if(!s)throw new Error("edit snapshot missing");for(const[k,v]of Object.entries(s))g[k]=structuredClone(v);g.editSnapshot=null;g.editResume=null;g.editing=false;g.lastPlay="Chairman edit cancelled · prior state restored"}
function applyEditPayload(g:Game,p:any,event:any){const before={score:[total(g,0),total(g,1)],period:g.period,quarter:g.quarter,clock:g.scoreboardSeconds,possession:g.possession,fieldPos:g.fieldPos,down:g.down,distance:g.distance,timeouts:[g.awayTimeouts,g.homeTimeouts],scores:structuredClone(g.scores)};
  if(p.scores&&typeof p.scores==="object"){for(const[k,v]of Object.entries(p.scores)){if(!Array.isArray(v)||v.length<2)continue;const a=Math.floor(Number(v[0])),h=Math.floor(Number(v[1]));if(Number.isFinite(a)&&Number.isFinite(h)&&a>=0&&h>=0&&a<=99&&h<=99)g.scores[k]=[a,h]}}
  if(Number.isInteger(Number(p.quarter))&&Number(p.quarter)>=1&&Number(p.quarter)<=4){g.quarter=Number(p.quarter);g.period=periodLabel(g.quarter);g.activePeriod=periodKey(g.quarter);if(!g.scores[g.activePeriod])g.scores[g.activePeriod]=[0,0]}
  if(p.clockSeconds!==undefined){const s=Math.floor(Number(p.clockSeconds));if(!Number.isFinite(s)||s<0||s>g.quarterLengthSeconds)throw new Error("clock outside quarter range");g.scoreboardSeconds=s}
  if(p.possession===0||p.possession===1)g.possession=p.possession;
  if(p.ballSide!==undefined||p.yardline!==undefined){const side=String(p.ballSide??(g.fieldPos>50?"OPP":"OWN")),y=clamp(1,Math.floor(Number(p.yardline??(g.fieldPos>50?100-g.fieldPos:g.fieldPos))),50);g.fieldPos=side==="OPP"?100-y:y}
  if(p.down!==undefined){const d=Math.floor(Number(p.down));if(d<1||d>4)throw new Error("down must be 1-4");g.down=d}
  if(p.distance!==undefined){const d=Math.floor(Number(p.distance));if(!Number.isFinite(d)||d<1||d>99)throw new Error("distance must be 1-99");g.distance=d}
  if(p.awayTimeouts!==undefined)g.awayTimeouts=clamp(0,Math.floor(Number(p.awayTimeouts)),3);
  if(p.homeTimeouts!==undefined)g.homeTimeouts=clamp(0,Math.floor(Number(p.homeTimeouts)),3);
  g.pendingPlay=null;g.breakSeconds=0;g.breakLabel="";g.pendingPeriod=0;g.gameClockStatus="STOPPED";g.restartRule="SNAP";
  const after={score:[total(g,0),total(g,1)],period:g.period,quarter:g.quarter,clock:g.scoreboardSeconds,possession:g.possession,fieldPos:g.fieldPos,down:g.down,distance:g.distance,timeouts:[g.awayTimeouts,g.homeTimeouts],scores:structuredClone(g.scores)};event.before=before;event.after=after;
}
function continuation(g:Game,note=""){const parent=g.runId,parentSeed=g.seedHex;g.runHistory=[...(g.runHistory??[]),archive(g,"CHAIRMAN_CONTINUATION",note)].slice(-30);g.runNumber++;g.seedHex=randHex(16);g.runId=runId(g.id,g.runNumber);g.rngState=seedWords(g.seedHex,g.id);g.seedLocked=true;g.continuationOf=parent;return{parentRun:parent,parentSeed,newRun:g.runId,newSeed:g.seedHex}}
function commitEdit(g:Game,p:any,event:any){if(g.lifecycle!=="EDIT")throw new Error("game is not in edit mode");applyEditPayload(g,p,event);const prior=g.editResume??{lifecycle:"ACTIVE",activity:"LIVE",auto:false,onAir:false,operatorPaused:false,delayed:false};const wasFinal=["FINAL_PENDING","LOCKED","READY","FINAL"].includes(prior.lifecycle);g.editing=false;g.editSnapshot=null;g.editResume=null;if(wasFinal){g.lifecycle="FINAL_PENDING";g.activity="FINAL";g.locked=false;g.auto=false;g.onAir=false;g.completedAt=g.completedAt??now();g.lastPlay=`Final box score corrected · ${total(g,0)}-${total(g,1)} · requires re-lock`;event.supersededFrom=prior.lifecycle;return}
  if(prior.lifecycle==="DELAY"&&!p.resumeAuto&&!p.resumeGame){g.lifecycle="DELAY";g.activity="DELAY";g.delayed=true;g.operatorPaused=false;g.auto=false;g.onAir=false;g.lastPlay="Chairman correction saved · DELAY preserved";return}
  g.lifecycle="ACTIVE";g.activity="LIVE";g.operatorPaused=!!p.hold;g.delayed=false;g.auto=!!p.resumeAuto;g.onAir=false;const c=continuation(g,"Chairman corrected checkpoint");event.continuation=c;g.lastPlay=g.auto?`Chairman correction saved · AUTO resumed · ${g.runId}`:"Chairman correction saved · game held"}
function fieldLabel(g:Game){return g.fieldPos<=50?`OWN ${g.fieldPos}`:`OPP ${100-g.fieldPos}`}
function applyPowerState(state:Game[],ratings:Record<string,TeamPowerInput>,sourceVersion:string|null){let teams=0;const valid=new Set<string>();for(const[name,p]of Object.entries(ratings??{})){if(!ratingReady(p))continue;valid.add(name);teams++}let readyGames=0;for(const g of state){if(valid.has(g.away.name))g.awayPower=structuredClone(ratings[g.away.name]);if(valid.has(g.home.name))g.homePower=structuredClone(ratings[g.home.name]);if(sourceVersion)g.powerSourceVersion=sourceVersion;setPowerReady(g);if(g.powerReady)readyGames++}return{teamsLoaded:teams,readyGames}}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});const url=new URL(req.url),action=url.searchParams.get("api");if(!action)return new Response(null,{status:302,headers:{location:CONSOLE_URL,"cache-control":"no-store","x-robots-tag":"noindex,nofollow"}});try{
  const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}}),slug=url.searchParams.get("session")??"";
  if(action==="create"&&req.method==="POST"){
    if(WEEK3.length!==51)throw new Error("Week 3 schedule count mismatch");const operator=randHex(32),publicSlug=`w3v42-${randHex(8)}`,state=WEEK3.map(initialGame);const{data,error}=await client.rpc("gamecast_v12_create_session",{p_public_slug:publicSlug,p_operator_token_hash:await sha256(operator),p_week_key:WEEK_KEY,p_engine_version:ENGINE_VERSION,p_data_version:DATA_VERSION,p_state:state});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error("session create returned no row");return json({...row,engine_version:ENGINE_VERSION,operator_token:operator,master_zulu:now(),governance:{games:51,power_ready:state.filter(g=>g.powerReady).length}},201)
  }
  if(!slug)return json({error:"session required"},400);const{data:rows,error:readError}=await client.rpc("gamecast_v12_read_session",{p_slug:slug});if(readError)throw readError;const current=Array.isArray(rows)?rows[0]:rows;if(!current||current.week_key!==WEEK_KEY||!String(slug).startsWith("w3v42-"))return json({error:"GameCast 4.2 Week 3 session not found"},404);
  const dt=new Date(),wall=Math.max(0,Math.floor((dt.getTime()-Date.parse(current.last_advanced_at))/1000)),pr=project(current.state as Game[],wall),supplied=req.headers.get("x-operator-token")??"",isOperator=!!supplied&&await sha256(supplied)===current.operator_token_hash;
  if(action==="read"&&req.method==="GET"){const ready=pr.state.filter(g=>g.powerReady).length;return json({public_slug:slug,week_key:current.week_key,engine_version:ENGINE_VERSION,data_version:DATA_VERSION,state:isOperator?pr.state:pr.state.map(publicGame),state_version:current.state_version,master_zulu:dt.toISOString(),projected_wall_seconds:pr.projected_wall_seconds,max_projected_synthetic_seconds:pr.max_projected_synthetic_seconds,operator:isOperator,governance:{games:51,power_ready:ready,power_pending:51-ready}})}
  if(action==="power"&&req.method==="POST"){
    if(!isOperator)return json({error:"operator token invalid"},403);const body=await req.json();if(Number(body.expected_version)!==Number(current.state_version))return json({error:"version conflict",current_version:current.state_version},409);const state=pr.state as Game[],summary=applyPowerState(state,body.ratings??{},body.sourceVersion?String(body.sourceVersion):null),stamp=now();const{data,error}=await client.rpc("gamecast_v12_update_session",{p_session_id:current.session_id,p_expected_version:current.state_version,p_state:state,p_stamp:stamp});if(error)throw error;const updated=Array.isArray(data)?data[0]:data;if(!updated)return json({error:"version conflict"},409);await client.rpc("gamecast_v12_insert_event",{p_session_id:current.session_id,p_state_version:updated.state_version,p_event_type:"V42_POWER_LOAD",p_game_id:null,p_payload:{...summary,sourceVersion:body.sourceVersion??null,masterZulu:stamp}});return json({state:updated.state,state_version:updated.state_version,master_zulu:stamp,engine_version:ENGINE_VERSION,summary})
  }
  if(action==="command"&&req.method==="POST"){
    if(!isOperator)return json({error:"operator token invalid"},403);const body=await req.json();if(Number(body.expected_version)!==Number(current.state_version))return json({error:"version conflict",current_version:current.state_version},409);const state=pr.state as Game[],g=state.find(x=>x.id===body.id);if(!g)return json({error:"game not found"},404);const c=String(body.command??""),p=body.payload??{};let event:any={runId:g.runId,seedHex:g.seedHex,engineVersion:ENGINE_VERSION,masterZulu:now(),gl:g.glSeconds};
    if(c==="quarter_length"){if(g.lifecycle!=="UNLAUNCHED")return json({error:"quarter length locked after launch"},409);const q=Number(p.seconds);if(![600,900].includes(q))return json({error:"quarter length must be 600 or 900"},400);g.quarterLengthSeconds=q;g.scoreboardSeconds=q;g.lastPlay=`Quarter length set to ${q===600?"10:00":"15:00"}`}
    else if(c==="launch"&&g.lifecycle==="UNLAUNCHED"){g.lifecycle="ACTIVE";g.activity="LIVE";g.glSeconds=0;g.seedLocked=true;g.launchedAt=now();g.lastPlay=`Opening kickoff ready · ${g.runId}`}
    else if(c==="auto"&&g.lifecycle==="ACTIVE"){if(!g.powerReady)return json({error:"AUTO blocked until both teams have offense/defense/overall ratings"},409);g.auto=!g.auto;if(g.auto){g.onAir=false;g.operatorPaused=false}g.activity=g.operatorPaused?"PAUSED":"LIVE";g.lastPlay=g.auto?`AUTO running · ${g.speed}x`:"AUTO stopped by Chairman"}
    else if(c==="on_air"&&g.lifecycle==="ACTIVE"){g.onAir=!g.onAir;if(g.onAir){g.auto=false;g.operatorPaused=false}g.activity=g.onAir?"ON AIR":"LIVE";g.lastPlay=g.onAir?"ON AIR · reported clock/manual scoring":"ON AIR ended"}
    else if(c==="speed"&&g.lifecycle==="ACTIVE"){const sp=Number(p.speed);if(!SPEEDS.includes(sp))return json({error:"speed must be 1x, 4x, 10x, or 50x"},400);if(!g.auto)return json({error:"acceleration is AUTO-only"},409);g.speed=sp;g.lastPlay=`AUTO speed set to ${sp}x`}
    else if(c==="pause"&&g.lifecycle==="ACTIVE"){g.operatorPaused=!g.operatorPaused;g.activity=g.operatorPaused?"PAUSED":"LIVE";g.lastPlay=g.operatorPaused?"Chairman pause · football state frozen · GL running":"Chairman resume"}
    else if(c==="delay"&&g.lifecycle==="ACTIVE"){g.delayResume={auto:g.auto,onAir:g.onAir,operatorPaused:g.operatorPaused};g.lifecycle="DELAY";g.delayed=true;g.auto=false;g.onAir=false;g.operatorPaused=false;g.activity="DELAY";g.gameClockStatus="STOPPED";g.lastPlay=`DELAY · ${periodLabel(g.quarter)} ${Math.floor(g.scoreboardSeconds/60)}:${String(g.scoreboardSeconds%60).padStart(2,"0")} · GL running`}
    else if(c==="resume_delay"&&g.lifecycle==="DELAY"){const r=g.delayResume??{};g.lifecycle="ACTIVE";g.delayed=false;g.auto=!!r.auto&&g.powerReady;g.onAir=!!r.onAir&&!g.auto;g.operatorPaused=!!r.operatorPaused;g.delayResume=null;g.activity=g.operatorPaused?"PAUSED":g.onAir?"ON AIR":"LIVE";g.lastPlay="Delay ended · game resumed from preserved checkpoint"}
    else if(c==="score"&&["ACTIVE","DELAY"].includes(g.lifecycle)){const t=p.team===1?1:0,pts=[1,2,3,6,7,8].includes(Number(p.points))?Number(p.points):0;if(!pts)return json({error:"invalid score increment"},400);score(g,t,pts,"MANUAL");g.lastPlay=`Manual score · ${t===0?g.away.name:g.home.name} +${pts}`}
    else if(c==="clock_set"&&["ACTIVE","DELAY"].includes(g.lifecycle)){const sec=Math.floor(Number(p.seconds));if(!Number.isFinite(sec)||sec<0||sec>g.quarterLengthSeconds)return json({error:"clock outside quarter range"},400);event.beforeClock=g.scoreboardSeconds;g.scoreboardSeconds=sec;g.pendingPlay=null;g.gameClockStatus="STOPPED";event.afterClock=sec;g.lastPlay=`Chairman clock correction · ${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`}
    else if(c==="edit_begin"&&["ACTIVE","DELAY","FINAL_PENDING","LOCKED","READY","FINAL"].includes(g.lifecycle)){startEdit(g,p);event.editFrom=g.editResume?.lifecycle}
    else if(c==="edit_cancel"&&g.lifecycle==="EDIT"){restoreEdit(g)}
    else if(c==="edit_commit"&&g.lifecycle==="EDIT"){commitEdit(g,p,event)}
    else if(c==="end"&&["ACTIVE","DELAY"].includes(g.lifecycle)){requireConfirmed(p);finishGame(g,"Chairman called Final")}
    else if(c==="lock"&&g.lifecycle==="FINAL_PENDING"){g.lifecycle="LOCKED";g.activity="FINAL";g.locked=true;g.lastPlay=`Result locked · ${total(g,0)}-${total(g,1)}`}
    else if(c==="unlock"&&g.lifecycle==="LOCKED"){requireConfirmed(p);g.lifecycle="FINAL_PENDING";g.locked=false;g.lastPlay="Result unlocked by Chairman · confirmation recorded"}
    else if(c==="accept"&&g.lifecycle==="LOCKED"){requireConfirmed(p);g.lifecycle="READY";g.activity="FINAL";g.lastPlay=`Accepted result · READY for SEUD · ${total(g,0)}-${total(g,1)}`}
    else if(c==="reopen_live"&&FINALISH.has(g.lifecycle)){requireConfirmed(p);const cont=continuation(g,"Final reopened to live simulation");g.lifecycle="ACTIVE";g.activity="LIVE";g.locked=false;g.completedAt=null;g.auto=!!p.resumeAuto&&g.powerReady;g.onAir=false;g.operatorPaused=!g.auto;g.lastPlay=`Final reopened · ${g.runId} · corrected state authoritative`;event.continuation=cont}
    else if(c==="restart_same_seed"&&g.lifecycle!=="UNLAUNCHED"){requireConfirmed(p);const a=resetRun(g,false,"RESTART_SAME_SEED",String(p.note??""));event.archived=a}
    else if(c==="purge_new_seed"){requireConfirmed(p);const a=resetRun(g,true,"PURGE_NEW_SEED",String(p.note??""));event.archived=a;event.newRunId=g.runId;event.newSeedHex=g.seedHex}
    else return json({error:"command unavailable for current lifecycle"},409);
    const stamp=now();event.masterZulu=stamp;event.gl=g.glSeconds;event.score=[total(g,0),total(g,1)];event.status=publicStatus(g);event.field=fieldLabel(g);const{data,error}=await client.rpc("gamecast_v12_update_session",{p_session_id:current.session_id,p_expected_version:current.state_version,p_state:state,p_stamp:stamp});if(error)throw error;const updated=Array.isArray(data)?data[0]:data;if(!updated)return json({error:"version conflict"},409);await client.rpc("gamecast_v12_insert_event",{p_session_id:current.session_id,p_state_version:updated.state_version,p_event_type:`V42_${c.toUpperCase()}`,p_game_id:g.id,p_payload:event});return json({state:updated.state,state_version:updated.state_version,last_advanced_at:updated.last_advanced_at,master_zulu:stamp,engine_version:ENGINE_VERSION})
  }
  return json({error:"unsupported action"},400)
}catch(e:any){console.error("gamecast-week3-v4-2",e?.code??"",e?.message??e,e?.details??"",e?.hint??"");const msg=String(e?.message??"internal error");const status=msg==="confirmation required"?400:msg.includes("must be")||msg.includes("outside")||msg.includes("missing")?400:500;return json({error:msg==="confirmation required"?msg:(status===400?msg:"internal error")},status)}});
