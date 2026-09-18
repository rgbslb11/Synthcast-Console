// Requirement probe, not an implementation of the proposed OT rules.
import {createRuntime} from './runtime.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
const e = createRuntime({receiver:true}).inspect;
const g = e.initialGame(OPERATING_SLATE[0]);
g.seedHex = 'QA_ONLY-OT-readiness';
g.rngState = e.seedWords(g.seedHex, g.id);
Object.assign(g, {lifecycle:'ACTIVE', auto:true, quarter:4, period:'4th', activePeriod:'4', scoreboardSeconds:1,
  pendingPlay:{team:0, phase:'PLAY', remaining:1, playSec:1, clockBefore:1, desc:'Incomplete pass', yards:0, points:0, turnover:false, punt:false, fg:false, first:false, inBounds:false, incomplete:true, strategy:'NORMAL', edgeAtSnap:0, deadSec:0, runoffSec:0}});
e.advanceGame(g, 1);
const result = {case:'O02', qaOnly:true, official:false, expectedBreakSeconds:600, actualBreakSeconds:g.breakSeconds, status:g.breakSeconds === 600 ? 'PASS' : 'FAIL'};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.status === 'PASS' ? 0 : 1;
