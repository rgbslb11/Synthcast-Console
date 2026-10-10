'use strict';
// Browser-only Auth state. Tokens remain in memory. Recovery fragments are removed immediately.
(() => {
  let auth=null,pending=null;
  const config=()=>globalThis.GAMECAST_V500_CONFIG;
  const status=text=>{const el=document.getElementById('authStatus');if(el)el.textContent=text;};
  const recoveryStatus=text=>{const el=document.getElementById('recoveryStatus');if(el)el.textContent=text;};
  const redirectUrl=()=>location.origin+location.pathname+location.search;

  async function authRequest(path,body){
    const c=config();if(!c.publishableKey)throw Error('Sign-in is not configured');
    const r=await fetch(c.projectUrl+'/auth/v1/'+path,{method:'POST',headers:{apikey:c.publishableKey,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});
    const b=await r.json();if(!r.ok)throw Error('Authentication failed');return b;
  }
  async function requestPasswordReset(email){
    const path='recover?redirect_to='+encodeURIComponent(redirectUrl());
    await authRequest(path,{email});
  }
  async function updatePassword(password){
    const c=config(),token=await bearer();
    const r=await fetch(c.projectUrl+'/auth/v1/user',{method:'PUT',headers:{apikey:c.publishableKey,authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({password}),redirect:'error'});
    if(!r.ok)throw Error('Password update failed');
  }
  async function bearer(){
    if(!auth)throw Error('Sign in to control games');
    if(Date.now()>=auth.expiresAt-30000){
      try{const b=await authRequest('token?grant_type=refresh_token',{refresh_token:auth.refresh_token});auth={...b,expiresAt:Date.now()+b.expires_in*1000};}catch(e){auth=null;pending=null;status('SIGN IN AGAIN');throw e;}
    }
    return auth.access_token;
  }
  function showRecoveryForm(show){
    const form=document.getElementById('authForm'),panel=document.getElementById('passwordRecovery');
    if(form)form.hidden=show;if(panel)panel.hidden=!show;
  }
  function acceptRecoverySession(){
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    if(hash.get('type')!=='recovery'&&!hash.get('error'))return false;
    history.replaceState(null,'',location.pathname+location.search);
    if(hash.get('error')||!hash.get('access_token')){
      auth=null;status('RESET LINK INVALID OR EXPIRED');return false;
    }
    const expiresIn=Number(hash.get('expires_in'))||3600;
    auth={access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')||'',expiresAt:Date.now()+expiresIn*1000};
    pending=null;showRecoveryForm(true);recoveryStatus('CHOOSE A NEW PASSWORD');return true;
  }

  globalThis.gamecastSignedIn=()=>!!auth;
  globalThis.gamecastApi=async(action,body,{slug,operator})=>{
    const c=config(),mutating=body!==undefined,method=operator?'POST':'GET';
    if(!operator&&mutating)throw Error('Public view is read only');
    const api=operator?c.chairmanApi:c.publicApi,u=api+'?api='+encodeURIComponent(action)+(slug?'&session='+encodeURIComponent(slug):'');
    const raw=JSON.stringify(body??{}),signature=u+'\n'+raw;
    if(mutating&&pending&&pending.signature!==signature)throw Error('Previous request needs retry or refresh');
    if(mutating&&!pending)pending={signature,key:'ui-'+crypto.randomUUID(),action,body:structuredClone(body),slug,operator};
    const r=await fetch(u,{method,cache:'no-store',headers:{...(operator?{authorization:'Bearer '+await bearer(),'content-type':'application/json'}:{}),...(mutating?{'idempotency-key':pending.key}:{})},body:operator?raw:undefined});
    const b=await r.json();
    if(!r.ok){if(r.status<500)pending=null;if(r.status===401){auth=null;status('SIGN IN AGAIN');}throw Object.assign(Error(b.error||'Request failed'),{status:r.status});}
    if(b.engine_version&&b.engine_version!=='GC-W7-V5.0.0-RC1')throw Error('Release identity mismatch');
    if(b.public_slug&&slug&&b.public_slug!==slug)throw Error('Session identity mismatch');
    if(Array.isArray(b.state)&&(b.state.length!==54||new Set(b.state.map(g=>g.id)).size!==54))throw Error('Board count mismatch');
    if(mutating){pending=null;const button=document.getElementById('retryRequest');if(button)button.hidden=true;}return b;
  };
  globalThis.gamecastRetryPending=async()=>{
    if(!pending)throw Error('No request to retry');
    const p=pending;return globalThis.gamecastApi(p.action,p.body,{slug:p.slug,operator:p.operator});
  };
  globalThis.gamecastPendingRequest=()=>!!pending;
  globalThis.gamecastPendingGameId=()=>pending?.body?.id??'';
  window.addEventListener('DOMContentLoaded',()=>{
    if(new URLSearchParams(location.search).get('view')==='public')return;
    acceptRecoverySession();
    document.getElementById('authForm')?.addEventListener('submit',async e=>{
      e.preventDefault();const password=document.getElementById('authPassword'),email=document.getElementById('authEmail');
      try{const b=await authRequest('token?grant_type=password',{email:email.value,password:password.value});auth={...b,expiresAt:Date.now()+b.expires_in*1000};pending=null;status('SIGNED IN');window.dispatchEvent(new Event('gamecast-auth'));}catch{auth=null;status('SIGN-IN FAILED');}finally{password.value='';}
    });
    document.getElementById('requestPasswordReset')?.addEventListener('click',async()=>{
      const email=document.getElementById('authEmail');
      if(!email.reportValidity())return;
      status('SENDING RESET EMAIL');
      try{await requestPasswordReset(email.value);status('RESET EMAIL SENT · CHECK INBOX');}catch{status('RESET EMAIL FAILED · TRY AGAIN');}
    });
    document.getElementById('passwordRecovery')?.addEventListener('submit',async e=>{
      e.preventDefault();const password=document.getElementById('newPassword'),confirm=document.getElementById('confirmPassword');
      if(password.value!==confirm.value){recoveryStatus('PASSWORDS DO NOT MATCH');return;}
      recoveryStatus('UPDATING PASSWORD');
      try{await updatePassword(password.value);auth=null;pending=null;showRecoveryForm(false);status('PASSWORD UPDATED · SIGN IN');}
      catch{recoveryStatus('PASSWORD UPDATE FAILED · TRY AGAIN');}
      finally{password.value='';confirm.value='';}
    });
    document.getElementById('signOut')?.addEventListener('click',async()=>{
      const token=auth?.access_token;auth=null;pending=null;status('SIGNED OUT');
      if(token)try{await fetch(config().projectUrl+'/auth/v1/logout',{method:'POST',headers:{apikey:config().publishableKey,authorization:'Bearer '+token},redirect:'error'});}catch{}
    });
  });
})();
