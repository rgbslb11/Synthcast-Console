import {requireScope} from '../delivery/projection.mjs';
import {compactView} from './observer.mjs';
export const WP_BOARD_CONTRACT='GC-WP-BOARD-1';
export function validateBoardGames(sessionId,gameIds){
 if(!Array.isArray(gameIds)||gameIds.length<1||gameIds.length>56||new Set(gameIds).size!==gameIds.length)throw Error('INVALID_BOARD_GAMES');
 for(const id of gameIds)requireScope(sessionId,id);
}
export async function readWpBoard(query,{sessionId,gameIds,userId}){
 validateBoardGames(sessionId,gameIds);
 const rows=(await query(`with access as materialized (select gamecast_v510.authorize_reporting($1::uuid,$2::text) ok)
 select a.ok,g.game_id,h.state,s.state_version,p.source_version
 from access a cross join unnest($3::text[]) with ordinality g(game_id,ord)
 left join gamecast_v510.wp_heads h on a.ok and h.session_id=$2 and h.game_id=g.game_id
 left join gamecast_v510.source_heads s on a.ok and s.session_id=$2
 left join gamecast_v510.wp_progress p on a.ok and p.session_id=$2
 order by g.ord`,[userId,sessionId,gameIds])).rows;
 if(!rows[0]?.ok)throw Error('CHAIRMAN_FORBIDDEN');
 const sourceVersion=rows[0].state_version==null?null:Number(rows[0].state_version);
 const wpVersion=rows[0].source_version==null?null:Number(rows[0].source_version);
 const pending=sourceVersion===null||wpVersion===null||sourceVersion!==wpVersion;
 return {contractVersion:WP_BOARD_CONTRACT,sessionId,sourceVersion,wpVersion,games:rows.map(r=>{
  const summary=compactView(r.state);
  return {gameId:r.game_id,summary:pending?{...summary,status:'BLOCKED',reason:'WP_SOURCE_PENDING',probability:null,color:'#808080'}:summary};
 })};
}

