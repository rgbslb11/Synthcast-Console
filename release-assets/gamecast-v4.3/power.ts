export type TeamPowerInput={offense:number|null;defense:number|null;specialTeams:number|null;overall:number|null;tempo:number|null;sourceVersion:string|null;flag?:string|null;opponentBasis?:string|null};

export const POWER_SOURCE_VERSION="SYNTHCAST-v4.3-W4-FROZEN-2026-09-07-60_99+FCS_0.10X";
const RAW=`
Alabama|88|86|87|CHASE-HOLD|
Arizona|90|89|89|MEASURED|
Arizona State|86|84|85|PRIOR-ONLY|
Arkansas|75|77|76|MEASURED|
Army|79|76|78|PRIOR-ONLY|
Auburn|76|80|78|MEASURED|
BYU|91|91|91|MEASURED|
Baylor|75|78|76|MEASURED|
Boise State|73|66|70|MEASURED|
Boston College|70|77|73|MEASURED|
Buffalo|71|80|75|MEASURED|
California|83|68|76|MEASURED|
Charlotte|62|63|62|CHAIRMAN 0.10x OPPONENT|San Diego State
Cincinnati|77|86|81|MEASURED|
Clemson|74|70|72|MEASURED|
Coastal Carolina|74|72|73|MEASURED|
Colgate|80|70|75|MEASURED|
Colorado|70|79|74|MEASURED|
Colorado State|81|75|78|MEASURED|
Delaware|75|84|79|MEASURED|
Duke|71|84|77|MEASURED|
Duquesne|61|61|61|CHAIRMAN 0.10x OPPONENT|Washington State
East Carolina|69|65|67|MEASURED|
Florida|84|75|80|MEASURED|
Florida Atlantic|79|70|75|MEASURED|
Florida International|68|80|74|MEASURED|
Florida State|74|76|75|OPEN4|
Fresno State|67|72|70|MEASURED|
Georgia|92|96|94|MEASURED|
Georgia State|83|75|79|WIN-FARM|
Harvard|72|62|67|WIN-FARM|
Holy Cross|79|76|78|WIN-FARM|
Houston|87|85|86|MEASURED|
Idaho|61|61|61|CHAIRMAN 0.10x OPPONENT|Boise State
Illinois|90|83|87|MEASURED|
Indiana|90|86|89|MEASURED|
Kansas|67|76|71|MEASURED|
Kansas State|78|75|77|MEASURED|
Kentucky|87|77|82|CHASE-HOLD|
LSU|84|80|82|CHASE-HOLD|
Lehigh|91|84|88|WIN-FARM|
Louisiana Tech|75|71|73|CHASE-HOLD|
Louisville|73|69|71|OPEN4|
Maryland|79|72|76|MEASURED|
Memphis|80|80|80|MEASURED|
Miami|92|97|95|MEASURED|
Michigan|78|89|83|MEASURED|
Michigan State|81|79|80|PRIOR-ONLY|
Middle Tennessee|72|68|70|PRIOR-ONLY|
Minnesota|84|82|83|PRIOR-ONLY|
Mississippi State|82|80|81|PRIOR-ONLY|
Missouri|75|71|73|MEASURED|
NC State|72|71|71|MEASURED|
Navy|86|79|83|MEASURED|
Nevada|71|72|71|MEASURED|
New Mexico|79|76|77|MEASURED|
New Mexico State|66|67|67|MEASURED|
North Carolina|73|86|79|MEASURED|
North Dakota State|79|67|73|WIN-FARM|
North Texas|69|62|66|MEASURED|
Northern Illinois|66|67|67|MEASURED|
Northwestern|80|77|79|PRIOR-ONLY|
Notre Dame|85|83|84|OPEN4|
Ohio State|99|99|99|PRIOR-ONLY|
Oklahoma|90|94|91|MEASURED|
Old Dominion|72|80|76|MEASURED|
Ole Miss|84|82|83|OPEN4|
Oregon State|70|66|68|MEASURED|
Penn|81|64|73|WIN-FARM|
Penn State|79|82|81|CHASE-HOLD|
Pittsburgh|86|75|81|MEASURED|
Purdue|79|79|79|MEASURED|
Rice|65|61|63|CHASE-HOLD|
Rutgers|64|64|64|MEASURED|
SMU|83|81|82|OPEN4|
San Diego State|84|86|85|MEASURED|
San Jose State|86|70|78|MEASURED|
South Carolina|71|71|71|MEASURED|
South Florida|75|87|81|MEASURED|
Southern Miss|75|67|72|MEASURED|
Stanford|70|61|66|MEASURED|
Syracuse|82|80|81|PRIOR-ONLY|
TCU|69|82|75|MEASURED|
Temple|74|70|72|PRIOR-ONLY|
Tennessee|82|86|84|MEASURED|
Texas|92|93|92|MEASURED|
Texas A&M|90|89|90|PRIOR-ONLY|
Texas State|64|61|62|MEASURED|
Texas Tech|89|93|91|MEASURED|
Troy|79|71|75|MEASURED|
Tulane|71|84|77|MEASURED|
Tulsa|73|79|76|MEASURED|
UAB|72|62|67|MEASURED|
UCF|82|84|83|MEASURED|
UCLA|85|71|79|MEASURED|
UConn|89|73|81|MEASURED|
USC|93|93|93|MEASURED|
UTEP|63|63|63|MEASURED|
UTSA|79|72|76|MEASURED|
Utah|83|79|81|MEASURED|
Utah State|83|86|84|MEASURED|
Vanderbilt|93|94|94|MEASURED|
Virginia|84|86|85|MEASURED|
Virginia Tech|75|83|78|MEASURED|
Wake Forest|82|75|79|MEASURED|
Washington State|69|65|67|OPEN4|
West Virginia|83|74|79|MEASURED|
Western Kentucky|61|61|61|CHAIRMAN 0.10x OPPONENT|Oregon State
Wisconsin|72|68|70|OPEN4|
Yale|65|67|66|WIN-FARM|
`.trim();

export const TEAM_POWER:Record<string,TeamPowerInput>=Object.fromEntries(RAW.split("\n").map(line=>{const [team,off,def,overall,flag,opponentBasis]=line.split("|");return [team,{offense:+off,defense:+def,specialTeams:null,overall:+overall,tempo:1.0,sourceVersion:POWER_SOURCE_VERSION,flag:flag||null,opponentBasis:opponentBasis||null}];}));

export function powerReady(team:string){const p=TEAM_POWER[team];return !!p&&Number.isFinite(p.offense)&&Number.isFinite(p.defense)&&Number.isFinite(p.overall);}
export function assertGamePowerReady(away:string,home:string){if(!powerReady(away)||!powerReady(home))throw new Error(`POWER_PENDING: ${away} at ${home}`);}
