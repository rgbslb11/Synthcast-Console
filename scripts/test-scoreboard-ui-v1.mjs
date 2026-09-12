import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('public/scoreboard/v1.0/index.html','utf8');
const css=fs.readFileSync('public/scoreboard/v1.0/scoreboard.css','utf8');
const js=fs.readFileSync('public/scoreboard/v1.0/scoreboard.js','utf8');

assert.match(html,/viewport-fit=cover/);
assert.match(html,/SYNTHCAST <b>SCOREBOARD<\/b>/);
assert.match(html,/data-filter="LIVE"/);
assert.match(html,/id="networkToggle"/);

assert.match(css,/grid-template-columns:1fr/);
assert.match(css,/@media\(min-width:560px\).*repeat\(2/s);
assert.match(css,/@media\(min-width:900px\).*repeat\(3/s);
assert.match(css,/@media\(min-width:1250px\).*repeat\(4/s);

assert.match(js,/const POLL_MS=4500/);
assert.match(js,/gamecast-week3-v4-2-2/);
assert.match(js,/cache:'no-store'/);
assert.match(js,/state_version/);
assert.match(js,/expanded=new Set\(\)/);
assert.match(js,/data-game/);
assert.match(js,/SEN/);

assert.doesNotMatch(js,/x-operator-token/i);
assert.doesNotMatch(js,/operator_token/i);
assert.doesNotMatch(js,/method:\s*'POST'/i);
assert.doesNotMatch(js,/api=command/i);
assert.doesNotMatch(js,/api=create/i);

console.log('SCOREBOARD_UI_V1_STATIC_TEST PASS');
