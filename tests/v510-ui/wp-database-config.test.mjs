import test from 'node:test';
import assert from 'node:assert/strict';
import {wpDatabaseUrl} from '../../release-assets/v5.1.0/qa-wp-api/database-config.mjs';
const pooled='postgresql://postgres.xsvdmcipviejxynkdbhq:test-only@aws-0-example.pooler.supabase.com:6543/postgres';
test('QA pool option does not replace other components database defaults',()=>{
 const env={SUPABASE_DB_URL:'existing-direct-url'};assert.equal(wpDatabaseUrl(k=>env[k]),'existing-direct-url');env.GAMECAST_V510_WP_DATABASE_URL=pooled;assert.equal(wpDatabaseUrl(k=>env[k]),pooled);assert.equal(env.SUPABASE_DB_URL,'existing-direct-url');
});
test('wrong project, session-mode, missing password and malformed URL fail without credential disclosure',()=>{
 for(const value of [pooled.replace('6543','5432'),pooled.replace('xsvdmcipviejxynkdbhq','anotherproject'),pooled.replace(':test-only',''),'bad test-only'])assert.throws(()=>wpDatabaseUrl(()=>value),e=>e.message==='WP_POOL_CONFIGURATION_INVALID'&&!e.message.includes('test-only'));
});
