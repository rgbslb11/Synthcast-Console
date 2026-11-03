// Pure read model of persisted state. Never advances simulation or consumes RNG.
export function liveStats(g,stateVersion){
  const valid=k=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(k);
  const periods=Object.entries(g.scores??{});
  if(periods.some(([k,v])=>!valid(k)||!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isInteger(n)||n<0)))throw Error('INVALID_LINE_SCORE');
  const plays=(g.history??[]).filter(h=>h.preSnap&&h.adjudicated);
  const blocked={status:'BLOCKED',reason:'Detailed statistical definitions and event coverage require validation.'};
  return {
    schemaVersion:'live-stats-v1',status:'PARTIAL',gameId:g.id,runId:g.runId,stateVersion,
    lifecycle:g.lifecycle,editing:g.editing===true,delayed:g.delayed===true,
    period:g.activePeriod,scoreboardSeconds:g.scoreboardSeconds,gameLengthSeconds:g.glSeconds,
    possession:g.possession,fieldPosition:g.fieldPos,down:g.down,distance:g.distance,lastPlay:g.lastPlay,
    lineScore:Object.fromEntries(periods.map(([k,v])=>[k,[...v]])),
    teams:[0,1].map(t=>({name:t===0?g.away.name:g.home.name,score:periods.reduce((n,[,v])=>n+v[t],0),timeouts:t===0?g.awayTimeouts:g.homeTimeouts,
      playsStarted:g.teamPlayCount?.[t]??null,completedPlays:plays.filter(h=>h.team===t).length,
      regulationTopSeconds:g.teamTopSeconds?.[t]??null})),
    playByPlay:plays.map((h,index)=>({sequence:index+1,period:h.period,clock:h.clock,team:h.team,description:h.desc,yards:h.yards,ruling:h.ruling??null,score:h.score?[...h.score]:null})),
    unavailable:{turnovers:{...blocked},offensiveSnaps:{...blocked},yardage:{...blocked},driveStats:{...blocked},winProbability:{...blocked}},
  };
}
