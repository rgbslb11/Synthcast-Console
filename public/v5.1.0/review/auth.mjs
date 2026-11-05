// QA-only password sign-in. Credentials and tokens never enter browser storage.
const AUTH_URL='https://xsvdmcipviejxynkdbhq.supabase.co/auth/v1';
const API_KEY='sb_publishable_5jxF1vOOyWdUvvk3-poZqQ_83gaaUdf';
export async function signIn({email,password,fetchImpl=fetch,signal}){
 const response=await fetchImpl(`${AUTH_URL}/token?grant_type=password`,{method:'POST',headers:{apikey:API_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password}),credentials:'omit',redirect:'error',cache:'no-store',signal});
 if(!response.ok)throw Error(response.status===429?'SIGN_IN_RATE_LIMITED':'SIGN_IN_FAILED');
 const body=await response.json();
 if(!body.access_token||!body.user?.id||body.user.is_anonymous||!Number.isFinite(body.expires_in))throw Error('SIGN_IN_FAILED');
 // No refresh token retained. Expiration requires a fresh explicit sign-in.
 return {token:body.access_token,expiresAt:Date.now()+body.expires_in*1000};
}
export async function signOut(token,{fetchImpl=fetch}={}){
 if(!token)return;
 const r=await fetchImpl(`${AUTH_URL}/logout?scope=local`,{method:'POST',headers:{apikey:API_KEY,Authorization:`Bearer ${token}`},credentials:'omit',redirect:'error',cache:'no-store'});
 if(!r.ok&&r.status!==401)throw Error('REMOTE_SIGN_OUT_FAILED');
}
