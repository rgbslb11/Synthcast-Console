import {Buffer} from 'node:buffer';
import {scoreboardState} from '../reporting/scoreboard.mjs';
import {createHash} from 'node:crypto';
import {availability} from '../reporting/access.mjs';
import {normalizePlays} from '../reporting/normalize.mjs';
import {teamStatistics} from '../reporting/statistics.mjs';
import {fieldState,possessions} from '../reporting/field.mjs';
export const CONTRACT='GC-STATS-1';
export const DELIVERY='GC-DELIVERY-1';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const hash=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
export function requireScope(sessionId,gameId){
 if(!/^qa-v510-[a-z0-9-]{1,64}$/.test(sessionId)||!/^G[0-9]{4}$/.test(gameId))throw Error('QA_SCOPE_REQUIRED');
}
// Called only with a committed atomic source snapshot by the backend writer.
// No football-engine import, pending state, RNG or WP input is used.
export function buildProjection({game,audit,stateVersion,engineVersion,committedAt}){
 requireScope(game.sessionId,game.id);
 if(game.qaOnly!==true)throw Error('QA_SCOPE_REQUIRED');
 if(!Number.isSafeInteger(stateVersion)||stateVersion<0||!engineVersion||typeof committedAt!=='string'||!Number.isFinite(Date.parse(committedAt)))throw Error('INVALID_SOURCE_CHECKPOINT');
 const access=availability(game,audit,stateVersion);
 if(access.reason==='VERIFICATION_UNAVAILABLE')throw Error('VERIFICATION_UNAVAILABLE');
 if(!Array.isArray(game.history))throw Error('HISTORY_IDENTITY_MISSING');
 let plays=[],derived={};
 const envelope={contractVersion:CONTRACT,deliveryVersion:DELIVERY,sessionId:game.sessionId,engineVersion,gameId:game.id,runId:game.runId,stateVersion,throughEventSequence:game.history.length-1,availability:access,coverage:['REGULATION_ONLY','SCORE_INCLUDES_OVERTIME'],generatedAt:committedAt};
 if(access.status==='AVAILABLE'){
  try{
   plays=normalizePlays(game,{sessionId:game.sessionId,engineVersion});
   const board=scoreboardState(game,plays);
   derived={scoreboard:board.scoreboard,teamStatistics:teamStatistics(game,plays),field:fieldState(game),possessions:possessions(plays,game.lifecycle,game.activePeriod),fieldAvailability:{...board.fieldAvailability,timeOfPossession:game.teamTopSeconds==null?{status:'BLOCKED',reason:'SOURCE_MISSING'}:{status:'AVAILABLE',reason:null}}};
  }catch(e){envelope.availability={status:'BLOCKED',reason:e.message};plays=[];}
 }
 const summary={...envelope,...derived};
 if(Buffer.byteLength(JSON.stringify(summary))>262144)throw Error('SNAPSHOT_TOO_LARGE');
 // Persist record digests separately from the bounded summary. Protects scoring
 // records as well as plays; retries cannot silently replace committed history.
 const sourceHashes=game.history.map(hash);
 return {summary,plays,sourceHashes,commands:structuredClone(audit.commands)};
}
export function createProjectionWriter({rpc}){
 return async snapshot=>{
  const packet=buildProjection(snapshot);
  return rpc('commit_reporting',{p_packet:packet});
 };
}
