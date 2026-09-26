// Week 6 preparation branch: roll forward GameCast 4.3.2.1 and overlay Dead-Man Fallback.
// IMPORTANT: this builder intentionally produces a W5-lineage QA integration fixture until the Chairman supplies
// the canonical Week 6 slate and post-Week-5 power package. It must not be deployed or represented as Week 6 data.
import './build-gamecast-v4321.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const srcFn='supabase/functions/gamecast-week5-v4-3-2-1';
const dstFn='supabase/functions/gamecast-week5-v4-3-2-1-deadman-qa';
const srcUi='public/v4.3.2.1';
const dstUi='public/v4.3.2.1-deadman-qa';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(new URL('.',new URL('file://'+process.cwd()+'/'+p)).pathname,{recursive:true});fs.writeFileSync(p,s,'utf8');};
const once=(s,a,b,label)=>{assert.equal(s.split(a).length,2,`Expected unique fragment: ${label}`);return s.replace(a,b)};
const all=(s,a,b,label)=>{assert.ok(s.includes(a),`Expected token: ${label}`);return s.split(a).join(b)};

for(const p of [srcFn,srcUi,'deadman/controller.mjs'])assert.ok(fs.existsSync(p),`Missing ${p}`);
for(const p of [dstFn,dstUi])fs.rmSync(p,{recursive:true,force:true});
fs.cpSync(srcFn,dstFn,{recursive:true});
fs.cpSync(srcUi,dstUi,{recursive:true});
fs.copyFileSync('deadman/controller.mjs',`${dstFn}/deadman-controller.mjs`);

let index=read(`${dstFn}/index.ts`);
index=once(index,
  'import { TEAM_POWER, type TeamPowerInput } from "./power.ts";',
  'import { TEAM_POWER, type TeamPowerInput } from "./power.ts";\nimport { freshDeadman, armDeadman, disarmDeadman, tickDeadman,noteOperatorCommand,resetDeadman } from "./deadman-controller.mjs";',
  'deadman import');
index=all(index,'GC-W5-V4.3.2.1-RC1','GC-W5-V4.3.2.1-DMF1-QA','QA engine identity');
index=all(index,'w5v4321-','qa-w5v4321-dmf-','QA namespace');
index=all(index,'V4321_','V4321_DMF_','QA event namespace');
index=all(index,'gamecast-week5-v4-3-2-1','gamecast-week5-v4-3-2-1-deadman-qa','QA function identity');
index=once(index,
  'strategyMode: "NORMAL", lastPlay: "Ready for launch",\n    teamPlayCount: [0, 0], teamTopSeconds: [0, 0],',
  'strategyMode: "NORMAL", lastPlay: "Ready for launch",\n    kickoffZulu: s.kickoffZulu ?? null, tvStartZulu: s.tvStartZulu ?? null, deadman: freshDeadman(), controlOrigin: null,\n    teamPlayCount: [0, 0], teamTopSeconds: [0, 0],',
 'initial deadman state');
index=once(index,
  'teamPlayCount: [0, 0], teamTopSeconds: [0, 0] });',
  'teamPlayCount: [0, 0], teamTopSeconds: [0, 0] }); resetDeadman(g);',
  'reset deadman state');
index=once(index,
  'for (const k of ["seedHex", "rngState", "runHistory", "history", "awayPower", "homePower", "editSnapshot", "editResume", "pendingPlay"]) delete c[k];',
  'for (const k of ["seedHex", "rngState", "runHistory", "history", "awayPower", "homePower", "editSnapshot", "editResume", "pendingPlay", "deadman", "controlOrigin"]) delete c[k];',
  'public deadman redaction');

const tickBlock=`\n    if (action === "deadman_tick" && req.method === "POST") {\n      const expectedSecret = Deno.env.get("GAMECAST_DEADMAN_CRON_SECRET") ?? "";\n      const suppliedSecret = req.headers.get("x-deadman-scheduler") ?? "";\n      if (!expectedSecret || suppliedSecret !== expectedSecret) return json({ error: "deadman scheduler unauthorized" }, 403);\n      const changed: any[] = [];\n      const stamp = dt.toISOString();\n      for (const game of state) {\n        const result = tickDeadman(game, stamp);\n        if (result.changed) changed.push({ id: game.id, action: result.action, reason: result.reason ?? null, deadman: game.deadman });\n      }\n      if (!changed.length) return json({ state_version: cur.state_version, master_zulu: stamp, engine_version: ENGINE_VERSION, changed: [] });\n      const { data, error } = await client.rpc("gamecast_v12_update_session", { p_session_id: cur.session_id, p_expected_version: cur.state_version, p_state: state, p_stamp: stamp });\n      if (error) throw error;\n      const up = Array.isArray(data) ? data[0] : data;\n      if (!up) return json({ error: "version conflict" }, 409);\n      for (const change of changed) await client.rpc("gamecast_v12_insert_event", { p_session_id: cur.session_id, p_state_version: up.state_version, p_event_type: \`V4321_DMF_DEADMAN_\${change.action}\`, p_game_id: change.id, p_payload: { ...change, masterZulu: stamp } });\n      return json({ state_version: up.state_version, master_zulu: stamp, engine_version: ENGINE_VERSION, changed });\n    }\n`;
index=once(index,
  '    if (action === "read" && req.method === "GET") {',
  tickBlock+'    if (action === "read" && req.method === "GET") {',
  'deadman scheduler endpoint');

index=once(index,
  '    if (c === "quarter_length" && g.lifecycle === "UNLAUNCHED") {',
  `    if (c === "deadman_arm" && g.lifecycle === "UNLAUNCHED") {\n      const result = armDeadman(g, { basis: String(p.basis ?? ""), offsetMinutes: Number(p.offsetMinutes ?? 0) }, event.masterZulu, "CHAIRMAN");\n      if (!result.ok) return json({ error: result.reason ?? "deadman arm failed" }, 409);\n      event.deadman = structuredClone(g.deadman);\n    }\n    else if (c === "deadman_disarm" && g.lifecycle === "UNLAUNCHED") {\n      const result = disarmDeadman(g, event.masterZulu);\n      if (!result.ok) return json({ error: result.reason ?? "deadman disarm failed" }, 409);\n      event.deadman = structuredClone(g.deadman);\n    }\n    else if (c === "quarter_length" && g.lifecycle === "UNLAUNCHED") {`,
  'deadman commands');
index=once(index,
  '    const stamp = now(); event.masterZulu = stamp;',
  '    if (!["deadman_arm", "deadman_disarm", "quarter_length", "launch"].includes(c)) noteOperatorCommand(g, c, event.masterZulu);\n    const stamp = now(); event.masterZulu = stamp;',
  'operator satisfaction');
fs.writeFileSync(`${dstFn}/index.ts`,index,'utf8');

let app=read(`${dstUi}/app.js`);
app=all(app,'gamecast-week5-v4-3-2-1','gamecast-week5-v4-3-2-1-deadman-qa','QA UI API');
app=all(app,'synthcastGameCast4321Operator','synthcastGameCast4321DeadmanQAOperator','QA UI storage');
app=all(app,'GC-W5-V4.3.2.1-RC1','GC-W5-V4.3.2.1-DMF1-QA','QA UI engine');
const deadmanFns=`function deadmanCtl(g){if(publicView)return'';const d=g.deadman||{status:'UNARMED'},status=esc(d.status||'UNARMED');if(d.status==='ARMED')return '<div class="deadman"><b>DEAD-MAN · ARMED</b><span data-deadman-due="'+esc(g.id)+'" data-due="'+esc(d.dueZulu||'')+'">'+esc(d.dueZulu||'NO DUE TIME')+'</span><button onclick="cmd(\\''+g.id+'\\',\\'deadman_disarm\\')">DISARM</button></div>';if(d.status==='AUTONOMOUS')return '<div class="deadman autonomous"><b>DEAD-MAN · AUTONOMOUS</b><span>'+esc(d.triggeredAtZulu||'')+'</span></div>';if(d.status==='SATISFIED')return '<div class="deadman satisfied"><b>DEAD-MAN · SATISFIED</b><span>'+esc(d.satisfiedReason||'CHAIRMAN CONTROL')+'</span></div>';if(g.lifecycle!=='UNLAUNCHED')return'';return '<div class="deadman"><b>DEAD-MAN · '+status+'</b><select id="dm-b-'+g.id+'"><option value="KICKOFF_PLUS">KICKOFF +</option><option value="KICKOFF">KICKOFF</option><option value="TV_START">TV START</option></select><input id="dm-m-'+g.id+'" type="number" min="0" max="180" value="15" aria-label="Dead-Man offset minutes"><button class="primary" onclick="armDeadmanUi(\\''+g.id+'\\')">ARM</button>'+(d.blockedReason?'<span>'+esc(d.blockedReason)+'</span>':'')+'</div>'}function armDeadmanUi(id){const b=document.getElementById('dm-b-'+id)?.value||'KICKOFF_PLUS',m=+(document.getElementById('dm-m-'+id)?.value||0);cmd(id,'deadman_arm',{basis:b,offsetMinutes:m})}\n`;
app=once(app,'function admin(g){',deadmanFns+'function admin(g){','deadman UI functions');
app=once(app,
  "+run+ctl+'</article>'",
  "+run+ctl+deadmanCtl(g)+'</article>'",
  'deadman card rendering');
app=once(app,
  "document.getElementById('tz-h').textContent=z(ms,'Pacific/Honolulu','HST')}",
  "document.getElementById('tz-h').textContent=z(ms,'Pacific/Honolulu','HST');for(const el of document.querySelectorAll('[data-deadman-due]')){const due=Date.parse(el.dataset.due||'');if(Number.isFinite(due)){const left=Math.max(0,Math.ceil((due-ms)/1000));el.textContent=left>0?'AUTONOMOUS IN '+clk(left):'TRIGGER DUE'}}}",
  'deadman countdown');
fs.writeFileSync(`${dstUi}/app.js`,app,'utf8');

let page=read(`${dstUi}/index.html`);
page=page.replaceAll('GameCast 4.3.2.1','GameCast 4.3.2.1 · DEAD-MAN QA').replaceAll('GAMECAST 4.3.2.1','GAMECAST 4.3.2.1 · DEAD-MAN QA');
page=page.replace('</head>','<style>.deadman{margin-top:8px;padding:8px;border:1px solid #555;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.deadman.autonomous{border-width:2px}.deadman input{width:72px}.deadman span{font-size:.8rem}</style></head>');
page=page.replace('</body>','<p class="operator-only">WEEK 6 PREP BRANCH · Dead-Man feature QA only. This fixture still uses the inherited Week 5 schedule/power until canonical Week 6 inputs are supplied. DO NOT DEPLOY AS WEEK 6.</p></body>');
fs.writeFileSync(`${dstUi}/index.html`,page,'utf8');

console.log(JSON.stringify({status:'PASS_BUILD_DEADMAN_QA_FIXTURE',source:'GameCast 4.3.2.1 Week 5',backend:dstFn,ui:dstUi,week6Data:'BLOCKED_PENDING_CANONICAL_W6_SCHEDULE_AND_POST_W5_POWER'},null,2));
