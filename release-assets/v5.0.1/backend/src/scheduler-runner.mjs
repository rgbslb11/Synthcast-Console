import {schedulerSignature,requireSessionSlug} from '../security/security-core.mjs';
// One server-side scheduler sweep. Scheduling/activation is a separate deployment.
export async function runSchedulerSweep({rpc,url,secret,fetchImpl=fetch,maxSessions=2,timeoutMs=10000,budgetMs=25000,clock=Date.now}){
  const target=new URL(url);if(target.protocol!=='https:'||!target.pathname.endsWith('/gamecast-week7-v5-0-1-scheduler'))throw Error('Canonical HTTPS scheduler URL required');
  if(target.username||target.password||target.search||target.hash)throw Error('Clean scheduler URL required');
  if(typeof secret!=='string'||!secret.trim())throw Error('Explicit scheduler secret required');
  for(const [name,value,maximum] of [['maxSessions',maxSessions,100],['timeoutMs',timeoutMs,30000],['budgetMs',budgetMs,60000]])if(!Number.isSafeInteger(value)||value<1||value>maximum)throw Error('Invalid scheduler '+name);
  const start=clock(),sessions=await rpc('scheduler_sessions',{}),results=[],seen=new Set();
  if(!Array.isArray(sessions))throw Error('Invalid scheduler discovery');
  // Validate the entire discovery before sending any write request. PostgreSQL
  // sorts oldest last_advanced_at first, so successful sessions rotate back.
  for(const row of sessions){
    requireSessionSlug(row?.public_slug);
    if(seen.has(row.public_slug)||!((typeof row.state_version==='number'&&Number.isSafeInteger(row.state_version))||(typeof row.state_version==='string'&&/^[1-9][0-9]*$/.test(row.state_version)))||!Number.isSafeInteger(Number(row.state_version))||Number(row.state_version)<1)throw Error('Invalid scheduler discovery');
    seen.add(row.public_slug);
  }
  // Sequential bounded sweep; each session advances all of its 41 active slots.
  for(const row of sessions){
    if(results.length>=maxSessions||clock()-start>=budgetMs)break;
    const body={session:requireSessionSlug(row.public_slug),expected_version:Number(row.state_version)},nonce='sweep-'+crypto.randomUUID();let result;
    for(let attempt=0;attempt<2;attempt++){
      const remaining=budgetMs-(clock()-start);
      if(remaining<=0){result={session:row.public_slug,status:'NETWORK_UNCERTAIN',stateVersion:null,replayed:false};break;}
      const timestamp=Date.now(),signature=schedulerSignature(secret,{timestamp,nonce,body});
      try{
        const response=await fetchImpl(target,{method:'POST',headers:{'content-type':'application/json','x-gamecast-timestamp':String(timestamp),'x-gamecast-nonce':nonce,'x-gamecast-signature':signature},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(Math.min(timeoutMs,remaining))});
        if((response.status>=500||response.status===429)&&attempt===0)continue;
        const receipt=await response.json();
        if(response.ok&&(!Number.isSafeInteger(receipt.state_version)||receipt.state_version!==body.expected_version+1))throw Error('Invalid scheduler receipt');
        result={session:row.public_slug,status:response.status,stateVersion:response.ok?receipt.state_version:null,replayed:response.ok&&receipt.replayed===true};break;
      }catch{if(attempt===1)result={session:row.public_slug,status:'NETWORK_UNCERTAIN',stateVersion:null,replayed:false};}
    }
    results.push(result);
  }
  return {sessions:sessions.length,processed:results.length,deferred:sessions.length-results.length,budgetMs,maxSessions,results};
}
