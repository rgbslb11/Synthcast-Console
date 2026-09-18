export type TeamPowerInput={offense:number|null;defense:number|null;specialTeams:number|null;overall:number|null;tempo:number|null;sourceVersion:string|null;flag?:string|null;opponentBasis?:string|null};

export const POWER_SOURCE_VERSION="SYNTHCAST-v4.3.1-W4-POST-W3-2026-09-14-GAMECAST-TEAM-OFF-DEF-v1.1-121+FCS_60";
export const CANONICAL_TEAM_COUNT=121;
export const SCHEDULE_FCS_TEAM_COUNT=4;
const RAW=`
Texas|99|99|99|POST-W3 GAMECAST v1.1|
Georgia|99|99|99|POST-W3 GAMECAST v1.1|
Miami|99|99|99|POST-W3 GAMECAST v1.1|
Indiana|98|98|98|POST-W3 GAMECAST v1.1|
Texas A&M|98|96|97|POST-W3 GAMECAST v1.1|
Notre Dame|97|97|97|POST-W3 GAMECAST v1.1|
Texas Tech|96|96|96|POST-W3 GAMECAST v1.1|
USC|97|95|96|POST-W3 GAMECAST v1.1|
BYU|94|96|95|POST-W3 GAMECAST v1.1|
Utah|95|95|95|POST-W3 GAMECAST v1.1|
Tennessee|94|96|95|POST-W3 GAMECAST v1.1|
Michigan|93|97|95|POST-W3 GAMECAST v1.1|
Vanderbilt|95|93|94|POST-W3 GAMECAST v1.1|
Virginia|94|92|93|POST-W3 GAMECAST v1.1|
Oregon|95|91|93|POST-W3 GAMECAST v1.1|
Ohio State|92|94|93|POST-W3 GAMECAST v1.1|
Washington|92|94|93|POST-W3 GAMECAST v1.1|
Alabama|95|91|93|POST-W3 GAMECAST v1.1|
LSU|93|91|92|POST-W3 GAMECAST v1.1|
Arizona|91|93|92|POST-W3 GAMECAST v1.1|
Illinois|93|91|92|POST-W3 GAMECAST v1.1|
Iowa|91|93|92|POST-W3 GAMECAST v1.1|
Oklahoma|91|93|92|POST-W3 GAMECAST v1.1|
Ole Miss|94|90|92|POST-W3 GAMECAST v1.1|
SMU|89|93|91|POST-W3 GAMECAST v1.1|
Houston|90|88|89|POST-W3 GAMECAST v1.1|
Duke|88|90|89|POST-W3 GAMECAST v1.1|
Mississippi State|89|89|89|POST-W3 GAMECAST v1.1|
Cincinnati|87|89|88|POST-W3 GAMECAST v1.1|
Lehigh|89|87|88|POST-W3 GAMECAST v1.1|
Maryland|88|88|88|POST-W3 GAMECAST v1.1|
Louisville|91|85|88|POST-W3 GAMECAST v1.1|
Georgia Tech|85|89|87|POST-W3 GAMECAST v1.1|
Pittsburgh|86|88|87|POST-W3 GAMECAST v1.1|
Missouri|87|87|87|POST-W3 GAMECAST v1.1|
UCLA|88|86|87|POST-W3 GAMECAST v1.1|
Nebraska|89|85|87|POST-W3 GAMECAST v1.1|
Penn State|86|88|87|POST-W3 GAMECAST v1.1|
Wake Forest|88|86|87|POST-W3 GAMECAST v1.1|
Oklahoma State|87|85|86|POST-W3 GAMECAST v1.1|
North Carolina|84|88|86|POST-W3 GAMECAST v1.1|
Auburn|86|86|86|POST-W3 GAMECAST v1.1|
Virginia Tech|85|85|85|POST-W3 GAMECAST v1.1|
Florida State|83|85|84|POST-W3 GAMECAST v1.1|
TCU|82|86|84|POST-W3 GAMECAST v1.1|
Boise State|86|80|83|POST-W3 GAMECAST v1.1|
South Florida|81|85|83|POST-W3 GAMECAST v1.1|
Florida|84|82|83|POST-W3 GAMECAST v1.1|
Kentucky|85|79|82|POST-W3 GAMECAST v1.1|
UCF|80|84|82|POST-W3 GAMECAST v1.1|
North Texas|81|83|82|POST-W3 GAMECAST v1.1|
Michigan State|82|82|82|POST-W3 GAMECAST v1.1|
Tulsa|80|82|81|POST-W3 GAMECAST v1.1|
Kansas|80|82|81|POST-W3 GAMECAST v1.1|
Colorado|79|83|81|POST-W3 GAMECAST v1.1|
California|82|80|81|POST-W3 GAMECAST v1.1|
Tulane|78|82|80|POST-W3 GAMECAST v1.1|
Navy|80|80|80|POST-W3 GAMECAST v1.1|
Memphis|81|79|80|POST-W3 GAMECAST v1.1|
NC State|80|80|80|POST-W3 GAMECAST v1.1|
Kansas State|78|80|79|POST-W3 GAMECAST v1.1|
Clemson|81|77|79|POST-W3 GAMECAST v1.1|
Holy Cross|78|78|78|POST-W3 GAMECAST v1.1|
Baylor|76|80|78|POST-W3 GAMECAST v1.1|
Arizona State|80|76|78|POST-W3 GAMECAST v1.1|
North Dakota State|79|75|77|POST-W3 GAMECAST v1.1|
South Carolina|76|78|77|POST-W3 GAMECAST v1.1|
Syracuse|77|77|77|POST-W3 GAMECAST v1.1|
Georgia State|77|75|76|POST-W3 GAMECAST v1.1|
Wisconsin|77|75|76|POST-W3 GAMECAST v1.1|
Minnesota|76|76|76|POST-W3 GAMECAST v1.1|
Iowa State|75|77|76|POST-W3 GAMECAST v1.1|
Army|74|76|75|POST-W3 GAMECAST v1.1|
Utah State|75|75|75|POST-W3 GAMECAST v1.1|
Purdue|75|75|75|POST-W3 GAMECAST v1.1|
New Mexico|75|75|75|POST-W3 GAMECAST v1.1|
Arkansas|73|75|74|POST-W3 GAMECAST v1.1|
San Diego State|74|74|74|POST-W3 GAMECAST v1.1|
UConn|75|73|74|POST-W3 GAMECAST v1.1|
Princeton|76|72|74|POST-W3 GAMECAST v1.1|
West Virginia|74|74|74|POST-W3 GAMECAST v1.1|
Delaware|74|74|74|POST-W3 GAMECAST v1.1|
Florida Atlantic|75|73|74|POST-W3 GAMECAST v1.1|
Northwestern|72|74|73|POST-W3 GAMECAST v1.1|
Stanford|74|72|73|POST-W3 GAMECAST v1.1|
Colgate|73|71|72|POST-W3 GAMECAST v1.1|
Old Dominion|70|74|72|POST-W3 GAMECAST v1.1|
Fresno State|72|72|72|POST-W3 GAMECAST v1.1|
East Carolina|72|72|72|POST-W3 GAMECAST v1.1|
Buffalo|69|75|72|POST-W3 GAMECAST v1.1|
Boston College|70|74|72|POST-W3 GAMECAST v1.1|
Temple|70|74|72|POST-W3 GAMECAST v1.1|
Colorado State|71|71|71|POST-W3 GAMECAST v1.1|
UTSA|72|70|71|POST-W3 GAMECAST v1.1|
UNLV|69|71|70|POST-W3 GAMECAST v1.1|
Penn|73|67|70|POST-W3 GAMECAST v1.1|
San Jose State|70|68|69|POST-W3 GAMECAST v1.1|
Oregon State|68|70|69|POST-W3 GAMECAST v1.1|
Marshall|68|68|68|POST-W3 GAMECAST v1.1|
Northern Illinois|68|68|68|POST-W3 GAMECAST v1.1|
Air Force|69|67|68|POST-W3 GAMECAST v1.1|
Washington State|67|69|68|POST-W3 GAMECAST v1.1|
Cornell|68|66|67|POST-W3 GAMECAST v1.1|
Troy|67|65|66|POST-W3 GAMECAST v1.1|
Texas State|67|65|66|POST-W3 GAMECAST v1.1|
Southern Miss|67|65|66|POST-W3 GAMECAST v1.1|
Rutgers|65|65|65|POST-W3 GAMECAST v1.1|
UAB|66|64|65|POST-W3 GAMECAST v1.1|
Yale|66|64|65|POST-W3 GAMECAST v1.1|
Hawaii|63|65|64|POST-W3 GAMECAST v1.1|
Coastal Carolina|64|64|64|POST-W3 GAMECAST v1.1|
Florida International|62|66|64|POST-W3 GAMECAST v1.1|
Nevada|63|63|63|POST-W3 GAMECAST v1.1|
New Mexico State|62|64|63|POST-W3 GAMECAST v1.1|
Harvard|63|61|62|POST-W3 GAMECAST v1.1|
Rice|62|62|62|POST-W3 GAMECAST v1.1|
Louisiana Tech|61|61|61|POST-W3 GAMECAST v1.1|
Wyoming|61|61|61|POST-W3 GAMECAST v1.1|
Georgia Southern|61|61|61|POST-W3 GAMECAST v1.1|
UTEP|60|60|60|POST-W3 GAMECAST v1.1|
Middle Tennessee|60|60|60|POST-W3 GAMECAST v1.1|
Charlotte|60|60|60|CHAIRMAN FCS 60|
Duquesne|60|60|60|CHAIRMAN FCS 60|
Idaho|60|60|60|CHAIRMAN FCS 60|
Western Kentucky|60|60|60|CHAIRMAN FCS 60|
`.trim();

export const TEAM_POWER:Record<string,TeamPowerInput>=Object.fromEntries(RAW.split("\n").map(line=>{const [team,off,def,overall,flag,opponentBasis]=line.split("|");return [team,{offense:+off,defense:+def,specialTeams:null,overall:+overall,tempo:1.0,sourceVersion:POWER_SOURCE_VERSION,flag:flag||null,opponentBasis:opponentBasis||null}];}));

export function powerReady(team:string){const p=TEAM_POWER[team];return !!p&&Number.isFinite(p.offense)&&Number.isFinite(p.defense)&&Number.isFinite(p.overall);}
export function assertGamePowerReady(away:string,home:string){if(!powerReady(away)||!powerReady(home))throw new Error(`POWER_PENDING: ${away} at ${home}`);}
