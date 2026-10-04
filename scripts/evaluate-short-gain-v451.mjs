import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week6-v4-4-1/week6.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week6-v4-4-1/power.ts';
import * as dm from '../supabase/functions/gamecast-week6-v4-4-1/deadman.mjs';
const source=fs.readFileSync('supabase/functions/gamecast-week6-v4-4-1/index.ts','utf8');
const parentHashes=JSON.parse(fs.readFileSync('release-assets/gamecast-v4.5.1/parent-hashes.json'));
for(const[p,h]of Object.entries(parentHashes))assert.equal(createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,'Pinned deployed baseline '+p);
function engine(bonus,multiplier=4,hfa=.035){const c=vm.createContext({Date,console,crypto:globalThis.crypto,structuredClone,TextEncoder,Request,Response,URL,OPERATING_SLATE,TEAM_POWER,freshDeadman:dm.freshDeadman,deadmanArm:dm.arm,deadmanDisarm:dm.disarm,deadmanTick:dm.tick,afterOperatorCommand:dm.afterOperatorCommand,createClient:()=>({}),Deno:{env:{get:()=>''},serve:()=>{}}});const code=source.replace(/^import .*;\s*$/gm,'').replace('chainSustainMultiplier: 5.0','chainSustainMultiplier: '+bonus).replace('performanceEdgeMultiplier: 4.0','performanceEdgeMultiplier: '+multiplier).replace('t === 1 ? .035 : -.035','t === 1 ? '+hfa+' : -'+hfa);vm.runInContext(stripTypeScriptTypes(code)+'\nglobalThis.engine={initialGame,seedWords,advanceGame,total,edge};',c);return c.engine;}
const scenarios=[
 {name:'equal-neutral',away:70,home:70,neutral:true},
 {name:'equal-home-field',away:70,home:70,neutral:false},
 {name:'away-plus5-neutral',away:75,home:70,neutral:true},
 {name:'home-plus5-neutral',away:70,home:75,neutral:true},
 {name:'away-plus10-neutral',away:80,home:70,neutral:true},
 {name:'home-plus5-home-field',away:70,home:75,neutral:false}
];
function evaluate(en,scenario,n,seedPrefix){const {name,away,home,neutral}=scenario;let sumA=0,sumH=0,wA=0,shA=0,shH=0,blow=0,plays=0,gl=0;const margins=[];for(let i=0;i<n;i++){const g=en.initialGame(OPERATING_SLATE[0]);g.neutral=neutral;g.awayPower={overall:away,offense:away,defense:away};g.homePower={overall:home,offense:home,defense:home};g.seedHex=seedPrefix+'-'+i;g.rngState=en.seedWords(g.seedHex,g.id);g.lifecycle='ACTIVE';g.auto=true;en.advanceGame(g,21600);assert.equal(g.lifecycle,'FINAL_PENDING');for(const t of [0,1])assert.ok(Number.isFinite(en.total(g,t)));const a=en.total(g,0),h=en.total(g,1);sumA+=a;sumH+=h;wA+=a>h;shA+=a===0;shH+=h===0;blow+=Math.abs(a-h)>=28;plays+=g.teamPlayCount[0]+g.teamPlayCount[1];gl+=g.glSeconds;margins.push(a-h);}margins.sort((a,b)=>a-b);return {scenario:name,games:n,meanAway:sumA/n,meanHome:sumH/n,meanMargin:(sumA-sumH)/n,meanTotal:(sumA+sumH)/n,awayWins:wA,homeWins:n-wA,awayShutouts:shA,homeShutouts:shH,margins28plus:blow,meanPlays:plays/n,meanGLSeconds:gl/n,marginP10:margins[Math.floor(n*.1)],marginP90:margins[Math.floor(n*.9)]};}
const results=[];const phase=process.argv[2]||'selection';
const settings=phase==='selection'?[5,1,.5,.25,0].map(bonus=>({bonus,multiplier:4,hfa:.035})):[{bonus:5,multiplier:4,hfa:.035},{bonus:.5,multiplier:4,hfa:.035},{bonus:.5,multiplier:2,hfa:.035},{bonus:.5,multiplier:4,hfa:.0175}];
const n=phase==='selection'?300:1000;
for(const setting of settings){const en=engine(setting.bonus,setting.multiplier,setting.hfa);for(const scenario of scenarios){const row={...setting,...evaluate(en,scenario,n,'V451-'+phase)};results.push(row);console.log(JSON.stringify(row));}}
fs.mkdirSync('v451-evidence',{recursive:true});fs.writeFileSync('v451-evidence/'+phase+'.json',JSON.stringify({phase,perScenario:n,scenarios:scenarios.length,settings:settings.length,expectedGames:n*scenarios.length*settings.length,actualGames:results.reduce((s,r)=>s+r.games,0),results,diagnosticsOnly:'Multiplier and home-field variants are in-memory experiments, never release changes.',targets:'No approved numeric score/margin/upset target found; relative effects and variance are reported without claiming target attainment.'},null,2));
