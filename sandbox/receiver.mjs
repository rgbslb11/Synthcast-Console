import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Domain-separated deterministic coin: never reads or advances football rngState.
export function receivingChoice(seed,id){
 return createHash('sha256').update(JSON.stringify(['GAMECAST_OPENING_RECEIVER_V1',seed,id])).digest()[0]&1;
}
export function patchReceiver(source){
 const once=(from,to)=>{assert.equal(source.split(from).length,2,'Receiver patch anchor changed: '+from);source=source.replace(from,to);};
 once('const seed = randHex(16), ap =','const seed = randHex(16), openingReceiver = receivingChoice(seed, s.id), ap =');
 once('    possession: 0, fieldPos: 25,','    openingReceiver, secondHalfReceiver: 1 - openingReceiver, receiptSeed: seed, receiptVersion: "RECEIVER1",\n    possession: openingReceiver, fieldPos: 25,');
 once('  Object.assign(g, { lifecycle: "UNLAUNCHED",','  if (newSeed) { g.receiptSeed = g.seedHex; g.openingReceiver = receivingChoice(g.receiptSeed, g.id); g.secondHalfReceiver = 1 - g.openingReceiver; }\n  Object.assign(g, { lifecycle: "UNLAUNCHED",');
 once('scores: blankScores(), possession: 0,','scores: blankScores(), possession: g.openingReceiver,');
 once('if (q === 3) { g.possession = 1;','if (q === 3) { g.possession = g.secondHalfReceiver;');
 once('return { runId: g.runId, seedHex: g.seedHex, disposition,','return { runId: g.runId, seedHex: g.seedHex, receiptSeed: g.receiptSeed, openingReceiver: g.openingReceiver, secondHalfReceiver: g.secondHalfReceiver, receiptVersion: g.receiptVersion, disposition,');
 once('["seedHex", "rngState", "runHistory",','["receiptSeed", "seedHex", "rngState", "runHistory",');
 return source;
}
