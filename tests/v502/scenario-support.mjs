import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sourceURL=new URL('../../release-assets/v5.0.2-week8/backend/runtime/engine.mjs',import.meta.url);
let source=fs.readFileSync(sourceURL,'utf8').replace(/from '([^']+)'/g,(_,p)=>`from '${new URL(p,sourceURL).href}'`);
source+='\nexport {protectLateLead as qaLead,situationalPassRate as qaPassRate,prioritizeFieldGoal as qaKick,canSafelyKneel,fourthGo};';
const E=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
export const engines={A:E,B:E,C:E,D:E};
export {OPERATING_SLATE as slate} from '../../release-assets/v5.0.2-week8/backend/runtime/week8.mjs';
export function start(M,s,k){const g=M.initialGame(s),h=createHash('sha256').update('GC502-QA-20261015|'+s.id+'|'+k).digest('hex').slice(0,32);Object.assign(g,{seedHex:h,rngState:M.seedWords(h,s.id),qaOnly:true,auto:true,lifecycle:'ACTIVE',activity:'LIVE',speed:1});M.ensureOpeningToss(g);return g;}
export const clean=g=>g;
