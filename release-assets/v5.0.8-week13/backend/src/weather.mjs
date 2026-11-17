export const WEATHER_MODEL_VERSION = 'GC-WX-1.0.0';
export const WINDS = Object.freeze(['NONE','LIGHT','BREEZY','STRONG']);
export const RAINS = Object.freeze(['NONE','LIGHT','STEADY','HEAVY']);
export const TEMPERATURE_DISPLAY = Object.freeze(['INACTIVE','VERY_COLD','VERY_HOT']);

export const WEATHER_MODEL = Object.freeze({
  reference:{run:.50,completion:.60,fieldGoal:{short:.90,medium:.75,long:.50}},
  wind:{
    NONE:{runPp:0,completionPp:0,deepCompletionPp:0,deepIntOdds:1,fieldGoalPp:[0,0,0],puntMean:1,puntSd:1},
    LIGHT:{runPp:0,completionPp:0,deepCompletionPp:-.005,deepIntOdds:1,fieldGoalPp:[0,-.005,-.01],puntMean:1,puntSd:1},
    BREEZY:{runPp:.01,completionPp:-.0075,deepCompletionPp:-.015,deepIntOdds:1.08,fieldGoalPp:[0,-.02,-.04],puntMean:.99,puntSd:1.05},
    STRONG:{runPp:.03,completionPp:-.015,deepCompletionPp:-.035,deepIntOdds:1.18,fieldGoalPp:[-.01,-.04,-.08],puntMean:.97,puntSd:1.12},
  },
  rain:{
    NONE:{runPp:0,completionPp:0,fumbleOdds:1,explosivePassOdds:1},
    LIGHT:{runPp:.01,completionPp:-.005,fumbleOdds:1.05,explosivePassOdds:.98},
    STEADY:{runPp:.03,completionPp:-.015,fumbleOdds:1.15,explosivePassOdds:.94},
    HEAVY:{runPp:.05,completionPp:-.03,fumbleOdds:1.30,explosivePassOdds:.88},
  },
  caps:{runPp:.07,completionPp:-.07,fumbleOdds:1.5,deepIntOdds:1.25,explosivePassOdds:.75,fieldGoalPp:[-.02,-.07,-.12],puntMean:.95,puntSd:1.15},
});

const clamp=(lo,v,hi)=>Math.max(lo,Math.min(v,hi));
const canonical=x=>JSON.stringify(x,Object.keys(x).sort());
const sha256=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');

export function freshWeather(){return {enabled:false,wind:'NONE',rain:'NONE',temperature:'INACTIVE',locked:false,lockedAtZulu:null,snapshotId:null,modelVersion:WEATHER_MODEL_VERSION};}
export function validateWeather(input){
  const enabled=input?.enabled===true,wind=String(input?.wind??'NONE').toUpperCase(),rain=String(input?.rain??'NONE').toUpperCase();
  const temperature=String(input?.temperature??'INACTIVE').toUpperCase();
  if(!WINDS.includes(wind))throw Error('wind must be NONE, LIGHT, BREEZY, or STRONG');
  if(!RAINS.includes(rain))throw Error('rain must be NONE, LIGHT, STEADY, or HEAVY');
  if(!TEMPERATURE_DISPLAY.includes(temperature))throw Error('temperature must be INACTIVE, VERY_COLD, or VERY_HOT');
  return {enabled,wind,rain,temperature};
}
export function setWeather(g,input){
  if(g.lifecycle!=='UNLAUNCHED'||g.weather?.locked)throw Error('Weather can only be changed before Launch');
  g.weather={...freshWeather(),...validateWeather(input)};return structuredClone(g.weather);
}
export async function lockWeather(g,stamp){
  if(g.weather?.locked)return g.weather;
  const config=validateWeather(g.weather||freshWeather());
  const snapshotId=await sha256(canonical({modelVersion:WEATHER_MODEL_VERSION,...config}));
  g.weather={...config,locked:true,lockedAtZulu:stamp,snapshotId,modelVersion:WEATHER_MODEL_VERSION};return g.weather;
}
export function additiveProbability(p,delta,reference){
  if(![p,delta,reference].every(Number.isFinite)||p<0||p>1||reference<=0||reference>=1)throw Error('invalid additive probability input');
  if(reference+delta<=0||reference+delta>=1)throw Error('invalid additive probability target');
  if(p===0||p===1||delta===0)return p;
  const target=reference+delta;
  const logit=x=>Math.log(x/(1-x));return 1/(1+Math.exp(-(logit(p)+logit(target)-logit(reference))));
}
export function oddsProbability(p,multiplier){
  if(!Number.isFinite(p)||p<0||p>1||!Number.isFinite(multiplier)||multiplier<0)throw Error('invalid odds probability input');
  if(p===0||p===1||multiplier===1)return p;return multiplier*p/(1-p+multiplier*p);
}
export function effectiveWeather(wx){
  if(!wx?.enabled)return {active:false,runPp:0,completionPp:0,deepCompletionPp:0,deepIntOdds:1,fumbleOdds:1,explosivePassOdds:1,fieldGoalPp:[0,0,0],puntMean:1,puntSd:1};
  const w=WEATHER_MODEL.wind[wx.wind]||WEATHER_MODEL.wind.NONE,r=WEATHER_MODEL.rain[wx.rain]||WEATHER_MODEL.rain.NONE,c=WEATHER_MODEL.caps;
  return {active:true,runPp:Math.min(c.runPp,w.runPp+r.runPp),completionPp:Math.max(c.completionPp,w.completionPp+r.completionPp),deepCompletionPp:w.deepCompletionPp,deepIntOdds:Math.min(c.deepIntOdds,w.deepIntOdds),fumbleOdds:Math.min(c.fumbleOdds,r.fumbleOdds),explosivePassOdds:Math.max(c.explosivePassOdds,r.explosivePassOdds),fieldGoalPp:w.fieldGoalPp.map((x,i)=>Math.max(c.fieldGoalPp[i],x)),puntMean:Math.max(c.puntMean,w.puntMean),puntSd:Math.min(c.puntSd,w.puntSd)};
}
export function weatherPassRate(passRate,wx){const e=effectiveWeather(wx);return e.active&&e.runPp!==0?1-additiveProbability(1-passRate,e.runPp,WEATHER_MODEL.reference.run):passRate;}
export function weatherCompletion(p,wx,deep=false){const e=effectiveWeather(wx),delta=Math.max(WEATHER_MODEL.caps.completionPp,e.completionPp+(deep?e.deepCompletionPp:0));return e.active?additiveProbability(p,delta,WEATHER_MODEL.reference.completion):p;}
export function weatherInterception(p,wx,deep=false){const e=effectiveWeather(wx);return e.active&&deep?oddsProbability(p,e.deepIntOdds):p;}
export function weatherFumble(p,wx){const e=effectiveWeather(wx);return e.active?oddsProbability(p,e.fumbleOdds):p;}
export function weatherExplosivePass(p,wx){const e=effectiveWeather(wx);return e.active?oddsProbability(p,e.explosivePassOdds):p;}
export function weatherFieldGoal(p,distance,wx){const e=effectiveWeather(wx);if(!e.active)return p;const i=distance<40?0:distance<50?1:2;return additiveProbability(p,e.fieldGoalPp[i],WEATHER_MODEL.reference.fieldGoal[['short','medium','long'][i]]);}
export function weatherPunt(rawNet,wx){const e=effectiveWeather(wx);if(!e.active)return rawNet;return clamp(20,Math.round(41*e.puntMean+(rawNet-41)*e.puntSd),60);}

// Domain-separated classifier: it never consumes or mutates the football RNG.
export function deepPassIntent(g,probability){
  const s=`${g.seedHex}|${g.id}|${g.runId}|${g.teamPlayCount?.[g.possession]||0}|WX_DEEP_V1`;let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  return h/4294967296<clamp(0,probability,1);
}
export function weatherAudit(wx,values={}){return {modelVersion:WEATHER_MODEL_VERSION,snapshotId:wx?.snapshotId??null,enabled:wx?.enabled===true,wind:wx?.wind??'NONE',rain:wx?.rain??'NONE',temperature:wx?.temperature??'INACTIVE',...values};}


