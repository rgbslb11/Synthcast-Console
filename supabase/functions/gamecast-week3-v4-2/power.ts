export type TeamPowerInput={
  offense:number|null;
  defense:number|null;
  specialTeams:number|null;
  overall:number|null;
  tempo:number|null;
  sourceVersion:string|null;
};

// Chairman-controlled Week 3 ratings intake.
// AUTO must remain blocked for a game until BOTH teams have the required
// offense/defense/overall fields populated. No ratings are inferred here.
export const TEAM_POWER:Record<string,TeamPowerInput>={};

export function powerReady(team:string){
  const p=TEAM_POWER[team];
  return !!p && Number.isFinite(p.offense) && Number.isFinite(p.defense) && Number.isFinite(p.overall);
}

export function assertGamePowerReady(away:string,home:string){
  if(!powerReady(away)||!powerReady(home)) throw new Error(`POWER_PENDING: ${away} at ${home}`);
}
