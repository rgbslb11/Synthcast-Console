import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fnDir = path.join(root, 'supabase/functions/gamecast-week3-v4-2-2');
const uiDir = path.join(root, 'public/v4.2.2');
const weekPath = path.join(fnDir, 'week3.ts');
const powerPath = path.join(fnDir, 'power.ts');
const indexPath = path.join(fnDir, 'index.ts');
const appPath = path.join(uiDir, 'app.js');
const pagePath = path.join(uiDir, 'index.html');

const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s, 'utf8');
function once(s, from, to, label) {
  const i = s.indexOf(from);
  if (i < 0) throw new Error(`Missing expected fragment: ${label}`);
  if (s.indexOf(from, i + from.length) >= 0) throw new Error(`Expected unique fragment is repeated: ${label}`);
  return s.slice(0, i) + to + s.slice(i + from.length);
}
function allRequired(s, from, to, label) {
  if (!s.includes(from)) throw new Error(`Missing expected token: ${label}`);
  return s.split(from).join(to);
}

for (const p of [weekPath, powerPath, indexPath, appPath, pagePath]) {
  if (!fs.existsSync(p)) throw new Error(`4.2.2 generated source missing: ${p}`);
}

// Preserve the canonical 51-game Week 3 schedule exactly and expose one separately identified
// Week 2 carryover game on the 4.2.2 operating slate.
let week = read(weekPath);
const weekTail = `if(WEEK3.length!==51)throw new Error(\`Week 3 schedule count mismatch: \${WEEK3.length}\`);\nif(new Set(WEEK3.map(g=>g.id)).size!==51)throw new Error("Week 3 duplicate game ID");`;
const operatingTail = `${weekTail}\n\nexport type OperatingSlateGame=Week3Game&{canonicalWeek:"W2"|"W3";carryover:boolean};\nexport const WEEK2_CARRYOVER_G0021:OperatingSlateGame={\n  id:"G0021",\n  date:"2026-09-07",\n  dateLabel:"Mon 9/7",\n  kickoff:"8:00 PM",\n  network:"EBC",\n  matchup:"SMU at Florida State",\n  away:"SMU",\n  home:"Florida State",\n  flexTime:false,\n  kickoffOrder:0,\n  canonicalWeek:"W2",\n  carryover:true\n};\nexport const OPERATING_SLATE:OperatingSlateGame[]=[\n  WEEK2_CARRYOVER_G0021,\n  ...WEEK3.map(g=>({...g,canonicalWeek:"W3" as const,carryover:false}))\n];\nif(OPERATING_SLATE.length!==52)throw new Error(\`4.2.2 operating slate count mismatch: \${OPERATING_SLATE.length}\`);\nif(new Set(OPERATING_SLATE.map(g=>g.id)).size!==52)throw new Error("4.2.2 operating slate duplicate game ID");`;
week = once(week, weekTail, operatingTail, 'Week 3 validators / operating-slate extension point');
write(weekPath, week);

// These values are the existing Chairman-approved 2026-09-07 60-99 ratings. This step activates
// them in the 4.2.2 package; it does not recompute or retune either team.
let power = read(powerPath);
if (power.includes('\nSMU|') || power.includes('\nFlorida State|')) throw new Error('SMU or Florida State unexpectedly already present in generated 4.2.2 power package');
power = once(power,
  'Florida International|68|80|74|MEASURED|\nFresno State|67|72|70|MEASURED|',
  'Florida International|68|80|74|MEASURED|\nFlorida State|74|76|75|OPEN4|\nFresno State|67|72|70|MEASURED|',
  'Florida State rating insertion');
power = once(power,
  'Southern Miss|75|67|72|MEASURED|\nSouthern Utah|62|62|62|CHAIRMAN 0.10x OPPONENT|Colorado State',
  'SMU|83|81|82|OPEN4|\nSouthern Miss|75|67|72|MEASURED|\nSouthern Utah|62|62|62|CHAIRMAN 0.10x OPPONENT|Colorado State',
  'SMU rating insertion');
write(powerPath, power);

// Keep the 4.2.2 engine mechanics, identity, session namespace, and Week-key compatibility unchanged.
// Only session creation/read governance switches from canonical WEEK3 to the 52-game operating slate.
let index = read(indexPath);
index = once(index,
  'import { WEEK3 } from "./week3.ts";',
  'import { OPERATING_SLATE } from "./week3.ts";',
  'operating-slate import');
index = once(index,
  'const DATA_VERSION = "W3-51+POWER_60_99_V422+PERIOD_STATE_FIX+PLAYVOL_CAL_2500";',
  'const DATA_VERSION = "W3-51+W2-G0021+POWER_60_99_V422+PERIOD_STATE_FIX+PLAYVOL_CAL_2500";',
  'data identity');
index = once(index,
  '      if (WEEK3.length !== 51) throw new Error("Week 3 schedule count mismatch");\n      const operator = randHex(32), publicSlug = `w3v422-${randHex(8)}`, state = WEEK3.map(initialGame);',
  '      if (OPERATING_SLATE.length !== 52) throw new Error("4.2.2 operating slate count mismatch");\n      const operator = randHex(32), publicSlug = `w3v422-${randHex(8)}`, state = OPERATING_SLATE.map(initialGame);',
  'session creation slate');
index = once(index,
  '      return json({ ...row, engine_version: ENGINE_VERSION, operator_token: operator, master_zulu: now(), governance: { games: 51, power_ready: state.filter(g => g.powerReady).length } }, 201);',
  '      return json({ ...row, engine_version: ENGINE_VERSION, operator_token: operator, master_zulu: now(), governance: { games: state.length, week3_games: state.filter(g => g.canonicalWeek === "W3").length, week2_carryovers: state.filter(g => g.canonicalWeek === "W2").length, power_ready: state.filter(g => g.powerReady).length } }, 201);',
  'create governance');
index = once(index,
  '      return json({ public_slug: slug, week_key: WEEK_KEY, engine_version: ENGINE_VERSION, data_version: DATA_VERSION, state: operator ? state : state.map(publicGame), state_version: cur.state_version, master_zulu: dt.toISOString(), operator, governance: { games: 51, power_ready: ready, power_pending: 51 - ready } });',
  '      return json({ public_slug: slug, week_key: WEEK_KEY, engine_version: ENGINE_VERSION, data_version: DATA_VERSION, state: operator ? state : state.map(publicGame), state_version: cur.state_version, master_zulu: dt.toISOString(), operator, governance: { games: state.length, week3_games: state.filter(g => g.canonicalWeek === "W3").length, week2_carryovers: state.filter(g => g.canonicalWeek === "W2").length, power_ready: ready, power_pending: state.length - ready } });',
  'read governance');
write(indexPath, index);

// Make displayed counts session-driven so existing 51-game 4.2.2 sessions remain coherent while
// newly created operating sessions report 52. Label G0021 explicitly as a Week 2 carryover.
let app = read(appPath);
app = once(app,
  "+' · POWER '+ready+'/51'+",
  "+' · POWER '+ready+'/'+state.length+",
  'session power denominator');
app = once(app,
  "status('CLOUD V'+version+' · POWER '+(b.governance?.power_ready??0)+'/51');",
  "status('CLOUD V'+version+' · POWER '+(b.governance?.power_ready??0)+'/'+(b.governance?.games??state.length));",
  'cloud status denominator');
app = once(app,
  "status('POWER LOADED · '+(b.summary?.readyGames??0)+'/51');",
  "status('POWER LOADED · '+(b.summary?.readyGames??0)+'/'+state.length);",
  'power-load denominator');
app = once(app,
  "esc(g.network)+(g.flexTime?' · FLEX':'')+' · '+esc(g.activity)",
  "esc(g.network)+(g.flexTime?' · FLEX':'')+(g.carryover?' · W2 CARRYOVER':'')+' · '+esc(g.activity)",
  'carryover card label');
app = once(app,
  "function render(){if(!publicView){document.getElementById('create').disabled=!!slug;document.getElementById('resume').disabled=!localStorage.getItem(STORE)}const base=location.origin+location.pathname,ready=state.filter(g=>g.powerReady).length;",
  "function render(){if(!publicView){document.getElementById('create').disabled=!!slug;document.getElementById('resume').disabled=!localStorage.getItem(STORE)}const allButton=document.querySelector('[data-f=\"ALL\"]');if(allButton)allButton.textContent='ALL · '+state.length;const base=location.origin+location.pathname,ready=state.filter(g=>g.powerReady).length;",
  'dynamic ALL count');
write(appPath, app);

let page = read(pagePath);
page = allRequired(page,
  'WEEK 3 · 60–99 POWER RELEASE · 4.2 RC3 MECHANICS FROZEN',
  'WEEK 3 + W2 CARRYOVER · 60–99 POWER RELEASE · 4.2 RC3 MECHANICS FROZEN',
  'page subtitle');
page = allRequired(page,
  'CREATE 4.2.2 WEEK 3 SESSION',
  'CREATE 4.2.2 OPERATING SLATE',
  'create button');
page = allRequired(page,
  '51 Week 3 games. 102/102 participating teams carry Chairman-approved 60–99 TEAM/OFF/DEF ratings.',
  '52-game operating slate: 51 canonical Week 3 games plus G0021 SMU at Florida State as a canonical Week 2 carryover. 104/104 participating teams carry Chairman-approved 60–99 TEAM/OFF/DEF ratings.',
  'governance notice');
page = allRequired(page, 'ALL · 51', 'ALL · 52', 'initial ALL count');
write(pagePath, page);

// Scope guards: prove that the requested carryover exists, uses the existing rating package, and that
// the 4.2.2 engine/version/session identity was not changed by this extension.
const checkWeek = read(weekPath), checkPower = read(powerPath), checkIndex = read(indexPath), checkApp = read(appPath), checkPage = read(pagePath);
for (const required of [
  'id:"G0021"', 'date:"2026-09-07"', 'kickoff:"8:00 PM"', 'network:"EBC"',
  'matchup:"SMU at Florida State"', 'canonicalWeek:"W2"', 'carryover:true', 'OPERATING_SLATE.length!==52'
]) if (!checkWeek.includes(required)) throw new Error(`Missing G0021 operating-slate invariant: ${required}`);
for (const required of ['SMU|83|81|82|OPEN4|', 'Florida State|74|76|75|OPEN4|']) {
  if (!checkPower.includes(required)) throw new Error(`Missing approved carryover rating: ${required}`);
}
for (const required of [
  'GC-W3-V4.2.2-RC1', 'w3v422-', 'W3-51+W2-G0021+POWER_60_99_V422+PERIOD_STATE_FIX+PLAYVOL_CAL_2500',
  'OPERATING_SLATE.map(initialGame)', 'games: state.length', 'power_pending: state.length - ready'
]) if (!checkIndex.includes(required)) throw new Error(`Missing 4.2.2 operating invariant: ${required}`);
if (!checkIndex.includes('if (g.pendingPeriod !== 0) advancePeriod(g);')) throw new Error('4.2.2 period fix was lost');
if (!checkIndex.includes('deadRemaining = p.deadSec > 0 && p.remaining > p.runoffSec')) throw new Error('4.2.2 deterministic POST fix was lost');
if (!checkApp.includes('W2 CARRYOVER')) throw new Error('UI does not label the Week 2 carryover');
if (!checkPage.includes('G0021 SMU at Florida State')) throw new Error('UI governance notice does not identify G0021');

console.log('GameCast 4.2.2 operating slate extended: canonical Week 3 remains 51; G0021 Week 2 carryover added at Mon 9/7 8:00 PM EBC with existing 60-99 ratings.');
