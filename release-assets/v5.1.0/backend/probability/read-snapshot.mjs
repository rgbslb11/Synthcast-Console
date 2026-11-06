import {requireScope} from '../delivery/projection.mjs';
import {compactView} from './observer.mjs';
// One SQL statement gives authorization, heads and page the same MVCC snapshot.
// No cache, football write, schema change or stored credential is involved.
export const WP_READ_SQL=`
with access as materialized (
 select gamecast_v510.authorize_reporting($1::uuid,$2::text) as ok
)
select a.ok,h.state,h.sequence,s.state_version,p.source_version,
 coalesce(page.points,'[]'::jsonb) as points
from access a
left join gamecast_v510.wp_heads h on a.ok and h.session_id=$2 and h.game_id=$3
left join gamecast_v510.source_heads s on a.ok and s.session_id=$2
left join gamecast_v510.wp_progress p on a.ok and p.session_id=$2
left join lateral (
 select jsonb_agg(jsonb_build_object('sequence',r.sequence,'record',r.record) order by r.sequence) as points
 from (
  select sequence,record from gamecast_v510.wp_records
  where a.ok and s.state_version=p.source_version
   and ($7::text is null or $7=h.state->>'runId')
   and session_id=$2 and game_id=$3 and run_id=h.state->>'runId'
   and sequence>$4::bigint and sequence<=coalesce($6::bigint,h.sequence)
  order by sequence limit $5::integer
 ) r
) page on true`;
export async function readWpSnapshot(query,{sessionId,gameId,userId,after=0,limit=100,runId=null,highWatermark=null}){
 requireScope(sessionId,gameId);
 if(!Number.isSafeInteger(after)||after<0||!Number.isSafeInteger(limit)||limit<1||limit>250||after>0&&!runId)throw Error('INVALID_CURSOR');
 const h=(await query(WP_READ_SQL,[userId,sessionId,gameId,after,limit,Number.isSafeInteger(highWatermark)?highWatermark:null,runId])).rows[0];
 if(!h?.ok)throw Error('CHAIRMAN_FORBIDDEN');
 if(h.state==null)return {summary:compactView(null),points:[],nextSequence:after};
 const high=highWatermark??Number(h.sequence);
 if(!Number.isSafeInteger(high)||high<after||high>Number(h.sequence))throw Error('INVALID_CURSOR');
 if(h.state_version==null||h.source_version==null||Number(h.state_version)!==Number(h.source_version))return {summary:{...compactView(h.state),status:'BLOCKED',probability:null,color:'#808080',reason:'WP_SOURCE_PENDING'},points:[],nextSequence:after};
 if(runId&&runId!==h.state.runId)throw Error('RUN_CHANGED');
 const rows=h.points;
 return {summary:compactView(h.state),verifiedSourceVersion:Number(h.state_version),points:rows.map(r=>({...r.record,observationSequence:Number(r.sequence)})),nextSequence:rows.length?Number(rows.at(-1).sequence):after,highWatermark:high};
}
