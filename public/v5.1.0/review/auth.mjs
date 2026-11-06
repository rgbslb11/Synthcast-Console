// QA-only password sign-in. Credentials and tokens never enter browser storage.
const AUTH_URL='https://xsvdmcipviejxynkdbhq.supabase.co/auth/v1';
const API_KEY='sb_publishable_5jxF1vOOyWdUvvk3-poZqQ_83gaaUdf';
export function authMessage(code){return ({
 SIGN_IN_FAILED:'Sign-in failed. Check your GameCast email and password and try again.',
 SIGN_IN_RATE_LIMITED:'Too many sign-in attempts. Wait a few minutes before trying again.',
 SIGN_IN_TIMEOUT:'Sign-in timed out. Check your connection and try again.',
 SIGN_IN_NETWORK_ERROR:'Could not reach GameCast sign-in. Check your connection and try again.',
 AUTHENTICATION_REQUIRED:'Sign in with your GameCast account to load QA stats.',
 ACCESS_DENIED:'Your account is signed in but does not have access to this QA session.'
})[code]??code;}
async function boundedFetch(url,init,{fetchImpl,timeoutMs=15000}){
 const controller=new AbortController();let timer;
 const abort=()=>controller.abort();init.signal?.addEventListener('abort',abort,{once:true});
 if(init.signal?.aborted)controller.abort();
 try{return await Promise.race([fetchImpl(url,{...init,signal:controller.signal}),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('SIGN_IN_TIMEOUT'));controller.abort();},timeoutMs);})]);}
 finally{clearTimeout(timer);init.signal?.removeEventListener('abort',abort);}
}
export async function signIn({email,password,fetchImpl=fetch,signal,timeoutMs=15000}){
 let response;
 try{response=await boundedFetch(`${AUTH_URL}/token?grant_type=password`,{method:'POST',headers:{apikey:API_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password}),credentials:'omit',redirect:'error',cache:'no-store',signal},{fetchImpl,timeoutMs});}
 catch(e){throw Error(e.message==='SIGN_IN_TIMEOUT'?'SIGN_IN_TIMEOUT':'SIGN_IN_NETWORK_ERROR');}
 if(!response.ok)throw Error(response.status===429?'SIGN_IN_RATE_LIMITED':'SIGN_IN_FAILED');
 const body=await response.json();
 if(!body.access_token||!body.user?.id||body.user.is_anonymous||!Number.isFinite(body.expires_in))throw Error('SIGN_IN_FAILED');
 // No refresh token retained. Expiration requires a fresh explicit sign-in.
 return {token:body.access_token,expiresAt:Date.now()+body.expires_in*1000};
}
export async function signOut(token,{fetchImpl=fetch}={}){
 if(!token)return;
 const r=await boundedFetch(`${AUTH_URL}/logout?scope=local`,{method:'POST',headers:{apikey:API_KEY,Authorization:`Bearer ${token}`},credentials:'omit',redirect:'error',cache:'no-store'},{fetchImpl});
 if(!r.ok&&r.status!==401)throw Error('REMOTE_SIGN_OUT_FAILED');
}
