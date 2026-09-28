import fs from 'node:fs';
import assert from 'node:assert/strict';
import {OPERATING_SLATE as old} from '../supabase/functions/gamecast-week6-v4-4-0/week6.ts';
import {OPERATING_SLATE as slate} from '../supabase/functions/gamecast-week6-v4-4-1/week6.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week6-v4-4-1/power.ts';
const read=p=>fs.readFileSync(p,'utf8');
assert.equal(slate.length,56);assert.equal(Object.keys(TEAM_POWER).length,121);
for(let i=0;i<56;i++){
 const {kickoffZulu,tvStartZulu,...g}=slate[i];assert.deepEqual(g,old[i]);assert.equal(tvStartZulu,null);
 assert.ok(Number.isFinite(Date.parse(kickoffZulu)));
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(kickoffZulu));const v=k=>p.find(x=>x.type===k)?.value;
 assert.equal(`${v('year')}-${v('month')}-${v('day')}`,g.date);assert.equal(`${v('hour')}:${v('minute')} ${v('dayPeriod')}`,g.kickoff);
}
assert.equal(read('supabase/functions/gamecast-week6-v4-4-1/power.ts'),read('supabase/functions/gamecast-week6-v4-4-0/power.ts'));
const baseline=read('supabase/functions/gamecast-week6-v4-4-0/index.ts'),candidate=read('supabase/functions/gamecast-week6-v4-4-1/index.ts');
for(const [a,b]of [['const CAL =','const cors ='],['function seedWords','function initialGame'],['function score(','function publicGame'],['const confirmReq','Deno.serve']])assert.ok(candidate.includes(baseline.slice(baseline.indexOf(a),baseline.indexOf(b))),a);
const ratings=JSON.parse(read('release-assets/gamecast-v4.4.0/approved-team-ratings.json'));
for(const r of ratings)assert.deepEqual([TEAM_POWER[r.Team].overall,TEAM_POWER[r.Team].offense,TEAM_POWER[r.Team].defense],[r.TEAM,r.OFF,r.DEF]);
let app=read('public/v4.4.1/app.js'),helpers=read('release-assets/gamecast-v4.4.1/ui.js');assert.ok(app.startsWith(helpers+'\n'));app=app.slice(helpers.length+1);
for(const[a,b]of [["+run+ctl+dmCard(g)+'</article>'","+run+ctl+'</article>'"],['function anchorMaster(x){dmLastSync=Date.now();','function anchorMaster(x){'],["||card.querySelector('.dm-box details[open]')",''],["||!!document.querySelector('#grid .dm-box details[open]')",''],['gamecast-week6-v4-4-1','gamecast-week6-v4-4-0'],['synthcastGameCast441Operator','synthcastGameCast440Operator'],['GC-W6-V4.4.1-RC1','GC-W6-V4.4.0-RC1']]){assert.ok(app.includes(a),a);app=app.replaceAll(a,b);}
assert.equal(app,read('public/v4.4.0/app.js'));
assert.equal(read('supabase/functions/gamecast-week6-v4-4-1/deadman.mjs'),read('release-assets/gamecast-v4.4.1/deadman.mjs'));
const r={status:'PASS',games:56,appearances:112,scheduledRatings:336,canonicalTeams:121,canonicalRatings:363,allWeek6MetadataUnchanged:true,allUTCConversions:true,powerBytesUnchanged:true,footballBlocksUnchanged:true,frontendInverseEquality:true};
fs.writeFileSync('v441-evidence/source-verification.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
