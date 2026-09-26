// Exact 4.3.2.1 successor: Saturday subset plus Dead-Man control, no football retuning.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
if (!process.argv.includes('--from-built-parent')) await import('./build-gamecast-v4321.mjs');
const oldFn='supabase/functions/gamecast-week5-v4-3-2-1', fn='supabase/functions/gamecast-week5-saturday-v4-3-2-2';
const oldUi='public/v4.3.2.1', ui='public/v4.3.2.2', assets='release-assets/gamecast-v4.3.2.2';
const read=p=>fs.readFileSync(p,'utf8'), write=(p,s)=>fs.writeFileSync(p,s);
const sha=s=>createHash('sha256').update(s).digest('hex');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Source anchor: '+a.slice(0,90));return s.replace(a,()=>b);};
for (const [name,hash] of Object.entries({'index.ts':'ddc2194c5137996105978b4e913f93071c067284ffa2d8ca5311bee7441874e7','week5.ts':'502f5834264cc9c2f6c92bee5a524b2904f5f649b7c6021d612e4f7871bebc1f','power.ts':'9431673087d29ab2733980194fc354562fab2b2ebe29ac3f62f4f14aa49a4c9f'})) assert.equal(sha(read(`${oldFn}/${name}`)),hash,'Parent source drift: '+name);
for (const p of [fn,ui]) fs.rmSync(p,{recursive:true,force:true});
fs.cpSync(oldFn,fn,{recursive:true});fs.cpSync(oldUi,ui,{recursive:true});
const parent=await import('../'+oldFn+'/week5.ts');
const saturday=parent.OPERATING_SLATE.filter(g=>g.date==='2026-09-26');
assert.equal(saturday.length,49);assert.equal(new Set(saturday.map(g=>g.id)).size,49);
assert.equal(new Set(saturday.flatMap(g=>[g.away,g.home])).size,98);
function kickoffUTC(g) {
  // Source board explicitly says Kickoffs: ET. This release contains September 26 only.
  const m=g.kickoff.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);assert.ok(m,g.id);
  const hour=(+m[1]%12)+(m[3]==='PM'?12:0);
  const iso=new Date(`${g.date}T${String(hour).padStart(2,'0')}:${m[2]}:00-04:00`).toISOString();
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
  const p=t=>parts.find(x=>x.type===t)?.value;
  assert.equal(`${p('year')}-${p('month')}-${p('day')}`,g.date);assert.equal(+p('hour'),hour);assert.equal(p('minute'),m[2]);
  return iso;
}
const slate=saturday.map(g=>({...g,kickoffZulu:kickoffUTC(g),tvStartZulu:null}));
write(`${fn}/week5.ts`,'// Saturday subset of pinned 4.3.2.1. Original identities, order, kickoff and networks preserved.\nexport const OPERATING_SLATE = '+JSON.stringify(slate,null,2)+';\n');
fs.copyFileSync(`${assets}/deadman.mjs`,`${fn}/deadman.mjs`);
let s=read(`${oldFn}/index.ts`);
for (const [a,b] of [['GC-W5-V4.3.2.1-RC1','GC-W5-SAT-V4.3.2.2-RC1'],['W5-58+TV_CARRIAGE_4321_CHAIRMAN_PATCH+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V4321_UI_RESET','W5-SATURDAY-49+TV_CARRIAGE_4321+POWER_W5_POST_W4_121_60_99+FCS60+DEADMAN1+UI4322'],['/v4.3.2.1/','/v4.3.2.2/'],['w5v4321-','w5satv4322-'],['V4321_','V4322_'],['gamecast-week5-v4-3-2-1','gamecast-week5-saturday-v4-3-2-2'],['4.3.2.1 operating','4.3.2.2 Saturday operating'],['GameCast 4.3.2.1 Week 5','GameCast 4.3.2.2 Week 5 Saturday']]) {assert.ok(s.includes(a),a);s=s.replaceAll(a,b);}
s=once(s,'const ENGINE_VERSION =','import {freshDeadman,arm as deadmanArm,disarm as deadmanDisarm,tick as deadmanTick,afterOperatorCommand} from "./deadman.mjs";\n\nconst ENGINE_VERSION =');
s=once(s,'teamPlayCount: [0, 0], teamTopSeconds: [0, 0],\n  };','teamPlayCount: [0, 0], teamTopSeconds: [0, 0], deadman:freshDeadman(),\n  };');
s=once(s,'"pendingPlay"]) delete c[k];','"pendingPlay", "deadman"]) delete c[k];');
s=once(s,'Deno.serve(async (req: Request) => {',read(`${assets}/integration.ts`)+'\nDeno.serve(async (req: Request) => {');
s=once(s,'    if (action === "create" && req.method === "POST") {',`    if (action === "deadman_tick") return await scheduler4322(req,client);
    if (action === "health" && req.method === "GET") return json({engine_version:ENGINE_VERSION,data_version:DATA_VERSION,games:49,week_key:WEEK_KEY,saturdayOnly:true});
    if (action === "create" && req.method === "POST") {`);
s=s.replace('OPERATING_SLATE.length !== 58','OPERATING_SLATE.length !== 49');
s=once(s,'state = OPERATING_SLATE.map(initialGame);','state = OPERATING_SLATE.map(x=>({...initialGame(x),qaOnly:u.searchParams.get("qa")==="true"}));');
s=once(s,'    if (action === "power") {',`    if (action === "deadman_batch") {
      const ids=body.ids, operation=body.operation;
      if (!Array.isArray(ids) || !ids.length || ids.length>49 || new Set(ids).size!==ids.length || !["arm","disarm"].includes(operation)) return json({error:"Invalid Dead-Man selection"},400);
      const stamp=now(),events=[];
      try {
        for (const id of ids) {
          const selected=state.find(x=>x.id===id);if(!selected) throw Error("Unknown selected game");
          const result=operation==="arm"?deadmanArm(selected,body.config,stamp):deadmanDisarm(selected,stamp);
          events.push({type:"V4322_DEADMAN_"+result.action,gameId:id,payload:{...result,masterZulu:stamp}});
        }
      } catch(e:any) {return json({error:e.message},400);}
      const up=await commit4322(client,cur,state,stamp,events);
      if(!up)return json({error:"version conflict"},409);
      return json({state:up.state,state_version:up.state_version,engine_version:ENGINE_VERSION,master_zulu:stamp});
    }
    if (action === "power") {`);
const powerStart=s.indexOf('      const { data, error } = await client.rpc("gamecast_v12_update_session"');
const powerEnd=s.indexOf('      return json({ state: up.state',powerStart);
assert.ok(powerStart>=0&&powerEnd>powerStart);
s=s.slice(0,powerStart)+`      const up=await commit4322(client,cur,state,stamp,[{type:"V4322_POWER_LOAD",gameId:null,payload:{...summary,sourceVersion:body.sourceVersion??null,masterZulu:stamp}}]);
      if(!up)return json({error:"version conflict"},409);
`+s.slice(powerEnd);
s=once(s,'    if (c === "quarter_length"',`    if(g.qaOnly && c==="accept")return json({error:"QA results cannot be accepted"},403);
    if (c === "quarter_length"`);
s=once(s,'    const stamp = now(); event.masterZulu = stamp;', '    afterOperatorCommand(g,c,now());\n    event.deadman=g.deadman ? structuredClone(g.deadman) : null;\n    const stamp = now(); event.masterZulu = stamp;');
const commandStart=s.indexOf('    const { data, error } = await client.rpc("gamecast_v12_update_session"');
const commandEnd=s.indexOf('    return json({ state: up.state',commandStart);
assert.ok(commandStart>=0&&commandEnd>commandStart);
s=s.slice(0,commandStart)+`    const up=await commit4322(client,cur,state,stamp,[{type:\`V4322_\${c.toUpperCase()}\`,gameId:g.id,payload:event}]);
    if(!up)return json({error:"version conflict"},409);
`+s.slice(commandEnd);
write(`${fn}/index.ts`,s);
// All football functions/constant blocks remain byte-identical; only control/persistence glue changes.
const inherited=read(`${oldFn}/index.ts`);
for(const [a,b] of [['const CAL =','const cors ='],['function seedWords','function initialGame'],['function score(','function publicGame'],['const confirmReq','Deno.serve']]) {
  const original=inherited.slice(inherited.indexOf(a),inherited.indexOf(b));
  assert.ok(s.includes(original),'Football/control block changed: '+a);
}
assert.equal(read(`${fn}/power.ts`),read(`${oldFn}/power.ts`));
let app=read(`${oldUi}/app.js`);
for(const [a,b] of [['gamecast-week5-v4-3-2-1','gamecast-week5-saturday-v4-3-2-2'],['synthcastGameCast4321Operator','synthcastGameCast4322SaturdayOperator'],['GC-W5-V4.3.2.1-RC1','GC-W5-SAT-V4.3.2.2-RC1']])app=app.replaceAll(a,b);
app=once(app,"+run+ctl+'</article>'","+run+ctl+dmCard(g)+'</article>'");
app=once(app,"function anchorMaster(x){","function anchorMaster(x){dmLastSync=Date.now();");
app=once(app,
  "if(card.dataset.game!==releaseId&&(card.querySelector('.edit-panel')||card.contains(focus)))protectedCards.add(card);",
  "if(card.dataset.game!==releaseId&&(card.querySelector('.edit-panel')||card.contains(focus)||card.querySelector('.dm-box details[open]')))protectedCards.add(card);"
);
app=once(app,
  "return !publicView&&(!!document.querySelector('#grid .edit-panel')||!!focusedControl());",
  "return !publicView&&(!!document.querySelector('#grid .edit-panel')||!!focusedControl()||!!document.querySelector('#grid .dm-box details[open]'));"
);
// UI helpers are loaded before the inherited app invokes render/load.
app=read(`${assets}/ui.js`)+ '\n'+app;
write(`${ui}/app.js`,app);
let page=read(`${oldUi}/index.html`).replaceAll('4.3.2.1','4.3.2.2').replaceAll('patch-4321.js','patch-4322.js');
page=page.replace('WEEK 5 \u00b7 58 GAMES','WEEK 5 - SATURDAY ONLY \u00b7 49 GAMES');
page=page.replace(/<div class="notice operator-only">[\s\S]*?<\/div>/,'<div class="notice operator-only"><b>4.3.2.2 BUILD GOVERNANCE</b> - WEEK 5 - SATURDAY ONLY. Exactly 49 Saturday games, unchanged 4.3.2.1 kickoff times (ET), networks and identities. All 121 canonical post-W4 TEAM/OFF/DEF ratings and four FCS-60 sidecars retained. Dead-Man defaults to UNARMED. Existing sessions and results are not migrated.</div>');
page=page.replace(/<summary>WEEK 4 POWER INTAKE<\/summary>[\s\S]*?<\/p>/,'<summary>WEEK 5 POWER INTAKE</summary><p class="sub">121/121 POST-W4 POWER. 49/49 Saturday games POWER READY. Ratings unchanged from 4.3.2.1. Manual power changes require Chairman authorization.</p>');
page=page.replace('ALL \u00b7 55','ALL \u00b7 49');
page=page.replace(/<p class="operator-only">SCHEDULE PATCH ONLY:[\s\S]*?<\/p>/,'');
page=page.replace('<div id="singleNav">','<div id="dmToolbar" class="operator-only"></div><div id="singleNav">');
page=page.replace('</head>','<link rel="stylesheet" href="deadman.css"></head>');
write(`${ui}/index.html`,page);
write(`${ui}/patch-4322.js`,"'use strict';\nengine='GC-W5-SAT-V4.3.2.2-RC1';\n");
fs.rmSync(`${ui}/patch-4321.js`);
fs.copyFileSync(`${assets}/deadman.css`,`${ui}/deadman.css`);
fs.mkdirSync('v4322-evidence',{recursive:true});
write('v4322-evidence/saturday-49.json',JSON.stringify(slate,null,2));
write('v4322-evidence/manifest.json',JSON.stringify({parentCommit:'e6dbe1107ecb6542d41d156246f2209da31ca6c4',engine:'GC-W5-SAT-V4.3.2.2-RC1',games:49,participants:98,canonicalTeams:121,allPowerRows:125,scheduledRatingFields:294,powerSha256:sha(read(`${fn}/power.ts`)),files:Object.fromEntries(['index.ts','week5.ts','power.ts','deadman.mjs'].map(n=>[n,sha(read(`${fn}/${n}`))]))},null,2));
console.log('PASS BUILD 4.3.2.2: 49 Saturday games; 98 participants; 294 scheduled rating fields; all 375 stored rating fields unchanged.');
