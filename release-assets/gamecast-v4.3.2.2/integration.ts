// Release-scoped persistence/orchestration. Football functions remain inherited verbatim.
async function commit4322(client: any, cur: any, state: Game[], stamp: string, events: any[], actor = 'CHAIRMAN') {
  const {data,error} = await client.rpc('gamecast_v4322_commit', {
    p_session_id:cur.session_id,p_expected_version:cur.state_version,p_state:state,p_stamp:stamp,p_events:events,p_actor:actor
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
async function scheduler4322(req: Request, client: any) {
  if (req.method !== 'POST') return json({error:'POST required'},405);
  const token = req.headers.get('x-deadman-scheduler') || '';
  if (!token || token.length > 256) return json({error:'scheduler unauthorized'},403);
  const auth = await client.rpc('gamecast_v4322_scheduler_auth',{p_hash:await sha256(token)});
  if (auth.error || auth.data !== true) return json({error:'scheduler unauthorized'},403);
  const listed = await client.rpc('gamecast_v4322_scheduler_sessions');
  if (listed.error) throw listed.error;
  let committed = 0, conflicts = 0;
  for (const item of listed.data || []) {
    const read = await client.rpc('gamecast_v12_read_session',{p_slug:item.public_slug});
    if (read.error) throw read.error;
    const cur = Array.isArray(read.data) ? read.data[0] : read.data;
    if (!cur || cur.week_key !== WEEK_KEY || !item.public_slug.startsWith('w5satv4322-')) continue;
    const stamp = now(), wall = Math.max(0,Math.floor((Date.parse(stamp)-Date.parse(cur.last_advanced_at))/1000));
    const state = project(cur.state,wall), events = [];
    for (const g of state) {
      const change = deadmanTick(g,stamp);
      if (change) events.push({type:'V4322_DEADMAN_'+change.action,gameId:g.id,payload:change});
      const prior = cur.state.find((x: any)=>x.id===g.id);
      if (g.deadman?.triggeredAtZulu && g.lifecycle === 'FINAL_PENDING' && prior?.lifecycle !== 'FINAL_PENDING') {
        events.push({type:'V4322_AUTONOMOUS_FINAL',gameId:g.id,payload:{masterZulu:stamp,runId:g.runId,score:[total(g,0),total(g,1)],qaOnly:g.qaOnly===true}});
      }
    }
    // Ordinary reads project AUTO already. Commit starts, resolutions and finals, not every polling tick.
    // This avoids perpetual stale-version failures in Chairman Edit forms.
    if (!events.length) continue;
    const up = await commit4322(client,cur,state,stamp,events,'SCHEDULER');
    if (up) committed++; else conflicts++;
  }
  return json({engine_version:ENGINE_VERSION,committed,conflicts,master_zulu:now()});
}
