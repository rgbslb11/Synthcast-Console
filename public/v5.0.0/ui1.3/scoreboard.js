'use strict';
(() => {
  const params=new URLSearchParams(location.search);
  const sources={
    saturday:{api:globalThis.GAMECAST_V500_CONFIG.publicApi,engine:'GC-W7-V5.0.0-RC1',slug:params.get('session')||'',expected:54},
    full:{api:globalThis.GAMECAST_V500_CONFIG.publicApi,engine:'GC-W7-V5.0.0-RC1',slug:params.get('session')||'',expected:54},
  };
  const POLL_MS=4500;
  const FINALISH=new Set(['LOCKED','READY','FINAL']);
  const LIVEISH=new Set(['ACTIVE','DELAY','EDIT']);
  const snapshots={saturday:[],full:[]};
  const versions={saturday:null,full:null};
  const syncedAt={saturday:0,full:0};
  const errors={saturday:null,full:null};
  let selected='full';
  let filter='ALL';
  let networkOnly=false;
  let loading=false;
  let expanded=new Set();

  const board=document.getElementById('scoreboard');
  const earlierBoard=document.getElementById('earlierBoard');
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
  const isBroadcast=g=>/^(?:SEN(?:\+)?|EBC|EBCOTT|EBC\+EBCOTT)$/i.test(g.network||'');
  const scoreState=g=>g.lifecycle==='FINAL_PENDING'?'FINAL PENDING':isFinal(g)?'FINAL':isDelay(g)?'DELAY':g.breakLabel==='HALFTIME'?'HALF':g.breakLabel==='END 1ST'?'END 1Q':g.breakLabel==='END 3RD'?'END 3Q':isLive(g)?(g.displayStatus||`${g.period||''} ${clock(g.scoreboardSeconds)}`).replace(' · ',' '):g.kickoff||'UPCOMING';
  const stateClass=g=>isDelay(g)?'delay':isLive(g)?'live':'';
  const sortRank=g=>isDelay(g)?0:isLive(g)?1:g.breakLabel==='HALFTIME'?1:g.lifecycle==='FINAL_PENDING'?2:isFinal(g)?3:4;
  const completedStamp=g=>Number.isFinite(Date.parse(g.completedAt||''))?Date.parse(g.completedAt):0;
  const compareGames=(a,b)=>(a.kickoffOrder||0)-(b.kickoffOrder||0);
  const matches=g=>{
    if(!gc500wxTeamMatches(g,document.getElementById('teamSearch').value))return false;
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

  function cardHTML(g,source){
    const live=isLive(g)&&!isFinal(g);
    const poss=t=>live&&g.possession===t?'<span class="poss">●</span>':'<span></span>';
    const status=esc(scoreState(g));
    const detailOpen=expanded.has(`${source}:${g.id}`);
    const situation=isUpcoming(g)?`${esc(g.dateLabel||'')} · ${esc(g.kickoff||'')}`:isFinal(g)?'Final result':g.lifecycle==='FINAL_PENDING'?'Awaiting final approval':`${teamName(g,g.possession===1?1:0)} ball · ${g.down||'-'}&${g.distance||'-'} · ${fieldText(g)}`;
    const meta=isFinal(g)?`Completed${g.completedAt?` · ${shortTime(new Date(g.completedAt))}`:''}`:`TO ${Number(g.awayTimeouts??0)} / ${Number(g.homeTimeouts??0)}`;
    const date=g.date!=='2026-10-10'?`<span class="game-date">${esc(g.dateLabel||g.date)}</span>`:'';
    const w=g.weather||{enabled:false,wind:'NONE',rain:'NONE',temperature:'INACTIVE'},weatherLabel=(w.enabled?`WEATHER ON · WIND ${w.wind} · RAIN ${w.rain}`:'WEATHER OFF')+(w.temperature!=='INACTIVE'?` · TEMP ${w.temperature.replace('_',' ')} (DISPLAY ONLY)`:``);
    return `<button class="game-button" type="button" aria-expanded="${detailOpen}" aria-controls="detail-${source}-${esc(g.id)}" data-toggle="${esc(g.id)}" data-source="${source}"><div class="game-main"><div class="game-left"><div class="game-head"><span class="state ${stateClass(g)}">${status}</span>${date}<span class="game-id">${esc(g.id)}</span><span class="network">${esc(g.network||'')}</span></div><div class="team-row">${poss(0)}<span class="team-name">${teamName(g,0)}</span></div><div class="team-row">${poss(1)}<span class="team-name">${teamName(g,1)}</span></div></div><div class="scores"><span>${total(g,0)}</span><span>${total(g,1)}</span></div></div></button><div class="detail" id="detail-${source}-${esc(g.id)}" ${detailOpen?'':'hidden'}><div class="detail-grid"><span><b>${status}</b></span><span>${esc(g.network||'')}</span><span>${situation}</span><span>${meta}</span><span class="weather-label">${esc(weatherLabel)}</span>${lineScore(g)}<div class="last-play">${esc(g.lastPlay||'No play detail available.')}</div></div></div>`;
  }

  function signature(g,source){
    return JSON.stringify({
      id:g.id,l:g.lifecycle,a:g.activity,n:g.network,p:g.period,c:g.scoreboardSeconds,b:g.breakLabel,d:g.delayed,
      pos:g.possession,fp:g.fieldPos,down:g.down,dist:g.distance,at:g.awayTimeouts,ht:g.homeTimeouts,
      s:g.scores,last:g.lastPlay,weather:g.weather,done:g.completedAt,exp:expanded.has(`${source}:${g.id}`),source
    });
  }

  function reconcileGrid(target,visible,source){
    const keep=new Set(visible.map(g=>g.id));
    for(const el of [...target.querySelectorAll('.game-card')])if(!keep.has(el.dataset.game))el.remove();
    if(!visible.length){
      if(!target.querySelector('.empty-state'))target.innerHTML=document.getElementById('emptyTemplate').innerHTML;
      return;
    }
    target.querySelector('.empty-state')?.remove();
    for(const g of visible){
      let el=target.querySelector(`.game-card[data-game="${CSS.escape(g.id)}"]`);
      if(!el){el=document.createElement('article');el.className='game-card';el.dataset.game=g.id;target.appendChild(el)}
      const sig=signature(g,source);
      const classes=['game-card',isLive(g)?'live':'',isDelay(g)?'delay':'',isFinal(g)?'final':''].filter(Boolean).join(' ');
      if(el.dataset.sig!==sig){el.innerHTML=cardHTML(g,source);el.dataset.sig=sig}
      el.className=classes;
      target.appendChild(el);
    }
  }

  const visibleGames=()=>selected==='saturday'?snapshots.saturday.filter(g=>g.date==='2026-10-10'):snapshots.full;
  function reconcile(){
    reconcileGrid(board,visibleGames().filter(matches).sort(compareGames),selected);
    reconcileGrid(earlierBoard,[],'full');
  }

  function updateSummary(){
    const games=visibleGames(),c=statusCounts(games);
    document.getElementById('liveCount').textContent=c.live;
    document.getElementById('finalCount').textContent=c.final;
    document.getElementById('upcomingCount').textContent=c.upcoming;
    document.getElementById('delayCount').textContent=c.delay;
    document.getElementById('weekLabel').textContent='WEEK 7';
    document.getElementById('boardHeadingText').textContent=selected==='saturday'?'SATURDAY · 41 GAMES':'FULL WEEK · 54 GAMES';
  }

  function setSync(mode,text){
    syncDot.className=`sync-dot ${mode||''}`.trim();
    syncText.textContent=text;
  }

  async function readOne(key){
    const source=sources[key];
    try{
      if(!source.api||!source.slug)throw new Error('Open this scoreboard with a 5.0.0  session');
      const r=await fetch(`${source.api}?api=read&session=${encodeURIComponent(source.slug)}`,{cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);
      if(data.public_slug!==source.slug||data.week_key!=='2026-W07'||data.engine_version!==source.engine||!Array.isArray(data.state)||data.state.length!==source.expected)throw new Error('session identity mismatch');
      const dates=data.state.reduce((out,g)=>(out[g.date]=(out[g.date]||0)+1,out),{});
      const expected={'2026-10-06':2,'2026-10-07':2,'2026-10-08':2,'2026-10-09':7,'2026-10-10':41};
      if(Object.keys(dates).length!==Object.keys(expected).length||Object.entries(expected).some(([date,n])=>dates[date]!==n)||new Set(data.state.map(g=>g.id)).size!==source.expected)throw new Error('game slate mismatch');
      snapshots[key]=data.state;
      versions[key]=data.state_version;
      syncedAt[key]=Date.now();
      errors[key]=null;
    }catch(err){
      errors[key]=err.message;
    }
  }

  async function read(){
    if(loading)return;
    loading=true;setSync('loading','SYNC');
    try{
      await Promise.all([readOne('saturday'),readOne('full')]);
      updateSummary();reconcile();
      const failed=Object.entries(errors).filter(([,err])=>err).map(([key,err])=>`${key.toUpperCase()}: ${err}`);
      notice.hidden=!failed.length;
      if(failed.length)notice.textContent=`Public scoreboard sync issue — ${failed.join(' · ')}. Last successful scores remain visible.`;
      setSync(failed.length?'error':'ok',failed.length?'PARTIAL / OFFLINE':`SAT V${versions.saturday??'-'} · WK V${versions.full??'-'}`);
    }finally{loading=false}
  }

  document.getElementById('boardContent').addEventListener('click',e=>{
    const button=e.target.closest('[data-toggle]');
    if(!button)return;
    const key=`${button.dataset.source}:${button.dataset.toggle}`;
    expanded.has(key)?expanded.delete(key):expanded.add(key);
    button.closest('.game-card').dataset.sig='';
    reconcile();
  });

  document.querySelector('.engine-tabs').addEventListener('click',e=>{
    const tab=e.target.closest('[data-engine]');if(!tab)return;
    selected=tab.dataset.engine;
    document.querySelectorAll('.engine-tabs [data-engine]').forEach(x=>{
      x.classList.toggle('active',x===tab);x.setAttribute('aria-selected',String(x===tab));
    });
    document.getElementById('boardContent').setAttribute('aria-labelledby',tab.id);
    updateSummary();reconcile();
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
    if(!loading&&Object.values(syncedAt).some(t=>t&&Date.now()-t>15000))setSync('error','STALE');
  }

  document.getElementById('teamSearch').addEventListener('input',reconcile);
  const nav=document.getElementById('surfaceNav'),same=encodeURIComponent(sources.full.slug||'');if(nav&&same)nav.innerHTML='<a href="../?session='+same+'">CHAIRMAN</a> · <a href="../?session='+same+'&view=public">PUBLIC</a>';
  tick();setInterval(tick,1000);
  read();setInterval(read,POLL_MS);
})();
