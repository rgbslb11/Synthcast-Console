Deno.serve(() => new Response(JSON.stringify({error:'RECOVERY_REHEARSAL_CLOSED'}), {status:410,headers:{'content-type':'application/json','cache-control':'no-store'}}));
