import {createHash} from 'node:crypto';
const validPeriod=p=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(String(p));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const range=(x,lo,hi)=>finite(x)&&x>=lo&&x<=hi;
const weatherKeys=['modelVersion','snapshotId','enabled','wind','rain','temperature','primitive','distance','before','after','deepIntent','deepWeatherEffects','passRateBefore','passRateAfter','completionBefore','completionAfter','interceptionBefore','interceptionAfter'];
function weatherView(value){
 if(value==null)return null;
 return Object.fromEntries(weatherKeys.filter(k=>Object.hasOwn(value,k)).map(k=>{
  const v=value[k];if(v!==null&&!['string','number','boolean'].includes(typeof v))throw Error('INVALID_WEATHER_AUDIT');
  if(typeof v==='number'&&!finite(v))throw Error('INVALID_WEATHER_AUDIT');
  return [k,v];
 }));
}
export function normalizePlays(game,{sessionId,engineVersion}){
 if(!sessionId||!engineVersion||!game.runId||!Array.isArray(game.history))throw Error('HISTORY_IDENTITY_MISSING');
 const plays=[],scoreTally=[0,0];
 for(const [index,h] of game.history.entries()){
  if(!h||typeof h!=='object')throw Error('UNKNOWN_HISTORY_RECORD');
  if(!h.preSnap&&!h.adjudicated){
   if(validPeriod(h.period)&&[0,1].includes(h.team)&&Number.isInteger(h.points)&&[0,2,3,6,7,8].includes(h.points)&&h.source==='SIM'&&range(h.gl,0,Number.MAX_SAFE_INTEGER)){scoreTally[h.team]+=h.points;continue;}
   throw Error('UNKNOWN_HISTORY_RECORD');
  }
  if(!h.preSnap||!h.adjudicated||!validPeriod(h.period)||![0,1].includes(h.team)||typeof h.desc!=='string'||!finite(h.yards)||!finite(h.gl)||!finite(h.clock))throw Error('INCOMPLETE_PLAY_RECORD');
  const pre=h.preSnap,post=h.adjudicated;
  if(h.strategy!=null&&!['NORMAL','KNEEL','FOUR_MINUTE','DESPERATION','FG_MANAGEMENT','TWO_MINUTE','END_HALF'].includes(h.strategy))throw Error('UNKNOWN_STRATEGY');
  if(h.freeKick&&(![0,1].includes(h.freeKick.kickingTeam)||![0,1].includes(h.freeKick.receivingTeam)||h.freeKick.kickingTeam===h.freeKick.receivingTeam||h.freeKick.fromOwn!==20))throw Error('INVALID_FREE_KICK');
  if(![pre.down,pre.distance,pre.fieldPos,post.fieldPos,post.down,post.distance,post.points].every(finite)||![0,1].includes(post.possession)||!Array.isArray(h.score)||h.score.length!==2||!h.score.every(finite))throw Error('INCOMPLETE_PLAY_STATE');
  if(h.score.some((n,t)=>n!==scoreTally[t]))throw Error('PLAY_SCORE_MISMATCH');
  if(!['1','2','3','4'].includes(String(h.period)))throw Error('OVERTIME_SNAP_UNSUPPORTED');
  if(!Number.isInteger(pre.down)||!Number.isInteger(post.down)||!range(pre.down,1,4)||!range(post.down,1,4)||!range(pre.distance,1,100)||!range(post.distance,1,100)||!range(pre.fieldPos,0,100)||!range(post.fieldPos,0,100)||!range(h.clock,0,game.quarterLengthSeconds)||!range(h.gl,0,Number.MAX_SAFE_INTEGER)||!Number.isInteger(post.points)||post.points<0||h.score.some(x=>!Number.isInteger(x)||x<0))throw Error('INVALID_PLAY_STATE');
  if(h.ruling!=null&&!['SAFETY','TURNOVER_ON_DOWNS'].includes(h.ruling))throw Error('UNKNOWN_PLAY_RULING');
  if(h.originalDescription!=null&&typeof h.originalDescription!=='string')throw Error('INCOMPLETE_PLAY_RECORD');
  const description=h.originalDescription??h.desc.replace(/^(TOUCHDOWN|SAFETY) · /,'').replace(/^Turnover on downs · /,'');
  let category;
  if(/^Quarterback kneel$/.test(description))category='KNEEL';
  else if(/^Sack for \d+-yard loss$/.test(description))category='SACK';
  else if(description==='Pass intercepted')category='INTERCEPTION';
  else if(description==='Incomplete pass')category='INCOMPLETE';
  else if(/^Pass complete for -?\d+ yards (in|out of) bounds$/.test(description))category='COMPLETE';
  else if(description==='Run · fumble lost')category='FUMBLE_LOST';
  else if(/^Run for -?\d+ yards (in|out of) bounds$/.test(description))category='RUN';
  else if(/^Punt · \d+ net yards$/.test(description))category='PUNT';
  else if(/^\d+-yard field goal (GOOD|NO GOOD)$/.test(description))category='FIELD_GOAL';
  else throw Error('UNKNOWN_PLAY_CATEGORY');
  const offensive=!['PUNT','FIELD_GOAL'].includes(category),giveaway=['INTERCEPTION','FUMBLE_LOST'].includes(category);
  const touchdown=h.desc.startsWith('TOUCHDOWN · '),safety=h.ruling==='SAFETY';
  let creditedYards=0;
  if(offensive&&!['INTERCEPTION','INCOMPLETE'].includes(category)){
   if(touchdown)creditedYards=100-pre.fieldPos;
   else if(safety)creditedYards=-pre.fieldPos;
   else creditedYards=(post.possession===h.team?post.fieldPos:100-post.fieldPos)-pre.fieldPos;
  }
  const converted=offensive&&!giveaway&&!safety&&h.ruling!=='TURNOVER_ON_DOWNS'&&(touchdown||creditedYards>=pre.distance);
  const eventId=createHash('sha256').update(JSON.stringify([sessionId,engineVersion,game.id,game.runId,index])).digest('hex');
  plays.push({eventId,eventSequence:index,sequence:plays.length+1,possessingTeam:h.team,period:String(h.period),resolutionClock:h.clock,gameLengthTimestamp:h.gl,preDown:pre.down,preDistance:pre.distance,preFieldPosition:pre.fieldPos,description:h.desc,originalDescription:description,rawYards:h.yards,creditedYards,category,postPossession:post.possession,postFieldPosition:post.fieldPos,postDownDistance:{down:post.down,distance:post.distance},pointsAwarded:post.points,scoreAfter:[...h.score],ruling:h.ruling??null,strategy:h.strategy??null,safetyFreeKick:h.freeKick?{kickingTeam:h.freeKick.kickingTeam,receivingTeam:h.freeKick.receivingTeam,fromOwn:h.freeKick.fromOwn}:null,weatherAdjustment:weatherView(h.weatherAudit),offensive,giveaway,touchdown,converted});
 }
 return plays;
}
