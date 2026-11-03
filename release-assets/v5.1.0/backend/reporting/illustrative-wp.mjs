/** GC-WP-ILLUSTRATIVE-0.1.0. Pure observer: no RNG, clock reads, I/O or football writes. */
export const MODEL = Object.freeze({id:'GC-WP-ILLUSTRATIVE-0.1.0', slope:0.14, endScale:2});
const finite=(x,n)=>{if(!Number.isFinite(x))throw new TypeError(`${n} must be finite`);return x;};
const requireId=(x,n)=>{if(typeof x!=='string'||!x.trim()||x!==x.trim())throw new TypeError(`${n} required`);};
function validate(s){
 for(const k of ['gameId','runId','eventId','favoriteTeamId','otherTeamId'])requireId(s[k],k);
 if(s.favoriteTeamId===s.otherTeamId)throw new Error('Teams must differ');
 for(const k of ['sequence','stateRevision','favoriteScore','otherScore']){
  finite(s[k],k);if(!Number.isInteger(s[k])||s[k]<0)throw new Error(`${k} must be a nonnegative integer`);
 }
 finite(s.pregameMargin,'pregameMargin');if(s.pregameMargin<0)throw new Error('Favorite margin must be nonnegative');
 if(!['kickoff','possession_end','timeout_fixture','correction','final'].includes(s.kind))throw new Error('Unknown event kind');
 if(s.possessionTeamId!==null && ![s.favoriteTeamId,s.otherTeamId].includes(s.possessionTeamId))throw new Error('Invalid possession team');
}
export function sigmoid(z){return z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));}
/** Proposed linear field-value extension through the tutorial anchors; not fitted EP. */
export function fieldValue(y){
 finite(y,'yardsToGoal');if(y<0||y>100)throw new Error('yardsToGoal out of range');
 const anchors=[[0,5],[25,4],[50,3],[75,2],[100,1]];
 for(let i=1;i<anchors.length;i++)if(y<=anchors[i][0]){
  const [x0,v0]=anchors[i-1],[x1,v1]=anchors[i];return v0+(v1-v0)*(y-x0)/(x1-x0);
 }
}
export function calculate(s){
 validate(s);
 // Validate terminal and OT states too; a final flag cannot bypass integrity.
 if(!([1,2,3,4].includes(s.period)||/^(OT|[2-9]OT|[1-9][0-9]+OT)$/.test(s.period)))throw new Error('Invalid period');
 if(![600,900].includes(s.quarterSeconds)||!Number.isFinite(s.clockSeconds)||s.clockSeconds<0||s.clockSeconds>s.quarterSeconds)throw new Error('Invalid football clock');
 const key=JSON.stringify([s.gameId,s.runId,s.eventId,s.stateRevision,MODEL.id]);
 const base={key,modelId:MODEL.id,gameId:s.gameId,runId:s.runId,eventId:s.eventId,
 sequence:s.sequence,stateRevision:s.stateRevision,kind:s.kind,favoriteTeamId:s.favoriteTeamId,
 otherTeamId:s.otherTeamId,period:s.period,clockSeconds:s.clockSeconds,quarterSeconds:s.quarterSeconds,
 favoriteScore:s.favoriteScore,otherScore:s.otherScore,pregameMargin:s.pregameMargin,
 possessionTeamId:s.possessionTeamId,yardsToGoal:s.yardsToGoal??null,
 sourceTimestamp:s.sourceTimestamp??null,calibrationStatus:'DEFERRED'};
 const D=s.favoriteScore-s.otherScore;
 // Final means football-terminal, not result acceptance or publication.
 if(s.kind==='final'){
  if(D===0)throw new Error('Tied final needs an explicitly supported tie rule');
  return {...base,status:'terminal',probability:D>0?1:0,trace:{D}};
 }
 if(typeof s.period==='string' && /^(?:OT|[2-9]\d*OT|1\d+OT)$/.test(s.period))
  return {...base,status:'ot_unavailable',probability:null,trace:{D}};
 if(!Number.isInteger(s.period)||s.period<1||s.period>4)throw new Error('Regulation period must be 1..4');
 finite(s.quarterSeconds,'quarterSeconds');finite(s.clockSeconds,'clockSeconds');
 if(s.quarterSeconds<=0 || s.clockSeconds<0 || s.clockSeconds>s.quarterSeconds)throw new Error('Invalid football clock');
 const T=4*s.quarterSeconds,t=(4-s.period)*s.quarterSeconds+s.clockSeconds,u=t/T;
 let V=0;
 if(s.kind!=='kickoff' && s.possessionTeamId!==null){
  const value=fieldValue(s.yardsToGoal);V=s.possessionTeamId===s.favoriteTeamId?value:-value;
 }
 const R=s.pregameMargin*u,M=D+V+R;
 const S=Math.sqrt(MODEL.endScale**2+((1/MODEL.slope)**2-MODEL.endScale**2)*u);
 const z=M/S,probability=sigmoid(z);
 return {...base,status:'estimated',probability,trace:{T,t,u,D,V,R,M,S,z}};
}

