export type ClockStatus="RUNNING"|"STOPPED";
export type RestartRule="CONTINUE"|"READY"|"SNAP";
export type StrategyMode="NORMAL"|"END_HALF"|"TWO_MINUTE"|"FOUR_MINUTE"|"FG_MANAGEMENT"|"KNEEL"|"DESPERATION";
export type Lifecycle="UNLAUNCHED"|"ACTIVE"|"PAUSED"|"EDIT"|"DELAY"|"FINAL_PENDING"|"LOCKED"|"READY"|"FINAL";

export type Game42={
  id:string;
  lifecycle:Lifecycle;
  quarter:1|2|3|4;
  gameClockSeconds:number;
  playClockSeconds:number;
  gameClockStatus:ClockStatus;
  restartRule:RestartRule;
  glSeconds:number;
  possession:0|1;
  down:1|2|3|4;
  distance:number;
  yardline:number;
  awayScore:number;
  homeScore:number;
  awayTimeouts:number;
  homeTimeouts:number;
  auto:boolean;
  operatorPaused:boolean;
  delayed:boolean;
  editing:boolean;
  seedHex:string;
  runNumber:number;
  continuationOf:string|null;
};

export type PlayClockResult={
  playDuration:number;
  betweenPlayRunoff:number;
  clockStops:boolean;
  restartRule:RestartRule;
  nextSnapClock:number;
};

export function scoreDiffForPossession(g:Game42){
  const mine=g.possession===0?g.awayScore:g.homeScore;
  const theirs=g.possession===0?g.homeScore:g.awayScore;
  return mine-theirs;
}

export function offenseTimeouts(g:Game42){return g.possession===0?g.awayTimeouts:g.homeTimeouts;}
export function defenseTimeouts(g:Game42){return g.possession===0?g.homeTimeouts:g.awayTimeouts;}

export function strategyMode(g:Game42):StrategyMode{
  if(g.quarter!==2&&g.quarter!==4)return "NORMAL";
  const diff=scoreDiffForPossession(g),t=g.gameClockSeconds;
  if(g.quarter===4&&t<=160&&diff>0&&defenseTimeouts(g)===0)return "KNEEL";
  if(g.quarter===4&&t<=240&&diff>0)return "FOUR_MINUTE";
  if(g.quarter===4&&t<=90&&diff<=-9)return "DESPERATION";
  if(g.quarter===4&&t<=120&&diff<=0)return "TWO_MINUTE";
  if(g.quarter===4&&t<=120&&Math.abs(diff)<=3&&g.yardline>=60)return "FG_MANAGEMENT";
  if(g.quarter===2&&t<=120)return "END_HALF";
  if(t<=240)return diff>0?"FOUR_MINUTE":(g.quarter===2?"END_HALF":"TWO_MINUTE");
  return "NORMAL";
}

export function nextSnapClock(current:number,playDuration:number,betweenPlayRunoff:number){
  return Math.max(0,current-Math.max(0,playDuration)-Math.max(0,betweenPlayRunoff));
}

export function clockResult(args:{
  currentClock:number;
  playDuration:number;
  inBounds:boolean;
  incomplete:boolean;
  score:boolean;
  turnover:boolean;
  timeoutTaken:boolean;
  firstDown:boolean;
  quarter:1|2|3|4;
  strategy:StrategyMode;
}):PlayClockResult{
  const p=Math.max(0,Math.floor(args.playDuration));
  let stop=args.incomplete||args.score||args.turnover||args.timeoutTaken||!args.inBounds;
  if((args.quarter===2||args.quarter===4)&&args.currentClock<=120&&args.firstDown)stop=true;
  let runoff=0;
  if(!stop){
    if(args.strategy==="FOUR_MINUTE"||args.strategy==="KNEEL")runoff=36;
    else if(args.strategy==="TWO_MINUTE"||args.strategy==="DESPERATION")runoff=10;
    else if(args.strategy==="END_HALF"||args.strategy==="FG_MANAGEMENT")runoff=14;
    else runoff=27;
  }
  const next=nextSnapClock(args.currentClock,p,runoff);
  return{playDuration:p,betweenPlayRunoff:runoff,clockStops:stop,restartRule:stop?"SNAP":"CONTINUE",nextSnapClock:next};
}

export function publicStatus(g:Game42){
  if(g.lifecycle==="DELAY"||g.delayed)return "DELAY";
  if(g.lifecycle==="FINAL"||g.lifecycle==="FINAL_PENDING"||g.lifecycle==="LOCKED"||g.lifecycle==="READY")return "FINAL";
  if(g.quarter===2&&g.gameClockSeconds===0)return "HALFTIME";
  if(g.quarter===1&&g.gameClockSeconds===0)return "END 1ST";
  if(g.quarter===3&&g.gameClockSeconds===0)return "END 3RD";
  return `${g.quarter}Q`;
}

// GL is event-duration time. Any state that is part of the launched event advances GL.
export function glAdvances(g:Game42){return g.lifecycle!=="UNLAUNCHED"&&g.lifecycle!=="FINAL";}

export function applyWallElapsed(g:Game42,seconds:number){
  const s=Math.max(0,Math.floor(seconds));
  if(glAdvances(g))g.glSeconds+=s;
  // Football state does not advance while PAUSED / EDIT / DELAY.
  if(g.operatorPaused||g.editing||g.delayed||g.lifecycle==="PAUSED"||g.lifecycle==="EDIT"||g.lifecycle==="DELAY")return;
}
