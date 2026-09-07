export type TeamPowerInput={offense:number|null;defense:number|null;specialTeams:number|null;overall:number|null;tempo:number|null;sourceVersion:string|null;flag?:string|null;opponentBasis?:string|null};

export const POWER_SOURCE_VERSION="SYNTHCAST-v4.2-BLEND-2026-09-07-60_99-SIDECAR";
const RAW=`
Air Force|78|75|77|MEASURED|
Alabama|88|86|87|CHASE-HOLD|
Arizona|90|89|89|MEASURED|
Arizona State|86|84|85|PRIOR-ONLY|
Arkansas|75|77|76|MEASURED|
Army|79|76|78|PRIOR-ONLY|
Auburn|76|80|78|MEASURED|
BYU|91|91|91|MEASURED|
Boise State|73|66|70|MEASURED|
Boston College|70|77|73|MEASURED|
Buffalo|71|80|75|MEASURED|
Cal Poly|63|61|62|CHAIRMAN 0.10x OPPONENT|San Jose State
California|83|68|76|MEASURED|
Cincinnati|77|86|81|MEASURED|
Clemson|74|70|72|MEASURED|
Colorado State|81|75|78|MEASURED|
Cornell|75|74|75|WIN-FARM|
Delaware|75|84|79|MEASURED|
Duke|71|84|77|MEASURED|
East Carolina|69|65|67|MEASURED|
Florida Atlantic|79|70|75|MEASURED|
Florida International|68|80|74|MEASURED|
Fresno State|67|72|70|MEASURED|
Georgia|92|96|94|MEASURED|
Georgia Southern|60|60|60|MEASURED|
Georgia State|83|75|79|WIN-FARM|
Georgia Tech|76|85|80|MEASURED|
Harvard|72|62|67|WIN-FARM|
Holy Cross|79|76|78|WIN-FARM|
Houston|87|85|86|MEASURED|
Illinois|90|83|87|MEASURED|
Indiana|90|86|89|MEASURED|
Iowa|86|90|88|MEASURED|
Iowa State|82|75|79|MEASURED|
Kansas|67|76|71|MEASURED|
Kansas State|78|75|77|MEASURED|
Kentucky|87|77|82|CHASE-HOLD|
LSU|84|80|82|CHASE-HOLD|
Lehigh|91|84|88|WIN-FARM|
Louisiana Tech|75|71|73|CHASE-HOLD|
Marshall|73|75|74|MEASURED|
Maryland|79|72|76|MEASURED|
Memphis|80|80|80|MEASURED|
Michigan|78|89|83|MEASURED|
Michigan State|81|79|80|PRIOR-ONLY|
Middle Tennessee|72|68|70|PRIOR-ONLY|
Minnesota|84|82|83|PRIOR-ONLY|
Mississippi State|82|80|81|PRIOR-ONLY|
Missouri|75|71|73|MEASURED|
Navy|86|79|83|MEASURED|
Nebraska|73|70|72|MEASURED|
New Mexico State|66|67|67|MEASURED|
North Dakota State|79|67|73|WIN-FARM|
North Texas|69|62|66|MEASURED|
Northwestern|80|77|79|PRIOR-ONLY|
Notre Dame|85|83|84|OPEN4|
Ohio State|99|99|99|PRIOR-ONLY|
Oklahoma|90|94|91|MEASURED|
Oklahoma State|76|82|78|CHASE-HOLD|
Old Dominion|72|80|76|MEASURED|
Oregon|87|82|85|CHASE-HOLD|
Oregon State|70|66|68|MEASURED|
Penn|81|64|73|WIN-FARM|
Penn State|79|82|81|CHASE-HOLD|
Pittsburgh|86|75|81|MEASURED|
Princeton|84|74|79|WIN-FARM|
Purdue|79|79|79|MEASURED|
Rice|65|61|63|CHASE-HOLD|
Rutgers|64|64|64|MEASURED|
Sacramento State|70|69|70|WIN-FARM|
San Diego State|84|86|85|MEASURED|
San Jose State|86|70|78|MEASURED|
South Carolina|71|71|71|MEASURED|
South Florida|75|87|81|MEASURED|
Southern Miss|75|67|72|MEASURED|
Southern Utah|62|62|62|CHAIRMAN 0.10x OPPONENT|Colorado State
Syracuse|82|80|81|PRIOR-ONLY|
Temple|74|70|72|PRIOR-ONLY|
Tennessee|82|86|84|MEASURED|
Texas|92|93|92|MEASURED|
Texas A&M|90|89|90|PRIOR-ONLY|
Texas State|64|61|62|MEASURED|
Texas Tech|89|93|91|MEASURED|
Tulane|71|84|77|MEASURED|
Tulsa|73|79|76|MEASURED|
UCF|82|84|83|MEASURED|
UCLA|85|71|79|MEASURED|
UConn|89|73|81|MEASURED|
UNLV|70|80|74|MEASURED|
USC|93|93|93|MEASURED|
UTEP|63|63|63|MEASURED|
UTSA|79|72|76|MEASURED|
Utah|83|79|81|MEASURED|
Utah State|83|86|84|MEASURED|
Vanderbilt|93|94|94|MEASURED|
Virginia Tech|75|83|78|MEASURED|
Wake Forest|82|75|79|MEASURED|
Washington|88|86|87|OPEN4|
Washington State|69|65|67|OPEN4|
West Virginia|83|74|79|MEASURED|
Wyoming|79|73|76|MEASURED|
Yale|65|67|66|WIN-FARM|
`.trim();

export const TEAM_POWER:Record<string,TeamPowerInput>=Object.fromEntries(RAW.split("\n").map(line=>{const [team,off,def,overall,flag,opponentBasis]=line.split("|");return [team,{offense:+off,defense:+def,specialTeams:null,overall:+overall,tempo:1.0,sourceVersion:POWER_SOURCE_VERSION,flag:flag||null,opponentBasis:opponentBasis||null}];}));

export function powerReady(team:string){const p=TEAM_POWER[team];return !!p&&Number.isFinite(p.offense)&&Number.isFinite(p.defense)&&Number.isFinite(p.overall);}
export function assertGamePowerReady(away:string,home:string){if(!powerReady(away)||!powerReady(home))throw new Error(`POWER_PENDING: ${away} at ${home}`);}
