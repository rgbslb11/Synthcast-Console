import {sha256,SecurityError} from '../security/security-core.mjs';

// Tokens are opaque witnesses, never authority to bypass Auth or database CAS.
// Control actions act on the latest football instant but must not undo another
// operator's control change. Corrections require the complete frozen state.
const controls=['id','runId','lifecycle','auto','onAir','operatorPaused','delayed',
  'editing','locked','deadman','weather','quarterLengthSeconds','editResume'];
export function controlToken(game){return sha256(Object.fromEntries(controls.map(k=>[k,game[k]])));}
export function editToken(game){const copy={...game};delete copy.glSeconds;return sha256(copy);}
const strict=new Set(['edit_commit','edit_cancel','clock_set','score']);
export function checkCommandPreconditions(session,body){
  const ids=body.command==='deadman_batch'?body.payload?.ids:[body.id];
  if(!Array.isArray(ids)||!ids.length)throw new SecurityError('GAME_PRECONDITION_REQUIRED',400);
  for(const id of ids){
    const game=session.state.find(g=>g.id===id),token=body.game_tokens?.[id];
    if(!game)throw new SecurityError('GAME_NOT_FOUND',404);
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new SecurityError('GAME_PRECONDITION_REQUIRED',400);
    if(token!==(strict.has(body.command)?editToken(game):controlToken(game)))throw new SecurityError('GAME_STATE_CHANGED',409);
  }
}
export function withTokens(source,rendered){return {...rendered,control_token:controlToken(source),edit_token:editToken(source)};}
