import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const BASE='https://xsvdmcipviejxynkdbhq.supabase.co';
const KEY='sb_publishable_5jxF1vOOyWdUvvk3-poZqQ_83gaaUdf';
const SESSION='qa-v510-wp-load-r3';
const GAMES=Array.from({length:56},(_,i)=>`G${String(502+i).padStart(4,'0')}`);
// Normal client traffic; no service key, worker activation or database access.
export async function run({email,password,expectedVersion,fetchImpl=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const report={session:SESSION,games:56,plannedRounds:120,intervalMs:5000,concurrency:56,requests:[],rounds:[],status:'BLOCKED'};
 if(!email||!password){report.reason='QA_CREDENTIALS_REQUIRED';return report;}
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0){report.reason='SOURCE_REVISION_REQUIRED';return report;}
 let token;
 async function call(path,method='GET',body,extra={}){
  const start=now();let response;
  try{response=await fetchImpl(BASE+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...extra},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(method==='POST'&&path.includes('qa-commands')?60000:30000)});}
  catch{report.requests.push({endpoint:path.split('?')[0],method,status:null,elapsedMs:now()-start});throw Error('TRANSPORT_FAILURE');}
  report.requests.push({endpoint:path.split('?')[0],method,status:response.status,elapsedMs:now()-start,retryAfter:response.headers.get('retry-after')});
  if(!response.ok)throw Error(`HTTP_${response.status}`);
  return response.status===204?null:response.json();
 }
 const read=async game=>{
  const r=await call(`/functions/v1/gamecast-v5-1-0-qa-wp?session=${SESSION}&game=${game}&limit=1`,'GET',undefined,{Origin:'https://rgbslb11.github.io'});
  if(r.summary?.sessionId!==SESSION||r.summary?.gameId!==game||!Number.isSafeInteger(r.summary?.stateVersion)||!Array.isArray(r.points))throw Error('WP_CONTRACT_MISMATCH');
  return r;
 };
 try{
  const login=await call('/auth/v1/token?grant_type=password','POST',{email,password});
  if(!login.access_token||!login.user?.id||login.user.is_anonymous)throw Error('AUTHENTICATION_REQUIRED');
  token=login.access_token;password=undefined;
  await read(GAMES[0]);let version=expectedVersion;
  const started=now();let stop=false,commandFailure,allFinal=false;
  report.commands=[];
  const commands=(async()=>{for(let i=0;i<20&&!stop&&!allFinal;i++){
   const commandStart=now();
   try{const result=await call(`/functions/v1/gamecast-v5-1-0-qa-commands?session=${SESSION}`,'POST',{expectedVersion:version,actions:[{command:'advance',seconds:600}]},{Origin:'https://rgbslb11.github.io','Idempotency-Key':`sustained-wp-${crypto.randomUUID()}`});
    if(result.stateVersion!==version+1)throw Error('COMMAND_REVISION_MISMATCH');version++;
    report.commands.push({stateVersion:version,elapsedMs:now()-commandStart});
   }catch(error){commandFailure=error;stop=true;}
  }})();
  try{for(let round=0;round<120;round++){
   if(commandFailure)throw commandFailure;
   const due=started+round*5000;if(now()<due)await sleep(due-now());
   const roundStart=now(),batch=await Promise.allSettled(GAMES.map(read));
   allFinal=batch.every(x=>x.status==='fulfilled'&&x.value.summary.status==='FINAL');
   const count=batch.filter(x=>x.status==='fulfilled').length,rejected=batch.find(x=>x.status==='rejected');
   report.rounds.push({round:round+1,reads:count,startLagMs:roundStart-due,elapsedMs:now()-roundStart,finalGames:batch.filter(x=>x.status==='fulfilled'&&x.value.summary.status==='FINAL').length,pendingGames:batch.filter(x=>x.status==='fulfilled'&&x.value.summary.reason==='WP_SOURCE_PENDING').length});
   if(rejected)throw rejected.reason;
   if(now()-roundStart>5000||roundStart-due>1000)throw Error('FIVE_SECOND_READ_CADENCE_MISSED');
   if(allFinal&&now()-started>=180000)break;
  }}catch(error){stop=true;throw error;}finally{await commands;}
  if(commandFailure)throw commandFailure;
  if(!allFinal)throw Error('NATURAL_FINALS_NOT_REACHED');
  report.status='PASS';report.finalSourceVersion=version;report.elapsedMs=now()-started;
 }catch(error){report.status='FAIL';report.reason=error.message;}
 finally{
  if(token){try{await call('/auth/v1/logout?scope=local','POST',{});report.logout='PASS';}catch{report.logout='FAIL';report.status='FAIL';report.reason??='LOGOUT_FAILED';}}
 }
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const request=JSON.parse(await readFile('release-assets/v5.1.0/wp-sustained-request.json','utf8'));
 if(request.session!==SESSION)throw Error('QA_SCOPE_REQUIRED');
 const report=await run({email:process.env.GAMECAST_QA_EMAIL,password:process.env.GAMECAST_QA_PASSWORD,expectedVersion:request.expectedVersion});
 await mkdir('outputs/v510-wp',{recursive:true});await writeFile('outputs/v510-wp/sustained-load.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,reason:report.reason,rounds:report.rounds,commands:report.commands,logout:report.logout}));
 if(report.status!=='PASS')process.exitCode=1;
}
