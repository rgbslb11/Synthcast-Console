export type Week3Game={id:string;date:string;dateLabel:string;kickoff:string;network:string;matchup:string;away:string;home:string;flexTime:boolean;kickoffOrder:number};

const RAW=`
G0066|2026-09-10|Thu 9/10|7:00 PM|SEN|Rutgers at Boston College
G0091|2026-09-10|Thu 9/10|9:30 PM|SEN|Texas Tech at Oregon State
G0111|2026-09-11|Fri 9/11|7:00 PM|EBC|UNLV at Virginia Tech
G0081|2026-09-11|Fri 9/11|8:00 PM|FOX|Missouri at Kansas
G0109|2026-09-11|Fri 9/11|10:00 PM|SEN|Indiana at UTEP
G0113|2026-09-12|Sat 9/12|12:00 PM|ABC|Lehigh at West Virginia
G0105|2026-09-12|Sat 9/12|12:00 PM|SECN|Harvard at Georgia
G0083|2026-09-12|Sat 9/12|12:00 PM|EBC|Oklahoma at Michigan
G0084|2026-09-12|Sat 9/12|12:00 PM|CBS|Mississippi State at Minnesota
G0089|2026-09-12|Sat 9/12|12:00 PM|NBC|South Carolina at Northwestern
G0072|2026-09-12|Sat 9/12|12:00 PM|ESPN|Michigan State at East Carolina
G0101|2026-09-12|Sat 9/12|12:00 PM|ESPN+|Tulsa at Tulane
G0068|2026-09-12|Sat 9/12|12:00 PM|SEN+|Old Dominion at Buffalo
G0085|2026-09-12|Sat 9/12|12:00 PM|SEN+|Georgia State at Middle Tennessee
G0076|2026-09-12|Sat 9/12|12:00 PM|CBSSN|Cornell at Holy Cross
G0104|2026-09-12|Sat 9/12|12:00 PM|CBSSN|Maryland at UConn
G0070|2026-09-12|Sat 9/12|12:00 PM|CW|Georgia Southern at Clemson
G0078|2026-09-12|Sat 9/12|12:00 PM|FOX|Duke at Illinois
G0106|2026-09-12|Sat 9/12|3:00 PM|CW|Alabama at Kentucky
G0087|2026-09-12|Sat 9/12|3:30 PM|NBC|Rice at Notre Dame
G0077|2026-09-12|Sat 9/12|3:30 PM|FOX|USC at Houston
G0065|2026-09-12|Sat 9/12|3:30 PM|SECN|Southern Miss at Auburn
G0098|2026-09-12|Sat 9/12|3:30 PM|ABC|Arizona State at Texas A&M
G0086|2026-09-12|Sat 9/12|3:30 PM|EBC|Florida Atlantic at Navy
G0107|2026-09-12|Sat 9/12|3:30 PM|ESPN+|Army at South Florida
G0073|2026-09-12|Sat 9/12|3:30 PM|SEN+|Marshall at Florida International
G0099|2026-09-12|Sat 9/12|3:30 PM|ESPN2|Penn State at Temple
G0114|2026-09-12|Sat 9/12|3:30 PM|ESPN|Cincinnati at Wyoming
G0103|2026-09-12|Sat 9/12|3:30 PM|CBS|San Diego State at UCLA
G0112|2026-09-12|Sat 9/12|3:30 PM|B1G|Utah State at Washington
G0095|2026-09-12|Sat 9/12|4:15 PM|B1G|Wake Forest at Purdue
G0067|2026-09-12|Sat 9/12|6:00 PM|USA|Memphis at Boise State
G0094|2026-09-12|Sat 9/12|6:00 PM|CBSSN|Nebraska at Princeton
G0092|2026-09-12|Sat 9/12|6:00 PM|CBSSN|Yale at Penn
G0097|2026-09-12|Sat 9/12|6:00 PM|ACCN|California at Syracuse
G0110|2026-09-12|Sat 9/12|7:00 PM|SECN|Delaware at Vanderbilt
G0088|2026-09-12|Sat 9/12|7:00 PM|ESPN+|North Texas at New Mexico State
G0093|2026-09-12|Sat 9/12|7:00 PM|CW|UCF at Pittsburgh
G0080|2026-09-12|Sat 9/12|7:00 PM|FS1|Washington State at Kansas State
G0075|2026-09-12|Sat 9/12|7:15 PM|ESPN|Tennessee at Georgia Tech
G0069|2026-09-12|Sat 9/12|7:30 PM|ABC|Arizona at BYU
G0079|2026-09-12|Sat 9/12|7:30 PM|NBC|Iowa State at Iowa
G0090|2026-09-12|Sat 9/12|7:30 PM*|FOX|Oregon at Oklahoma State
G0100|2026-09-12|Sat 9/12|8:00 PM|EBC|Ohio State at Texas
G0108|2026-09-12|Sat 9/12|8:00 PM|TNT|Arkansas at Utah
G0082|2026-09-12|Sat 9/12|8:30 PM|SEN|Louisiana Tech at LSU
G0102|2026-09-12|Sat 9/12|9:30 PM|USA|UTSA at Texas State
G0071|2026-09-12|Sat 9/12|10:00 PM|CBSSN|Southern Utah at Colorado State
G0074|2026-09-12|Sat 9/12|10:00 PM|CBSSN|Sacramento State at Fresno State
G0064|2026-09-12|Sat 9/12|10:30 PM|ESPN2|North Dakota State at Air Force
G0096|2026-09-12|Sat 9/12|11:00 PM|CBSSN|Cal Poly at San Jose State
`.trim();

export const WEEK3:Week3Game[]=RAW.split("\n").map((line,k)=>{const [id,date,dateLabel,kickoff,network,matchup]=line.split("|");const [away,home]=matchup.split(" at ");return{id,date,dateLabel,kickoff,network,matchup,away,home,flexTime:kickoff.endsWith("*"),kickoffOrder:k+1};});
if(WEEK3.length!==51)throw new Error(`Week 3 schedule count mismatch: ${WEEK3.length}`);
if(new Set(WEEK3.map(g=>g.id)).size!==51)throw new Error("Week 3 duplicate game ID");

export type OperatingSlateGame=Week3Game&{canonicalWeek:"W2"|"W3";carryover:boolean};
export const WEEK2_CARRYOVER_G0021:OperatingSlateGame={
  id:"G0021",
  date:"2026-09-07",
  dateLabel:"Mon 9/7",
  kickoff:"8:00 PM",
  network:"EBC",
  matchup:"SMU at Florida State",
  away:"SMU",
  home:"Florida State",
  flexTime:false,
  kickoffOrder:0,
  canonicalWeek:"W2",
  carryover:true
};
export const OPERATING_SLATE:OperatingSlateGame[]=[
  WEEK2_CARRYOVER_G0021,
  ...WEEK3.map(g=>({...g,canonicalWeek:"W3" as const,carryover:false}))
];
if(OPERATING_SLATE.length!==52)throw new Error(`4.2.2 operating slate count mismatch: ${OPERATING_SLATE.length}`);
if(new Set(OPERATING_SLATE.map(g=>g.id)).size!==52)throw new Error("4.2.2 operating slate duplicate game ID");
