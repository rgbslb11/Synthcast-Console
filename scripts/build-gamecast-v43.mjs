import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const srcFn=path.join(root,'supabase/functions/gamecast-week3-v4-2-2');
const dstFn=path.join(root,'supabase/functions/gamecast-week4-v4-3');
const srcUi=path.join(root,'public/v4.2.3');
const dstUi=path.join(root,'public/v4.3');
const week4Source=path.join(root,'release-assets/gamecast-v4.3/week4.ts');
const week4Power=path.join(root,'release-assets/gamecast-v4.3/power.ts');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,'utf8');};
function once(s,from,to,label){
  const i=s.indexOf(from);
  if(i<0)throw new Error(`Expected source fragment not found: ${label}`);
  if(s.indexOf(from,i+from.length)>=0)throw new Error(`Source fragment is not unique: ${label}`);
  return s.slice(0,i)+to+s.slice(i+from.length);
}
function all(s,from,to,label){
  if(!s.includes(from))throw new Error(`Expected source token not found: ${label}`);
  return s.split(from).join(to);
}

for(const p of [path.join(srcFn,'index.ts'),path.join(srcFn,'week3.ts'),path.join(srcUi,'app.js'),path.join(srcUi,'index.html'),week4Source,week4Power]){
  if(!fs.existsSync(p))throw new Error(`Required 4.3 build input missing: ${path.relative(root,p)}`);
}

// Backend: copy the accepted 4.2.2 football engine used by the 4.2.3 UI, then change weekly identity/binding and load the authorized Week 4 power sidecar.
fs.rmSync(dstFn,{recursive:true,force:true});
fs.cpSync(srcFn,dstFn,{recursive:true});
fs.rmSync(path.join(dstFn,'week3.ts'));
fs.copyFileSync(week4Source,path.join(dstFn,'week4.ts'));
fs.copyFileSync(week4Power,path.join(dstFn,'power.ts'));
let index=read(path.join(dstFn,'index.ts'));
index=once(index,'import { OPERATING_SLATE } from "./week3.ts";','import { OPERATING_SLATE } from "./week4.ts";','week module');
index=all(index,'GC-W3-V4.2.2-RC1','GC-W4-V4.3-RC1','engine identity');
index=once(index,'W3-51+W2-G0021+POWER_60_99_V422+PERIOD_STATE_FIX+PLAYVOL_CAL_2500','W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_110_60_99+V423_UI','data version');
index=all(index,'2026-W03','2026-W04','week key');
index=once(index,'https://rgbslb11.github.io/Synthcast-Console/v4.2.2/','https://rgbslb11.github.io/Synthcast-Console/v4.3/','console URL');
index=once(index,'if (OPERATING_SLATE.length !== 52) throw new Error("4.2.2 operating slate count mismatch");','if (OPERATING_SLATE.length !== 55) throw new Error("4.3 operating slate count mismatch");','create slate guard');
index=all(index,'w3v422-','w4v43-','session namespace');
index=once(index,'GameCast 4.2.2 Week 3 session not found','GameCast 4.3 Week 4 session not found','session not-found message');
index=once(index,'governance: { games: state.length, week3_games: state.filter(g => g.canonicalWeek === "W3").length, week2_carryovers: state.filter(g => g.canonicalWeek === "W2").length, power_ready: state.filter(g => g.powerReady).length }','governance: { games: state.length, week4_games: state.filter(g => g.canonicalWeek === "W4").length, power_ready: state.filter(g => g.powerReady).length }','create governance');
index=once(index,'governance: { games: state.length, week3_games: state.filter(g => g.canonicalWeek === "W3").length, week2_carryovers: state.filter(g => g.canonicalWeek === "W2").length, power_ready: ready, power_pending: state.length - ready }','governance: { games: state.length, week4_games: state.filter(g => g.canonicalWeek === "W4").length, power_ready: ready, power_pending: state.length - ready }','read governance');
index=all(index,'V422_POWER_LOAD','V43_POWER_LOAD','power event namespace');
index=all(index,'`V422_${c.toUpperCase()}`','`V43_${c.toUpperCase()}`','command event namespace');
index=all(index,'gamecast-week3-v4-2-2','gamecast-week4-v4-3','function log identity');
write(path.join(dstFn,'index.ts'),index);

// UI: exact 4.2.3 interaction behavior, rebound to the isolated Week 4 / 4.3 backend and storage namespace.
fs.rmSync(dstUi,{recursive:true,force:true});
fs.cpSync(srcUi,dstUi,{recursive:true});
let app=read(path.join(dstUi,'app.js'));
app=once(app,'functions/v1/gamecast-week3-v4-2-2','functions/v1/gamecast-week4-v4-3','UI API binding');
app=once(app,"STORE='synthcastGameCast422Operator'","STORE='synthcastGameCast43Operator'",'UI storage namespace');
app=all(app,'GC-W3-V4.2.2-RC1','GC-W4-V4.3-RC1','UI default engine identity');
app=once(app,'// UI 4.2.3 retains the 4.2.2 backend, engine identity and session storage.','// UI 4.3 retains the 4.2.3 interaction hardening and the 4.2.2 football mechanics; only Week 4 binding/identity and the authorized Week 4 power package change.','UI provenance comment');
write(path.join(dstUi,'app.js'),app);
let page=read(path.join(dstUi,'index.html'));
page=all(page,'Synthcast GameCast 4.2.3','Synthcast GameCast 4.3','page title');
page=all(page,'GAMECAST 4.2.3','GAMECAST 4.3','brand');
page=once(page,'WEEK 3 + W2 CARRYOVER · 60–99 POWER RELEASE · 4.2 RC3 MECHANICS FROZEN','WEEK 4 · 55 GAMES · 110/110 POWER READY · 4.2.3 UI + 4.2.2 FOOTBALL MECHANICS','page subtitle');
const oldNotice='<div class="notice operator-only"><b>4.2.3 BUILD GOVERNANCE</b> · 52-game operating slate: 51 canonical Week 3 games plus G0021 SMU at Florida State as a canonical Week 2 carryover. 104/104 participating teams carry Chairman-approved 60–99 TEAM/OFF/DEF ratings. 4.2 RC3 play/timing calibration, ratings, uncertainty, continuation-seed, Delay, Chairman Edit, and acceleration mechanics remain unchanged. 4.2.3 protects active edit forms and focused controls during background synchronization. Uses the existing 4.2.2 cloud engine and sessions. <a href="../v4.2.1/review.html">OPEN POWER REVIEW</a>.</div>';
const newNotice='<div class="notice operator-only"><b>4.3 BUILD GOVERNANCE</b> · 55 canonical Week 4 games from Schedule v5; all 110 participating teams carry the authorized Week 4 60–99 TEAM/OFF/DEF package and all 55 games are POWER READY. Four Schedule-v5 FCS opponents use the Chairman 0.10x-above-floor rule. G0142 is definitively Colorado at Northwestern in Schedule v5; only its TV carriage remains BLOCKED because the quarantined carriage row says Colorado at Nebraska, so kickoff/network remain TBD pending upstream authority. Football/play/timing logic is unchanged from the 4.2.2 cloud engine, and Chairman interaction hardening is unchanged from the 4.2.3 UI. <a href="../v4.2.1/review.html">OPEN POWER REVIEW</a>.</div>';
page=once(page,oldNotice,newNotice,'governance notice');
page=once(page,'<summary>WEEK 3 POWER INTAKE</summary><p class="sub">Cloud session is preloaded with the 4.2.2 Week 3 power package. Manual updates remain an operator control and should only be used when explicitly authorized.</p>','<summary>WEEK 4 POWER INTAKE</summary><p class="sub">Fresh 4.3 sessions are preloaded with the governed 110-team Week 4 60–99 power package. All 55 games are POWER READY. Manual updates remain an operator control and should only be used when explicitly authorized.</p>','power intake copy');
page=once(page,'<button data-f="ALL" class="active">ALL · 52</button>','<button data-f="ALL" class="active">ALL · 55</button>','all-game count');
page=once(page,'<script src="app.js"></script><script src="../v4.2/patch-rc2.js"></script><script src="../v4.2.2/patch-422.js"></script>','<script src="app.js"></script><script src="../v4.2/patch-rc2.js"></script><script src="../v4.2.2/patch-422.js"></script><script src="patch-43.js"></script>','4.3 identity patch');
write(path.join(dstUi,'index.html'),page);
write(path.join(dstUi,'patch-43.js'),"'use strict';\n// Week 4 release identity after the preserved 4.2.2 presentation patch.\nengine='GC-W4-V4.3-RC1';\n");

console.log(JSON.stringify({backend:path.relative(root,dstFn),ui:path.relative(root,dstUi),engine:'GC-W4-V4.3-RC1',week:'2026-W04',games:55,powerTeams:110,powerReady:55},null,2));
