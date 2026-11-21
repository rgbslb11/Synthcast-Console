const rate=(n,d)=>d?n/d:null;
export function teamStatistics(game,plays){
 const periods=Object.entries(game.scores??{});
 if(periods.length<4||periods.some(([p,v])=>!/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(p)||!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isInteger(n)||n<0)))throw Error('INVALID_LINE_SCORE');
 if(!['1','2','3','4'].every(p=>Object.hasOwn(game.scores,p)))throw Error('INVALID_LINE_SCORE');
 const ledger={};
 for(const h of game.history){if(!h.preSnap){const p=String(h.period);ledger[p]??=[0,0];ledger[p][h.team]+=h.points;}}
 for(const [p,score] of periods)if(score.some((n,t)=>n!==(ledger[p]?.[t]??0)))throw Error('SCORING_LEDGER_MISMATCH');
 if(Object.keys(ledger).some(p=>!Object.hasOwn(game.scores,p)))throw Error('SCORING_LEDGER_MISMATCH');
 if(game.teamTopSeconds!=null&&(!Array.isArray(game.teamTopSeconds)||game.teamTopSeconds.length!==2||game.teamTopSeconds.some(n=>!Number.isFinite(n)||n<0)))throw Error('INVALID_TOP');
 return [0,1].map(team=>{
  const p=plays.filter(x=>x.possessingTeam===team),rush=p.filter(x=>['RUN','FUMBLE_LOST','SACK','KNEEL'].includes(x.category)),pass=p.filter(x=>['COMPLETE','INCOMPLETE','INTERCEPTION'].includes(x.category)),complete=pass.filter(x=>x.category==='COMPLETE'),off=p.filter(x=>x.offensive),third=off.filter(x=>x.preDown===3),fourth=off.filter(x=>x.preDown===4),sum=a=>a.reduce((s,x)=>s+x.creditedYards,0);
  const rushingYards=sum(rush),passingYards=sum(complete),interceptionsThrown=pass.filter(x=>x.category==='INTERCEPTION').length,fumblesLost=rush.filter(x=>x.category==='FUMBLE_LOST').length;
  const efficiency=a=>({made:a.filter(x=>x.converted).length,attempted:a.length,percentage:rate(a.filter(x=>x.converted).length*100,a.length)});
  return {totalPoints:periods.reduce((s,[,v])=>s+v[team],0),pointsByQuarter:Object.fromEntries(periods.filter(([k])=>['1','2','3','4'].includes(k)).map(([k,v])=>[k,v[team]])),pointsByOvertime:Object.fromEntries(periods.filter(([k])=>k.includes('OT')).map(([k,v])=>[k,v[team]])),timeOfPossession:game.teamTopSeconds?.[team]??null,offensiveSnaps:off.length,rushingAttempts:rush.length,rushingYards,yardsPerRush:rate(rushingYards,rush.length),rushingTouchdowns:rush.filter(x=>x.touchdown).length,passingAttempts:pass.length,completions:complete.length,completionPercentage:rate(100*complete.length,pass.length),passingYards,yardsPerCompletion:rate(passingYards,complete.length),interceptionsThrown,totalOffense:rushingYards+passingYards,yardsPerOffensivePlay:rate(rushingYards+passingYards,off.length),firstDowns:off.filter(x=>x.converted).length,thirdDownAttempts:third.length,thirdDownConversionsPercentage:efficiency(third),fourthDownAttempts:fourth.length,fourthDownConversionsPercentage:efficiency(fourth),fumblesLost,turnovers:interceptionsThrown+fumblesLost,punts:p.filter(x=>x.category==='PUNT').length,netPuntYards:p.filter(x=>x.category==='PUNT').reduce((s,x)=>s+x.rawYards,0),scoringSummary:game.history.flatMap((h,eventSequence)=>!h.preSnap&&h.team===team&&h.points>0?[{eventSequence,period:String(h.period),gameLengthTimestamp:h.gl,points:h.points,source:h.source??null}]:[])};
 });
}
