import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='release-assets/v5.0.8-week13',base='release-assets/v5.0.7-week12-operating';
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
const json=(p,o)=>write(p,JSON.stringify(o,null,2)+'\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const csvRows=(text,sep=',')=>{const [header,...lines]=text.trimEnd().split(/\r?\n/).map(x=>x.split(sep));return lines.map(a=>Object.fromEntries(header.map((k,i)=>[k,a[i]??''])));};
// Chairman attached the approved post-W12 ratings and confirmed Eastern.
const ratings=csvRows(read(root+'/approved-ratings.csv'));
assert.equal(ratings.length,121);assert.equal(new Set(ratings.map(x=>x.team_id)).size,121);
assert.equal(hash(read(root+'/approved-ratings.csv')),'d69662d7ac62554f770ddea65cee3646830ae4e3f28e5c72c9984b211f345ac4');
assert.ok(ratings.every(r=>['W13_READY_POST_W12_STATE','W13_COLD_START_READY_SEPARATE_REPORT'].includes(r.week13_status)));
const session=JSON.parse(read(root+'/operating-session.json'));assert.match(session.publicSlug,/^w13v508-[a-f0-9]{16}$/);
for(const r of ratings)for(const k of ['gamecast_team','gamecast_offense','gamecast_defense'])assert.ok(Number.isInteger(+r[k])&&+r[k]>=60&&+r[k]<=99,r.team+':'+k);
const rows=csvRows(read(root+'/chairman-carriage.tsv'),'\t');
assert.equal(rows.length,59);
const canonical=JSON.parse(read(root+'/canonical-week13-source.json')).rows;
assert.equal(canonical.length,59);assert.equal(new Set(canonical.map(g=>g.game_id)).size,59);
const codeId=c=>'team-'+c.toLowerCase().replace('&','-');
const powerByCode=Object.fromEntries(ratings.map(r=>[r.team_id,r]));
const kickoffZulu=(date,label)=>{
 const m=(label==='Noon'?'12:00 PM':label).match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);assert.ok(m,label);
 const [year,month,day]=date.split('-').map(Number),hour=+m[1]%12+(m[3]==='PM'?12:0);
 // New York is UTC-05 throughout November 17-21, after the DST transition.
 const d=new Date(Date.UTC(year,month-1,day,hour+5,+m[2]));
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
 assert.equal(`${parts.year}-${parts.month}-${parts.day}`,date);assert.equal(+parts.hour,hour);assert.equal(+parts.minute,+m[2]);
 return d.toISOString().replace('.000Z','Z');
};
const slate=rows.map((r,i)=>{
 const found=canonical.filter(g=>g.away_id===codeId(r.awayCode)&&g.home_id===codeId(r.homeCode));assert.equal(found.length,1,r.awayCode+' at '+r.homeCode);
 const g=found[0],away=powerByCode[r.awayCode],home=powerByCode[r.homeCode];assert.ok(away&&home);assert.equal(g.neutral_site,'false');
 const dow=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(r.date+'T12:00:00Z'));
 for(const k of ['awayRecord','homeRecord'])assert.match(r[k],/^\d+-\d+$/);
 for(const k of ['awayConferenceRecord','homeConferenceRecord'])if(r[k])assert.match(r[k],/^\d+-\d+$/);
 for(const k of ['awayRank','homeRank'])if(r[k])assert.ok(+r[k]>=1&&+r[k]<=25);
 return {id:g.game_id,date:r.date,dateLabel:`${dow} ${+r.date.slice(5,7)}/${+r.date.slice(8)}`,kickoff:r.kickoff,network:r.network,matchup:away.team+' at '+home.team,away:away.team,home:home.team,awayCode:r.awayCode,homeCode:r.homeCode,kickoffOrder:i+1,carriageOrder:i+1,canonicalWeek:'W13',kickoffTimeZone:'America/New_York',kickoffZulu:kickoffZulu(r.date,r.kickoff),neutral:false,venueDesignation:'HOME',venueId:g.venue_id,venueStatus:g.venue_id==='venue-undetermined'?'BLOCKED_CANONICAL_VENUE_UNDETERMINED':'CANONICAL_VENUE_ID_ONLY_ADDRESS_NOT_VERIFIED',conferenceGame:g.conference_game==='true',qaOnly:false,identityStatus:'CANONICAL_ID_VERIFIED',scheduleRevision:'W13-CHAIRMAN-2026-11-16',scheduleStatus:'CHAIRMAN_APPROVED',awayRecord:r.awayRecord,homeRecord:r.homeRecord,awayConferenceRecord:r.awayConferenceRecord||null,homeConferenceRecord:r.homeConferenceRecord||null,awayRank:r.awayRank?+r.awayRank:null,homeRank:r.homeRank?+r.homeRank:null};
});
assert.equal(new Set(slate.map(g=>g.id)).size,59);
assert.deepEqual(slate.map(g=>g.id).sort(),canonical.map(g=>g.game_id).sort());
assert.equal(new Set(rows.flatMap(g=>[g.awayCode,g.homeCode])).size,118);
const dates=slate.reduce((o,g)=>(o[g.date]=(o[g.date]??0)+1,o),{});
assert.deepEqual(dates,{'2026-11-17':1,'2026-11-18':1,'2026-11-19':3,'2026-11-20':6,'2026-11-21':48});
assert.equal(rows.flatMap(g=>[g.awayRank,g.homeRank]).filter(Boolean).length,25);
assert.equal(new Set(rows.flatMap(g=>[g.awayRank,g.homeRank]).filter(Boolean)).size,25);
for(let i=1;i<slate.length;i++)assert.ok(Date.parse(slate[i].kickoffZulu)>=Date.parse(slate[i-1].kickoffZulu));
json(root+'/slate.json',slate);write(root+'/ratings.csv',read(root+'/approved-ratings.csv'));
const bind=s=>s.replaceAll('GC-W12-V5.0.7-RC1','GC-W13-V5.0.8-RC1').replaceAll('2026-W12','2026-W13').replaceAll('w12v507-','w13v508-').replaceAll('V507','V508').replaceAll('gamecast_v507_w12','gamecast_v508_w13').replaceAll('gamecast_v507_week12','gamecast_v508_week13').replaceAll('gc507_w12_rpc','gc508_w13_rpc').replaceAll('gamecast-week12-v5-0-7','gamecast-week13-v5-0-8').replaceAll('week12.mjs','week13.mjs').replaceAll('W12_OPERATOR','W13_OPERATOR').replaceAll('/v5.0.7/w12/','/v5.0.8/w13/');
for(const f of walk(base+'/backend')){
 const rel=f.slice((base+'/backend/').length);if(['runtime/week12.mjs','runtime/power.mjs'].includes(rel))continue;
 let s=bind(read(f));
 if(rel==='runtime/engine.mjs')s=s.replace(/const DATA_VERSION = "[^"]+";/,`const DATA_VERSION = "W13-CANONICAL59+CHAIRMAN_RATINGS121_POST_W12+CSV_${hash(read(root+'/ratings.csv')).slice(0,16)}+V508_PUNT_TOUCHBACK";`);
 if(rel==='security/security-core.mjs')s=s.replace(/export const ACTIVE_GAME_IDS=Object.freeze\([^\n]+\);/,'export const ACTIVE_GAME_IDS=Object.freeze('+JSON.stringify(slate.map(g=>g.id))+');').replaceAll('!==60','!==59');
 if(rel==='security/edge-boundaries.mjs')s=s.replaceAll('games:60','games:59');
 if(rel==='src/release-runtime.mjs')s=s.replace('state.length===60','state.length===59');
 if(rel==='src/engine-operations.mjs')s=s.replace('ids.length>60','ids.length>59').replace('activeGames:60','activeGames:59');
 if(rel==='src/database-store.mjs')s=s.replace('state.length!==60','state.length!==59').replaceAll('games:60','games:59');
 if(rel==='src/scheduler-runner.mjs')s=s.replace('60 active slots','59 active slots');
 write(root+'/backend/'+rel,s);
}
write(root+'/backend/runtime/week13.mjs','// Chairman-provided Week 13 carriage reconciled to canonical identities.\nexport const OPERATING_SLATE = '+JSON.stringify(slate,null,2)+';\n');
// Direct approved CSV mapping; no recomputation or blending.
const sourceVersion='W13-CHAIRMAN-APPROVED-POST-W12-2026-11-16';
const powers=Object.fromEntries(ratings.map(r=>[r.team,{overall:+r.gamecast_team,offense:+r.gamecast_offense,defense:+r.gamecast_defense,specialTeams:null,tempo:null,sourceVersion,flag:null,opponentBasis:null}]));
write(root+'/backend/runtime/power.mjs','export const POWER_SOURCE_VERSION='+JSON.stringify(sourceVersion)+';\nexport const SCHEDULED_TEAM_COUNT=118;\nexport const TEAM_POWER = '+JSON.stringify(powers,null,2)+';\n');
let sql=bind(read(base+'/week12-schema.sql')).replaceAll('Week 12','Week 13').replaceAll('week12','week13').replaceAll('5.0.7 Week','5.0.8 Week').replace(/\b60\b/g,'59');
sql=sql.replace(/array\['G0568'[^\n]+?\]::text\[\]/g,'array['+slate.map(g=>"'"+g.id+"'").join(',')+']::text[]');
const data=read(root+'/backend/runtime/engine.mjs').match(/const DATA_VERSION = "([^"]+)"/)[1];
sql=sql.replace(/if p_data_version <> '[^']+'/ ,"if p_data_version <> '"+data+"'");
assert.ok(sql.includes("array['"+slate[0].id+"'"));
assert.ok(!sql.includes('gamecast_v507_'));assert.ok(sql.includes('gamecast_v506_w11.authorize_operator'));
write(root+'/week13-schema.sql','begin;\n'+sql+'\ncommit;\n');
write(root+'/rollback.sql',bind(read(base+'/rollback.sql')));
for(const f of walk('public/v5.0.7.1/w12')){
 const rel=f.slice('public/v5.0.7.1/w12/'.length);
 let s=bind(read(f)).replaceAll('5.0.7.1','5.0.8').replaceAll('5.0.7','5.0.8').replaceAll('synthcastGameCast507','synthcastGameCast508').replaceAll('GAMECAST_V508_CONFIG','GAMECAST_V508_CONFIG').replaceAll('W12Session','W13Session').replaceAll('WEEK 12','WEEK 13').replaceAll('Week 12','Week 13').replaceAll('W12 ·','W13 ·').replaceAll('ALL · 60','ALL · 59').replaceAll('SILENT FALL · REVISED CARRIAGE','SEUD IMPORT ON HOLD').replaceAll('60 GAMES','59 GAMES').replaceAll('60 games','59 games').replaceAll('FULL WEEK · 60','FULL WEEK · 59').replaceAll('SATURDAY · 49','SATURDAY · 48');
 // A new week has independent session storage and no hardcoded Week 12 board.
 s=s.replaceAll("'w13v508-506ff58ba0cfb7a5'",JSON.stringify(session.publicSlug));
 if(rel==='auth-api.js')s=s.replace("    if(action==='create')throw Error('Continue the existing Week 13 session on this route');\n",'').replaceAll('!==60','!==59');
 if(rel==='index.html')s=s.replace('122 final Chairman-approved W12 TEAM/OFF/DEF ratings loaded. All 59 games are POWER READY. Ratings are frozen to the approved input.','121 Chairman-approved post-Week 12 TEAM/OFF/DEF ratings loaded for Week 13. All 59 games are POWER READY. Ratings are frozen to the approved input.').replace('WEEK 13: approved carriage and final Chairman-approved ratings.','WEEK 13: Chairman-approved carriage and post-Week 12 ratings. Kickoffs are Eastern Time.');
 if(rel==='app.js')s=s.replaceAll("+'/60'","+'/59'").replaceAll('active_games??60','active_games??59');
 if(rel==='ui1.3/scoreboard.js')s=s.replaceAll('expected:60','expected:59').replaceAll('2026-11-14','2026-11-21').replace(/const expected=\{[^\n]+\};/,'const expected='+JSON.stringify(dates)+';');
 write('public/v5.0.8/w13/'+rel,s);
}
const priorByCode=Object.fromEntries(csvRows(read(base+'/ratings.csv')).map(r=>[r.team_id,r]));
const ratingChanges=ratings.map(r=>{const prior=priorByCode[r.team_id];assert.ok(prior);return {teamId:r.team_id,team:r.team,prior:[+prior.gamecast_team,+prior.gamecast_offense,+prior.gamecast_defense],approved:[+r.gamecast_team,+r.gamecast_offense,+r.gamecast_defense]};});
json(root+'/ratings-review.json',{status:'CHAIRMAN_APPROVED_ATTACHED_SOURCE',activeSource:'Exact attached Week12_GAMECAST_Ratings_POST_W12_121_R1(1).csv',sourceLibraryId:'libfile_00ce5821c2d881919f99986b94853857',sha256:hash(read(root+'/approved-ratings.csv')),reviewed:ratingChanges.length,changed:ratingChanges.filter(r=>JSON.stringify(r.prior)!==JSON.stringify(r.approved)).length,omittedOffSlatePriorRows:['ULL'],rows:ratingChanges});
json(root+'/input-manifest.json',{baselineCommit:'538ea025efec5c4d517b7449c8b4d66169060b17',baselineEngine:'GC-W12-V5.0.7-RC1',baselineDeployedSource:'Verified 14 matching Chairman bundle files; evidence/baseline-provenance.json',engineVersion:'GC-W13-V5.0.8-RC1',week:'2026-W13',scheduleSource:'Chairman message: Deployment 5.0.8 - Week 13',kickoffTimeZone:'America/New_York',timeZoneStatus:'EXPLICITLY_CONFIRMED_BY_CHAIRMAN',games:59,participants:118,canonicalIds:59,ratingRecords:121,ratingValues:363,ratingsSha256:hash(read(root+'/ratings.csv')),ratingSourceLibraryId:'libfile_00ce5821c2d881919f99986b94853857',slateSha256:hash(read(root+'/slate.json')),carriageSha256:hash(read(root+'/chairman-carriage.tsv')),dates,rankedTeams:25,ratingSelection:'APPROVED: attached post-W12 ratings for Week 13',deploymentAuthorization:'Chairman Week 13 deployment request plus attached ratings and Eastern confirmation',defaultWrites:false,defaultCron:false,newArms:0,publicSlug:session.publicSlug,physicalMobileSafari:'NOT TESTED',venueExceptions:[{id:'G0649',status:'BLOCKED: canonical venue-undetermined; away/home designation confirmed'}]});
const table=['# Week 13 schedule reconciliation','','59/59 Chairman rows = 59 canonical games = 118 distinct participants. Kickoffs confirmed by the Chairman as Eastern (America/New_York). All records, conference records and 25 ranks are retained as schedule metadata. Existing UI behavior is preserved.','','| Row | ID | Matchup | Date | Kickoff ET | UTC | Network |','| --- | --- | --- | --- | --- | --- | --- |',...slate.map((g,i)=>`| ${i+1} | ${g.id} | ${g.matchup} | ${g.date} | ${g.kickoff} | ${g.kickoffZulu} | ${g.network} |`),'','Canonical locked-v5 dates are generic Saturday dates. The supplied Chairman carriage explicitly supersedes dates for all 11 Tue–Fri games. Canonical identities, home designation and conference classifications are retained. G0649 venue ID is undetermined in the canonical source; no stadium/address was inferred.'];
write(root+'/RECONCILIATION.md',table.join('\n')+'\n');
console.log(JSON.stringify({status:'PASS',games:59,participants:118,dates,rankedTeams:25,ratingSelection:'APPROVED_ATTACHED_POST_W12',deploymentAuthorization:'APPROVED'}));
