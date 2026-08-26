"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Check,
  ChevronDown,
  CloudOff,
  Download,
  FileUp,
  Lock,
  Radio,
  RotateCcw,
  Save,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Activity = "UPCOMING" | "LIVE" | "DELAY" | "BREAK" | "CHLG" | "PPD" | "SUSP" | "FINAL";
type Lifecycle = "UNLAUNCHED" | "ACTIVE" | "FINAL_PENDING" | "LOCKED" | "READY" | "SEUD";
type ClockRestart = "CONTINUE" | "READY" | "SNAP" | "KICK_TOUCH" | "NONE";
type LiveBallKind = "SCRIMMAGE" | "KICKOFF" | "NONE";
type PendingTvBreak = { threshold: number; duration: number; key: string; label: string };
type ClockOutcome = "IN_BOUNDS" | "FIRST_DOWN" | "OUT_OF_BOUNDS" | "INCOMPLETE" | "CHANGE_POSSESSION" | "SCORE" | "KICK_DOWN";

type Team = { name: string; rank?: number; record: string };
type GameSeed = {
  id: string;
  date: string;
  kickoff: string;
  kickoffOrder: number;
  network: string;
  away: Team;
  home: Team;
  neutral?: boolean;
};

type GameState = GameSeed & {
  expanded: boolean;
  lifecycle: Lifecycle;
  activity: Activity;
  onAir: boolean;
  auto: boolean;
  scoreboardRunning: boolean;
  elapsedRunning: boolean;
  scoreboardSeconds: number;
  elapsedSeconds: number;
  period: string;
  otCount: number;
  activePeriod: string;
  speed: number;
  scores: Record<string, [number, number]>;
  timeouts: [number, number];
  possession: 0 | 1;
  ballSide: "OWN" | "OPP";
  yardline: number;
  down: number;
  distance: string;
  alert: string;
  alarm: string;
  locked: boolean;
  savedAt?: string;
  breakSeconds: number;
  challengesRemaining: number;
  correctionMode: boolean;
  history: Array<{ period: string; team: 0 | 1; points: number }>;
  seed: number;
  rngState: number;
  playClock: number;
  playClockRunning: boolean;
  clockRestart: ClockRestart;
  liveBallKind: LiveBallKind;
  liveBallSeconds: number;
  nextActionSeconds: number;
  readyDelaySeconds: number;
  pendingTvBreak: PendingTvBreak | null;
  breakResumeMode: ClockRestart;
  breakResumePlayClock: number;
  secondHalfReceiver: 0 | 1;
  otPossessionIndex: 0 | 1;
  driveNumber: number;
  lastPlay: string;
  projectedMargin: number;
  projectedTotal: number;
  homeWinProbability: number;
  tvBreaksTaken: string[];
  pendingPeriod: string;
};

type PowerRating = {
  overall: number;
  offense: number;
  defense: number;
  tempo: number;
  run: number;
};

const ENGINE_VERSION = "PC-GAMECAST-v1.1.1";
const DATA_VERSION = "BOARD-IH-V2-R1-R3 · 2026-PRESEASON-v1";

// Exact Week 1 inputs embedded in POWER CRUNCH Mobile v2.0.0 Alpha.
const powerRatings: Record<string, PowerRating> = {
  "Arkansas": { overall: 1500.33, offense: 1509.86, defense: 1493.31, tempo: .52, run: .50 },
  "Cornell": { overall: 1410.00, offense: 1409.68, defense: 1410.33, tempo: .52, run: .50 },
  "Florida State": { overall: 1576.50, offense: 1592.12, defense: 1564.39, tempo: .52, run: .50 },
  "Hawaii": { overall: 1458.85, offense: 1465.91, defense: 1449.54, tempo: .52, run: .42 },
  "Kentucky": { overall: 1530.64, offense: 1533.09, defense: 1526.19, tempo: .52, run: .50 },
  "Memphis": { overall: 1504.74, offense: 1498.69, defense: 1506.53, tempo: .52, run: .50 },
  "NC State": { overall: 1652.96, offense: 1665.83, defense: 1642.09, tempo: .52, run: .50 },
  "New Mexico State": { overall: 1461.94, offense: 1478.33, defense: 1445.80, tempo: .52, run: .50 },
  "North Carolina": { overall: 1571.26, offense: 1566.89, defense: 1572.87, tempo: .52, run: .50 },
  "San Jose State": { overall: 1415.87, offense: 1418.54, defense: 1399.95, tempo: .52, run: .50 },
  "Stanford": { overall: 1491.86, offense: 1495.36, defense: 1493.37, tempo: .52, run: .57 },
  "TCU": { overall: 1693.71, offense: 1694.73, defense: 1693.19, tempo: .52, run: .50 },
  "UNLV": { overall: 1429.84, offense: 1420.06, defense: 1434.61, tempo: .52, run: .50 },
  "USC": { overall: 1811.00, offense: 1818.92, defense: 1810.82, tempo: .52, run: .50 },
  "Vanderbilt": { overall: 1779.40, offense: 1780.76, defense: 1774.80, tempo: .52, run: .50 },
  "Virginia": { overall: 1812.83, offense: 1819.72, defense: 1810.18, tempo: .52, run: .50 },
  "West Virginia": { overall: 1459.39, offense: 1456.07, defense: 1463.45, tempo: .52, run: .50 },
  "Yale": { overall: 1381.80, offense: 1372.82, defense: 1390.78, tempo: .52, run: .50 },
};

export const weekOne: GameSeed[] = [
  { id: "G0005", date: "SAT 29 AUG", kickoff: "11:00 AM ET", kickoffOrder: 1100, network: "EBC", away: { name: "North Carolina", record: "0-0" }, home: { name: "TCU", record: "0-0" }, neutral: true },
  { id: "G0002", date: "SAT 29 AUG", kickoff: "12:00 PM ET", kickoffOrder: 1200, network: "CW", away: { name: "New Mexico State", record: "0-0" }, home: { name: "Florida State", record: "0-0" } },
  { id: "G0003", date: "SAT 29 AUG", kickoff: "12:00 PM ET", kickoffOrder: 1200, network: "ESPN", away: { name: "NC State", record: "0-0" }, home: { name: "Virginia", record: "0-0" } },
  { id: "G0009", date: "SAT 29 AUG", kickoff: "12:00 PM ET", kickoffOrder: 1200, network: "ABC", away: { name: "Cornell", record: "0-0" }, home: { name: "Vanderbilt", record: "0-0" } },
  { id: "G0001", date: "SAT 29 AUG", kickoff: "3:30 PM ET", kickoffOrder: 1530, network: "ABC", away: { name: "Yale", record: "0-0" }, home: { name: "Arkansas", record: "0-0" } },
  { id: "G0006", date: "SAT 29 AUG", kickoff: "7:00 PM ET", kickoffOrder: 1900, network: "EBC", away: { name: "West Virginia", record: "0-0" }, home: { name: "Kentucky", record: "0-0" }, neutral: true },
  { id: "G0008", date: "SAT 29 AUG", kickoff: "7:30 PM ET", kickoffOrder: 1930, network: "NBC", away: { name: "San Jose State", record: "0-0" }, home: { name: "USC", rank: 12, record: "0-0" } },
  { id: "G0004", date: "SAT 29 AUG", kickoff: "10:00 PM ET", kickoffOrder: 2200, network: "SEN", away: { name: "Hawaii", record: "0-0" }, home: { name: "Stanford", record: "0-0" } },
  { id: "G0007", date: "SAT 29 AUG", kickoff: "10:00 PM ET", kickoffOrder: 2200, network: "ESPN", away: { name: "Memphis", record: "0-0" }, home: { name: "UNLV", record: "0-0" } },
];

const clamp = (min: number, value: number, max: number) => Math.max(min, Math.min(value, max));

const matchupProjection = (game: GameSeed) => {
  const away = powerRatings[game.away.name];
  const home = powerRatings[game.home.name];
  const hfa = game.neutral ? 0 : 55;
  const elo = home.overall + hfa - away.overall;
  const offense = (home.offense - away.defense + away.offense - home.defense) * .18;
  const margin = elo / 25 + offense / 25;
  const projectedTotal = 54 + ((away.tempo + home.tempo) - 1.04) * 14;
  const homeWinProbability = 1 / (1 + Math.exp(-margin / (21.5 / 1.7)));
  return { margin, projectedTotal, homeWinProbability };
};

const seedForGame = (id: string) => ((Number(id.slice(1)) * 2654435761) ^ 20260829) >>> 0 || 1;

export const initialGame = (game: GameSeed): GameState => {
  const projection = matchupProjection(game);
  const seed = seedForGame(game.id);
  return {
    ...game,
    expanded: game.id === "G0005",
    lifecycle: "UNLAUNCHED",
    activity: "UPCOMING",
    onAir: false,
    auto: false,
    scoreboardRunning: false,
    elapsedRunning: false,
    scoreboardSeconds: 600,
    elapsedSeconds: 0,
    period: "1st",
    otCount: 0,
    activePeriod: "1",
    speed: 1,
    scores: { "1": [0, 0], "2": [0, 0], "3": [0, 0], "4": [0, 0] },
    timeouts: [3, 3],
    possession: 0,
    ballSide: "OWN",
    yardline: 25,
    down: 1,
    distance: "10",
    alert: "",
    alarm: "",
    locked: false,
    breakSeconds: 0,
    challengesRemaining: 2,
    correctionMode: false,
    history: [],
    seed,
    rngState: seed,
    playClock: 25,
    playClockRunning: false,
    clockRestart: "KICK_TOUCH",
    liveBallKind: "NONE",
    liveBallSeconds: 0,
    nextActionSeconds: 8,
    readyDelaySeconds: 0,
    pendingTvBreak: null,
    breakResumeMode: "SNAP",
    breakResumePlayClock: 25,
    secondHalfReceiver: 1,
    otPossessionIndex: 0,
    driveNumber: 1,
    lastPlay: "Ready for launch",
    projectedMargin: projection.margin,
    projectedTotal: projection.projectedTotal,
    homeWinProbability: projection.homeWinProbability,
    tvBreaksTaken: [],
    pendingPeriod: "",
  };
};

const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

const formatElapsed = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 3600)}:${String(Math.floor((safe % 3600) / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

const teamLabel = (team: Team) => `${team.rank ? `${team.rank} ` : ""}${team.name}`;
const statusClass = (activity: Activity) => {
  if (activity === "LIVE") return "status-live";
  if (["DELAY", "PPD", "SUSP"].includes(activity)) return "status-delay";
  if (["BREAK", "CHLG"].includes(activity)) return "status-break";
  if (activity === "FINAL") return "status-final";
  return "status-upcoming";
};
const total = (game: GameState, team: 0 | 1) => Object.values(game.scores).reduce((sum, score) => sum + (score?.[team] ?? 0), 0);

const nextRandom = (game: GameState) => {
  game.rngState = (Math.imul(1664525, game.rngState) + 1013904223) >>> 0;
  return game.rngState / 4294967296;
};

const normalRandom = (game: GameState) => {
  const u = Math.max(.000001, nextRandom(game));
  const v = Math.max(.000001, nextRandom(game));
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const offenseFieldPosition = (game: GameState) => game.ballSide === "OWN" ? game.yardline : 100 - game.yardline;
const applyFieldPosition = (game: GameState, position: number) => {
  const spot = clamp(1, Math.round(position), 99);
  game.ballSide = spot <= 50 ? "OWN" : "OPP";
  game.yardline = spot <= 50 ? spot : 100 - spot;
  game.distance = String(Math.min(10, Math.max(1, 100 - spot)));
};

const addEngineScore = (game: GameState, team: 0 | 1, points: number) => {
  const current = game.scores[game.activePeriod] ?? [0, 0];
  const next: [number, number] = [...current] as [number, number];
  next[team] += points;
  game.scores = { ...game.scores, [game.activePeriod]: next };
  game.history = [...game.history, { period: game.activePeriod, team, points }];
};

const changePossession = (game: GameState, nextPosition = 25) => {
  game.possession = game.possession === 0 ? 1 : 0;
  game.down = 1;
  applyFieldPosition(game, nextPosition);
  game.driveNumber += 1;
};

const randomActionDelay = (game: GameState, playClock: number) => Math.max(3, Math.min(playClock - 2, 8 + Math.round(nextRandom(game) * 18)));

const setClockRestart = (game: GameState, mode: ClockRestart, playClock: number, reason: string) => {
  game.clockRestart = mode;
  game.playClock = playClock;
  game.playClockRunning = mode !== "NONE";
  game.liveBallKind = "NONE";
  game.liveBallSeconds = 0;
  game.readyDelaySeconds = mode === "READY" ? 3 : 0;
  game.nextActionSeconds = randomActionDelay(game, playClock);
  game.scoreboardRunning = mode === "CONTINUE";
  if (reason) game.lastPlay = `${game.lastPlay} · Clock ${mode === "KICK_TOUCH" ? "on legal kick touch" : mode.toLowerCase()}`;
};

const startTimedBreak = (game: GameState, duration: number, label: string, resumeMode: ClockRestart, resumePlayClock = 25) => {
  game.activity = label.startsWith("Challenge") ? "CHLG" : "BREAK";
  game.scoreboardRunning = false;
  game.playClockRunning = false;
  game.liveBallKind = "NONE";
  game.liveBallSeconds = 0;
  game.breakSeconds = duration;
  game.breakResumeMode = resumeMode;
  game.breakResumePlayClock = resumePlayClock;
  game.lastPlay = label;
};

const finishRegulationPeriod = (game: GameState) => {
  game.scoreboardSeconds = 0;
  game.scoreboardRunning = false;
  game.playClockRunning = false;
  game.pendingTvBreak = null;
  if (game.period === "1st") {
    startTimedBreak(game, 255, "End of 1st quarter · 04:15 break", "SNAP", 25);
    game.pendingPeriod = "2nd";
  } else if (game.period === "2nd") {
    startTimedBreak(game, 1200, "Halftime · 20:00", "KICK_TOUCH", 25);
    game.period = "Half";
    game.pendingPeriod = "3rd";
  } else if (game.period === "3rd") {
    startTimedBreak(game, 255, "End of 3rd quarter · 04:15 break", "SNAP", 25);
    game.pendingPeriod = "4th";
  } else if (total(game, 0) === total(game, 1)) {
    startTimedBreak(game, 120, "End of regulation · overtime pending", "NONE", 25);
    game.period = "End Reg";
    game.pendingPeriod = "OT";
  } else {
    game.activity = "FINAL";
    game.lifecycle = "FINAL_PENDING";
    game.auto = false;
    game.elapsedRunning = false;
    game.pendingPeriod = "";
    game.clockRestart = "NONE";
    game.lastPlay = `Final · ${total(game, 0)}–${total(game, 1)} · awaiting operator lock`;
  }
};

const beginPendingPeriod = (game: GameState) => {
  const next = game.pendingPeriod;
  game.pendingPeriod = "";
  game.activity = "LIVE";
  if (next === "OT") {
    game.otCount += 1;
    const label = game.otCount === 1 ? "OT" : `${game.otCount}OT`;
    game.period = label;
    game.activePeriod = label;
    game.scores = { ...game.scores, [label]: [0, 0] };
    game.scoreboardSeconds = 0;
    game.scoreboardRunning = false;
    game.playClock = 25;
    game.playClockRunning = true;
    game.clockRestart = "NONE";
    game.nextActionSeconds = randomActionDelay(game, 25);
    game.otPossessionIndex = 0;
    game.possession = 0;
    game.timeouts = [1, 1];
    game.lastPlay = `${label} begins · no game clock · 25-second play clock`;
    return;
  }

  game.period = next;
  game.activePeriod = next === "2nd" ? "2" : next === "3rd" ? "3" : "4";
  game.scoreboardSeconds = 600;
  if (next === "3rd") {
    game.timeouts = [3, 3];
    game.possession = game.secondHalfReceiver;
    game.down = 1;
    applyFieldPosition(game, 25);
    game.lastPlay = "3rd quarter kickoff ready";
    setClockRestart(game, "KICK_TOUCH", 25, "");
  } else {
    game.lastPlay = `${next} quarter ready · down, distance and possession carried forward`;
    setClockRestart(game, "SNAP", 25, "");
  }
};

const resolveOvertimePossession = (game: GameState) => {
  const label = game.activePeriod;
  const team = game.otPossessionIndex;
  const offense = powerRatings[team === 0 ? game.away.name : game.home.name];
  const defense = powerRatings[team === 0 ? game.home.name : game.away.name];
  const edge = (offense.offense - defense.defense) / 450;
  const roll = nextRandom(game) + edge * .08;
  const points = game.otCount >= 3 ? (roll > .52 ? 2 : 0) : roll < .20 ? 0 : roll < .48 ? 3 : game.otCount === 2 && nextRandom(game) > .55 ? 8 : 7;
  addEngineScore(game, team, points);
  game.lastPlay = `${label} · ${team === 0 ? game.away.name : game.home.name} possession: ${points} points`;

  if (team === 0) {
    game.otPossessionIndex = 1;
    game.possession = 1;
    game.playClock = 25;
    game.playClockRunning = true;
    game.nextActionSeconds = randomActionDelay(game, 25);
    return;
  }

  game.lastPlay = `${label} complete · ${game.away.name} ${game.scores[label][0]}, ${game.home.name} ${game.scores[label][1]}`;
  if (total(game, 0) !== total(game, 1)) {
    game.activity = "FINAL";
    game.lifecycle = "FINAL_PENDING";
    game.auto = false;
    game.elapsedRunning = false;
    game.playClockRunning = false;
    game.lastPlay += " · final pending approval";
  } else {
    startTimedBreak(game, 60, `${label} complete · extra-period break`, "NONE", 25);
    game.pendingPeriod = "OT";
  }
};

const isAfterTwoMinuteTimeout = (game: GameState) => (game.period === "2nd" || game.period === "4th") && game.tvBreaksTaken.includes(`${game.period}-120`);

export const clockDecision = (outcome: ClockOutcome, afterTwoMinuteTimeout: boolean): { mode: ClockRestart; playClock: number } => {
  if (outcome === "SCORE") return { mode: "KICK_TOUCH", playClock: 25 };
  if (outcome === "CHANGE_POSSESSION" || outcome === "KICK_DOWN") return { mode: "SNAP", playClock: 25 };
  if (outcome === "INCOMPLETE") return { mode: "SNAP", playClock: 40 };
  if (outcome === "OUT_OF_BOUNDS") return { mode: afterTwoMinuteTimeout ? "SNAP" : "READY", playClock: 40 };
  if (outcome === "FIRST_DOWN") return { mode: afterTwoMinuteTimeout ? "READY" : "CONTINUE", playClock: 40 };
  return { mode: "CONTINUE", playClock: 40 };
};

const simulatePlay = (game: GameState) => {
  const offenseTeam = game.possession === 0 ? game.away : game.home;
  const defenseTeam = game.possession === 0 ? game.home : game.away;
  const offense = powerRatings[offenseTeam.name];
  const defense = powerRatings[defenseTeam.name];
  const position = offenseFieldPosition(game);
  const edge = (offense.offense - defense.defense) / 320;
  const isRun = nextRandom(game) < offense.run;
  const turnoverChance = isRun ? .014 : .027;
  let gain = 0;
  let description = "";

  if (nextRandom(game) < turnoverChance) {
    const oldSpot = position;
    description = isRun ? "Fumble lost" : "Pass intercepted";
    changePossession(game, clamp(5, 100 - oldSpot, 95));
    game.lastPlay = `D${game.driveNumber - 1} · ${offenseTeam.name}: ${description}`;
    const decision = clockDecision("CHANGE_POSSESSION", isAfterTwoMinuteTimeout(game));
    setClockRestart(game, decision.mode, decision.playClock, description);
    return;
  }

  if (isRun) {
    gain = Math.round(4.2 + edge * 2.8 + normalRandom(game) * 4.3);
    gain = clamp(-5, gain, 38);
    description = `Run ${gain >= 0 ? "+" : ""}${gain}`;
  } else {
    const completion = clamp(.45, .61 + edge * .075, .76);
    if (nextRandom(game) > completion) {
      gain = 0;
      description = "Pass incomplete";
      game.lastPlay = `D${game.driveNumber} · ${offenseTeam.name}: ${description}`;
      const decision = clockDecision("INCOMPLETE", isAfterTwoMinuteTimeout(game));
      setClockRestart(game, decision.mode, decision.playClock, description);
      return;
    } else {
      gain = Math.round(7.4 + edge * 4.2 + normalRandom(game) * 7.8);
      gain = clamp(-6, gain, 55);
      description = `Pass ${gain >= 0 ? "+" : ""}${gain}`;
    }
  }

  const newPosition = position + gain;
  const outOfBounds = nextRandom(game) < (isRun ? .06 : .11);
  if (newPosition >= 100) {
    addEngineScore(game, game.possession, 7);
    game.lastPlay = `D${game.driveNumber} · ${offenseTeam.name}: ${description} · TOUCHDOWN`;
    changePossession(game, 25);
    const decision = clockDecision("SCORE", isAfterTwoMinuteTimeout(game));
    setClockRestart(game, decision.mode, decision.playClock, "score");
  } else if (game.down === 4) {
    if (position >= 58) {
      const fieldGoalProbability = clamp(.42, .72 + (offense.overall - 1500) / 1800 - Math.max(0, 72 - position) * .012, .94);
      const good = nextRandom(game) < fieldGoalProbability;
      if (good) addEngineScore(game, game.possession, 3);
      game.lastPlay = `D${game.driveNumber} · ${offenseTeam.name}: Field goal ${good ? "GOOD" : "MISSED"}`;
      changePossession(game, 25);
      const decision = clockDecision(good ? "SCORE" : "KICK_DOWN", isAfterTwoMinuteTimeout(game));
      setClockRestart(game, decision.mode, decision.playClock, "kick down");
    } else {
      const punt = clamp(28, Math.round(41 + normalRandom(game) * 7), 58);
      game.lastPlay = `D${game.driveNumber} · ${offenseTeam.name}: Punt ${punt} yards`;
      changePossession(game, clamp(5, 100 - (position + punt), 90));
      const decision = clockDecision("KICK_DOWN", isAfterTwoMinuteTimeout(game));
      setClockRestart(game, decision.mode, decision.playClock, "kick down");
    }
  } else {
    const needed = Number(game.distance) || 10;
    applyFieldPosition(game, newPosition);
    const firstDown = gain >= needed;
    if (firstDown) {
      game.down = 1;
      game.distance = String(Math.min(10, Math.max(1, 100 - newPosition)));
      description += " · first down";
    } else {
      game.down += 1;
      game.distance = String(Math.max(1, needed - gain));
    }
    game.lastPlay = `D${game.driveNumber} · ${offenseTeam.name}: ${description}${outOfBounds ? " · out of bounds" : ""}`;
    const outcome: ClockOutcome = outOfBounds ? "OUT_OF_BOUNDS" : firstDown ? "FIRST_DOWN" : "IN_BOUNDS";
    const decision = clockDecision(outcome, isAfterTwoMinuteTimeout(game));
    setClockRestart(game, decision.mode, decision.playClock, outOfBounds ? "out of bounds" : firstDown ? "first down" : "in bounds");
  }
};

const tvBreakRule = (period: string, before: number, after: number) => {
  const rules = period === "1st" || period === "3rd"
    ? [[450, 180], [285, 180], [150, 180], [120, 180]]
    : period === "2nd" || period === "4th"
      ? [[450, 180], [300, 180], [120, 150]]
      : [];
  return rules.find(([threshold]) => before > threshold && after <= threshold);
};

const activatePendingTvBreak = (game: GameState) => {
  const pending = game.pendingTvBreak;
  if (!pending) return;
  game.pendingTvBreak = null;
  game.tvBreaksTaken.push(pending.key);
  const isTwoMinute = pending.threshold === 120 && (game.period === "2nd" || game.period === "4th");
  const underlyingMode = game.clockRestart;
  const resumeMode: ClockRestart = isTwoMinute ? "SNAP" : underlyingMode === "SNAP" || underlyingMode === "KICK_TOUCH" ? underlyingMode : "READY";
  startTimedBreak(game, pending.duration, pending.label, resumeMode, 25);
};

const decrementGameClock = (game: GameState, liveBall: boolean) => {
  if (!game.scoreboardRunning || game.scoreboardSeconds <= 0) return;
  const before = game.scoreboardSeconds;
  game.scoreboardSeconds = Math.max(0, before - 1);
  const rule = tvBreakRule(game.period, before, game.scoreboardSeconds);
  if (rule) {
    const [threshold, duration] = rule;
    const key = `${game.period}-${threshold}`;
    if (!game.tvBreaksTaken.includes(key) && !game.pendingTvBreak) {
      const isTwoMinute = threshold === 120 && (game.period === "2nd" || game.period === "4th");
      game.pendingTvBreak = {
        threshold,
        duration,
        key,
        label: isTwoMinute ? "Two-minute timeout · 02:30" : `Scheduled TV timeout · ${formatClock(duration)}`,
      };
    }
  }
  if (game.pendingTvBreak && !liveBall) activatePendingTvBreak(game);
  if (game.scoreboardSeconds === 0 && !liveBall && game.activity === "LIVE") finishRegulationPeriod(game);
};

const tickAutoSecond = (game: GameState) => {
  if (!game.auto || game.lifecycle !== "ACTIVE" || game.activity !== "LIVE") return;

  if (game.period.includes("OT")) {
    if (game.playClockRunning) game.playClock = Math.max(0, game.playClock - 1);
    game.nextActionSeconds = Math.max(0, game.nextActionSeconds - 1);
    if (game.nextActionSeconds === 0) resolveOvertimePossession(game);
    return;
  }

  if (game.liveBallKind !== "NONE") {
    decrementGameClock(game, true);
    game.liveBallSeconds = Math.max(0, game.liveBallSeconds - 1);
    if (game.liveBallSeconds === 0) {
      if (game.liveBallKind === "KICKOFF") {
        game.lastPlay = `${game.possession === 0 ? game.away.name : game.home.name} kickoff return ends at OWN 25`;
        setClockRestart(game, "SNAP", 25, "legal kick down");
      } else {
        simulatePlay(game);
      }
      if (game.scoreboardSeconds === 0) finishRegulationPeriod(game);
      else if (game.pendingTvBreak) activatePendingTvBreak(game);
    }
    return;
  }

  if (game.playClockRunning) game.playClock = Math.max(0, game.playClock - 1);
  if (game.readyDelaySeconds > 0) {
    game.readyDelaySeconds -= 1;
    if (game.readyDelaySeconds === 0 && game.clockRestart === "READY") game.scoreboardRunning = true;
  }

  decrementGameClock(game, false);
  if (game.activity !== "LIVE") return;

  game.nextActionSeconds = Math.max(0, game.nextActionSeconds - 1);
  if (game.playClock === 0 && game.nextActionSeconds > 0) {
    game.lastPlay = `D${game.driveNumber} · Delay of game · five-yard penalty`;
    game.playClock = 25;
    game.nextActionSeconds = randomActionDelay(game, 25);
    return;
  }

  if (game.nextActionSeconds === 0) {
    const kickoff = game.clockRestart === "KICK_TOUCH";
    game.liveBallKind = kickoff ? "KICKOFF" : "SCRIMMAGE";
    game.liveBallSeconds = kickoff ? 5 : 4 + Math.round(nextRandom(game) * 5);
    game.playClockRunning = false;
    if (game.clockRestart === "SNAP" || game.clockRestart === "KICK_TOUCH") game.scoreboardRunning = true;
    game.clockRestart = "NONE";
    game.lastPlay = kickoff ? "Kickoff legally touched · game clock starts" : `D${game.driveNumber} · Ball snapped`;
  }
};

export const tickGame = (original: GameState): GameState => {
  if (!original.elapsedRunning && !original.scoreboardRunning && original.breakSeconds <= 0 && !original.auto) return original;
  const game: GameState = { ...original, scores: { ...original.scores }, history: [...original.history], tvBreaksTaken: [...original.tvBreaksTaken] };
  const step = Math.max(1, game.speed);
  if (game.elapsedRunning) game.elapsedSeconds += 1;

  if (game.breakSeconds > 0) {
    game.breakSeconds = Math.max(0, game.breakSeconds - step);
    if (game.breakSeconds === 0) {
      if (game.pendingPeriod) beginPendingPeriod(game);
      else {
        game.activity = "LIVE";
        setClockRestart(game, game.breakResumeMode, game.breakResumePlayClock, "");
        if (game.breakResumeMode === "READY") {
          game.readyDelaySeconds = 0;
          game.scoreboardRunning = game.lifecycle === "ACTIVE";
        }
      }
    }
    return game;
  }

  if (game.auto) for (let second = 0; second < step && game.activity === "LIVE"; second += 1) tickAutoSecond(game);
  return game;
};

const hydrateGame = (saved: GameState, seed: GameSeed): GameState => {
  const migrated = { ...initialGame(seed), ...saved, challengesRemaining: saved.challengesRemaining ?? 2 };
  if (saved.clockRestart === undefined) {
    migrated.clockRestart = saved.scoreboardRunning ? "CONTINUE" : "SNAP";
    migrated.playClock = saved.lifecycle === "ACTIVE" ? 40 : 25;
    migrated.playClockRunning = Boolean(saved.auto && saved.activity === "LIVE");
    migrated.liveBallKind = "NONE";
    migrated.liveBallSeconds = 0;
    migrated.nextActionSeconds = Math.min(18, migrated.playClock - 2);
  }
  return migrated;
};

export default function GameCastClient() {
  const [games, setGames] = useState<GameState[]>(() => weekOne.map(initialGame));
  const [zulu, setZulu] = useState(new Date());
  const [filter, setFilter] = useState("ALL");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cached = window.localStorage.getItem("gamecast-week1-v1");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length === weekOne.length) {
          setGames(parsed.map((saved: GameState) => {
            const seed = weekOne.find((item) => item.id === saved.id);
            return seed ? hydrateGame(saved, seed) : saved;
          }));
        }
      } catch { /* retain canonical seed */ }
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setZulu(new Date());
      setGames((current) => current.map(tickGame));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const update = (id: string, fn: (game: GameState) => GameState) => setGames((current) => current.map((game) => game.id === id ? fn(game) : game));
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const saveAll = () => {
    const savedAt = new Date().toISOString();
    const next = games.map((game) => ({ ...game, savedAt }));
    setGames(next);
    window.localStorage.setItem("gamecast-week1-v1", JSON.stringify(next));
    notify("Week 1 state saved locally");
  };
  const saveGame = (id: string) => {
    const savedAt = new Date().toISOString();
    const next = games.map((game) => game.id === id ? { ...game, savedAt } : game);
    setGames(next);
    window.localStorage.setItem("gamecast-week1-v1", JSON.stringify(next));
    notify(`${id} saved locally`);
  };
  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportJson = () => download("week1-gamecast-state.json", JSON.stringify(games, null, 2), "application/json");
  const exportCsv = () => {
    const rows = games.map((g) => [g.id, g.date, g.kickoff, g.network, g.away.name, g.home.name, total(g, 0), total(g, 1), g.period, g.activity, g.lifecycle, g.auto, g.seed, ENGINE_VERSION, DATA_VERSION]);
    const csv = [["game_id", "date", "kickoff_et", "network", "away", "home", "away_score", "home_score", "period", "activity", "lifecycle", "auto", "seed", "engine_version", "data_version"], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    download("week1-gamecast-scoreboard.csv", csv, "text/csv");
  };
  const importJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed) || parsed.length !== weekOne.length) throw new Error();
        const hydrated = parsed.map((saved: GameState) => {
          const seed = weekOne.find((item) => item.id === saved.id);
          return seed ? hydrateGame(saved, seed) : saved;
        });
        setGames(hydrated);
        window.localStorage.setItem("gamecast-week1-v1", JSON.stringify(hydrated));
        notify("Week 1 state restored");
      } catch { notify("Import rejected — invalid Week 1 file"); }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const sortedGames = useMemo(() => {
    const weight = (g: GameState) => g.lifecycle === "ACTIVE" ? 0 : g.lifecycle === "UNLAUNCHED" ? 1 : ["READY", "SEUD"].includes(g.lifecycle) ? 3 : 2;
    return [...games].sort((a, b) => weight(a) - weight(b) || a.kickoffOrder - b.kickoffOrder || a.id.localeCompare(b.id));
  }, [games]);
  const visible = sortedGames.filter((game) => filter === "ALL" || (filter === "LIVE" && game.lifecycle === "ACTIVE") || (filter === "UNLAUNCHED" && game.lifecycle === "UNLAUNCHED") || (filter === "ATTENTION" && Boolean(game.alert || game.alarm || ["DELAY", "PPD", "SUSP"].includes(game.activity))));
  const liveCount = games.filter((g) => g.lifecycle === "ACTIVE").length;
  const onAirCount = games.filter((g) => g.onAir).length;
  const alarmCount = games.filter((g) => g.alarm).length;
  const readyCount = games.filter((g) => g.lifecycle === "READY").length;

  return (
    <main className="control-room">
      {toast && <div className="toast" role="status">{toast}</div>}
      <header className="master-header">
        <div className="brand-lockup"><div className="brand-mark">GC</div><div><p className="eyebrow">SEN / EBC FOOTBALL OPERATIONS</p><h1>GAMECAST <span>OPERATOR</span></h1></div></div>
        <div className="master-time"><span>MASTER / ZULU</span><strong>{zulu.toISOString().slice(11, 19)}Z</strong><em>{zulu.toISOString().slice(0, 10).replaceAll("-", " · ")}</em></div>
      </header>

      <Tabs defaultValue="console" className="workspace-tabs">
        <div className="navigation-bar">
          <TabsList className="nav-tabs">
            <TabsTrigger value="console">Operator Console</TabsTrigger>
            <TabsTrigger value="scoreboard">Public Scoreboard</TabsTrigger>
            <TabsTrigger value="rollup">Results Rollup <span className="count-pill">{readyCount}</span></TabsTrigger>
          </TabsList>
          <div className="header-actions">
            <input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={importJson} />
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}><FileUp /> Import</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>
            <Button variant="outline" size="sm" onClick={exportJson}><Download /> JSON</Button>
            <Button size="sm" className="save-master" onClick={saveAll}><Save /> Save Week</Button>
          </div>
        </div>

        <TabsContent value="console">
          <section className="overview-strip">
            <div className="week-title"><span>2026</span><strong>WEEK 1</strong><small>SATURDAY · AUGUST 29 · ALL TIMES EASTERN</small></div>
            <Metric label="Scheduled" value="9" />
            <Metric label="Live" value={String(liveCount)} tone="red" />
            <Metric label="On Air" value={`${onAirCount} / 4`} />
            <Metric label="Alarms" value={String(alarmCount)} tone={alarmCount ? "alarm" : undefined} />
            <div className="sync-block"><Check size={15} /><span>LOCAL STATE</span><strong>SAVED</strong><CloudOff size={15} /><small>CLOUD NOT CONNECTED</small></div>
          </section>
          <section className="console-toolbar">
            <div className="filter-group" aria-label="Game filters">{[["ALL", "ALL 9"], ["UNLAUNCHED", "UPCOMING"], ["LIVE", "LIVE"], ["ATTENTION", "ATTENTION"]].map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}</div>
            <p><Radio size={14} /> One master scheduler · nine isolated game states</p>
          </section>
          <div className="game-list">{visible.map((game, index) => <GamePanel key={game.id} game={game} slotBreak={index === 0 || visible[index - 1]?.kickoff !== game.kickoff} update={update} saveGame={saveGame} notify={notify} />)}</div>
        </TabsContent>
        <TabsContent value="scoreboard"><PublicScoreboard games={sortedGames} /></TabsContent>
        <TabsContent value="rollup"><ResultsRollup games={games} update={update} notify={notify} /></TabsContent>
      </Tabs>
      <footer className="system-footer"><span>GAMECAST v1.1.1 · POWER CRUNCH AUTO ENGINE</span><span>CANONICAL SOURCES: 2026 FBS SCHEDULE V5 · BOARD I–H V2 R1–R3 · POWER CRUNCH MOBILE v2.0.0 ALPHA</span></footer>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={`metric ${tone ?? ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function GamePanel({ game, slotBreak, update, saveGame, notify }: {
  game: GameState;
  slotBreak: boolean;
  update: (id: string, fn: (game: GameState) => GameState) => void;
  saveGame: (id: string) => void;
  notify: (message: string) => void;
}) {
  const periods = ["1", "2", "3", "4", ...Array.from({ length: game.otCount }, (_, i) => i === 0 ? "OT" : `${i + 1}OT`)];
  const set = (patch: Partial<GameState>) => update(game.id, (g) => ({ ...g, ...patch }));
  const locked = game.locked || game.lifecycle === "READY" || game.lifecycle === "SEUD";
  const launch = () => {
    if (game.lifecycle === "UNLAUNCHED") set({ lifecycle: "ACTIVE", activity: "LIVE", elapsedRunning: true, scoreboardRunning: false, playClockRunning: true, clockRestart: "KICK_TOUCH", playClock: 25, nextActionSeconds: 8, expanded: true, lastPlay: "Opening kickoff ready · game clock starts on legal touch" });
  };
  const score = (team: 0 | 1, points: number) => {
    if (locked || game.lifecycle !== "ACTIVE") return;
    update(game.id, (g) => {
      const current = g.scores[g.activePeriod] ?? [0, 0];
      const nextScore: [number, number] = [...current] as [number, number];
      nextScore[team] += points;
      return { ...g, scores: { ...g.scores, [g.activePeriod]: nextScore }, history: [...g.history, { period: g.activePeriod, team, points }] };
    });
  };
  const undo = () => {
    if (locked || !game.history.length) return;
    update(game.id, (g) => {
      const last = g.history[g.history.length - 1];
      const current = g.scores[last.period] ?? [0, 0];
      const nextScore: [number, number] = [...current] as [number, number];
      nextScore[last.team] = Math.max(0, nextScore[last.team] - last.points);
      return { ...g, scores: { ...g.scores, [last.period]: nextScore }, history: g.history.slice(0, -1) };
    });
  };
  const useTimeout = (team: 0 | 1) => {
    if (locked || game.lifecycle !== "ACTIVE" || game.timeouts[team] === 0) return;
    const timeouts: [number, number] = [...game.timeouts] as [number, number];
    timeouts[team] -= 1;
    set({ timeouts, activity: "BREAK", scoreboardRunning: false, playClockRunning: false, breakSeconds: 45, breakResumeMode: "SNAP", breakResumePlayClock: 25, lastPlay: `${team === 0 ? game.away.name : game.home.name} timeout · 00:45 · clock restarts on snap` });
  };
  const addOt = () => {
    if (locked) return;
    const next = game.otCount + 1;
    const label = next === 1 ? "OT" : `${next}OT`;
    set({ otCount: next, activePeriod: label, period: label, scoreboardSeconds: 0, scores: { ...game.scores, [label]: [0, 0] } });
  };
  const startChallenge = () => {
    if (locked || game.lifecycle !== "ACTIVE" || game.challengesRemaining <= 0) return;
    const lateReplay = isAfterTwoMinuteTimeout(game);
    const resumeMode: ClockRestart = game.clockRestart === "SNAP" || game.clockRestart === "KICK_TOUCH" ? game.clockRestart : "READY";
    set({ activity: "CHLG", scoreboardRunning: false, playClockRunning: false, breakSeconds: 360, breakResumeMode: resumeMode, breakResumePlayClock: lateReplay ? Math.max(10, game.playClock) : 25, challengesRemaining: game.challengesRemaining - 1, lastPlay: lateReplay ? `Challenge review · play clock frozen at ${Math.max(10, game.playClock)}` : "Challenge review · 06:00" });
  };
  const purge = () => {
    const prior = window.localStorage.getItem("gamecast-purge-snapshots");
    const snapshots = prior ? JSON.parse(prior) : [];
    window.localStorage.setItem("gamecast-purge-snapshots", JSON.stringify([...snapshots, { capturedAt: new Date().toISOString(), game }]));
    update(game.id, () => ({ ...initialGame(game), expanded: true }));
    notify(`${game.id} snapshot created and game purged`);
  };
  const fieldStatus = `${game.possession === 0 ? game.away.name : game.home.name} ball · ${game.ballSide} ${game.yardline} · ${ordinal(game.down)} & ${game.distance}`;
  const awayRating = powerRatings[game.away.name];
  const homeRating = powerRatings[game.home.name];
  const favorite = game.projectedMargin >= 0 ? game.home.name : game.away.name;
  const projectedAway = Math.max(0, Math.round(game.projectedTotal / 2 - game.projectedMargin / 2));
  const projectedHome = Math.max(0, Math.round(game.projectedTotal / 2 + game.projectedMargin / 2));

  return (
    <section className="game-shell">
      {slotBreak && <div className="slot-divider"><span>{game.kickoff}</span><i /></div>}
      <button className={`game-summary ${game.expanded ? "open" : ""}`} onClick={() => set({ expanded: !game.expanded })} aria-expanded={game.expanded}>
        <div className="summary-id"><strong>{game.id}</strong><span>{game.date}</span></div>
        <div className="network-chip">{game.network}</div>
        <div className="summary-matchup"><span>{teamLabel(game.away)} <small>{game.away.record}</small></span><b>AT</b><span>{teamLabel(game.home)} <small>{game.home.record}</small></span>{game.neutral && <em>NEUTRAL</em>}</div>
        <div className="summary-score">{total(game, 0)}<span>–</span>{total(game, 1)}</div>
        <div className={`activity-badge ${statusClass(game.activity)}`}>{game.activity}</div>
        <div className="summary-clock"><strong>{game.lifecycle === "UNLAUNCHED" ? game.kickoff : formatClock(game.scoreboardSeconds)}</strong><span>{game.lifecycle}</span></div>
        <ChevronDown className="chevron" />
      </button>

      {game.expanded && <div className="operator-panel">
        <div className="command-strip">
          <Toggle active={game.lifecycle !== "UNLAUNCHED"} disabled={game.lifecycle !== "UNLAUNCHED"} onClick={launch}>Launch</Toggle>
          <Toggle active={game.activity === "DELAY"} disabled={locked} onClick={() => set({ activity: game.activity === "DELAY" ? "LIVE" : "DELAY", scoreboardRunning: false, playClockRunning: game.activity === "DELAY" && game.auto })}>Delay</Toggle>
          <Toggle active={game.activity === "PPD"} disabled={locked} onClick={() => set({ activity: "PPD", lifecycle: "FINAL_PENDING", scoreboardRunning: false, elapsedRunning: false })}>PPD</Toggle>
          <Toggle active={game.onAir} disabled={locked || game.lifecycle === "UNLAUNCHED"} onClick={() => set({ onAir: !game.onAir, auto: game.onAir ? game.auto : false })}>On Air</Toggle>
          <Toggle active={game.auto} disabled={locked || game.lifecycle === "UNLAUNCHED"} onClick={() => set({ auto: !game.auto, onAir: false, scoreboardRunning: game.auto ? game.scoreboardRunning : game.clockRestart === "CONTINUE", playClockRunning: game.auto ? game.playClockRunning : true, activity: game.auto ? game.activity : "LIVE" })}>Auto</Toggle>
          <Toggle active={game.activity === "BREAK"} disabled={locked || game.lifecycle === "UNLAUNCHED"} onClick={() => game.activity === "BREAK" ? set({ activity: "LIVE", breakSeconds: 0, playClockRunning: true, scoreboardRunning: game.breakResumeMode === "READY" || game.breakResumeMode === "CONTINUE" }) : set({ activity: "BREAK", scoreboardRunning: false, playClockRunning: false, breakSeconds: 180, breakResumeMode: game.clockRestart === "SNAP" || game.clockRestart === "KICK_TOUCH" ? game.clockRestart : "READY", breakResumePlayClock: 25 })}>Pause</Toggle>
          <Toggle active={game.activity === "CHLG"} disabled={locked || game.lifecycle !== "ACTIVE" || game.challengesRemaining === 0} onClick={startChallenge}>CHLG {game.challengesRemaining}</Toggle>
          <Toggle active={game.activity === "SUSP"} disabled={locked} onClick={() => set({ activity: "SUSP", scoreboardRunning: false, playClockRunning: false })}>Suspended</Toggle>
          <div className="panel-save"><span><Check /> LOCAL</span><span className="cloud-off"><CloudOff /> CLOUD</span><Button size="sm" variant="outline" onClick={() => saveGame(game.id)}><Save /> Save Game</Button></div>
        </div>

        <div className={`engine-strip ${game.auto ? "running" : ""}`}>
          <div className="engine-identity"><span>{game.auto ? "AUTO ENGINE RUNNING" : "AUTO ENGINE ARMED"}</span><strong>{ENGINE_VERSION}</strong><small>{DATA_VERSION}</small></div>
          <div className="rating-cell"><span>{game.away.name}</span><strong>{awayRating.overall.toFixed(2)}</strong><small>OFF {awayRating.offense.toFixed(1)} · DEF {awayRating.defense.toFixed(1)}</small></div>
          <div className="rating-cell"><span>{game.home.name}</span><strong>{homeRating.overall.toFixed(2)}</strong><small>OFF {homeRating.offense.toFixed(1)} · DEF {homeRating.defense.toFixed(1)}</small></div>
          <div className="projection-cell"><span>POWER CRUNCH OUTLOOK</span><strong>{favorite} −{Math.abs(game.projectedMargin).toFixed(1)}</strong><small>Projected {projectedAway}–{projectedHome} · Home {(game.homeWinProbability * 100).toFixed(1)}%</small></div>
          <label className="seed-cell"><span>SIMULATION SEED</span><input type="number" value={game.seed} disabled={game.lifecycle !== "UNLAUNCHED"} onChange={(event) => { const seed = Number(event.target.value) >>> 0 || 1; set({ seed, rngState: seed }); }} /><small>Drive {game.driveNumber} · Play clock {Math.max(0, game.playClock)} · {game.clockRestart.replace("_", " ")}</small></label>
        </div>
        <div className="simulation-feed"><span>SIM FEED</span><strong>{game.lastPlay}</strong></div>

        <div className="scoreboard-and-scoring">
          <div className="line-score-wrap">
            <div className="scoreboard-meta">
              <span>{game.kickoff}</span><span>{game.network}</span><span>{game.id} · {game.date}</span>
              <div><small>GAME LENGTH</small><strong>{formatElapsed(game.elapsedSeconds)}</strong></div>
              <div><small>SCOREBOARD</small><input className="clock-entry" aria-label="Manual scoreboard clock" value={formatClock(game.scoreboardSeconds)} disabled={locked} onChange={(event) => {
                const match = event.target.value.match(/^(\d{1,2}):(\d{2})$/);
                if (match) set({ scoreboardSeconds: Number(match[1]) * 60 + Math.min(59, Number(match[2])) });
              }} /></div>
              <b className={`activity-badge ${statusClass(game.activity)}`}>{game.breakSeconds ? `${game.activity} ${formatClock(game.breakSeconds)}` : game.activity}</b>
            </div>
            <div className="line-score-scroll"><table className="line-score">
              <thead><tr><th className="team-col">TEAM</th><th className="aux-col">{game.lifecycle === "UNLAUNCHED" ? "RECORD" : "T.O."}</th>{periods.map((p) => <th key={p} className={game.activePeriod === p ? "selected-period" : ""}>{p}</th>)}<th className="total-col">T</th></tr></thead>
              <tbody>{[game.away, game.home].map((team, teamIndex) => <tr key={team.name}>
                <td className="team-name"><span className={game.possession === teamIndex ? "possession active" : "possession"} />{team.rank && <b>{team.rank}</b>} {team.name}</td>
                <td className="team-aux">{game.lifecycle === "UNLAUNCHED" ? <span className="record">{team.record}</span> : <div className="timeouts">{[0, 1, 2].map((dot) => <button aria-label={`Use ${team.name} timeout ${dot + 1}`} key={dot} disabled={dot >= game.timeouts[teamIndex as 0 | 1] || locked} className={dot < game.timeouts[teamIndex as 0 | 1] ? "available" : "used"} onClick={() => useTimeout(teamIndex as 0 | 1)} />)}</div>}</td>
                {periods.map((p) => <td key={p}>{game.correctionMode ? <input className={`period-input ${game.activePeriod === p ? "active" : ""}`} aria-label={`${team.name} ${p} score`} type="number" min="0" disabled={locked} value={game.scores[p]?.[teamIndex] ?? 0} onFocus={() => set({ activePeriod: p })} onChange={(event) => update(game.id, (g) => {
                  const current = g.scores[p] ?? [0, 0];
                  const nextScore: [number, number] = [...current] as [number, number];
                  nextScore[teamIndex as 0 | 1] = Math.max(0, Number(event.target.value));
                  return { ...g, activePeriod: p, scores: { ...g.scores, [p]: nextScore } };
                })} /> : <button className={`period-cell ${game.activePeriod === p ? "active" : ""}`} disabled={locked} onClick={() => set({ activePeriod: p })}>{game.scores[p]?.[teamIndex] ?? 0}</button>}</td>)}
                <td className="total-score">{total(game, teamIndex as 0 | 1)}</td>
              </tr>)}</tbody>
            </table></div>
          </div>
          <div className="score-controls">
            {[0, 1].map((teamIndex) => <div className="score-team" key={teamIndex}><span>{teamIndex === 0 ? game.away.name : game.home.name}</span><div>{[1, 2, 3, 6, 7, 8].map((points) => <Button key={points} size="sm" variant="outline" disabled={locked || game.lifecycle !== "ACTIVE"} onClick={() => score(teamIndex as 0 | 1, points)}>+{points}</Button>)}</div></div>)}
            <div className="score-edit-row"><Button size="sm" variant="outline" disabled={locked || !game.history.length} onClick={undo}><RotateCcw /> Undo</Button><Button size="sm" variant={game.correctionMode ? "default" : "outline"} disabled={locked} onClick={() => set({ correctionMode: !game.correctionMode })}>Manual correction</Button></div>
          </div>
        </div>

        <div className="status-controls">
          <div className="game-status"><span>GAME STATUS</span><strong>{fieldStatus}</strong></div>
          <label><span>SPEED</span><Select value={String(game.speed)} onValueChange={(value) => set({ speed: Number(value) })} disabled={locked}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1× REAL</SelectItem><SelectItem value="2">2×</SelectItem><SelectItem value="4">4×</SelectItem><SelectItem value="10">10×</SelectItem></SelectContent></Select></label>
          <label><span>QUARTER</span><Select value={game.period} onValueChange={(value) => { if (value === "OT+") addOt(); else set({ period: value, activePeriod: value === "1st" ? "1" : value === "2nd" ? "2" : value === "3rd" ? "3" : "4", scoreboardSeconds: value === "Half" ? 1200 : 600 }); }} disabled={locked}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["1st", "2nd", "Half", "3rd", "4th", "End Reg"].map((p) => <SelectItem value={p} key={p}>{p}</SelectItem>)}<SelectItem value="OT+">ADD OT</SelectItem></SelectContent></Select></label>
        </div>

        <div className="field-controls">
          <div className="quick-spots"><span>QUICK SPOT</span>{[["Own 20", "OWN", 20], ["Own 40", "OWN", 40], ["50", "OWN", 50], ["Opp 40", "OPP", 40], ["Red Zone", "OPP", 20]].map(([label, side, yard]) => <button key={String(label)} disabled={locked} onClick={() => set({ ballSide: side as "OWN" | "OPP", yardline: Number(yard) })}>{label}</button>)}</div>
          <div className="exact-field"><label>POSSESSION<select disabled={locked} value={game.possession} onChange={(e) => set({ possession: Number(e.target.value) as 0 | 1 })}><option value={0}>{game.away.name}</option><option value={1}>{game.home.name}</option></select></label><label>SIDE<select disabled={locked} value={game.ballSide} onChange={(e) => set({ ballSide: e.target.value as "OWN" | "OPP" })}><option>OWN</option><option>OPP</option></select></label><label>YARD<input disabled={locked} type="number" min="1" max="50" value={game.yardline} onChange={(e) => set({ yardline: Number(e.target.value) })} /></label><label>DOWN<select disabled={locked} value={game.down} onChange={(e) => set({ down: Number(e.target.value) })}>{[1,2,3,4].map((n) => <option key={n}>{n}</option>)}</select></label><label>TO GO<input disabled={locked} value={game.distance} onChange={(e) => set({ distance: e.target.value })} /></label></div>
        </div>

        <div className="notifications">
          <button className={`alarm-button ${game.alarm ? "firing" : ""}`} onClick={() => set({ alarm: game.alarm ? "" : "ALM-201 · IDLE BEYOND 20:00" })}><BellRing /> ALARM</button><div className="notification-field alarm-field">{game.alarm || "No active alarm"}</div>
          <button className={`alert-button ${game.alert ? "firing" : ""}`} onClick={() => set({ alert: game.alert ? "" : "ALT-104 · RED ZONE" })}><AlertTriangle /> ALERT</button><div className="notification-field alert-field">{game.alert || "No active alert"}</div>
        </div>

        <div className="game-actions">
          <Button variant="outline" disabled={locked || game.lifecycle === "UNLAUNCHED"} onClick={() => set({ lifecycle: "FINAL_PENDING", activity: "FINAL", scoreboardRunning: false, elapsedRunning: false })}>End Game</Button>
          <Button variant="outline" disabled={game.lifecycle !== "FINAL_PENDING" && !game.locked} onClick={() => set({ locked: !game.locked, lifecycle: game.locked ? "FINAL_PENDING" : "LOCKED" })}>{game.locked ? <Unlock /> : <Lock />}{game.locked ? "Unlock" : "Lock"}</Button>
          <AlertDialog><AlertDialogTrigger asChild><Button className="purge-button"><ShieldAlert /> Purge Game</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reset {game.id} to unlaunched?</AlertDialogTitle><AlertDialogDescription>Scores, clocks, timeouts, possession, field state, alerts and activity will be reset. Canonical schedule, team, ranking and carriage data will remain.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={purge}>Create snapshot & purge</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          <Button variant="outline" disabled={locked || game.lifecycle === "UNLAUNCHED"} onClick={() => set({ scoreboardRunning: false })}>Stop Clock</Button>
          <Button variant="outline" disabled={locked || game.lifecycle === "UNLAUNCHED"} onClick={() => set({ scoreboardRunning: true, activity: "LIVE" })}>Start Clock</Button>
          <Button className="accept-button" disabled={!game.locked} onClick={() => set({ lifecycle: "READY", locked: true, expanded: false })}><Check /> Accept Game Results</Button>
        </div>
      </div>}
    </section>
  );
}

function Toggle({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button className={`command-toggle ${active ? "active" : ""}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

function ordinal(value: number) { return value === 1 ? "1st" : value === 2 ? "2nd" : value === 3 ? "3rd" : `${value}th`; }

function PublicScoreboard({ games }: { games: GameState[] }) {
  return <section className="public-board"><div className="public-heading"><div><p>COLLEGE FOOTBALL ON SEN / EBC</p><h2>WEEK 1 SCOREBOARD</h2></div><span>SATURDAY · AUGUST 29 · ET</span></div><div className="public-grid">{games.map((game) => {
    const periods = ["1", "2", "3", "4", ...Array.from({ length: game.otCount }, (_, i) => i === 0 ? "OT" : `${i + 1}OT`)];
    return <article className="public-game" key={game.id}><header><span>{game.kickoff} · {game.network}</span><b className={statusClass(game.activity)}>{game.activity === "UPCOMING" ? game.kickoff : game.activity}</b></header><table><tbody>{[game.away, game.home].map((team, idx) => <tr key={team.name}><td className="public-team">{team.rank && <b>{team.rank}</b>} {team.name}<small>{team.record}</small></td>{periods.map((p) => <td key={p}>{game.scores[p]?.[idx] ?? "–"}</td>)}<td className="public-total">{total(game, idx as 0 | 1)}</td></tr>)}</tbody></table><footer><span className={game.lifecycle === "UNLAUNCHED" ? "public-detail" : "public-timing"}>{game.lifecycle === "UNLAUNCHED" ? `${game.id} · ${game.neutral ? "Neutral Site" : "Campus Site"}` : `${game.period} · ${formatClock(game.scoreboardSeconds)}`}</span><span>{game.possession === 0 ? game.away.name : game.home.name} {game.lifecycle === "ACTIVE" && <i />}</span></footer></article>;
  })}</div></section>;
}

function ResultsRollup({ games, update, notify }: { games: GameState[]; update: (id: string, fn: (game: GameState) => GameState) => void; notify: (message: string) => void }) {
  const ready = games.filter((g) => g.lifecycle === "READY" || g.lifecycle === "SEUD");
  const pushAll = () => {
    ready.filter((g) => g.lifecycle === "READY").forEach((game) => update(game.id, (g) => ({ ...g, lifecycle: "SEUD" })));
    notify("All READY results pushed to SEUD");
  };
  return <section className="rollup"><header><div><p>MASTER GAME LEDGER</p><h2>Approved Results</h2></div><Button disabled={!ready.some((g) => g.lifecycle === "READY")} onClick={pushAll}>Push all READY to SEUD</Button></header>{ready.length === 0 ? <div className="empty-rollup"><Lock /><h3>No accepted results</h3><p>Games appear here after End Game → Lock → Accept Game Results.</p></div> : <div className="rollup-table"><div className="rollup-row rollup-head"><span>GAME</span><span>RESULT</span><span>STATUS</span><span>ACTION</span></div>{ready.map((game) => <div className="rollup-row" key={game.id}><span><b>{game.id}</b><small>{game.kickoff} · {game.network}</small></span><span>{game.away.name} {total(game,0)} · {game.home.name} {total(game,1)}</span><span className={`ledger-status ${game.lifecycle.toLowerCase()}`}>{game.lifecycle}</span><Button size="sm" disabled={game.lifecycle === "SEUD"} onClick={() => { update(game.id, (g) => ({ ...g, lifecycle: "SEUD" })); notify(`${game.id} pushed to SEUD`); }}>{game.lifecycle === "SEUD" ? "Pushed" : "Push to SEUD"}</Button></div>)}</div>}</section>;
}
