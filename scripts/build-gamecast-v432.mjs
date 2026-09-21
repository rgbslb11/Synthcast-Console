// Build isolated GameCast 4.3.2 Week 5 from the accepted 4.3.1 release.
// Do not import the separate 4.3.2.SB sandbox mechanics into this weekly release.
import './build-gamecast-v431.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root=process.cwd();
const srcFn=path.join(root,'supabase/functions/gamecast-week4-v4-3-1');
const dstFn=path.join(root,'supabase/functions/gamecast-week5-v4-3-2');
const srcUi=path.join(root,'public/v4.3.1');
const dstUi=path.join(root,'public/v4.3.2');
const week5File=path.join(root,'release-assets/gamecast-v4.3.2/week5.ts');
const powerFile=path.join(root,'release-assets/gamecast-v4.3.2/power.ts');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,'utf8');};
const blobSha=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function once(s,from,to,label){const i=s.indexOf(from);if(i<0)throw new Error(`Expected source fragment not found: ${label}`);if(s.indexOf(from,i+from.length)>=0)throw new Error(`Source fragment is not unique: ${label}`);return s.slice(0,i)+to+s.slice(i+from.length);}
function all(s,from,to,label){if(!s.includes(from))throw new Error(`Expected source token not found: ${label}`);return s.split(from).join(to);}

for(const p of [path.join(srcFn,'index.ts'),path.join(srcFn,'week4.ts'),path.join(srcFn,'power.ts'),path.join(srcUi,'app.js'),path.join(srcUi,'index.html'),week5File,powerFile]){
  if(!fs.existsSync(p))throw new Error(`Required 4.3.2 input missing: ${path.relative(root,p)}`);
}
assert.equal(blobSha(fs.readFileSync(powerFile)),'0461c9d74c4d2f1f0679baf5b6e2f54fd31cd7fb','Approved Week 5 GameCast-ready v1.2 power artifact changed');
assert.equal(blobSha(fs.readFileSync(week5File)),'48545a9b1db6b2adedc3626d2f9fc8c6bec5b529','Approved Week 5 schedule artifact changed');

fs.rmSync(dstFn,{recursive:true,force:true});
fs.cpSync(srcFn,dstFn,{recursive:true});
fs.rmSync(path.join(dstFn,'week4.ts'));
fs.copyFileSync(week5File,path.join(dstFn,'week5.ts'));
fs.copyFileSync(powerFile,path.join(dstFn,'power.ts'));
let index=read(path.join(dstFn,'index.ts'));
index=once(index,'import { OPERATING_SLATE } from "./week4.ts";','import { OPERATING_SLATE } from "./week5.ts";','week module');
index=all(index,'GC-W4-V4.3.1-RC1','GC-W5-V4.3.2-RC1','engine identity');
index=once(index,'W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_POST_W3_121_60_99+GAMECAST_V1_1_FCS60+V431_UI_RESET','W5-58+TV_CARRIAGE_V4_LOCKED+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V432_UI_RESET','data version');
index=all(index,'2026-W04','2026-W05','week key');
index=once(index,'https://rgbslb11.github.io/Synthcast-Console/v4.3.1/','https://rgbslb11.github.io/Synthcast-Console/v4.3.2/','console URL');
index=once(index,'if (OPERATING_SLATE.length !== 55) throw new Error("4.3 operating slate count mismatch");','if (OPERATING_SLATE.length !== 58) throw new Error("4.3.2 operating slate count mismatch");','create slate guard');
index=all(index,'w4v431-','w5v432-','session namespace');
index=once(index,'GameCast 4.3.1 Week 4 session not found','GameCast 4.3.2 Week 5 session not found','session not-found message');
index=all(index,'week4_games','week5_games','governance key');
index=all(index,'g.canonicalWeek === "W4"','g.canonicalWeek === "W5"','governance week');
index=all(index,'V431_POWER_LOAD','V432_POWER_LOAD','power event namespace');
index=all(index,'`V431_${c.toUpperCase()}`','`V432_${c.toUpperCase()}`','command event namespace');
index=all(index,'gamecast-week4-v4-3-1','gamecast-week5-v4-3-2','function log identity');
write(path.join(dstFn,'index.ts'),index);

fs.rmSync(dstUi,{recursive:true,force:true});
fs.cpSync(srcUi,dstUi,{recursive:true});
let app=read(path.join(dstUi,'app.js'));
app=once(app,'functions/v1/gamecast-week4-v4-3-1','functions/v1/gamecast-week5-v4-3-2','UI API binding');
app=once(app,"STORE='synthcastGameCast431Operator'","STORE='synthcastGameCast432Operator'",'UI storage namespace');
app=all(app,'GC-W4-V4.3.1-RC1','GC-W5-V4.3.2-RC1','UI engine identity');
app=all(app,'brand-new Week 4 session','brand-new Week 5 session','purge dialog week');
write(path.join(dstUi,'app.js'),app);

let page=read(path.join(dstUi,'index.html'));
page=all(page,'Synthcast GameCast 4.3.1','Synthcast GameCast 4.3.2','page title');
page=all(page,'GAMECAST 4.3.1','GAMECAST 4.3.2','brand');
page=all(page,'4.3.1 BUILD GOVERNANCE','4.3.2 BUILD GOVERNANCE','governance identity');
page=once(page,'WEEK 4 · 55 GAMES · 121/121 POST-W3 POWER · 4.2.3 UI + 4.2.2 FOOTBALL MECHANICS','WEEK 5 · 58 GAMES · 121/121 POST-W4 POWER · 4.2.3 UI + 4.2.2 FOOTBALL MECHANICS','page subtitle');
page=once(page,'55 canonical Week 4 games from Schedule v5; all 121 canonical teams carry the authorized post-Week-3 60–99 TEAM/OFF/DEF package. Four schedule-only FCS opponents have TEAM, OFF and DEF fixed at 60 by the Chairman, and all 55 games are POWER READY. 4.3.1 isolates browser/session identity from prior sessions and adds PURGE UI + NEW SESSION.','58 locked Week 5 games from the authorized carriage board; all 121 canonical teams carry the approved post-Week-4 60–99 TEAM/OFF/DEF v1.2 package. Arkansas State, Louisiana-Monroe, Toledo and Western Michigan are Schedule-v5 FCS sidecars fixed at 60/60/60, and all 58 games are POWER READY. 4.3.2 isolates browser/session identity from prior releases and adds a fresh Week 5 session namespace.','governance copy');
page=once(page,'The loaded ratings source is the approved GameCast-ready TEAM/OFF/DEF v1.1 workbook.','The loaded ratings source is the approved GameCast-ready TEAM/OFF/DEF v1.2 post-Week-4 workbook.','ratings source copy');
page=once(page,'Fresh 4.3.1 sessions are preloaded with the approved 121-team GameCast-ready v1.1 Week 4 TEAM/OFF/DEF package plus four FCS opponents at 60/60/60. Existing sessions retain their original rating snapshots; use PURGE UI + NEW SESSION to start with this package without altering prior cloud history.','Fresh 4.3.2 sessions are preloaded with the approved 121-team GameCast-ready v1.2 Week 5 TEAM/OFF/DEF package plus four Schedule-v5 FCS opponents at 60/60/60. Existing v4.3.1 Week 4 sessions retain their original rating and schedule snapshots; use PURGE UI + NEW SESSION only inside v4.3.2 to start a fresh Week 5 board.','power intake copy');
page=once(page,'<script src="app.js"></script><script src="../v4.2/patch-rc2.js"></script><script src="../v4.2.2/patch-422.js"></script><script src="patch-431.js"></script>','<script src="app.js"></script><script src="../v4.2/patch-rc2.js"></script><script src="../v4.2.2/patch-422.js"></script><script src="patch-432.js"></script>','patch binding');
write(path.join(dstUi,'index.html'),page);
write(path.join(dstUi,'patch-432.js'),"'use strict';\nengine='GC-W5-V4.3.2-RC1';\n");
if(fs.existsSync(path.join(dstUi,'patch-431.js')))fs.rmSync(path.join(dstUi,'patch-431.js'));

console.log(JSON.stringify({backend:path.relative(root,dstFn),ui:path.relative(root,dstUi),engine:'GC-W5-V4.3.2-RC1',week:'2026-W05',games:58,canonicalPowerTeams:121,scheduleFcsSidecars:4,powerReady:58,sessionNamespace:'w5v432-'},null,2));
