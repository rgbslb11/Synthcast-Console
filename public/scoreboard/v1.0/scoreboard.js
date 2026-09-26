'use strict';
(() => {
  const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2-2';
  const params=new URLSearchParams(location.search);
  const slug=params.get('session')||'';
  const POLL_MS=4500;
  const FINALISH=new Set(['FINAL_PENDING','LOCKED','READY','FINAL']);
  const LIVEISH=new Set(['ACTIVE','DELAY','EDIT']);
  let state=[];
  let filter='ALL';
  let networkOnly=false;
  let loading=false;
  let expanded=new Set();
  let lastVersion=null;
  let lastSyncAt=0;

  const board=document.getElementById('scoreboard');
  const notice=document.getElementById('sessionNotice');
  const syncDot=document.getElementById('syncDot');
  const syncText=document.getElementById('syncText');

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validPeriod=k=>['1','2','3','4','OT'].includes(k)||/^(?:[2-9]|[1-9][0-9]+)OT$/.test(k);
  const total=(g,t)=>Object.entries(g.scores||{}).reduce((sum,[k,q])=>validPeriod(k)?sum+Number((q||[])[t]||0):sum,0);
  const clock=s=>`${String(Math.floor(Math.max(0,Number(s)||0)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,Number(s)||0)%60)).padStart(2,'0')}`;
  const periods=g=>['1','2','3','4',...Object.keys(g.scores||{}).filter(k=>!['1','2','3','4'].includes(k)&&validPeriod(k))];
  const teamName=(g,t)=>esc(t?g.home?.name:g.away?.name);
  const isFinal=g=>FINALISH.has(g.lifecycle);
  const isLive=g=>LIVEISH.has(g.lifecycle);
  const isActiveLive=g=>g.lifecycle==='ACTIVE'||g.lifecycle==='EDIT';
  const isDelay=g=>g.lifecycle==='DELAY'||g.delayed===true;
  const isUpcoming=g=>g.lifecycle==='UNLAUNCHED';
  const isBroadcast=g=>/^SEN(?:\+)?$/i.test(g.network||'')||/^EBC$/i.test(g.network||'');
  const scoreState=g=>isFinal(g)?'FINAL':isDelay(g)?'DELAY':g.breakLabel==='HALFTIME'?'HALF':g.breakLabel==='END 1ST'?'END 1Q':g.breakLabel==='END 3RD'?'END 3Q':isLive(g)?(g.displayStatus||`${g.period||''} ${clock(g.scoreboardSeconds)}`).replace(' · ',' '):g.kickoff||'UPCOMING';
  const stateClass=g=>isDelay(g)?'delay':isLive(g)?'live':'';
  const sortRank=g=>isDelay(g)?0:isLive(g)?1:g.breakLabel==='HALFTIME'?1:isFinal(g)?2:3;
  const completedStamp=g=>Number.isFinite(Date.parse(g.completedAt||''))?Date.parse(g.completedAt):0;
  const compareGames=(a,b)=>{
    const ra=sortRank(a),rb=sortRank(b);
    if(ra!==rb)return ra-rb;
    if(isFinal(a)&&isFinal(b))return completedStamp(b)-completedStamp(a)||(a.kickoffOrder||0)-(b.kickoffOrder||0);
    return (a.kickoffOrder||0)-(b.kickoffOrder||0);
  };
  const matches=g=>{
    if(networkOnly&&!isBroadcast(g))return false;
    if(filter==='LIVE')return isLive(g)||g.breakLabel==='HALFTIME';
    if(filter==='FINAL')return isFinal(g);
    if(filter==='UPCOMING')return isUpcoming(g);
    return true;
  };
  const fieldText=g=>{
    const fp=Number(g.fieldPos);
    if(!Number.isFinite(fp))return 'FIELD --';
    return fp<=50?`OWN ${fp}`:`OPP ${100-fp}`;
  };
  const statusCounts=games=>({
    live:games.filter(g=>isActiveLive(g)||g.breakLabel==='HALFTIME').length,
    final:games.filter(isFinal).length,
    upcoming:games.filter(isUpcoming).length,
    delay:games.filter(isDelay).length,
  });
  const shortTime=d=>new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(d);

  function lineScore(g){
    const ps=periods(g);
    return `<table class="line-score"><thead><tr><th>TEAM</th>${ps.map(p=>`<th>${['1','2','3','4'].includes(p)?'Q'+p:p}</th>`).join('')}<th>T</th></tr></thead><tbody>${[0,1].map(t=>`<tr><td>${teamName(g,t)}</td>${ps.map(p=>`<td>${Number((g.scores?.[p]||[0,0])[t]||0)}</td>`).join('')}<td>${total(g,t)}</td></tr>`).join('')}</tbody></table>`;
  }

  function cardHTML(g){
    const live=isLive(g)&&!isFinal(g);
    const poss=t=>live&&g.possession===t?'<span class="poss">●</span>':'<span></span>';
    const status=esc(scoreState(g));
    const detailOpen=expanded.has(g.id);
    const situation=isUpcoming(g)?`${esc(g.dateLabel||'')} · ${esc(g.kickoff||'')}`:isFinal(g)?'Final result':`${teamName(g,g.possession===1?1:0)} ball · ${g.down||'-'}&${g.distance||'-'} · ${fieldText(g)}`;
    const meta=isFinal(g)?`Completed${g.completedAt?` · ${shortTime(new Date(g.completedAt))}`:''}`:`TO ${Number(g.awayTimeouts??0)} / ${Number(g.homeTimeouts??0)}`;
    return `<button class="game-button" type="button" aria-expanded="${detailOpen}" aria-controls="detail-${esc(g.id)}" data-toggle="${esc(g.id)}"><div class="game-main"><div class="game-left"><div class="game-head"><span class="state ${stateClass(g)}">${status}</span><span class="game-id">${esc(g.id)}</span><span class="network">${esc(g.network||'')}</span></div><div class="team-row">${poss(0)}<span class="team-name">${teamName(g,0)}</span></div><div class="team-row">${poss(1)}<span class="team-name">${teamName(g,1)}</span></div></div><div class="scores"><span>${total(g,0)}</span><span>${total(g,1)}</span></div></div></button><div class="detail" id="detail-${esc(g.id)}" ${detailOpen?'':'hidden'}><div class="detail-grid"><span><b>${status}</b></span><span>${esc(g.network||'')}</span><span>${situation}</span><span>${meta}</span>${lineScore(g)}<div class="last-play">${esc(g.lastPlay||'No play detail available.')}</div></div></div>`;
  }

  function signature(g){
    return JSON.stringify({
      id:g.id,l:g.lifecycle,a:g.activity,n:g.network,p:g.period,c:g.scoreboardSeconds,b:g.breakLabel,d:g.delayed,
      pos:g.possession,fp:g.fieldPos,down:g.down,dist:g.distance,at:g.awayTimeouts,ht:g.homeTimeouts,
      s:g.scores,last:g.lastPlay,done:g.completedAt,exp:expanded.has(g.id)
    });
  }

  function reconcile(){
    const visible=state.filter(matches).sort(compareGames);
    const keep=new Set(visible.map(g=>g.id));
    for(const el of [...board.querySelectorAll('.game-card')])if(!keep.has(el.dataset.game))el.remove();
    if(!visible.length){
      if(!board.querySelector('.empty-state'))board.innerHTML=document.getElementById('emptyTemplate').innerHTML;
      return;
    }
    board.querySelector('.empty-state')?.remove();
    for(const g of visible){
      let el=board.querySelector(`.game-card[data-game="${CSS.escape(g.id)}"]`);
      if(!el){el=document.createElement('article');el.className='game-card';el.dataset.game=g.id;board.appendChild(el)}
      const sig=signature(g);
      const classes=['game-card',isLive(g)?'live':'',isDelay(g)?'delay':'',isFinal(g)?'final':''].filter(Boolean).join(' ');
      if(el.dataset.sig!==sig){el.innerHTML=cardHTML(g);el.dataset.sig=sig}
      el.className=classes;
      board.appendChild(el);
    }
  }

  function updateSummary(){
    const c=statusCounts(state);
    document.getElementById('liveCount').textContent=c.live;
    document.getElementById('finalCount').textContent=c.final;
    document.getElementById('upcomingCount').textContent=c.upcoming;
    document.getElementById('delayCount').textContent=c.delay;
    const week=state.some(g=>g.canonicalWeek==='W3')?'WEEK 3':'SCOREBOARD';
    document.getElementById('weekLabel').textContent=week;
  }

  function setSync(mode,text){
    syncDot.className=`sync-dot ${mode||''}`.trim();
    syncText.textContent=text;
  }

  async function read(){
    if(!slug||loading)return;
    loading=true;setSync('loading','SYNC');
    try{
      const r=await fetch(`${API}?api=read&session=${encodeURIComponent(slug)}`,{cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);
      state=Array.isArray(data.state)?data.state:[];
      lastVersion=data.state_version??lastVersion;
      lastSyncAt=Date.now();
      updateSummary();reconcile();
      setSync('ok',`V${lastVersion??'-'}`);
      notice.hidden=true;
    }catch(err){
      setSync('error','OFFLINE');
      notice.hidden=false;
      notice.textContent=`Scoreboard unavailable: ${err.message}`;
    }finally{loading=false}
  }

  board.addEventListener('click',e=>{
    const button=e.target.closest('[data-toggle]');
    if(!button)return;
    const id=button.dataset.toggle;
    expanded.has(id)?expanded.delete(id):expanded.add(id);
    const g=state.find(x=>x.id===id);
    if(g){const el=board.querySelector(`.game-card[data-game="${CSS.escape(id)}"]`);if(el){el.dataset.sig='';}}
    reconcile();
  });

  document.querySelector('.filters').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='networkToggle'){
      networkOnly=!networkOnly;b.setAttribute('aria-pressed',String(networkOnly));reconcile();return;
    }
    if(!b.dataset.filter)return;
    filter=b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter===filter));
    reconcile();
  });

  function tick(){
    document.getElementById('localTime').textContent=shortTime(new Date());
    if(lastSyncAt&&Date.now()-lastSyncAt>15000&&!loading)setSync('error','STALE');
  }

  tick();setInterval(tick,1000);
  if(slug){notice.textContent='Loading public scoreboard...';read();setInterval(read,POLL_MS)}
})();
