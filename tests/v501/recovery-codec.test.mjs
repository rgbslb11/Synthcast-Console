import {test} from 'node:test';import assert from 'node:assert/strict';import {applyDelta} from './recovery-codec.mjs';
test('archive delta preserves nulls, removals, array append/truncation and literal marker-like values',()=>{
 const before={a:null,remove:1,arr:[{n:1},null,3],literal:['=',42]};
 const d=['o',{a:['=',{x:null}],arr:['a',2,{'0':['o',{n:['=',2]},[]]}],literal:['=', ['a',5,{}]]},['remove']];
 assert.deepEqual(applyDelta(before,d),{a:{x:null},arr:[{n:2},null],literal:['a',5,{}]});
 assert.deepEqual(before.arr,[{n:1},null,3]);
 assert.deepEqual(applyDelta([1],['a',2,{'1':['=',null]}]),[1,null]);
 assert.throws(()=>applyDelta([],['a',1,{}]),/Unresolved/);
 assert.deepEqual(applyDelta({a:1},null),{a:1});
});
