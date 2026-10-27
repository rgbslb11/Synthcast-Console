// Offline preparation only. No network calls, production writes, or publication.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='release-assets/v5.0.3-week9',target='release-assets/v5.0.4-week10';
const canonical=JSON.parse(fs.readFileSync(target+'/canonical-week10.json'));
const rows=fs.readFileSync(target+'/chairman-carriage.tsv','utf8').trim().split('\n').map(l=>l.split('\t'));
const aliases={'FIU':'Florida International','Miami (FL)':'Miami'};
function team(s){const m=s.match(/^(?:#(\d+) )?(.+?) \((\d+-\d+)(?:, (\d+-\d+))?\)$/);assert(m,s);return {rank:m[1]?+m[1]:null,name:aliases[m[2]]??m[2],record:m[3],conferenceRecord:m[4]??''};}
const slate=rows.map(([dateLabel,kickoff,network,displayMatchup,notes],i)=>{
 const neutral=displayMatchup.includes(' vs. '),[a,h]=displayMatchup.split(neutral?' vs. ':' at ').map(team);
 const matches=canonical.filter(g=>g.away===a.name&&g.home===h.name);assert.equal(matches.length,1,displayMatchup);const c=matches[0];assert.equal(neutral,c.neutral,c.id);
 const [,month,day]=dateLabel.match(/ (\d+)\/(\d+)/),date=`2026-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
 const normalized=kickoff==='Noon'?'12:00 PM':kickoff;const [,hh,mm,ampm]=normalized.match(/^(\d+):(\d+) (AM|PM)$/);
 const hours=(+hh%12)+(ampm==='PM'?12:0),kickoffZulu=new Date(`${date}T${String(hours).padStart(2,'0')}:${mm}:00-04:00`).toISOString().replace('.000Z','Z');
 assert.equal(new Date(kickoffZulu).toLocaleDateString('en-US',{weekday:'short',timeZone:'America/New_York'}),dateLabel.slice(0,3));
 return {id:c.id,date,dateLabel,kickoff,network,matchup:`${a.name}${neutral?' vs. ':' at '}${h.name}`,displayMatchup,away:a.name,home:h.name,awayCode:c.awayCode,homeCode:c.homeCode,awayRecord:a.record,homeRecord:h.record,awayConferenceRecord:a.conferenceRecord,homeConferenceRecord:h.conferenceRecord,awayRank:a.rank,homeRank:h.rank,neutral,venueDesignation:neutral?'NEUTRAL':'HOME',venueId:c.venueId,conferenceGame:c.conferenceGame,kickoffOrder:i+1,canonicalWeek:'W10',kickoffTimeZone:'America/New_York',kickoffZulu,tvStartZulu:null,notes:notes==='—'?'':notes};
});
assert.equal(slate.length,56);assert.equal(new Set(slate.map(g=>g.id)).size,56);assert.equal(new Set(slate.flatMap(g=>[g.away,g.home])).size,112);
assert.deepEqual(slate.map(g=>g.id).sort(),canonical.map(g=>g.id).sort());
for(let i=1;i<slate.length;i++)assert(slate[i].kickoffZulu>=slate[i-1].kickoffZulu);
const digest=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const dataVersion='W10-SLATE56+RATINGS121_RETAINED_V503+CSV_dc8160bcfcb2429a+V504';
const substitutions=[['v5.0.3-week9','v5.0.4-week10'],['5.0.3','5.0.4'],['v5-0-3','v5-0-4'],['V503','V504'],['v503','v504'],['503','504'],['week9','week10'],['Week 9','Week 10'],['WEEK 9','WEEK 10'],['2026-W09','2026-W10'],['W09_OPERATOR','W10_OPERATOR'],['W9','W10'],['w9','w10']];
const replace=s=>substitutions.reduce((s,[a,b])=>s.replaceAll(a,b),s);
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
function write(file,body){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);}
for(const f of walk(base+'/backend')){
 if(f.endsWith('/week9.mjs'))continue;
 const out=replace(f);let body=replace(fs.readFileSync(f,'utf8'));
 if(f.endsWith('/engine.mjs'))body=body.replace(/const DATA_VERSION = .*;/,`const DATA_VERSION = ${JSON.stringify(dataVersion)};`);
 if(f.endsWith('/security-core.mjs'))body=body.replace(/export const ACTIVE_GAME_IDS=Object.freeze\(.*\);/,`export const ACTIVE_GAME_IDS=Object.freeze(${JSON.stringify(slate.map(g=>g.id))});`);
 if(!f.endsWith('/power.mjs')&&!f.endsWith('/engine.mjs'))body=body.replace(/\b52\b/g,'56');
 write(out,body);
}
write(target+'/slate.json',JSON.stringify(slate,null,2)+'\n');
write(target+'/backend/runtime/week10.mjs','// Chairman-approved Week 10 carriage; Eastern time.\nexport const OPERATING_SLATE = '+JSON.stringify(slate,null,2)+';\n');
// Exact inherited rating bytes; no new weekly ratings or recalibration inferred.
fs.copyFileSync(base+'/ratings.csv',target+'/ratings.csv');fs.copyFileSync(base+'/backend/runtime/power.mjs',target+'/backend/runtime/power.mjs');
for(const f of walk('public/v5.0.3/w9')){
 let s=replace(fs.readFileSync(f,'utf8'));
 if(!f.endsWith('.css'))s=s.replace(/\b52\b/g,'56').replace(/SATURDAY · 43/g,'SATURDAY · 48');
 if(f.endsWith('/ui1.3/scoreboard.js'))s=s.replaceAll('2026-10-24','2026-10-31').replace('{"2026-10-20":2,"2026-10-21":2,"2026-10-22":2,"2026-10-23":3,"2026-10-31":43}', '{"2026-10-27":1,"2026-10-28":2,"2026-10-29":2,"2026-10-30":3,"2026-10-31":48}');
 s=s.replace('121 supplied W10 TEAM/OFF/DEF ratings loaded.', '121 retained v5.0.3 TEAM/OFF/DEF ratings loaded.');
 s=s.replace('WEEK 10 ROLLOVER: approved slate and approved W10 ratings only. Create a new session on this route. The Chairman link requires sign-in. Share COPY PUBLIC LINK for viewing.', 'WEEK 10: approved carriage with retained v5.0.3 ratings, engine and OT features. Create a new Week 10 session on this route. The Chairman link requires sign-in. Share COPY PUBLIC LINK for viewing.');
 write(replace(f),s);
}
for(const suffix of ['schema.sql','scheduler.sql']){
 let s=replace(fs.readFileSync(base+'/week9-'+suffix,'utf8')).replace(/\b52\b/g,'56');
 if(suffix==='schema.sql'){
  s=s.replace('insert into gamecast_v504_w10.operators select * from gamecast_v502_w8.operators;','insert into gamecast_v504_w10.operators select * from gamecast_v503_w9.operators;');
  const ids=/array\['G0406'.*?\]::text\[\]/gi;assert.equal([...s.matchAll(ids)].length,2);
  s=s.replace(ids,`array[${slate.map(g=>`'${g.id}'`).join(',')}]::text[]`);
  s=s.replace(/'W10-SLATE52\+RATINGS121\+CSV_dc8160bcfcb2429a\+V504'/g,`'${dataVersion}'`);
  // Append the new API schema to the actual role configuration at deployment.
  // Replacing this setting from a historical list would disable prior releases.
  s=s.replace(/alter role authenticator set pgrst\.db_schemas = .*?;/,()=>`do $$
declare schemas text;
begin
 select substring(setting from length('pgrst.db_schemas=')+1) into schemas
 from pg_roles r cross join lateral unnest(r.rolconfig) setting
 where r.rolname='authenticator' and setting like 'pgrst.db_schemas=%';
 if schemas is null then raise exception 'Existing API schemas must be verified before deployment'; end if;
 if not ('gamecast_v504_w10'=any(regexp_split_to_array(schemas, '[[:space:]]*,[[:space:]]*'))) then
  execute format('alter role authenticator set pgrst.db_schemas = %L', schemas || ', gamecast_v504_w10');
 end if;
end $$;`);
 }
 write(target+'/week10-'+suffix,s);
}
write(target+'/rollback.sql',replace(fs.readFileSync(base+'/rollback.sql','utf8')));
const manifest={week:'2026-W10',release:'5.0.4',baseRelease:'5.0.3',baseCommit:'17e3809730351301ae71cce5f127deb78c08bfec',dataVersion,sourceSha256:digest(target+'/ratings.csv'),ratingPolicy:'RETAIN_V503_EXACT_BYTES_NO_NEW_RATINGS',ratingRows:121,scheduledTeams:112,games:56,saturdayGames:48,conferenceGames:slate.filter(g=>g.conferenceGame).length,nonconferenceGames:slate.filter(g=>!g.conferenceGame).length,neutralGames:slate.filter(g=>g.neutral).map(g=>g.id),gameIds:slate.map(g=>g.id),carriageSha256:digest(target+'/chairman-carriage.tsv'),canonicalSha256:digest(target+'/canonical-week10.json'),sourceSchedule:'Chairman message: October 27–31, 2026 carriage',canonicalSource:'synthetic_CFB seud.games joined to seud.teams; read-only Week 10 query',approvedPollRole:'DISPLAY_ONLY_WEIGHT_ZERO',unresolvedDisplayNotes:slate.filter(g=>g.notes.includes('outstanding')).map(g=>g.id),venueMetadataBlocked:slate.filter(g=>g.venueId==='venue-undetermined').map(g=>g.id),productionActivation:'NOT_AUTHORIZED',deploymentStatus:'NOT_DEPLOYED'};
write(target+'/input-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
