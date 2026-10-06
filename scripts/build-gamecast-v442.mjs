// Isolated W7 build. Existing release files are read, never edited.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {baselineSource} from './lib/gamecast-v442-harness.mjs';
import {applyFootballFixes} from '../release-assets/gamecast-v4.4.2/football-fixes.mjs';
import {applyCoinToss} from '../release-assets/gamecast-v4.4.2/coin-toss.mjs';
const assets='release-assets/gamecast-v4.4.2',parent='supabase/functions/gamecast-week6-v4-4-1';
const fn='supabase/functions/gamecast-week7-v4-4-2',ui='public/v4.4.2',evidence='outputs/v442';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s),sha=s=>createHash('sha256').update(s).digest('hex');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Source anchor: '+a.slice(0,100));return s.replace(a,()=>b);};
const original=baselineSource();
execFileSync('python',['scripts/validate-gamecast-v442-inputs.py'],{stdio:'inherit'});
const ratings=JSON.parse(read(`${assets}/inputs/W7_APPROVED_ENGINE_121.json`)).ratings;
const slate=JSON.parse(read(`${evidence}/w7-slate.json`));
const engine='GC-W7-V4.4.2-RC1',data='W7-54+RATINGS_17d9e89e108e+SLATE_481ed077d734+CANONICAL121_FCS0+V442';
const endpoint=process.env.GAMECAST_442_BACKEND_URL || 'https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week7-v4-4-2';
assert.equal(endpoint,'https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week7-v4-4-2','Use the authorized project and isolated 4.4.2 function');
for(const dir of [fn,ui,`${ui}/legacy`,`${ui}/ui1.3`])fs.mkdirSync(dir,{recursive:true});
let s=applyCoinToss(applyFootballFixes(original)).replaceAll('gamecast-week6-v4-4-1','gamecast-week7-v4-4-2');
for(const [a,b] of [['GC-W6-V4.4.1-RC1',engine],['2026-W06','2026-W07'],['./week6.ts','./week7.ts'],['/v4.4.1/','/v4.4.2/'],['w6v441-','w7v442-'],['V441_','V442_'],['gamecast_v441_','gamecast_v442_'],['commit441','commit442'],['scheduler441','scheduler442'],['4.4.1 operating','4.4.2 operating'],['GameCast 4.4.1 Week 6','GameCast 4.4.2 Week 7'],['week6_games','week7_games'],['canonicalWeek === "W6"','canonicalWeek === "W7"']]){assert.ok(s.includes(a),a);s=s.replaceAll(a,b);}
const oldData=s.match(/const DATA_VERSION = "([^"]+)";/)[1];s=s.replace(oldData,data);
for(const [a,b] of [['const SPEEDS = [1, 4, 10, 50];','const SPEEDS = [1, 4, 10, 20, 50];'],['must be 1, 4, 10, or 50','must be 1, 4, 10, 20, or 50'],['games:56,week_key','games:54,week_key'],['OPERATING_SLATE.length !== 56','OPERATING_SLATE.length !== 54'],['ids.length>56','ids.length>54'],['qaOnly:u.searchParams.get("qa")==="true"','qaOnly:true']])s=once(s,a,b);
// Approved by Chairman after independent 5,000-pair holdout, 2026-10-06.
// 2.66 is the target in score points; .006 is its approved normalized venue
// coefficient. Retain the measured 2.929-point holdout result in evidence.
s=once(s,'const CAL = {','const HOME_FIELD_TARGET_POINTS = 2.66;\nconst HOME_FIELD_NORMALIZED_EDGE = 0.006;\n\nconst CAL = {');
s=once(s,'if (!g.neutral) e += t === 1 ? .035 : -.035;','if (!g.neutral) e += t === 1 ? HOME_FIELD_NORMALIZED_EDGE : -HOME_FIELD_NORMALIZED_EDGE;');
write(`${fn}/index.ts`,s);
write(`${fn}/week7.ts`,'// Validated approved W7 input; canonical joins use exact baseline identifiers.\nexport const OPERATING_SLATE = '+JSON.stringify(slate,null,2)+';\n');
const typeLine=read(`${parent}/power.ts`).split('\n')[0];
const power=Object.fromEntries(Object.entries(ratings).sort(([a],[b])=>a.localeCompare(b)).map(([name,r])=>[name,{...r,specialTeams:null,tempo:null,sourceVersion:'W7-17d9e89e108e',flag:null,opponentBasis:null}]));
write(`${fn}/power.ts`,typeLine+'\nexport const POWER_SOURCE_VERSION="W7-17d9e89e108e";\nexport const CANONICAL_TEAM_COUNT=121;\nexport const SCHEDULE_FCS_TEAM_COUNT=0;\nexport const TEAM_POWER:Record<string,TeamPowerInput> = '+JSON.stringify(power,null,2)+';\n');
fs.copyFileSync(`${parent}/deadman.mjs`,`${fn}/deadman.mjs`);

let app=read('public/v4.4.1/app.js');
app=once(app,"const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week6-v4-4-1'","const API=globalThis.GAMECAST_V442_API");
app=app.replaceAll('synthcastGameCast441Operator','synthcastGameCast442Operator').replaceAll('GC-W6-V4.4.1-RC1',engine);
app=app.replaceAll('brand-new Week 6 session','brand-new Week 7 session').replace('// UI 4.3 retains the 4.2.3 interaction hardening and the 4.2.2 football mechanics; only Week 4 binding/identity and the authorized Week 4 power package change.','// Inherited Chairman interaction protection, isolated for GameCast 4.4.2 W7.');
app=once(app,'async function api(a,b){',"async function api(a,b){if(!API)throw new Error('4.4.2 backend is not configured');");
app=once(app,'if(publicView){root.classList.add',"if(publicView){token='';document.querySelectorAll('.operator-only').forEach(el=>el.remove());root.classList.add");
app=once(app,'function visible(g){',"function visible(g){if(!gc442TeamMatches(g,document.getElementById('teamSearch').value))return false;if(filter==='NEEDS_ACTION')return !publicView&&gc442NeedsAction(g);");
app=once(app,"return !publicView&&el?.matches(","return !publicView&&el?.id!=='teamSearch'&&el?.matches(");
app=once(app,'[1,4,10,50].map','[1,4,10,20,50].map');
app=once(app,'g.possession===0?esc(g.away.name):esc(g.home.name)',"g.possession===0?esc(g.away.name):g.possession===1?esc(g.home.name):'Kickoff pending'");
app=once(app,'tick();setInterval(tick,1000);load();',"document.getElementById('teamSearch').addEventListener('input',()=>render());tick();setInterval(tick,1000);load();");
// Reject an accidental cross-release response before adopting data or state version.
app=once(app,"if(!r.ok)throw Object.assign", "if(r.ok&&x.engine_version&&x.engine_version!=='GC-W7-V4.4.2-RC1')throw new Error('4.4.2 engine identity mismatch');if(!r.ok)throw Object.assign");
write(`${ui}/app.js`,app);
let page=read('public/v4.4.1/index.html').replaceAll('4.4.1','4.4.2').replaceAll('patch-441.js','patch-442.js').replaceAll('WEEK 6','WEEK 7').replaceAll('Week 6','Week 7').replaceAll('56','54');
page=page.replaceAll('../v4.2/app.css','legacy/app.css').replaceAll('../v4.2/patch-rc2.js','legacy/patch-rc2.js').replaceAll('../v4.2.2/patch-422.js','legacy/patch-422.js');
page=page.replaceAll('121/121 POST-W5 POWER · 4.2.3 UI + 4.2.2 FOOTBALL MECHANICS','121/121 APPROVED W7 POWER');
page=page.replaceAll('the approved post-Week-5 GameCast TEAM/OFF/DEF v1.3 workbook','the approved W7 TEAM/OFF/DEF dataset').replaceAll('post-Week-5 TEAM/OFF/DEF ratings loaded from GameCast v1.3','approved W7 TEAM/OFF/DEF ratings loaded').replaceAll('post-Week-5 ratings','approved W7 ratings').replaceAll('Football mechanics are unchanged.','Coin toss, venue adjustment, kneel safety, and halftime reset are versioned for 4.4.2.');
page=once(page,'<div class="filters">','<label class="team-search">SEARCH TEAMS <input id="teamSearch" type="search" placeholder="e.g., Tex" autocomplete="off"></label><div class="filters">');
page=once(page,'<button data-f="FINAL">FINAL</button>','<button data-f="FINAL">FINAL</button><button class="operator-only" data-f="NEEDS_ACTION">FINAL — NEEDS ACTION</button>');
page=once(page,'<script src="app.js">','<script src="release-config.js"></script><script src="list-filters.js"></script><script src="app.js">');
write(`${ui}/index.html`,page);
write(`${ui}/patch-442.js`,"'use strict';\nengine='"+engine+"';\n");
write(`${ui}/release-config.js`,'globalThis.GAMECAST_V442_API = '+JSON.stringify(endpoint)+';\n');
fs.copyFileSync(`${assets}/list-filters.js`,`${ui}/list-filters.js`);
for(const [from,to] of [['public/v4.2/app.css',`${ui}/legacy/app.css`],['public/v4.2/patch-rc2.js',`${ui}/legacy/patch-rc2.js`],['public/v4.2.2/patch-422.js',`${ui}/legacy/patch-422.js`],['public/v4.4.1/deadman.css',`${ui}/deadman.css`]])fs.copyFileSync(from,to);

// UI 1.3 is the existing Condensed surface, rebound to the same W7 session.
for(const [name,hash] of Object.entries(JSON.parse(read(`${assets}/ui13-parent-hashes.json`)).sha256))assert.equal(sha(read(`${assets}/ui13-parent/${name}`)),hash,'UI 1.3 source drift: '+name);
let condensed=read(`${assets}/ui13-parent/scoreboard.js`);
const sourceStart=condensed.indexOf('  const ROOT='),sourceEnd=condensed.indexOf('  const POLL_MS=');
assert.ok(sourceStart>=0&&sourceEnd>sourceStart);
condensed=condensed.slice(0,sourceStart)+`  const sources={
    saturday:{api:globalThis.GAMECAST_V442_API,engine:'${engine}',slug:params.get('session')||'',expected:54},
    full:{api:globalThis.GAMECAST_V442_API,engine:'${engine}',slug:params.get('session')||'',expected:54},
  };\n`+condensed.slice(sourceEnd);
condensed=condensed.replaceAll('2026-09-26','2026-10-10').replaceAll('2026-09-24','2026-10-09').replaceAll('2026-09-25','2026-10-09').replaceAll('2026-W05','2026-W07').replaceAll('WEEK 5','WEEK 7').replaceAll('GAMECAST 4.3.2.2','GAMECAST 4.4.2').replaceAll('GAMECAST 4.3.2.1','GAMECAST 4.4.2');
condensed=once(condensed,'  const matches=g=>{',"  const matches=g=>{\n    if(!gc442TeamMatches(g,document.getElementById('teamSearch').value))return false;");
condensed=once(condensed,"    try{\n      const r=await fetch", "    try{\n      if(!source.api||!source.slug)throw new Error('Open this scoreboard with a 4.4.2 session');\n      const r=await fetch");
const expectedLine=condensed.split('\n').find(x=>x.includes('const expected=key==='));assert.ok(expectedLine);
condensed=once(condensed,expectedLine,"      const expected={'2026-10-09':2,'2026-10-10':52};");
condensed=once(condensed,'  tick();setInterval(tick,1000);',"  document.getElementById('teamSearch').addEventListener('input',reconcile);\n  tick();setInterval(tick,1000);");
write(`${ui}/ui1.3/scoreboard.js`,condensed);
let html=read(`${assets}/ui13-parent/index.html`).replaceAll('Week 5','Week 7').replaceAll('WEEK 5','WEEK 7').replaceAll('DUAL ENGINE','GAMECAST 4.4.2').replaceAll('4.3.2.2','4.4.2').replaceAll('4.3.2.1','4.4.2').replaceAll('49 GAMES','52 GAMES').replaceAll('THURSDAY &amp; FRIDAY · 9 GAMES','FRIDAY · 2 GAMES').replaceAll('Connecting to both public Week 7 sessions...','Connecting to the public Week 7 session...');
html=once(html,'    <nav class="filters"','    <label class="team-search">SEARCH TEAMS <input id="teamSearch" type="search" placeholder="e.g., Tex" autocomplete="off"></label>\n    <nav class="filters"');
html=once(html,'  <script src="scoreboard.js">','  <script src="../release-config.js"></script><script src="../list-filters.js"></script>\n  <script src="scoreboard.js">');
write(`${ui}/ui1.3/index.html`,html);fs.copyFileSync(`${assets}/ui13-parent/scoreboard.css`,`${ui}/ui1.3/scoreboard.css`);
const identity={engine,week:'2026-W07',function:'gamecast-week7-v4-4-2',namespace:'w7v442-',storage:'synthcastGameCast442Operator',data,backendUrl:endpoint,deployment:'NOT DEPLOYED',qaOnly:true,hfa:{targetPoints:2.66,approvedNormalizedEdge:.006,holdoutMeanPoints:2.929},uiSurfaceCount:3,surfaces:[{name:'Public UI',route:'/v4.4.2/?view=public'},{name:'Chairman UI',route:'/v4.4.2/'},{name:'Condensed UI (UI 1.3)',route:'/v4.4.2/ui1.3/'}]};
write(`${evidence}/identity.json`,JSON.stringify(identity,null,2)+'\n');
write(`${evidence}/source-hashes.json`,JSON.stringify(Object.fromEntries(['index.ts','week7.ts','power.ts','deadman.mjs'].map(n=>[n,sha(read(`${fn}/${n}`))])),null,2)+'\n');
assert.equal(read(`${parent}/index.ts`),original,'Previous runtime changed');
console.log('PASS local 4.4.2 build: 54 W7 games, 121 teams, three UI surfaces; '+(endpoint?'configured isolated endpoint':'backend unconfigured; deployment blocked'));
