const weatherDrafts=new Map();
const sameWeather=(a,b)=>!!a&&!!b&&a.enabled===b.enabled&&a.wind===b.wind&&a.rain===b.rain&&a.temperature===b.temperature;
function weatherValues(id){
  const value=s=>document.getElementById('wx-'+id+'-'+s)?.value;
  const live={enabled:value('enabled')==='true',wind:value('wind'),rain:value('rain'),temperature:value('temperature')};
  if(live.wind&&live.rain&&live.temperature)return live;
  const saved=weatherDrafts.get(id)||state.find(g=>g.id===id)?.weather||{};
  return {enabled:saved.enabled===true,wind:saved.wind||'NONE',rain:saved.rain||'NONE',temperature:saved.temperature||'INACTIVE'};
}
function weatherChanged(id){weatherDrafts.set(id,weatherValues(id));}
function weatherCard(g){
  const persisted=g.weather||{enabled:false,wind:'NONE',rain:'NONE',temperature:'INACTIVE',locked:false};
  const draft=!publicView&&g.lifecycle==='UNLAUNCHED'&&!persisted.locked?weatherDrafts.get(g.id):null,w=draft||persisted,dirty=!!draft&&!sameWeather(draft,persisted);
  const summary=(w.enabled?'ON · WIND '+w.wind+' · RAIN '+w.rain:'OFF')+(w.temperature!=='INACTIVE'?' · TEMP '+w.temperature.replace('_',' ')+' (DISPLAY ONLY)':'');
  if(publicView||g.immutableFinal||g.lifecycle!=='UNLAUNCHED'||w.locked)return '<section class="wx-box readonly"><div class="wx-title"><b>WEATHER: '+esc(summary)+'</b><span>'+(w.locked?'LOCKED':'READ ONLY')+'</span></div></section>';
  const options=(values,current)=>values.map(x=>'<option '+(x===current?'selected ':'')+'value="'+x+'">'+x.replace('_',' ')+'</option>').join('');
  return '<section class="wx-box operator-only"><div class="wx-title"><b>WEATHER: '+esc(summary)+'</b><span>'+(dirty?'UNSAVED · ':'')+'PRE-LAUNCH</span></div><details><summary>CONFIGURE WEATHER</summary><div class="wx-settings"><label>MODEL<select id="wx-'+g.id+'-enabled" onchange="weatherChanged(\''+g.id+'\')"><option value="false" '+(!w.enabled?'selected':'')+'>OFF</option><option value="true" '+(w.enabled?'selected':'')+'>ON</option></select></label><label>WIND<select id="wx-'+g.id+'-wind" onchange="weatherChanged(\''+g.id+'\')">'+options(['NONE','LIGHT','BREEZY','STRONG'],w.wind)+'</select></label><label>RAIN<select id="wx-'+g.id+'-rain" onchange="weatherChanged(\''+g.id+'\')">'+options(['NONE','LIGHT','STEADY','HEAVY'],w.rain)+'</select></label><label>TEMPERATURE (DISPLAY ONLY)<select id="wx-'+g.id+'-temperature" onchange="weatherChanged(\''+g.id+'\')">'+options(['INACTIVE','VERY_COLD','VERY_HOT'],w.temperature)+'</select></label><button onclick="weatherSave(\''+g.id+'\')">SAVE WEATHER</button></div><div class="wx-info">Launch saves these visible values and locks Weather. Temperature is visible but inactive in the model.</div></details></section>';
}
function weatherSave(id){
  cmd(id,'weather_set',weatherValues(id));
}
function launchGame(id){cmd(id,'launch',{weather:weatherValues(id)});}
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
  if(publicView||g.immutableFinal)return '';
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
function dmSyncStatus(oldCard,newCard){
  const old=oldCard.querySelector('.dm-box'),fresh=newCard.querySelector('.dm-box');
  if(!old||!fresh)return;
  // Update server-owned status only; keep the actual open editor and its inputs.
  const oldTitle=old.querySelector('.dm-title b'),newTitle=fresh.querySelector('.dm-title b');
  if(oldTitle&&newTitle&&oldTitle.textContent!==newTitle.textContent)oldTitle.textContent=newTitle.textContent;
  if(!fresh.querySelector('.dm-pick'))old.querySelector('.dm-pick')?.remove();
  const oldDetails=old.querySelector('details'),newDetails=fresh.querySelector('details');
  if(oldDetails&&newDetails)oldDetails.querySelector('summary').textContent=newDetails.querySelector('summary').textContent;
  const statusNodes=box=>[...box.children].filter(el=>el.tagName!=='DETAILS'&&!el.classList.contains('dm-title'));
  const prior=statusNodes(old),next=statusNodes(fresh);
  if(prior.map(el=>el.outerHTML).join('')!==next.map(el=>el.outerHTML).join('')){
    prior.forEach(el=>el.remove());
    for(const el of next){
      const beforeEditor=newDetails&&!!(el.compareDocumentPosition(newDetails)&Node.DOCUMENT_POSITION_FOLLOWING);
      old.insertBefore(el.cloneNode(true),beforeEditor?oldDetails:null);
    }
  }
  if(oldDetails&&!newDetails)oldDetails.remove();
  dmClock();
}
function dmSelect(id,on){if(on)dmSelected.add(id);else dmSelected.delete(id);dmCount();}
function dmCount(){const x=document.getElementById('dm-count');if(x)x.textContent=dmSelected.size+' selected';}
function dmSelectVisible(){for(const g of state.filter(visible))if(g.lifecycle==='UNLAUNCHED'&&!g.immutableFinal)dmSelected.add(g.id);render();dmCount();}
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
    else {status('DEAD-MAN '+e.message+' · RETRY LAST REQUEST',true);document.getElementById('retryRequest').hidden=!gamecastPendingRequest();}
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

'use strict';
const CHAIRMAN_POLL_MS=5000,PUBLIC_POLL_MS=4000;
const API=globalThis.GAMECAST_V500_CONFIG,STORE='synthcastGameCast500Session',qs=new URLSearchParams(location.search);let slug=qs.get('session')||'',game=qs.get('game')||'',token='',publicView=qs.get('view')==='public',state=[],version=0,filter='ALL',loading=false,engine='GC-W7-V5.0.0-RC1',masterEpoch=Date.now(),masterAnchor=Date.now();const root=document.getElementById('root');if(publicView){token='';document.querySelectorAll('.operator-only').forEach(el=>el.remove());root.classList.add('public');document.body.classList.add('public');document.getElementById('modeLabel').textContent='PUBLIC LIVE SCOREBOARD';document.querySelector('.public-only').hidden=false}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const validPeriod=k=>['1','2','3','4','OT'].includes(k)||/^(?:[2-9]|[1-9][0-9]+)OT$/.test(k),total=(g,t)=>Object.entries(g.scores||{}).reduce((s,[k,q])=>validPeriod(k)?s+Number((q||[])[t]||0):s,0),clk=s=>String(Math.floor(Math.max(0,s||0)/60)).padStart(2,'0')+':'+String(Math.floor(Math.max(0,s||0)%60)).padStart(2,'0'),gl=s=>Math.floor((s||0)/3600)+':'+String(Math.floor(((s||0)%3600)/60)).padStart(2,'0')+':'+String(Math.floor((s||0)%60)).padStart(2,'0');function anchorMaster(x){dmLastSync=Date.now();const n=Date.parse(x||'');if(Number.isFinite(n)){masterEpoch=n;masterAnchor=Date.now()}}function z(ms,zone,force=''){const p=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZoneName:'short'}).formatToParts(new Date(ms)),v=t=>p.find(x=>x.type===t)?.value||'';return v('hour')+':'+v('minute')+':'+v('second')+' '+(force||v('timeZoneName'))}function tick(){const ms=masterEpoch+Date.now()-masterAnchor,d=new Date(ms);document.getElementById('tz-z').textContent=d.toISOString().slice(11,19)+'Z';document.getElementById('tz-c').textContent=z(ms,'America/Chicago');document.getElementById('tz-e').textContent=z(ms,'America/New_York');document.getElementById('tz-m').textContent=z(ms,'America/Denver');document.getElementById('tz-ms').textContent=z(ms,'America/Phoenix','MST');document.getElementById('tz-p').textContent=z(ms,'America/Los_Angeles');document.getElementById('tz-h').textContent=z(ms,'Pacific/Honolulu','HST')}
async function api(a,b){
  const operator=!publicView;
  if(a==='power')throw new Error('Approved Week 7 ratings are frozen');
  if(a==='deadman_batch'){b={command:'deadman_batch',payload:{ids:b.ids,operation:b.operation,config:b.config},expected_version:b.expected_version};a='command';}
  return gamecastApi(a,b,{slug,operator});
}function se(){return document.getElementById(publicView?'statusPublic':'status')}function status(s,e=false){se().textContent=s;se().classList.toggle('error',e)}function periods(g){const b=['1','2','3','4'];return[...b,...Object.keys(g.scores||{}).filter(k=>!b.includes(k))]}function visible(g){if(!gc500wxTeamMatches(g,document.getElementById('teamSearch').value))return false;if(filter==='NEEDS_ACTION')return !publicView&&gc500wxNeedsAction(g);if(game)return g.id===game;if(filter==='ALL')return true;if(filter==='UPCOMING')return !publicView&&g.lifecycle==='UNLAUNCHED';if(filter==='LIVE')return['ACTIVE','DELAY','EDIT'].includes(g.lifecycle);if(filter==='POWER')return!!g.powerReady;if(filter==='PENDING')return!g.powerReady;if(filter==='FINAL')return['FINAL_PENDING','LOCKED','READY','FINAL'].includes(g.lifecycle);return true}function ds(g){if(g.displayStatus)return g.displayStatus;if(g.lifecycle==='DELAY'||g.delayed)return'DELAY';if(['FINAL_PENDING','LOCKED','READY','FINAL'].includes(g.lifecycle))return'FINAL';if(g.breakLabel==='HALFTIME')return'HALFTIME';if(g.breakLabel==='END 1ST'||g.breakLabel==='END 3RD')return g.breakLabel;if(String(g.period).includes('OT'))return g.period;return esc(g.period)+' · '+clk(g.scoreboardSeconds)}function line(g){const ps=periods(g),h=ps.map(p=>'<th>'+(['1','2','3','4'].includes(p)?'Q'+p:p)+'</th>').join('');return'<div class="line-wrap"><table class="line"><thead><tr><th>TEAM</th>'+h+'<th>T</th></tr></thead><tbody>'+[0,1].map(t=>'<tr><td>'+(g.possession===t&&['ACTIVE','DELAY'].includes(g.lifecycle)?'<span class="poss">●</span> ':'')+esc(t?g.home.name:g.away.name)+'</td>'+ps.map(p=>'<td>'+Number((g.scores[p]||[0,0])[t]||0)+'</td>').join('')+'<td>'+total(g,t)+'</td></tr>').join('')+'</tbody></table></div>'}function scoreBtns(g,t,l){return'<div class="score-row"><span>'+l+'</span>'+[1,2,3,6,7,8].map(p=>'<button onclick="cmd(\''+g.id+'\',\'score\',{team:'+t+',points:'+p+'})">+'+p+'</button>').join('')+'</div>'}function pre(g){return g.lifecycle==='UNLAUNCHED'?'<select onchange="cmd(\''+g.id+'\',\'quarter_length\',{seconds:+this.value})"><option value="600" '+(g.quarterLengthSeconds===600?'selected':'')+'>10:00 QTRS</option><option value="900" '+(g.quarterLengthSeconds===900?'selected':'')+'>15:00 QTRS</option></select><button class="primary" onclick="launchGame(\''+g.id+'\')">LAUNCH</button>':''}function liveCtl(g){if(g.lifecycle==='DELAY')return'<button class="primary" onclick="cmd(\''+g.id+'\',\'resume_delay\')">RESUME GAME</button><button onclick="beginEdit(\''+g.id+'\')">EDIT GAME</button>';if(g.lifecycle!=='ACTIVE')return'';return'<button class="primary" '+(!g.powerReady?'disabled':'')+' onclick="cmd(\''+g.id+'\',\'auto\')">'+(g.auto?'STOP AUTO':'START AUTO')+'</button><button onclick="cmd(\''+g.id+'\',\'on_air\')">'+(g.onAir?'END ON AIR':'ON AIR')+'</button><select '+(!g.auto?'disabled':'')+' onchange="cmd(\''+g.id+'\',\'speed\',{speed:+this.value})">'+[1,4,10,20,50].map(s=>'<option '+(g.speed===s?'selected':'')+'>'+s+'</option>').join('')+'</select><button onclick="cmd(\''+g.id+'\',\'pause\')">'+(g.operatorPaused?'RESUME':'PAUSE')+'</button><button class="warn" onclick="cmd(\''+g.id+'\',\'delay\')">DELAY</button><button onclick="beginEdit(\''+g.id+'\')">EDIT GAME</button><button onclick="setClock(\''+g.id+'\')">SET CLOCK</button><button onclick="confirmCmd(\''+g.id+'\',\'end\',\'Call this game FINAL?\')">CALL FINAL</button>'}function finalCtl(g){if(g.lifecycle==='FINAL_PENDING')return'<button onclick="beginEdit(\''+g.id+'\')">EDIT BOX SCORE</button><button class="primary" onclick="cmd(\''+g.id+'\',\'lock\')">LOCK RESULT</button>';if(g.lifecycle==='LOCKED')return'<button onclick="beginEdit(\''+g.id+'\',true)">EDIT BOX SCORE</button><button onclick="confirmCmd(\''+g.id+'\',\'unlock\',\'Unlock this certified result?\')">UNLOCK</button><button class="primary" onclick="confirmCmd(\''+g.id+'\',\'accept\',\'Accept this result as READY?\')">ACCEPT</button>';if(g.lifecycle==='READY'||g.lifecycle==='FINAL')return'<button onclick="beginEdit(\''+g.id+'\',true)">EDIT BOX SCORE</button><button onclick="reopen(\''+g.id+'\')">REOPEN LIVE</button>';return''}function edit(g){if(g.lifecycle!=='EDIT')return'';const ps=['1','2','3','4'],box='<div class="box-edit"><div></div>'+ps.map(p=>'<div class="eh">Q'+p+'</div>').join('')+'<b>'+esc(g.away.name)+'</b>'+ps.map(p=>'<input id="e-'+g.id+'-a'+p+'" type="number" min="0" max="99" value="'+Number((g.scores[p]||[0,0])[0]||0)+'">').join('')+'<b>'+esc(g.home.name)+'</b>'+ps.map(p=>'<input id="e-'+g.id+'-h'+p+'" type="number" min="0" max="99" value="'+Number((g.scores[p]||[0,0])[1]||0)+'">').join('')+'</div>',side=g.fieldPos>50?'OPP':'OWN',yl=g.fieldPos>50?100-g.fieldPos:g.fieldPos,live=(g.editResume||{}).lifecycle==='ACTIVE';return'<div class="edit-panel"><div class="admin-title">CHAIRMAN EDIT · GL CONTINUES · NO COMMENT REQUIRED</div>'+box+'<div class="edit-grid"><label>QUARTER<select id="e-'+g.id+'-q">'+[1,2,3,4].map(q=>'<option '+(g.quarter===q?'selected':'')+'>'+q+'</option>').join('')+'</select></label><label>CLOCK<input id="e-'+g.id+'-c" value="'+clk(g.scoreboardSeconds)+'"></label><label>POSSESSION<select id="e-'+g.id+'-p"><option value="0" '+(g.possession===0?'selected':'')+'>'+esc(g.away.name)+'</option><option value="1" '+(g.possession===1?'selected':'')+'>'+esc(g.home.name)+'</option></select></label><label>SIDE<select id="e-'+g.id+'-s"><option '+(side==='OWN'?'selected':'')+'>OWN</option><option '+(side==='OPP'?'selected':'')+'>OPP</option></select></label><label>YARD<input id="e-'+g.id+'-y" type="number" min="1" max="50" value="'+yl+'"></label><label>DOWN<input id="e-'+g.id+'-d" type="number" min="1" max="4" value="'+g.down+'"></label><label>DIST<input id="e-'+g.id+'-x" type="number" min="1" max="99" value="'+g.distance+'"></label><label>AWAY TO<input id="e-'+g.id+'-at" type="number" min="0" max="3" value="'+g.awayTimeouts+'"></label><label>HOME TO<input id="e-'+g.id+'-ht" type="number" min="0" max="3" value="'+g.homeTimeouts+'"></label></div><div class="edit-actions">'+(live?'<button class="primary" '+(!g.powerReady?'disabled':'')+' onclick="saveEdit(\''+g.id+'\',true)">SAVE & RESUME AUTO</button><button onclick="saveEdit(\''+g.id+'\',false)">SAVE & HOLD</button>':'<button class="primary" onclick="saveEdit(\''+g.id+'\',false)">SAVE CORRECTED FINAL</button>')+'<button onclick="cmd(\''+g.id+'\',\'edit_cancel\')">CANCEL</button></div></div>'}function admin(g){if(g.lifecycle==='EDIT')return'';return'<div class="admin operator-only"><div class="admin-title">CHAIRMAN · GAME CONTROL</div><div class="admin-row">'+(g.lifecycle!=='UNLAUNCHED'?'<button onclick="confirmCmd(\''+g.id+'\',\'restart_same_seed\',\'Restart same seed?\')">RESTART SAME SEED</button>':'')+'<button onclick="confirmCmd(\''+g.id+'\',\'purge_new_seed\',\'Purge run and create a new seed?\')">PURGE + NEW SEED</button><button onclick="openGame(\''+g.id+'\')">OPEN GAME</button></div></div>'}
function gc500wxSurfaceLinks(){const el=document.getElementById('links');if(!el||!slug)return;const s=encodeURIComponent(slug),base=location.origin+location.pathname,parts=[];if(publicView)parts.push('<a data-surface-nav="chairman" href="'+base+'?session='+s+'">CHAIRMAN CONSOLE</a>');parts.push('<a data-surface-nav="ui13" href="'+base+'ui1.3/?session='+s+'">UI 1.3 CONDENSED</a>');if(parts.length&&!el.querySelector('[data-surface-nav-wrap]'))el.insertAdjacentHTML('beforeend','<br><span data-surface-nav-wrap>'+parts.join(' · ')+'</span>')}function saveSession(){if(!publicView&&slug)localStorage.setItem(STORE,JSON.stringify({slug}))}function render(releaseId='',board=state){if(!publicView){document.getElementById('create').disabled=!!slug;document.getElementById('resume').disabled=!localStorage.getItem(STORE)}const allButton=document.querySelector('[data-f="ALL"]');if(allButton)allButton.textContent='ALL · '+board.length;const base=location.origin+location.pathname,ready=board.filter(g=>!g.immutableFinal&&g.powerReady).length;document.getElementById('links').innerHTML=slug?'SESSION '+esc(slug)+' · V'+version+' · '+esc(engine)+' · ACTIVE POWER '+ready+'/41'+(publicView?'':'<br><a href="'+base+'?session='+encodeURIComponent(slug)+'&view=public">PUBLIC LIVE SCOREBOARD</a>'):'';document.getElementById('singleNav').innerHTML=game?'<a href="'+base+'?session='+encodeURIComponent(slug)+(publicView?'&view=public':'')+'">← BACK</a> · '+esc(game):'';const gs=board.filter(visible).sort((a,b)=>a.kickoffOrder-b.kickoffOrder);const gridHTML=gs.length?gs.map(g=>{const ctl=publicView||g.immutableFinal?'':g.lifecycle==='EDIT'?edit(g):'<div class="controls">'+pre(g)+liveCtl(g)+finalCtl(g)+(['ACTIVE','DELAY'].includes(g.lifecycle)?scoreBtns(g,0,'AWAY')+scoreBtns(g,1,'HOME'):'')+'</div>'+admin(g),field=g.fieldPos<=50?'OWN '+g.fieldPos:'OPP '+(100-g.fieldPos),run=publicView?'':'<div class="run">RUN '+esc(g.runId)+' · '+(g.powerReady?'<span class="power-ready">POWER READY</span>':'<span class="power-pending">POWER PENDING</span>')+(g.continuationOf?' · CONTINUATION OF '+esc(g.continuationOf):'')+'</div>';return finalizeCard(g,'<article data-game="'+esc(g.id)+'" class="card '+(g.lifecycle==='ACTIVE'?'live ':'')+(g.lifecycle==='DELAY'?'delay ':'')+'"><div class="head"><span>'+esc(g.id)+' · '+esc(g.dateLabel)+' · '+esc(g.kickoff)+'</span><b>'+esc(g.network)+(g.flexTime?' · FLEX':'')+(g.carryover?' · W2 CARRYOVER':'')+' · '+esc(g.activity)+'</b></div><div class="teams"><div class="team"><span>'+esc(g.away.name)+'</span><span class="score">'+total(g,0)+'</span></div><div class="team"><span>'+esc(g.home.name)+'</span><span class="score">'+total(g,1)+'</span></div></div>'+line(g)+'<div class="meta"><span>'+esc(g.lifecycle)+'</span><span class="clock">'+ds(g)+'</span><span data-gl="'+esc(g.id)+'">GL '+gl(g.glSeconds)+'</span></div><div class="meta"><span class="field">'+(g.possession===0?esc(g.away.name):g.possession===1?esc(g.home.name):'Kickoff pending')+' · '+g.down+'&'+g.distance+' · '+field+'</span><span>TO '+g.awayTimeouts+' / '+g.homeTimeouts+'</span><span>'+esc(g.strategyMode||'NORMAL')+'</span></div><div class="meta"><span>'+esc(g.lastPlay||'')+'</span></div>'+run+ctl+weatherCard(g)+dmCard(g)+'</article>')}).join(''):'<div class="empty">No games in this view.</div>';syncGrid(gridHTML,releaseId,board);gc500wxSurfaceLinks()}
// Inherited Chairman interaction protection, isolated for GameCast 5.0.0 Weather RC W7.
let writing=false,readPromise=null,readEpoch=0,writeConflict=false;
function focusedControl(){
  const el=document.activeElement;
  return !publicView&&el?.id!=='teamSearch'&&el?.matches('input,select,textarea,[contenteditable="true"]')?el:null;
}
function interactionLocked(){
  return !publicView&&(!!document.querySelector('#grid .edit-panel')||!!focusedControl()||!!document.querySelector('#grid .dm-box details[open],#grid .wx-box details[open]'));
}
function editDraftLocked(){
  return !publicView&&!!document.querySelector('#grid .edit-panel');
}
function syncProtectedCard(oldCard,fresh){
  const focus=focusedControl();
  oldCard.className=fresh.className;
  // Match direct sections, including the repeated metadata rows, without moving
  // live editor nodes out of the document (which would lose focus on mobile).
  const sections=card=>{
    const counts=new Map();
    return new Map([...card.children].map(el=>{
      const kind=el.tagName+'.'+(el.classList[0]||''),n=counts.get(kind)||0;
      counts.set(kind,n+1);return [kind+':'+n,el];
    }));
  };
  const prior=sections(oldCard),next=sections(fresh);
  for(const [key,el] of next){
    const old=prior.get(key);
    if(old?.matches('.dm-box')){dmSyncStatus(oldCard,fresh);continue;}
    if(old?.matches('.edit-panel')||old?.contains(focus))continue;
    if(old?.matches('.wx-box')&&old.querySelector('details[open]')&&el.querySelector('details'))continue;
    if(old){if(old.outerHTML!==el.outerHTML)old.replaceWith(el.cloneNode(true));}
    else oldCard.insertBefore(el.cloneNode(true),oldCard.children[[...next.keys()].indexOf(key)]||null);
  }
  for(const [key,old] of prior)if(!next.has(key)&&!old.matches('.edit-panel'))old.remove();
}
function syncGrid(html,releaseId='',board=state){
  const grid=document.getElementById('grid'),template=document.createElement('template');
  template.innerHTML=html;
  const focus=focusedControl(),protectedCards=new Set();
  if(!publicView)for(const card of grid.querySelectorAll('[data-game]')){
    if(card.dataset.game!==releaseId&&(card.querySelector('.edit-panel')||card.contains(focus)||card.querySelector('.dm-box details[open],.wx-box details[open]')))protectedCards.add(card);
  }
  // Patch cards in place. Open controls remain attached and unchanged cards do not flicker.
  const wanted=new Set();
  for(const fresh of [...template.content.children]){
    const id=fresh.dataset.game;
    if(!id)continue;
    wanted.add(id);
    const old=[...grid.children].find(card=>card.dataset.game===id);
    if(old){if(protectedCards.has(old))syncProtectedCard(old,fresh);else if(old.outerHTML!==fresh.outerHTML)old.replaceWith(fresh)}else grid.append(fresh);
  }
  for(const old of [...grid.children])if(!wanted.has(old.dataset.game)){
    const g=board.find(x=>x.id===old.dataset.game);
    // An automatically launched game must leave Upcoming even if its arm panel was open.
    if(!protectedCards.has(old)||(filter==='UPCOMING'&&g&&g.lifecycle!=='UNLAUNCHED'))old.remove();
  }
}
function updateReadClocks(b){
  anchorMaster(b.master_zulu);
  // GL remains cloud-derived; never run a second local football simulation.
  for(const g of b.state||[]){
    const el=[...document.querySelectorAll('[data-gl]')].find(x=>x.dataset.gl===g.id);
    if(el)el.textContent='GL '+gl(g.glSeconds);
  }
}
function adopt(b){
  const next=b.state||[];
  for(const [id,draft] of weatherDrafts){const g=next.find(x=>x.id===id);if(!g||g.lifecycle!=='UNLAUNCHED'||g.weather?.locked||sameWeather(draft,g.weather))weatherDrafts.delete(id);}
  state=next;version=b.state_version??version;engine=b.engine_version||engine;
  anchorMaster(b.master_zulu);saveSession();
}
async function load({background=false,force=false}={}){
  if(!slug){status('NO SESSION');render();return}
  if(writing)return;
  if(readPromise){if(!force)return readPromise;await readPromise;if(writing)return}
  const epoch=readEpoch,session=slug;
  loading=true;
  if(!background)status('SYNCING');
  readPromise=(async()=>{
    try{
      const b=await api('read');
      if(epoch!==readEpoch||session!==slug)return;
      updateReadClocks(b);
      if(editDraftLocked()||writeConflict||(!publicView&&gamecastPendingRequest())){
        // Display current cloud state, but retain the original write version and drafts.
        render('',b.state||state);
        if(!background)status(writeConflict?'VERSION CONFLICT · Draft preserved · REFRESH to reload':'EDIT / INPUT PROTECTED · Cloud clocks updated',writeConflict);
        return;
      }
      adopt(b);render();
      if(!background||se().classList.contains('error'))status('CLOUD V'+version+' · POWER '+(b.governance?.power_ready??state.filter(g=>!g.immutableFinal&&g.powerReady).length)+'/'+(b.governance?.active_games??41));
    }catch(e){if(epoch===readEpoch&&session===slug)status('ERROR · '+e.message,true)}
  })();
  try{await readPromise}finally{readPromise=null;loading=false}
}
async function refresh(){
  if(writing)return;
  if(writeConflict){
    if(!confirm('Discard local drafts and reload the latest cloud state? No correction will be saved.'))return;
    // Explicit recovery only: never silently rebase a stale correction.
    if(readPromise)await readPromise;
    readEpoch++;writing=true;status('SYNCING');
    try{const b=await api('read');adopt(b);document.getElementById('grid').replaceChildren();writeConflict=false;render();status('CLOUD V'+version)}
    catch(e){status('ERROR · '+e.message,true)}finally{writing=false}
    return;
  }
  await load({force:true});
}
function editCheckpoint(g){
  if(!g)return'';
  const copy=structuredClone(g);delete copy.glSeconds;
  return JSON.stringify(copy);
}
async function cmd(id,command,payload={}){
  if(writing)return;
  if(writeConflict){status('VERSION CONFLICT · Draft preserved · REFRESH to reload',true);return}
  writing=true;readEpoch++;
  let readback=false,stateRefresh=false;
  const editBase=command==='edit_commit'?editCheckpoint(state.find(g=>g.id===id)):'';
  try{
    status('WRITING');
    let b;
    // The server scheduler advances the shared board every five seconds. Read
    // the current checkpoint immediately before a control write, then retry a
    // single clean version race. Failed version checks never mutate state.
    for(let attempt=0;attempt<2;attempt++){
      const checkpoint=await api('read'),expected=checkpoint.state_version??version;
      if(editBase&&editCheckpoint((checkpoint.state||[]).find(g=>g.id===id))!==editBase)throw Object.assign(Error('VERSION_CONFLICT'),{status:409});
      try{b=await api('command',{id,command,payload,expected_version:expected});break}
      catch(e){if(!(attempt===0&&e.status===409&&['VERSION_CONFLICT','version conflict'].includes(e.message)))throw e}
    }
    adopt(b);status('CHECKPOINTED V'+version);
    const closing=command==='edit_commit'||command==='edit_cancel';
    render(id);
    readback=closing;
  }catch(e){
    if(e.status===409&&['VERSION_CONFLICT','version conflict'].includes(e.message)){writeConflict=true;status('VERSION CONFLICT · Draft preserved · REFRESH to discard drafts and reload',true)}
    else if(e.status===409&&e.message==='COMMAND_UNAVAILABLE'){status('CONTROL NO LONGER AVAILABLE · REFRESHING CLOUD STATE',true);stateRefresh=true}
    else {const retry=gamecastPendingRequest();status('WRITE ERROR · '+e.message+(retry?' · RETRY LAST REQUEST':''),true);document.getElementById('retryRequest').hidden=!retry;}
  }finally{writing=false}
  if(readback||stateRefresh)await load({force:true});
}
function confirmCmd(id,c,m,p={}){if(confirm(m))cmd(id,c,{...p,confirmed:true})}function beginEdit(id,strong=false){if(strong&&!confirm('Supersede this locked/accepted result for correction?'))return;cmd(id,'edit_begin',strong?{confirmed:true}:{})}function reopen(id){confirmCmd(id,'reopen_live','Reopen this Final to live simulation? A continuation seed will be created.',{resumeAuto:false})}function parseClock(v){const m=String(v).match(/^(\d{1,2}):(\d{2})$/);return m?+m[1]*60+ +m[2]:NaN}function setClock(id){const g=state.find(x=>x.id===id),v=prompt('Set clock M:SS',clk(g.scoreboardSeconds));if(v==null)return;const s=parseClock(v);if(!Number.isFinite(s)||s<0||s>g.quarterLengthSeconds)return alert('Invalid clock');cmd(id,'clock_set',{seconds:s})}function saveEdit(id,resumeAuto){const scores={};for(const p of ['1','2','3','4'])scores[p]=[+document.getElementById('e-'+id+'-a'+p).value,+document.getElementById('e-'+id+'-h'+p).value];const c=parseClock(document.getElementById('e-'+id+'-c').value);if(!Number.isFinite(c))return alert('Clock must be M:SS');cmd(id,'edit_commit',{scores,quarter:+document.getElementById('e-'+id+'-q').value,clockSeconds:c,possession:+document.getElementById('e-'+id+'-p').value,ballSide:document.getElementById('e-'+id+'-s').value,yardline:+document.getElementById('e-'+id+'-y').value,down:+document.getElementById('e-'+id+'-d').value,distance:+document.getElementById('e-'+id+'-x').value,awayTimeouts:+document.getElementById('e-'+id+'-at').value,homeTimeouts:+document.getElementById('e-'+id+'-ht').value,resumeAuto,hold:!resumeAuto})}function openGame(id){location.href=location.origin+location.pathname+'?session='+encodeURIComponent(slug)+'&game='+id+(publicView?'&view=public':'')}function copy(u){navigator.clipboard?.writeText(u).catch(()=>prompt('Copy link',u))}async function loadPower(){
  if(writing)return;
  if(writeConflict){status('VERSION CONFLICT · Draft preserved · REFRESH to reload',true);return}
  writing=true;readEpoch++;
  try{
    status('WRITING');
    let x=JSON.parse(document.getElementById('powerJson').value),ratings={};
    if(Array.isArray(x)){for(const r of x)if(r?.team)ratings[r.team]=r}else ratings=x;
    const b=await api('power',{ratings,sourceVersion:document.getElementById('powerVersion').value||null,expected_version:version});
    adopt(b);status('POWER LOADED · '+(b.summary?.readyGames??0)+'/'+state.length);render();
  }catch(e){
    if(e.status===409&&['VERSION_CONFLICT','version conflict'].includes(e.message)){writeConflict=true;status('VERSION CONFLICT · Draft preserved · REFRESH to reload',true)}
    else status('POWER ERROR · '+e.message,true);
  }finally{writing=false}
}

async function purgeUiNewSession(){
  if(writing)return;
  if(!confirm('PURGE UI and start a brand-new Week 7 session? The prior cloud session will remain intact for audit.'))return;
  const prior={slug,token,state,version,game,filter};
  writing=true;readEpoch++;
  try{
    status('CREATING NEW SESSION');
    slug='';token='';game='';filter='ALL';writeConflict=false;
    const b=await api('create',{});
    slug=b.public_slug;token='';version=b.state_version||0;state=[];
    anchorMaster(b.master_zulu);
    history.replaceState(null,'',location.pathname+'?session='+slug);
    saveSession();adopt(b);render();
    status('NEW SESSION · POWER '+(b.governance?.power_ready??state.filter(g=>!g.immutableFinal&&g.powerReady).length)+'/'+(b.governance?.active_games??41));
  }catch(e){
    slug=prior.slug;token=prior.token;state=prior.state;version=prior.version;game=prior.game;filter=prior.filter;
    status('PURGE/NEW SESSION ERROR · '+e.message,true);
  }finally{writing=false}
}

if(!publicView){document.getElementById('create').onclick=async()=>{try{const b=await api('create',{});slug=b.public_slug;token='';version=b.state_version||0;anchorMaster(b.master_zulu);history.replaceState(null,'',location.pathname+'?session='+slug);saveSession();await load()}catch(e){status('CREATE ERROR · '+e.message,true)}};document.getElementById('resume').onclick=()=>{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s?.slug){slug=s.slug;token='';history.replaceState(null,'',location.pathname+'?session='+slug);load()}};document.getElementById('purgeUi').onclick=purgeUiNewSession;document.getElementById('refresh').onclick=refresh;document.getElementById('copyPublic').onclick=()=>copy(location.origin+location.pathname+'?session='+slug+'&view=public');document.getElementById('copyOperator').onclick=()=>copy(location.origin+location.pathname+'?session='+slug);document.getElementById('loadPower').onclick=loadPower}else document.getElementById('refreshPublic').onclick=refresh;document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;game='';document.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('active',x===b));render()});if(!publicView){const s=JSON.parse(localStorage.getItem(STORE)||'null');if(!slug&&s?.slug){slug=s.slug;token='';history.replaceState(null,'',location.pathname+'?session='+slug)}else if(slug&&s?.slug===slug){token=''}}document.getElementById('teamSearch').addEventListener('input',()=>render());tick();setInterval(tick,1000);if(publicView)load();setInterval(()=>{if(slug&&!loading&&!writing&&(publicView||gamecastSignedIn()))load({background:true})},publicView?PUBLIC_POLL_MS:CHAIRMAN_POLL_MS);
// Wait until focus has settled; a select change/click must dispatch before refresh.
document.addEventListener('focusout',()=>setTimeout(()=>{
  if(slug&&!interactionLocked()&&!writing&&!writeConflict)load({background:true});
},0));

function finalizeCard(g,html){if(!g.immutableFinal)return html;const t=document.createElement('template');t.innerHTML=html;const card=t.content.firstElementChild;card.querySelector('.field')?.closest('.meta').remove();card.querySelector('.run')?.remove();return card.outerHTML;}

window.addEventListener('gamecast-auth',()=>{if(!publicView)load({force:true});});

if(!publicView)document.getElementById('retryRequest').onclick=async()=>{if(writing)return;writing=true;const id=gamecastPendingGameId();try{const b=await gamecastRetryPending();adopt(b);render(id);status('REQUEST RECOVERED · V'+version);}catch(e){status('RETRY ERROR · '+e.message,true);}finally{writing=false;}};
