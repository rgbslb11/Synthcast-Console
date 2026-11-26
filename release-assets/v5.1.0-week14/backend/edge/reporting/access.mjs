// Server-only policy. identity/session/audit must come from trusted backend adapters.
export class AccessError extends Error {constructor(code,status=403){super(code);this.code=code;this.status=status;}}
export function requireChairman(identity,sessionId){
 if(!identity?.authenticated)throw new AccessError('AUTHENTICATION_REQUIRED',401);
 if(identity.role!=='CHAIRMAN'||identity.active!==true||!Array.isArray(identity.authorizedSessionIds)||!identity.authorizedSessionIds.includes(sessionId))throw new AccessError('CHAIRMAN_FORBIDDEN');
}
export const corrections=new Set(['score','clock_set','edit_commit','end','reopen_live']);
const knownCommands=new Set(['create','launch','advance','quarter_length','weather_set','auto','on_air','speed','pause','delay','resume_delay','restart_same_seed','deadman_arm','deadman_disarm','deadman_launch','score','clock_set','edit_begin','edit_cancel','edit_commit','end','lock','unlock','accept','reopen_live','purge_new_seed']);
export function availability(game,audit,stateVersion){
 const blocked=reason=>({status:'BLOCKED',reason});
 if(!Number.isSafeInteger(stateVersion)||stateVersion<0||typeof game.runId!=='string'||!game.runId)return blocked('VERIFICATION_UNAVAILABLE');
 if(!audit||audit.complete!==true||audit.sessionId!==game.sessionId||audit.gameId!==game.id||audit.throughStateVersion!==stateVersion||!Array.isArray(audit.commands))return blocked('VERIFICATION_UNAVAILABLE');
 if(audit.commands.some(e=>!e||!Number.isSafeInteger(e.stateVersion)||e.stateVersion<0||e.stateVersion>stateVersion||!knownCommands.has(e.command)))return blocked('VERIFICATION_UNAVAILABLE');
 if(audit.commands.some(e=>corrections.has(e.command)))return blocked('CHAIRMAN_CORRECTION');
 if(game.editing===true||game.lifecycle==='EDIT')return blocked('CHAIRMAN_EDIT_OPEN');
 if(game.lifecycle==='UNLAUNCHED')return {status:'NOT_STARTED',reason:'NOT_LAUNCHED'};
 return {status:'AVAILABLE',reason:null};
}
