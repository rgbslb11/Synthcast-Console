// Independent backend task; no browser and no football-engine operations.
export function createWpSampler({pipeline,listSessions,clock=()=>new Date().toISOString()}){
 let running=false;
 return async function sweep(){
  if(running)return {skipped:'SWEEP_IN_PROGRESS'};running=true;
  try{const ids=await listSessions();if(!Array.isArray(ids)||ids.length>100||new Set(ids).size!==ids.length)throw Error('INVALID_SESSION_DISCOVERY');
   const results=[];for(const sessionId of ids){try{results.push({sessionId,result:await pipeline.sample(sessionId,clock)});}catch(error){results.push({sessionId,error:error.message});}}
   return {results};
  }finally{running=false;}
 };
}
export function startWpSampler(sweep,{onResult=()=>{},onError=()=>{}}={}){
 const run=()=>Promise.resolve().then(sweep).then(onResult,onError);
 const timer=setInterval(run,5000);run();return ()=>clearInterval(timer);
}
