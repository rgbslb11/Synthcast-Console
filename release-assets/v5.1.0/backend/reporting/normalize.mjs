import {createHash} from 'node:crypto';
const validPeriod=p=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(String(p));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function normalizePlays(game,{sessionId,engineVersion}){
 if(!sessionId||!engineVersion||!game.runId||!Array.isArray(game.history))throw Error('HISTORY_IDENTITY_MISSING');
 const plays=[];
 for(const [index,h] of game.history.entries()){
  if(!h.preSnap&&!h.adjudicated){
   if(validPeriod(h.period)&&[0,1].includes(h.team)&&Number.isInteger(h.points)&&h.points>=0)continue;
   throw Error('UNKNOWN_HISTORY_RECORD');
  }
  if(!h.preSnap||!h.adjudicated||!validPeriod(h.period)||![0,1].includes(h.team)||typeof h.desc!=='string'||!finite(h.yards)||!finite(h.gl)||!finite(h.clock))throw Error('INCOMPLETE_PLAY_RECORD');
  const pre=h.preSnap,post=h.adjudicated;
  if(![pre.down,pre.distance,pre.fieldPos,post.fieldPos,post.down,post.distance,post.points].every(finite)||![0,1].includes(post.possession)||!Array.isArray(h.score)||h.score.length!==2||!h.score.every(finite))throw Error('INCOMPLETE_PLAY_STATE');
  if(!['1','2','3','4'].includes(String(h.period)))throw Error('OVERTIME_SNAP_UNSUPPORTED');
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
  plays.push({eventId,eventSequence:index,sequence:plays.length+1,possessingTeam:h.team,period:String(h.period),resolutionClock:h.clock,gameLengthTimestamp:h.gl,preDown:pre.down,preDistance:pre.distance,preFieldPosition:pre.fieldPos,description:h.desc,originalDescription:h.originalDescription??null,rawYards:h.yards,creditedYards,category,postPossession:post.possession,postFieldPosition:post.fieldPos,postDownDistance:{down:post.down,distance:post.distance},pointsAwarded:post.points,scoreAfter:[...h.score],ruling:h.ruling??null,strategy:h.strategy??null,safetyFreeKick:h.freeKick?{kickingTeam:h.freeKick.kickingTeam,receivingTeam:h.freeKick.receivingTeam,fromOwn:h.freeKick.fromOwn}:null,weatherAdjustment:h.weatherAudit??null,offensive,giveaway,touchdown,converted});
 }
 return plays;
}
