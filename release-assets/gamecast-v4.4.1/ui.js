// Chairman-only Dead-Man controls. Countdown renders server time; it never starts a game.
let dmLastSync=0;
const dmSelected=new Set();
function dmConfigFields(prefix,g){
  const d=g?.deadman||{};
  return '<label>TRIGGER<select id="'+prefix+'-basis"><option value="KICKOFF_PLUS">KICKOFF +</option><option value="KICKOFF">KICKOFF</option><option value="TV_START">TV START (UTC)</option></select></label>'+
    '<label>OFFSET MIN<input id="'+prefix+'-offset" type="number" min="0" max="180" step="1" value="'+(d.offsetMinutes||15)+'"></label>'+
    '<label>TV START UTC (TV mode only)<input id="'+prefix+'-tv" type="datetime-local" step="1" value="'+esc((d.tvStartZulu||'').slice(0,19))+'"></label>';
}
function dmCard(g){
  if(publicView)return '';
  const d=g.deadman||{status:'UNARMED'},armed=['ARMED','BLOCKED'].includes(d.status),eligible=g.lifecycle==='UNLAUNCHED';
  const label=d.status==='AUTONOMOUS'&&d.controlOwner==='CHAIRMAN'?'CHAIRMAN CONTROL - AUTONOMOUS START RECORDED':d.status;
  const pick=eligible?'<label class="dm-pick"><input type="checkbox" '+(dmSelected.has(g.id)?'checked ':'')+'onchange="dmSelect(\''+g.id+'\',this.checked)">SELECT</label>':'';
  let html='<section class="dm-box operator-only"><div class="dm-title">'+pick+'<b>DEAD-MAN: '+esc(label)+'</b></div>';
  if(d.dueZulu)html+='<div class="dm-info">'+esc(d.basis)+(d.basis==='KICKOFF_PLUS'?' '+d.offsetMinutes+' MIN':'')+' | '+esc(d.dueZulu)+'</div>';
  if(d.status==='ARMED')html+='<div class="dm-count" data-dm-due="'+esc(d.dueZulu)+'">ARMED - WAITING FOR CLOUD</div>';
  if(d.triggeredAtZulu)html+='<div class="dm-info">Started '+esc(d.triggeredAtZulu)+' | existing AUTO engine</div>';
  if(d.reason)html+='<div class="dm-info">'+esc(d.reason)+'</div>';
  if(eligible)html+='<details><summary>'+(armed?'CHANGE ARM':'ARM FALLBACK')+'</summary><div class="dm-settings">'+dmConfigFields('dm-'+g.id,g)+'<button onclick="dmArmOne(\''+g.id+'\')">ARM / RE-ARM</button></div><div class="dm-info">Kickoff: '+esc(g.kickoff)+' ET / '+esc(g.kickoffZulu||'UNAVAILABLE')+'. TV start must be entered explicitly; no TV time is inferred.</div></details>';
  if(armed)html+='<button class="warn" onclick="dmDisarm([\''+g.id+'\'])">DISARM FALLBACK</button>';
  return html+'</section>';
}
function dmSelect(id,on){if(on)dmSelected.add(id);else dmSelected.delete(id);dmCount();}
function dmCount(){const x=document.getElementById('dm-count');if(x)x.textContent=dmSelected.size+' selected';}
function dmSelectVisible(){for(const g of state.filter(visible))if(g.lifecycle==='UNLAUNCHED')dmSelected.add(g.id);render();dmCount();}
function dmClear(){dmSelected.clear();render();dmCount();}
function dmGetConfig(prefix){
  const basis=document.getElementById(prefix+'-basis').value,offsetMinutes=Number(document.getElementById(prefix+'-offset').value);
  const input=document.getElementById(prefix+'-tv').value;
  const tvStartZulu=input?input+(input.length===16?':00Z':'Z'):null;
  if(!Number.isInteger(offsetMinutes)||offsetMinutes<0||offsetMinutes>180)throw Error('Offset must be an integer from 0 to 180 minutes');
  if(basis==='TV_START'&&(!tvStartZulu||!Number.isFinite(Date.parse(tvStartZulu))))throw Error('Enter an authorized TV start in UTC');
  return {basis,offsetMinutes,tvStartZulu};
}
function dmPreview(ids,config){
  if(!ids.length)throw Error('Select at least one game');
  return ids.map(id=>{
    const g=state.find(x=>x.id===id);if(!g||g.lifecycle!=='UNLAUNCHED')throw Error(id+' is no longer unlaunched');
    const base=Date.parse(config.basis==='TV_START'?config.tvStartZulu:g.kickoffZulu),minutes=config.basis==='KICKOFF_PLUS'?config.offsetMinutes:0;
    if(!Number.isFinite(base))throw Error(id+': kickoff UTC unavailable');
    const due=new Date(base+minutes*60000).toISOString();
    return id+' '+g.away.name+' at '+g.home.name+' -> '+due;
  }).join('\n');
}
async function dmWrite(ids,operation,config){
  if(publicView||writing)return;
  if(writeConflict){status('VERSION CONFLICT - REFRESH before changing Dead-Man',true);return;}
  writing=true;readEpoch++;
  try{
    status('SAVING DEAD-MAN');
    const b=await api('deadman_batch',{ids,operation,config,expected_version:version});
    adopt(b);render();dmCount();status('DEAD-MAN '+operation.toUpperCase()+' SAVED - '+ids.length+' GAME(S)');
  }catch(e){
    if(e.status===409){writeConflict=true;status('VERSION CONFLICT - REFRESH and review the latest arm',true);}
    else status('DEAD-MAN '+e.message,true);
  }finally{writing=false;}
}
function dmArmOne(id){
  try{const config=dmGetConfig('dm-'+id);if(confirm('Authorize Dead-Man AUTO at 1x?\n'+dmPreview([id],config)))dmWrite([id],'arm',config);}
  catch(e){status(e.message,true);}
}
function dmArmSelected(){
  try{const ids=[...dmSelected],config=dmGetConfig('dm-bulk');if(confirm('ARM '+ids.length+' SELECTED GAMES?\nUnselected games remain unchanged.\n'+dmPreview(ids,config)))dmWrite(ids,'arm',config);}
  catch(e){status(e.message,true);}
}
function dmDisarm(ids){if(ids.length&&confirm('Disarm Dead-Man for '+ids.length+' selected game(s)?'))dmWrite(ids,'disarm',null);}
function dmClock(){
  const stale=!dmLastSync||Date.now()-dmLastSync>30000,ms=masterEpoch+Date.now()-masterAnchor;
  for(const x of document.querySelectorAll('[data-dm-due]')){
    if(stale){x.textContent='SYNC STALE - TRIGGER STATUS UNKNOWN';continue;}
    const secs=Math.ceil((Date.parse(x.dataset.dmDue)-ms)/1000);
    x.textContent=secs>0?'AUTONOMOUS IN '+gl(secs):'TRIGGER DUE - AWAITING CLOUD CONFIRMATION';
  }
}
setTimeout(()=>{
  if(publicView)return;
  const x=document.getElementById('dmToolbar');
  if(x)x.innerHTML='<details class="dm-box"><summary>DEAD-MAN: SELECTIVE / BULK ARMING</summary><div class="dm-settings">'+dmConfigFields('dm-bulk')+'</div><div class="dm-actions"><button onclick="dmSelectVisible()">SELECT VISIBLE UNLAUNCHED</button><button onclick="dmClear()">CLEAR SELECTION</button><button onclick="dmArmSelected()">ARM SELECTED</button><button onclick="dmDisarm([...dmSelected])">DISARM SELECTED</button><span id="dm-count">0 selected</span></div><p class="dm-info">Only selected games are changed. Every fresh game starts UNARMED. The cloud scheduler works with this browser closed. TV start is a Chairman-supplied UTC trigger, not a replacement kickoff.</p></details>';
  setInterval(dmClock,1000);
},0);
