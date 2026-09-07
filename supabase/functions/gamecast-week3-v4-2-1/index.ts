import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { WEEK3 } from "./week3.ts";
import { TEAM_POWER, type TeamPowerInput } from "./power.ts";

const ENGINE_VERSION = "GC-W3-V4.2.1-RC1";
const DATA_VERSION = "W3-51+POWER_60_99_V421+PLAYVOL_CAL_2500";
const WEEK_KEY = "2026-W03";
const CONSOLE_URL = "https://rgbslb11.github.io/Synthcast-Console/v4.2.1/";
const SPEEDS = [1, 4, 10, 50];
const FINALISH = new Set(["FINAL_PENDING", "LOCKED", "READY", "FINAL"]);

const CAL = {
  performanceEdgeMultiplier: 4.0,
  chainSustainMultiplier: 5.0,
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
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json; charset=utf-8" },
});
const clamp = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(v, hi));
const now = () => new Date().toISOString();
const randHex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), b => b.toString(16).padStart(2, "0")).join("");

type Game = Record<string, any>;
type Play = {
  team: 0 | 1;
  desc: string;
  yards: number;
  points: number;
  turnover: boolean;
  punt: boolean;
  fg: boolean;
  first: boolean;
  inBounds: boolean;
  incomplete: boolean;
  playSec: number;
  runoffSec: number;
  deadSec: number;
  strategy: string;
  phase: "PLAY" | "POST";
  remaining: number;
  clockBefore: number;
  edgeAtSnap: number;
};

function seedWords(seed: string, id: string) {
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
function rnd(g: Game) {
  let [a, b, c, d] = g.rngState as number[];
  const t = (a + b + d) >>> 0;
  d = (d + 1) >>> 0;
  a = (b ^ (b >>> 9)) >>> 0;
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  g.rngState = [a, b, c, d];
  return t / 4294967296;
}
const runId = (id: string, n: number) => `${id}-R${String(n).padStart(2, "0")}`;
const blankScores = () => ({ "1": [0, 0], "2": [0, 0], "3": [0, 0], "4": [0, 0] });
function total(g: Game, t: 0 | 1): number {
  return (Object.values(g.scores ?? {}) as any[]).reduce((s: number, q: any) => s + (Number(q?.[t]) || 0), 0);
}
const periodLabel = (q: number) => q === 1 ? "1st" : q === 2 ? "2nd" : q === 3 ? "3rd" : "4th";
const ratingReady = (p: any) => !!p && Number.isFinite(Number(p.offense)) && Number.isFinite(Number(p.defense)) && Number.isFinite(Number(p.overall));

function initialGame(s: any): Game {
  const seed = randHex(16), ap = TEAM_POWER[s.away] ?? null, hp = TEAM_POWER[s.home] ?? null;
  return {
    ...s,
    away: { name: s.away, record: "" }, home: { name: s.home, record: "" },
    quarterLengthSeconds: 600, scoreboardSeconds: 600, playClockSeconds: 40, gameClockStatus: "STOPPED",
    glSeconds: 0, quarter: 1, period: "1st", activePeriod: "1", scores: blankScores(),
    possession: 0, fieldPos: 25, down: 1, distance: 10, awayTimeouts: 3, homeTimeouts: 3,
    breakSeconds: 0, breakLabel: "", pendingPeriod: 0, pendingPlay: null, tvBreaksTaken: [],
    history: [], runHistory: [], auto: false, onAir: false, operatorPaused: false, delayed: false,
    delayResume: null, editing: false, editSnapshot: null, editResume: null, locked: false,
    lifecycle: "UNLAUNCHED", activity: "UPCOMING", speed: 1, seedHex: seed, rngState: seedWords(seed, s.id),
    seedLocked: false, runNumber: 1, runId: runId(s.id, 1), continuationOf: null, createdRunAt: now(), launchedAt: null,
    completedAt: null, awayPower: ap, homePower: hp, powerReady: ratingReady(ap) && ratingReady(hp), powerSourceVersion: null,
    strategyMode: "NORMAL", lastPlay: "Ready for launch",
    teamPlayCount: [0, 0], teamTopSeconds: [0, 0],
  };
}
function score(g: Game, t: 0 | 1, pts: number, source = "SIM") {
  const k = g.activePeriod, cur = g.scores[k] ?? [0, 0], n: [number, number] = [Number(cur[0] || 0), Number(cur[1] || 0)];
  n[t] += pts; g.scores[k] = n;
  g.history.push({ masterZulu: now(), gl: g.glSeconds, period: k, team: t, points: pts, source });
}
const offScore = (g: Game) => g.possession === 0 ? total(g, 0) : total(g, 1);
const defScore = (g: Game) => g.possession === 0 ? total(g, 1) : total(g, 0);
const offTO = (g: Game) => g.possession === 0 ? g.awayTimeouts : g.homeTimeouts;
const defTO = (g: Game) => g.possession === 0 ? g.homeTimeouts : g.awayTimeouts;
const teamTO = (g: Game, t: 0 | 1) => t === 0 ? g.awayTimeouts : g.homeTimeouts;
function useTO(g: Game, t: 0 | 1) {
  if (t === 0 && g.awayTimeouts > 0) { g.awayTimeouts--; return true; }
  if (t === 1 && g.homeTimeouts > 0) { g.homeTimeouts--; return true; }
  return false;
}
function strategy(g: Game) {
  if (g.quarter !== 2 && g.quarter !== 4) return "NORMAL";
  const diff = offScore(g) - defScore(g), t = g.scoreboardSeconds;
  if (g.quarter === 4 && t <= 160 && diff > 0 && defTO(g) === 0) return "KNEEL";
  if (g.quarter === 4 && t <= 240 && diff > 0) return "FOUR_MINUTE";
  if (g.quarter === 4 && t <= 90 && diff <= -9) return "DESPERATION";
  if (g.quarter === 4 && t <= 120 && Math.abs(diff) <= 3 && g.fieldPos >= 60) return "FG_MANAGEMENT";
  if (g.quarter === 4 && t <= 120 && diff <= 0) return "TWO_MINUTE";
  if (g.quarter === 2 && t <= 120) return "END_HALF";
  if (t <= 240) return diff > 0 ? "FOUR_MINUTE" : g.quarter === 2 ? "END_HALF" : "TWO_MINUTE";
  return "NORMAL";
}
function edge(g: Game, t: 0 | 1) {
  const own = t === 0 ? g.awayPower : g.homePower, opp = t === 0 ? g.homePower : g.awayPower;
  if (!ratingReady(own) || !ratingReady(opp)) return 0;
  const vals = [Math.abs(Number(own.offense)), Math.abs(Number(opp.defense)), Math.abs(Number(own.overall)), Math.abs(Number(opp.overall))];
  const scale = Math.max(1, vals.reduce((a, b) => a + b, 0) / vals.length);
  let e = (.62 * (Number(own.offense) - Number(opp.defense)) + .38 * (Number(own.overall) - Number(opp.overall))) / scale;
  if (!g.neutral) e += t === 1 ? .035 : -.035;
  return clamp(-.45, e, .45);
}
const performanceEdge = (raw: number) => clamp(-.60, raw * CAL.performanceEdgeMultiplier, .60);
const passRate = (m: string) => m === "KNEEL" ? 0 : m === "FOUR_MINUTE" ? .28 : m === "TWO_MINUTE" ? .74 : m === "DESPERATION" ? .86 : m === "END_HALF" ? .66 : m === "FG_MANAGEMENT" ? .58 : .50;
function fourthGo(g: Game, m: string) {
  if (g.down !== 4) return false;
  const diff = offScore(g) - defScore(g);
  if (m === "DESPERATION" || m === "TWO_MINUTE") return g.distance <= 8 || g.scoreboardSeconds < 80;
  if (g.quarter === 4 && diff < 0 && g.scoreboardSeconds < 300) return g.distance <= 5;
  return g.fieldPos >= 45 && g.distance <= 2;
}

function normalRunoff(edgeAtSnap: number) {
  return Math.max(8, Math.round(
    CAL.normalRunoffBase - CAL.positiveEdgeTempo * Math.max(0, edgeAtSnap) + CAL.negativeEdgeSlow * Math.max(0, -edgeAtSnap)
  ));
}
function postTiming(g: Game, p: Play) {
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

  const off = p.team, def = (off === 0 ? 1 : 0) as 0 | 1;
  const diff = total(g, off) - total(g, def);
  if (run > 0 && g.quarter === 4 && diff > 0 && g.scoreboardSeconds <= 180 && teamTO(g, def) > 0 && useTO(g, def)) {
    dead = 45; run = 0;
  } else if (run > 0 && (p.strategy === "TWO_MINUTE" || p.strategy === "DESPERATION") && g.scoreboardSeconds <= 55 && teamTO(g, off) > 0 && useTO(g, off)) {
    dead = 35; run = 0;
  }
  p.deadSec = dead; p.runoffSec = run;
}

function generatePlay(g: Game) {
  if (!g.powerReady) { g.auto = false; g.lastPlay = "AUTO blocked · offense/defense/overall power missing"; return; }
  const t = g.possession as 0 | 1, m = strategy(g), raw = edge(g, t), e = performanceEdge(raw);
  g.strategyMode = m;
  g.teamPlayCount[t] = Number(g.teamPlayCount[t] || 0) + 1;
  const base = { team: t, runoffSec: 0, deadSec: 0, strategy: m, phase: "PLAY" as const, clockBefore: g.scoreboardSeconds, edgeAtSnap: e };

  if (m === "KNEEL") {
    g.pendingPlay = { ...base, desc: "Quarterback kneel", yards: -1, points: 0, turnover: false, punt: false, fg: false, first: false, inBounds: true, incomplete: false, playSec: 2, remaining: 2 };
    return;
  }
  if (g.down === 4 && g.fieldPos >= 62 && !fourthGo(g, m)) {
    const dist = 117 - g.fieldPos, ok = rnd(g) < clamp(.45, .90 - Math.max(0, dist - 35) * .018 + e * .25, .96);
    g.pendingPlay = { ...base, desc: `${dist}-yard field goal ${ok ? "GOOD" : "NO GOOD"}`, yards: 0, points: ok ? 3 : 0, turnover: !ok, punt: false, fg: true, first: false, inBounds: false, incomplete: false, playSec: 5, remaining: 5 };
    return;
  }
  if (g.down === 4 && !fourthGo(g, m) && g.fieldPos < 62) {
    const net = 34 + Math.floor(rnd(g) * 15);
    g.pendingPlay = { ...base, desc: `Punt · ${net} net yards`, yards: net, points: 0, turnover: false, punt: true, fg: false, first: false, inBounds: false, incomplete: false, playSec: 7, remaining: 7 };
    return;
  }

  const pass = rnd(g) < passRate(m), r = rnd(g);
  let yards = 0, incomplete = false, inBounds = true, turnover = false, desc = "";
  if (pass) {
    const sack = clamp(.02, .065 - e * .04, .10), pick = clamp(.006, .025 - e * .025, .055), comp = clamp(.44, .62 + e * .18, .82);
    if (r < sack) { yards = -(3 + Math.floor(rnd(g) * 8)); desc = `Sack for ${-yards}-yard loss`; }
    else if (r < sack + pick) { yards = Math.floor(rnd(g) * 12); turnover = true; desc = "Pass intercepted"; }
    else if (r < sack + pick + comp) {
      yards = rnd(g) < (.12 + e * .08) ? 16 + Math.floor(rnd(g) * 29) : 2 + Math.floor(rnd(g) * 14);
      inBounds = rnd(g) > (m === "TWO_MINUTE" || m === "DESPERATION" ? .32 : .12);
      desc = `Pass complete for ${yards} yards${inBounds ? " in bounds" : " out of bounds"}`;
    } else { incomplete = true; inBounds = false; desc = "Incomplete pass"; }
  } else {
    if (r < clamp(.004, .014 - e * .01, .03)) { yards = Math.floor(rnd(g) * 8); turnover = true; desc = "Run · fumble lost"; }
    else {
      yards = rnd(g) < .15 ? -(1 + Math.floor(rnd(g) * 4)) : rnd(g) < (.08 + e * .05) ? 11 + Math.floor(rnd(g) * 25) : Math.floor(rnd(g) * 9);
      inBounds = rnd(g) > .08; desc = `Run for ${yards} yards${inBounds ? " in bounds" : " out of bounds"}`;
    }
  }

  if (!turnover && !incomplete && yards > 0 && yards < g.distance && e > 0 && rnd(g) < clamp(0, e * CAL.chainSustainMultiplier, .75)) yards = g.distance;
  const first = !turnover && !incomplete && yards >= g.distance, sec = 3 + Math.floor(rnd(g) * 6);
  g.pendingPlay = { ...base, desc, yards, points: 0, turnover, punt: false, fg: false, first, inBounds, incomplete, playSec: sec, remaining: sec };
}

function flip(g: Game, newField: number) {
  g.possession = g.possession === 0 ? 1 : 0;
  g.fieldPos = clamp(1, Math.round(newField), 99); g.down = 1; g.distance = Math.min(10, 100 - g.fieldPos); g.gameClockStatus = "STOPPED";
}
function applyPlay(g: Game, p: Play) {
  const old = g.fieldPos, t = p.team;
  if (p.fg) { if (p.points) score(g, t, p.points); flip(g, 25); }
  else if (p.punt) { const land = clamp(1, old + p.yards, 99); flip(g, 100 - land); }
  else if (p.turnover) { const spot = clamp(1, old + Math.max(0, p.yards), 99); flip(g, 100 - spot); }
  else {
    const next = old + p.yards;
    if (next >= 100) { score(g, t, 7); p.points = 7; flip(g, 25); p.desc = "TOUCHDOWN · " + p.desc; }
    else {
      g.fieldPos = clamp(1, next, 99);
      if (p.first) { g.down = 1; g.distance = Math.min(10, 100 - g.fieldPos); }
      else {
        g.distance = Math.max(1, g.distance - p.yards); g.down++;
        if (g.down > 4) { const spot = g.fieldPos; flip(g, 100 - spot); p.desc = "Turnover on downs"; }
      }
    }
  }
  g.lastPlay = `${t === 0 ? g.away.name : g.home.name} · ${p.desc}`;
  g.history.push({ masterZulu: now(), gl: g.glSeconds, period: g.activePeriod, clock: g.scoreboardSeconds, team: t, desc: p.desc, yards: p.yards, strategy: p.strategy, score: [total(g, 0), total(g, 1)] });
  postTiming(g, p); p.phase = "POST"; p.remaining = p.deadSec + p.runoffSec;
}
function thresholds(g: Game) {
  const q = g.quarterLengthSeconds;
  return (g.quarter === 1 || g.quarter === 3
    ? [[Math.round(q * .75), 180, "Scheduled TV timeout"], [Math.round(q * .475), 180, "Scheduled TV timeout"], [Math.round(q * .25), 180, "Scheduled TV timeout"], [120, 180, "Scheduled TV timeout"]]
    : [[Math.round(q * .75), 180, "Scheduled TV timeout"], [Math.round(q * .5), 180, "Scheduled TV timeout"], [120, 150, "Two-minute timeout"]]) as [number, number, string][];
}
function maybeBreak(g: Game, before: number, after: number) {
  for (const [th, dur, label] of thresholds(g)) {
    const k = `Q${g.quarter}-${th}`;
    if (before > th && after <= th && !g.tvBreaksTaken.includes(k)) {
      g.tvBreaksTaken.push(k); g.breakSeconds = dur; g.breakLabel = label; g.activity = "BREAK"; g.gameClockStatus = "STOPPED"; return true;
    }
  }
  return false;
}
function finishGame(g: Game, label: string) {
  g.lifecycle = "FINAL_PENDING"; g.activity = "FINAL"; g.auto = false; g.onAir = false; g.operatorPaused = false; g.delayed = false;
  g.pendingPlay = null; g.breakSeconds = 0; g.gameClockStatus = "STOPPED"; g.completedAt = now();
  g.lastPlay = `${label} · ${total(g, 0)}-${total(g, 1)} · awaiting lock`;
}
function finishPeriod(g: Game) {
  g.scoreboardSeconds = 0; g.pendingPlay = null; g.gameClockStatus = "STOPPED";
  if (g.quarter === 1) { g.pendingPeriod = 2; g.breakSeconds = 255; g.breakLabel = "END 1ST"; g.activity = "BREAK"; }
  else if (g.quarter === 2) { g.pendingPeriod = 3; g.breakSeconds = 1200; g.breakLabel = "HALFTIME"; g.activity = "BREAK"; }
  else if (g.quarter === 3) { g.pendingPeriod = 4; g.breakSeconds = 255; g.breakLabel = "END 3RD"; g.activity = "BREAK"; }
  else if (total(g, 0) === total(g, 1)) { g.period = "OT"; g.activePeriod = "OT"; g.scores.OT = [0, 0]; g.breakSeconds = 180; g.breakLabel = "OT setup"; g.pendingPeriod = -1; g.activity = "OT"; }
  else finishGame(g, "Regulation complete");
}
function advancePeriod(g: Game) {
  const q = Number(g.pendingPeriod || 0); g.pendingPeriod = 0; g.breakLabel = "";
  if (q === -1) {
    const a = rnd(g) < .5 ? 0 : 1, b = a === 0 ? 1 : 0, ot = (t: 0 | 1) => rnd(g) < clamp(.35, .52 + edge(g, t) * .2, .66) ? 7 : rnd(g) < .55 ? 3 : 0;
    score(g, a as 0 | 1, ot(a as 0 | 1)); score(g, b as 0 | 1, ot(b as 0 | 1));
    if (total(g, 0) === total(g, 1)) {
      const n = Object.keys(g.scores).filter(x => x.includes("OT")).length + 1, k = `${n}OT`;
      g.activePeriod = k; g.period = k; g.scores[k] = [0, 0]; g.breakSeconds = 60; g.breakLabel = `${k} setup`; g.pendingPeriod = -1;
    } else finishGame(g, "Overtime complete");
    return;
  }
  g.quarter = q; g.period = periodLabel(q); g.activePeriod = String(q); g.scoreboardSeconds = g.quarterLengthSeconds; g.gameClockStatus = "STOPPED"; g.activity = "LIVE";
  if (q === 3) { g.possession = 1; g.fieldPos = 25; g.down = 1; g.distance = 10; g.lastPlay = "Second-half kickoff"; }
}
function advanceGame(g: Game, seconds: number) {
  if (seconds <= 0 || g.lifecycle === "UNLAUNCHED" || FINALISH.has(g.lifecycle)) return;
  let rem = Math.floor(seconds), guard = 0;
  while (rem > 0 && !FINALISH.has(g.lifecycle) && g.lifecycle !== "UNLAUNCHED" && guard++ < 20000) {
    if (g.operatorPaused || g.editing || g.delayed || g.lifecycle === "EDIT" || g.lifecycle === "DELAY") { g.glSeconds += rem; return; }
    if (g.breakSeconds > 0) {
      const s = Math.min(rem, g.breakSeconds); g.breakSeconds -= s; g.glSeconds += s; rem -= s;
      if (g.breakSeconds === 0) advancePeriod(g); continue;
    }
    const p = g.pendingPlay as Play | null;
    if (p) {
      if (p.phase === "PLAY") {
        const s = Math.min(rem, p.remaining, g.scoreboardSeconds);
        p.remaining -= s; g.scoreboardSeconds -= s; g.glSeconds += s; g.teamTopSeconds[p.team] += s; rem -= s; g.gameClockStatus = "RUNNING";
        if (p.remaining <= 0) { applyPlay(g, p); maybeBreak(g, p.clockBefore, g.scoreboardSeconds); if (g.scoreboardSeconds <= 0) finishPeriod(g); }
        continue;
      }
      const clockRuns = p.remaining <= p.runoffSec || p.deadSec === 0;
      let s = Math.min(rem, p.remaining); if (clockRuns) s = Math.min(s, g.scoreboardSeconds);
      p.remaining -= s; g.glSeconds += s; rem -= s;
      if (clockRuns) {
        const before = g.scoreboardSeconds; g.scoreboardSeconds -= s; g.teamTopSeconds[p.team] += s; g.gameClockStatus = "RUNNING"; maybeBreak(g, before, g.scoreboardSeconds);
      } else g.gameClockStatus = "STOPPED";
      if (p.remaining <= 0) g.pendingPlay = null;
      if (g.scoreboardSeconds <= 0) finishPeriod(g);
      continue;
    }
    if (g.auto && g.lifecycle === "ACTIVE") { generatePlay(g); if (!g.pendingPlay) return; continue; }
    g.glSeconds += rem; return;
  }
}
function project(state: Game[], wall: number) {
  const w = Math.max(0, Math.min(21600, Math.floor(wall))), out = structuredClone(state);
  for (const g of out) {
    if (g.lifecycle === "UNLAUNCHED" || FINALISH.has(g.lifecycle)) continue;
    const frozen = g.operatorPaused || g.editing || g.delayed || g.lifecycle === "EDIT" || g.lifecycle === "DELAY";
    const sp = !frozen && g.auto && SPEEDS.includes(Number(g.speed)) ? Number(g.speed) : 1;
    advanceGame(g, w * sp);
  }
  return out;
}
function archive(g: Game, disposition: string, note = "") { return { runId: g.runId, seedHex: g.seedHex, disposition, note, score: [total(g, 0), total(g, 1)], glSeconds: g.glSeconds, archivedAt: now() }; }
function reset(g: Game, newSeed: boolean, note = "") {
  g.runHistory = [...(g.runHistory ?? []), archive(g, newSeed ? "PURGE_NEW_SEED" : "RESTART_SAME_SEED", note)].slice(-30);
  g.runNumber++; if (newSeed) g.seedHex = randHex(16); g.runId = runId(g.id, g.runNumber); g.rngState = seedWords(g.seedHex, g.id);
  Object.assign(g, { lifecycle: "UNLAUNCHED", activity: "UPCOMING", auto: false, onAir: false, operatorPaused: false, delayed: false, editing: false, editSnapshot: null, editResume: null, scoreboardSeconds: g.quarterLengthSeconds, glSeconds: 0, quarter: 1, period: "1st", activePeriod: "1", scores: blankScores(), possession: 0, fieldPos: 25, down: 1, distance: 10, awayTimeouts: 3, homeTimeouts: 3, breakSeconds: 0, breakLabel: "", pendingPeriod: 0, pendingPlay: null, tvBreaksTaken: [], history: [], locked: false, completedAt: null, seedLocked: false, teamPlayCount: [0, 0], teamTopSeconds: [0, 0] });
  g.lastPlay = newSeed ? "Purged · new seed assigned" : "Restarted · same seed preserved";
}
function display(g: Game) {
  if (g.lifecycle === "DELAY" || g.delayed) return "DELAY";
  if (FINALISH.has(g.lifecycle)) return "FINAL";
  if (g.breakLabel === "HALFTIME") return "HALFTIME";
  if (g.breakLabel === "END 1ST" || g.breakLabel === "END 3RD") return g.breakLabel;
  if (String(g.period).includes("OT")) return g.period;
  return `${g.period} · ${Math.floor(g.scoreboardSeconds / 60)}:${String(Math.floor(g.scoreboardSeconds % 60)).padStart(2, "0")}`;
}
function publicGame(g: Game) {
  const c = structuredClone(g);
  for (const k of ["seedHex", "rngState", "runHistory", "history", "awayPower", "homePower", "editSnapshot", "editResume", "pendingPlay"]) delete c[k];
  c.displayStatus = display(g); return c;
}
const confirmReq = (p: any) => { if (p?.confirmed !== true) throw new Error("confirmation required"); };
function beginEdit(g: Game, p: any) {
  if (["LOCKED", "READY", "FINAL"].includes(g.lifecycle)) confirmReq(p);
  g.editSnapshot = structuredClone(g); g.editResume = { lifecycle: g.lifecycle, auto: g.auto, onAir: g.onAir, operatorPaused: g.operatorPaused, delayed: g.delayed };
  g.lifecycle = "EDIT"; g.activity = "EDIT"; g.auto = false; g.onAir = false; g.operatorPaused = false; g.delayed = false; g.editing = true; g.pendingPlay = null; g.gameClockStatus = "STOPPED"; g.lastPlay = "Chairman edit · football state frozen · GL running";
}
function cancelEdit(g: Game) {
  const s = g.editSnapshot; if (!s) throw new Error("edit snapshot missing"); const glNow = g.glSeconds;
  for (const [k, v] of Object.entries(s)) g[k] = structuredClone(v); g.glSeconds = glNow; g.editSnapshot = null; g.editResume = null; g.editing = false; g.lastPlay = "Chairman edit cancelled";
}
function continuation(g: Game) {
  const parent = g.runId, parentSeed = g.seedHex; g.runHistory = [...(g.runHistory ?? []), archive(g, "CHAIRMAN_CONTINUATION")].slice(-30);
  g.runNumber++; g.seedHex = randHex(16); g.runId = runId(g.id, g.runNumber); g.rngState = seedWords(g.seedHex, g.id); g.seedLocked = true; g.continuationOf = parent;
  return { parentRun: parent, parentSeed, newRun: g.runId, newSeed: g.seedHex };
}
function commitEdit(g: Game, p: any, event: any) {
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
function applyPower(state: Game[], ratings: Record<string, TeamPowerInput>, source: string | null) {
  let teams = 0, ready = 0;
  for (const [name, p] of Object.entries(ratings ?? {})) {
    if (!ratingReady(p)) continue; teams++;
    for (const g of state) { if (g.away.name === name) g.awayPower = structuredClone(p); if (g.home.name === name) g.homePower = structuredClone(p); }
  }
  for (const g of state) { g.powerReady = ratingReady(g.awayPower) && ratingReady(g.homePower); if (source) g.powerSourceVersion = source; if (g.powerReady) ready++; }
  return { teamsLoaded: teams, readyGames: ready };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = new URL(req.url), action = u.searchParams.get("api");
  if (!action) return new Response(null, { status: 302, headers: { location: CONSOLE_URL, "cache-control": "no-store" } });
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } }), slug = u.searchParams.get("session") ?? "";
    if (action === "create" && req.method === "POST") {
      if (WEEK3.length !== 51) throw new Error("Week 3 schedule count mismatch");
      const operator = randHex(32), publicSlug = `w3v421-${randHex(8)}`, state = WEEK3.map(initialGame);
      const { data, error } = await client.rpc("gamecast_v12_create_session", { p_public_slug: publicSlug, p_operator_token_hash: await sha256(operator), p_week_key: WEEK_KEY, p_engine_version: ENGINE_VERSION, p_data_version: DATA_VERSION, p_state: state });
      if (error) throw error; const row = Array.isArray(data) ? data[0] : data;
      return json({ ...row, engine_version: ENGINE_VERSION, operator_token: operator, master_zulu: now(), governance: { games: 51, power_ready: state.filter(g => g.powerReady).length } }, 201);
    }
    if (!slug) return json({ error: "session required" }, 400);
    const { data: rows, error: re } = await client.rpc("gamecast_v12_read_session", { p_slug: slug }); if (re) throw re;
    const cur = Array.isArray(rows) ? rows[0] : rows;
    if (!cur || cur.week_key !== WEEK_KEY || !slug.startsWith("w3v421-")) return json({ error: "GameCast 4.2.1 Week 3 session not found" }, 404);
    const dt = new Date(), wall = Math.max(0, Math.floor((dt.getTime() - Date.parse(cur.last_advanced_at)) / 1000)), state = project(cur.state as Game[], wall);
    const sup = req.headers.get("x-operator-token") ?? "", operator = !!sup && await sha256(sup) === cur.operator_token_hash;
    if (action === "read" && req.method === "GET") {
      const ready = state.filter(g => g.powerReady).length;
      return json({ public_slug: slug, week_key: WEEK_KEY, engine_version: ENGINE_VERSION, data_version: DATA_VERSION, state: operator ? state : state.map(publicGame), state_version: cur.state_version, master_zulu: dt.toISOString(), operator, governance: { games: 51, power_ready: ready, power_pending: 51 - ready } });
    }
    if (!operator) return json({ error: "operator token invalid" }, 403);
    const body = await req.json();
    if (Number(body.expected_version) !== Number(cur.state_version)) return json({ error: "version conflict", current_version: cur.state_version }, 409);
    let event: any = { engineVersion: ENGINE_VERSION, masterZulu: now() };
    if (action === "power") {
      const summary = applyPower(state, body.ratings ?? {}, body.sourceVersion ? String(body.sourceVersion) : null), stamp = now();
      const { data, error } = await client.rpc("gamecast_v12_update_session", { p_session_id: cur.session_id, p_expected_version: cur.state_version, p_state: state, p_stamp: stamp }); if (error) throw error;
      const up = Array.isArray(data) ? data[0] : data;
      await client.rpc("gamecast_v12_insert_event", { p_session_id: cur.session_id, p_state_version: up.state_version, p_event_type: "V421_POWER_LOAD", p_game_id: null, p_payload: { ...summary, sourceVersion: body.sourceVersion ?? null, masterZulu: stamp } });
      return json({ state: up.state, state_version: up.state_version, master_zulu: stamp, engine_version: ENGINE_VERSION, summary });
    }
    if (action !== "command") return json({ error: "unsupported action" }, 400);
    const g = state.find(x => x.id === body.id); if (!g) return json({ error: "game not found" }, 404);
    const c = String(body.command ?? ""), p = body.payload ?? {}; event = { ...event, runId: g.runId, seedHex: g.seedHex, gl: g.glSeconds };
    if (c === "quarter_length" && g.lifecycle === "UNLAUNCHED") { const q = Number(p.seconds); if (![600, 900].includes(q)) return json({ error: "quarter length must be 600 or 900" }, 400); g.quarterLengthSeconds = q; g.scoreboardSeconds = q; }
    else if (c === "launch" && g.lifecycle === "UNLAUNCHED") { g.lifecycle = "ACTIVE"; g.activity = "LIVE"; g.glSeconds = 0; g.seedLocked = true; g.launchedAt = now(); g.lastPlay = `Opening kickoff ready · ${g.runId}`; }
    else if (c === "auto" && g.lifecycle === "ACTIVE") { if (!g.powerReady) return json({ error: "AUTO blocked until both teams have offense/defense/overall ratings" }, 409); g.auto = !g.auto; if (g.auto) { g.onAir = false; g.operatorPaused = false; } g.lastPlay = g.auto ? `AUTO running · ${g.speed}x` : "AUTO stopped"; }
    else if (c === "on_air" && g.lifecycle === "ACTIVE") { g.onAir = !g.onAir; if (g.onAir) { g.auto = false; g.operatorPaused = false; } g.activity = g.onAir ? "ON AIR" : "LIVE"; }
    else if (c === "speed" && g.lifecycle === "ACTIVE") { const s = Number(p.speed); if (!SPEEDS.includes(s) || !g.auto) return json({ error: "speed requires AUTO and must be 1, 4, 10, or 50" }, 400); g.speed = s; }
    else if (c === "pause" && g.lifecycle === "ACTIVE") { g.operatorPaused = !g.operatorPaused; g.activity = g.operatorPaused ? "PAUSED" : "LIVE"; g.lastPlay = g.operatorPaused ? "Chairman pause · GL running" : "Chairman resume"; }
    else if (c === "delay" && g.lifecycle === "ACTIVE") { g.delayResume = { auto: g.auto, onAir: g.onAir, operatorPaused: g.operatorPaused }; g.lifecycle = "DELAY"; g.delayed = true; g.auto = false; g.onAir = false; g.operatorPaused = false; g.activity = "DELAY"; g.lastPlay = "DELAY · football state frozen · GL running"; }
    else if (c === "resume_delay" && g.lifecycle === "DELAY") { const r = g.delayResume ?? {}; g.lifecycle = "ACTIVE"; g.delayed = false; g.auto = !!r.auto && g.powerReady; g.onAir = !!r.onAir && !g.auto; g.operatorPaused = !!r.operatorPaused; g.activity = g.operatorPaused ? "PAUSED" : g.onAir ? "ON AIR" : "LIVE"; g.delayResume = null; }
    else if (c === "score" && ["ACTIVE", "DELAY"].includes(g.lifecycle)) { const t = p.team === 1 ? 1 : 0, pts = [1, 2, 3, 6, 7, 8].includes(Number(p.points)) ? Number(p.points) : 0; if (!pts) return json({ error: "invalid score increment" }, 400); score(g, t, pts, "MANUAL"); }
    else if (c === "clock_set" && ["ACTIVE", "DELAY"].includes(g.lifecycle)) { const s = Math.floor(Number(p.seconds)); if (!Number.isFinite(s) || s < 0 || s > g.quarterLengthSeconds) return json({ error: "clock outside quarter range" }, 400); g.scoreboardSeconds = s; g.pendingPlay = null; }
    else if (c === "edit_begin" && ["ACTIVE", "DELAY", "FINAL_PENDING", "LOCKED", "READY", "FINAL"].includes(g.lifecycle)) beginEdit(g, p);
    else if (c === "edit_cancel" && g.lifecycle === "EDIT") cancelEdit(g);
    else if (c === "edit_commit" && g.lifecycle === "EDIT") commitEdit(g, p, event);
    else if (c === "end" && ["ACTIVE", "DELAY"].includes(g.lifecycle)) { confirmReq(p); finishGame(g, "Chairman called Final"); }
    else if (c === "lock" && g.lifecycle === "FINAL_PENDING") { g.lifecycle = "LOCKED"; g.locked = true; }
    else if (c === "unlock" && g.lifecycle === "LOCKED") { confirmReq(p); g.lifecycle = "FINAL_PENDING"; g.locked = false; }
    else if (c === "accept" && g.lifecycle === "LOCKED") { confirmReq(p); g.lifecycle = "READY"; }
    else if (c === "reopen_live" && FINALISH.has(g.lifecycle)) { confirmReq(p); event.continuation = continuation(g); g.lifecycle = "ACTIVE"; g.activity = "LIVE"; g.locked = false; g.completedAt = null; g.auto = !!p.resumeAuto && g.powerReady; g.operatorPaused = !g.auto; }
    else if (c === "restart_same_seed" && g.lifecycle !== "UNLAUNCHED") { confirmReq(p); reset(g, false, String(p.note ?? "")); }
    else if (c === "purge_new_seed") { confirmReq(p); reset(g, true, String(p.note ?? "")); }
    else return json({ error: "command unavailable for current lifecycle" }, 409);

    const stamp = now(); event.masterZulu = stamp; event.gl = g.glSeconds; event.score = [total(g, 0), total(g, 1)]; event.status = display(g);
    const { data, error } = await client.rpc("gamecast_v12_update_session", { p_session_id: cur.session_id, p_expected_version: cur.state_version, p_state: state, p_stamp: stamp }); if (error) throw error;
    const up = Array.isArray(data) ? data[0] : data; if (!up) return json({ error: "version conflict" }, 409);
    await client.rpc("gamecast_v12_insert_event", { p_session_id: cur.session_id, p_state_version: up.state_version, p_event_type: `V421_${c.toUpperCase()}`, p_game_id: g.id, p_payload: event });
    return json({ state: up.state, state_version: up.state_version, master_zulu: stamp, engine_version: ENGINE_VERSION });
  } catch (e: any) {
    console.error("gamecast-week3-v4-2-1", e?.message ?? e);
    const m = String(e?.message ?? "internal error");
    return json({ error: m === "confirmation required" ? m : m.includes("range") || m.includes("required") || m.includes("mismatch") ? m : "internal error" }, m === "confirmation required" ? 400 : m.includes("range") || m.includes("required") || m.includes("mismatch") ? 400 : 500);
  }
});