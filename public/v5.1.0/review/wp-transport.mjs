import {readWpHistory} from './model.mjs';
export const WP_URL='https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-wp';
export async function readWp({session,game,token,signal,onReset,fetchImpl=fetch}){
 if(!/^qa-v510-[a-z0-9-]{1,64}$/.test(session)||!/^G[0-9]{4}$/.test(game))throw Error('QA_SCOPE_REQUIRED');
 if(!token)throw Error('AUTHENTICATION_REQUIRED');
 return readWpHistory({session,game,onReset,fetchPage:async query=>{
  const url=new URL(WP_URL);url.search=new URLSearchParams(query);
  const r=await fetchImpl(url,{method:'GET',headers:{Authorization:`Bearer ${token}`},signal,cache:'no-store',credentials:'omit',redirect:'error'});
  if(!r.ok)throw Error(r.status===401?'AUTHENTICATION_REQUIRED':r.status===403?'ACCESS_DENIED':`WP_HTTP_${r.status}`);
  const body=await r.json(),s=body.summary;
  if(!s||!['PREGAME','ESTIMATED','FINAL','BLOCKED'].includes(s.status)||!Number.isSafeInteger(s.stateVersion)||typeof s.modelId!=='string'||s.status==='BLOCKED'&&s.probability!==null||s.status!=='BLOCKED'&&!(typeof s.probability==='number'&&s.probability>=0&&s.probability<=1))throw Error('WP_INVALID_SUMMARY');
  return body;
 }});
}

// Additive GC-WP-BOARD-1: one authorized snapshot, no history or football writes.
export async function readWpBoard({session,games,token,signal,fetchImpl=fetch}){
 if(!/^qa-v510-[a-z0-9-]{1,64}$/.test(session)||!Array.isArray(games)||!games.length||games.length>56||new Set(games).size!==games.length||games.some(id=>!/^G[0-9]{4}$/.test(id)))throw Error('QA_SCOPE_REQUIRED');
 if(!token)throw Error('AUTHENTICATION_REQUIRED');
 const url=new URL(WP_URL);url.search=new URLSearchParams({session,view:'board',games:games.join(',')});
 const r=await fetchImpl(url,{method:'GET',headers:{Authorization:`Bearer ${token}`},signal,cache:'no-store',credentials:'omit',redirect:'error'});
 if(!r.ok)throw Error(r.status===401?'AUTHENTICATION_REQUIRED':r.status===403?'ACCESS_DENIED':`WP_HTTP_${r.status}`);
 const body=await r.json(),version=v=>v===null||Number.isSafeInteger(v)&&v>=0;
 if(body.contractVersion!=='GC-WP-BOARD-1'||body.sessionId!==session||!version(body.sourceVersion)||!version(body.wpVersion)||!Array.isArray(body.games)||body.games.length!==games.length)throw Error('WP_INVALID_BOARD');
 const pending=body.sourceVersion===null||body.wpVersion===null||body.sourceVersion!==body.wpVersion;
 for(let i=0;i<games.length;i++){
  const row=body.games[i],s=row?.summary;
  if(row?.gameId!==games[i]||!s||!['PREGAME','ESTIMATED','FINAL','BLOCKED'].includes(s.status)||s.status==='BLOCKED'&&s.probability!==null||s.status!=='BLOCKED'&&!(typeof s.probability==='number'&&s.probability>=0&&s.probability<=1))throw Error('WP_INVALID_BOARD');
  const missing=s.status==='BLOCKED'&&['NO_COMMITTED_OBSERVATION','WP_SOURCE_PENDING'].includes(s.reason)&&s.runId==null;
  if(!missing&&(s.sessionId!==session||s.gameId!==games[i]||typeof s.runId!=='string'||typeof s.modelId!=='string'||!Number.isSafeInteger(s.stateVersion)))throw Error('WP_INVALID_BOARD');
  if(pending&&(s.status!=='BLOCKED'||s.reason!=='WP_SOURCE_PENDING'))throw Error('WP_INVALID_BOARD');
 }
 return body;
}
export function selectWpResponse({history,board,data,now=Date.now()}){
 const matches=s=>s&&data&&s.sessionId===data.sessionId&&s.gameId===data.gameId&&s.runId===data.runId&&s.stateVersion===data.stateVersion;
 const current=board&&now-board.fetchedAt>=0&&now-board.fetchedAt<=10000&&matches(board.summary);
 if(current&&board.summary.status==='BLOCKED')return {summary:board.summary,points:[],summaryOnly:true};
 if(matches(history?.summary))return history;
 if(current)return {summary:board.summary,points:[],summaryOnly:true};
 return history;
}
