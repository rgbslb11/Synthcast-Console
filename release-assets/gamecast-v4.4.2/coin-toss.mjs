import assert from 'node:assert/strict';
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Coin toss source anchor: '+a.slice(0,80));return s.replace(a,()=>b);};
export function applyCoinToss(source){
 let s=once(source,'function initialGame(s: any): Game {',`// Separate stream: opening-toss draws never consume the play RNG.
function ensureOpeningToss(g: Game) {
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
function initialGame(s: any): Game {`);
 s=once(s,'    possession: 0, fieldPos: 25,','    possession: null, coinToss: null, coinTossAudit: [], fieldPos: 25,');
 s=once(s,'scores: blankScores(), possession: 0, fieldPos: 25,','scores: blankScores(), possession: null, coinToss: null, coinTossAudit: [], fieldPos: 25,');
 s=once(s,'    g.possession = 1; g.fieldPos = 25; g.down = 1; g.distance = 10; g.lastPlay = "Second-half kickoff";',`    if (!g.coinToss) throw new Error("Opening coin toss missing at Q3 transition");
    g.possession = g.coinToss.q3ReceivingTeamId === g.home.name ? 1 : 0;
    g.fieldPos = 25; g.down = 1; g.distance = 10; g.lastPlay = "Second-half kickoff";`);
 s=once(s,'g.launchedAt = now(); g.lastPlay = `Opening kickoff ready', 'g.launchedAt = now(); event.coinToss = ensureOpeningToss(g); g.lastPlay = `Opening kickoff ready');
 s=once(s,'      const change = deadmanTick(g,stamp);','      const change = deadmanTick(g,stamp);\n      if (change?.action === "AUTONOMOUS_LAUNCH") change.coinToss = ensureOpeningToss(g);');
 s=once(s,'  c.displayStatus = display(g); return c;','  if (c.coinToss) delete c.coinToss.seedHex;\n  delete c.coinTossAudit;\n  c.displayStatus = display(g); return c;');
 return s;
}
