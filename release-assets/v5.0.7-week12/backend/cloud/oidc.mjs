const issuer='https://token.actions.githubusercontent.com';
const repo='rgbslb11/Synthcast-Console',ref='refs/heads/development/gamecast-v5.0.7';
const workflow=repo+'/.github/workflows/qa-v507-cloud.yml@'+ref;
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
let cached;
export async function verifyGithubOIDC(token,{clock=()=>Date.now(),fetchImpl=fetch}={}){
 if(typeof token!=='string'||token.length>16000)throw Error('OIDC_REQUIRED');
 const parts=token.split('.');if(parts.length!==3)throw Error('OIDC_REQUIRED');
 const h=JSON.parse(new TextDecoder().decode(decode(parts[0]))),c=JSON.parse(new TextDecoder().decode(decode(parts[1]))),now=Math.floor(clock()/1000);
 if(h.alg!=='RS256'||h.typ!=='JWT'||typeof h.kid!=='string')throw Error('OIDC_ALGORITHM');
 const subjects=[`repo:${repo}:ref:${ref}`,`repo:rgbslb11@276151109/Synthcast-Console@1347147838:ref:${ref}`];
 if(c.iss!==issuer||c.aud!=='gamecast-v507-qa'||!subjects.includes(c.sub)||c.repository!==repo||String(c.repository_id)!=='1347147838'||String(c.repository_owner_id)!=='276151109'||c.ref!==ref||c.workflow_ref!==workflow||c.event_name!=='push'||c.runner_environment!=='github-hosted')throw Error('OIDC_SCOPE');
 if(!Number.isSafeInteger(c.exp)||!Number.isSafeInteger(c.iat)||!Number.isSafeInteger(c.nbf)||c.exp<=now||c.iat>now+30||c.nbf>now+30||now-c.iat>600||c.exp-c.iat>900)throw Error('OIDC_EXPIRED');
 if(!/^[0-9]+$/.test(c.run_id)||!/^[0-9]+$/.test(c.run_attempt)||!/^[a-f0-9]{40}$/.test(c.sha))throw Error('OIDC_RUN');
 if(!cached||cached.until<now||!cached.keys.some(k=>k.kid===h.kid)){
  const response=await fetchImpl(issuer+'/.well-known/jwks',{signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw Error('OIDC_KEYS');const data=await response.json();cached={keys:data.keys,until:now+300};
 }
 const jwk=cached.keys.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk)throw Error('OIDC_KEY');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('OIDC_SIGNATURE');
 return c;
}
