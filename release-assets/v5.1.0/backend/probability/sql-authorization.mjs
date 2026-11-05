// Uses the same database grant function as the reporting gateway.
// No cached permissions: both handler and snapshot recheck current grants.
export function createWpSqlAuthorization(query){
 return async (user,sessionId)=>{
  const row=(await query('select gamecast_v510.authorize_reporting($1::uuid,$2::text) ok',[user.id,sessionId])).rows[0];
  const active=row?.ok===true;
  return {authenticated:true,userId:user.id,active,role:active?'CHAIRMAN':null,authorizedSessionIds:active?[sessionId]:[]};
 };
}
