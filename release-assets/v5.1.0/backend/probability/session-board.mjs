import {requireScope} from '../delivery/projection.mjs';
export const SESSION_BOARD_CONTRACT='GC-BOARD-1';
// One authorized MVCC snapshot. Only allowlisted metadata and current, approved
// reporting fields leave SQL; source history, seed and controls never leave it.
export const SESSION_BOARD_SQL=`with access as materialized (
 select gamecast_v510.authorize_reporting($1::uuid,$2::text) ok
)
select a.ok,h.state_version,c.committed_at,
 g->>'id' id,g->>'runId' run_id,g->>'lifecycle' lifecycle,
 g->'away'->>'name' away,g->'home'->>'name' home,
 g->'away'->>'record' away_record,g->'home'->>'record' home_record,
 g->>'network' network,g->>'kickoffZulu' kickoff_zulu,g->>'canonicalWeek' week,
 case when r.state_version is distinct from h.state_version or r.run_id is distinct from g->>'runId'
 then jsonb_build_object('status','BLOCKED','reason','SOURCE_PENDING')
 when r.corrected then jsonb_build_object('status','BLOCKED','reason','CHAIRMAN_CORRECTION')
 else r.summary->'availability' end availability,
 case when r.state_version=h.state_version and r.run_id=g->>'runId' and not r.corrected and r.summary->'availability'->>'status'='AVAILABLE'
 then r.summary->'scoreboard' end scoreboard,
 case when r.state_version=h.state_version and r.run_id=g->>'runId' and not r.corrected and r.summary->'availability'->>'status'='AVAILABLE'
 then jsonb_build_array(jsonb_build_object('totalPoints',r.summary->'teamStatistics'->0->'totalPoints'),jsonb_build_object('totalPoints',r.summary->'teamStatistics'->1->'totalPoints')) end team_statistics
from access a
left join gamecast_v510.source_heads h on a.ok and h.session_id=$2
left join gamecast_v510.source_commits c on a.ok and c.session_id=h.session_id and c.state_version=h.state_version
left join lateral jsonb_array_elements(c.games) with ordinality games(g,ord) on a.ok
left join gamecast_v510.reporting_heads r on a.ok and r.session_id=$2 and r.game_id=g->>'id'
order by ord`;
export async function readSessionBoard(query,{sessionId,userId}){
 requireScope(sessionId,'G0000');
 const rows=(await query(SESSION_BOARD_SQL,[userId,sessionId])).rows;
 if(!rows[0]?.ok)throw Error('CHAIRMAN_FORBIDDEN');
 const version=Number(rows[0].state_version),generatedAt=new Date(rows[0].committed_at).toISOString();
 if(rows[0].state_version==null||!Number.isSafeInteger(version)||version<0||rows.length>56||rows.some(r=>!r.id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('BOARD_SOURCE_UNAVAILABLE');
 const games=rows.map(r=>{
  requireScope(sessionId,r.id);
  if(!['UNLAUNCHED','ACTIVE','DELAY','EDIT','FINAL_PENDING','LOCKED','FINAL','READY'].includes(r.lifecycle)||!r.run_id||!['AVAILABLE','BLOCKED','NOT_STARTED'].includes(r.availability?.status))throw Error('BOARD_SOURCE_UNAVAILABLE');
  const game={id:r.id,runId:r.run_id,lifecycle:r.lifecycle,away:r.away,home:r.home,awayRecord:r.away_record,homeRecord:r.home_record,network:r.network,kickoffZulu:r.kickoff_zulu,week:r.week,availability:r.availability};
  if(r.availability.status==='AVAILABLE'){
   if(!r.scoreboard||!Array.isArray(r.team_statistics)||r.team_statistics.length!==2)throw Error('BOARD_SOURCE_UNAVAILABLE');
   game.scoreboard=r.scoreboard;game.teamStatistics=r.team_statistics;
  }
  return game;
 });
 return {contractVersion:SESSION_BOARD_CONTRACT,sessionId,stateVersion:version,generatedAt,games};
}
