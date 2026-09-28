// Chairman-authorized Week 6 data rollover from the verified 4.3.2.1 baseline.
import './build-gamecast-v4321.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const A='release-assets/gamecast-v4.4.0', oldFn='supabase/functions/gamecast-week5-v4-3-2-1', fn='supabase/functions/gamecast-week6-v4-4-0', oldUi='public/v4.3.2.1', ui='public/v4.4.0';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s),sha=s=>createHash('sha256').update(s).digest('hex');
const board=JSON.parse(read(`${A}/expected-board.json`)),ratings=JSON.parse(read(`${A}/approved-team-ratings.json`)),provenance=JSON.parse(read(`${A}/provenance.json`));
assert.equal(board.length,56);assert.equal(ratings.length,121);
assert.equal(sha(read(`${A}/approved-carriage-week6.csv`)),provenance.carriageMasterWeek6SHA256);
assert.equal(sha(read(`${oldFn}/index.ts`)),'ddc2194c5137996105978b4e913f93071c067284ffa2d8ca5311bee7441874e7');
assert.equal(sha(read(`${oldUi}/app.js`)),'3b2ff41e098f553b53ad666b918d8d22e62a0e45ef3a960b85f0934e70b1ff72');
export const identity={engine:'GC-W6-V4.4.0-RC1',week:'2026-W06',function:'gamecast-week6-v4-4-0',route:'/v4.4.0/',namespace:'w6v440-',storage:'synthcastGameCast440Operator',data:`W6-56+SLATE_${provenance.carriageAttachmentSHA256.slice(0,12)}+TV_6cce5420c6fa+POST_W5_GAMECAST_v1.3_aaba3e9d9edd+CANONICAL121_FCS0+V440`,power:'SYNTHCAST-GAMECAST-W6-POST-W5-TEAM-OFF-DEF-v1.3-121-SHA256-aaba3e9d9eddb3a9dcb129dc57ff6dbae6d990ff35580ff9b4f27a550abf9a54'};
export const substitutions=[
 ['GC-W5-V4.3.2.1-RC1',identity.engine],
 ['W5-58+TV_CARRIAGE_4321_CHAIRMAN_PATCH+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V4321_UI_RESET',identity.data],
 ['2026-W05',identity.week],['/v4.3.2.1/',identity.route],['w5v4321-',identity.namespace],
 ['gamecast-week5-v4-3-2-1',identity.function],['./week5.ts','./week6.ts'],
 ['OPERATING_SLATE.length !== 58','OPERATING_SLATE.length !== 56'],['4.3.2.1 operating','4.4.0 operating'],
 ['GameCast 4.3.2.1 Week 5','GameCast 4.4.0 Week 6'],['week5_games','week6_games'],['g.canonicalWeek === "W5"','g.canonicalWeek === "W6"'],['V4321_','V440_']
];
for(const p of [fn,ui]){assert.ok(p.endsWith('4-4-0')||p.endsWith('4.4.0'));fs.mkdirSync(p,{recursive:true});}
let index=read(`${oldFn}/index.ts`);
for(const [a,b]of substitutions){assert.ok(index.includes(a),a);index=index.replaceAll(a,b);}
write(`${fn}/index.ts`,index);
let week=read(`${oldFn}/week5.ts`);
const raw=board.map(g=>[g.id,g.date,g.dateLabel,g.kickoff,g.network,g.matchup,String(g.neutral),g.kickoffOrder].join('|')).join('\n');
week=week.replace(/const RAW=`[\s\S]*?`\.trim\(\);/,()=>`const RAW=\`\n${raw}\n\`.trim();`);
week=week.replaceAll('Week5','Week6').replaceAll('WEEK5','WEEK6').replaceAll('Week 5','Week 6').replaceAll('"W5"','"W6"').replaceAll('.length!==58','.length!==56').replaceAll('.size!==58','.size!==56').replaceAll('4.3.2.1','4.4.0');
const metadataKeys=['matchupDisplay','awayDisplayName','homeDisplayName','awayRecord','homeRecord','awayRank','homeRank','weather','weatherAsOf','basis','distribution','hostTimezone'];
const metadata=Object.fromEntries(board.map(g=>[g.id,Object.fromEntries(metadataKeys.map(k=>[k,g[k]]))]));
week=week.replace('export type OperatingSlateGame=',`export const MATCHUP_METADATA:Record<string,any>=${JSON.stringify(metadata,null,2)};\n\nexport type OperatingSlateGame=`).replace('({...g,canonicalWeek:', '({...g,...MATCHUP_METADATA[g.id],canonicalWeek:');
write(`${fn}/week6.ts`,week);
let power=read(`${oldFn}/power.ts`);
power=power.replace(/export const POWER_SOURCE_VERSION="[^"]+";/,`export const POWER_SOURCE_VERSION="${identity.power}";`).replace('SCHEDULE_FCS_TEAM_COUNT=4','SCHEDULE_FCS_TEAM_COUNT=0');
const powers=ratings.map(r=>[r.Team,r.OFF,r.DEF,r.TEAM,'POST-W5 GAMECAST v1.3',''].join('|')).join('\n');
power=power.replace(/const RAW=`[\s\S]*?`\.trim\(\);/,()=>`const RAW=\`\n${powers}\n\`.trim();`);write(`${fn}/power.ts`,power);
let app=read(`${oldUi}/app.js`);
for(const[a,b]of [['gamecast-week5-v4-3-2-1',identity.function],['synthcastGameCast4321Operator',identity.storage],['GC-W5-V4.3.2.1-RC1',identity.engine],['brand-new Week 5 session','brand-new Week 6 session']]){assert.ok(app.includes(a),a);app=app.replaceAll(a,b);}write(`${ui}/app.js`,app);
let page=read(`${oldUi}/index.html`).replaceAll('4.3.2.1','4.4.0').replaceAll('patch-4321.js','patch-440.js');
page=page.replace('WEEK 5 · 58 GAMES · 121/121 POST-W4 POWER','WEEK 6 · 56 GAMES · 121/121 POST-W5 POWER');
page=page.replace(/<div class="notice operator-only">[\s\S]*?<\/div>/,'<div class="notice operator-only"><b>4.4.0 BUILD GOVERNANCE</b> · 56 approved Week 6 games with exact carriage and canonical IDs. All 121 canonical teams use the approved post-Week-5 GameCast TEAM/OFF/DEF v1.3 workbook. All 56 games are POWER READY. No Week 6 FCS overrides. Create a fresh Week 6 session and save COPY OPERATOR LINK privately. Football mechanics and Chairman controls are inherited from 4.3.2.1.</div>');
page=page.replace(/<summary>WEEK 4 POWER INTAKE<\/summary>[\s\S]*?<\/p>/,'<summary>WEEK 6 POWER INTAKE</summary><p class="sub">121/121 post-Week-5 TEAM/OFF/DEF ratings loaded from GameCast v1.3. All 56 games are POWER READY. Manual updates remain an operator control and require Chairman authorization.</p>');
page=page.replace('ALL · 55','ALL · 56');
page=page.replace(/<p class="operator-only">SCHEDULE PATCH ONLY:[\s\S]*?<\/p>/,'<p class="operator-only">WEEK 6 ROLLOVER: approved slate and post-Week-5 ratings only. Create a new session on this route and save COPY OPERATOR LINK privately; share only COPY PUBLIC LINK.</p>');
write(`${ui}/index.html`,page);write(`${ui}/patch-440.js`,`'use strict';\nengine='${identity.engine}';\n`);
fs.mkdirSync('v440-evidence',{recursive:true});
write('v440-evidence/identity.json',JSON.stringify(identity,null,2)+'\n');
write('v440-evidence/source-hashes.json',JSON.stringify(Object.fromEntries(['index.ts','week6.ts','power.ts'].map(n=>[n,sha(read(`${fn}/${n}`))])),null,2)+'\n');
console.log('PASS BUILD 4.4.0: 56 games, 112 participants, 336 scheduled rating fields; 121 canonical teams; no FCS overrides.');
