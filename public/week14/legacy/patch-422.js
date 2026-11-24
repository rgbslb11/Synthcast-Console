'use strict';
// 4.2.2 presentation integrity: only regulation and NCAA-style OT score periods are rendered.
engine='GC-W3-V4.2.2-RC1';
periods=function(g){
  const base=['1','2','3','4'];
  const extra=Object.keys(g.scores||{}).filter(k=>k==='OT'||/^(?:[2-9]|[1-9][0-9]+)OT$/.test(k));
  const n=k=>k==='OT'?1:Number(k.slice(0,-2));
  extra.sort((a,b)=>n(a)-n(b));
  return [...base,...extra];
};
