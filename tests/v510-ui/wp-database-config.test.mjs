import test from 'node:test';
import assert from 'node:assert/strict';
import {wpDatabaseUrl} from '../../release-assets/v5.1.0/qa-wp-api/database-config.mjs';
const base={SUPABASE_URL:'https://xsvdmcipviejxynkdbhq.supabase.co',SUPABASE_DB_URL:'postgresql://postgres:test%25%40%3A@internal-db:5432/postgres?sslmode=require'};
test('derive dedicated pool without changing existing secret or encoded credentials',()=>{
 const env={...base},before={...env};const u=new URL(wpDatabaseUrl(k=>env[k]));
 assert.equal(u.hostname,'db.xsvdmcipviejxynkdbhq.supabase.co');assert.equal(u.port,'6543');assert.equal(decodeURIComponent(u.password),'test%@:');assert.equal(u.search,'?sslmode=require');assert.deepEqual(env,before);
});
test('reject missing config, wrong project and unsupported role with static errors',()=>{
 for(const env of [{},{...base,SUPABASE_URL:'https://other.supabase.co'},{...base,SUPABASE_DB_URL:'invalid'},{...base,SUPABASE_DB_URL:base.SUPABASE_DB_URL.replace('postgres:','other:')}])assert.throws(()=>wpDatabaseUrl(k=>env[k]),{message:'WP_POOL_CONFIGURATION_INVALID'});
});
test('obsolete candidate secret cannot override verified runtime credential',()=>{
 assert.equal(wpDatabaseUrl(k=>({...base,GAMECAST_V510_WP_DATABASE_URL:'invalid-candidate'})[k]),wpDatabaseUrl(k=>base[k]));
});
