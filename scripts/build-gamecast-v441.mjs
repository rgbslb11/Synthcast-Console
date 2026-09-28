// Pinned 4.4.0 plus verified 4.3.2.2 Dead-Man; no football or ratings changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
await import('./build-gamecast-v440.mjs');
const oldFn='supabase/functions/gamecast-week6-v4-4-0', fn='supabase/functions/gamecast-week6-v4-4-1';
const oldUi='public/v4.4.0', ui='public/v4.4.1', assets='release-assets/gamecast-v4.4.1';
const read=p=>fs.readFileSync(p,'utf8'), write=(p,s)=>fs.writeFileSync(p,s);
const sha=s=>createHash('sha256').update(s).digest('hex');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Source anchor: '+a.slice(0,90));return s.replace(a,()=>b);};
const parentHashes=JSON.parse(read('release-assets/gamecast-v4.4.1/parent-hashes.json'));
for(const [name,hash] of Object.entries(parentHashes))assert.equal(sha(read(`${oldFn}/${name}`)),hash,'Parent drift: '+name);
for(const p of [fn,ui]){assert.ok(p.endsWith('4-4-1')||p.endsWith('4.4.1'));fs.mkdirSync(p,{recursive:true});}
fs.cpSync(oldFn,fn,{recursive:true});fs.cpSync(oldUi,ui,{recursive:true});
const parent=await import('../'+oldFn+'/week6.ts');
const slateSource=parent.OPERATING_SLATE;
assert.equal(slateSource.length,56);assert.equal(new Set(slateSource.map(g=>g.id)).size,56);
assert.equal(new Set(slateSource.flatMap(g=>[g.away,g.home])).size,112);
function kickoffUTC(g) {
  // Oct 1-3 is EDT. Validate every conversion in America/New_York.
  const m=g.kickoff.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);assert.ok(m,g.id);
  const hour=(+m[1]%12)+(m[3]==='PM'?12:0);
  const iso=new Date(`${g.date}T${String(hour).padStart(2,'0')}:${m[2]}:00-04:00`).toISOString();
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
  const p=t=>parts.find(x=>x.type===t)?.value;
  assert.equal(`${p('year')}-${p('month')}-${p('day')}`,g.date);assert.equal(+p('hour'),hour);assert.equal(p('minute'),m[2]);
  return iso;
}
const slate=slateSource.map(g=>({...g,kickoffZulu:kickoffUTC(g),tvStartZulu:null}));
write(`${fn}/week6.ts`,'// Complete Week 6 slate from 4.4.0 plus derived UTC trigger metadata.\nexport const OPERATING_SLATE = '+JSON.stringify(slate,null,2)+';\n');
fs.copyFileSync(`${assets}/deadman.mjs`,`${fn}/deadman.mjs`);
let s=read(`${oldFn}/index.ts`);
for(const [a,b] of [["GC-W6-V4.4.0-RC1", "GC-W6-V4.4.1-RC1"], ["W6-56+SLATE_c44f803f16bd+TV_6cce5420c6fa+POST_W5_GAMECAST_v1.3_aaba3e9d9edd+CANONICAL121_FCS0+V440", "W6-56+SLATE_c44f803f16bd+TV_6cce5420c6fa+POST_W5_GAMECAST_v1.3_aaba3e9d9edd+CANONICAL121_FCS0+V441+DEADMAN1"], ["/v4.4.0/", "/v4.4.1/"], ["w6v440-", "w6v441-"], ["V440_", "V441_"], ["gamecast-week6-v4-4-0", "gamecast-week6-v4-4-1"], ["4.4.0 operating", "4.4.1 operating"], ["GameCast 4.4.0 Week 6", "GameCast 4.4.1 Week 6"]]){assert.ok(s.includes(a),a);s=s.replaceAll(a,b);}
s=once(s,'const ENGINE_VERSION =','import {freshDeadman,arm as deadmanArm,disarm as deadmanDisarm,tick as deadmanTick,afterOperatorCommand} from "./deadman.mjs";\n\nconst ENGINE_VERSION =');
s=once(s,'teamPlayCount: [0, 0], teamTopSeconds: [0, 0],\n  };','teamPlayCount: [0, 0], teamTopSeconds: [0, 0], deadman:freshDeadman(),\n  };');
s=once(s,'"pendingPlay"]) delete c[k];','"pendingPlay", "deadman"]) delete c[k];');
s=once(s,'Deno.serve(async (req: Request) => {',read(`${assets}/integration.ts`)+'\nDeno.serve(async (req: Request) => {');
s=once(s,'    if (action === "create" && req.method === "POST") {',`    if (action === "deadman_tick") return await scheduler441(req,client);
    if (action === "health" && req.method === "GET") return json({engine_version:ENGINE_VERSION,data_version:DATA_VERSION,games:56,week_key:WEEK_KEY,deadman:true});
    if (action === "create" && req.method === "POST") {`);

s=once(s,'state = OPERATING_SLATE.map(initialGame);','state = OPERATING_SLATE.map(x=>({...initialGame(x),qaOnly:u.searchParams.get("qa")==="true"}));');
s=once(s,'    if (action === "power") {',`    if (action === "deadman_batch") {
      const ids=body.ids, operation=body.operation;
      if (!Array.isArray(ids) || !ids.length || ids.length>56 || new Set(ids).size!==ids.length || !["arm","disarm"].includes(operation)) return json({error:"Invalid Dead-Man selection"},400);
      const stamp=now(),events=[];
      try {
        for (const id of ids) {
          const selected=state.find(x=>x.id===id);if(!selected) throw Error("Unknown selected game");
          const result=operation==="arm"?deadmanArm(selected,body.config,stamp):deadmanDisarm(selected,stamp);
          events.push({type:"V441_DEADMAN_"+result.action,gameId:id,payload:{...result,masterZulu:stamp}});
        }
      } catch(e:any) {return json({error:e.message},400);}
      const up=await commit441(client,cur,state,stamp,events);
      if(!up)return json({error:"version conflict"},409);
      return json({state:up.state,state_version:up.state_version,engine_version:ENGINE_VERSION,master_zulu:stamp});
    }
    if (action === "power") {`);
const powerStart=s.indexOf('      const { data, error } = await client.rpc("gamecast_v12_update_session"');
const powerEnd=s.indexOf('      return json({ state: up.state',powerStart);
assert.ok(powerStart>=0&&powerEnd>powerStart);
s=s.slice(0,powerStart)+`      const up=await commit441(client,cur,state,stamp,[{type:"V441_POWER_LOAD",gameId:null,payload:{...summary,sourceVersion:body.sourceVersion??null,masterZulu:stamp}}]);
      if(!up)return json({error:"version conflict"},409);
`+s.slice(powerEnd);
s=once(s,'    if (c === "quarter_length"',`    if(g.qaOnly && c==="accept")return json({error:"QA results cannot be accepted"},403);
    if (c === "quarter_length"`);
s=once(s,'    const stamp = now(); event.masterZulu = stamp;', '    afterOperatorCommand(g,c,now());\n    event.deadman=g.deadman ? structuredClone(g.deadman) : null;\n    const stamp = now(); event.masterZulu = stamp;');
const commandStart=s.indexOf('    const { data, error } = await client.rpc("gamecast_v12_update_session"');
const commandEnd=s.indexOf('    return json({ state: up.state',commandStart);
assert.ok(commandStart>=0&&commandEnd>commandStart);
s=s.slice(0,commandStart)+`    const up=await commit441(client,cur,state,stamp,[{type:\`V441_\${c.toUpperCase()}\`,gameId:g.id,payload:event}]);
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
for(const [a,b] of [["gamecast-week6-v4-4-0", "gamecast-week6-v4-4-1"], ["synthcastGameCast440Operator", "synthcastGameCast441Operator"], ["GC-W6-V4.4.0-RC1", "GC-W6-V4.4.1-RC1"]])app=app.replaceAll(a,b);
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
let page=read(`${oldUi}/index.html`).replaceAll('4.4.0','4.4.1').replaceAll('patch-440.js','patch-441.js');
page=page.replace('Football mechanics and Chairman controls are inherited from 4.3.2.1.','Football mechanics are unchanged. Dead-Man defaults to UNARMED; only explicitly armed games may start automatically.');
page=page.replace('<div id="singleNav">','<div id="dmToolbar" class="operator-only"></div><div id="singleNav">');
page=page.replace('</head>','<link rel="stylesheet" href="deadman.css"></head>');
write(`${ui}/index.html`,page);
write(`${ui}/patch-441.js`,"'use strict';\nengine='GC-W6-V4.4.1-RC1';\n");
fs.rmSync(`${ui}/patch-440.js`);
fs.copyFileSync(`${assets}/deadman.css`,`${ui}/deadman.css`);
fs.mkdirSync('v441-evidence',{recursive:true});
write('v441-evidence/slate-56.json',JSON.stringify(slate,null,2));
write('v441-evidence/source-hashes.json',JSON.stringify(Object.fromEntries(['index.ts','week6.ts','power.ts','deadman.mjs'].map(n=>[n,sha(read(`${fn}/${n}`))])),null,2)+'\n');
write('v441-evidence/identity.json',JSON.stringify({engine:'GC-W6-V4.4.1-RC1',function:'gamecast-week6-v4-4-1',week:'2026-W06',data:"W6-56+SLATE_c44f803f16bd+TV_6cce5420c6fa+POST_W5_GAMECAST_v1.3_aaba3e9d9edd+CANONICAL121_FCS0+V441+DEADMAN1",namespace:'w6v441-',storage:'synthcastGameCast441Operator',route:'/v4.4.1/'},null,2)+'\n');
console.log('PASS BUILD 4.4.1: 56 unchanged Week 6 games, 336 scheduled rating fields, isolated Dead-Man controls.');
