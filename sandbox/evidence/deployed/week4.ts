export type Week4Game={id:string;date:string;dateLabel:string;kickoff:string;network:string;matchup:string;away:string;home:string;neutral:boolean;flexTime:boolean;kickoffOrder:number};

const RAW=`
G0115|2026-09-19|Sat 9/19|7:15 PM|ESPN|Florida State at Alabama|false|43
G0116|2026-09-17|Thu 9/17|9:30 PM|SEN|Northern Illinois at Arizona|false|3
G0117|2026-09-19|Sat 9/19|12:00 PM|ESPN|Georgia at Arkansas|false|13
G0118|2026-09-19|Sat 9/19|7:15 PM|ESPN2|Temple at Army|false|44
G0119|2026-09-19|Sat 9/19|10:00 PM|FS1|Kansas at Arizona State|true|53
G0120|2026-09-19|Sat 9/19|3:30 PM|SECN|Florida at Auburn|false|34
G0121|2026-09-19|Sat 9/19|3:30 PM|TNT|Indiana at Baylor|false|36
G0122|2026-09-19|Sat 9/19|7:00 PM|CW|TCU at Boston College|false|40
G0123|2026-09-19|Sat 9/19|8:00 PM|CBS|Idaho at Boise State|false|47
G0124|2026-09-19|Sat 9/19|12:00 PM|TNT|Penn at Cincinnati|false|22
G0125|2026-09-19|Sat 9/19|3:30 PM|ESPN|North Carolina at Clemson|false|29
G0126|2026-09-18|Fri 9/18|9:00 PM|CW|BYU at Colorado State|false|7
G0127|2026-09-19|Sat 9/19|12:00 PM|SEN|Coastal Carolina at Delaware|false|20
G0128|2026-09-19|Sat 9/19|12:00 PM|ACCN|Stanford at Duke|false|10
G0129|2026-09-18|Fri 9/18|8:00 PM|ESPN|Navy at East Carolina|false|6
G0130|2026-09-19|Sat 9/19|12:00 PM|ESPN+|Illinois at Florida Atlantic|false|14
G0131|2026-09-19|Sat 9/19|3:30 PM|CBSSN|Holy Cross at Harvard|false|27
G0132|2026-09-18|Fri 9/18|6:30 PM|CW|Colgate at Lehigh|false|4
G0133|2026-09-18|Fri 9/18|8:00 PM|EBC|SMU at Louisville|false|5
G0134|2026-09-19|Sat 9/19|12:00 PM|CBS|Virginia Tech at Maryland|false|11
G0135|2026-09-19|Sat 9/19|3:30 PM|B1G|UTEP at Michigan|false|25
G0136|2026-09-19|Sat 9/19|3:30 PM|CBS|Tennessee at Minnesota|false|26
G0137|2026-09-19|Sat 9/19|8:00 PM|EBC|LSU at Ole Miss|false|48
G0138|2026-09-19|Sat 9/19|3:30 PM|SEN|Troy at Missouri|false|35
G0139|2026-09-19|Sat 9/19|12:00 PM|SEN+|Nevada at Middle Tennessee|false|21
G0140|2026-09-19|Sat 9/19|7:30 PM|NBC|Michigan State at Notre Dame|false|46
G0141|2026-09-18|Fri 9/18|9:00 PM|SEN|Memphis at New Mexico State|false|8
G0142|2026-09-19|Sat 9/19|TBD|TV TBD|Colorado at Northwestern|false|999
G0143|2026-09-19|Sat 9/19|12:00 PM|EBC|Florida International at Old Dominion|false|12
G0144|2026-09-19|Sat 9/19|9:30 PM|USA|Western Kentucky at Oregon State|false|50
G0145|2026-09-19|Sat 9/19|3:30 PM|FOX|North Dakota State at Ohio State|false|32
G0146|2026-09-19|Sat 9/19|12:00 PM|SECN|New Mexico at Oklahoma|false|19
G0147|2026-09-17|Thu 9/17|7:30 PM|SEN|Syracuse at Pittsburgh|false|2
G0148|2026-09-19|Sat 9/19|12:00 PM|FS1|Buffalo at Penn State|false|17
G0149|2026-09-19|Sat 9/19|3:30 PM|NBC|USC at Rutgers|false|33
G0150|2026-09-19|Sat 9/19|3:30 PM|ABC|Mississippi State at South Carolina|false|24
G0151|2026-09-19|Sat 9/19|10:00 PM|CW|Charlotte at San Diego State|false|51
G0152|2026-09-19|Sat 9/19|10:30 PM|CBS|Fresno State at San Jose State|false|54
G0153|2026-09-19|Sat 9/19|7:00 PM|SECN|Kentucky at Texas A&M|false|42
G0154|2026-09-19|Sat 9/19|12:00 PM|ABC|UTSA at Texas|false|9
G0155|2026-09-19|Sat 9/19|7:00 PM|ESPN+|Louisiana Tech at Tulane|false|41
G0156|2026-09-19|Sat 9/19|10:00 PM|ESPN+|Rice at Tulsa|false|52
G0157|2026-09-19|Sat 9/19|3:30 PM|EBC|Houston at Texas Tech|false|28
G0158|2026-09-19|Sat 9/19|3:00 PM|CW|North Texas at Texas State|false|23
G0159|2026-09-19|Sat 9/19|12:00 PM|ESPN+|South Florida at UAB|false|15
G0160|2026-09-19|Sat 9/19|3:30 PM|ESPN+|Georgia State at UCF|false|30
G0161|2026-09-19|Sat 9/19|10:30 PM|FOX|Purdue at UCLA|false|55
G0162|2026-09-19|Sat 9/19|3:30 PM|ESPN+|UConn at Southern Miss|false|31
G0163|2026-09-17|Thu 9/17|7:30 PM|ESPN|Utah State at Utah|false|1
G0164|2026-09-19|Sat 9/19|7:00 PM|ACCN|West Virginia at Virginia|true|38
G0165|2026-09-19|Sat 9/19|12:00 PM|ESPN2|NC State at Vanderbilt|false|16
G0166|2026-09-19|Sat 9/19|7:30 PM|ABC|Miami at Wake Forest|false|45
G0167|2026-09-19|Sat 9/19|8:00 PM|FOX|Kansas State at Wisconsin|false|49
G0168|2026-09-19|Sat 9/19|6:00 PM|USA|Duquesne at Washington State|false|37
G0169|2026-09-19|Sat 9/19|7:00 PM|CBSSN|California at Yale|false|39
`.trim();

export const WEEK4:Week4Game[]=RAW.split("\n").map((line)=>{
  const [id,date,dateLabel,kickoff,network,matchup,neutralRaw,kickoffOrderRaw]=line.split("|");
  const [away,home]=matchup.split(" at ");
  return{id,date,dateLabel,kickoff,network,matchup,away,home,neutral:neutralRaw==="true",flexTime:kickoff.endsWith("*"),kickoffOrder:Number(kickoffOrderRaw)};
});
if(WEEK4.length!==55)throw new Error(`Week 4 schedule count mismatch: ${WEEK4.length}`);
if(new Set(WEEK4.map(g=>g.id)).size!==55)throw new Error("Week 4 duplicate game ID");
if(WEEK4.filter(g=>g.neutral).length!==2)throw new Error("Week 4 neutral-site count mismatch");

export type OperatingSlateGame=Week4Game&{canonicalWeek:"W4";carryover:false};
export const OPERATING_SLATE:OperatingSlateGame[]=WEEK4.map(g=>({...g,canonicalWeek:"W4" as const,carryover:false as const}));
if(OPERATING_SLATE.length!==55)throw new Error(`4.3 operating slate count mismatch: ${OPERATING_SLATE.length}`);
if(new Set(OPERATING_SLATE.map(g=>g.id)).size!==55)throw new Error("4.3 operating slate duplicate game ID");
