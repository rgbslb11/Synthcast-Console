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

check('GameCast 5.0.0 Chairman identity',()=>{
  assert.match(page,/Synthcast GameCast 5\.0\.0/);
  assert.match(page,/CHAIRMAN \/ CONTROL CONSOLE/);
  assert.match(page,/EMAIL/);
  assert.match(page,/PASSWORD/);
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
check('Weather Dynamics controls precede Dead-Man controls',()=>{
  assert.match(app,/MODEL<select[^]*OFF[^]*ON/);
  assert.match(app,/WIND<select[^]*NONE[^]*LIGHT[^]*BREEZY[^]*STRONG/);
  assert.match(app,/RAIN<select[^]*NONE[^]*LIGHT[^]*STEADY[^]*HEAVY/);
  assert.match(app,/TEMPERATURE \(DISPLAY ONLY\)/);
  assert.match(app,/ctl\+weatherCard\(g\)\+dmCard\(g\)/);
});
check('Weather Dynamics uses the approved command and launch lock',()=>{
  assert.match(app,/weather_set/);
  assert.match(app,/Weather locks at Launch/);
  assert.match(app,/Temperature is visible but inactive/);
});
check('Dead-Man controls remain Chairman only',()=>{
  assert.match(app,/DEAD-MAN: SELECTIVE \/ BULK ARMING/);
  assert.match(app,/dm-box operator-only/);
  assert.match(app,/Only selected games are changed/);
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
