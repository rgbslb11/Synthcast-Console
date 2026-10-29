import {SecurityError} from '../security/security-core.mjs';
import * as weather from './weather.mjs';
import {arm as deadmanArm,disarm as deadmanDisarm,tick as deadmanTick,afterOperatorCommand} from './deadman.mjs';
const integer=(value,lo,hi)=>{if(!Number.isSafeInteger(value)||value<lo||value>hi)throw new SecurityError('INVALID_INTEGER_RANGE',400);return value;};
const required=(condition,code='COMMAND_UNAVAILABLE')=>{if(!condition)throw new SecurityError(code,409);};
function validateEdit(p,g){
  for(const [k,lo,hi] of [['quarter',1,4],['clockSeconds',0,g.quarterLengthSeconds],['possession',0,1],['yardline',1,50],['down',1,4],['distance',1,99],['awayTimeouts',0,3],['homeTimeouts',0,3]])if(p[k]!==undefined)integer(p[k],lo,hi);
  if(p.ballSide!==undefined&&!['OWN','OPP'].includes(p.ballSide))throw new SecurityError('FIELD_SIDE_INVALID',400);
  if(p.scores)for(const [period,v] of Object.entries(p.scores)){if(!/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(period)||!Array.isArray(v)||v.length!==2)throw new SecurityError('SCORE_PERIOD_INVALID',400);v.forEach(n=>integer(n,0,99));}
}
export function createEngineOperations({engine,clock=()=>new Date().toISOString()}){
  async function executeCommand(draft,body){
    if(body.command==='deadman_batch'){const p=body.payload??{},ids=p.ids;if(!Array.isArray(ids)||!ids.length||ids.length>56||new Set(ids).size!==ids.length||!['arm','disarm'].includes(p.operation))throw new SecurityError('DEADMAN_SELECTION_INVALID',400);const events=[];for(const id of ids){const result=await executeCommand(draft,{id,command:p.operation==='arm'?'deadman_arm':'deadman_disarm',payload:p.config??{}});events.push(...result.events);}return {events};}
    const g=draft.state.find(g=>g.id===body.id);if(!g)throw new SecurityError('GAME_NOT_FOUND',404);
    const c=body.command,p=body.payload??{},stamp=clock(),event={type:'V505_'+String(c).toUpperCase(),gameId:g.id,payload:{masterZulu:stamp,runId:g.runId}};
    if(c==='quarter_length'){
      required(g.lifecycle==='UNLAUNCHED');required([600,900].includes(p.seconds),'QUARTER_LENGTH_INVALID');g.quarterLengthSeconds=p.seconds;g.scoreboardSeconds=p.seconds;
    } else if(c==='weather_set'){
      required(g.lifecycle==='UNLAUNCHED');try{event.payload.weather=weather.setWeather(g,p);}catch{throw new SecurityError('WEATHER_EDIT_DENIED',400);}
    } else if(c==='launch'){
      required(g.lifecycle==='UNLAUNCHED');
      if(p.weather!==undefined){try{event.payload.weather=weather.setWeather(g,p.weather);}catch{throw new SecurityError('WEATHER_EDIT_DENIED',400);}}
      await weather.lockWeather(g,stamp);
      Object.assign(g,{lifecycle:'ACTIVE',activity:'LIVE',glSeconds:0,seedLocked:true,launchedAt:stamp});
      engine.ensureOpeningToss(g);g.lastPlay=`Opening kickoff ready · ${g.runId}`;event.payload.weatherSnapshotId=g.weather.snapshotId;
    } else if(c==='auto'){
      required(g.lifecycle==='ACTIVE');required(g.powerReady,'POWER_NOT_READY');g.auto=!g.auto;if(g.auto){g.onAir=false;g.operatorPaused=false;}g.lastPlay=g.auto?`AUTO running · ${g.speed}x`:'AUTO stopped';
    } else if(c==='on_air'){
      required(g.lifecycle==='ACTIVE');g.onAir=!g.onAir;if(g.onAir){g.auto=false;g.operatorPaused=false;}g.activity=g.onAir?'ON AIR':'LIVE';
    } else if(c==='speed'){
      required(g.lifecycle==='ACTIVE'&&g.auto);required(engine.SPEEDS.includes(p.speed),'SPEED_INVALID');g.speed=p.speed;
    } else if(c==='pause'){
      required(g.lifecycle==='ACTIVE');g.operatorPaused=!g.operatorPaused;g.activity=g.operatorPaused?'PAUSED':'LIVE';g.lastPlay=g.operatorPaused?'Chairman pause · GL running':'Chairman resume';
    } else if(c==='delay'){
      required(g.lifecycle==='ACTIVE');g.delayResume={auto:g.auto,onAir:g.onAir,operatorPaused:g.operatorPaused};Object.assign(g,{lifecycle:'DELAY',delayed:true,auto:false,onAir:false,operatorPaused:false,activity:'DELAY',lastPlay:'DELAY · football state frozen · GL running'});
    } else if(c==='resume_delay'){
      required(g.lifecycle==='DELAY');const r=g.delayResume??{};g.lifecycle='ACTIVE';g.delayed=false;g.auto=!!r.auto&&g.powerReady;g.onAir=!!r.onAir&&!g.auto;g.operatorPaused=!!r.operatorPaused;g.activity=g.operatorPaused?'PAUSED':g.onAir?'ON AIR':'LIVE';g.delayResume=null;
    } else if(c==='restart_same_seed'){
      required(g.lifecycle!=='UNLAUNCHED');required(p.confirmed===true,'CONFIRMATION_REQUIRED');engine.reset(g,false,String(p.note??''));
    } else if(c==='deadman_arm'){
      try{deadmanArm(g,p,stamp);}catch{throw new SecurityError('DEADMAN_CONFIG_INVALID',400);}
    } else if(c==='deadman_disarm'){
      deadmanDisarm(g,stamp);
    } else if(c==='score'){
      required(['ACTIVE','DELAY'].includes(g.lifecycle));required([0,1].includes(p.team)&&[1,2,3,6,7,8].includes(p.points),'SCORE_INVALID');engine.score(g,p.team,p.points,'MANUAL');
    } else if(c==='clock_set'){
      required(['ACTIVE','DELAY'].includes(g.lifecycle));g.scoreboardSeconds=integer(p.seconds,0,g.quarterLengthSeconds);g.pendingPlay=null;
    } else if(c==='edit_begin'){
      required(['ACTIVE','DELAY','FINAL_PENDING','LOCKED','READY','FINAL'].includes(g.lifecycle));engine.beginEdit(g,p);
    } else if(c==='edit_cancel'){
      required(g.lifecycle==='EDIT');engine.cancelEdit(g);
    } else if(c==='edit_commit'){
      required(g.lifecycle==='EDIT');validateEdit(p,g);engine.commitEdit(g,p,event.payload);delete event.payload.continuation?.parentSeed;delete event.payload.continuation?.newSeed;
    } else if(c==='end'){
      required(['ACTIVE','DELAY'].includes(g.lifecycle));required(p.confirmed===true,'CONFIRMATION_REQUIRED');engine.finishGame(g,'Chairman called Final');
    } else if(c==='lock'){
      required(g.lifecycle==='FINAL_PENDING');g.lifecycle='LOCKED';g.locked=true;
    } else if(c==='unlock'){
      required(g.lifecycle==='LOCKED');required(p.confirmed===true,'CONFIRMATION_REQUIRED');g.lifecycle='FINAL_PENDING';g.locked=false;
    } else if(c==='accept'){
      if(g.qaOnly)throw new SecurityError('QA_ACCEPT_FORBIDDEN',403);required(g.lifecycle==='LOCKED');required(p.confirmed===true,'CONFIRMATION_REQUIRED');g.lifecycle='READY';
    } else if(c==='reopen_live'){
      required(engine.FINALISH.has(g.lifecycle));required(p.confirmed===true,'CONFIRMATION_REQUIRED');const continuation=engine.continuation(g);event.payload.continuation={parentRun:continuation.parentRun,newRun:continuation.newRun};Object.assign(g,{lifecycle:'ACTIVE',activity:'LIVE',locked:false,completedAt:null,auto:!!p.resumeAuto&&g.powerReady});g.operatorPaused=!g.auto;
    } else if(c==='purge_new_seed'){
      required(p.confirmed===true,'CONFIRMATION_REQUIRED');engine.reset(g,true,String(p.note??''));
    } else if(c==='power')throw new SecurityError('APPROVED_INPUTS_FROZEN',403);
    else throw new SecurityError('UNSUPPORTED_LOCAL_COMMAND',400);
    afterOperatorCommand(g,c,stamp);event.payload.score=[engine.total(g,0),engine.total(g,1)];
    draft.lastAdvancedAt=stamp;return {events:[event]};
  }
  async function advance(draft,body){
    const seconds=integer(body.seconds,0,21600),stamp=clock(),prior=Object.fromEntries(draft.state.map(g=>[g.id,g.history.length]));
    draft.state=engine.project(draft.state,seconds);
    const events=[{type:'V505_ADVANCE',gameId:null,payload:{seconds,activeGames:56,masterZulu:stamp}}];
    for(const g of draft.state){
      const change=deadmanTick(g,stamp);
      if(change?.action==='AUTONOMOUS_LAUNCH'){await weather.lockWeather(g,stamp);engine.ensureOpeningToss(g);events.push({type:'V505_DEADMAN_LAUNCH',gameId:g.id,payload:{weatherSnapshotId:g.weather.snapshotId,masterZulu:stamp}});}
      for(const record of g.history.slice(prior[g.id]))events.push({type:'V505_FOOTBALL_RECORD',gameId:g.id,payload:structuredClone(record)});
    }
    draft.lastAdvancedAt=stamp;return {events};
  }
  return {executeCommand,advance};
}


