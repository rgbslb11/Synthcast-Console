import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import {freshDeadman,arm as deadmanArm,disarm as deadmanDisarm,tick as deadmanTick,afterOperatorCommand} from '../../release-assets/gamecast-v4.4.1/deadman.mjs';
export const BASELINE_SHA='04eaca91b7cb8e842ebe2bde828ea3bf5d0872a34cd8ba070378e891626acd80';
export const baselinePath='supabase/functions/gamecast-week6-v4-4-1/index.ts';
export function baselineSource(){
 const source=fs.readFileSync(baselinePath,'utf8');
 if(createHash('sha256').update(source).digest('hex')!==BASELINE_SHA)throw Error('Verified 4.4.1 baseline hash mismatch');
 return source;
}
export function runtime(source,extra='',bindings={}){
 let code=source.replace(/^import .*;\s*$/gm,'');
 code=code.slice(0,code.indexOf('Deno.serve('));
 code+='\nglobalThis.gc={initialGame,seedWords,strategy,generatePlay,applyPlay,advanceGame,advancePeriod,finishPeriod,postTiming,total,reset,project,edge,performanceEdge,blankScores,FINALISH,SPEEDS'+(extra?','+extra:'')+'};';
 const context={crypto:globalThis.crypto,structuredClone,TextEncoder,Date,Math,Set,Object,Array,Number,String,RegExp,JSON,Error,TEAM_POWER:{},freshDeadman,deadmanArm,deadmanDisarm,deadmanTick,afterOperatorCommand,...bindings};
 vm.createContext(context);vm.runInContext(stripTypeScriptTypes(code),context,{timeout:10000});
 return context.gc;
}
export function requestHandler(source,client,bindings={}){
 let handler;
 const context={crypto:globalThis.crypto,structuredClone,TextEncoder,Date,Math,Set,Object,Array,Number,String,RegExp,JSON,Error,Request,Response,URL,TEAM_POWER:{},freshDeadman,deadmanArm,deadmanDisarm,deadmanTick,afterOperatorCommand,
  createClient:()=>client,Deno:{serve:fn=>{handler=fn;},env:{get:key=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-only-service-key'})[key]}},...bindings};
 vm.createContext(context);vm.runInContext(stripTypeScriptTypes(source.replace(/^import .*;\s*$/gm,'')),context,{timeout:10000});
 return handler;
}
export function game(gc,seed='GC442-FIX'){
 const g=gc.initialGame({id:'TEST',away:'Away',home:'Home',neutral:false});
 Object.assign(g,{seedHex:seed,rngState:gc.seedWords(seed,'TEST'),seedLocked:true,lifecycle:'ACTIVE',activity:'LIVE',auto:true,awayPower:{offense:80,defense:80,overall:80},homePower:{offense:80,defense:80,overall:80},powerReady:true,launchedAt:'2026-10-06T00:00:00.000Z'});
 if(gc.ensureOpeningToss)gc.ensureOpeningToss(g);
 return g;
}
export function leadingFourth(gc,{down=1,tos=0,clock=60,side=0,playClock=40}={}){
 const g=game(gc);Object.assign(g,{quarter:4,activePeriod:'4',period:'4th',scoreboardSeconds:clock,down,possession:side,playClockSeconds:playClock,awayTimeouts:side===1?tos:3,homeTimeouts:side===0?tos:3});
 g.scores['4']=side===0?[7,0]:[0,7];return g;
}
export function forcedKneel(g){return {team:g.possession,desc:'Quarterback kneel',yards:-1,points:0,turnover:false,punt:false,fg:false,first:false,inBounds:true,incomplete:false,playSec:2,remaining:2,runoffSec:0,deadSec:0,strategy:'KNEEL',phase:'PLAY',clockBefore:g.scoreboardSeconds,edgeAtSnap:0};}
export function footballKey(g){
 const strip=v=>Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['masterZulu','createdRunAt','completedAt','launchedAt','archivedAt'].includes(k)).map(([k,x])=>[k,strip(x)])):v;
 const {speed,...copy}=g;return JSON.stringify(strip(copy));
}
