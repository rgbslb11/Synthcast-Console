import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {signIn,signOut} from '../../public/v5.1.0/review/auth.mjs';
import {readWpBoard,readWp} from '../../public/v5.1.0/review/wp-transport.mjs';
const session='qa-v510-wp-load-r3',games=Array.from({length:56},(_,i)=>`G${String(502+i).padStart(4,'0')}`);
export async function run({email,password,fetchImpl=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const report={contractVersion:'GC-WP-BOARD-1',session,games:56,scope:'Read-only final-state transport; does not certify active-game sampling',intervalMs:5000,plannedRounds:37,rounds:[],requests:[],status:'BLOCKED'};let token;
 const request=async(url,init)=>{const start=now();try{const r=await fetchImpl(url,{...init,headers:{...init.headers,Origin:'https://rgbslb11.github.io'},signal:AbortSignal.timeout(15000)});report.requests.push({path:new URL(url).pathname,view:new URL(url).searchParams.get('view'),status:r.status,elapsedMs:now()-start});return r;}catch{throw Error('TRANSPORT_FAILURE');}};
 try{
  if(!email||!password)throw Error('QA_CREDENTIALS_REQUIRED');
  const auth=await signIn({email,password,fetchImpl:request});token=auth.token;password=undefined;const start=now();
  for(let i=0;i<37;i++){
   const due=start+i*5000;if(now()<due)await sleep(due-now());const begin=now(),game=games[i%games.length];
   const results=await Promise.allSettled([readWpBoard({session,games,token,fetchImpl:request}),readWp({session,game,token,fetchImpl:request})]);
   const error=results.find(r=>r.status==='rejected');if(error)throw error.reason;
   const [board,history]=results.map(r=>r.value),match=board.games.find(g=>g.gameId===game);
   if(JSON.stringify(match.summary)!==JSON.stringify(history.summary))throw Error('SUMMARY_HISTORY_MISMATCH');
   if(board.games.some(g=>g.summary.status!=='FINAL'))throw Error('FINAL_FIXTURE_CHANGED');
   const row={round:i+1,summaries:board.games.length,historyGame:game,historyPoints:history.points.length,sourceVersion:board.sourceVersion,wpVersion:board.wpVersion,elapsedMs:now()-begin,startLagMs:begin-due};report.rounds.push(row);
   if(row.elapsedMs>5000||row.startLagMs>1000)throw Error('FIVE_SECOND_READ_CADENCE_MISSED');
  }
  report.elapsedMs=now()-start;report.status='PASS';
 }catch(e){report.status='FAIL';report.reason=e.message;}
 finally{if(token){try{await signOut(token,{fetchImpl:request});report.logout='PASS';}catch{report.logout='FAIL';report.status='FAIL';report.reason??='LOGOUT_FAILED';}}}
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await run({email:process.env.GAMECAST_QA_EMAIL,password:process.env.GAMECAST_QA_PASSWORD});await mkdir('outputs/v510-wp',{recursive:true});await writeFile('outputs/v510-wp/board-load.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1;}
