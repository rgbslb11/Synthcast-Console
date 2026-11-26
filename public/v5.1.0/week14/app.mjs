import {readWp} from './wp-transport.mjs';
import {signIn,signOut} from './auth.mjs';
import {available,clock,period,spot,downDistance,teamName,textValue,statistic,readDetails,freshness} from './model.mjs';
import {renderGameStats} from './detail-view.mjs';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={totalPoints:'Total points',pointsByQuarter:'Points by quarter',pointsByOvertime:'Points by overtime',timeOfPossession:'Time of possession',offensiveSnaps:'Offensive snaps',rushingAttempts:'Rushing attempts',rushingYards:'Rushing yards',yardsPerRush:'Yards per rush',rushingTouchdowns:'Rushing touchdowns',passingAttempts:'Passing attempts',completions:'Completions',completionPercentage:'Completion percentage',passingYards:'Passing yards',yardsPerCompletion:'Yards per completion',interceptionsThrown:'Interceptions thrown',totalOffense:'Total offense',yardsPerOffensivePlay:'Yards per offensive play',firstDowns:'First downs',thirdDownAttempts:'Third down attempts',thirdDownConversionsPercentage:'Third down conversions',fourthDownAttempts:'Fourth down attempts',fourthDownConversionsPercentage:'Fourth down conversions',fumblesLost:'Fumbles lost',turnovers:'Turnovers',punts:'Punts',netPuntYards:'Recorded net punt yards',scoringSummary:'Scoring summary'};
let saved={};try{saved=JSON.parse(sessionStorage.getItem('gc510-week14-production')??'{}');}catch{}
const state={mode:'live',games:[],wp:new Map(),wpErrors:new Map(),expiresAt:0,retryAt:0,data:new Map(),errors:new Map(),filter:saved.filter??'all',search:saved.search??'',tab:saved.tab??'overview',drive:saved.drive??'all',historical:saved.historical??null,wpCase:saved.wpCase??'live',session:'w14v510-production',token:'',busy:false,generation:0,connection:'Loading',wasDisconnected:false,expanded:new Set(saved.expanded??[]),mobileMenu:saved.mobileMenu??false,gamePickerOpen:saved.gamePickerOpen??false,detailSections:new Set(saved.detailSections??[])};
let fixtures,wpFixtures,controller=null,restoreBoard=false,boardScroll=saved.boardScroll??0,focusedCard=saved.focusedCard??null;
const persist=()=>{try{sessionStorage.setItem('gc510-week14-production',JSON.stringify({mode:state.mode,session:state.session,gameIds:state.games.map(g=>g.id),filter:state.filter,search:state.search,tab:state.tab,drive:state.drive,historical:state.historical,wpCase:state.wpCase,boardScroll,focusedCard,expanded:[...state.expanded],mobileMenu:state.mobileMenu,gamePickerOpen:state.gamePickerOpen,detailSections:[...state.detailSections]}));}catch{}};
const selected=()=>new URLSearchParams(location.hash.slice(1)).get('game');
const gameById=id=>state.games.find(g=>g.id===id);
const dateText=v=>Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(new Date(v)):'Kickoff unavailable';
const reason=d=>d?.availability?.reason??'Data unavailable';
function fixtureData(){state.games=fixtures.games;state.data=new Map(fixtures.games.map(g=>[g.id,fixtures.responses[g.id]]));state.errors.clear();state.connection='Fixture review · not live';state.session=fixtures.sessionId;}
function badge(label,type=''){return `<span class="badge ${esc(type)}">${esc(label)}</span>`;}
function lifecycle(g){return g?.lifecycle??null;}
function lane(g){const life=lifecycle(g);return life==='UNLAUNCHED'?'upcoming':['FINAL_PENDING','LOCKED','READY','FINAL'].includes(life)?'finished':['ACTIVE','EDIT','DELAY','PAUSED'].includes(life)?'live':'unclassified';}
function statusLabel(g,d){if(!d)return state.errors.get(g.id)??g.activity??g.lifecycle??'LOADING';if(d.availability.status==='BLOCKED')return '';if(d.availability.status==='NOT_STARTED')return 'NOT STARTED';return lifecycle(g)==='FINAL_PENDING'?'FINAL · NOT ACCEPTED':lifecycle(g)==='ACTIVE'?`${period(d.scoreboard.period)} ${clock(d.scoreboard.scoreboardClock)}`:'AVAILABLE · LIFECYCLE UNAVAILABLE';}
function card(g){const d=state.data.get(g.id),s=available(d)?d.scoreboard:null,st=d?.teamStatistics;const denied=d?.availability.status==='BLOCKED',error=state.errors.get(g.id),stale=!!d&&lane(g)==='live'&&freshness(d)!=='CURRENT';
 const name=t=>s?teamName(s,t):g[t===0?'away':'home']??'Team unavailable';
 return `<article class="card" data-game="${esc(g.id)}"><div class="card-meta"><span>${esc(s?.network??g.network??'Network unavailable')} · ${esc(g.id)}</span>${denied?'':badge(statusLabel(g,d),stale?'stale':'')}</div><div class="teams">${[0,1].map(t=>`<div class="team">${t===1?'<span class="muted">at </span>':''}${esc(name(t))}<small>${esc(s?.[t?'homeTeamAndRecords':'awayTeamAndRecords']?.record??'Record unavailable')}</small></div><div class="score">${esc(st?.[t]?.totalPoints??g.score?.[t]??'—')}</div>`).join('')}</div><div class="card-bottom"><p>${esc(dateText(s?.scheduledKickoff??g.kickoffZulu))}<br>${esc(lifecycle(g)??'Lifecycle unavailable')}</p>${denied?'<span class="stats-unavailable" aria-label="Stats unavailable"></span>':`<a class="button" href="#game=${encodeURIComponent(g.id)}" data-open="${esc(g.id)}">${lane(g)==='upcoming'?'PREGAME':lane(g)==='finished'?'VIEW STATS':'LIVE STATS'}</a>`}</div>${s?`<details data-card-details="${esc(g.id)}" ${state.expanded.has(g.id)?'open':''}><summary>Game details</summary><p class="muted">${esc(s.week??'Week unavailable')} · GL ${esc(clock(s.gameLengthClock))}<br>Possession ${esc([0,1].includes(s.possession)?teamName(s,s.possession):'Unavailable')} · ${esc(downDistance(s.downDistance))} · ${esc(spot(s.fieldPosition))}<br>Timeouts ${esc(s.awayTimeouts??'—')} / ${esc(s.homeTimeouts??'—')}<br>Weather ${esc(!s.weather?'Unavailable':s.weather.enabled===false?'inactive':`wind ${textValue(s.weather.wind)}, rain ${textValue(s.weather.rain)}, temperature ${textValue(s.weather.temperature)}`)}</p>${lineScore(d)}<p class="muted">Last resolved play: ${esc(s.lastResolvedPlay?.description??'Unavailable')}</p></details>`:''}${error?`<p class="message">${esc(error)} · Cached details cleared</p>`:stale?'<p class="message">STALE · Last committed state; awaiting update</p>':''}</article>`;
}
function renderBoard(){
 let shown=state.games.filter(g=>{const d=state.data.get(g.id),s=d?.scoreboard,q=state.search.toLowerCase();const matches=[g.id,g.away,g.home,g.network,s?.awayTeamAndRecords?.name,s?.homeTeamAndRecords?.name,s?.network].some(x=>x?.toLowerCase().includes(q));return matches&&(state.filter==='all'||state.filter==='blocked'&&d?.availability.status==='BLOCKED'||lane(g)===state.filter);});
 $('#game-count').textContent=`${shown.length} of ${state.games.length} games`;
 const lanes=['live','upcoming','finished'];
 $('#lanes').innerHTML=lanes.map(k=>`<section class="lane" data-lane="${k}"><h3 class="lane-title">${{live:'INPROGRESS',upcoming:'UPCOMING',finished:'Final Results',unclassified:'LIFECYCLE UNAVAILABLE'}[k]} <span>· ${shown.filter(g=>lane(g)===k).length}</span></h3><div class="lane-body">${shown.filter(g=>lane(g)===k).map(card).join('')||'<p class="empty">No games in this view</p>'}</div></section>`).join('');
 document.querySelectorAll('[data-filter]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter));});

}
function lineScore(d){const s=d.scoreboard,keys=Object.keys(s.lineScore??{}).filter(k=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(k));return `<div class="table-wrap"><table class="line-score"><caption class="muted">Authoritative line score</caption><thead><tr><th>Team</th>${keys.map(k=>`<th>${esc(period(k))}</th>`).join('')}<th>T</th></tr></thead><tbody>${[0,1].map(t=>`<tr><td>${esc(teamName(s,t))}</td>${keys.map(k=>`<td>${esc(s.lineScore[k]?.[t]??'—')}</td>`).join('')}<td><b>${esc(d.teamStatistics[t]?.totalPoints??'—')}</b></td></tr>`).join('')}</tbody></table></div>`;}
function stats(d,compact=false){const keys=Object.keys(labels).filter(k=>k!=='scoringSummary'&&(!compact||['totalPoints','timeOfPossession','offensiveSnaps','totalOffense','turnovers','firstDowns'].includes(k)));return `<div class="table-wrap"><table><thead><tr><th>Statistic</th><th class="num">${esc(teamName(d.scoreboard,0))}</th><th class="num">${esc(teamName(d.scoreboard,1))}</th></tr></thead><tbody>${keys.map(k=>`<tr><td>${esc(labels[k])}${k==='netPuntYards'?'<br><span class="muted">Engine recorded; accounting decision open</span>':''}</td>${[0,1].map(t=>`<td class="num">${esc(statistic(d.teamStatistics[t]?.[k],k))}${k==='completionPercentage'&&d.teamStatistics[t]?.[k]!=null?'%':''}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted">— = unavailable or undefined rate. Snaps, yards and efficiency cover regulation only; score includes overtime.</p>`;}
function field(d,p=null){const f=p?{mode:'HISTORICAL',possession:p.possessingTeam,ball:p.preFieldPosition,lineOfScrimmage:p.preFieldPosition,lineToGain:null,down:p.preDown,distance:p.preDistance}:d.field;
 // Only geometry transforms supplied coordinates; no football inference.
 if(!f||f.availability?.status==='BLOCKED')return `<p class="notice">Field BLOCKED · ${esc(f?.availability?.reason??'SOURCE_MISSING')}</p>`;
 return `<p><b>${esc(p?`Historical play ${p.sequence} · pre-snap`:'Live committed field')}</b><br><span class="muted">${esc(teamName(d.scoreboard,f.possession))} · ${esc(downDistance(f))} · ${esc(spot(f.ball))}</span></p><div class="field" role="img" aria-label="${esc(teamName(d.scoreboard,f.possession))}, ${esc(spot(f.ball))}, ${esc(downDistance(f))}; own goal at left, opponent goal at right">${Array.from({length:11},(_,i)=>`<span class="yard" style="left:${i*10}%">${i===0?'OWN':i===10?'OPP':i*10}</span>`).join('')}${f.lineToGain==null?'':`<span class="field-line gain-line" style="left:${Number(f.lineToGain)}%"></span>`}<span class="field-line" style="left:${Number(f.lineOfScrimmage)}%"></span><span class="field-ball" style="left:${Number(f.ball)}%"></span></div><div class="field-legend"><span>Red: scrimmage</span>${f.lineToGain==null?'<span>Historical line to gain: unavailable</span>':'<span>Dashed: line to gain</span>'}<span>Offense moves left → right</span></div>`;
}
function scoring(d){const rows=[0,1].flatMap(t=>(d.teamStatistics[t]?.scoringSummary??[]).map(p=>({...p,team:t}))).sort((a,b)=>a.eventSequence-b.eventSequence);return rows.length?`<div class="table-wrap"><table><thead><tr><th>Period</th><th>Team</th><th>GL</th><th>Points</th><th>Source</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(period(p.period))}</td><td>${esc(teamName(d.scoreboard,p.team))}</td><td>${esc(clock(p.gameLengthTimestamp))}</td><td>${esc(p.points)}</td><td>${esc(p.source??'Unavailable')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No scoring entries recorded in this response.</p>';}
function renderDetail(){
 const id=selected();
 if(!['overview','stats','plays','scoring'].includes(state.tab))state.tab='overview';
 $('#detail-content').innerHTML=renderGameStats({id,game:gameById(id),data:state.data.get(id),games:state.games,allData:state.data,tab:state.tab,historical:state.historical,drive:state.drive,wpCase:state.wpCase,wpCases:Object.keys(wpFixtures.fixtures),wpResponse:state.mode==='fixture'?wpFixtures.fixtures[state.wpCase]:state.wp.get(id),mode:state.mode,contract:fixtures.contract,error:state.errors.get(id),wpError:state.wpErrors.get(id),desktop:matchMedia('(min-width:1101px)').matches,compact:matchMedia('(max-width:600px)').matches,gamePickerOpen:state.gamePickerOpen,detailSections:state.detailSections},{lineScore,stats,field,scoring});
}
function render(){const id=selected();const detailNav=$('#game-stats-nav');detailNav.hidden=!id;detailNav.href=id?`#game=${encodeURIComponent(id)}`:'#board';detailNav.setAttribute('aria-current',id?'page':'false');$('.surface-nav a[href="#board"]').setAttribute('aria-current',id?'false':'page');$('.masthead').classList.toggle('mobile-open',state.mobileMenu);$('#mobile-menu-toggle').setAttribute('aria-expanded',String(state.mobileMenu));$('#board').hidden=!!id;$('#detail').hidden=!id;$('#back').hidden=!id;$('#breadcrumb').textContent=id?`StatsCenter / ${id} / Game Stats`:'Scoreboard / Stats / Rollup';$('.brand h1 span').textContent=id?'GAME STATS':'SCOREBOARD';document.title=id?'Synthcast Game Stats | 5.1 Week 14':'Synthcast StatsCenter | 5.1 Week 14';$('#connection').textContent=state.connection;$('#review-banner').textContent='WEEK 14 · 57 scheduled games';const sourceTimes=[...state.data.values()].map(d=>d.generatedAt).filter(t=>Number.isFinite(Date.parse(t))).sort();$('#updated-zulu').textContent=`Updated Zulu Time · ${sourceTimes.at(-1)??'Unavailable'} · source commit`;$('#master-zulu').textContent='Master Zulu · '+(state.masterZulu??'—');$('#refresh').disabled=state.busy;renderBoard();if(id){renderDetail();renderControls(id);}}
async function refresh(){if(state.busy||Date.now()<state.retryAt)return;if(state.mode==='live'&&(!state.token||Date.now()>=state.expiresAt)){resetConnection();state.token='';state.connection='Authentication required · sign in to Week 14';render();return;}if(state.mode==='fixture'){render();return;}state.busy=true;const generation=state.generation;controller=new AbortController();let failed=false;
 try{
  const board=await request('board',{signal:controller.signal});
  if(generation!==state.generation)return;
  if(board.sessionId!==state.session||board.games.length!==57||!Number.isSafeInteger(board.stateVersion))throw Error('BOARD_CONTRACT_MISMATCH');
  state.games=board.games;state.masterZulu=board.masterZulu;state.stateVersion=board.stateVersion;
 }catch(e){if(generation===state.generation){state.busy=false;state.connection=e.message;state.games=[];state.data.clear();state.wp.clear();render();}return;}
 const ids=selected()&&gameById(selected())?[selected()]:[];
 for(const game of ids){if(generation!==state.generation)break;try{const data=await readDetails({session:state.session,game,token:state.token,signal:controller.signal,onReset:()=>{state.data.delete(game);state.historical=null;state.connection='Reconnecting · source changed';render();}});if(generation!==state.generation)break;if(state.data.get(game)?.runId!==data.runId){state.historical=null;state.drive='all';}state.data.set(game,data);state.errors.delete(game);if(selected()===game){try{const wp=await readWp({session:state.session,game,token:state.token,signal:controller.signal,onReset:()=>state.wp.delete(game)});if(generation!==state.generation)break;state.wp.set(game,wp);state.wpErrors.delete(game);}catch(e){if(generation!==state.generation)break;state.wp.delete(game);state.wpErrors.set(game,e.message);if(e.message==='WP_HTTP_429'){state.retryAt=Date.now()+60000;failed=true;}if(['ACCESS_DENIED','AUTHENTICATION_REQUIRED'].includes(e.message))throw e;}}}catch(e){if(generation!==state.generation)break;failed=true;if(e.message==='AUTHENTICATION_REQUIRED')state.token='';if(e.message==='HTTP_429')state.retryAt=Date.now()+60000;state.data.delete(game);state.wp.delete(game);state.errors.set(game,e.message);state.wasDisconnected=true;}}
 if(generation===state.generation){state.busy=false;state.connection=failed?'Unavailable · reconnecting':state.wasDisconnected?'Recovered · authorized snapshot':'Connected · Week 14';if(!failed)state.wasDisconnected=false;const scroll=window.scrollY,focus=document.activeElement?.id,wpOpen=$('.wp-options')?.open;render();if(focus)document.getElementById(focus)?.focus({preventScroll:true});if(wpOpen&&$('.wp-options'))$('.wp-options').open=true;window.scrollTo(0,scroll);}}
function resetConnection(){controller?.abort();state.generation++;state.busy=false;state.data.clear();state.wp.clear();state.wpErrors.clear();state.errors.clear();state.historical=null;state.drive='all';state.wasDisconnected=false;}
document.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){boardScroll=window.scrollY;focusedCard=open.dataset.open;restoreBoard=true;state.historical=null;persist();}const f=e.target.closest('[data-filter]');if(f){state.filter=f.dataset.filter;persist();renderBoard();}const t=e.target.closest('[data-tab]');if(t){state.tab=t.dataset.tab;persist();renderDetail();$(`#tab-${state.tab}`)?.focus({preventScroll:true});}const p=e.target.closest('[data-play]');if(p){state.historical=Number(p.dataset.play);persist();const y=window.scrollY;renderDetail();document.querySelector(`[data-play="${state.historical}"]`)?.focus({preventScroll:true});window.scrollTo(0,y);}if(e.target.closest('#return-live')){state.historical=null;persist();renderDetail();}if(e.target.closest('#back'))restoreBoard=true;});
document.addEventListener('toggle',e=>{if(e.target.matches('.mobile-games')){state.gamePickerOpen=e.target.open;persist();}if(e.target.matches('[data-detail-section]')){const k=e.target.dataset.detailSection;e.target.open?state.detailSections.add(k):state.detailSections.delete(k);persist();}if(e.target.matches('[data-card-details]')){const id=e.target.dataset.cardDetails;e.target.open?state.expanded.add(id):state.expanded.delete(id);persist();}},true);
document.addEventListener('keydown',e=>{if(e.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...document.querySelectorAll('[role=tab]')],i=tabs.indexOf(e.target),n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].click();}});
$('#mobile-menu-toggle').onclick=()=>{state.mobileMenu=!state.mobileMenu;persist();render();};
matchMedia('(min-width:1101px)').addEventListener('change',()=>{if(fixtures)render();});
matchMedia('(max-width:600px)').addEventListener('change',()=>{if(fixtures)render();});
$('#search').value=state.search;$('#search').addEventListener('input',e=>{state.search=e.target.value;persist();renderBoard();});$('#refresh').onclick=refresh;
$('#settings-toggle').onclick=()=>{const open=$('#settings').hidden;$('#settings').hidden=!open;$('#settings-toggle').setAttribute('aria-expanded',String(open));};
$('#connect-form').onsubmit=async e=>{
 e.preventDefault();resetConnection();const generation=state.generation;
 const ids=[];
 const email=$('#email-input').value.trim(),password=$('#password-input').value;$('#password-input').value='';
 const oldToken=state.token;state.token='';state.mode='live';state.games=ids.map(id=>({id}));state.filter='all';state.connection='Signing in';state.busy=true;render();
 try{await signOut(oldToken).catch(()=>{});const login=await signIn({email,password});if(generation!==state.generation){await signOut(login.token);return;}state.token=login.token;state.expiresAt=login.expiresAt;state.busy=false;$('#settings').hidden=true;persist();location.hash='board';await refresh();}
 catch(e){if(generation===state.generation){state.busy=false;state.connection=e.message;render();}}
};
async function disconnect(){const token=state.token;resetConnection();state.token='';state.expiresAt=0;state.connection='Signed out';render();try{await signOut(token);}catch{state.connection='Disconnected locally · server sign-out unavailable';render();}}
$('#sign-out').onclick=async()=>{await disconnect();state.games=[];$('#settings').hidden=false;render();};
$('#fixtures').onclick=async()=>{await disconnect();state.mode='fixture';fixtureData();persist();location.hash='board';render();};
document.addEventListener('change',e=>{if(e.target.id==='game-switch'){state.historical=null;state.drive='all';location.hash=`game=${e.target.value}`;persist();}if(e.target.id==='drive-filter'){state.drive=e.target.value;state.historical=null;persist();renderDetail();$('#drive-filter').focus({preventScroll:true});}if(e.target.id==='wp-case'){state.wpCase=e.target.value;persist();renderDetail();$('#wp-case').focus({preventScroll:true});}});
let lastGameId=selected();
addEventListener('hashchange',()=>{if(lastGameId!==selected()){state.historical=null;state.drive='all';lastGameId=selected();persist();}render();if(!selected()&&restoreBoard){requestAnimationFrame(()=>{document.querySelector(`[data-open="${CSS.escape(focusedCard??'')}"]`)?.focus({preventScroll:true});window.scrollTo(0,boardScroll);restoreBoard=false;});}else{window.scrollTo(0,0);$('#main').focus({preventScroll:true});}if(state.mode==='live')refresh();});
addEventListener('online',()=>{state.wasDisconnected=true;refresh();});addEventListener('offline',()=>{resetConnection();state.connection='Offline · details cleared';state.wasDisconnected=true;render();});
fixtures={contract:'GC-STATS-1'};wpFixtures={fixtures:{}};
state.connection='Sign in to Week 14';
$('#settings').hidden=false;render();
setInterval(()=>{if(state.mode==='live'&&state.token&&!document.hidden)refresh();},5000);


const endpoint='https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-week14';
async function request(action,{body,signal}={}){
 const res=await fetch(endpoint+'?action='+action,{method:body?'POST':'GET',credentials:'omit',cache:'no-store',redirect:'error',signal,
  headers:{Authorization:'Bearer '+state.token,...(body?{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()}:{})},
  body:body?JSON.stringify(body):undefined});
 const result=await res.json();
 if(!res.ok)throw Error(result.error??'BACKEND_UNAVAILABLE');
 return result;
}
function renderControls(id){
 const game=gameById(id);
 if(!game||!state.token)return;
 const choices={
  UNLAUNCHED:[['launch','Launch'],['quarter_length','Quarter length']],
  ACTIVE:[['auto',game.auto?'Stop AUTO':'Start AUTO'],['on_air',game.onAir?'End ON AIR':'ON AIR'],['speed','Speed'],['pause',game.operatorPaused?'Resume':'Pause'],['delay','Delay'],['edit_begin','Chairman Edit'],['clock_set','Set Clock'],['end','Call Final'],['restart_same_seed','Same-seed restart']],
  DELAY:[['resume_delay','Resume game'],['edit_begin','Chairman Edit']],
  EDIT:[['edit_commit','Save Edit'],['edit_cancel','Cancel Edit']],
  FINAL_PENDING:[['lock','Lock result'],['edit_begin','Edit result']],
  LOCKED:[['unlock','Unlock'],['accept','Accept']],
  READY:[['reopen_live','Reopen live']],
 };
 const options=(choices[game.lifecycle]??[]).filter(([command])=>command!=='speed'||game.auto);
 const wp=state.wp.get(id)?.summary;
 const prior=wp?.status==='PREGAME'&&typeof wp.probability==='number'?'<p>'+ (wp.pickEm?'Pick’em · ':'Pregame WP · ')+(wp.probability*100).toFixed(1)+'%</p>':'';
 $('#detail-content').insertAdjacentHTML('afterbegin','<section class="panel" aria-label="Chairman controls"><h3>Chairman controls</h3>'+prior+options.map(([command,label])=>'<button type="button" data-command="'+command+'">'+label+'</button>').join(' ')+'<p id="command-status" role="status">'+esc(state.commandStatus??'')+'</p></section>');
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-command]');
 if(!button||state.commandBusy)return;
 const id=selected(),command=button.dataset.command;
 let payload={};
 if(['launch','end','unlock','accept','reopen_live','restart_same_seed'].includes(command)){
  if(!confirm(button.textContent+' for '+id+'?'))return;
  payload.confirmed=true;
 }
 if(['speed','clock_set','quarter_length'].includes(command)){
  const message={speed:'Speed (1, 4, 10, 20 or 50)',clock_set:'Scoreboard seconds',quarter_length:'Seconds per quarter (600 or 900)'};
  const answer=prompt(message[command]);
  if(answer===null||!/^\d+$/.test(answer))return;
  payload[command==='speed'?'speed':'seconds']=Number(answer);
 }
 if(command==='edit_commit'){
  const answer=prompt('Correction fields in JSON. Example: {"down":2,"distance":7,"hold":true}');
  if(answer===null)return;
  try{payload=JSON.parse(answer);if(!payload||Array.isArray(payload)||typeof payload!=='object')throw Error();}
  catch{state.commandStatus='Invalid edit format';render();return;}
 }
 state.commandBusy=true;state.commandStatus='Sending command';button.disabled=true;
 try{const receipt=await request('command',{body:{id,command,payload,expectedVersion:state.stateVersion}});state.commandStatus='Saved · revision '+receipt.stateVersion;}
 catch(error){state.commandStatus=error.message==='VERSION_CONFLICT'?'Board updated. Review the current state before retrying.':error.message;}
 finally{state.commandBusy=false;await refresh();render();}
});
