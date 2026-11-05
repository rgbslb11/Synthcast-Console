import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderGameStats,wpPanel} from '../../public/v5.1.0/review/detail-view.mjs';
import {wpColor} from '../../public/v5.1.0/review/model.mjs';
const f=JSON.parse(fs.readFileSync('public/v5.1.0/review/fixtures/stats.json'));
const w=JSON.parse(fs.readFileSync('public/v5.1.0/review/fixtures/wp.json'));
const options={id:'G9001',game:f.games[0],data:f.responses.G9001,games:f.games,allData:new Map(Object.entries(f.responses)),mode:'fixture',tab:'overview',historical:null,drive:'all',wpCase:'live',wpCases:Object.keys(w.fixtures),wpResponse:w.fixtures.live,contract:f.contract};
const renderers={lineScore:()=>'<table class="line-score"></table>',stats:()=>'<table class="team-stats"></table>',field:()=>'<div class="field"></div>',scoring:()=>'<table class="scoring"></table>'};
test('favorite color follows Chairman threshold; blocking overrides every numeric value',()=>{
 for(const p of [0.5,0.50001,1])assert.equal(wpColor(p,'ESTIMATED'),'#000000');
 for(const p of [0,0.1,0.49999])assert.equal(wpColor(p,'ESTIMATED'),'#D71A20');
 for(const p of [null,undefined,NaN,-1,2])assert.equal(wpColor(p,'ESTIMATED'),'#808080');
 assert.equal(wpColor(0.9,'BLOCKED'),'#808080');
});
test('reference structure has game bank, four overview widgets and exactly four merged tabs',()=>{
 const html=renderGameStats(options,renderers);
 for(const name of ['game-bank','score-band','CURRENT DRIVE','LIVE WIN PROBABILITY','KEY TEAM STATS','SCORING SUMMARY'])assert.ok(html.includes(name));
 assert.equal((html.match(/role="tab"/g)??[]).length,4);
 assert.match(html,/Play-by-Play \/ Drives/);assert.doesNotMatch(html,/<img|Line:|O\/U/);
});
test('combined drive filtering uses supplied playSequences without reconstructing a drive',()=>{
 const data=structuredClone(options.data);data.possessions=[{...data.possessions[0],playSequences:[2]}];
 const html=renderGameStats({...options,data,tab:'plays',drive:'1',historical:2},renderers);
 assert.doesNotMatch(html,/data-play="1"/);assert.match(html,/data-play="2"/);
 assert.equal((html.match(/<dt>/g)??[]).length,22);
 assert.equal(data.possessions[0].offensiveYards,10); // The supplied rollup is not recalculated from the filtered page.
});
test('WP rejects another game/run/revision and never assigns its probability to the selected game',()=>{
 for(const patch of [{gameId:'G9999'},{runId:'another-run'},{sessionId:'another-session'},{stateVersion:2}]){
  const response={...w.fixtures.live,summary:{...w.fixtures.live.summary,...patch}};
  const html=wpPanel({response,data:options.data,mode:'live',wpCase:'live',wpCases:[]});
  assert.doesNotMatch(html,/40\.0%/);assert.match(html,/Unavailable|WP_SOURCE_PENDING/);
 }
});
test('current WP and frozen prior are distinct; gaps retained and missing prior stays unavailable',()=>{
 const args={response:w.fixtures.live,data:options.data,mode:'fixture',wpCase:'live',wpCases:options.wpCases};
 let html=wpPanel(args);assert.match(html,/40\.0%/);assert.match(html,/60\.0%/);assert.match(html,/wp-above/);assert.match(html,/wp-below/);
 const response=structuredClone(w.fixtures.live);response.points=response.points.filter(p=>p.kind!=='pregame'&&p.status!=='PREGAME');html=wpPanel({...args,response});assert.doesNotMatch(html,/class="prior-ring"/);
});
test('server block clears the detail layout even when a malicious envelope includes old data',()=>{
 const html=renderGameStats({...options,data:{...options.data,availability:{status:'BLOCKED',reason:'CHAIRMAN_CORRECTION'}}},renderers);
 for(const forbidden of ['class="score-band"','class="overview-grid"','class="wp-value"','class="play-attributes"'])assert.equal(html.includes(forbidden),false);
 assert.match(html,/CHAIRMAN_CORRECTION/);
});
test('entering-game records are rendered only from supplied authoritative fields',()=>{
 const data=structuredClone(options.data);data.scoreboard.awayTeamAndRecords.record='4-1';
 const html=renderGameStats({...options,data},renderers);assert.match(html,/4-1/);assert.match(html,/Record unavailable/);
});

test('desktop field uses authoritative coordinates, mirrored yard labels and text end zones',async()=>{
 const {desktopField}=await import('../../public/v5.1.0/review/desktop-field.mjs');
 const data=structuredClone(options.data);data.field={possession:0,ball:38,lineOfScrimmage:38,lineToGain:44,down:2,distance:6};
 const before=JSON.stringify(data),html=desktopField(data);
 assert.match(html,/class="turf-ball" cx="480"/);
 assert.match(html,/class="turf-scrimmage" x1="480"/);
 assert.match(html,/class="turf-gain" x1="540"/);
 assert.match(html,/Example Away 1/);assert.match(html,/Example Home 1/);
 assert.equal((html.match(/>50<\/text>/g)??[]).length,2);
 assert.equal((html.match(/>10<\/text>/g)??[]).length,4);
 assert.equal(JSON.stringify(data),before);
 assert.doesNotMatch(html,/<img/);
});
test('desktop field never positions missing/invalid coordinates at zero; blocking clears turf',async()=>{
 const {desktopField}=await import('../../public/v5.1.0/review/desktop-field.mjs');
 const data=structuredClone(options.data);
 for(const value of [null,undefined,NaN,-1,101,'38']){
  data.field={possession:0,ball:value,lineOfScrimmage:value,lineToGain:value};
  const html=desktopField(data);assert.doesNotMatch(html,/class="turf-(ball|scrimmage|gain)"/);assert.match(html,/unavailable/);
 }
 data.field={availability:{status:'BLOCKED',reason:'OT_FIELD_UNAVAILABLE'},ball:38};
 assert.doesNotMatch(desktopField(data),/<svg/);assert.match(desktopField(data),/OT_FIELD_UNAVAILABLE/);
});
test('historical desktop field uses supplied pre-snap coordinates and never infers line to gain',async()=>{
 const {desktopField}=await import('../../public/v5.1.0/review/desktop-field.mjs');
 const html=desktopField(options.data,{sequence:2,possessingTeam:0,preFieldPosition:25,preDown:1,preDistance:10});
 assert.match(html,/class="turf-ball" cx="350"/);assert.doesNotMatch(html,/class="turf-gain"/);assert.match(html,/Historical play 2/);
});
