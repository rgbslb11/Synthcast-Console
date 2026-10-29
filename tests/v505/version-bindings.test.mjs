import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {requireSessionSlug} from '../../release-assets/v5.0.5-week10/backend/security/security-core.mjs';
test('5.0.5 rejects 5.0.4 session identifiers and isolates transport and browser storage',()=>{
 assert.throws(()=>requireSessionSlug('w10v504-0000000000000001'));
 assert.equal(requireSessionSlug('w10v505-0000000000000001'),'w10v505-0000000000000001');
 const backend=fs.readFileSync('release-assets/v5.0.5-week10/backend/src/supabase-rest.mjs','utf8');assert.ok(backend.includes('gamecast_v505_w10'));assert.ok(!backend.includes('gamecast_v504_w10'));
 for(const file of ['public/v5.0.5/w10/app.js','public/v5.0.5/w10/auth-api.js']){const s=fs.readFileSync(file,'utf8');assert.ok(s.includes('synthcastGameCast505'));assert.ok(!s.includes('synthcastGameCast504'));}
 const config=fs.readFileSync('public/v5.0.5/w10/release-config.js','utf8');assert.ok(config.includes('gamecast-week10-v5-0-5-public'));assert.ok(config.includes('gamecast-week10-v5-0-5-chairman'));assert.ok(!config.includes('v5-0-4'));
});
test('all approved rating and schedule input files remain byte-identical to 5.0.4',()=>{
 for(const name of ['ratings.csv','approved-ratings.csv','option2-base-ratings.csv','chairman-carriage.tsv','canonical-week10.json','slate.json','team-identities.json','chairman-rating-overrides.json'])assert.deepEqual(fs.readFileSync('release-assets/v5.0.5-week10/'+name),fs.readFileSync('release-assets/v5.0.4-week10/'+name),name);
});
