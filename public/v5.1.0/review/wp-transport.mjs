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
