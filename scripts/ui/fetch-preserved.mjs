// Retry transient transport failures only. The caller still verifies every byte hash.
export async function fetchPublishedFile(url,{fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 for(let attempt=0;attempt<4;attempt++){
  try{
   const r=await fetchImpl(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});
   if(r.status!==200){const e=Error(`PUBLISHED_FILE_HTTP_${r.status}: ${url}`);e.retryable=[408,429,500,502,503,504].includes(r.status);throw e;}
   return Buffer.from(await r.arrayBuffer());
  }catch(e){if(e.retryable===false||attempt===3)throw e;await sleep(500*2**attempt);}
 }
}
