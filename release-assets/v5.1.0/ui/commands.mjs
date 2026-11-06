// Prepared client; deliberately not imported by the published read-only review.
export const COMMAND_URL='https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-commands';
const allowed=new Set(['launch','auto','pause','delay','resume_delay']);
export function createCommandClient({fetchImpl=fetch,newId=()=>crypto.randomUUID() }={}){
 let pending=null,busy=false;
 async function transmit(token){
  if(busy)throw Error('COMMAND_BUSY');if(!pending)throw Error('NO_PENDING_COMMAND');if(!token)throw Error('AUTHENTICATION_REQUIRED');
  busy=true;
  try{
   const r=await fetchImpl(`${COMMAND_URL}?session=${encodeURIComponent(pending.session)}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':pending.id},body:pending.body,credentials:'omit',cache:'no-store',redirect:'error'});
   if(!r.ok){const status=r.status;if([400,401,403,409].includes(status))pending=null;throw Error(status===401?'AUTHENTICATION_REQUIRED':status===403?'ACCESS_DENIED':status===409?'COMMAND_CONFLICT_REFRESH_REQUIRED':`COMMAND_HTTP_${status}`);}
   const receipt=await r.json();if(!Number.isSafeInteger(receipt.stateVersion)||receipt.stateVersion!==pending.version+1||typeof receipt.replayed!=='boolean')throw Error('INVALID_COMMAND_RECEIPT');
   pending=null;return receipt;
  }finally{busy=false;}
 }
 return {
  get pending(){return pending!==null;},get busy(){return busy;},
  async send({session,game,command,stateVersion,token}){
   if(pending)throw Error('COMMAND_PENDING_RETRY_REQUIRED');
   if(!/^qa-v510-[a-z0-9-]{1,64}$/.test(session)||!/^G\d{4}$/.test(game)||!allowed.has(command)||!Number.isSafeInteger(stateVersion)||stateVersion<0)throw Error('INVALID_COMMAND');
   if(!token)throw Error('AUTHENTICATION_REQUIRED');
   const id=newId();if(typeof id!=='string'||id.length<16||id.length>128)throw Error('INVALID_REQUEST_ID');
   pending={session,id,version:stateVersion,body:JSON.stringify({expectedVersion:stateVersion,actions:[{id:game,command}]})};return transmit(token);
  },
  // An ambiguous network/503 result retains the exact request, never a new toggle.
  retry:transmit
 };
}
