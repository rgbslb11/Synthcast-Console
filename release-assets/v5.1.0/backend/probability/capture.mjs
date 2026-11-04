import {hash} from '../delivery/projection.mjs';
export const CAPTURE_VERSION='GC-WP-CAPTURE-1';
export function captureGame(g,{engineVersion,stateVersion,actionOrdinal,command,observedAt}){
 // Explicit allowlist: never enumerate/read pending outcomes or random state.
 const scores=Object.fromEntries(Object.entries(g.scores).map(([p,s])=>[p,[s[0],s[1]]]));
 const weather=Object.fromEntries(Object.entries(g.weather??{}).filter(([k])=>!['locked','lockedAtZulu','snapshotId'].includes(k)));
 const ratings=[g.awayPower,g.homePower].map(p=>p?{overall:p.overall,offense:p.offense,defense:p.defense}:null);
 const context={weatherHash:hash(weather),ratingsHash:hash(ratings),engineVersion,gameId:g.id,homeTeamId:g.homeCode,awayTeamId:g.awayCode,neutral:g.neutral===true,quarterSeconds:g.quarterLengthSeconds};
 return {captureVersion:CAPTURE_VERSION,sessionId:g.sessionId,gameId:g.id,runId:g.runId,engineVersion,stateVersion,actionOrdinal,command,observedAt,
  ...context,contextHash:hash(context),scores,period:g.activePeriod,clockSeconds:g.scoreboardSeconds,glSeconds:g.glSeconds,
  possessionTeamId:g.possession===null?null:g.possession===0?g.awayCode:g.homeCode,yardsToGoal:100-g.fieldPos,
  resolvedPlayCount:g.history.filter(h=>h.preSnap&&h.adjudicated).length,throughEventSequence:g.history.length-1,
  down:g.down,distance:g.distance,awayTimeouts:g.awayTimeouts,homeTimeouts:g.homeTimeouts,
  editing:g.editing===true||g.lifecycle==='EDIT',lifecycle:g.lifecycle,qaOnly:g.qaOnly===true};
}
