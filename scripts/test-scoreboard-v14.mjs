import assert from 'node:assert/strict';
import fs from 'node:fs';
// Read-only public-session verification for the isolated Week 6 route.

const base='public/scoreboard/v1.4/';
const html=fs.readFileSync(base+'index.html','utf8');
const css=fs.readFileSync(base+'scoreboard.css','utf8');
const js=fs.readFileSync(base+'scoreboard.js','utf8');
const manifest=JSON.parse(fs.readFileSync('release-assets/gamecast-v4.4.1/preserved-pages-manifest.json','utf8'));
for(const version of ['v1.0','v1.1','v1.2','v1.3']){
  for(const name of ['index.html','scoreboard.css','scoreboard.js']){
    assert.ok(manifest.files.some(f=>f.path===`scoreboard/${version}/${name}`&&/^[a-f0-9]{64}$/.test(f.sha256)),`Preserve ${version}/${name}`);
  }
}
assert.match(css,/--bg:#ECECEC/);
assert.match(css,/--text:#000000/);
assert.match(css,/\.game-head \.state\{font-size:10px/);
assert.match(html,/SATURDAY · 50 GAMES/);
assert.match(html,/WEEK 6/);
assert.match(html,/THURSDAY &amp; FRIDAY · 6 GAMES/);
assert.match(js,/gamecast-week6-v4-4-1/);
assert.match(js,/GC-W6-V4\.4\.1-RC1/);
assert.match(js,/2026-W06/);
assert.match(js,/if\(data\.state\.some\(g=>g\.qaOnly\)\)/);
assert.doesNotMatch(js,/operator-token|#operator|api=command|api=create|w5v/i);
const response=await fetch('https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week6-v4-4-1?api=read&session=w6v441-b8d07c430bcc03a8',{cache:'no-store'});
assert.equal(response.status,200);
const data=await response.json();
assert.equal(data.public_slug,'w6v441-b8d07c430bcc03a8');
assert.equal(data.engine_version,'GC-W6-V4.4.1-RC1');
assert.equal(data.week_key,'2026-W06');
assert.equal(data.state.length,56);
assert.equal(new Set(data.state.map(g=>g.id)).size,56);
assert.ok(data.state.every(g=>!g.qaOnly));
const counts=Object.groupBy(data.state,g=>g.date);
assert.deepEqual(Object.fromEntries(Object.entries(counts).map(([d,g])=>[d,g.length])),{'2026-10-01':2,'2026-10-02':4,'2026-10-03':50});
console.log('PASS UI 1.4: 56 public Week 6 games, original light theme and earlier routes preserved.');
