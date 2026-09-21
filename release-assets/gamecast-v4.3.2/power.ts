export type TeamPowerInput={offense:number|null;defense:number|null;specialTeams:number|null;overall:number|null;tempo:number|null;sourceVersion:string|null;flag?:string|null;opponentBasis?:string|null};

export const POWER_SOURCE_VERSION="SYNTHCAST-v4.3.2-W5-POST-W4-2026-09-20-GAMECAST-TEAM-OFF-DEF-v1.2-121+FCS_60";
export const CANONICAL_TEAM_COUNT=121;
export const SCHEDULE_FCS_TEAM_COUNT=4;
const RAW=`
Texas|99|99|99|POST-W4 GAMECAST v1.2|
Georgia|98|98|98|POST-W4 GAMECAST v1.2|
Indiana|98|98|98|POST-W4 GAMECAST v1.2|
Miami|98|98|98|POST-W4 GAMECAST v1.2|
Notre Dame|97|97|97|POST-W4 GAMECAST v1.2|
Ohio State|98|96|97|POST-W4 GAMECAST v1.2|
Texas Tech|96|96|96|POST-W4 GAMECAST v1.2|
BYU|95|97|96|POST-W4 GAMECAST v1.2|
Tennessee|95|95|95|POST-W4 GAMECAST v1.2|
Utah|95|95|95|POST-W4 GAMECAST v1.2|
USC|96|94|95|POST-W4 GAMECAST v1.2|
Michigan|94|96|95|POST-W4 GAMECAST v1.2|
Alabama|96|92|94|POST-W4 GAMECAST v1.2|
Texas A&M|96|92|94|POST-W4 GAMECAST v1.2|
Oregon|96|92|94|POST-W4 GAMECAST v1.2|
Vanderbilt|95|91|93|POST-W4 GAMECAST v1.2|
Arizona|92|94|93|POST-W4 GAMECAST v1.2|
Ole Miss|95|91|93|POST-W4 GAMECAST v1.2|
LSU|93|91|92|POST-W4 GAMECAST v1.2|
Washington|91|93|92|POST-W4 GAMECAST v1.2|
Illinois|92|92|92|POST-W4 GAMECAST v1.2|
Iowa|91|93|92|POST-W4 GAMECAST v1.2|
Duke|90|92|91|POST-W4 GAMECAST v1.2|
Virginia|92|90|91|POST-W4 GAMECAST v1.2|
Oklahoma|88|92|90|POST-W4 GAMECAST v1.2|
Penn State|90|90|90|POST-W4 GAMECAST v1.2|
SMU|86|92|89|POST-W4 GAMECAST v1.2|
Pittsburgh|88|90|89|POST-W4 GAMECAST v1.2|
Houston|90|88|89|POST-W4 GAMECAST v1.2|
Lehigh|89|87|88|POST-W4 GAMECAST v1.2|
Virginia Tech|87|87|87|POST-W4 GAMECAST v1.2|
Louisville|87|87|87|POST-W4 GAMECAST v1.2|
Mississippi State|87|87|87|POST-W4 GAMECAST v1.2|
Kentucky|90|84|87|POST-W4 GAMECAST v1.2|
Cincinnati|85|87|86|POST-W4 GAMECAST v1.2|
UCLA|88|84|86|POST-W4 GAMECAST v1.2|
Wake Forest|87|85|86|POST-W4 GAMECAST v1.2|
Missouri|85|87|86|POST-W4 GAMECAST v1.2|
Maryland|86|84|85|POST-W4 GAMECAST v1.2|
Nebraska|87|83|85|POST-W4 GAMECAST v1.2|
Florida|87|83|85|POST-W4 GAMECAST v1.2|
Georgia Tech|82|88|85|POST-W4 GAMECAST v1.2|
Memphis|86|84|85|POST-W4 GAMECAST v1.2|
North Carolina|83|87|85|POST-W4 GAMECAST v1.2|
UCF|83|85|84|POST-W4 GAMECAST v1.2|
Oklahoma State|85|83|84|POST-W4 GAMECAST v1.2|
Boise State|86|82|84|POST-W4 GAMECAST v1.2|
TCU|82|86|84|POST-W4 GAMECAST v1.2|
South Florida|82|84|83|POST-W4 GAMECAST v1.2|
Auburn|84|82|83|POST-W4 GAMECAST v1.2|
Florida State|83|83|83|POST-W4 GAMECAST v1.2|
California|83|81|82|POST-W4 GAMECAST v1.2|
Tulsa|80|84|82|POST-W4 GAMECAST v1.2|
Clemson|83|81|82|POST-W4 GAMECAST v1.2|
NC State|83|81|82|POST-W4 GAMECAST v1.2|
Kansas State|80|84|82|POST-W4 GAMECAST v1.2|
Michigan State|81|81|81|POST-W4 GAMECAST v1.2|
Arizona State|80|78|79|POST-W4 GAMECAST v1.2|
Tulane|78|80|79|POST-W4 GAMECAST v1.2|
Navy|77|81|79|POST-W4 GAMECAST v1.2|
Holy Cross|79|79|79|POST-W4 GAMECAST v1.2|
UConn|80|76|78|POST-W4 GAMECAST v1.2|
Northwestern|77|79|78|POST-W4 GAMECAST v1.2|
Army|77|79|78|POST-W4 GAMECAST v1.2|
Kansas|77|79|78|POST-W4 GAMECAST v1.2|
North Texas|78|76|77|POST-W4 GAMECAST v1.2|
Minnesota|77|75|76|POST-W4 GAMECAST v1.2|
New Mexico|74|78|76|POST-W4 GAMECAST v1.2|
Iowa State|75|77|76|POST-W4 GAMECAST v1.2|
South Carolina|74|76|75|POST-W4 GAMECAST v1.2|
West Virginia|75|75|75|POST-W4 GAMECAST v1.2|
Syracuse|75|75|75|POST-W4 GAMECAST v1.2|
Utah State|75|75|75|POST-W4 GAMECAST v1.2|
Baylor|73|77|75|POST-W4 GAMECAST v1.2|
North Dakota State|77|73|75|POST-W4 GAMECAST v1.2|
Wisconsin|75|75|75|POST-W4 GAMECAST v1.2|
Fresno State|73|77|75|POST-W4 GAMECAST v1.2|
Temple|73|75|74|POST-W4 GAMECAST v1.2|
Georgia State|74|72|73|POST-W4 GAMECAST v1.2|
San Diego State|73|73|73|POST-W4 GAMECAST v1.2|
Colorado|71|75|73|POST-W4 GAMECAST v1.2|
Colgate|74|72|73|POST-W4 GAMECAST v1.2|
Princeton|75|71|73|POST-W4 GAMECAST v1.2|
Purdue|74|72|73|POST-W4 GAMECAST v1.2|
Old Dominion|69|75|72|POST-W4 GAMECAST v1.2|
UTSA|74|70|72|POST-W4 GAMECAST v1.2|
Arkansas|71|73|72|POST-W4 GAMECAST v1.2|
Delaware|70|74|72|POST-W4 GAMECAST v1.2|
Florida Atlantic|72|72|72|POST-W4 GAMECAST v1.2|
Washington State|70|72|71|POST-W4 GAMECAST v1.2|
Oregon State|70|72|71|POST-W4 GAMECAST v1.2|
Penn|74|68|71|POST-W4 GAMECAST v1.2|
Colorado State|70|72|71|POST-W4 GAMECAST v1.2|
East Carolina|70|70|70|POST-W4 GAMECAST v1.2|
Stanford|70|68|69|POST-W4 GAMECAST v1.2|
Texas State|71|67|69|POST-W4 GAMECAST v1.2|
Boston College|68|70|69|POST-W4 GAMECAST v1.2|
UNLV|68|70|69|POST-W4 GAMECAST v1.2|
Rutgers|69|67|68|POST-W4 GAMECAST v1.2|
Marshall|66|68|67|POST-W4 GAMECAST v1.2|
Air Force|68|66|67|POST-W4 GAMECAST v1.2|
San Jose State|67|67|67|POST-W4 GAMECAST v1.2|
Coastal Carolina|65|69|67|POST-W4 GAMECAST v1.2|
Cornell|67|65|66|POST-W4 GAMECAST v1.2|
Buffalo|64|66|65|POST-W4 GAMECAST v1.2|
Troy|64|66|65|POST-W4 GAMECAST v1.2|
Northern Illinois|65|65|65|POST-W4 GAMECAST v1.2|
Florida International|62|66|64|POST-W4 GAMECAST v1.2|
Hawaii|63|65|64|POST-W4 GAMECAST v1.2|
UAB|64|62|63|POST-W4 GAMECAST v1.2|
Rice|63|63|63|POST-W4 GAMECAST v1.2|
Louisiana Tech|64|62|63|POST-W4 GAMECAST v1.2|
Yale|63|63|63|POST-W4 GAMECAST v1.2|
Southern Miss|64|62|63|POST-W4 GAMECAST v1.2|
Nevada|61|63|62|POST-W4 GAMECAST v1.2|
Harvard|62|60|61|POST-W4 GAMECAST v1.2|
New Mexico State|61|61|61|POST-W4 GAMECAST v1.2|
Georgia Southern|61|61|61|POST-W4 GAMECAST v1.2|
Middle Tennessee|60|60|60|POST-W4 GAMECAST v1.2|
UTEP|60|60|60|POST-W4 GAMECAST v1.2|
Wyoming|60|60|60|POST-W4 GAMECAST v1.2|
Arkansas State|60|60|60|CHAIRMAN FCS 60|
Louisiana-Monroe|60|60|60|CHAIRMAN FCS 60|
Toledo|60|60|60|CHAIRMAN FCS 60|
Western Michigan|60|60|60|CHAIRMAN FCS 60|
`.trim();

export const TEAM_POWER:Record<string,TeamPowerInput>=Object.fromEntries(RAW.split("\n").map(line=>{const [team,off,def,overall,flag,opponentBasis]=line.split("|");return [team,{offense:+off,defense:+def,specialTeams:null,overall:+overall,tempo:1.0,sourceVersion:POWER_SOURCE_VERSION,flag:flag||null,opponentBasis:opponentBasis||null}];}));

export function powerReady(team:string){const p=TEAM_POWER[team];return !!p&&Number.isFinite(p.offense)&&Number.isFinite(p.defense)&&Number.isFinite(p.overall);}
export function assertGamePowerReady(away:string,home:string){if(!powerReady(away)||!powerReady(home))throw new Error(`POWER_PENDING: ${away} at ${home}`);}
