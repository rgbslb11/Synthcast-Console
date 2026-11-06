import test from 'node:test';import assert from 'node:assert/strict';
import {readSessionBoard,WP_URL} from '../../public/v5.1.0/review/wp-transport.mjs';
const board={contractVersion:'GC-BOARD-1',sessionId:'qa-v510-board',stateVersion:2,generatedAt:'2026-11-06T00:00:00Z',games:Array.from({length:56},(_,i)=>({id:'G'+String(i).padStart(4,'0'),runId:'run-'+i,lifecycle:'FINAL_PENDING',away:'Away',home:'Home',availability:{status:'AVAILABLE'},scoreboard:{},teamStatistics:[{totalPoints:7},{totalPoints:0}]}))};
const read=b=>readSessionBoard({session:board.sessionId,token:'test-only',fetchImpl:async()=>Response.json(b)});
test('roster validates exact 56 identities, read-only transport and strips denied data',async()=>{
 let calls=0;const actual=await readSessionBoard({session:board.sessionId,token:'test-only',fetchImpl:async(u,i)=>{calls++;assert.equal(u.origin+u.pathname,WP_URL);assert.equal(u.searchParams.get('view'),'roster');assert.equal(i.method,'GET');assert.equal(i.headers.Authorization,'Bearer test-only');assert.equal(i.credentials,'omit');return Response.json(board);}});assert.equal(calls,1);assert.equal(actual.games.length,56);assert.deepEqual(actual.games.map(g=>g.id),board.games.map(g=>g.id));
 const blocked=structuredClone(board);blocked.games[0].availability={status:'BLOCKED',reason:'CHAIRMAN_CORRECTION'};const out=await read(blocked);assert.equal(out.games[0].scoreboard,undefined);assert.equal(out.games[0].teamStatistics,undefined);
});
test('roster rejects cross-session, missing/duplicate IDs, oversized/unknown lifecycle and denied access',async()=>{
 for(const patch of [{sessionId:'qa-v510-other'},{games:[]},{games:[...board.games,board.games[0]]},{games:[board.games[0],board.games[0]]},{games:[{...board.games[0],lifecycle:'GUESS'}]},{games:[{...board.games[0],runId:''}]}])await assert.rejects(read({...board,...patch}),/INVALID_SESSION_BOARD/);
 for(const status of [401,403,429,503])await assert.rejects(readSessionBoard({session:board.sessionId,token:'test-only',fetchImpl:async()=>new Response('',{status})}));
});
