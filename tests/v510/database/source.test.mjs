import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import * as E from '../../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {createSourceStore} from '../../../release-assets/v5.1.0/backend/delivery/source-store.mjs';
const dir='release-assets/v5.1.0/backend/delivery/';
test('source commits, durable outbox, interrupted projection recovery and exact retry',async()=>{
 const db=new PGlite();await db.exec('create role service_role bypassrls;create role anon;create role authenticated');await db.exec(fs.readFileSync(dir+'schema.sql','utf8'));await db.exec(fs.readFileSync(dir+'source-schema.sql','utf8'));
 await db.exec(fs.readFileSync(dir+'gateway.sql','utf8'));
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query("select public.gamecast_v510_gateway('load_source','{}')"),/permission denied/);await db.exec('reset role');}
 const names={commit_source:['p_session_id','p_expected_version','p_engine_version','p_games','p_events','p_request_id'],load_source:['p_session_id','p_version'],pending_source:['p_session_id'],source_version:['p_session_id','p_game_id'],commit_reporting:['p_packet']};
 let fail=false,writes=0;
 const rpc=async(name,args)=>{if(name==='commit_reporting'&&fail&&++writes===2)throw Error('NETWORK_INTERRUPTION');const keys=names[name];return (await db.query(`select gamecast_v510.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) as result`,keys.map(k=>typeof args[k]==='object'?JSON.stringify(args[k]):args[k]))).rows[0].result;};
 const store=createSourceStore({rpc}),sid='qa-v510-source-test',games=OPERATING_SLATE.slice(0,2).map(s=>({...E.initialGame(s),sessionId:sid,qaOnly:true}));
 const request={sessionId:sid,expectedVersion:-1,engineVersion:E.ENGINE_VERSION,games,events:[],requestId:'source-genesis-test-0001'};
 assert.equal((await store.commit(request)).stateVersion,0);
 fail=true;await assert.rejects(()=>store.recover(sid),/NETWORK_INTERRUPTION/);fail=false;
 assert.equal((await store.recover(sid)).caughtUp,true);
 const source=await store.loadCommittedRevision(sid,0);assert.equal(source.games.length,2);
 const next=structuredClone(request);next.expectedVersion=0;next.requestId='source-launch-test-0001';next.events=games.map(g=>({gameId:g.id,command:'launch'}));
 for(const g of next.games){g.lifecycle='ACTIVE';g.auto=true;E.ensureOpeningToss(g);E.advanceGame(g,200);}
 await store.commit(next);assert.equal(await store.sourceVersion(sid,games[0].id),1);assert.equal(await rpc('pending_source',{p_session_id:sid}),1);
 assert.equal((await store.commit(next)).replayed,true);
 await assert.rejects(()=>store.commit({...next,requestId:'conflicting-request-0001'}),/VERSION_CONFLICT/);
 const tamper=structuredClone(next);tamper.games[0].down=tamper.games[0].down%4+1;await assert.rejects(()=>store.commit(tamper),/IDEMPOTENCY_CONFLICT/);
 await store.recover(sid);assert.equal(await rpc('pending_source',{p_session_id:sid}),null);
 await assert.rejects(()=>db.exec('delete from gamecast_v510.source_commits'),/IMMUTABLE_JOURNAL/);
 const official=structuredClone(next);official.expectedVersion=1;official.requestId='official-test-forbidden';official.games[0].lifecycle='READY';await assert.rejects(()=>store.commit(official),/QA_SOURCE_REQUIRED/);
 await db.close();
});
