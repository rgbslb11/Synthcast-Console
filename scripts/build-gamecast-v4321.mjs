// Authorized carriage-only successor. Never modify the predecessor or sandbox.
import './build-gamecast-v432.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WEEK5 as prior} from '../release-assets/gamecast-v4.3.2/week5.ts';
const oldFn='supabase/functions/gamecast-week5-v4-3-2',fn=oldFn+'-1';
const oldUi='public/v4.3.2',ui=oldUi+'.1';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const board=read('release-assets/gamecast-v4.3.2.1/chairman-board.txt');
assert.equal(createHash('sha256').update(board).digest('hex'),'db217c7ff86d41fc3706aef50ee4a22df8013926e71e3b7a8ec28b44bcd7de50');
const alias={'Louisiana Monroe':'Louisiana-Monroe','FIU':'Florida International'};
const canon=n=>alias[n]??n;
const revised=board.trim().split('\n').map((line,i)=>{
  const cells=line.split('|');assert.equal(cells.length,4);
  const [dateLabel,kickoff,network,matchup]=cells;
  const teams=matchup.split(' at ').map(canon);assert.equal(teams.length,2);
  const found=prior.filter(g=>g.away===teams[0]&&g.home===teams[1]);assert.equal(found.length,1,matchup);
  const g=found[0];assert.equal(dateLabel,g.dateLabel,`${g.id}: date changes not authorized`);
  assert.match(kickoff,/^(?:[1-9]|1[0-2]):[0-5][0-9] (?:AM|PM)$/);
  return {...g,kickoff,network,kickoffOrder:i+1};
});
assert.equal(revised.length,58);assert.equal(new Set(revised.map(g=>g.id)).size,58);
assert.equal(new Set(revised.flatMap(g=>[g.away,g.home])).size,116);
for(const p of [fn,ui])fs.rmSync(p,{recursive:true,force:true});
fs.cpSync(oldFn,fn,{recursive:true});fs.cpSync(oldUi,ui,{recursive:true});
let week=read(`${oldFn}/week5.ts`);
const rows=revised.map(g=>[g.id,g.date,g.dateLabel,g.kickoff,g.network,g.matchup,String(g.neutral),g.kickoffOrder].join('|')).join('\n');
const start=week.indexOf('const RAW=`'),end=week.indexOf('`.trim();',start);
assert.ok(start>=0&&end>start);week=week.slice(0,start)+'const RAW=`\n'+rows+'\n'+week.slice(end);
write(`${fn}/week5.ts`,week.replaceAll('4.3.2 operating','4.3.2.1 operating'));
export const oldData='W5-58+TV_CARRIAGE_V4_LOCKED+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V432_UI_RESET';
export const dataVersion='W5-58+TV_CARRIAGE_4321_CHAIRMAN_PATCH+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V4321_UI_RESET';
const replacements=[
  [oldData,dataVersion],['GC-W5-V4.3.2-RC1','GC-W5-V4.3.2.1-RC1'],
  ['/v4.3.2/','/v4.3.2.1/'],['w5v432-','w5v4321-'],
  ['V432_','V4321_'],['gamecast-week5-v4-3-2','gamecast-week5-v4-3-2-1'],
  ['4.3.2 operating','4.3.2.1 operating'],['GameCast 4.3.2 Week','GameCast 4.3.2.1 Week']
];
let index=read(`${oldFn}/index.ts`);
for(const [a,b] of replacements){assert.ok(index.includes(a),a);index=index.replaceAll(a,b);}
write(`${fn}/index.ts`,index);
let app=read(`${oldUi}/app.js`);
for(const [a,b] of [['gamecast-week5-v4-3-2','gamecast-week5-v4-3-2-1'],['synthcastGameCast432Operator','synthcastGameCast4321Operator'],['GC-W5-V4.3.2-RC1','GC-W5-V4.3.2.1-RC1']]){assert.ok(app.includes(a),a);app=app.replaceAll(a,b);}
write(`${ui}/app.js`,app);
let page=read(`${oldUi}/index.html`).replaceAll('4.3.2','4.3.2.1').replaceAll('patch-432.js','patch-4321.js');
page=page.replace('58 locked Week 5 games from the authorized carriage board;','58 Week 5 games from the Chairman-revised 4.3.2.1 carriage board (12 matchups changed; 9 kickoff and 7 network fields);');
page=page.replace('</body>','<p class="operator-only">SCHEDULE PATCH ONLY: all TEAM/OFF/DEF ratings remain identical to v4.3.2. Existing sessions are not migrated. Create a new session on this route and save COPY OPERATOR LINK privately; share only COPY PUBLIC LINK.</p></body>');
write(`${ui}/index.html`,page);
write(`${ui}/patch-4321.js`,"'use strict';\nengine='GC-W5-V4.3.2.1-RC1';\n");fs.rmSync(`${ui}/patch-432.js`);
assert.deepEqual(fs.readFileSync(`${fn}/power.ts`),fs.readFileSync(`${oldFn}/power.ts`));
assert.equal(blob(fs.readFileSync(`${fn}/power.ts`)),'0461c9d74c4d2f1f0679baf5b6e2f54fd31cd7fb');
fs.mkdirSync('v4321-evidence',{recursive:true});
const changes=revised.flatMap(g=>{const p=prior.find(x=>x.id===g.id);return g.kickoff!==p.kickoff||g.network!==p.network?[{id:g.id,matchup:g.matchup,date:g.dateLabel,oldKickoff:p.kickoff,newKickoff:g.kickoff,oldNetwork:p.network,newNetwork:g.network}]:[];});
assert.equal(changes.length,12);assert.equal(changes.filter(c=>c.oldKickoff!==c.newKickoff).length,9);assert.equal(changes.filter(c=>c.oldNetwork!==c.newNetwork).length,7);
write('v4321-evidence/changes.json',JSON.stringify(changes,null,2));
write('v4321-evidence/schedule-58.json',JSON.stringify(revised,null,2));
const files=['index.ts','week5.ts','power.ts'].map(name=>({name,content:read(`${fn}/${name}`)}));
write('v4321-evidence/edge-payload.json',JSON.stringify({project_id:'percrnamjzetzjjuxuuw',name:'gamecast-week5-v4-3-2-1',entrypoint_path:'index.ts',verify_jwt:false,files},null,2));
write('v4321-evidence/source-hashes.json',JSON.stringify(Object.fromEntries(files.map(f=>[f.name,{gitBlob:blob(Buffer.from(f.content)),sha256:createHash('sha256').update(f.content).digest('hex')} ])),null,2));
console.log('PASS BUILD: 58 games; 116 participants; 12 carriage changes; 9 kickoff fields; 7 network fields; ratings byte-identical.');
