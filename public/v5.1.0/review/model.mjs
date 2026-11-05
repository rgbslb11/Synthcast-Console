// Read-only UI transport. No engine, RNG, derived football or WP calculation.
export const DETAILS_URL='https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-details';
export const textValue=v=>v==null?'Unavailable':String(v);
export const clock=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`:'Unavailable';
export const period=v=>/^[1-4]$/.test(String(v))?`Q${v}`:/^(OT|[2-9]OT|[1-9][0-9]+OT)$/.test(String(v))?String(v):'Unavailable';
export const spot=v=>typeof v==='number'&&v>=0&&v<=100?(v===50?'50':v<50?`OWN ${v}`:`OPP ${100-v}`):'Unavailable';
export const downDistance=v=>v&&[1,2,3,4].includes(v.down)&&Number.isFinite(v.distance)?`${v.down}${['st','nd','rd','th'][v.down-1]} & ${v.distance}`:'Unavailable';
export const teamName=(s,t)=>s?.[t===0?'awayTeamAndRecords':'homeTeamAndRecords']?.name??'Team unavailable';
export const available=d=>d?.availability?.status==='AVAILABLE';
// Presentation only. Exactly 50% stays black until the favorite falls below it.
export const wpColor=(p,status)=>status==='BLOCKED'||typeof p!=='number'||!Number.isFinite(p)||p<0||p>1?'#808080':p<0.5?'#D71A20':'#000000';
export const freshness=(d,now=Date.now())=>Number.isFinite(Date.parse(d?.generatedAt))?(now-Date.parse(d.generatedAt)>15000?'STALE':'CURRENT'):'UNAVAILABLE';
export function statistic(v,key){
 if(v==null)return '—';
 if(key==='timeOfPossession')return clock(v);
 if(typeof v==='object'&&Object.hasOwn(v,'percentage'))return `${v.made}/${v.attempted} · ${v.percentage==null?'—':`${v.percentage.toFixed(1)}%`}`;
 if(typeof v==='object')return Object.entries(v).map(([k,n])=>`${k}: ${textValue(n)}`).join(' · ')||'None recorded';
 return typeof v==='number'&&!Number.isInteger(v)?v.toFixed(1):String(v);
}
export function safeEnvelope(d,{session,game}){
 if(d?.contractVersion!=='GC-STATS-1'||d?.deliveryVersion!=='GC-DELIVERY-1'||d.sessionId!==session||d.gameId!==game||typeof d.runId!=='string'||!Number.isSafeInteger(d.stateVersion)||!['AVAILABLE','BLOCKED','NOT_STARTED'].includes(d.availability?.status))throw Error('CONTRACT_OR_IDENTITY_MISMATCH');
 // Denial always discards detail, including a malformed server response with data.
 if(!available(d)){const {contractVersion,deliveryVersion,sessionId,gameId,runId,stateVersion,generatedAt,availability}=d;return {contractVersion,deliveryVersion,sessionId,gameId,runId,stateVersion,generatedAt,availability};}
 if(!d.scoreboard||!Array.isArray(d.teamStatistics)||d.teamStatistics.length!==2||!Array.isArray(d.plays)||!Number.isSafeInteger(d.nextSequence)||typeof d.hasMore!=='boolean')throw Error('INCOMPLETE_RESPONSE');
 return d;
}
export async function readDetails({session,game,token,fetchImpl=fetch,signal,onReset=()=>{}}){
 if(!/^qa-v510-[a-z0-9-]{1,64}$/.test(session)||!/^G[0-9]{4}$/.test(game))throw Error('QA_SCOPE_REQUIRED');
 if(!token)throw Error('AUTHENTICATION_REQUIRED');
 // Fixed endpoint; a connection form cannot send a JWT to an arbitrary host.
 for(let retry=0;retry<3;retry++){
  let initial=null,plays=[],after=0;
  for(let pages=0;pages<1000;pages++){
   const url=new URL(DETAILS_URL);url.search=new URLSearchParams({session,game,after:String(after),limit:'100',...(initial?{run:initial.runId,version:String(initial.stateVersion)}:{})});
   const res=await fetchImpl(url,{method:'GET',headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'omit',redirect:'error',signal});
   if(!res.ok)throw Error(res.status===401?'AUTHENTICATION_REQUIRED':res.status===403?'ACCESS_DENIED':`HTTP_${res.status}`);
   const d=safeEnvelope(await res.json(),{session,game});
   if(['RUN_CHANGED','STATE_VERSION_CHANGED'].includes(d.availability.reason)){onReset(d.availability.reason);break;}
   if(!available(d))return d;
   if(initial&&(d.runId!==initial.runId||d.stateVersion!==initial.stateVersion)){onReset('CHECKPOINT_CHANGED');break;}
   initial??=d;
   if(d.nextSequence!==after+d.plays.length||d.plays.some((p,i)=>p.sequence!==after+i+1)||d.hasMore&&d.nextSequence<=after)throw Error('INVALID_PAGE_SEQUENCE');
   plays.push(...d.plays);after=d.nextSequence;
   if(!d.hasMore)return {...initial,plays,nextSequence:after,hasMore:false};
   if(pages===999)throw Error('PAGE_LIMIT_EXCEEDED');
  }
 }
 throw Error('RECONNECTING_SOURCE_CHANGING');
}
export function wpView(response){
 const s=response?.summary;
 if(!s)return {status:'UNAVAILABLE',probability:null,segments:[],points:[],reason:'WP_ENDPOINT_NOT_DEPLOYED'};
 const points=response.points??[],segments=[];let line=[],previous=null;
 for(const p of points){
  const valid=typeof p.probability==='number'&&p.probability>=0&&p.probability<=1&&p.status!=='BLOCKED';
  if(p.gapBefore||!valid||previous&&(p.runId!==previous.runId||p.modelId!==previous.modelId)){if(line.length)segments.push(line);line=[];}
  if(valid)line.push(p);
  previous=p;
 }
 if(line.length)segments.push(line);
 return {...s,probability:s.status==='BLOCKED'?null:s.probability,segments,points};
}
// Prepared for the WP owner's future authenticated route. fetchPage is a
// read-only HTTP adapter supplied only after that route is verified; no sampler.
export async function readWpHistory({fetchPage,session,game,onReset=()=>{}}){
 for(let retry=0;retry<3;retry++){
  let run=null,through=null,after=0,points=[];
  for(let page=0;page<1000;page++){
   const r=await fetchPage({session,game,after,limit:100,...(run?{run,through}:{})}),s=r.summary;
   if(s?.sessionId!==session||s?.gameId!==game||typeof s.runId!=='string'||!Array.isArray(r.points)||!Number.isSafeInteger(r.highWatermark)||!Number.isSafeInteger(r.nextSequence))throw Error('WP_CONTRACT_OR_IDENTITY_MISMATCH');
   if(s.reason==='RUN_CHANGED'||run&&run!==s.runId){onReset('RUN_CHANGED');break;}
   if(s.reason==='WP_SOURCE_PENDING')return {...r,points:[]};
   run??=s.runId;through??=r.highWatermark;
   if(r.highWatermark!==through||r.points.some((p,i)=>p.runId!==run||p.modelId!==s.modelId||p.observationSequence<=(i?r.points[i-1].observationSequence:after)||p.observationSequence>through)||r.nextSequence!==(r.points.at(-1)?.observationSequence??after))throw Error('WP_INVALID_PAGE_SEQUENCE');
   points.push(...r.points);after=r.nextSequence;
   if(after>=through||r.points.length===0)return {...r,points,highWatermark:through};
  }
 }
 throw Error('WP_RECONNECTING_RUN_CHANGING');
}
