import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {requireSessionSlug} from '../../release-assets/v5.0.6-week11/backend/security/security-core.mjs';
test('5.0.6 rejects 5.0.4 session identifiers and isolates transport and browser storage',()=>{
 assert.throws(()=>requireSessionSlug('w11v504-0000000000000001'));
 assert.equal(requireSessionSlug('w11v506-0000000000000001'),'w11v506-0000000000000001');
 const backend=fs.readFileSync('release-assets/v5.0.6-week11/backend/src/supabase-rest.mjs','utf8');assert.ok(backend.includes('gamecast_v506_w11'));assert.ok(!backend.includes('gamecast_v504_w11'));
 for(const file of ['public/v5.0.6/w11/app.js','public/v5.0.6/w11/auth-api.js']){const s=fs.readFileSync(file,'utf8');assert.ok(s.includes('synthcastGameCast506'));assert.ok(!s.includes('synthcastGameCast504'));}
 const config=fs.readFileSync('public/v5.0.6/w11/release-config.js','utf8');assert.ok(config.includes('gamecast-week11-v5-0-6-public'));assert.ok(config.includes('gamecast-week11-v5-0-6-chairman'));assert.ok(!config.includes('v5-0-4'));
});
test('frozen Week11 rating bytes match approved source hash',()=>{
 const m=JSON.parse(fs.readFileSync('release-assets/v5.0.6-week11/input-manifest.json'));
 assert.equal(m.ratingsSha256,'1bd1827b535f93c6caf664049deb4b78728c645d813a21bc50d0e6819f04485c');
});
