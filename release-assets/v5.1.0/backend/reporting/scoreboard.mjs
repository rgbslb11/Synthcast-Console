// Exact GC-STATS-1 inventory. Values come only from the committed source.
export function scoreboardState(game,plays){
 const team=t=>({name:t?.name??null,record:typeof t?.record==='string'&&t.record.trim()?t.record:null});
 const weather=game.weather==null?null:Object.fromEntries(['enabled','wind','rain','temperature','locked','lockedAtZulu','snapshotId','modelVersion'].filter(k=>Object.hasOwn(game.weather,k)).map(k=>[k,game.weather[k]]));
 const ot=String(game.activePeriod).includes('OT');
 if(weather&&Object.values(weather).some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)))throw Error('INVALID_WEATHER_STATE');
 for(const v of [game.away?.name,game.home?.name,game.kickoffZulu,game.network,game.canonicalWeek])if(v!=null&&typeof v!=='string')throw Error('INVALID_SCOREBOARD_STATE');
 const scoreboard={noTeamLogos:true,awayTeamAndRecords:team(game.away),homeTeamAndRecords:team(game.home),awayTimeouts:game.awayTimeouts??null,homeTimeouts:game.homeTimeouts??null,possession:ot?null:game.possession??null,period:game.activePeriod??null,scoreboardClock:game.scoreboardSeconds??null,downDistance:ot?null:{down:game.down,distance:game.distance},fieldPosition:ot?null:game.fieldPos??null,scheduledKickoff:game.kickoffZulu??null,gameLengthClock:game.glSeconds??null,network:game.network??null,weather,week:game.canonicalWeek??null,lineScore:structuredClone(game.scores),lastResolvedPlay:plays.at(-1)??null};
 const fieldAvailability={};
 for(const [k,v] of Object.entries(scoreboard))if(v===null)fieldAvailability[k]={status:'BLOCKED',reason:ot&&['possession','downDistance','fieldPosition'].includes(k)?'OVERTIME_FIELD_UNAVAILABLE':k==='lastResolvedPlay'?'NO_RESOLVED_PLAY':'SOURCE_MISSING'};
 for(const k of ['awayTeamAndRecords','homeTeamAndRecords'])if(scoreboard[k].record===null)fieldAvailability[k+'.record']={status:'BLOCKED',reason:'AUTHORITATIVE_RECORD_MISSING'};
 return {scoreboard,fieldAvailability};
}
