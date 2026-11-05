import test from 'node:test';import assert from 'node:assert/strict';
import {createWpSqlAuthorization} from '../../release-assets/v5.1.0/backend/probability/sql-authorization.mjs';
test('SQL authorization observes revocation without caching and binds user/session parameters',async()=>{
 let active=true,calls=0;const auth=createWpSqlAuthorization(async(sql,args)=>{calls++;assert.match(sql,/authorize_reporting/);assert.deepEqual(args,['actor','qa-v510-session']);return {rows:[{ok:active}]};});
 assert.deepEqual(await auth({id:'actor'},'qa-v510-session'),{authenticated:true,userId:'actor',active:true,role:'CHAIRMAN',authorizedSessionIds:['qa-v510-session']});
 active=false;assert.deepEqual(await auth({id:'actor'},'qa-v510-session'),{authenticated:true,userId:'actor',active:false,role:null,authorizedSessionIds:[]});assert.equal(calls,2);
});
test('SQL authorization rejects absent grants and propagates database failure',async()=>{
 assert.equal((await createWpSqlAuthorization(async()=>({rows:[]}))({id:'actor'},'qa-v510-session')).active,false);
 await assert.rejects(()=>createWpSqlAuthorization(async()=>{throw Error('OFFLINE');})({id:'actor'},'qa-v510-session'),/OFFLINE/);
});
