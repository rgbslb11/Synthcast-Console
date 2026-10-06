// Requirements 6 and 7 only. Applies to the byte-verified 4.4.1 runtime.
// This is a generator transform, not a deployable backend or a data rollover.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const BASELINE_SHA='04eaca91b7cb8e842ebe2bde828ea3bf5d0872a34cd8ba070378e891626acd80';
const once=(source,from,to)=>{assert.equal(source.split(from).length,2,'Unexpected 4.4.1 source anchor: '+from.slice(0,80));return source.replace(from,()=>to);};
export function applyFootballFixes(source){
 assert.equal(createHash('sha256').update(source).digest('hex'),BASELINE_SHA,'Exact 4.4.1 runtime required');
 let s=once(source,'const CAL = {','// Existing three-timeout allotment; shared by initialization and halftime.\nconst HALF_TIMEOUT_ALLOTMENT = 3;\n\nconst CAL = {');
 const timeouts='awayTimeouts: 3, homeTimeouts: 3,';
 assert.equal(s.split(timeouts).length,3,'Initial game and restart timeout anchors');
 s=s.replaceAll(timeouts,'awayTimeouts: HALF_TIMEOUT_ALLOTMENT, homeTimeouts: HALF_TIMEOUT_ALLOTMENT, secondHalfTimeoutsReset: false,');
 s=once(s,'function strategy(g: Game) {',`// A strategy query must not mutate state or consume RNG. The engine snaps
// immediately when no play is pending: the displayed play clock provides no
// extra pre-snap clock burn. Use its actual two-second kneel and postTiming()
// runoff/timeout rules, through third down only. TV breaks consume GL, not the
// football clock, and do not change the available clock-burning capacity.
function canSafelyKneel(g: Game) {
  if (g.quarter !== 4 || g.activePeriod !== "4" || offScore(g) <= defScore(g) ||
      !Number.isInteger(g.down) || g.down < 1 || g.down >= 4 ||
      !Number.isFinite(g.scoreboardSeconds) || g.scoreboardSeconds <= 0 ||
      !Number.isFinite(g.playClockSeconds) || g.playClockSeconds < 0 || g.pendingPlay) return false;
  const sim = { ...g };
  for (let down = g.down; down < 4; down++) {
    // Do not voluntarily lose the ball in the offense's own end zone.
    if (sim.fieldPos <= 1) return false;
    sim.fieldPos--;
    sim.scoreboardSeconds -= 2;
    if (sim.scoreboardSeconds <= 0) return true;
    const kneel = { team: sim.possession, strategy: "KNEEL", incomplete: false,
      points: 0, turnover: false, punt: false, fg: false, inBounds: true, first: false } as Play;
    postTiming(sim, kneel);
    sim.scoreboardSeconds -= kneel.runoffSec;
    if (sim.scoreboardSeconds <= 0) return true;
  }
  return false;
}
function strategy(g: Game) {`);
 s=once(s,'  if (g.quarter === 4 && t <= 160 && diff > 0 && defTO(g) === 0) return "KNEEL";','  if (canSafelyKneel(g)) return "KNEEL";');
 s=once(s,'  const old = g.fieldPos, t = p.team;','  const old = g.fieldPos, t = p.team;\n  const fourthDownKneel = g.down === 4 && p.strategy === "KNEEL";');
 s=once(s,'  postTiming(g, p); p.phase = "POST"; p.remaining = p.deadSec + p.runoffSec;',`  // flip() has already atomically initialized the opponent's possession.
  // Mark this forced kneel's change of possession before timing so no old
  // offense runoff resumes and no defensive timeout is consumed unnecessarily.
  if (fourthDownKneel) { p.turnover = true; g.gameClockStatus = "STOPPED"; }
  postTiming(g, p); p.phase = "POST"; p.remaining = p.deadSec + p.runoffSec;`);
 s=once(s,'  if (q !== -1 && ![2, 3, 4].includes(q)) throw new Error(`invalid pending period transition: ${q}`);',`  if (q !== -1 && ![2, 3, 4].includes(q)) throw new Error(\`invalid pending period transition: \${q}\`);
  // Retrying an already-applied halftime transition must not reset the clock,
  // possession, or timeouts. The persisted marker also survives Chairman edits.
  if (q === 3 && g.quarter === 3) return;
  if (q === 3 && g.quarter !== 2) throw new Error("Q3 requires a valid halftime transition");`);
 s=once(s,'  if (q === 3) { g.possession = 1; g.fieldPos = 25; g.down = 1; g.distance = 10; g.lastPlay = "Second-half kickoff"; }',`  if (q === 3) {
    if (!g.secondHalfTimeoutsReset) {
      g.awayTimeouts = HALF_TIMEOUT_ALLOTMENT;
      g.homeTimeouts = HALF_TIMEOUT_ALLOTMENT;
      g.secondHalfTimeoutsReset = true;
    }
    g.possession = 1; g.fieldPos = 25; g.down = 1; g.distance = 10; g.lastPlay = "Second-half kickoff";
  }`);
 return s;
}
