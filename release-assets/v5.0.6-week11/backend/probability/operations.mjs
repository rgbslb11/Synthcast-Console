import {SecurityError} from '../security/security-core.mjs';
import {observe,setPregame,OVERRIDES} from './history.mjs';

/** Detach analytics before every football operation. It cannot become a football input. */
export function withProbability(operations,{clock}){
 async function perform(draft,body,command){
  const histories=new Map(draft.state.map(g=>[g.id,g.winProbability]));
  for(const g of draft.state)delete g.winProbability;
  let result;
  try{result=await operations[command?'executeCommand':'advance'](draft,body);}
  finally{for(const g of draft.state)if(histories.get(g.id))g.winProbability=histories.get(g.id);}
  const stamp=clock();
  for(const g of draft.state){
   const targeted=command&&g.id===body.id;
   const record=observe(draft,g,{stamp,trigger:targeted?body.command:'poll',
    forceBlock:targeted&&OVERRIDES.has(body.command)?'CHAIRMAN_OVERRIDE':null});
   if(record)result.events.push({type:'V506_WP_OBSERVATION',gameId:g.id,payload:g.winProbability.records.at(-1)});
  }
  return result;
 }
 return {
  advance:(draft,body)=>perform(draft,body,false),
  executeCommand:async(draft,body)=>{
   if(body.command!=='wp_pregame')return perform(draft,body,true);
   const g=draft.state.find(g=>g.id===body.id);if(!g)throw new SecurityError('GAME_NOT_FOUND',404);
   try{setPregame(draft,g,body.payload,clock());}catch(e){throw new SecurityError(e.message,409);}
   return {events:[{type:'V506_WP_PREGAME',gameId:g.id,payload:g.winProbability.records.at(-1)}]};
  }
 };
}
