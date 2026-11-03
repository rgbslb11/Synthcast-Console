const fields=['games','snaps','yards','rushes','rushYards','passAttempts','completions','passYards','sacks','sackYards','kneels','interceptions','fumbles','thirdAttempts','thirdConversions','fourthAttempts','fourthConversions','punts','fgAttempts','fgMade','touchdowns','safetiesConceded','downsLost','drives','drivePoints','scoringDrives','redZoneTrips','redZoneTD','redZoneScores','firstDowns','driveStartField'];
const fresh=()=>Object.fromEntries(fields.map(k=>[k,0]));
const sum=(a,b)=>{for(const k of fields)a[k]+=b[k];};
let unknownDescriptions=0;const driveEndings={};
function analyze(g){
 const stats=[fresh(),fresh()];stats.forEach(s=>s.games++);
 let drive=null,lastPeriod=null;
 function close(reason){if(!drive)return;const s=stats[drive.team];s.drives++;s.driveStartField+=drive.start;s.drivePoints+=drive.points;s.scoringDrives+=drive.points>0?1:0;if(drive.rz){s.redZoneTrips++;s.redZoneTD+=drive.td?1:0;s.redZoneScores+=drive.points>0?1:0;}driveEndings[reason]=(driveEndings[reason]||0)+1;drive=null;}
 for(const h of g.history){
  if(!h.preSnap||!['1','2','3','4'].includes(h.period))continue;
  if(lastPeriod&&Number(lastPeriod)<=2&&Number(h.period)>=3)close('HALFTIME');
  lastPeriod=h.period;
  if(drive&&drive.team!==h.team)close('POSSESSION_CHANGE');
  if(!drive)drive={team:h.team,points:0,rz:false,td:false,start:h.preSnap.fieldPos};
  const s=stats[h.team],p=h.preSnap,a=h.adjudicated,d=h.originalDescription||h.desc;
  const fg=/^\d+-yard field goal/.test(d),punt=/^Punt/.test(d),sack=/Sack for/.test(d),kneel=/Quarterback kneel/.test(d),pick=/Pass intercepted/.test(d),fum=/fumble lost/.test(d),comp=/Pass complete/.test(d),inc=/Incomplete pass/.test(d),run=/Run for|Run · fumble/.test(d);
  const td=h.desc.startsWith('TOUCHDOWN'),safety=h.ruling==='SAFETY',downs=h.ruling==='TURNOVER_ON_DOWNS';
  drive.rz ||= p.fieldPos>=80;
  if(fg){s.fgAttempts++;s.fgMade+=a.points>0?1:0;}
  else if(punt)s.punts++;
  else {
   s.snaps++;if(!(sack||kneel||pick||fum||comp||inc||run))unknownDescriptions++;
   const yards=pick||inc?0:Math.min(h.yards,100-p.fieldPos);
   s.yards+=yards;
   if(sack){s.sacks++;s.sackYards-=yards;}
   else if(kneel){s.kneels++;s.rushes++;s.rushYards+=yards;}
   else if(comp||inc||pick){s.passAttempts++;s.completions+=comp?1:0;s.passYards+=comp?yards:0;}
   else {s.rushes++;s.rushYards+=yards;}
   s.interceptions+=pick?1:0;s.fumbles+=fum?1:0;
   const success=td||(!pick&&!fum&&!safety&&!downs&&a.possession===h.team&&a.down===1);
   if(p.down===3){s.thirdAttempts++;s.thirdConversions+=success?1:0;}
   if(p.down===4){s.fourthAttempts++;s.fourthConversions+=success?1:0;}
   s.firstDowns+=success?1:0;
   if(!td&&!pick&&!fum&&!safety&&!downs&&a.fieldPos>=80&&a.possession===h.team)drive.rz=true;
  }
  if(!safety)drive.points+=a.points||0;
  if(td){s.touchdowns++;drive.td=true;}
  s.safetiesConceded+=safety?1:0;s.downsLost+=downs?1:0;
  if(a.possession!==h.team)close(td?'TD':fg?(a.points?'FG_GOOD':'FG_MISS'):punt?'PUNT':pick?'INT':fum?'FUMBLE':safety?'SAFETY':downs?'DOWNS':'OTHER');
 }
 close('END_REGULATION');return stats;
}

export {fields,fresh,sum,analyze};
