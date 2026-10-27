import {OPERATING_SLATE} from './week10.mjs';
import {TEAM_POWER} from './power.mjs';
import {freshDeadman,arm as deadmanArm,disarm as deadmanDisarm,tick as deadmanTick,afterOperatorCommand} from '../src/deadman.mjs';
import {WEATHER_MODEL_VERSION,freshWeather,setWeather,lockWeather,weatherPassRate,weatherCompletion,weatherInterception,weatherFumble,weatherExplosivePass,weatherFieldGoal,weatherPunt,weatherAudit} from '../src/weather.mjs';






const ENGINE_VERSION = "GC-W10-V5.0.4-RC1";
const DATA_VERSION = "W10-SLATE56+RATINGS121_CHAIRMAN_R2+CSV_f615022104fe545a+V504";
const WEEK_KEY = "2026-W10";
const CONSOLE_URL = "https://rgbslb11.github.io/Synthcast-Console/v5.0.4/w10/";
const SPEEDS = [1, 4, 10, 20, 50];
const FINALISH = new Set(["FINAL_PENDING", "LOCKED", "READY", "FINAL"]);

// Existing three-timeout allotment; shared by initialization and halftime.
const HALF_TIMEOUT_ALLOTMENT = 3;

const HOME_FIELD_TARGET_POINTS = 2.66;
const HOME_FIELD_NORMALIZED_EDGE = 0.006;

const CAL = {
  performanceEdgeMultiplier: 4.0,
  normalRunoffBase: 22,
  positiveEdgeTempo: 5,
  negativeEdgeSlow: 4,
  fourMinuteRunoff: 30,
  twoMinuteRunoff: 10,
  endHalfRunoff: 14,
  stoppedDeadNormal: 25,
  stoppedDeadFast: 12,
  outOfBoundsReset: 6,
  outOfBoundsRunoff: 15,
  firstDownReset: 3,
  firstDownRunoffFast: 7,
  firstDownRunoffSlow: 12,
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-operator-token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Cache-Control": "no-store",
};
const json = (body         , status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json; charset=utf-8" },
});
const clamp = (lo        , v        , hi        ) => Math.max(lo, Math.min(v, hi));
const now = () => new Date().toISOString();
const randHex = (n        ) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s        ) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), b => b.toString(16).padStart(2, "0")).join("");

                                
             
              
               
                
                 
                    
                
              
                 
                    
                      
                  
                    
                  
                   
                         
                    
                      
                     
                                         
                  
                               
  

function seedWords(seed        , id        ) {
  const t = `${seed}|${id}`;
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = 0xdeadbeef;
  for (const ch of t) {
    const x = ch.charCodeAt(0);
    a = Math.imul(a ^ x, 2654435761) >>> 0;
    b = Math.imul(b ^ x, 1597334677) >>> 0;
    c = Math.imul(c ^ x, 2246822519) >>> 0;
    d = Math.imul(d ^ x, 3266489917) >>> 0;
  }
  return [a || 1, b || 2, c || 3, d || 4];
}
function rnd(g      ) {
  let [a, b, c, d] = g.rngState            ;
  const t = (a + b + d) >>> 0;
  d = (d + 1) >>> 0;
  a = (b ^ (b >>> 9)) >>> 0;
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  g.rngState = [a, b, c, d];
  return t / 4294967296;
}
const runId = (id        , n        ) => `${id}-R${String(n).padStart(2, "0")}`;
const blankScores = () => ({ "1": [0, 0], "2": [0, 0], "3": [0, 0], "4": [0, 0] });
const validScorePeriod = (k        ) => ["1", "2", "3", "4", "OT"].includes(k) || /^(?:[2-9]|[1-9][0-9]+)OT$/.test(k);
function total(g      , t       )         {
  return (Object.entries(g.scores ?? {})                   ).reduce((s        , [k, q]               ) => validScorePeriod(k) ? s + (Number(q?.[t]) || 0) : s, 0);
}
const periodLabel = (q        ) => {
  if (q === 1) return "1st";
  if (q === 2) return "2nd";
  if (q === 3) return "3rd";
  if (q === 4) return "4th";
  throw new Error(`invalid regulation quarter: ${q}`);
};
const ratingReady = (p     ) => !!p && Number.isFinite(Number(p.offense)) && Number.isFinite(Number(p.defense)) && Number.isFinite(Number(p.overall));

// Separate stream: opening-toss draws never consume the play RNG.
function ensureOpeningToss(g      ) {
  if (g.coinToss) return g.coinToss;
  const rng = { rngState: seedWords(g.seedHex + "|" + ENGINE_VERSION + "|OPENING_TOSS_V1", g.id) };
  const winner = rnd(rng) < .5 ? 1 : 0;
  const choice = rnd(rng) < .75 ? "KICK" : "RECEIVE";
  const kicker = choice === "KICK" ? winner : 1 - winner;
  const receiver = 1 - kicker;
  const ids = [g.away.name, g.home.name]; // Baseline-approved canonical identifiers.
  const toss = {
    winnerTeamId: ids[winner], choice,
    openingKickingTeamId: ids[kicker], openingReceivingTeamId: ids[receiver],
    q3KickingTeamId: ids[receiver], q3ReceivingTeamId: ids[kicker],
    seedHex: g.seedHex, runId: g.runId, engineVersion: ENGINE_VERSION,
  };
  g.coinToss = toss;
  g.coinTossAudit = [{ type: "OPENING_COIN_TOSS", ...toss }];
  g.possession = receiver;
  return toss;
}
function initialGame(s     )       {
  const seed = randHex(16), ap = TEAM_POWER[s.away] ?? null, hp = TEAM_POWER[s.home] ?? null;
  return {
    ...s,
    away: { name: s.away, record: "" }, home: { name: s.home, record: "" },
    quarterLengthSeconds: 600, scoreboardSeconds: 600, playClockSeconds: 40, gameClockStatus: "STOPPED",
    glSeconds: 0, quarter: 1, period: "1st", activePeriod: "1", scores: blankScores(),
    possession: null, coinToss: null, coinTossAudit: [], fieldPos: 25, down: 1, distance: 10, awayTimeouts: HALF_TIMEOUT_ALLOTMENT, homeTimeouts: HALF_TIMEOUT_ALLOTMENT, secondHalfTimeoutsReset: false,
    breakSeconds: 0, breakLabel: "", pendingPeriod: 0, pendingPlay: null, tvBreaksTaken: [],
    history: [], runHistory: [], auto: false, onAir: false, operatorPaused: false, delayed: false,
    delayResume: null, editing: false, editSnapshot: null, editResume: null, locked: false,
    lifecycle: "UNLAUNCHED", activity: "UPCOMING", speed: 1, seedHex: seed, rngState: seedWords(seed, s.id),
    seedLocked: false, runNumber: 1, runId: runId(s.id, 1), continuationOf: null, createdRunAt: now(), launchedAt: null,
    completedAt: null, awayPower: ap, homePower: hp, powerReady: ratingReady(ap) && ratingReady(hp), powerSourceVersion: null,
    strategyMode: "NORMAL", lastPlay: "Ready for launch",
    teamPlayCount: [0, 0], teamTopSeconds: [0, 0], deadman:freshDeadman(), weather:freshWeather(),
  };
}
function score(g      , t       , pts        , source = "SIM") {
  const k = String(g.activePeriod);
  if (!validScorePeriod(k)) throw new Error(`invalid score period: ${k}`);
  const cur = g.scores[k] ?? [0, 0], n                   = [Number(cur[0] || 0), Number(cur[1] || 0)];
  n[t] += pts; g.scores[k] = n;
  g.history.push({ masterZulu: now(), gl: g.glSeconds, period: k, team: t, points: pts, source });
}
const offScore = (g      ) => g.possession === 0 ? total(g, 0) : total(g, 1);
const defScore = (g      ) => g.possession === 0 ? total(g, 1) : total(g, 0);
const offTO = (g      ) => g.possession === 0 ? g.awayTimeouts : g.homeTimeouts;
const defTO = (g      ) => g.possession === 0 ? g.homeTimeouts : g.awayTimeouts;
const teamTO = (g      , t       ) => t === 0 ? g.awayTimeouts : g.homeTimeouts;
function useTO(g      , t       ) {
  if (t === 0 && g.awayTimeouts > 0) { g.awayTimeouts--; return true; }
  if (t === 1 && g.homeTimeouts > 0) { g.homeTimeouts--; return true; }
  return false;
}
// A strategy query must not mutate state or consume RNG. The engine snaps
// immediately when no play is pending: the displayed play clock provides no
// extra pre-snap clock burn. Use its actual two-second kneel and postTiming()
// runoff/timeout rules, through third down only. TV breaks consume GL, not the
// football clock, and do not change the available clock-burning capacity.
function canSafelyKneel(g      ) {
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
      points: 0, turnover: false, punt: false, fg: false, inBounds: true, first: false }        ;
    postTiming(sim, kneel);
    sim.scoreboardSeconds -= kneel.runoffSec;
    if (sim.scoreboardSeconds <= 0) return true;
  }
  return false;
}
function strategy(g      ) {
  if (g.quarter !== 2 && g.quarter !== 4) return "NORMAL";
  const diff = offScore(g) - defScore(g), t = g.scoreboardSeconds;
  if (canSafelyKneel(g)) return "KNEEL";
  if (g.quarter === 4 && t <= 240 && diff > 0) return "FOUR_MINUTE";
  if (g.quarter === 4 && t <= 90 && diff <= -9) return "DESPERATION";
  if (g.quarter === 4 && t <= 120 && Math.abs(diff) <= 3 && g.fieldPos >= 60) return "FG_MANAGEMENT";
  if (g.quarter === 4 && t <= 120 && diff <= 0) return "TWO_MINUTE";
  if (g.quarter === 2 && t <= 120) return "END_HALF";
  if (t <= 240) return diff > 0 ? "FOUR_MINUTE" : g.quarter === 2 ? "END_HALF" : "TWO_MINUTE";
  return "NORMAL";
}
function edge(g      , t       ) {
  const own = t === 0 ? g.awayPower : g.homePower, opp = t === 0 ? g.homePower : g.awayPower;
  if (!ratingReady(own) || !ratingReady(opp)) return 0;
  const vals = [Math.abs(Number(own.offense)), Math.abs(Number(opp.defense)), Math.abs(Number(own.overall)), Math.abs(Number(opp.overall))];
  const scale = Math.max(1, vals.reduce((a, b) => a + b, 0) / vals.length);
  let e = (.62 * (Number(own.offense) - Number(opp.defense)) + .38 * (Number(own.overall) - Number(opp.overall))) / scale;
  if (!g.neutral) e += t === 1 ? HOME_FIELD_NORMALIZED_EDGE : -HOME_FIELD_NORMALIZED_EDGE;
  return clamp(-.45, e, .45);
}
const performanceEdge = (raw        ) => clamp(-.60, raw * CAL.performanceEdgeMultiplier, .60);
const passRate = (m        ) => m === "KNEEL" ? 0 : m === "FOUR_MINUTE" ? .28 : m === "TWO_MINUTE" ? .74 : m === "DESPERATION" ? .86 : m === "END_HALF" ? .66 : m === "FG_MANAGEMENT" ? .58 : .50;
function fourthGo(g      , m        ) {
  if (g.down !== 4) return false;
  const diff = offScore(g) - defScore(g);
  // A tied team in its own goal-line area has no must-score exception.
  // Keep normal short-yardage and trailing/desperation behavior unchanged.
  if (g.quarter === 4 && diff === 0 && g.fieldPos <= 10 && g.distance > 2) return false;
  if (m === "DESPERATION" || m === "TWO_MINUTE") return g.distance <= 8 || g.scoreboardSeconds < 80;
  if (g.quarter === 4 && diff < 0 && g.scoreboardSeconds < 300) return g.distance <= 5;
  return g.fieldPos >= 45 && g.distance <= 2;
}

function normalRunoff(edgeAtSnap        ) {
  return Math.max(8, Math.round(
    CAL.normalRunoffBase - CAL.positiveEdgeTempo * Math.max(0, edgeAtSnap) + CAL.negativeEdgeSlow * Math.max(0, -edgeAtSnap)
  ));
}
function postTiming(g      , p      ) {
  const under2 = (g.quarter === 2 || g.quarter === 4) && g.scoreboardSeconds <= 120;
  let dead = 0, run = 0;
  if (p.incomplete || p.points > 0 || p.turnover || p.punt || p.fg) {
    dead = p.strategy === "TWO_MINUTE" || p.strategy === "DESPERATION" ? CAL.stoppedDeadFast : CAL.stoppedDeadNormal;
  } else if (!p.inBounds) {
    if (under2) dead = p.strategy === "TWO_MINUTE" || p.strategy === "DESPERATION" ? CAL.stoppedDeadFast : CAL.stoppedDeadNormal;
    else { dead = CAL.outOfBoundsReset; run = CAL.outOfBoundsRunoff; }
  } else if (under2 && p.first) {
    dead = CAL.firstDownReset;
    run = p.strategy === "TWO_MINUTE" || p.strategy === "DESPERATION" ? CAL.firstDownRunoffFast : CAL.firstDownRunoffSlow;
  } else if (p.strategy === "FOUR_MINUTE" || p.strategy === "KNEEL") run = CAL.fourMinuteRunoff;
  else if (p.strategy === "TWO_MINUTE" || p.strategy === "DESPERATION") run = CAL.twoMinuteRunoff;
  else if (p.strategy === "END_HALF" || p.strategy === "FG_MANAGEMENT") run = CAL.endHalfRunoff;
  else run = normalRunoff(p.edgeAtSnap);

  const off = p.team, def = (off === 0 ? 1 : 0)         ;
  const diff = total(g, off) - total(g, def);
  if (run > 0 && g.quarter === 4 && diff > 0 && g.scoreboardSeconds <= 180 && teamTO(g, def) > 0 && useTO(g, def)) {
    dead = 45; run = 0;
  } else if (run > 0 && (p.strategy === "TWO_MINUTE" || p.strategy === "DESPERATION") && g.scoreboardSeconds <= 55 && teamTO(g, off) > 0 && useTO(g, off)) {
    dead = 35; run = 0;
  }
  p.deadSec = dead; p.runoffSec = run;
}

const weatherHasFootballEffect = (wx     ) => wx?.enabled === true && (wx.wind !== 'NONE' || wx.rain !== 'NONE');


function protectLateLead(g){return g.quarter===4 && g.activePeriod==='4' && offScore(g)>defScore(g) && g.scoreboardSeconds>0 && g.scoreboardSeconds<80;}
function situationalPassRate(g,m){if(!protectLateLead(g)||g.down===4)return passRate(m);if(g.down<=2||g.distance<=2)return .05;return g.distance<=5?.15:.40;}
function prioritizeFieldGoal(g){if(g.pendingPlay||g.fieldPos<62||g.scoreboardSeconds<5)return false;const d=offScore(g)-defScore(g);if(g.quarter===4&&d<=0&&d>=-3){if(g.down===4&&g.scoreboardSeconds<=120)return true;if(g.scoreboardSeconds<=8)return true;}return g.quarter===2&&g.scoreboardSeconds<=8;}

function generatePlay(g      ) {
  if (!g.powerReady) { g.auto = false; g.lastPlay = "AUTO blocked · offense/defense/overall power missing"; return; }
  const t = g.possession         , m = strategy(g), raw = edge(g, t), e = performanceEdge(raw);
  g.strategyMode = m;
  g.teamPlayCount[t] = Number(g.teamPlayCount[t] || 0) + 1;
  const base = { team: t, runoffSec: 0, deadSec: 0, strategy: m, phase: "PLAY"         , clockBefore: g.scoreboardSeconds, edgeAtSnap: e };

  if (m === "KNEEL") {
    g.pendingPlay = { ...base, desc: "Quarterback kneel", yards: -1, points: 0, turnover: false, punt: false, fg: false, first: false, inBounds: true, incomplete: false, playSec: 2, remaining: 2 };
    return;
  }
  if (prioritizeFieldGoal(g) || (g.down === 4 && g.fieldPos >= 62 && !fourthGo(g, m))) {
    const dist = 117 - g.fieldPos, fgBase = clamp(.45, .90 - Math.max(0, dist - 35) * .018 + e * .25, .96), fgProb=weatherFieldGoal(fgBase,dist,g.weather), ok = rnd(g) < fgProb;
    g.pendingPlay = { ...base, desc: `${dist}-yard field goal ${ok ? "GOOD" : "NO GOOD"}`, yards: 0, points: ok ? 3 : 0, turnover: !ok, punt: false, fg: true, first: false, inBounds: false, incomplete: false, playSec: 5, remaining: 5, ...(weatherHasFootballEffect(g.weather) ? {weatherAudit:weatherAudit(g.weather,{primitive:'FIELD_GOAL',distance:dist,before:fgBase,after:fgProb})} : {}) };
    return;
  }
  if (g.down === 4 && !fourthGo(g, m) && g.fieldPos < 62) {
    const rawNet = 34 + Math.floor(rnd(g) * 15), net=weatherPunt(rawNet,g.weather);
    g.pendingPlay = { ...base, desc: `Punt · ${net} net yards`, yards: net, points: 0, turnover: false, punt: true, fg: false, first: false, inBounds: false, incomplete: false, playSec: 7, remaining: 7, ...(weatherHasFootballEffect(g.weather) ? {weatherAudit:weatherAudit(g.weather,{primitive:'PUNT',before:rawNet,after:net})} : {}) };
    return;
  }

  const basePassRate=situationalPassRate(g,m), adjustedPassRate=weatherPassRate(basePassRate,g.weather), pass = rnd(g) < adjustedPassRate, r = rnd(g);
  let yards = 0, incomplete = false, inBounds = true, turnover = false, desc = "";
  let wxAudit                       =weatherAudit(g.weather,{primitive:pass?'PASS':'RUN',passRateBefore:basePassRate,passRateAfter:adjustedPassRate});
  if (pass) {
    const sack = clamp(.02, .065 - e * .04, .10), pickBase = clamp(.006, .025 - e * .025, .055), compBase = clamp(.44, .62 + e * .18, .82), pick=weatherInterception(pickBase,g.weather,false), comp=weatherCompletion(compBase,g.weather,false);
    wxAudit=weatherAudit(g.weather,{primitive:'PASS',deepIntent:null,deepWeatherEffects:'DEFERRED_PENDING_ENDGAME_CONTEXT',passRateBefore:basePassRate,passRateAfter:adjustedPassRate,completionBefore:compBase,completionAfter:comp,interceptionBefore:pickBase,interceptionAfter:pick});
    if (r < sack) { yards = -(3 + Math.floor(rnd(g) * 8)); desc = `Sack for ${-yards}-yard loss`; }
    else if (r < sack + pick) { yards = Math.floor(rnd(g) * 12); turnover = true; desc = "Pass intercepted"; }
    else if (r < sack + pick + comp) {
      const explosiveBase=.12+e*.08, explosive=weatherExplosivePass(explosiveBase,g.weather);
      yards = rnd(g) < explosive ? 16 + Math.floor(rnd(g) * 29) : 2 + Math.floor(rnd(g) * 14);
      wxAudit={...wxAudit,explosiveBefore:explosiveBase,explosiveAfter:explosive};
      inBounds = rnd(g) > (m === "TWO_MINUTE" || m === "DESPERATION" ? .32 : .12);
      desc = `Pass complete for ${yards} yards${inBounds ? " in bounds" : " out of bounds"}`;
    } else { incomplete = true; inBounds = false; desc = "Incomplete pass"; }
  } else {
    const fumbleBase=clamp(.004, .014 - e * .01, .03),fumble=weatherFumble(fumbleBase,g.weather);wxAudit={...wxAudit,fumbleBefore:fumbleBase,fumbleAfter:fumble};
    if (r < fumble) { yards = Math.floor(rnd(g) * 8); turnover = true; desc = "Run · fumble lost"; }
    else {
      yards = rnd(g) < .15 ? -(1 + Math.floor(rnd(g) * 4)) : rnd(g) < (.08 + e * .05) ? 11 + Math.floor(rnd(g) * 25) : Math.floor(rnd(g) * 9);
      inBounds = rnd(g) > (protectLateLead(g) ? .02 : .08); desc = `Run for ${yards} yards${inBounds ? " in bounds" : " out of bounds"}`;
    }
  }

  // Preserve the eligible RNG draw; never upgrade generated yardage to the line to gain.
  if (!turnover && !incomplete && yards > 0 && yards < g.distance && e > 0) { rnd(g); }
  const first = !turnover && !incomplete && yards >= g.distance, sec = 3 + Math.floor(rnd(g) * 6);
  g.pendingPlay = { ...base, desc, yards, points: 0, turnover, punt: false, fg: false, first, inBounds, incomplete, playSec: sec, remaining: sec, ...(weatherHasFootballEffect(g.weather) ? {weatherAudit:wxAudit} : {}) };
}

function flip(g      , newField        ) {
  g.possession = g.possession === 0 ? 1 : 0;
  g.fieldPos = clamp(1, Math.round(newField), 99); g.down = 1; g.distance = Math.min(10, 100 - g.fieldPos); g.gameClockStatus = "STOPPED";
}
function applyPlay(g      , p      ) {
  const old = g.fieldPos, t = p.team;
  p.preSnap={down:g.down,distance:g.distance,fieldPos:g.fieldPos};
  const fourthDownKneel = g.down === 4 && p.strategy === "KNEEL";
  if (p.fg) { if (p.points) score(g, t, p.points); flip(g, 25); }
  else if (p.punt) { const land = clamp(1, old + p.yards, 99); flip(g, 100 - land); }
  else if (p.turnover) { const spot = clamp(1, old + Math.max(0, p.yards), 99); flip(g, 100 - spot); }
  else {
    const next = old + p.yards;
    if (next <= 0 && !p.incomplete) {
      const defender = t === 0 ? 1 : 0;
      score(g, defender, 2); p.points = 2; p.scoringTeam = defender;
      p.ruling = "SAFETY"; p.originalDescription = p.desc;
      p.desc = "SAFETY · " + p.desc;
      // Existing engine abstracts kickoffs into the next possession at OWN 25.
      // Preserve that abstraction, with the conceding side kicking from OWN 20.
      p.freeKick = { kickingTeam: t, receivingTeam: defender, fromOwn: 20 };
      flip(g, 25);
    }
    else if (next >= 100) { score(g, t, 7); p.points = 7; flip(g, 25); p.desc = "TOUCHDOWN · " + p.desc; }
    else {
      g.fieldPos = clamp(1, next, 99);
      if (p.first) { g.down = 1; g.distance = Math.min(10, 100 - g.fieldPos); }
      else {
        g.distance = Math.max(1, g.distance - p.yards); g.down++;
        if (g.down > 4) { const spot = g.fieldPos; const originalDescription = p.desc; flip(g, 100 - spot); p.turnover = true; p.ruling = "TURNOVER_ON_DOWNS"; p.originalDescription = originalDescription; p.desc = "Turnover on downs · " + originalDescription; }
      }
    }
  }
  p.adjudicated={possession:g.possession,fieldPos:g.fieldPos,down:g.down,distance:g.distance,points:p.points};
  g.lastPlay = `${t === 0 ? g.away.name : g.home.name} · ${p.desc}`;
  g.history.push({ masterZulu: now(), gl: g.glSeconds, period: g.activePeriod, clock: g.scoreboardSeconds, team: t, desc: p.desc, yards: p.yards, strategy: p.strategy, preSnap:p.preSnap, adjudicated:p.adjudicated, score: [total(g, 0), total(g, 1)], ...(p.ruling ? { ruling: p.ruling, originalDescription: p.originalDescription } : {}), ...(p.freeKick ? { scoringTeam: p.scoringTeam, freeKick:p.freeKick } : {}), ...(p.weatherAudit ? { weatherAudit:p.weatherAudit } : {}) });
  // flip() has already atomically initialized the opponent's possession.
  // Mark this forced kneel's change of possession before timing so no old
  // offense runoff resumes and no defensive timeout is consumed unnecessarily.
  if (fourthDownKneel) { p.turnover = true; g.gameClockStatus = "STOPPED"; }
  postTiming(g, p); p.phase = "POST"; p.remaining = p.deadSec + p.runoffSec;
  
}
function thresholds(g      ) {
  const q = g.quarterLengthSeconds;
  return (g.quarter === 1 || g.quarter === 3
    ? [[Math.round(q * .75), 180, "Scheduled TV timeout"], [Math.round(q * .475), 180, "Scheduled TV timeout"], [Math.round(q * .25), 180, "Scheduled TV timeout"], [120, 180, "Scheduled TV timeout"]]
    : [[Math.round(q * .75), 180, "Scheduled TV timeout"], [Math.round(q * .5), 180, "Scheduled TV timeout"], [120, 150, "Two-minute timeout"]])                              ;
}
function maybeBreak(g      , before        , after        ) {
  for (const [th, dur, label] of thresholds(g)) {
    const k = `Q${g.quarter}-${th}`;
    if (before > th && after <= th && !g.tvBreaksTaken.includes(k)) {
      g.tvBreaksTaken.push(k); g.breakSeconds = dur; g.breakLabel = label; g.activity = "BREAK"; g.gameClockStatus = "STOPPED"; return true;
    }
  }
  return false;
}
function nextBreakBoundary(g      , before        ) {
  let next                = null;
  for (const [th] of thresholds(g)) {
    const k = `Q${g.quarter}-${th}`;
    if (before > th && !g.tvBreaksTaken.includes(k) && (next === null || th > next)) next = th;
  }
  return next;
}
function finishGame(g      , label        ) {
  g.lifecycle = "FINAL_PENDING"; g.activity = "FINAL"; g.auto = false; g.onAir = false; g.operatorPaused = false; g.delayed = false;
  g.pendingPlay = null; g.breakSeconds = 0; g.gameClockStatus = "STOPPED"; g.completedAt = now();
  g.lastPlay = `${label} · ${total(g, 0)}-${total(g, 1)} · awaiting lock`;
}
function finishPeriod(g      ) {
  g.scoreboardSeconds = 0; g.pendingPlay = null; g.gameClockStatus = "STOPPED";
  if (g.quarter === 1) { g.pendingPeriod = 2; g.breakSeconds = 255; g.breakLabel = "END 1ST"; g.activity = "BREAK"; }
  else if (g.quarter === 2) { g.pendingPeriod = 3; g.breakSeconds = 1200; g.breakLabel = "HALFTIME"; g.activity = "BREAK"; }
  else if (g.quarter === 3) { g.pendingPeriod = 4; g.breakSeconds = 255; g.breakLabel = "END 3RD"; g.activity = "BREAK"; }
  else if (g.quarter === 4 && total(g, 0) === total(g, 1)) { g.period = "OT"; g.activePeriod = "OT"; g.scores.OT = [0, 0]; g.breakSeconds = 180; g.breakLabel = "OT setup"; g.pendingPeriod = -1; g.activity = "OT"; }
  else if (g.quarter === 4) finishGame(g, "Regulation complete");
  else throw new Error(`invalid quarter at period end: ${g.quarter}`);
}
function advancePeriod(g      ) {
  const q = Number(g.pendingPeriod || 0); g.pendingPeriod = 0; g.breakLabel = "";
  if (q !== -1 && ![2, 3, 4].includes(q)) throw new Error(`invalid pending period transition: ${q}`);
  // Retrying an already-applied halftime transition must not reset the clock,
  // possession, or timeouts. The persisted marker also survives Chairman edits.
  if (q === 3 && g.quarter === 3) return;
  if (q === 3 && g.quarter !== 2) throw new Error("Q3 requires a valid halftime transition");
  if (q === -1) {
    const a = rnd(g) < .5 ? 0 : 1, b = a === 0 ? 1 : 0, ot = (t       ) => rnd(g) < clamp(.35, .52 + edge(g, t) * .2, .66) ? 7 : rnd(g) < .55 ? 3 : 0;
    score(g, a         , ot(a         )); score(g, b         , ot(b         ));
    if (total(g, 0) === total(g, 1)) {
      const n = Object.keys(g.scores).filter(x => x.includes("OT")).length + 1, k = `${n}OT`;
      g.activePeriod = k; g.period = k; g.scores[k] = [0, 0]; g.breakSeconds = 60; g.breakLabel = `${k} setup`; g.pendingPeriod = -1;
    } else finishGame(g, "Overtime complete");
    return;
  }
  g.quarter = q; g.period = periodLabel(q); g.activePeriod = String(q); g.scoreboardSeconds = g.quarterLengthSeconds; g.gameClockStatus = "STOPPED"; g.activity = "LIVE";
  if (q === 3) {
    if (!g.secondHalfTimeoutsReset) {
      g.awayTimeouts = HALF_TIMEOUT_ALLOTMENT;
      g.homeTimeouts = HALF_TIMEOUT_ALLOTMENT;
      g.secondHalfTimeoutsReset = true;
    }
    if (!g.coinToss) throw new Error("Opening coin toss missing at Q3 transition");
    g.possession = g.coinToss.q3ReceivingTeamId === g.home.name ? 1 : 0;
    g.fieldPos = 25; g.down = 1; g.distance = 10; g.lastPlay = "Second-half kickoff";
  }
}
function advanceGame(g      , seconds        ) {
  if (seconds <= 0 || g.lifecycle === "UNLAUNCHED" || FINALISH.has(g.lifecycle)) return;
  let rem = Math.floor(seconds), guard = 0;
  while (rem > 0 && !FINALISH.has(g.lifecycle) && g.lifecycle !== "UNLAUNCHED" && guard++ < 20000) {
    if (g.operatorPaused || g.editing || g.delayed || g.lifecycle === "EDIT" || g.lifecycle === "DELAY") { g.glSeconds += rem; return; }
    if (g.breakSeconds > 0) {
      const s = Math.min(rem, g.breakSeconds); g.breakSeconds -= s; g.glSeconds += s; rem -= s;
      if (g.breakSeconds === 0) {
        if (g.pendingPeriod !== 0) advancePeriod(g);
        else { g.breakLabel = ""; g.activity = "LIVE"; g.gameClockStatus = "STOPPED"; }
      }
      continue;
    }
    const p = g.pendingPlay               ;
    if (p) {
      if (p.phase === "PLAY") {
        // A snap begun before 0:00 must be allowed to finish even if its play duration extends past the period clock.
        // Only the portion before 0:00 is charged to the scoreboard clock/TOP; the entire play duration counts toward GL.
        const s = Math.min(rem, p.remaining), clockUsed = Math.min(s, g.scoreboardSeconds);
        p.remaining -= s; g.scoreboardSeconds -= clockUsed; g.glSeconds += s; g.teamTopSeconds[p.team] += clockUsed; rem -= s; g.gameClockStatus = "RUNNING";
        if (p.remaining <= 0) { applyPlay(g, p); maybeBreak(g, p.clockBefore, g.scoreboardSeconds); if (g.scoreboardSeconds <= 0) finishPeriod(g); }
        continue;
      }
      // POST is two deterministic segments: stopped dead-ball time, then clock-running runoff.
      // Never let a caller's wall-time chunk straddle that boundary, or the same seed can diverge by poll cadence.
      const deadRemaining = p.deadSec > 0 && p.remaining > p.runoffSec ? p.remaining - p.runoffSec : 0;
      if (deadRemaining > 0) {
        const s = Math.min(rem, deadRemaining);
        p.remaining -= s; g.glSeconds += s; rem -= s; g.gameClockStatus = "STOPPED";
        if (p.remaining <= 0) g.pendingPlay = null;
        continue;
      }
      const before = g.scoreboardSeconds, boundary = nextBreakBoundary(g, before);
      let s = Math.min(rem, p.remaining, g.scoreboardSeconds);
      if (boundary !== null) s = Math.min(s, before - boundary);
      if (s <= 0) {
        if (g.scoreboardSeconds <= 0) finishPeriod(g);
        else if (p.remaining <= 0) g.pendingPlay = null;
        continue;
      }
      p.remaining -= s; g.glSeconds += s; rem -= s; g.scoreboardSeconds -= s; g.teamTopSeconds[p.team] += s; g.gameClockStatus = "RUNNING";
      maybeBreak(g, before, g.scoreboardSeconds);
      if (p.remaining <= 0) g.pendingPlay = null;
      if (g.scoreboardSeconds <= 0) finishPeriod(g);
      continue;
    }
    if (g.auto && g.lifecycle === "ACTIVE") { generatePlay(g); if (!g.pendingPlay) return; continue; }
    g.glSeconds += rem; return;
  }
}
function project(state        , wall        ) {
  const w = Math.max(0, Math.min(21600, Math.floor(wall))), out = structuredClone(state);
  for (const g of out) {
    if (g.lifecycle === "UNLAUNCHED" || FINALISH.has(g.lifecycle)) continue;
    const frozen = g.operatorPaused || g.editing || g.delayed || g.lifecycle === "EDIT" || g.lifecycle === "DELAY";
    const sp = !frozen && g.auto && SPEEDS.includes(Number(g.speed)) ? Number(g.speed) : 1;
    advanceGame(g, w * sp);
  }
  return out;
}
function archive(g      , disposition        , note = "") { return { runId: g.runId, seedHex: g.seedHex, disposition, note, score: [total(g, 0), total(g, 1)], glSeconds: g.glSeconds, archivedAt: now() }; }
function reset(g      , newSeed         , note = "") {
  g.runHistory = [...(g.runHistory ?? []), archive(g, newSeed ? "PURGE_NEW_SEED" : "RESTART_SAME_SEED", note)].slice(-30);
  g.runNumber++; if (newSeed) g.seedHex = randHex(16); g.runId = runId(g.id, g.runNumber); g.rngState = seedWords(g.seedHex, g.id);
  if (newSeed) g.weather = { ...(g.weather ?? freshWeather()), locked: false, lockedAtZulu: null, snapshotId: null };
  Object.assign(g, { lifecycle: "UNLAUNCHED", activity: "UPCOMING", auto: false, onAir: false, operatorPaused: false, delayed: false, editing: false, editSnapshot: null, editResume: null, scoreboardSeconds: g.quarterLengthSeconds, glSeconds: 0, quarter: 1, period: "1st", activePeriod: "1", scores: blankScores(), possession: null, coinToss: null, coinTossAudit: [], fieldPos: 25, down: 1, distance: 10, awayTimeouts: HALF_TIMEOUT_ALLOTMENT, homeTimeouts: HALF_TIMEOUT_ALLOTMENT, secondHalfTimeoutsReset: false, breakSeconds: 0, breakLabel: "", pendingPeriod: 0, pendingPlay: null, tvBreaksTaken: [], history: [], locked: false, completedAt: null, seedLocked: false, teamPlayCount: [0, 0], teamTopSeconds: [0, 0] });
  g.lastPlay = newSeed ? "Purged · new seed assigned" : "Restarted · same seed preserved";
}
function display(g      ) {
  if (g.lifecycle === "DELAY" || g.delayed) return "DELAY";
  if (FINALISH.has(g.lifecycle)) return "FINAL";
  if (g.breakLabel === "HALFTIME") return "HALFTIME";
  if (g.breakLabel === "END 1ST" || g.breakLabel === "END 3RD") return g.breakLabel;
  if (String(g.period).includes("OT")) return g.period;
  return `${g.period} · ${Math.floor(g.scoreboardSeconds / 60)}:${String(Math.floor(g.scoreboardSeconds % 60)).padStart(2, "0")}`;
}
function publicGame(g      ) {
  const c = structuredClone(g);
  for (const k of ["seedHex", "rngState", "runHistory", "history", "awayPower", "homePower", "editSnapshot", "editResume", "pendingPlay", "deadman"]) delete c[k];
  if (c.coinToss) delete c.coinToss.seedHex;
  delete c.coinTossAudit;
  c.displayStatus = display(g); return c;
}
const confirmReq = (p     ) => { if (p?.confirmed !== true) throw new Error("confirmation required"); };
function beginEdit(g      , p     ) {
  if (["LOCKED", "READY", "FINAL"].includes(g.lifecycle)) confirmReq(p);
  g.editSnapshot = structuredClone(g); g.editResume = { lifecycle: g.lifecycle, auto: g.auto, onAir: g.onAir, operatorPaused: g.operatorPaused, delayed: g.delayed };
  g.lifecycle = "EDIT"; g.activity = "EDIT"; g.auto = false; g.onAir = false; g.operatorPaused = false; g.delayed = false; g.editing = true; g.pendingPlay = null; g.gameClockStatus = "STOPPED"; g.lastPlay = "Chairman edit · football state frozen · GL running";
}
function cancelEdit(g      ) {
  const s = g.editSnapshot; if (!s) throw new Error("edit snapshot missing"); const glNow = g.glSeconds;
  for (const [k, v] of Object.entries(s)) g[k] = structuredClone(v); g.glSeconds = glNow; g.editSnapshot = null; g.editResume = null; g.editing = false; g.lastPlay = "Chairman edit cancelled";
}
function continuation(g      ) {
  const parent = g.runId, parentSeed = g.seedHex; g.runHistory = [...(g.runHistory ?? []), archive(g, "CHAIRMAN_CONTINUATION")].slice(-30);
  g.runNumber++; g.seedHex = randHex(16); g.runId = runId(g.id, g.runNumber); g.rngState = seedWords(g.seedHex, g.id); g.seedLocked = true; g.continuationOf = parent;
  return { parentRun: parent, parentSeed, newRun: g.runId, newSeed: g.seedHex };
}
function commitEdit(g      , p     , event     ) {
  const prior = g.editResume ?? { lifecycle: "ACTIVE" }, before = { score: [total(g, 0), total(g, 1)], quarter: g.quarter, clock: g.scoreboardSeconds };
  if (p.scores) for (const [k, v] of Object.entries(p.scores)) if (Array.isArray(v) && v.length >= 2) { const a = Math.floor(Number(v[0])), h = Math.floor(Number(v[1])); if (Number.isFinite(a) && Number.isFinite(h) && a >= 0 && h >= 0 && a <= 99 && h <= 99) g.scores[k] = [a, h]; }
  if (p.quarter !== undefined) { const q = Math.floor(Number(p.quarter)); if (q >= 1 && q <= 4) { g.quarter = q; g.period = periodLabel(q); g.activePeriod = String(q); } }
  if (p.clockSeconds !== undefined) { const s = Math.floor(Number(p.clockSeconds)); if (!Number.isFinite(s) || s < 0 || s > g.quarterLengthSeconds) throw new Error("clock outside quarter range"); g.scoreboardSeconds = s; }
  if (p.possession === 0 || p.possession === 1) g.possession = p.possession;
  if (p.ballSide !== undefined || p.yardline !== undefined) { const y = clamp(1, Math.floor(Number(p.yardline ?? 25)), 50); g.fieldPos = String(p.ballSide) === "OPP" ? 100 - y : y; }
  if (p.down !== undefined) g.down = clamp(1, Math.floor(Number(p.down)), 4); if (p.distance !== undefined) g.distance = clamp(1, Math.floor(Number(p.distance)), 99);
  if (p.awayTimeouts !== undefined) g.awayTimeouts = clamp(0, Math.floor(Number(p.awayTimeouts)), 3); if (p.homeTimeouts !== undefined) g.homeTimeouts = clamp(0, Math.floor(Number(p.homeTimeouts)), 3);
  g.pendingPlay = null; g.breakSeconds = 0; g.breakLabel = ""; g.pendingPeriod = 0; g.editing = false; g.editSnapshot = null; g.editResume = null;
  event.before = before; event.after = { score: [total(g, 0), total(g, 1)], quarter: g.quarter, clock: g.scoreboardSeconds };
  if (FINALISH.has(prior.lifecycle)) { g.lifecycle = "FINAL_PENDING"; g.activity = "FINAL"; g.locked = false; g.auto = false; g.onAir = false; g.lastPlay = `Final corrected · ${total(g, 0)}-${total(g, 1)} · requires re-lock`; return; }
  if (prior.lifecycle === "DELAY" && !p.resumeAuto) { g.lifecycle = "DELAY"; g.activity = "DELAY"; g.delayed = true; g.auto = false; g.lastPlay = "Correction saved · DELAY preserved"; return; }
  g.lifecycle = "ACTIVE"; g.activity = "LIVE"; g.delayed = false; g.operatorPaused = !!p.hold; g.auto = !!p.resumeAuto && g.powerReady; g.onAir = false; event.continuation = continuation(g); g.lastPlay = g.auto ? `Correction saved · AUTO resumed · ${g.runId}` : "Correction saved · game held";
}
function applyPower(state        , ratings                                , source               ) {
  let teams = 0, ready = 0;
  for (const [name, p] of Object.entries(ratings ?? {})) {
    if (!ratingReady(p)) continue; teams++;
    for (const g of state) { if (g.away.name === name) g.awayPower = structuredClone(p); if (g.home.name === name) g.homePower = structuredClone(p); }
  }
  for (const g of state) { g.powerReady = ratingReady(g.awayPower) && ratingReady(g.homePower); if (source) g.powerSourceVersion = source; if (g.powerReady) ready++; }
  return { teamsLoaded: teams, readyGames: ready };
}


export {ENGINE_VERSION,DATA_VERSION,SPEEDS,FINALISH,initialGame,seedWords,strategy,generatePlay,applyPlay,advanceGame,advancePeriod,finishPeriod,postTiming,total,reset,project,edge,performanceEdge,blankScores,ensureOpeningToss,beginEdit,cancelEdit,commitEdit,finishGame,score,display,continuation};





