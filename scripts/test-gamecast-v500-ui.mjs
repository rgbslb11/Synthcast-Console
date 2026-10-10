import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root='public/v5.0.0';
const evidence='outputs/v500';
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const sha=body=>createHash('sha256').update(body).digest('hex');
const expectedFiles=[
  'app.js','auth-api.js','deadman.css','index.html','list-filters.js',
  'patch-500-weather.js','release-config.js','legacy/app.css',
  'legacy/patch-422.js','legacy/patch-rc2.js','ui1.3/index.html',
  'ui1.3/scoreboard.css','ui1.3/scoreboard.js',
].sort();
const cases=[];
function check(name,fn){fn();cases.push({name,status:'PASS'});}

check('exact static file inventory',()=>assert.deepEqual(
  expectedFiles,
  fs.readdirSync(root,{recursive:true,withFileTypes:true})
    .filter(entry=>entry.isFile())
    .map(entry=>path.relative(root,path.join(entry.parentPath,entry.name)))
    .sort(),
));

const page=read('index.html');
const app=read('app.js');
const auth=read('auth-api.js');
const config=read('release-config.js');
const condensedPage=read('ui1.3/index.html');
const condensed=read('ui1.3/scoreboard.js');
const condensedCss=read('ui1.3/scoreboard.css');
const chairmanCss=read('legacy/app.css');

check('GameCast 5.0.0 Chairman identity',()=>{
  assert.match(page,/Synthcast GameCast 5\.0\.0/);
  assert.match(page,/CHAIRMAN \/ CONTROL CONSOLE/);
  assert.match(page,/EMAIL/);
  assert.match(page,/PASSWORD/);
});
check('Upcoming filter is Chairman only and selects unlaunched games',()=>{
  assert.match(page,/class="operator-only" data-f="UPCOMING">UPCOMING<\/button>/);
  assert.match(app,/filter==='UPCOMING'\)return !publicView&&g\.lifecycle==='UNLAUNCHED'/);
  assert.match(app,/querySelectorAll\('\.operator-only'\)\.forEach\(el=>el\.remove\(\)\)/);
});
check('isolated QA backend binding',()=>{
  assert.equal((config.match(/xsvdmcipviejxynkdbhq/g)||[]).length,3);
  assert.match(config,/gamecast-week7-v5-public/);
  assert.match(config,/gamecast-week7-v5-chairman/);
  assert.doesNotMatch(config,/percrnamjzetzjjuxuuw|chatgpt\.site/);
});
check('direct Supabase email and password authentication',()=>{
  assert.match(auth,/authRequest\('token\?grant_type=password'/);
  assert.match(auth,/Bearer /);
  assert.doesNotMatch(auth,/Apple|ChatGPT/);
});
check('Chairman session survives a tab refresh',()=>{
  assert.match(auth,/const AUTH_KEY='synthcastGameCast500Auth'/);
  assert.match(auth,/sessionStorage\.setItem\(AUTH_KEY/);
  assert.match(auth,/sessionStorage\.getItem\(AUTH_KEY/);
  assert.match(auth,/sessionStorage\.removeItem\(AUTH_KEY/);
  assert.match(auth,/RESTORING SESSION/);
  assert.match(auth,/token\?grant_type=refresh_token/);
  assert.doesNotMatch(auth,/localStorage/);
});
check('password recovery returns to the hosted Chairman surface',()=>{
  assert.match(page,/id="requestPasswordReset"/);
  assert.match(page,/id="passwordRecovery" hidden/);
  assert.match(page,/autocomplete="new-password"/);
  assert.match(auth,/recover\?redirect_to=/);
  assert.match(auth,/hash\.get\('type'\)!=='recovery'/);
  assert.match(auth,/history\.replaceState/);
  assert.match(auth,/method:'PUT'/);
  assert.match(auth,/\/auth\/v1\/user/);
  assert.doesNotMatch(auth,/localStorage/);
  assert.match(chairmanCss,/\.toolbar\[hidden\]\{display:none!important\}/);
});
check('Weather Dynamics controls precede Dead-Man controls',()=>{
  assert.match(app,/MODEL<select[^]*OFF[^]*ON/);
  assert.match(app,/WIND<select[^]*NONE[^]*LIGHT[^]*BREEZY[^]*STRONG/);
  assert.match(app,/RAIN<select[^]*NONE[^]*LIGHT[^]*STEADY[^]*HEAVY/);
  assert.match(app,/TEMPERATURE \(DISPLAY ONLY\)/);
  assert.match(app,/ctl\+weatherCard\(g\)\+dmCard\(g\)/);
});
check('Weather Dynamics uses the approved command and launch lock',()=>{
  assert.match(app,/weather_set/);
  assert.match(app,/Launch saves these visible values and locks Weather/);
  assert.match(app,/launchGame\(id\).*weather:weatherValues\(id\)/);
  assert.match(app,/weatherDrafts=new Map/);
  assert.match(app,/Temperature is visible but inactive/);
});
check('Dead-Man controls remain Chairman only',()=>{
  assert.match(app,/DEAD-MAN: SELECTIVE \/ BULK ARMING/);
  assert.match(app,/dm-box operator-only/);
  assert.match(app,/Only selected games are changed/);
});
check('Chairman Edit distinguishes scheduler races from changed game state',()=>{
  assert.match(app,/maxAttempts=editCommand\?4:2/);
  assert.match(app,/Error\('EDIT_STATE_CHANGED'\)/);
  assert.match(app,/if\(e\.message==='EDIT_STATE_CHANGED'\)\{writeConflict=true/);
  const busy=app.split("else if(editCommand&&e.status===409")[1]?.split("else if")[0];
  assert.ok(busy);
  assert.match(busy,/CHAIRMAN EDIT BUSY/);
  assert.doesNotMatch(busy,/writeConflict=true/);
});
check('Dead-Man writes refresh versions and retry only unchanged targets',()=>{
  const dm=app.slice(app.indexOf('async function dmWrite('),app.indexOf('function dmArmOne('));
  assert.match(dm,/checkpoint=await api\('read'\)/);
  assert.match(dm,/expected_version:checkpoint\.state_version/);
  assert.match(dm,/dmCheckpoint\(checkpoint\.state\|\|\[\],ids\)!==baseline/);
  assert.match(dm,/attempt<2/);
  assert.doesNotMatch(dm,/writeConflict=true/);
});
check('Live card and Dead-Man status update separately from protected settings',()=>{
  assert.match(app,/function syncProtectedCard\(oldCard,fresh\)/);
  assert.match(app,/render\('',b\.state\|\|state\)/);
  assert.match(app,/function dmSyncStatus\(oldCard,newCard\)/);
  assert.match(app,/if\(protectedCards\.has\(old\)\)syncProtectedCard\(old,fresh\)/);
  assert.match(app,/oldTitle\.textContent=newTitle\.textContent/);
  assert.match(app,/el\.tagName!=='DETAILS'/);
});
check('five-second Chairman polling preserves open controls',()=>{
  assert.match(app,/const CHAIRMAN_POLL_MS=5000,PUBLIC_POLL_MS=4000/);
  assert.match(app,/publicView\?PUBLIC_POLL_MS:CHAIRMAN_POLL_MS/);
  assert.match(app,/card\.querySelector\('\.edit-panel'\)/);
  assert.match(app,/\.dm-box details\[open\],\.wx-box details\[open\]/);
  assert.match(app,/old\.outerHTML!==fresh\.outerHTML/);
  assert.doesNotMatch(app,/grid\.replaceChildren\(template\.content\)/);
  assert.match(app,/if\(editDraftLocked\(\)\|\|writeConflict/);
});
check('public surface remains read only',()=>{
  assert.match(app,/publicView\|\|g\.immutableFinal/);
  assert.match(page,/PUBLIC LIVE SCOREBOARD/);
  assert.doesNotMatch(app,/x-operator-token|#operator=/);
});
check('condensed surface keeps accepted population and polling',()=>{
  assert.match(condensedPage,/SATURDAY · 41/);
  assert.match(condensedPage,/FULL WEEK · 54/);
  assert.match(condensed,/const POLL_MS=4500/);
  assert.match(condensed,/SEN\(\?:\\\+\)\?\|EBC\|EBCOTT\|EBC\\\+EBCOTT/);
  assert.match(condensed,/WEATHER ON/);
});
check('condensed navigation carries session without credentials',()=>{
  assert.match(condensed,/CHAIRMAN<\/a> · <a href=.*PUBLIC/);
  assert.doesNotMatch(condensed,/operator|authorization/i);
});
check('condensed hidden secondary board stays hidden without a session',()=>{
  assert.match(condensedPage,/id="earlierBoard"[^>]*hidden/);
  assert.match(condensedCss,/#earlierBoard\[hidden\]\{display:none!important\}/);
});
check('no scheduler secret or service key ships to the browser',()=>{
  for(const file of expectedFiles){
    const body=read(file);
    assert.doesNotMatch(body,/GAMECAST_V500_SCHEDULER_SECRET|SUPABASE_SERVICE_ROLE_KEY/);
  }
});

const files=expectedFiles.map(file=>({path:`v5.0.0/${file}`,sha256:sha(fs.readFileSync(path.join(root,file)))}));
fs.mkdirSync(evidence,{recursive:true});
const report={
  classification:'TEST RESULT',
  scope:'Static release gates for the GitHub Pages GameCast 5.0.0 Chairman, public and condensed surfaces',
  status:'PASS',
  executed:cases.length,
  passed:cases.length,
  files,
  cases,
};
fs.writeFileSync(path.join(evidence,'ui-static.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,files:files.length,cases:undefined},null,2));
