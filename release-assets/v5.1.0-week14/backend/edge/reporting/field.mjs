// Coordinates are offense-relative yards from own goal; never player tracking.
export function fieldState(game,play=null){
 if(!play&&String(game.activePeriod).includes('OT'))return {mode:'LIVE',availability:{status:'BLOCKED',reason:'OVERTIME_FIELD_UNAVAILABLE'}};
 const position=play?.preFieldPosition??game.fieldPos,down=play?.preDown??game.down,distance=play?.preDistance??game.distance;
 if(![position,down,distance].every(Number.isFinite)||position<0||position>100||!Number.isInteger(down)||down<1||down>4||distance<1||distance>100||![0,1].includes(play?.possessingTeam??game.possession))throw Error('INVALID_FIELD_STATE');
 return {mode:play?'HISTORICAL':'LIVE',possession:play?.possessingTeam??game.possession,ball:position,lineOfScrimmage:position,lineToGain:Math.min(100,position+distance),goalToGo:distance>=100-position,down,distance,postBall:play?.postFieldPosition??null,postPossession:play?.postPossession??null};
}
export function possessions(plays,lifecycle,period=null){
 const drives=[];let current=null,previous=null;
 for(const p of plays){
  const halftime=previous&&Number(previous.period)<=2&&Number(p.period)>=3;
  if(!current||current.team!==p.possessingTeam||halftime){
   if(current&&current.result==='IN_PROGRESS')current.result=halftime?'HALFTIME':'POSSESSION_CHANGE';
   current={id:drives.length+1,team:p.possessingTeam,start:p.preFieldPosition,end:p.preFieldPosition,playSequences:[],offensivePlays:0,offensiveYards:0,result:'IN_PROGRESS'};drives.push(current);
  }
  current.playSequences.push(p.sequence);current.offensivePlays+=Number(p.offensive);current.offensiveYards+=p.creditedYards;
  current.end=p.touchdown?100:p.ruling==='SAFETY'?0:p.postPossession===p.possessingTeam?p.postFieldPosition:100-p.postFieldPosition;
  if(p.touchdown)current.result='TOUCHDOWN';else if(p.ruling)current.result=p.ruling;else if(p.category==='FIELD_GOAL')current.result=p.pointsAwarded?'FIELD_GOAL':'MISSED_FIELD_GOAL';else if(p.category==='PUNT')current.result='PUNT';else if(p.giveaway)current.result=p.category;
  if(current.result!=='IN_PROGRESS')current=null;
  previous=p;
 }
 if(current&&(String(period).includes('OT')||['FINAL_PENDING','LOCKED','READY','FINAL'].includes(lifecycle)))current.result='REGULATION_END';
 return drives;
}
