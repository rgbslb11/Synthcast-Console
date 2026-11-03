import {requireChairman,availability} from './access.mjs';
import {normalizePlays} from './normalize.mjs';
import {teamStatistics} from './statistics.mjs';
import {fieldState,possessions} from './field.mjs';
// loadSnapshot must atomically supply state and complete audit at the same revision.
// No production adapter is supplied by this foundation milestone.
export function createReportingService({loadSnapshot}){
 return async function details({identity,sessionId,gameId,afterSequence=0,limit=100,expectedRunId=null}){
  requireChairman(identity,sessionId);
  if(!Number.isSafeInteger(afterSequence)||afterSequence<0||!Number.isSafeInteger(limit)||limit<1||limit>250)throw Error('INVALID_CURSOR');
  const {game,audit,stateVersion,engineVersion}=await loadSnapshot(sessionId,gameId);
  if(game.id!==gameId||game.sessionId!==sessionId)throw Error('SNAPSHOT_IDENTITY_MISMATCH');
  const access=availability(game,audit,stateVersion);
  const envelope={contractVersion:'GC-STATS-1',sessionId,engineVersion,gameId,runId:game.runId,stateVersion,availability:access,coverage:['REGULATION_ONLY','SCORE_INCLUDES_OVERTIME']};
  if(access.status!=='AVAILABLE')return envelope;
  if(expectedRunId&&expectedRunId!==game.runId)return {...envelope,availability:{status:'BLOCKED',reason:'RUN_CHANGED'}};
  try{
   const all=normalizePlays(game,{sessionId,engineVersion});
   if(afterSequence>all.length)throw Error('CURSOR_AHEAD_OF_HISTORY');
   const page=all.slice(afterSequence,afterSequence+limit);
   return {...envelope,throughEventSequence:game.history.length-1,teamStatistics:teamStatistics(game,all),field:fieldState(game),possessions:possessions(all,game.lifecycle),plays:page,nextSequence:afterSequence+page.length,hasMore:afterSequence+page.length<all.length};
  }catch(error){return {...envelope,availability:{status:'BLOCKED',reason:error.message}};}
 };
}
