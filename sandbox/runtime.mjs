import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {createHash, randomUUID} from 'node:crypto';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week4-v4-3-1/power.ts';

export const ENGINE='GC-W4-V4.3.1-RC1-SANDBOX';
export const PREFIX='qa-w4v431-';
export const SOURCE=new URL('../supabase/functions/gamecast-week4-v4-3-1/index.ts',import.meta.url);
export const sourceHash=createHash('sha256').update(fs.readFileSync(SOURCE)).digest('hex');
if(sourceHash!=='33fecdd438ea497458a878dc437ff0c7dfb3dbc64810b154370b3a45ec31fdcf')throw Error('Baseline source hash mismatch');
for(const [name,expected] of [['week4.ts','13cfad6038c0fb7400aaa13ee020462b58754f2e7e9591dc6145df8412e58a22'],['power.ts','f0609f8715c691f256f6bc4234eee08664099d69a146a4e47f4b702218762b94']]){
 if(createHash('sha256').update(fs.readFileSync(new URL(name,SOURCE))).digest('hex')!==expected)throw Error('Baseline input hash mismatch: '+name);
}
const copy=x=>structuredClone(x);
const mark=state=>state.map(g=>({...g,qaOnly:true,environment:'SANDBOX',official:false}));

// This is a local test double of the observed RPC interface, NOT a reconstruction of database DDL.
export function createRuntime({file,clock=Date,baseline=false}={}){
  let db={qaOnly:true,environment:'SANDBOX',sessions:{},events:[]};
  if(file&&fs.existsSync(file))db=JSON.parse(fs.readFileSync(file,'utf8'));
  if(db.qaOnly!==true||db.environment!=='SANDBOX')throw Error('Refusing non-sandbox persistence');
  for(const [slug,s] of Object.entries(db.sessions))if(!slug.startsWith(PREFIX)||s.qaOnly!==true||s.engine_version!==ENGINE)throw Error('Foreign session rejected');
  const stamp=()=>new clock().toISOString();
  const persist=()=>{if(file){fs.mkdirSync(new URL('.',file),{recursive:true});fs.writeFileSync(new URL(file.href+'.tmp'),JSON.stringify(db),{mode:0o600});fs.renameSync(new URL(file.href+'.tmp'),file);}};
  const rpc=async(name,p)=>{
    let data;
    if(name==='gamecast_v12_create_session'){
      if(!p.p_public_slug.startsWith(PREFIX)||p.p_engine_version!==ENGINE)throw Error('Foreign identity rejected');
      if(db.sessions[p.p_public_slug])throw Error('Duplicate session');
      const row={qaOnly:true,environment:'SANDBOX',session_id:'qa-'+randomUUID(),public_slug:p.p_public_slug,operator_token_hash:p.p_operator_token_hash,week_key:p.p_week_key,engine_version:p.p_engine_version,data_version:p.p_data_version,state_version:1,state:mark(copy(p.p_state)),last_advanced_at:stamp()};
      db.sessions[row.public_slug]=row;persist();
      data=[{session_id:row.session_id,public_slug:row.public_slug,state_version:row.state_version}];
    }else if(name==='gamecast_v12_read_session'){
      if(!p.p_slug.startsWith(PREFIX))throw Error('Foreign namespace rejected');
      data=db.sessions[p.p_slug]?[copy(db.sessions[p.p_slug])]:[];
    }else if(name==='gamecast_v12_update_session'){
      const row=Object.values(db.sessions).find(s=>s.session_id===p.p_session_id);
      if(!row||!row.public_slug.startsWith(PREFIX))throw Error('Foreign session rejected');
      if(row.state_version!==p.p_expected_version)return {data:null,error:Error('version mismatch')};
      if(p.p_state.some(g=>['READY','FINAL','SEUD PUBLISHED'].includes(g.lifecycle)))throw Error('Official promotion rejected');
      row.state=mark(copy(p.p_state));row.state_version++;row.last_advanced_at=p.p_stamp;persist();data=[copy(row)];
    }else if(name==='gamecast_v12_insert_event'){
      if(!Object.values(db.sessions).some(s=>s.session_id===p.p_session_id))throw Error('Foreign event rejected');
      db.events.push({...copy(p),qaOnly:true,environment:'SANDBOX'});persist();data=[];
    }else throw Error('Unrecognized RPC rejected');
    return {data,error:null};
  };
  let handler;
  const context=vm.createContext({console,crypto:globalThis.crypto,structuredClone,TextEncoder,Date:clock,Response,Request,URL,OPERATING_SLATE:copy(OPERATING_SLATE),TEAM_POWER:copy(TEAM_POWER),createClient:()=>({rpc}),Deno:{env:{get:()=>undefined},serve:fn=>{handler=fn;}}},{codeGeneration:{strings:false,wasm:false}});
  let src=fs.readFileSync(SOURCE,'utf8').replace(/^import .*;\s*$/gm,'');
  if(!baseline)src=src.replaceAll('GC-W4-V4.3.1-RC1',ENGINE).replaceAll('w4v431-',PREFIX).replace('https://rgbslb11.github.io/Synthcast-Console/v4.3.1/','/sandbox/').replace('`${id}-R${','`QA-${id}-R${');
  src+='\nglobalThis.inspection={initialGame,seedWords,advanceGame,project,reset,advancePeriod,beginEdit,cancelEdit,finishGame,total,validScorePeriod};';
  vm.runInContext(stripTypeScriptTypes(src),context,{timeout:5000});
  const allowed=new Set(['quarter_length','launch','auto','on_air','speed','pause','delay','resume_delay','score','clock_set','edit_begin','edit_cancel','edit_commit','end','lock','unlock','reopen_live','restart_same_seed','purge_new_seed']);
  const response=(error,status=403)=>new Response(JSON.stringify({error,qaOnly:true,official:false}),{status,headers:{'content-type':'application/json'}});
  async function dispatch(req){
    const u=new URL(req.url),action=u.searchParams.get('api'),slug=u.searchParams.get('session')||'';
    if(u.pathname!=='/sandbox/api')return response('Sandbox API path required',404);
    if(!['create','read','command'].includes(action))return response('Official acceptance, publication, feeds and ratings writes disabled');
    if((action==='read'&&req.method!=='GET')||(action!=='read'&&req.method!=='POST'))return response('Method rejected',405);
    if(slug&&!/^qa-w4v431-[a-f0-9]{16}$/.test(slug))return response('Foreign session namespace rejected');
    if(action==='command'){
      let body;try{body=await req.clone().json();}catch{return response('Invalid JSON',400);}
      if(!allowed.has(body.command))return response('Command disabled in sandbox');
    }
    const result=await handler(req),body=await result.json();
    // Never return persistence internals, even when a test double returns an entire row.
    delete body.operator_token_hash;delete body.session_id;
    return new Response(JSON.stringify({...body,qaOnly:true,environment:'SANDBOX',official:false,publicationAllowed:false,standingsEligible:false,ratingsEligible:false}),{status:result.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }
  let queue=Promise.resolve();
  return {handle(req){const work=queue.then(()=>dispatch(req));queue=work.catch(()=>{});return work;},inspect:context.inspection,snapshot:()=>copy(db),networkCapabilities:vm.runInContext('[typeof fetch,typeof WebSocket,typeof process,typeof require]',context)};
}
