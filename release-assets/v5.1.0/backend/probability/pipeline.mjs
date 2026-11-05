import {observeCapture} from './observer.mjs';
import {captureGame} from './capture.mjs';
// readSource is the existing immutable source-store loader. Never advances football.
export function createWpPipeline({store,readSource,sourceVersion}){
 const load=async sid=>new Map((await store.load(sid)).map(x=>[x.game_id,x.state]));
 async function recover(sessionId,{maxRevisions=100}={}){
  if(!Number.isSafeInteger(maxRevisions)||maxRevisions<1||maxRevisions>100)throw Error('INVALID_RECOVERY_LIMIT');
  let progress=await store.progress(sessionId),count=0;
  const head=await sourceVersion(sessionId);
  while(progress<head&&count<maxRevisions){
   const source=await readSource(sessionId,progress+1),states=await load(sessionId),updates=[];
   if(source.stateVersion!==progress+1||source.sessionId!==sessionId)throw Error('SOURCE_IDENTITY_MISMATCH');
   const events=source.stateVersion?source.commits.at(-1).events:[];
   for(const event of events){
    if(!Array.isArray(event.wpCaptures)||!event.wpCaptures.length)throw Error('SOURCE_CAPTURE_MISSING');
    for(const c of event.wpCaptures){
     if(c.sessionId!==sessionId||c.stateVersion!==source.stateVersion||c.command!==event.command)throw Error('CAPTURE_IDENTITY_MISMATCH');
     const previous=states.get(c.gameId),prior=['launch','deadman_launch'].includes(c.command)?await store.prior(sessionId,c.gameId,c.runId,source.stateVersion):null;
     const special=['launch','deadman_launch','edit_begin','edit_cancel','score','clock_set','edit_commit','end','reopen_live'].includes(c.command);
     const first=c.resolvedPlayCount>0&&!(previous?.runId===c.runId&&previous.seenGameplay);
     const final=['FINAL_PENDING','LOCKED','FINAL','READY'].includes(c.lifecycle)&&!['FINAL_PENDING','LOCKED','FINAL','READY'].includes(previous?.capture?.lifecycle);
     if(special||first||final){
      // Each trigger keeps its identity even when first gameplay and final coincide.
      const kinds=first&&final?['first_observed_gameplay','final']:[null];
      for(const kind of kinds){const result=observeCapture(states.get(c.gameId),c,{prior,kind});updates.push(result);states.set(c.gameId,result.state);}
     }else if(previous){ // Persist most recent committed capture for the next periodic observation.
      states.set(c.gameId,{...previous,capture:c});
     }
    }
   }
   await store.commit({sessionId,requestId:'source:'+source.stateVersion,sourceVersion:source.stateVersion,expectedProgress:progress,updates});
   progress++;count++;
  }
  return {sourceVersion:progress,caughtUp:progress===head,recovered:count};
 }
 async function sample(sessionId,time){
  let observedAt=typeof time==='function'?time():time;
  if(!Number.isFinite(Date.parse(observedAt)))throw Error('INVALID_OBSERVATION_TIME');
  const caught=await recover(sessionId);if(!caught.caughtUp)throw Error('WP_SOURCE_PENDING');
  const source=await readSource(sessionId,caught.sourceVersion),states=await load(sessionId);
  observedAt=typeof time==='function'?time():time;
  const slot=Math.floor(Date.parse(observedAt)/5000),updates=[];
  for(const g of source.games){
   const previous=states.get(g.id);
   if(['FINAL_PENDING','LOCKED','FINAL','READY'].includes(g.lifecycle))continue;
   if(previous&&Math.floor(Date.parse(previous.observedAt)/5000)>=slot)continue;
   const c=captureGame(g,{engineVersion:source.engineVersion,stateVersion:source.stateVersion,actionOrdinal:0,command:'poll',observedAt});
   const prior=g.lifecycle==='UNLAUNCHED'?await store.prior(sessionId,g.id,g.runId,source.stateVersion+1):null;
   const result=observeCapture(previous,c,{prior,kind:g.lifecycle==='UNLAUNCHED'?'pregame':'poll',eventId:'poll:'+slot});updates.push(result);
  }
  if(!updates.length)return {sourceVersion:caught.sourceVersion,records:0};
  return store.commit({sessionId,requestId:'sample:'+slot,sourceVersion:caught.sourceVersion,expectedProgress:caught.sourceVersion,updates});
 }
 return {recover,sample};
}
