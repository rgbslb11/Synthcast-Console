export type Week5Game={id:string;date:string;dateLabel:string;kickoff:string;network:string;matchup:string;away:string;home:string;neutral:boolean;flexTime:boolean;kickoffOrder:number};

const RAW=`
G0191|2026-09-24|Thu 9/24|7:30 PM|ESPN|Wake Forest at Louisville|false|1
G0176|2026-09-24|Thu 9/24|7:30 PM|SEN|Troy at Buffalo|false|2
G0172|2026-09-24|Thu 9/24|9:30 PM|SEN|NC State at Arizona State|false|3
G0221|2026-09-24|Thu 9/24|10:00 PM|ESPN|Oregon State at UTEP|false|4
G0206|2026-09-25|Fri 9/25|4:00 PM|ESPN|Army at Princeton|false|5
G0189|2026-09-25|Fri 9/25|8:00 PM|EBC|Northwestern at Indiana|false|6
G0215|2026-09-25|Fri 9/25|8:00 PM|ESPN|Navy at UAB|false|7
G0220|2026-09-25|Fri 9/25|10:00 PM|CW|Temple at Utah State|false|8
G0177|2026-09-25|Fri 9/25|11:59 PM|EBC|Clemson at California|false|9
G0211|2026-09-26|Sat 9/26|12:00 PM|ABC|UNLV at Syracuse|false|10
G0180|2026-09-26|Sat 9/26|12:00 PM|ACCN|Harvard at Duke|false|11
G0207|2026-09-26|Sat 9/26|12:00 PM|CBS|Wisconsin at Penn State|false|12
G0190|2026-09-26|Sat 9/26|12:00 PM|CBSSN|Kentucky at Lehigh|false|13
G0179|2026-09-26|Sat 9/26|12:00 PM|CBSSN|Penn at Cornell|false|14
G0224|2026-09-26|Sat 9/26|12:00 PM|CW|Boise State at Western Michigan|false|15
G0196|2026-09-26|Sat 9/26|12:00 PM|EBC|East Carolina at Miami|false|16
G0178|2026-09-26|Sat 9/26|12:00 PM|ESPN|Kansas State at Cincinnati|false|17
G0181|2026-09-26|Sat 9/26|12:00 PM|ESPN+|Southern Miss at Florida Atlantic|false|18
G0193|2026-09-26|Sat 9/26|12:00 PM|ESPN+|Louisiana-Monroe at Louisiana Tech|false|19
G0204|2026-09-26|Sat 9/26|12:00 PM|FOX|Illinois at Ohio State|false|20
G0208|2026-09-26|Sat 9/26|12:00 PM|NBC|Notre Dame at Purdue|false|21
G0198|2026-09-26|Sat 9/26|12:00 PM|SECN|Missouri at Mississippi State|false|22
G0203|2026-09-26|Sat 9/26|12:00 PM|SEN|Delaware at Old Dominion|false|23
G0188|2026-09-26|Sat 9/26|12:00 PM|TNT|Utah at Iowa State|false|24
G0213|2026-09-26|Sat 9/26|12:00 PM|USA|San Diego State at Toledo|false|25
G0175|2026-09-26|Sat 9/26|2:10 PM|SEN|Virginia Tech at Boston College|false|26
G0183|2026-09-26|Sat 9/26|3:30 PM|ABC|Ole Miss at Florida|false|27
G0194|2026-09-26|Sat 9/26|3:30 PM|B1G|UCLA at Maryland|false|28
G0223|2026-09-26|Sat 9/26|3:30 PM|CBS|Minnesota at Washington|false|29
G0205|2026-09-26|Sat 9/26|3:30 PM|CW|Texas Tech at Pittsburgh|false|30
G0185|2026-09-26|Sat 9/26|3:30 PM|EBC|Tulane at Florida State|false|31
G0195|2026-09-26|Sat 9/26|3:30 PM|ESPN+|Rice at Memphis|false|32
G0227|2026-09-26|Sat 9/26|3:30 PM|ESPN2|Hawaii at Wyoming|false|33
G0199|2026-09-26|Sat 9/26|3:30 PM|FOX|Nebraska at Michigan State|false|34
G0222|2026-09-26|Sat 9/26|3:30 PM|SEN+|North Texas at UTSA|false|35
G0174|2026-09-26|Sat 9/26|3:30 PM|TNT|Colorado at Baylor|false|36
G0200|2026-09-26|Sat 9/26|4:00 PM|CBSSN|Air Force at Nevada|false|37
G0209|2026-09-26|Sat 9/26|4:15 PM|B1G|SMU at Rutgers|false|38
G0212|2026-09-26|Sat 9/26|4:30 PM|SEN|Texas at Tennessee|false|39
G0214|2026-09-26|Sat 9/26|6:00 PM|USA|Arkansas State at Texas State|false|40
G0186|2026-09-26|Sat 9/26|6:15 PM|SEN|Houston at Georgia Southern|false|41
G0219|2026-09-26|Sat 9/26|7:00 PM|SEN+|Middle Tennessee at South Florida|false|42
G0171|2026-09-26|Sat 9/26|7:15 PM|ESPN|Tulsa at Arkansas|false|43
G0192|2026-09-26|Sat 9/26|7:30 PM|ABC|Texas A&M at LSU|false|44
G0170|2026-09-26|Sat 9/26|7:30 PM|ESPN2|South Carolina at Alabama|false|45
G0197|2026-09-26|Sat 9/26|7:30 PM|NBC|Iowa at Michigan|false|46
G0218|2026-09-26|Sat 9/26|8:00 PM|CBS|Oregon at USC|false|47
G0217|2026-09-26|Sat 9/26|8:00 PM|EBC|Oklahoma at Georgia|false|48
G0216|2026-09-26|Sat 9/26|8:00 PM|FS1|TCU at UCF|false|49
G0173|2026-09-26|Sat 9/26|8:00 PM|SECN|Vanderbilt at Auburn|false|50
G0182|2026-09-26|Sat 9/26|8:00 PM|SEN+|Coastal Carolina at Florida International|false|51
G0187|2026-09-26|Sat 9/26|8:00 PM|SEN+|Northern Illinois at Georgia State|false|52
G0226|2026-09-26|Sat 9/26|8:30 PM|SEN|Oklahoma State at West Virginia|false|53
G0184|2026-09-26|Sat 9/26|10:00 PM|CW|Marshall at Fresno State|false|54
G0202|2026-09-26|Sat 9/26|10:00 PM|SEN|Colgate at New Mexico State|false|55
G0210|2026-09-26|Sat 9/26|10:30 PM|ESPN|Georgia Tech at Stanford|false|56
G0201|2026-09-26|Sat 9/26|10:30 PM|ESPN2|Virginia at New Mexico|false|57
G0225|2026-09-26|Sat 9/26|11:30 PM|CBS|Arizona at Washington State|false|58
`.trim();

export const WEEK5:Week5Game[]=RAW.split("\n").map((line)=>{
  const [id,date,dateLabel,kickoff,network,matchup,neutralRaw,kickoffOrderRaw]=line.split("|");
  const [away,home]=matchup.split(" at ");
  return{id,date,dateLabel,kickoff,network,matchup,away,home,neutral:neutralRaw==="true",flexTime:kickoff.endsWith("*"),kickoffOrder:Number(kickoffOrderRaw)};
});
if(WEEK5.length!==58)throw new Error(`Week 5 schedule count mismatch: ${WEEK5.length}`);
if(new Set(WEEK5.map(g=>g.id)).size!==58)throw new Error("Week 5 duplicate game ID");
if(WEEK5.filter(g=>g.neutral).length!==0)throw new Error("Week 5 neutral-site count mismatch");

export type OperatingSlateGame=Week5Game&{canonicalWeek:"W5";carryover:false};
export const OPERATING_SLATE:OperatingSlateGame[]=WEEK5.map(g=>({...g,canonicalWeek:"W5" as const,carryover:false as const}));
if(OPERATING_SLATE.length!==58)throw new Error(`4.3.2 operating slate count mismatch: ${OPERATING_SLATE.length}`);
if(new Set(OPERATING_SLATE.map(g=>g.id)).size!==58)throw new Error("4.3.2 operating slate duplicate game ID");
