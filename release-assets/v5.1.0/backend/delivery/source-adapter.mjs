import {hash,requireScope} from './projection.mjs';
// Input must come from ONE trusted, atomic authoritative read, never HTTP JSON.
// A commit manifest carries exact event count/hash, including session-wide events.
// This allows audit gaps and unknown commands to fail closed before projection.
export function committedSnapshots(source){
 const {sessionId,engineVersion,stateVersion,committedAt,games,commits}=source;
 if(!Number.isSafeInteger(stateVersion)||stateVersion<0||!Array.isArray(games)||!games.length||!Array.isArray(commits)||commits.length!==stateVersion)throw Error('SOURCE_AUDIT_GAP');
 const ids=new Set(games.map(g=>g.id));if(ids.size!==games.length)throw Error('SOURCE_IDENTITY_MISMATCH');
 for(let i=0;i<commits.length;i++){
  const c=commits[i];
  if(c.stateVersion!==i+1||!Array.isArray(c.events)||c.eventCount!==c.events.length||!c.eventCount||c.eventHash!==hash(c.events))throw Error('SOURCE_AUDIT_GAP');
  for(const event of c.events)if(!event||typeof event.command!=='string'||(event.gameId!==null&&!ids.has(event.gameId)))throw Error('SOURCE_IDENTITY_MISMATCH');
 }
 return games.map(game=>{
  requireScope(sessionId,game.id);
  if(game.sessionId!==sessionId||game.qaOnly!==true)throw Error('SOURCE_IDENTITY_MISMATCH');
  const commands=commits.flatMap(c=>c.events.filter(e=>e.gameId===null||e.gameId===game.id).map(e=>({stateVersion:c.stateVersion,command:e.command})));
  return {game,engineVersion,stateVersion,committedAt,audit:{complete:true,sessionId,gameId:game.id,throughStateVersion:stateVersion,commands}};
 });
}
// Serial per-game CAS commits are safe to repeat after an interruption. Until
// all projections catch up, reads compare authoritative sourceVersion and block.
export function createCommittedSourceConsumer({loadCommittedRevision,writeProjection}){
 return async(sessionId,revision)=>{
  const source=await loadCommittedRevision(sessionId,revision);
  if(source.sessionId!==sessionId||source.stateVersion!==revision)throw Error('SOURCE_IDENTITY_MISMATCH');
  const receipts=[];
  for(const snapshot of committedSnapshots(source))receipts.push(await writeProjection(snapshot));
  return receipts;
 };
}
