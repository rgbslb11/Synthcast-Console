import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export function overtimeChoice(seed,id) {
  const b=createHash('sha256').update(JSON.stringify(['GAMECAST_OT_TOSS_V1',seed,id])).digest();
  const winner=b[0]&1, defenseFirst=b.readUInt32BE(1)/4294967296<.95;
  return {winner,defenseFirst,firstOffense:defenseFirst?1-winner:winner};
}
const key=n=>n===1?'OT':`${n}OT`;
const held=g=>g.operatorPaused||g.editing||g.delayed||['EDIT','DELAY'].includes(g.lifecycle);
const sum=(g,t)=>Object.values(g.scores).reduce((s,v)=>s+Number(v[t]||0),0);
function evidence(g,kind,detail={}) {
  g.history.push({period:g.activePeriod,gl:g.glSeconds,team:g.possession,kind,...detail,qaOnly:true,source:'OTMODEL1',eventId:`${g.runId}:OT:${g.ot.sequence++}`});
}
function block(g,reason){g.ot.blocked=reason;g.auto=false;g.lastPlay=`BLOCKED · ${reason}`;g.activity='OT_BLOCKED';}
function setupSeries(g) {
  const o=g.ot;g.possession=o.completed===0?o.first:1-o.first;
  g.fieldPos=o.number<3?75:97;g.down=1;g.distance=o.number<3?10:3;
  o.phase=o.number<3?'SERIES':'TRY';o.tryValue=o.number<3?null:2;
  g.activity='OT';g.breakLabel='';g.breakSeconds=0;g.pendingPeriod=0;
  evidence(g,'SERIES_START',{opportunity:o.completed+1,fieldPos:g.fieldPos});
}
export function startOvertime(g) {
  assert.equal(sum(g,0),sum(g,1),'OT requires tied regulation');
  const toss=overtimeChoice(g.seedHex,g.id);
  g.ot={version:'OTMODEL1',number:1,first:toss.firstOffense,toss,completed:0,phase:'BREAK',tryValue:null,eventIndex:0,sequence:0,pending:null,blocked:null,timeouts:[1,1],timeoutPolicy:'PROVISIONAL_SHARED_OT1_2_THEN_OT3_PLUS'};
  g.period=g.activePeriod='OT';g.scores.OT=[0,0];g.scoreboardSeconds=0;g.gameClockStatus='STOPPED';g.pendingPlay=null;g.pendingPeriod=0;
  g.breakSeconds=600;g.breakLabel='OT1 TV timeout';g.activity='BREAK';
  evidence(g,'OT_START',{toss:{...toss}});
}
function endOpportunity(g,h) {
  const o=g.ot;o.completed++;
  if(o.completed===1){setupSeries(g);return;}
  if(sum(g,0)!==sum(g,1)){o.phase='FINAL';h.finish(g,'Overtime complete');return;}
  const ended=o.number;o.number++;o.first=1-o.first;o.completed=0;o.phase='BREAK';o.tryValue=null;
  if(o.number===3)o.timeouts=[1,1];
  g.period=g.activePeriod=key(o.number);g.scores[g.activePeriod]=[0,0];
  g.breakSeconds=ended<=2?300:90;g.breakLabel=`${g.activePeriod} TV timeout`;g.activity='BREAK';
  evidence(g,'PERIOD_TIED',{endedPeriod:ended});
}
function validEvent(g,p) {
  if(!p||typeof p!=='object')return 'OT outcome model unavailable';
  if(!Number.isInteger(p.duration)||p.duration<1||p.duration>300)return 'Invalid OT event duration';
  const phase=g.ot.phase;
  if(p.kind==='timeout')return [0,1].includes(p.team)&&g.ot.timeouts[p.team]>0&&p.duration===30?null:'Invalid/exhausted OT timeout';
  if(p.kind==='penalty'){
    if(phase!=='TRY'||g.ot.number<3)return 'Penalty outside implemented OT3+ subset';
    if(p.code==='DEF_ENDZONE')return null;
    if(p.code==='OFF_DEADBALL')return g.fieldPos>15?null:'Penalty placement outside supported field';
    if(p.code==='OFF_LIVE'&&typeof p.success==='boolean'&&[5,10,15].includes(p.yards))return !p.success||g.fieldPos>p.yards?null:'Penalty placement outside supported field';
    return 'Unsupported penalty: '+String(p.code);
  }
  if(phase==='TRY'){
    if(p.foul!==undefined && !(g.ot.number>=3 && p.kind==='try' && p.result==='defensive_return' && p.foul==='RETURN_TEAM_LIVE_BALL'))return 'Unsupported try foul adjudication';
    return p.kind==='try'&&['success','fail','defensive_return'].includes(p.result)?null:'Expected conversion attempt';
  }
  if(phase!=='SERIES')return 'No active OT opportunity';
  if(['run','pass','sack'].includes(p.kind))return Number.isInteger(p.yards)&&Math.abs(p.yards)<=100&&g.fieldPos+p.yards>0&&(p.kind!=='sack'||p.yards<=0)?null:'Invalid yardage or unsupported safety';
  if(p.kind==='fg')return typeof p.good==='boolean'&&!(g.ot.completed===1&&sum(g,1-g.possession)-sum(g,g.possession)>3)?null:'Field goal cannot meet answering score';
  if(['incomplete','turnover','defensive_td'].includes(p.kind))return null;
  return 'Unsupported OT event: '+String(p.kind);
}
function apply(g,p,h) {
  const o=g.ot,t=g.possession;
  evidence(g,p.kind,{event:{...p},ordinaryStats:o.phase==='SERIES'&&!['timeout','penalty'].includes(p.kind)});
  if(p.kind==='timeout'){o.timeouts[p.team]--;return;}
  if(p.kind==='penalty'){
    if(p.code==='DEF_ENDZONE')g.fieldPos=100-(100-g.fieldPos)/2;
    else if(p.code==='OFF_DEADBALL')g.fieldPos-=15;
    else if(p.success)g.fieldPos-=p.yards;
    else endOpportunity(g,h); // Declined failed-play foul: attempt stands.
    if(o.phase==='TRY')g.distance=100-g.fieldPos;
    return;
  }
  if(o.phase==='TRY'){
    // Rule 3-1-3(g): ordinary live-ball foul by the returning/scoring team
    // cancels its return score; the resolved try still completes the series.
    if(p.foul==='RETURN_TEAM_LIVE_BALL'){endOpportunity(g,h);return;}
    if(p.result==='success')h.score(g,t,o.tryValue);
    if(p.result==='defensive_return'){
      h.score(g,1-t,2);
      // A score ON a try does not waive the opponent's equal series (3-1-3f).
    }
    endOpportunity(g,h);return;
  }
  g.teamPlayCount[t]++;
  if(p.kind==='defensive_td'){h.score(g,1-t,6);o.phase='FINAL';h.finish(g,'OT defensive touchdown');return;}
  if(p.kind==='turnover'){endOpportunity(g,h);return;}
  if(p.kind==='fg'){if(p.good)h.score(g,t,3);endOpportunity(g,h);return;}
  const yards=p.kind==='incomplete'?0:p.yards;
  const target=g.fieldPos+yards;
  if(target>=100){
    h.score(g,t,6);
    if(o.completed===1&&sum(g,t)>sum(g,1-t)){o.phase='FINAL';h.finish(g,'Winning OT touchdown');return;}
    o.phase='TRY';o.tryValue=o.number===2||sum(g,1-t)-sum(g,t)===2?2:1;
    g.fieldPos=97;g.distance=3;return;
  }
  g.fieldPos=target;
  if(yards>=g.distance){g.down=1;g.distance=Math.min(10,100-g.fieldPos);}
  else {g.down++;g.distance-=yards;if(g.down>4)endOpportunity(g,h);}
}

// Fixture provider is host-configured only; never supplied by HTTP payloads.
// No probability model is invented: missing outcome input blocks AUTO safely.
export function advanceOvertime(g,seconds,h,provider) {
  let left=seconds;
  while(left>0&&g.lifecycle!=='FINAL_PENDING') {
    if(held(g)){g.glSeconds+=left;return;}
    const o=g.ot;
    if(o.phase==='BREAK'){
      const n=Math.min(left,g.breakSeconds);g.breakSeconds-=n;g.glSeconds+=n;left-=n;
      if(g.breakSeconds===0)setupSeries(g);
      continue;
    }
    if(!g.auto||o.blocked){g.glSeconds+=left;return;}
    if(!o.pending){
      let p;try{p=provider?.(structuredClone(g));}catch{block(g,'OT outcome provider failed');g.glSeconds+=left;return;}
      const invalid=validEvent(g,p);
      if(invalid){block(g,invalid);g.glSeconds+=left;return;}
      o.pending={event:structuredClone(p),remaining:p.duration};
    }
    const n=Math.min(left,o.pending.remaining);o.pending.remaining-=n;g.glSeconds+=n;left-=n;
    if(o.pending.remaining===0){const p=o.pending.event;o.pending=null;o.eventIndex++;apply(g,p,h);}
  }
}

export function patchOvertime(source) {
  const once=(a,b)=>{assert.equal(source.split(a).length,2,'OT model anchor changed: '+a);source=source.replace(a,b);};
  once('g.period = "OT"; g.activePeriod = "OT"; g.scores.OT = [0, 0]; g.breakSeconds = 180; g.breakLabel = "OT setup"; g.pendingPeriod = -1; g.activity = "OT";', 'startOvertime(g);');
  once('    if (g.breakSeconds > 0) {','    if (g.ot) { advanceOvertime(g, rem, {score,finish:finishGame}); return; }\n    if (g.breakSeconds > 0) {');
  once('  g.runNumber++; if (newSeed)', '  delete g.ot;\n  g.runNumber++; if (newSeed)');
  once('disposition, note, score:', 'disposition, note, otCheckpoint: g.ot ? structuredClone(g.ot) : null, score:');
  // Until a dedicated OT edit checkpoint exists, refuse edits before mutation.
  once('function beginEdit(g: Game, p: any) {','function beginEdit(g: Game, p: any) {\n  if(g.ot) throw new Error("BLOCKED: OT checkpoint edit not implemented");');
  once('    if (c === "quarter_length" &&', '    if(g.ot && ["score","clock_set","edit_begin","edit_commit","reopen_live","quarter_length"].includes(c)) return json({error:"BLOCKED: OT checkpoint correction not implemented"},409);\n    if (c === "quarter_length" &&');
  once('  c.displayStatus = display(g); return c;', '  if(c.ot) { const {number,phase,completed,first,timeouts,blocked}=c.ot; c.ot={number,phase,completed,first,timeouts,blocked}; }\n  c.displayStatus = display(g); return c;');
  return source;
}
