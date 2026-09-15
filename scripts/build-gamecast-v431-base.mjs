import fs from 'node:fs';
import path from 'node:path';
import './build-gamecast-v43.mjs';

const root=process.cwd();
const srcFn=path.join(root,'supabase/functions/gamecast-week4-v4-3');
const dstFn=path.join(root,'supabase/functions/gamecast-week4-v4-3-1');
const srcUi=path.join(root,'public/v4.3');
const dstUi=path.join(root,'public/v4.3.1');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,'utf8');};
function once(s,from,to,label){const i=s.indexOf(from);if(i<0)throw new Error(`Expected source fragment not found: ${label}`);if(s.indexOf(from,i+from.length)>=0)throw new Error(`Source fragment is not unique: ${label}`);return s.slice(0,i)+to+s.slice(i+from.length);}
function all(s,from,to,label){if(!s.includes(from))throw new Error(`Expected source token not found: ${label}`);return s.split(from).join(to);}

for(const p of [path.join(srcFn,'index.ts'),path.join(srcFn,'power.ts'),path.join(srcFn,'week4.ts'),path.join(srcUi,'app.js'),path.join(srcUi,'index.html')]) if(!fs.existsSync(p))throw new Error(`Required 4.3.1 input missing: ${path.relative(root,p)}`);

fs.rmSync(dstFn,{recursive:true,force:true});
fs.cpSync(srcFn,dstFn,{recursive:true});
let index=read(path.join(dstFn,'index.ts'));
index=all(index,'GC-W4-V4.3-RC1','GC-W4-V4.3.1-RC1','engine identity');
index=once(index,'W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_110_60_99+V423_UI','W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_POST_W3_121_60_99+V431_UI_RESET','data version');
index=once(index,'https://rgbslb11.github.io/Synthcast-Console/v4.3/','https://rgbslb11.github.io/Synthcast-Console/v4.3.1/','console URL');
index=all(index,'w4v43-','w4v431-','session namespace');
index=once(index,'GameCast 4.3 Week 4 session not found','GameCast 4.3.1 Week 4 session not found','session not-found message');
index=all(index,'V43_POWER_LOAD','V431_POWER_LOAD','power event namespace');
index=all(index,'`V43_${c.toUpperCase()}`','`V431_${c.toUpperCase()}`','command event namespace');
index=all(index,'gamecast-week4-v4-3','gamecast-week4-v4-3-1','function log identity');
write(path.join(dstFn,'index.ts'),index);

fs.rmSync(dstUi,{recursive:true,force:true});
fs.cpSync(srcUi,dstUi,{recursive:true});
let app=read(path.join(dstUi,'app.js'));
app=once(app,'functions/v1/gamecast-week4-v4-3','functions/v1/gamecast-week4-v4-3-1','UI API binding');
app=once(app,"STORE='synthcastGameCast43Operator'","STORE='synthcastGameCast431Operator'",'UI storage namespace');
app=all(app,'GC-W4-V4.3-RC1','GC-W4-V4.3.1-RC1','UI engine identity');
const setupMarker='if(!publicView){document.getElementById(\'create\').onclick=async()=>';
const purgeFn=`async function purgeUiNewSession(){\n  if(writing)return;\n  if(!confirm('PURGE UI and start a brand-new Week 4 session? The prior cloud session will remain intact for audit.'))return;\n  const prior={slug,token,state,version,game,filter};\n  writing=true;readEpoch++;\n  try{\n    status('CREATING NEW SESSION');\n    slug='';token='';game='';filter='ALL';writeConflict=false;\n    const b=await api('create',{});\n    slug=b.public_slug;token=b.operator_token;version=b.state_version||0;state=[];\n    anchorMaster(b.master_zulu);\n    history.replaceState(null,'',location.pathname+'?session='+slug+'#operator='+token);\n    saveSession();adopt(b);render();\n    status('NEW SESSION · POWER '+(b.governance?.power_ready??0)+'/'+(b.governance?.games??state.length));\n  }catch(e){\n    slug=prior.slug;token=prior.token;state=prior.state;version=prior.version;game=prior.game;filter=prior.filter;\n    status('PURGE/NEW SESSION ERROR · '+e.message,true);\n  }finally{writing=false}\n}\n\n`;
app=once(app,setupMarker,purgeFn+setupMarker,'purge function injection');
const wire="document.getElementById('resume').onclick=()=>{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s?.slug&&s?.token){slug=s.slug;token=s.token;history.replaceState(null,'',location.pathname+'?session='+slug+'#operator='+token);load()}};document.getElementById('refresh').onclick=refresh;";
app=once(app,wire,"document.getElementById('resume').onclick=()=>{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s?.slug&&s?.token){slug=s.slug;token=s.token;history.replaceState(null,'',location.pathname+'?session='+slug+'#operator='+token);load()}};document.getElementById('purgeUi').onclick=purgeUiNewSession;document.getElementById('refresh').onclick=refresh;",'purge button wiring');
write(path.join(dstUi,'app.js'),app);

let page=read(path.join(dstUi,'index.html'));
page=all(page,'Synthcast GameCast 4.3','Synthcast GameCast 4.3.1','page title');
page=all(page,'GAMECAST 4.3','GAMECAST 4.3.1','brand');
page=once(page,'<button id="resume">RESUME LAST SESSION</button><button id="refresh">REFRESH</button>','<button id="resume">RESUME LAST SESSION</button><button class="warn" id="purgeUi">PURGE UI + NEW SESSION</button><button id="refresh">REFRESH</button>','purge control');
page=once(page,'<b>4.3 BUILD GOVERNANCE</b>','<b>4.3.1 BUILD GOVERNANCE</b>','governance identity');
page=once(page,'WEEK 4 · 55 GAMES · 110/110 POWER READY · 4.2.3 UI + 4.2.2 FOOTBALL MECHANICS','WEEK 4 · 55 GAMES · 121/121 POST-W3 POWER · 4.2.3 UI + 4.2.2 FOOTBALL MECHANICS','page subtitle');
page=once(page,'55 canonical Week 4 games from Schedule v5; all 110 participating teams carry the authorized Week 4 60–99 TEAM/OFF/DEF package and all 55 games are POWER READY.','55 canonical Week 4 games from Schedule v5; all 121 canonical teams carry the authorized post-Week-3 60–99 TEAM/OFF/DEF package. Four schedule-only FCS opponents remain governed sidecars under the Chairman 0.10x rule, and all 55 games are POWER READY. 4.3.1 isolates browser/session identity from prior sessions and adds PURGE UI + NEW SESSION.','governance corrective copy');
page=once(page,'Fresh 4.3 sessions are preloaded with the governed 110-team Week 4 60–99 power package.','Fresh 4.3.1 sessions are preloaded with the governed 121-team post-Week-3 Week 4 60–99 power package plus four schedule-only FCS sidecars.','power intake copy');
page=once(page,'<script src="app.js"></script><script src="../v4.2/patch-rc2.js"></script><script src="../v4.2.2/patch-422.js"></script><script src="patch-43.js"></script>','<script src="app.js"></script><script src="../v4.2/patch-rc2.js"></script><script src="../v4.2.2/patch-422.js"></script><script src="patch-431.js"></script>','patch binding');
write(path.join(dstUi,'index.html'),page);
write(path.join(dstUi,'patch-431.js'),"'use strict';\nengine='GC-W4-V4.3.1-RC1';\n");
if(fs.existsSync(path.join(dstUi,'patch-43.js')))fs.rmSync(path.join(dstUi,'patch-43.js'));

console.log(JSON.stringify({backend:path.relative(root,dstFn),ui:path.relative(root,dstUi),engine:'GC-W4-V4.3.1-RC1',week:'2026-W04',games:55,canonicalPowerTeams:121,scheduleFcsSidecars:4,powerReady:55,sessionNamespace:'w4v431-'},null,2));
