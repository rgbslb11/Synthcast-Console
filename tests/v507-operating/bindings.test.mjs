import test from 'node:test';import fs from 'node:fs';import assert from 'node:assert/strict';
import {ENGINE_VERSION} from '../../release-assets/v5.0.7-week12-operating/backend/runtime/engine.mjs';
const root='release-assets/v5.0.7-week12-operating/public/v5.0.7/w12/';
for(const file of ['app.js','ui1.3/scoreboard.js'])test('hosted '+file+' expects the operating engine identity',()=>{
 const text=fs.readFileSync(root+file,'utf8');assert.ok(text.includes(ENGINE_VERSION));assert.ok(!text.includes('GC-W12-V5.0.7-QA1'));assert.ok(!text.includes('qa-w12v507-'));
});
